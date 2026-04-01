import type { TruthVerificationAdapters } from "./adapters.js";
import type { DbInvariantFailureRow, DbMemoryEventRow } from "./dbAdapters.js";
import { mapDbInvariantFailureRow, mapDbMemoryEventRow } from "./dbAdapters.js";

export type TenantScopedDbMemoryEventRow = DbMemoryEventRow & {
  tenant_id: string;
};

export type TenantScopedDbInvariantFailureRow = DbInvariantFailureRow & {
  tenant_id: string;
};

export type TenantScopedProjectionRecord = {
  tenantId: string;
  projection: Record<string, Record<string, unknown>>;
};

export type TenantScopedDbTruthVerificationReaders = {
  readMemoryEventRows(tenantId: string): Promise<readonly TenantScopedDbMemoryEventRow[]>;
  readCurrentProjection(tenantId: string): Promise<TenantScopedProjectionRecord>;
  readInvariantFailureRows(
    tenantId: string,
  ): Promise<readonly TenantScopedDbInvariantFailureRow[]>;
};

export class CrossTenantAccessError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CrossTenantAccessError";
  }
}

function assertTenant(expectedTenantId: string, actualTenantId: string, label: string): void {
  if (expectedTenantId !== actualTenantId) {
    throw new CrossTenantAccessError(
      `${label} tenant mismatch: expected ${expectedTenantId}, received ${actualTenantId}`,
    );
  }
}

export function createTenantScopedDbTruthVerificationAdapters(args: {
  tenantId: string;
  readers: TenantScopedDbTruthVerificationReaders;
}): TruthVerificationAdapters {
  return {
    async readMemoryEvents() {
      const rows = await args.readers.readMemoryEventRows(args.tenantId);
      return rows.map((row) => {
        assertTenant(args.tenantId, row.tenant_id, "memory event row");
        return mapDbMemoryEventRow(row);
      });
    },
    async readCurrentProjection() {
      const result = await args.readers.readCurrentProjection(args.tenantId);
      assertTenant(args.tenantId, result.tenantId, "projection");
      return result.projection;
    },
    async readInvariantFailures() {
      const rows = await args.readers.readInvariantFailureRows(args.tenantId);
      return rows.map((row) => {
        assertTenant(args.tenantId, row.tenant_id, "invariant failure row");
        return mapDbInvariantFailureRow(row);
      });
    },
  };
}
