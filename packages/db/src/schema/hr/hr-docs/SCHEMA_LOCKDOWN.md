# HR Schema Lockdown — Governance & Conventions

> Canonical rules for `packages/db/src/schema/hr/`. Every PR touching HR tables **must** follow these.

## File Organisation

**Authoritative map:** [HR_SCHEMA_UPGRADE_GUIDE.md](./HR_SCHEMA_UPGRADE_GUIDE.md) → **P0 domain placement audit** (every domain file, table count, bounded context). All modules use `hrSchema` from `_schema.ts` (`pgSchema("hr")`).

**Placement rules (summary):**

- **People / org:** `people.ts` — departments, titles, positions, employees, cost centers.
- **Contracts + legacy benefit catalog:** `employment.ts` — not the same as `benefits.ts` (provider-centric enrollments/claims); see audit note on dual benefit models.
- **Expenses:** `expenses.ts` only — not `operations.ts`.
- **Exit / lifecycle:** `lifecycle.ts` — e.g. `hrExitInterviews`; not `operations.ts`.
- **Onboarding & employee documents:** `operations.ts` — with optional policy link to `policyAcknowledgments.ts`.
- **Attendance core vs extensions:** `attendance.ts` vs `attendanceEnhancements.ts` (requests, OT rules, biometric, shift swap).
- **Performance vs skills taxonomy:** `talent.ts` vs `skills.ts` — intentional split.

**New tables** must extend the domain file that matches the bounded context in the audit. If two domains apply, pick the narrower module, wire FKs in `_relations.ts`, and update the audit table in the same PR.

## Mandatory Patterns

### 1. Composite Foreign Keys (tenant isolation)

Every FK referencing a table within the HR schema **must** include `tenantId`:

```ts
foreignKey({
  columns: [table.tenantId, table.employeeId],
  foreignColumns: [employees.tenantId, employees.id],
})
```

Single-column FKs are only acceptable for:
- `tenantId → tenants.tenantId` (the tenant itself)
- `currencyId → currencies.currencyId` (reference tables without tenantId)

### 2. Tenant-Leading Indexes

Every non-unique index **must** start with `table.tenantId`:

```ts
index("my_table_employee_idx").on(table.tenantId, table.employeeId)
```

This ensures the Postgres planner can prune by tenant on every query.

### 3. Soft-Delete Unique Indexes

Tables with `...softDeleteColumns` **must** use a partial unique index:

```ts
uniqueIndex("my_table_tenant_code_unique")
  .on(table.tenantId, table.code)
  .where(sql`${table.deletedAt} IS NULL`)
```

This allows re-use of business codes after soft deletion.

### 4. CHECK Constraints

Add `check()` constraints for business invariants:

| Constraint type | Example |
|----------------|---------|
| Non-negative amounts | `check("name", sql\`${table.amount} >= 0\`)` |
| Positive quantities | `check("name", sql\`${table.quantity} > 0\`)` |
| Date ranges | `check("name", sql\`${table.startDate} <= ${table.endDate}\`)` |
| Bounded values | `check("name", sql\`${table.hours} >= 0 AND ${table.hours} <= 24\`)` |

### 5. RLS Policies

Every table must include both policies:

```ts
...tenantIsolationPolicies("table_name"),
serviceBypassPolicy("table_name"),
```

### 6. Enums vs `jsonb` vs plain `text`

Use the right Postgres type for the kind of data you are storing. This keeps workflow states consistent and tenant customization auditable.

| Kind of data | Use | Notes |
|--------------|-----|--------|
| **Workflow / lifecycle invariants** | `pgEnum` in `_enums.ts` | Same state names for every tenant; never encode status as unstructured JSON. |
| **Tenant scope, metadata, mappings, rule payloads** | Native `jsonb` + Zod | No “JSON in `text`” with casts at query time; pair columns with Zod (`_zodShared.ts` helpers such as `metadataSchema`, `jsonObjectNullishSchema`, `z.json()`, or typed arrays/objects). Add GIN on `jsonb` when you filter or contain-query the payload. For production GIN/partition tuning, see [HR_JSONB_INDEX_AND_PARTITION_RUNBOOK.md](./HR_JSONB_INDEX_AND_PARTITION_RUNBOOK.md). |
| **Human prose, DSL strings, RRULE** | `text` | Examples: `calculation_formula`, `recurrence_rule`, long descriptions. Do not migrate these to `jsonb` unless the product adopts a structured AST or schema. |
| **Highly structured repeating data** | Normalized tables | Prefer junction/child rows (e.g. skills achievements) over large JSON blobs when the domain already has a normalization path. |

**`biometric_logs.raw_data`:** Treat as **JSON-only** at the boundary: invalid legacy rows should be nulled during migration; devices should emit JSON objects or arrays. If a vendor sends opaque non-JSON bytes, store a string wrapper in JSON (e.g. `{ "opaque": "..." }`) in application code rather than bypassing the type.

### 7. Column Helpers

Use shared column helpers — never define `created_at`, `updated_at`, `deleted_at`, `name`, or audit fields manually:

- `...timestampColumns` — created_at, updated_at
- `...auditColumns(() => users.userId)` — created_by, updated_by (FK to `security.users`)
- `...softDeleteColumns` — deleted_at, deleted_by
- `...nameColumn` — name (text, not null)

## Import Rules

- All cross-file table imports within `hr/` use relative paths: `from "./people.js"`
- Cross-schema imports use relative paths: `from "../core/tenants.js"`
- The barrel `index.ts` is the **only** public API — external code imports `from "../hr/index.js"`
- Never import from a specific subfile outside of the `hr/` directory

## Naming Conventions

- **Table variables**: camelCase plural (`employees`, `jobOpenings`)
- **SQL table names**: snake_case (`job_openings`)
- **Index names**: `{table}_{columns}_idx` for indexes, `{table}_{columns}_unique` for unique
- **FK constraint names**: auto-generated (Drizzle default)
- **CHECK names**: `{table}_{column}_check` or `{table}_{rule}_check`
- **Enum imports**: from `./_enums.js` only
