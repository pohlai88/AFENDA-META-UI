import { sql, type SQL } from "drizzle-orm";

import { AFENDA_SESSION_GUCS, type AfendaSessionGucName } from "./guc-registry.js";

export interface SessionContext {
  tenantId: number;
  userId?: number;
  actorType?: "user" | "service_principal" | "system";
  correlationId?: string;
  requestId?: string;
  sessionId?: string;
  ipAddress?: string;
  userAgent?: string;
}

export type DbExecutor = { execute: (query: SQL) => Promise<unknown> };

/** Registry names are internal constants only — validated to avoid accidental sql.raw misuse. */
const GUC_NAME_RE = /^[a-z][a-z0-9_.]*$/i;

function setConfigLocal(gucName: AfendaSessionGucName, value: string): SQL {
  if (!GUC_NAME_RE.test(gucName)) {
    throw new Error(`Invalid session GUC name: ${gucName}`);
  }
  return sql`set_config(${sql.raw(`'${gucName}'`)}, ${value}, true)`;
}

function assertValidTenantId(tenantId: number): void {
  if (!Number.isFinite(tenantId) || !Number.isInteger(tenantId) || tenantId < 1) {
    throw new Error(`SessionContext.tenantId must be a positive integer, got: ${String(tenantId)}`);
  }
}

/**
 * Sets request GUCs using `set_config(..., true)` (SET LOCAL semantics) so values are
 * transaction-scoped — compatible with Neon PgBouncer **transaction** pooling.
 *
 * Uses a **single** `SELECT` with multiple `set_config` calls to reduce round-trips while
 * keeping values parameterized (Drizzle `sql` fragments).
 *
 * **Must run inside the same `db.transaction()` as tenant-scoped queries** (e.g. `withTenantContext`).
 * Standalone `execute` calls that auto-commit break transaction-local GUC scope.
 */
export async function setSessionContext(db: DbExecutor, ctx: SessionContext): Promise<void> {
  assertValidTenantId(ctx.tenantId);

  const parts: SQL[] = [setConfigLocal(AFENDA_SESSION_GUCS.tenantId, String(ctx.tenantId))];

  if (ctx.userId != null) {
    parts.push(setConfigLocal(AFENDA_SESSION_GUCS.userId, String(ctx.userId)));
  }
  if (ctx.actorType != null) {
    parts.push(setConfigLocal(AFENDA_SESSION_GUCS.actorType, ctx.actorType));
  }
  if (ctx.correlationId != null) {
    parts.push(setConfigLocal(AFENDA_SESSION_GUCS.correlationId, ctx.correlationId));
  }
  if (ctx.requestId != null) {
    parts.push(setConfigLocal(AFENDA_SESSION_GUCS.requestId, ctx.requestId));
  }
  if (ctx.sessionId != null) {
    parts.push(setConfigLocal(AFENDA_SESSION_GUCS.sessionId, ctx.sessionId));
  }
  if (ctx.ipAddress != null) {
    parts.push(setConfigLocal(AFENDA_SESSION_GUCS.ipAddress, ctx.ipAddress));
  }
  if (ctx.userAgent != null) {
    parts.push(setConfigLocal(AFENDA_SESSION_GUCS.userAgent, ctx.userAgent));
  }

  await db.execute(sql`SELECT ${sql.join(parts, sql`, `)}`);
}

/** Clears all known AFENDA session GUCs for this transaction (empty string matches RLS `NULLIF(..., '')` patterns). */
export async function clearSessionContext(db: DbExecutor): Promise<void> {
  const parts = (Object.values(AFENDA_SESSION_GUCS) as AfendaSessionGucName[]).map((name) =>
    setConfigLocal(name, "")
  );
  await db.execute(sql`SELECT ${sql.join(parts, sql`, `)}`);
}
