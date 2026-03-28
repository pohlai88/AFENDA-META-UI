import express from "express";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MutationPolicyViolationError } from "../../policy/mutation-command-gateway.js";
import { errorHandler } from "../../middleware/errorHandler.js";

const {
  getTenantMock,
  listTenantsMock,
  registerOverrideMock,
  removeOverrideMock,
  getOverridesForModelMock,
  resolveMetadataMock,
  validateOverrideMock,
  registerIndustryTemplateMock,
  getTenantStatsMock,
  registerTenantCommandMock,
  updateTenantCommandMock,
  removeTenantCommandMock,
} = vi.hoisted(() => ({
  getTenantMock: vi.fn(),
  listTenantsMock: vi.fn(),
  registerOverrideMock: vi.fn(),
  removeOverrideMock: vi.fn(),
  getOverridesForModelMock: vi.fn(),
  resolveMetadataMock: vi.fn(),
  validateOverrideMock: vi.fn(),
  registerIndustryTemplateMock: vi.fn(),
  getTenantStatsMock: vi.fn(),
  registerTenantCommandMock: vi.fn(),
  updateTenantCommandMock: vi.fn(),
  removeTenantCommandMock: vi.fn(),
}));

vi.mock("../../tenant/index.js", () => ({
  getTenant: getTenantMock,
  listTenants: listTenantsMock,
  registerOverride: registerOverrideMock,
  removeOverride: removeOverrideMock,
  getOverridesForModel: getOverridesForModelMock,
  resolveMetadata: resolveMetadataMock,
  validateOverride: validateOverrideMock,
  registerIndustryTemplate: registerIndustryTemplateMock,
  getTenantStats: getTenantStatsMock,
}));

vi.mock("../../tenant/tenant-command-service.js", () => ({
  registerTenantCommand: registerTenantCommandMock,
  updateTenantCommand: updateTenantCommandMock,
  removeTenantCommand: removeTenantCommandMock,
}));

import tenantRouter from "../tenant.js";

function createApp(session?: Record<string, unknown>) {
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    req.session = session as typeof req.session;
    next();
  });
  app.use("/api/tenants", tenantRouter);
  app.use(errorHandler);
  return app;
}

