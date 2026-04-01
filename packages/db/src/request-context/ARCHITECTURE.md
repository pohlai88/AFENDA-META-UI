# Request context (`request-context`) — Architecture

> **Status:** Active  
> **Import path:** `@afenda/db/request-context`  
> **Runtime deps:** `@afenda/db` Drizzle client type, `@afenda/db/pg-session`, Web `Headers`

---

## Design philosophy

| Concern | Approach |
| ------- | -------- |
| Tenant propagation | Headers as a **transport** from middleware to DB layer; authority stays in middleware |
| RLS correctness | `withTenantContext` always pairs GUC writes with `db.transaction` |
| Type safety | Export `TenantTransaction` so handlers type `tx` without reaching into Drizzle generics |
| Validation alignment | Header parsing rejects non–positive integer tenant ids, matching `pg-session` |

---

## Module role

Sits **above** `pg-session` and **below** HTTP routing/middleware:

- Parses **trusted** headers into `SessionContext`.
- Runs work in a Drizzle transaction with session GUCs set so RLS and audit SQL see tenant/user context.

### Boundary position

```
Edge / API middleware (auth + tenant resolution)
        |
        | sets TENANT_CONTEXT_HEADERS
        v
Route / service
        |
        v
getTenantContextFromHeaders / requireTenantContextFromHeaders
        |
        v
withTenantContext(db, ctx, fn)
        |
        v
pg-session setSessionContext → PostgreSQL GUCs → RLS
```

---

## Structure

```
src/request-context/
  ARCHITECTURE.md
  README.md
  header-names.ts      # TENANT_CONTEXT_HEADERS
  tenant-headers.ts    # get / require SessionContext from Headers
  with-tenant-context.ts
  index.ts
```

---

## Core architecture

### 1. Drizzle transaction as the unit of work

`withTenantContext` uses `Database#transaction`. All queries using `tx` share one transaction and one set of transaction-local GUCs — appropriate for **transaction-mode** poolers where each transaction may run on one backend connection.

### 2. Header adapter vs DB adapter

`tenant-headers.ts` is intentionally **thin**: trim, parse integers, optional actor type. No I/O.  
`with-tenant-context.ts` is the only place that couples to Drizzle’s transaction API.

### 3. Optional explicit actor type

Middleware may set `x-actor-type` for service principals; otherwise we infer `user` when `x-user-id` is present, else `system`.

---

## Governance rules

1. Document new headers in `header-names.ts`, `README.md`, and middleware runbooks.  
2. Never add “read tenant id from query/body” helpers here — keep trust at the edge.  
3. If `SessionContext` gains fields, extend header parsing and `pg-session` GUC registry together.

---

## Testing strategy

- RLS integration tests use `setSessionContext` directly on `tx`; they implicitly validate the same GUCs `withTenantContext` sets.  
- Add focused tests for `getTenantContextFromHeaders` if parsing rules grow.

---

## Summary

`request-context` is the **documented, typed bridge** between HTTP middleware conventions and Postgres session state for multi-tenant ERP workloads. It keeps Drizzle and `set_config` details in one place so route code stays small and safe.

**Related:** [README.md](./README.md)
