import type { Database } from "../../db.js";
import { setSessionContext, type SessionContext } from "./setSessionContext.js";

type TransactionCallback<T> = (tx: Database) => Promise<T>;

export async function withTenantContext<T>(
  ctx: SessionContext,
  fn: TransactionCallback<T>
): Promise<T> {
  const { db } = await import("../../db.js");

  return db.transaction(async (tx) => {
    await setSessionContext(tx, ctx);
    return fn(tx as unknown as Database);
  });
}

export function getTenantContextFromHeaders(headers: Headers): SessionContext | null {
  const tenantIdValue = headers.get("x-tenant-id");
  if (!tenantIdValue) return null;

  const tenantId = Number.parseInt(tenantIdValue, 10);
  if (Number.isNaN(tenantId)) return null;

  const userIdValue = headers.get("x-user-id");
  const parsedUserId = userIdValue ? Number.parseInt(userIdValue, 10) : undefined;

  return {
    tenantId,
    userId: parsedUserId != null && !Number.isNaN(parsedUserId) ? parsedUserId : undefined,
    actorType: parsedUserId != null && !Number.isNaN(parsedUserId) ? "user" : "system",
  };
}
