import { sql, type SQL } from "drizzle-orm";

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

export async function setSessionContext(db: DbExecutor, ctx: SessionContext): Promise<void> {
  await db.execute(sql`SELECT set_config('afenda.tenant_id', ${ctx.tenantId.toString()}, true)`);

  if (ctx.userId != null) {
    await db.execute(sql`SELECT set_config('afenda.user_id', ${ctx.userId.toString()}, true)`);
  }

  if (ctx.actorType != null) {
    await db.execute(sql`SELECT set_config('afenda.actor_type', ${ctx.actorType}, true)`);
  }

  if (ctx.correlationId != null) {
    await db.execute(sql`SELECT set_config('afenda.correlation_id', ${ctx.correlationId}, true)`);
  }

  if (ctx.requestId != null) {
    await db.execute(sql`SELECT set_config('afenda.request_id', ${ctx.requestId}, true)`);
  }

  if (ctx.sessionId != null) {
    await db.execute(sql`SELECT set_config('afenda.session_id', ${ctx.sessionId}, true)`);
  }

  if (ctx.ipAddress != null) {
    await db.execute(sql`SELECT set_config('afenda.ip_address', ${ctx.ipAddress}, true)`);
  }

  if (ctx.userAgent != null) {
    await db.execute(sql`SELECT set_config('afenda.user_agent', ${ctx.userAgent}, true)`);
  }
}

export async function clearSessionContext(db: DbExecutor): Promise<void> {
  await db.execute(sql`SELECT set_config('afenda.tenant_id', '', true)`);
  await db.execute(sql`SELECT set_config('afenda.user_id', '', true)`);
  await db.execute(sql`SELECT set_config('afenda.actor_type', '', true)`);
  await db.execute(sql`SELECT set_config('afenda.correlation_id', '', true)`);
  await db.execute(sql`SELECT set_config('afenda.request_id', '', true)`);
  await db.execute(sql`SELECT set_config('afenda.session_id', '', true)`);
  await db.execute(sql`SELECT set_config('afenda.ip_address', '', true)`);
  await db.execute(sql`SELECT set_config('afenda.user_agent', '', true)`);
}