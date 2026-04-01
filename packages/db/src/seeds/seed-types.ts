import type { Database } from "../drizzle/db.js";

/** Drizzle transaction context — inferred to stay in sync with the ORM version. */
export type Tx = Parameters<Parameters<Database["transaction"]>[0]>[0];

export type SeedScenario = "baseline" | "demo" | "stress" | "load-test-1M";

export type SeedAuditScope = {
  tenantId: number;
  createdBy: number;
  updatedBy: number;
};

export const DEFAULT_TENANT_ID = 1;
export const SYSTEM_ACTOR_ID = 1;
export const DEFAULT_TENANT_CODE = "AFENDA_DEMO";
export const DEFAULT_TENANT_NAME = "AFENDA Demo Tenant";
export const DEFAULT_SYSTEM_USER_EMAIL = "system@afenda.local";
export const DEFAULT_SYSTEM_USER_NAME = "AFENDA System";

export function createSeedAuditScope(
  tenantId: number,
  actorId: number = SYSTEM_ACTOR_ID
): SeedAuditScope {
  return {
    tenantId,
    createdBy: actorId,
    updatedBy: actorId,
  };
}
