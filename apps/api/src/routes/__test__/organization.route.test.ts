import express from "express";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MutationPolicyViolationError } from "../../policy/mutation-command-gateway.js";
import { errorHandler } from "../../middleware/errorHandler.js";

const {
  getOrganizationMock,
  listOrganizationsMock,
  createOrganizationCommandMock,
  updateOrganizationCommandMock,
  removeOrganizationCommandMock,
} = vi.hoisted(() => ({
  getOrganizationMock: vi.fn(),
  listOrganizationsMock: vi.fn(),
  createOrganizationCommandMock: vi.fn(),
  updateOrganizationCommandMock: vi.fn(),
  removeOrganizationCommandMock: vi.fn(),
}));

vi.mock("../../organization/index.js", () => ({
  getOrganization: getOrganizationMock,
  listOrganizations: listOrganizationsMock,
}));

vi.mock("../../organization/organization-command-service.js", () => ({
  createOrganizationCommand: createOrganizationCommandMock,
  updateOrganizationCommand: updateOrganizationCommandMock,
  removeOrganizationCommand: removeOrganizationCommandMock,
}));

import organizationRouter from "../organization.js";

function createApp(session?: Record<string, unknown>) {
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    req.session = session as typeof req.session;
    next();
  });
  app.use("/api/organizations", organizationRouter);
  app.use(errorHandler);
  return app;
}

