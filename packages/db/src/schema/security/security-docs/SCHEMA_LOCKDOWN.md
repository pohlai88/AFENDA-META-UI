# Security schema lockdown

Governance aligned with `schema/hr/hr-docs/SCHEMA_LOCKDOWN.md` (adapted for RBAC).

**Doc hub:** [README.md](./README.md) — file map, tests, links to README/ARCHITECTURE and [PERMISSION_RUNTIME.md](./PERMISSION_RUNTIME.md).

## Rules

1. **Single namespace** — All objects live under `security` via `securitySchema` in `_schema.ts`.
2. **Barrel imports** — Outside this folder, import from `../security/index.js` (or package `@afenda/db/schema`). Do not deep-import domain files except in rare tooling allowlists.
3. **Tenant column** — PostgreSQL identifier is **`tenant_id`** (snake_case) on `security.*` tables. Pass `securityTenantSqlColumn` into `tenantIsolationPolicies(...)` so RLS predicates match the physical column.
4. **Composite FKs** — Intra-security and audit references use `(tenant_id, …)` child columns referencing parent `(tenant_id, …)` with supporting `UNIQUE` indexes on parents (`users`, `roles`, `permissions`).
5. **RLS** — Every tenant-scoped security table defines the standard tenant pack **plus** `serviceBypassPolicy`.
6. **Enums** — Workflow-like user states belong in `_enums.ts` with Zod mirrors; do not define ad-hoc pgEnums in domain files.
7. **Branded IDs** — Shared in `_zodShared.ts`; avoid duplicating `*IdSchema` in domain modules.
8. **Relations catalog** — Update `_relations.ts` when adding or changing SECURITY→SECURITY `foreignKey()` edges. CI **RELATIONS_DRIFT** (`drizzle-schema-quality`) compares this catalog to extracted FK edges for **hr, sales, and security** — not HR-only.
9. **Permission precedence** — Document behavior in `permission-precedence.ts` and `permissions.ts` headers. Do not reimplement precedence in ad-hoc SQL; use [`evaluatePermissionAccess`](../permission-precedence.ts) from app code or mirror logic only in tested query modules under `queries/security/`.
10. **`securityWire`** — New Zod wire slots must update [`wire.ts`](../wire.ts), [README wire table](../README.md), and [`__test__/wire.test.ts`](../__test__/wire.test.ts) (reference equality + leaf count).

## Changing this domain

- Update the relevant domain module, then `_enums` / `_zodShared` / `_relations` as needed.
- Add migrations for policy, FK, index, or CHECK changes; keep steps idempotent where possible.
- Run `pnpm ci:gate:schema-quality` (full) before merge.
- Refresh [README.md](../README.md), [ARCHITECTURE.md](../ARCHITECTURE.md), and this folder’s [README.md](./README.md) file map if you add or rename **files** or **tables**.
- If DB-backed permission query behavior changes, update [PERMISSION_RUNTIME.md](./PERMISSION_RUNTIME.md) and tests under `queries/security/__test__/`.
