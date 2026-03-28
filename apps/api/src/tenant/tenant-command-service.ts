import {
  executeCommandRuntime,
  type ExecuteMutationCommandResult,
} from "../policy/command-runtime-spine.js";
import { getTenant, registerTenant, removeTenant, updateTenant } from "./index.js";

import type { TenantDefinition } from "@afenda/meta-types";

type TenantRecord = Record<string, unknown>;

const TENANT_REGISTER_SOURCE = "api.tenants.register";
const TENANT_UPDATE_SOURCE = "api.tenants.update";
const TENANT_DELETE_SOURCE = "api.tenants.delete";

function toTenantRecord(tenant: TenantDefinition): TenantRecord {
  return tenant as unknown as TenantRecord;
}

export async function registerTenantCommand(input: {
  tenant: TenantDefinition;
  actorId?: string;
  source?: string;
}): Promise<ExecuteMutationCommandResult<TenantRecord>> {
  return executeCommandRuntime<TenantRecord>({
    model: "tenant",
    operation: "create",
    actorId: input.actorId,
    source: input.source ?? TENANT_REGISTER_SOURCE,
    nextRecord: toTenantRecord(input.tenant),
    mutate: async () => {
      registerTenant(input.tenant);
      return toTenantRecord(input.tenant);
    },
  });
}

export async function updateTenantCommand(input: {
  tenant: TenantDefinition;
  actorId?: string;
  source?: string;
}): Promise<ExecuteMutationCommandResult<TenantRecord>> {
  const existing = getTenant(input.tenant.id);

  return executeCommandRuntime<TenantRecord>({
    model: "tenant",
    operation: "update",
    recordId: input.tenant.id,
    actorId: input.actorId,
    source: input.source ?? TENANT_UPDATE_SOURCE,
    existingRecord: existing ? toTenantRecord(existing) : null,
    nextRecord: toTenantRecord(input.tenant),
    mutate: async () => {
      updateTenant(input.tenant);
      return toTenantRecord(input.tenant);
    },
  });
}

export async function removeTenantCommand(input: {
  tenantId: string;
  actorId?: string;
  source?: string;
}): Promise<ExecuteMutationCommandResult<TenantRecord>> {
  const existing = getTenant(input.tenantId);

  return executeCommandRuntime<TenantRecord>({
    model: "tenant",
    operation: "delete",
    recordId: input.tenantId,
    actorId: input.actorId,
    source: input.source ?? TENANT_DELETE_SOURCE,
    existingRecord: existing ? toTenantRecord(existing) : null,
    mutate: async () => {
      const removed = removeTenant(input.tenantId);
      return removed && existing ? toTenantRecord(existing) : null;
    },
  });
}
