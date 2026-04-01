# PostgreSQL session GUCs (`pg-session`) — Architecture

> **Status:** Active  
> **Import path:** `@afenda/db/pg-session`  
> **Tests:** `packages/db/src/__test__/rls.test.ts` (integration)  
> **Runtime deps:** `drizzle-orm` (SQL building only)

---

## Design philosophy

| Concern | Approach |
| ------- | -------- |
| Tenant isolation | Defence-in-depth: app passes explicit `tenantId`, Postgres RLS reads `afenda.tenant_id` |
| Pooling (Neon / PgBouncer) | Transaction-local GUCs via `set_config(..., true)` — same transaction as queries |
| Round-trips | One `SELECT` with multiple `set_config` calls per `setSessionContext` / `clearSessionContext` |
| Drizzle | Uses `sql` fragments + parameterized values; GUC **names** come from a fixed registry only |

---

## Module role

`pg-session` is the **low-level** API that writes AFENDA custom GUCs. Higher layers (`request-context`) wrap it in `db.transaction` so RLS and GUC scope stay aligned.

- **Upstream consumers:** `withTenantContext`, tests, occasional scripts that own a transaction  
- **Downstream:** PostgreSQL session state consumed by RLS policies and truth runtime SQL  
- **Boundary:** No business rules — only validated session variable writes

### Boundary position

```
apps/api middleware / routes
        |
        v
@afenda/db/request-context (withTenantContext)
        |
        v
@afenda/db/pg-session (setSessionContext / clearSessionContext)
        |
        v
PostgreSQL (RLS + current_setting)
```

---

## Structure

```
src/pg-session/
  ARCHITECTURE.md
  README.md
  guc-registry.ts       # Canonical GUC name strings
  set-session-context.ts # setSessionContext, clearSessionContext, types
  index.ts
```

---

## Core architecture

### 1. Transaction-local configuration (PostgreSQL)

`set_config(setting_name, new_value, is_local)` with `is_local = true` applies for the **current transaction only** (SET LOCAL semantics). That matches **transaction-mode** poolers where the backend may change between transactions but not mid-transaction.

### 2. Drizzle `DbExecutor`

`setSessionContext` accepts any object with `execute(query: SQL)`. Drizzle’s transaction callback provides this, keeping the module testable without importing the full `Database` type.

### 3. Registry-driven names

`AFENDA_SESSION_GUCS` is the single source of truth for string names used in `clearSessionContext` and documentation. SQL policies must keep using the same literals.

---

## Governance rules

1. New GUC: extend `guc-registry.ts`, both session functions, migrations/policies that read the variable, and this README table.  
2. Do not trust client-supplied tenant id at the HTTP edge — resolve tenant in middleware/platform layer before building `SessionContext`.  
3. Never pass user-controlled strings into `sql.raw`; GUC names are **only** from the registry. Values use Drizzle parameterization via `sql` templates.  
4. Prefer `withTenantContext` over ad-hoc `setSessionContext` in application code.

---

## Testing strategy

- Integration: RLS tests assert `current_setting('afenda.tenant_id', true)` after `setSessionContext` inside a transaction.  
- Build: `pnpm --filter @afenda/db build` ensures SQL types compile.

---

## Summary

`pg-session` centralizes AFENDA session GUC writes with pooling-safe, transaction-scoped semantics and minimal round-trips. It stays a thin data-plane helper; tenant authority and request wrapping live in `request-context` and the API layer.

**Related:** [README.md](./README.md)
