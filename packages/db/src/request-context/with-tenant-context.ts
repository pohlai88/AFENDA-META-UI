import type { Database } from "../drizzle/client/index.js";
import { setSessionContext, type SessionContext } from "../pg-session/index.js";

/** Drizzle transaction client passed to `withTenantContext` callbacks (same type as `db.transaction` callback arg). */
export type TenantTransaction = Parameters<Parameters<Database["transaction"]>[0]>[0];

type TransactionCallback<T> = (tx: TenantTransaction) => Promise<T>;

/**
 * Runs `fn` inside `db.transaction`, sets Postgres session GUCs via {@link setSessionContext},
 * then executes tenant-scoped work. RLS policies that read `current_setting('afenda.tenant_id', true)`
 * apply for the duration of the transaction.
 *
 * **Drizzle:** One SQL `execute` from `setSessionContext` (batched `set_config` calls) plus your queries,
 * all in the same transaction — compatible with transaction-mode poolers (e.g. Neon PgBouncer).
 *
 * **PostgreSQL:** GUCs use `set_config(..., true)` (transaction-local / SET LOCAL semantics).
 *
 * @see https://www.postgresql.org/docs/current/functions-admin.html#FUNCTIONS-ADMIN-SET
 */
export async function withTenantContext<T>(
  db: Database,
  ctx: SessionContext,
  fn: TransactionCallback<T>
): Promise<T> {
  return db.transaction(async (tx) => {
    await setSessionContext(tx, ctx);
    return fn(tx);
  });
}
