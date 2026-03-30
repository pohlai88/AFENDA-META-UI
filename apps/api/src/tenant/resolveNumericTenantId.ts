import { eq, sql } from "drizzle-orm";

import type { Db } from "../db/index.js";
import { tenants } from "@afenda/db/schema/core";

/**
 * Resolve a tenant identifier from JWT / header context to `core.tenants.tenant_id`.
 * Accepts numeric string (tenant id) or case-insensitive `tenant_code`.
 */
export async function resolveNumericTenantId(
  db: Db,
  rawTenantId: string
): Promise<number | null> {
  const trimmed = rawTenantId.trim();
  if (!trimmed || trimmed === "default") {
    return null;
  }

  if (/^\d+$/.test(trimmed)) {
    const id = Number.parseInt(trimmed, 10);
    const [row] = await db
      .select({ tenantId: tenants.tenantId })
      .from(tenants)
      .where(eq(tenants.tenantId, id))
      .limit(1);
    return row?.tenantId ?? null;
  }

  const [row] = await db
    .select({ tenantId: tenants.tenantId })
    .from(tenants)
    .where(sql`lower(${tenants.tenantCode}) = lower(${trimmed})`)
    .limit(1);

  return row?.tenantId ?? null;
}
