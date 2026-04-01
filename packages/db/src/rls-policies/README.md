# `@afenda/db/rls` (Row-Level Security)

Drizzle [`pgPolicy`](https://orm.drizzle.team/docs/sql-schema-declaration#rls) helpers for **multi-tenant row isolation** in PostgreSQL: `app_user` sees only rows whose `tenant_id` matches the session GUC `afenda.tenant_id`, while `service_role` can bypass for jobs and migrations.

**Schema tier** — used in table `pgTable(..., (t) => [...])` builders; depends on `drizzle-orm/pg-core` and `../pg-session/guc-registry` (GUC name must match `setSessionContext`).

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

### Typical table definition

```typescript
import { tenantIsolationPolicies, serviceBypassPolicy } from "@afenda/db/rls";

export const partners = salesSchema.table(
  "partners",
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    tenantId: integer().notNull(),
    // ...
  },
  (table) => [
    foreignKey({ columns: [table.tenantId], foreignColumns: [tenants.tenantId] }),
    ...tenantIsolationPolicies("partners"),
    serviceBypassPolicy("partners"),
  ]
);
```

**Requirements**

- Tenant FK column must map to SQL **`tenant_id`** (`TENANT_SCOPED_COLUMN`) so it matches `tenantIsolationCheck()`.
- Session must set `afenda.tenant_id` inside a transaction — use `@afenda/db/request-context` **`withTenantContext`** (or `setSessionContext` on `tx`).

---

## Public Surface (summary)

| Export | Purpose |
| ------ | ------- |
| `tenantIsolationPolicies(tableName)` | Four permissive policies: select / insert / update / delete for `app_user`. |
| `serviceBypassPolicy(tableName)` | All operations for `service_role` (`USING true`). |
| `tenantIsolationCheck()` | SQL expression shared by policies (uses GUC from `AFENDA_SESSION_GUCS`). |
| `appUserRole` / `serviceRole` | Existing Postgres roles referenced by policies. |
| `TENANT_SCOPED_COLUMN` | `"tenant_id"` — documented contract for table definitions. |

---

## PostgreSQL semantics

- **RLS** is enforced only when enabled on the table (`ENABLE ROW LEVEL SECURITY` in migrations / Drizzle).
- Policies use `current_setting('afenda.tenant_id', true)` — missing_ok `true` avoids errors when the GUC is unset (rows do not match).
- **Defence in depth:** app code should still filter by tenant; RLS blocks mistakes and direct SQL.

PostgreSQL: [Row Security Policies](https://www.postgresql.org/docs/current/ddl-rowsecurity.html), [`current_setting`](https://www.postgresql.org/docs/current/functions-admin.html#FUNCTIONS-ADMIN-SET).

---

## Related Documentation

- [ARCHITECTURE.md](./ARCHITECTURE.md) — Roles, policy naming, ordering
- [../pg-session/README.md](../pg-session/README.md) — GUC registry and `set_config`
- [../request-context/README.md](../request-context/README.md) — `withTenantContext`
- [../../ARCHITECTURE.md](../../ARCHITECTURE.md) — Package RLS overview

---

## Stability Policy

1. Do not rename `afenda.tenant_id` without updating `pg-session/guc-registry.ts` and all migrations referencing it.
2. New tenant-scoped tables should use `...tenantIsolationPolicies("physical_table_name")` with the **Postgres** table name used in policy object names.
