import { beforeEach, describe, expect, it, vi } from "vitest";

import type { WorkflowDefinition, WorkflowInstance } from "@afenda/meta-types";

const {
  advanceInstanceMock,
  assertNoProjectionDriftMock,
  dbGetAggregateEventsMock,
  detectProjectionDriftMock,
  executeMutationCommandMock,
  getInstanceMock,
  getLatestEventVersionStrictMock,
  getProjectionCheckpointMock,
  getWorkflowMock,
  registerWorkflowMock,
  removeWorkflowMock,
  submitApprovalMock,
  updateWorkflowMock,
} = vi.hoisted(() => ({
  advanceInstanceMock: vi.fn(),
  assertNoProjectionDriftMock: vi.fn(),
  dbGetAggregateEventsMock: vi.fn(),
  detectProjectionDriftMock: vi.fn(),
  executeMutationCommandMock: vi.fn(),
  getInstanceMock: vi.fn(),
  getLatestEventVersionStrictMock: vi.fn(),
  getProjectionCheckpointMock: vi.fn(),
  getWorkflowMock: vi.fn(),
  registerWorkflowMock: vi.fn(),
  removeWorkflowMock: vi.fn(),
  submitApprovalMock: vi.fn(),
  updateWorkflowMock: vi.fn(),
}));

vi.mock("../../events/index.js", () => ({
  assertNoProjectionDrift: assertNoProjectionDriftMock,
  dbGetAggregateEvents: dbGetAggregateEventsMock,
  detectProjectionDrift: detectProjectionDriftMock,
  getLatestEventVersionStrict: getLatestEventVersionStrictMock,
  getProjectionCheckpoint: getProjectionCheckpointMock,
}));

vi.mock("../../policy/mutation-command-gateway.js", () => ({
  executeMutationCommand: executeMutationCommandMock,
}));

vi.mock("../index.js", () => ({
  advanceInstance: advanceInstanceMock,
  getInstance: getInstanceMock,
  getWorkflow: getWorkflowMock,
  registerWorkflow: registerWorkflowMock,
  removeWorkflow: removeWorkflowMock,
  submitApproval: submitApprovalMock,
  updateWorkflow: updateWorkflowMock,
}));

import {
  advanceWorkflowInstanceCommand,
  createWorkflowCommand,
  removeWorkflowCommand,
  submitWorkflowApprovalCommand,
  updateWorkflowCommand,
} from "../workflow-command-service.js";

const workflow = {
  id: "workflow-1",
  name: "Approvals",
  trigger: "hr.requested",
  steps: [],
  initialStepId: "start",
  enabled: true,
} as unknown as WorkflowDefinition;

const instance = {
  id: "wf_1",
  workflowId: "workflow-1",
  status: "running",
} as unknown as WorkflowInstance;