describe("/api/tenants command-owned writes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    listTenantsMock.mockReturnValue([]);
    getOverridesForModelMock.mockReturnValue([]);
    validateOverrideMock.mockReturnValue([]);
    getTenantStatsMock.mockReturnValue({});
  });

  it("routes tenant registration through command service and returns mutation metadata", async () => {
    registerTenantCommandMock.mockResolvedValueOnce({
      record: { id: "tenant-1", name: "Tenant One", enabled: true },
      mutationPolicy: "dual-write",
      policy: { id: "platform.tenant.command_dual_write" },
      event: { id: "evt-tenant-create", eventType: "tenant.direct_create" },
    });

    const response = await request(createApp({ uid: "21", roles: ["admin"] }))
      .post("/api/tenants")
      .send({ id: "tenant-1", name: "Tenant One", enabled: true });

    expect(response.status).toBe(201);
    expect(registerTenantCommandMock).toHaveBeenCalledWith({
      tenant: { id: "tenant-1", name: "Tenant One", enabled: true },
      actorId: "21",
    });
    expect(response.body.meta).toEqual({
      mutationPolicy: "dual-write",
      policyId: "platform.tenant.command_dual_write",
      eventType: "tenant.direct_create",
      eventId: "evt-tenant-create",
    });
  });

  it("returns mutation policy violation details on tenant registration rejection", async () => {
    registerTenantCommandMock.mockRejectedValueOnce(
      new MutationPolicyViolationError({
        model: "tenant",
        operation: "create",
        mutationPolicy: "event-only",
        source: "api.tenants.register",
        policy: {
          id: "platform.tenant.command_dual_write",
          mutationPolicy: "event-only",
          appliesTo: ["tenant"],
        },
        message: "Direct tenant mutation blocked",
      })
    );

    const response = await request(createApp({ uid: "21", roles: ["admin"] }))
      .post("/api/tenants")
      .send({ id: "tenant-1", name: "Tenant One", enabled: true });

    expect(response.status).toBe(409);
    expect(response.body.code).toBe("MUTATION_POLICY_VIOLATION");
    expect(response.body.details).toEqual(
      expect.objectContaining({
        model: "tenant",
        operation: "create",
        mutationPolicy: "event-only",
        policyId: "platform.tenant.command_dual_write",
      })
    );
  });

  it("returns 400 when tenant id is missing on register", async () => {
    const response = await request(createApp({ uid: "21", roles: ["admin"] }))
      .post("/api/tenants")
      .send({ name: "Tenant One" });

    expect(response.status).toBe(400);
    expect(registerTenantCommandMock).not.toHaveBeenCalled();
  });

  it("returns 400 when tenant id in payload does not match URL", async () => {
    const response = await request(createApp({ uid: "22", roles: ["admin"] }))
      .put("/api/tenants/tenant-1")
      .send({ id: "tenant-2", name: "Mismatch" });

    expect(response.status).toBe(400);
    expect(updateTenantCommandMock).not.toHaveBeenCalled();
  });

  it("returns 404 when tenant update target does not exist", async () => {
    getTenantMock.mockReturnValueOnce(undefined);

    const response = await request(createApp({ uid: "22", roles: ["admin"] }))
      .put("/api/tenants/tenant-1")
      .send({ id: "tenant-1", name: "Tenant One", enabled: true });

    expect(response.status).toBe(404);
    expect(updateTenantCommandMock).not.toHaveBeenCalled();
  });

  it("routes tenant update through command service and returns mutation metadata", async () => {
    getTenantMock.mockReturnValueOnce({ id: "tenant-1", name: "Tenant One", enabled: true });
    updateTenantCommandMock.mockResolvedValueOnce({
      record: { id: "tenant-1", name: "Tenant One", enabled: false },
      mutationPolicy: "dual-write",
      policy: { id: "platform.tenant.command_dual_write" },
      event: { id: "evt-tenant-update", eventType: "tenant.direct_update" },
    });

    const response = await request(createApp({ uid: "22", roles: ["admin"] }))
      .put("/api/tenants/tenant-1")
      .send({ id: "tenant-1", name: "Tenant One", enabled: false });

    expect(response.status).toBe(200);
    expect(updateTenantCommandMock).toHaveBeenCalledWith({
      tenant: { id: "tenant-1", name: "Tenant One", enabled: false },
      actorId: "22",
    });
    expect(response.body.meta).toEqual({
      mutationPolicy: "dual-write",
      policyId: "platform.tenant.command_dual_write",
      eventType: "tenant.direct_update",
      eventId: "evt-tenant-update",
    });
  });

  it("returns mutation policy violation details on tenant update rejection", async () => {
    getTenantMock.mockReturnValueOnce({ id: "tenant-1", name: "Tenant One", enabled: true });
    updateTenantCommandMock.mockRejectedValueOnce(
      new MutationPolicyViolationError({
        model: "tenant",
        operation: "update",
        mutationPolicy: "event-only",
        source: "api.tenants.update",
        policy: {
          id: "platform.tenant.command_dual_write",
          mutationPolicy: "event-only",
          appliesTo: ["tenant"],
        },
        message: "Direct tenant mutation blocked",
      })
    );

    const response = await request(createApp({ uid: "22", roles: ["admin"] }))
      .put("/api/tenants/tenant-1")
      .send({ id: "tenant-1", name: "Tenant One", enabled: false });

    expect(response.status).toBe(409);
    expect(response.body.code).toBe("MUTATION_POLICY_VIOLATION");
    expect(response.body.details).toEqual(
      expect.objectContaining({
        model: "tenant",
        operation: "update",
        mutationPolicy: "event-only",
        policyId: "platform.tenant.command_dual_write",
      })
    );
  });

  it("routes tenant deletion through command service and returns mutation metadata", async () => {
    getTenantMock.mockReturnValueOnce({ id: "tenant-1", name: "Tenant One", enabled: true });
    removeTenantCommandMock.mockResolvedValueOnce({
      record: { id: "tenant-1", name: "Tenant One", enabled: true },
      mutationPolicy: "dual-write",
      policy: { id: "platform.tenant.command_dual_write" },
      event: { id: "evt-tenant-delete", eventType: "tenant.direct_delete" },
    });

    const response = await request(createApp({ uid: "99", roles: ["admin"] })).delete(
      "/api/tenants/tenant-1"
    );

    expect(response.status).toBe(200);
    expect(removeTenantCommandMock).toHaveBeenCalledWith({ tenantId: "tenant-1", actorId: "99" });
    expect(response.body.meta).toEqual({
      mutationPolicy: "dual-write",
      policyId: "platform.tenant.command_dual_write",
      eventType: "tenant.direct_delete",
      eventId: "evt-tenant-delete",
    });
  });

  it("returns mutation policy violation details on tenant delete rejection", async () => {
    getTenantMock.mockReturnValueOnce({ id: "tenant-1", name: "Tenant One", enabled: true });
    removeTenantCommandMock.mockRejectedValueOnce(
      new MutationPolicyViolationError({
        model: "tenant",
        operation: "delete",
        mutationPolicy: "event-only",
        source: "api.tenants.delete",
        policy: {
          id: "platform.tenant.command_dual_write",
          mutationPolicy: "event-only",
          appliesTo: ["tenant"],
        },
        message: "Direct tenant mutation blocked",
      })
    );

    const response = await request(createApp({ uid: "99", roles: ["admin"] })).delete(
      "/api/tenants/tenant-1"
    );

    expect(response.status).toBe(409);
    expect(response.body.code).toBe("MUTATION_POLICY_VIOLATION");
    expect(response.body.details).toEqual(
      expect.objectContaining({
        model: "tenant",
        operation: "delete",
        mutationPolicy: "event-only",
        policyId: "platform.tenant.command_dual_write",
      })
    );
  });
});
