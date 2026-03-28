import express from "express";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MutationPolicyViolationError } from "../../policy/mutation-command-gateway.js";
import { errorHandler } from "../../middleware/errorHandler.js";

const {
  getInstanceMock,
  getWorkflowMock,
  getWorkflowStatsMock,
  listInstancesMock,
  listWorkflowsMock,
  triggerWorkflowsMock,
  createWorkflowCommandMock,
  updateWorkflowCommandMock,
  removeWorkflowCommandMock,
  advanceWorkflowInstanceCommandMock,
  submitWorkflowApprovalCommandMock,
} = vi.hoisted(() => ({
  getInstanceMock: vi.fn(),
  getWorkflowMock: vi.fn(),
  getWorkflowStatsMock: vi.fn(),
  listInstancesMock: vi.fn(),
  listWorkflowsMock: vi.fn(),
  triggerWorkflowsMock: vi.fn(),
  createWorkflowCommandMock: vi.fn(),
  updateWorkflowCommandMock: vi.fn(),
  removeWorkflowCommandMock: vi.fn(),
  advanceWorkflowInstanceCommandMock: vi.fn(),
  submitWorkflowApprovalCommandMock: vi.fn(),
}));

vi.mock("../../workflow/index.js", () => ({
  getInstance: getInstanceMock,
  getWorkflow: getWorkflowMock,
  getWorkflowStats: getWorkflowStatsMock,
  listInstances: listInstancesMock,
  listWorkflows: listWorkflowsMock,
  triggerWorkflows: triggerWorkflowsMock,
}));

vi.mock("../../workflow/workflow-command-service.js", () => ({
  advanceWorkflowInstanceCommand: advanceWorkflowInstanceCommandMock,
  createWorkflowCommand: createWorkflowCommandMock,
  removeWorkflowCommand: removeWorkflowCommandMock,
  submitWorkflowApprovalCommand: submitWorkflowApprovalCommandMock,
  updateWorkflowCommand: updateWorkflowCommandMock,
}));

import workflowRouter from "../workflow.js";

function createApp(session?: Record<string, unknown>) {
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    req.session = session as typeof req.session;
    next();
  });
  app.use("/api/workflows", workflowRouter);
  app.use(errorHandler);
  return app;
}