describe("workflow command service", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    getProjectionCheckpointMock.mockReturnValue(null);
    dbGetAggregateEventsMock.mockResolvedValue([]);
    getLatestEventVersionStrictMock.mockImplementation((events) => events.at(-1)?.version ?? 0);
    detectProjectionDriftMock.mockImplementation(({ checkpoint, latestEventVersion }) => ({
      drifted: checkpoint.lastAppliedVersion !== latestEventVersion,
      reasons:
        checkpoint.lastAppliedVersion === latestEventVersion
          ? []
          : ["projection stale by 1 event(s)"],
      staleBy: Math.max(0, latestEventVersion - checkpoint.lastAppliedVersion),
      latestEventVersion,
      checkpointVersion: checkpoint.lastAppliedVersion,
    }));
    assertNoProjectionDriftMock.mockImplementation((report) => {
      if (report.drifted) {
        throw new Error("Projection drift detected");
      }
    });

    executeMutationCommandMock.mockImplementation(async (input) => {
      await input.validateProjectionDrift?.({
        model: input.model,
        operation: input.operation,
        aggregateId:
          input.recordId ??
          (typeof input.nextRecord?.id === "string" ? input.nextRecord.id : undefined),
        policy: undefined,
      });

      return {
        record: await input.mutate(),
        mutationPolicy: "dual-write",
        policy: { id: `platform.${input.model}.command_dual_write` },
        event: { id: "evt-wf", eventType: `${input.model}.direct_${input.operation}` },
      };
    });
  });

  it("wraps workflow create in mutation gateway", async () => {
    await createWorkflowCommand({ workflow, actorId: "user-1" });

    expect(registerWorkflowMock).toHaveBeenCalledWith(workflow);
    expect(executeMutationCommandMock).toHaveBeenCalledWith(
      expect.objectContaining({
        model: "workflow",
        operation: "create",
        actorId: "user-1",
        source: "api.workflows.create",
      })
    );
  });

  it("rejects workflow updates when projection checkpoint is stale", async () => {
    getWorkflowMock.mockReturnValueOnce(workflow);
    getProjectionCheckpointMock.mockReturnValueOnce({
      projectionName: "workflow.read_model",
      aggregateType: "workflow",
      aggregateId: workflow.id,
      lastAppliedVersion: 1,
      projectionVersion: 1,
      schemaHash: "workflow_read_model_v1",
      updatedAt: "2026-01-01T00:00:00.000Z",
    });
    dbGetAggregateEventsMock.mockResolvedValueOnce([{ version: 1 }, { version: 2 }]);

    await expect(updateWorkflowCommand({ workflow })).rejects.toThrow("Projection drift detected");
    expect(updateWorkflowMock).not.toHaveBeenCalled();
  });

  it("rejects workflow instance advance when event versions are non-monotonic", async () => {
    getInstanceMock.mockReturnValueOnce(instance);
    getProjectionCheckpointMock.mockReturnValueOnce({
      projectionName: "workflow_instance.read_model",
      aggregateType: "workflow_instance",
      aggregateId: instance.id,
      lastAppliedVersion: 2,
      projectionVersion: 1,
      schemaHash: "workflow_instance_read_model_v1",
      updatedAt: "2026-01-01T00:00:00.000Z",
    });
    dbGetAggregateEventsMock.mockResolvedValueOnce([{ version: 2 }, { version: 2 }]);
    getLatestEventVersionStrictMock.mockImplementationOnce(() => {
      throw new Error(
        "Projection workflow_instance.read_model requires strictly increasing event versions; received 2 after 2."
      );
    });

    await expect(
      advanceWorkflowInstanceCommand({
        instanceId: instance.id,
        actorId: "91",
        stepInput: { approved: true },
      })
    ).rejects.toThrow("strictly increasing event versions");
    expect(advanceInstanceMock).not.toHaveBeenCalled();
  });

  it("defaults workflow instance advance actor to system when actorId is not provided", async () => {
    getInstanceMock.mockReturnValueOnce(instance);
    advanceInstanceMock.mockResolvedValueOnce(instance);

    const result = await advanceWorkflowInstanceCommand({
      instanceId: instance.id,
      stepInput: { approved: true },
    });

    expect(advanceInstanceMock).toHaveBeenCalledWith(instance.id, {
      actor: "system",
      stepInput: { approved: true },
    });
    expect(result.event?.eventType).toBe("workflow_instance.direct_update");
  });

  it("submits workflow approval with null existing record when instance is missing", async () => {
    getInstanceMock.mockReturnValueOnce(undefined);
    submitApprovalMock.mockResolvedValueOnce(instance);

    await submitWorkflowApprovalCommand({
      instanceId: instance.id,
      decision: "approved",
      actorId: "92",
      reason: "approved",
    });

    expect(executeMutationCommandMock).toHaveBeenCalledWith(
      expect.objectContaining({
        model: "workflow_instance",
        operation: "update",
        existingRecord: null,
      })
    );
    expect(submitApprovalMock).toHaveBeenCalledWith(instance.id, "approved", "92", "approved");
  });

  it("keeps delete and approval commands routed through gateway", async () => {
    getWorkflowMock.mockReturnValueOnce(workflow);
    getInstanceMock.mockReturnValueOnce(instance);
    removeWorkflowMock.mockReturnValueOnce(true);
    submitApprovalMock.mockResolvedValueOnce(instance);

    const removeResult = await removeWorkflowCommand({ workflowId: workflow.id, actorId: "77" });
    const approvalResult = await submitWorkflowApprovalCommand({
      instanceId: instance.id,
      decision: "approved",
      actorId: "92",
      reason: "approved",
    });

    expect(removeResult.event?.eventType).toBe("workflow.direct_delete");
    expect(approvalResult.event?.eventType).toBe("workflow_instance.direct_update");
  });
});
