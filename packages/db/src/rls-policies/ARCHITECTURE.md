# Row-Level Security helpers (`rls-policies`) — Architecture

> **Status:** Active  
> **Import path:** `@afenda/db/rls`  
> **Runtime deps:** `drizzle-orm`, `drizzle-orm/pg-core`; **data coupling:** `../pg-session/guc-registry` (tenant GUC name)

---

## Design philosophy

| Concern | Approach |
| ------- | -------- |
| Tenant isolation | Postgres RLS + session GUC `afenda.tenant_id` (same literal as `pg-session`) |
| App vs service | `app_user` restricted; `service_role` bypass for migrations/jobs |
| Drizzle | Declarative `pgPolicy` on table definitions; migrations emit `CREATE POLICY` |
| Identifier | Standard column `tenant_id` on all tenant-scoped tables (`TENANT_SCOPED_COLUMN`) |

---

## Module role

Produces reusable **policy objects** attached to `pgTable` second-argument callbacks. Does **not** enable RLS by itself — that belongs in schema/migration DDL alongside table creation.

- **Upstream:** Schema modules under `src/schema/**`
- **Downstream:** PostgreSQL planner/executor applies policies after connection + GUCs are set
- **Boundary:** No runtime queries here — compile-time schema only

### Boundary position

```
schema/*.ts (pgTable + tenantIsolationPolicies + serviceBypassPolicy)
        |
        v
drizzle-kit generate / migrations
        |
        v
PostgreSQL (ENABLE ROW LEVEL SECURITY + policies)
        |
        v
Runtime: withTenantContext → setSessionContext → current_setting in policy
```

---

## Policy naming

Policies are named `${tableName}_tenant_{select|insert|update|delete}` and `${tableName}_service_bypass`. `tableName` must be the **physical** Postgres table name (often the second argument to `salesSchema.table("partners", ...)` → `"partners"`).

---

## Roles

| Role | Drizzle | Intended use |
| ---- | ------- | -------------- |
| `app_user` | `appUserRole` | Application pool user |
| `service_role` | `serviceRole` | Elevated maintenance |

---

## Governance rules

1. Always add **tenant isolation pack** before **service bypass** so permissive policies combine predictably.  
2. If a table uses a non-`tenant_id` tenant column, **do not** use these helpers — write custom `pgPolicy` expressions.  
3. Keep `tenantIsolationCheck()` in sync with `AFENDA_SESSION_GUCS.tenantId` (imported from `guc-registry`).  
4. Document new tenant-scoped domains in package `ARCHITECTURE.md` when introducing new schemas.

---

## Testing strategy

- Integration: `src/__test__/rls.test.ts` exercises GUC + RLS behavior against a live DB.  
- Smoke: `__test__/tenant-policies.test.ts` asserts policy factory shape.

---

## Summary

`rls-policies` centralizes the AFENDA tenant RLS pattern for Drizzle schema authors and ties policy SQL to the same GUC names as `pg-session`, reducing drift and cross-tenant data exposure risk.

**Related:** [README.md](./README.md)
