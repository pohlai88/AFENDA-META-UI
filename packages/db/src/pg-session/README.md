# `@afenda/db/pg-session`

PostgreSQL **session variables** (custom GUCs) for tenant isolation, audit identity, and request metadata — set with **transaction-local** `set_config(..., true)` so they align with **PgBouncer transaction pooling** (e.g. Neon).

**Infrastructure tier** — no Drizzle schema; depends on `drizzle-orm` SQL builder and a `DbExecutor` (typically a Drizzle transaction client).

---

## Quick Start

### Installation (within monorepo)

```json
{
  "dependencies": {
    "@afenda/db": "workspace:*"
  }
}
```

### Import Strategies

#### Strategy A — Subpath (recommended)

```typescript
import { setSessionContext, clearSessionContext, AFENDA_SESSION_GUCS } from "@afenda/db/pg-session";
```

**Use when:** You set GUCs manually inside a transaction (advanced) or need the canonical GUC name list.

#### Strategy B — Request wrapper (typical app code)

```typescript
import { withTenantContext } from "@afenda/db/request-context";
import { db } from "@afenda/db";

await withTenantContext(db, { tenantId: 42, userId: 7 }, async (tx) => {
  /* RLS applies using afenda.tenant_id */
});
```

**Use when:** You want one transaction, GUCs set, then your callback — matches multi-tenant + RLS guidance in the Drizzle and platform skills.

---

## Public Surface (summary)

| Export | Purpose |
| ------ | ------- |
| `setSessionContext(db, ctx)` | Batch `set_config(..., true)` for all provided fields (one round-trip). |
| `clearSessionContext(db)` | Reset all registered AFENDA GUCs to `''` in one round-trip. |
| `AFENDA_SESSION_GUCS` | Canonical string names (`afenda.tenant_id`, …). |
| `SessionContext` | Typed payload for tenant/user/actor/tracing fields. |
| `DbExecutor` | Minimal `{ execute(SQL) }` — satisfied by Drizzle transaction clients. |

Full barrel: `@afenda/db/pg-session`.

---

## Session GUCs

| GUC | Role |
| --- | ---- |
| `afenda.tenant_id` | **Required** for tenant RLS (`current_setting(..., true)` in policies). |
| `afenda.user_id` | Audit / truth runtime actor identity. |
| `afenda.actor_type` | `user` \| `service_principal` \| `system`. |
| `afenda.correlation_id` | Cross-service trace correlation. |
| `afenda.request_id` | Per-request id. |
| `afenda.session_id` | Browser/session id. |
| `afenda.ip_address` | Client IP (string). |
| `afenda.user_agent` | Client UA (string). |

---

## Local Development

- Always call `setSessionContext` **inside** `db.transaction()` (see `withTenantContext`). Transaction-local GUCs do not persist across auto-committed statements.
- `tenantId` must be a **positive integer**; invalid values throw before hitting the database.
- Prefer `@afenda/db/request-context` at the app boundary so tenant identity is not client-controlled without middleware validation.

---

## Testing

```bash
pnpm --filter @afenda/db test -- src/__test__/rls.test.ts
pnpm --filter @afenda/db build
```

---

## Related Documentation

- [ARCHITECTURE.md](./ARCHITECTURE.md) — Boundary, Drizzle executor, PgBouncer notes
- [../request-context/with-tenant-context.ts](../request-context/with-tenant-context.ts) — Default transaction wrapper
- [../drizzle/drizzle-docs/DB_CLIENT_RUNBOOK.md](../drizzle/drizzle-docs/DB_CLIENT_RUNBOOK.md) — Pooling + `set_config` note
- [../../ARCHITECTURE.md](../../ARCHITECTURE.md) — Package RLS / GUC overview
- [PostgreSQL: `set_config`](https://www.postgresql.org/docs/current/functions-admin.html#FUNCTIONS-ADMIN-SET)

---

## Stability Policy

1. Adding a new GUC requires updating `guc-registry.ts`, `setSessionContext`, `clearSessionContext`, and any SQL that reads `current_setting`.
2. Do not rename existing GUC strings without a coordinated migration (RLS policies and truth SQL depend on them).
