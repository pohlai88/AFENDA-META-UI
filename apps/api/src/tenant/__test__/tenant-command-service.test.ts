import { beforeEach, describe, expect, it, vi } from "vitest";

import type { TenantDefinition } from "@afenda/meta-types";

const {
  executeCommandRuntimeMock,
  getTenantMock,
  registerTenantMock,
  removeTenantMock,
  updateTenantMock,
} = vi.hoisted(() => ({
  executeCommandRuntimeMock: vi.fn(),
  getTenantMock: vi.fn(),
  registerTenantMock: vi.fn(),
  removeTenantMock: vi.fn(),
  updateTenantMock: vi.fn(),
}));

vi.mock("../../policy/command-runtime-spine.js", () => ({
  executeCommandRuntime: executeCommandRuntimeMock,
}));

vi.mock("../index.js", () => ({
  getTenant: getTenantMock,
  registerTenant: registerTenantMock,
  removeTenant: removeTenantMock,
  updateTenant: updateTenantMock,
}));

import {
  registerTenantCommand,
  removeTenantCommand,
  updateTenantCommand,
} from "../tenant-command-service.js";

const tenant: TenantDefinition = {
  id: "tenant-1",
  name: "Tenant One",
  isolationStrategy: "logical",
  enabled: true,
};

describe("tenant command service", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    executeCommandRuntimeMock.mockImplementation(async (input) => ({
      record: await input.mutate(),
      mutationPolicy: "dual-write",
      policy: { id: "platform.tenant.command_dual_write" },
      event: { id: "evt-tenant", eventType: `tenant.direct_${input.operation}` },
    }));
  });

  it("wraps tenant register in command runtime", async () => {
    const result = await registerTenantCommand({ tenant, actorId: "21" });

    expect(registerTenantMock).toHaveBeenCalledWith(tenant);
    expect(executeCommandRuntimeMock).toHaveBeenCalledWith(
      expect.objectContaining({
        model: "tenant",
        operation: "create",
        actorId: "21",
        source: "api.tenants.register",
        nextRecord: tenant,
      })
    );
    expect(result.event?.eventType).toBe("tenant.direct_create");
  });

  it("includes existing tenant when updating", async () => {
    getTenantMock.mockReturnValueOnce(tenant);
    const updatedTenant = {
      ...tenant,
      enabled: false,
    } satisfies TenantDefinition;

    const result = await updateTenantCommand({ tenant: updatedTenant, actorId: "22" });

    expect(updateTenantMock).toHaveBeenCalledWith(updatedTenant);
    expect(executeCommandRuntimeMock).toHaveBeenCalledWith(
      expect.objectContaining({
        model: "tenant",
        operation: "update",
        recordId: updatedTenant.id,
        actorId: "22",
        source: "api.tenants.update",
        existingRecord: tenant,
        nextRecord: updatedTenant,
      })
    );
    expect(result.event?.eventType).toBe("tenant.direct_update");
  });

  it("passes null existing tenant on update when record is missing", async () => {
    getTenantMock.mockReturnValueOnce(undefined);

    await updateTenantCommand({ tenant });

    expect(executeCommandRuntimeMock).toHaveBeenCalledWith(
      expect.objectContaining({
        existingRecord: null,
      })
    );
  });

  it("returns removed tenant record on delete", async () => {
    getTenantMock.mockReturnValueOnce(tenant);
    removeTenantMock.mockReturnValueOnce(true);

    const result = await removeTenantCommand({ tenantId: tenant.id, actorId: "99" });

    expect(removeTenantMock).toHaveBeenCalledWith(tenant.id);
    expect(executeCommandRuntimeMock).toHaveBeenCalledWith(
      expect.objectContaining({
        model: "tenant",
        operation: "delete",
        recordId: tenant.id,
        actorId: "99",
        source: "api.tenants.delete",
        existingRecord: tenant,
      })
    );
    expect(result.record).toEqual(tenant);
  });

  it("returns null record when delete reports no removal", async () => {
    getTenantMock.mockReturnValueOnce(tenant);
    removeTenantMock.mockReturnValueOnce(false);

    const result = await removeTenantCommand({ tenantId: tenant.id });

    expect(result.record).toBeNull();
  });

  it("passes null existing tenant on delete when record is missing", async () => {
    getTenantMock.mockReturnValueOnce(undefined);
    removeTenantMock.mockReturnValueOnce(true);

    const result = await removeTenantCommand({ tenantId: tenant.id });

    expect(executeCommandRuntimeMock).toHaveBeenCalledWith(
      expect.objectContaining({
        existingRecord: null,
      })
    );
    expect(result.record).toBeNull();
  });
});
