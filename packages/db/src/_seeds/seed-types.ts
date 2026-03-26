import { db } from "../db.js";

/** Drizzle transaction context — inferred to stay in sync with the ORM version. */
export type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

export type SeedScenario = "baseline" | "demo" | "stress";

export type SeedAuditScope = {
  tenantId: number;
  createdBy: number;
  updatedBy: number;
};

export const DEFAULT_TENANT_ID = 1;
export const SYSTEM_ACTOR_ID = 1;
export const DEFAULT_TENANT_CODE = "AFENDA_DEMO";
export const DEFAULT_TENANT_NAME = "AFENDA Demo Tenant";

export function createSeedAuditScope(tenantId: number): SeedAuditScope {
  return {
    tenantId,
    createdBy: SYSTEM_ACTOR_ID,
    updatedBy: SYSTEM_ACTOR_ID,
  };
}