describe("/api/workflows command-owned writes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    listWorkflowsMock.mockReturnValue([]);
    listInstancesMock.mockReturnValue([]);
    getWorkflowStatsMock.mockReturnValue({ totalDefinitions: 0, totalInstances: 0 });
    triggerWorkflowsMock.mockResolvedValue([]);
  });

  it("routes workflow creation through command service and returns mutation metadata", async () => {
    createWorkflowCommandMock.mockResolvedValueOnce({
      record: { id: "workflow-1" },
      mutationPolicy: "dual-write",
      policy: { id: "platform.workflow.command_dual_write" },
      event: { id: "evt-wf-create", eventType: "workflow.direct_create" },
    });

    const response = await request(createApp({ uid: "52" }))
      .post("/api/workflows")
      .send({
        id: "workflow-1",
        name: "Approvals",
        trigger: "hr.requested",
        steps: [],
        initialStepId: "start",
        enabled: true,
      });

    expect(response.status).toBe(201);
    expect(createWorkflowCommandMock).toHaveBeenCalledWith({
      workflow: {
        id: "workflow-1",
        name: "Approvals",
        trigger: "hr.requested",
        steps: [],
        initialStepId: "start",
        enabled: true,
      },
      actorId: "52",
    });
    expect(response.body.meta).toEqual({
      mutationPolicy: "dual-write",
      policyId: "platform.workflow.command_dual_write",
      eventType: "workflow.direct_create",
      eventId: "evt-wf-create",
    });
  });

  it("returns mutation policy violation details on workflow create rejection", async () => {
    createWorkflowCommandMock.mockRejectedValueOnce(
      new MutationPolicyViolationError({
        model: "workflow",
        operation: "create",
        mutationPolicy: "event-only",
        source: "api.workflows.create",
        policy: {
          id: "platform.workflow.command_dual_write",
          mutationPolicy: "event-only",
          appliesTo: ["workflow"],
        },
        message: "Direct workflow mutation blocked",
      })
    );

    const response = await request(createApp({ uid: "52" }))
      .post("/api/workflows")
      .send({
        id: "workflow-1",
        name: "Approvals",
        trigger: "hr.requested",
        steps: [],
        initialStepId: "start",
        enabled: true,
      });

    expect(response.status).toBe(409);
    expect(response.body.code).toBe("MUTATION_POLICY_VIOLATION");
    expect(response.body.details).toEqual(
      expect.objectContaining({
        model: "workflow",
        operation: "create",
        mutationPolicy: "event-only",
        policyId: "platform.workflow.command_dual_write",
      })
    );
  });

  it("returns 404 when updating a workflow that does not exist", async () => {
    getWorkflowMock.mockReturnValueOnce(undefined);

    const response = await request(createApp({ uid: "53" }))
      .put("/api/workflows/workflow-1")
      .send({
        id: "workflow-1",
        name: "Approvals",
        trigger: "hr.requested",
        steps: [],
        initialStepId: "start",
        enabled: true,
      });

    expect(response.status).toBe(404);
    expect(updateWorkflowCommandMock).not.toHaveBeenCalled();
  });

  it("routes workflow updates through command service", async () => {
    getWorkflowMock.mockReturnValueOnce({ id: "workflow-1", enabled: true });
    updateWorkflowCommandMock.mockResolvedValueOnce({
      record: { id: "workflow-1" },
      mutationPolicy: "dual-write",
      policy: { id: "platform.workflow.command_dual_write" },
      event: { id: "evt-wf-update", eventType: "workflow.direct_update" },
    });

    const response = await request(createApp({ uid: "53" }))
      .put("/api/workflows/workflow-1")
      .send({
        id: "workflow-1",
        name: "Approvals",
        trigger: "hr.requested",
        steps: [],
        initialStepId: "start",
        enabled: false,
      });

    expect(response.status).toBe(200);
    expect(updateWorkflowCommandMock).toHaveBeenCalledWith({
      workflow: {
        id: "workflow-1",
        name: "Approvals",
        trigger: "hr.requested",
        steps: [],
        initialStepId: "start",
        enabled: false,
      },
      actorId: "53",
    });
    expect(response.body.meta.eventType).toBe("workflow.direct_update");
  });

  it("returns mutation policy violation details on workflow update rejection", async () => {
    getWorkflowMock.mockReturnValueOnce({ id: "workflow-1", enabled: true });
    updateWorkflowCommandMock.mockRejectedValueOnce(
      new MutationPolicyViolationError({
        model: "workflow",
        operation: "update",
        mutationPolicy: "event-only",
        source: "api.workflows.update",
        policy: {
          id: "platform.workflow.command_dual_write",
          mutationPolicy: "event-only",
          appliesTo: ["workflow"],
        },
        message: "Direct workflow mutation blocked",
      })
    );

    const response = await request(createApp({ uid: "53" }))
      .put("/api/workflows/workflow-1")
      .send({
        id: "workflow-1",
        name: "Approvals",
        trigger: "hr.requested",
        steps: [],
        initialStepId: "start",
        enabled: false,
      });

    expect(response.status).toBe(409);
    expect(response.body.code).toBe("MUTATION_POLICY_VIOLATION");
    expect(response.body.details).toEqual(
      expect.objectContaining({
        model: "workflow",
        operation: "update",
        mutationPolicy: "event-only",
        policyId: "platform.workflow.command_dual_write",
      })
    );
  });

  it("routes workflow deletion through command service", async () => {
    getWorkflowMock.mockReturnValueOnce({ id: "workflow-1", enabled: true });
    removeWorkflowCommandMock.mockResolvedValueOnce({
      record: { id: "workflow-1" },
      mutationPolicy: "dual-write",
      policy: { id: "platform.workflow.command_dual_write" },
      event: { id: "evt-wf-delete", eventType: "workflow.direct_delete" },
    });

    const response = await request(createApp({ uid: "77" })).delete("/api/workflows/workflow-1");

    expect(response.status).toBe(200);
    expect(removeWorkflowCommandMock).toHaveBeenCalledWith({
      workflowId: "workflow-1",
      actorId: "77",
    });
    expect(response.body.meta.eventType).toBe("workflow.direct_delete");
  });

  it("returns mutation policy violation details on workflow delete rejection", async () => {
    getWorkflowMock.mockReturnValueOnce({ id: "workflow-1", enabled: true });
    removeWorkflowCommandMock.mockRejectedValueOnce(
      new MutationPolicyViolationError({
        model: "workflow",
        operation: "delete",
        mutationPolicy: "event-only",
        source: "api.workflows.delete",
        policy: {
          id: "platform.workflow.command_dual_write",
          mutationPolicy: "event-only",
          appliesTo: ["workflow"],
        },
        message: "Direct workflow mutation blocked",
      })
    );

    const response = await request(createApp({ uid: "77" })).delete("/api/workflows/workflow-1");

    expect(response.status).toBe(409);
    expect(response.body.code).toBe("MUTATION_POLICY_VIOLATION");
    expect(response.body.details).toEqual(
      expect.objectContaining({
        model: "workflow",
        operation: "delete",
        mutationPolicy: "event-only",
        policyId: "platform.workflow.command_dual_write",
      })
    );
  });

  it("routes instance advance through command service with session actor fallback", async () => {
    advanceWorkflowInstanceCommandMock.mockResolvedValueOnce({
      record: { id: "wf_1", status: "running" },
      mutationPolicy: "dual-write",
      policy: { id: "platform.workflow_instance.command_dual_write" },
      event: { id: "evt-wf-advance", eventType: "workflow_instance.direct_update" },
    });

    const response = await request(createApp({ uid: "91" }))
      .post("/api/workflows/instances/wf_1/advance")
      .send({ stepInput: { approved: true } });

    expect(response.status).toBe(200);
    expect(advanceWorkflowInstanceCommandMock).toHaveBeenCalledWith({
      instanceId: "wf_1",
      actorId: "91",
      stepInput: { approved: true },
    });
    expect(response.body.meta.eventType).toBe("workflow_instance.direct_update");
  });

  it("returns 400 when advance is called without a numeric actor identity", async () => {
    const response = await request(createApp())
      .post("/api/workflows/instances/wf_1/advance")
      .send({ actor: "ops-user", stepInput: { approved: true } });

    expect(response.status).toBe(400);
    expect(advanceWorkflowInstanceCommandMock).not.toHaveBeenCalled();
    expect(response.body.error).toContain("numeric actorId is required");
  });

  it("returns mutation policy violation details when advance command is rejected", async () => {
    advanceWorkflowInstanceCommandMock.mockRejectedValueOnce(
      new MutationPolicyViolationError({
        model: "workflow_instance",
        operation: "update",
        mutationPolicy: "event-only",
        source: "api.workflows.instances.advance",
        policy: {
          id: "platform.workflow_instance.command_dual_write",
          mutationPolicy: "event-only",
          appliesTo: ["workflow_instance"],
        },
        message: "Direct workflow instance mutation blocked",
      })
    );

    const response = await request(createApp({ uid: "91" }))
      .post("/api/workflows/instances/wf_1/advance")
      .send({ stepInput: { approved: true } });

    expect(response.status).toBe(409);
    expect(response.body.code).toBe("MUTATION_POLICY_VIOLATION");
    expect(response.body.details).toEqual(
      expect.objectContaining({
        model: "workflow_instance",
        operation: "update",
        mutationPolicy: "event-only",
        policyId: "platform.workflow_instance.command_dual_write",
      })
    );
  });

  it("accepts session actor fallback for approvals", async () => {
    submitWorkflowApprovalCommandMock.mockResolvedValueOnce({
      record: { id: "wf_1", status: "completed" },
      mutationPolicy: "dual-write",
      policy: { id: "platform.workflow_instance.command_dual_write" },
      event: { id: "evt-wf-approve", eventType: "workflow_instance.direct_update" },
    });

    const response = await request(createApp({ uid: "92" }))
      .post("/api/workflows/instances/wf_1/approve")
      .send({ decision: "approved", reason: "Looks good" });

    expect(response.status).toBe(200);
    expect(submitWorkflowApprovalCommandMock).toHaveBeenCalledWith({
      instanceId: "wf_1",
      decision: "approved",
      actorId: "92",
      reason: "Looks good",
    });
    expect(response.body.meta.eventType).toBe("workflow_instance.direct_update");
  });

  it("returns 400 when approval is called without a numeric actor identity", async () => {
    const response = await request(createApp())
      .post("/api/workflows/instances/wf_1/approve")
      .send({ decision: "approved", actor: "ops-user" });

    expect(response.status).toBe(400);
    expect(submitWorkflowApprovalCommandMock).not.toHaveBeenCalled();
    expect(response.body.error).toContain("numeric actorId is required");
  });

  it("returns mutation policy violation details when approval command is rejected", async () => {
    submitWorkflowApprovalCommandMock.mockRejectedValueOnce(
      new MutationPolicyViolationError({
        model: "workflow_instance",
        operation: "update",
        mutationPolicy: "event-only",
        source: "api.workflows.instances.approve",
        policy: {
          id: "platform.workflow_instance.command_dual_write",
          mutationPolicy: "event-only",
          appliesTo: ["workflow_instance"],
        },
        message: "Direct workflow instance mutation blocked",
      })
    );

    const response = await request(createApp({ uid: "92" }))
      .post("/api/workflows/instances/wf_1/approve")
      .send({ decision: "approved", reason: "Looks good" });

    expect(response.status).toBe(409);
    expect(response.body.code).toBe("MUTATION_POLICY_VIOLATION");
    expect(response.body.details).toEqual(
      expect.objectContaining({
        model: "workflow_instance",
        operation: "update",
        mutationPolicy: "event-only",
        policyId: "platform.workflow_instance.command_dual_write",
      })
    );
  });

  it("returns 400 when approval decision is missing even with a numeric actor", async () => {
    const response = await request(createApp({ uid: "92" }))
      .post("/api/workflows/instances/wf_1/approve")
      .send({ reason: "missing decision" });

    expect(response.status).toBe(400);
    expect(submitWorkflowApprovalCommandMock).not.toHaveBeenCalled();
    expect(response.body.error).toContain("numeric actorId is required");
  });
});
