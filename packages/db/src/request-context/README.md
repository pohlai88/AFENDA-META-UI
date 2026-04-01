# `@afenda/db/request-context`

HTTP-oriented helpers and a **Drizzle transaction wrapper** that sets Postgres session GUCs for **multi-tenant RLS** — the recommended app-layer entry point above `@afenda/db/pg-session`.

**Application tier** — depends on `pg-session`, Drizzle `Database`, and the Web `Headers` API.

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
import {
  withTenantContext,
  getTenantContextFromHeaders,
  requireTenantContextFromHeaders,
  TENANT_CONTEXT_HEADERS,
  type SessionContext,
  type TenantTransaction,
} from "@afenda/db/request-context";
import { db } from "@afenda/db";
```

#### Strategy B — Split imports

```typescript
import { withTenantContext } from "@afenda/db/request-context";
import type { SessionContext } from "@afenda/db/pg-session";
```

---

## Public Surface (summary)

| Export | Purpose |
| ------ | ------- |
| `withTenantContext(db, ctx, fn)` | `db.transaction` + `setSessionContext` + your callback. |
| `getTenantContextFromHeaders(headers)` | Parse trusted middleware headers → `SessionContext \| null`. |
| `requireTenantContextFromHeaders(headers)` | Same as above; throws if tenant id missing/invalid. |
| `TENANT_CONTEXT_HEADERS` | Canonical header name strings (`x-tenant-id`, …). |
| `TenantTransaction` | Type of `tx` passed to the callback. |
| `SessionContext` | Re-exported type alias from `pg-session`. |

---

## Trust boundary (multi-tenant)

Per platform guidance, **tenant identity must not be taken from untrusted clients**. Middleware should:

1. Resolve tenant (hostname, JWT, session, etc.).
2. Authenticate the user or service principal.
3. Set **`TENANT_CONTEXT_HEADERS`** on the **internal** request your handlers see.

`getTenantContextFromHeaders` only parses; it does **not** validate auth.

---

## Header contract

| Header | Required | Value |
| ------ | -------- | ----- |
| `x-tenant-id` | Yes | Positive integer (matches `pg-session` validation). |
| `x-user-id` | No | Positive integer. |
| `x-actor-type` | No | `user` \| `service_principal` \| `system`; otherwise inferred from `x-user-id`. |
| `x-correlation-id` | No | Trace string. |
| `x-request-id` | No | Request id string. |
| `x-session-id` | No | Session id string. |

Use `TENANT_CONTEXT_HEADERS` in middleware so names stay consistent.

---

## Local Development

- Prefer `withTenantContext` over calling `setSessionContext` directly in route code.
- Keep all tenant-scoped queries inside the callback; GUCs are **transaction-local** ([PostgreSQL `set_config`](https://www.postgresql.org/docs/current/functions-admin.html#FUNCTIONS-ADMIN-SET)).

---

## Testing

```bash
pnpm --filter @afenda/db build
pnpm --filter @afenda/db exec vitest run src/__test__/rls.test.ts
```

---

## Related Documentation

- [ARCHITECTURE.md](./ARCHITECTURE.md) — Layering and Drizzle transaction semantics
- [../pg-session/README.md](../pg-session/README.md) — GUC registry and `set_config` batching
- [../drizzle/drizzle-docs/DB_CLIENT_RUNBOOK.md](../drizzle/drizzle-docs/DB_CLIENT_RUNBOOK.md) — Pooling notes
- [../../ARCHITECTURE.md](../../ARCHITECTURE.md) — Package RLS overview

---

## Stability Policy

1. Changing header names is a **breaking** API change for middleware — bump or coordinate with consumers.
2. `withTenantContext` signature should stay stable; extend via new optional helpers if needed.