describe("/api/organizations command-owned writes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    listOrganizationsMock.mockReturnValue([]);
  });

  it("routes organization creation through command service and returns mutation metadata", async () => {
    createOrganizationCommandMock.mockResolvedValueOnce({
      record: { id: "org-1", tenantId: "tenant-1", name: "Org One", enabled: true },
      mutationPolicy: "event-only",
      policy: { id: "platform.organization.command_event_only" },
      event: { id: "evt-org-create", eventType: "organization.direct_create" },
    });

    const response = await request(createApp({ uid: "31", roles: ["admin"] }))
      .post("/api/organizations")
      .send({ id: "org-1", tenantId: "tenant-1", name: "Org One", enabled: true });

    expect(response.status).toBe(201);
    expect(createOrganizationCommandMock).toHaveBeenCalledWith({
      organization: { id: "org-1", tenantId: "tenant-1", name: "Org One", enabled: true },
      actorId: "31",
    });
    expect(response.body.meta).toEqual({
      mutationPolicy: "event-only",
      policyId: "platform.organization.command_event_only",
      eventType: "organization.direct_create",
      eventId: "evt-org-create",
    });
  });

  it("returns mutation policy violation details on organization create rejection", async () => {
    createOrganizationCommandMock.mockRejectedValueOnce(
      new MutationPolicyViolationError({
        model: "organization",
        operation: "create",
        mutationPolicy: "event-only",
        source: "api.organizations.create",
        policy: {
          id: "platform.organization.command_event_only",
          mutationPolicy: "event-only",
          appliesTo: ["organization"],
        },
        message: "Direct organization mutation blocked",
      })
    );

    const response = await request(createApp({ uid: "31", roles: ["admin"] }))
      .post("/api/organizations")
      .send({ id: "org-1", tenantId: "tenant-1", name: "Org One", enabled: true });

    expect(response.status).toBe(409);
    expect(response.body.code).toBe("MUTATION_POLICY_VIOLATION");
    expect(response.body.details).toEqual(
      expect.objectContaining({
        model: "organization",
        operation: "create",
        mutationPolicy: "event-only",
        policyId: "platform.organization.command_event_only",
      })
    );
  });

  it("returns 400 when organization id is missing on create", async () => {
    const response = await request(createApp({ uid: "31", roles: ["admin"] }))
      .post("/api/organizations")
      .send({ tenantId: "tenant-1", name: "Org One", enabled: true });

    expect(response.status).toBe(400);
    expect(createOrganizationCommandMock).not.toHaveBeenCalled();
  });

  it("returns 400 when organization id in payload does not match URL", async () => {
    const response = await request(createApp({ uid: "32", roles: ["admin"] }))
      .put("/api/organizations/org-1")
      .send({ id: "org-2", tenantId: "tenant-1", name: "Mismatch", enabled: true });

    expect(response.status).toBe(400);
    expect(updateOrganizationCommandMock).not.toHaveBeenCalled();
  });

  it("returns 404 when organization update target does not exist", async () => {
    getOrganizationMock.mockReturnValueOnce(undefined);

    const response = await request(createApp({ uid: "32", roles: ["admin"] }))
      .put("/api/organizations/org-1")
      .send({ id: "org-1", tenantId: "tenant-1", name: "Org One", enabled: true });

    expect(response.status).toBe(404);
    expect(updateOrganizationCommandMock).not.toHaveBeenCalled();
  });

  it("routes organization update through command service and returns mutation metadata", async () => {
    getOrganizationMock.mockReturnValueOnce({
      id: "org-1",
      tenantId: "tenant-1",
      name: "Org One",
      enabled: true,
    });
    updateOrganizationCommandMock.mockResolvedValueOnce({
      record: { id: "org-1", tenantId: "tenant-1", name: "Org One", enabled: false },
      mutationPolicy: "event-only",
      policy: { id: "platform.organization.command_event_only" },
      event: { id: "evt-org-update", eventType: "organization.direct_update" },
    });

    const response = await request(createApp({ uid: "32", roles: ["admin"] }))
      .put("/api/organizations/org-1")
      .send({ id: "org-1", tenantId: "tenant-1", name: "Org One", enabled: false });

    expect(response.status).toBe(200);
    expect(updateOrganizationCommandMock).toHaveBeenCalledWith({
      organization: { id: "org-1", tenantId: "tenant-1", name: "Org One", enabled: false },
      actorId: "32",
    });
    expect(response.body.meta).toEqual({
      mutationPolicy: "event-only",
      policyId: "platform.organization.command_event_only",
      eventType: "organization.direct_update",
      eventId: "evt-org-update",
    });
  });

  it("returns mutation policy violation details on organization update rejection", async () => {
    getOrganizationMock.mockReturnValueOnce({
      id: "org-1",
      tenantId: "tenant-1",
      name: "Org One",
      enabled: true,
    });
    updateOrganizationCommandMock.mockRejectedValueOnce(
      new MutationPolicyViolationError({
        model: "organization",
        operation: "update",
        mutationPolicy: "event-only",
        source: "api.organizations.update",
        policy: {
          id: "platform.organization.command_event_only",
          mutationPolicy: "event-only",
          appliesTo: ["organization"],
        },
        message: "Direct organization mutation blocked",
      })
    );

    const response = await request(createApp({ uid: "32", roles: ["admin"] }))
      .put("/api/organizations/org-1")
      .send({ id: "org-1", tenantId: "tenant-1", name: "Org One", enabled: false });

    expect(response.status).toBe(409);
    expect(response.body.code).toBe("MUTATION_POLICY_VIOLATION");
    expect(response.body.details).toEqual(
      expect.objectContaining({
        model: "organization",
        operation: "update",
        mutationPolicy: "event-only",
        policyId: "platform.organization.command_event_only",
      })
    );
  });

  it("routes organization deletion through command service and returns mutation metadata", async () => {
    getOrganizationMock.mockReturnValueOnce({
      id: "org-1",
      tenantId: "tenant-1",
      name: "Org One",
      enabled: true,
    });
    removeOrganizationCommandMock.mockResolvedValueOnce({
      record: { id: "org-1", tenantId: "tenant-1", name: "Org One", enabled: true },
      mutationPolicy: "event-only",
      policy: { id: "platform.organization.command_event_only" },
      event: { id: "evt-org-delete", eventType: "organization.direct_delete" },
    });

    const response = await request(createApp({ uid: "99", roles: ["admin"] })).delete(
      "/api/organizations/org-1"
    );

    expect(response.status).toBe(200);
    expect(removeOrganizationCommandMock).toHaveBeenCalledWith({
      organizationId: "org-1",
      actorId: "99",
    });
    expect(response.body.meta).toEqual({
      mutationPolicy: "event-only",
      policyId: "platform.organization.command_event_only",
      eventType: "organization.direct_delete",
      eventId: "evt-org-delete",
    });
  });

  it("returns mutation policy violation details on organization delete rejection", async () => {
    getOrganizationMock.mockReturnValueOnce({
      id: "org-1",
      tenantId: "tenant-1",
      name: "Org One",
      enabled: true,
    });
    removeOrganizationCommandMock.mockRejectedValueOnce(
      new MutationPolicyViolationError({
        model: "organization",
        operation: "delete",
        mutationPolicy: "event-only",
        source: "api.organizations.delete",
        policy: {
          id: "platform.organization.command_event_only",
          mutationPolicy: "event-only",
          appliesTo: ["organization"],
        },
        message: "Direct organization mutation blocked",
      })
    );

    const response = await request(createApp({ uid: "99", roles: ["admin"] })).delete(
      "/api/organizations/org-1"
    );

    expect(response.status).toBe(409);
    expect(response.body.code).toBe("MUTATION_POLICY_VIOLATION");
    expect(response.body.details).toEqual(
      expect.objectContaining({
        model: "organization",
        operation: "delete",
        mutationPolicy: "event-only",
        policyId: "platform.organization.command_event_only",
      })
    );
  });
});
