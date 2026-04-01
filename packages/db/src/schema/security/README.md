# `@afenda/db/schema` · Security domain (`security.*`)

PostgreSQL **`security`** namespace: tenant-scoped **users**, **roles**, **permissions**, and junction tables for RBAC. Structured like **`schema/hr`**: infrastructure modules (`_schema`, `_enums`, `_zodShared`, `_relations`), **permission-precedence** (pure policy), table modules in FK order, **`securityWire`** (namespaced Zod for JSON), and the barrel [`index.ts`](./index.ts).

**Data-layer submodule:** `packages/db/src/schema/security/` inside `@afenda/db` (not a standalone npm package).

---

## Quick start

### Installation (within monorepo)

```json
{
  "dependencies": {
    "@afenda/db": "workspace:*"
  }
}
```

### Import strategies

#### Strategy A — Schema barrel (recommended)

```typescript
import {
  users,
  roles,
  userRoles,
  permissions,
  rolePermissions,
  userPermissions,
  UserIdSchema,
} from "@afenda/db/schema";
```

**Use when:** Any app or package already depends on `@afenda/db` and needs tables or Zod types from the shared schema.

#### Strategy B — Security subpath

```typescript
import { users, securitySchema, securityTenantSqlColumn } from "@afenda/db/schema/security";
```

**Use when:** You want a narrower import surface or tooling that resolves the explicit subpath export from `package.json`.

---

## Public surface (summary)

| Export area | Contents |
| ----------- | -------- |
| `_schema` | `securitySchema`, `securityTenantSqlColumn` |
| `_enums` | `userStatusValues`, `userStatusEnum`, `UserStatusSchema`, `permissionGrantTypeValues`, `PermissionGrantTypeSchema`, types |
| `_zodShared` | `UserIdSchema`, `RoleIdSchema`, `PermissionIdSchema`, `UserRoleIdSchema`, types |
| `_relations` | `securityRelations`, `expandSecurityRelationsForDiagram`, `SecurityRelationDefinition` |
| `permission-precedence` | `evaluatePermissionAccess`, `resolvePermissionAccess`, `isRoleAssignmentEffective` — pure; no SQL |
| `users` | `users` table, `userSelectSchema` / insert / update, `User`, `NewUser` |
| `roles` | `roles`, role Zod trio, `RolePermissions` JSON type |
| `userRoles` | `userRoles`, assignment insert/update refinements |
| `permissions` | `permissions`, `rolePermissions`, `userPermissions` + Zod helpers |
| `wire` | `securityWire`, `SecurityWire` — grouped select/insert/update Zod schemas |

Full barrel: [`packages/db/src/schema/security/index.ts`](./index.ts) (also re-exported from `packages/db/src/schema/index.ts`). Narrow wire-only: `@afenda/db/schema/security/wire`.

---

## Wire contract (`securityWire`)

[`wire.ts`](./wire.ts) groups **the same** Drizzle-Zod schema instances exported from table modules — not copies. API and workers should import `securityWire` (or `@afenda/db/schema/security/wire`) when validating JSON; use table modules directly when you need DDL types or raw `createInsertSchema` outputs.

| `securityWire` path | Canonical export (module) |
| ------------------- | ------------------------- |
| `users.select` / `insert` / `update` | `userSelectSchema`, `userInsertSchema`, `userUpdateSchema` (`users.ts`) |
| `roles.*` | `roleSelectSchema`, `roleInsertSchema`, `roleUpdateSchema` (`roles.ts`) |
| `userRoles.select` | `userRoleSelectSchema` (`userRoles.ts`) |
| `userRoles.assignmentInsert` | `userRoleAssignmentInsertSchema` — use for granting a role (refined) |
| `userRoles.update` | `userRoleUpdateSchema` |
| `permissions.row.*` | `permissionSelectSchema`, `permissionInsertSchema`, `permissionUpdateSchema` |
| `permissions.rolePermission.select` / `insert` | `rolePermissionSelectSchema`, `rolePermissionInsertSchema` (no update slot: junction is insert/delete) |
| `permissions.userPermission.*` | `userPermissionSelectSchema`, `userPermissionInsertSchema`, `userPermissionUpdateSchema` |

**Intentionally not on the wire:** `userRoleInsertSchema` — generic insert from `createInsertSchema(userRoles)` without assignment refinements. Prefer `assignmentInsert` for mutations.

**CI:** [`__test__/wire.test.ts`](./__test__/wire.test.ts) asserts reference equality for every wired schema and a fixed leaf count (`17`) so new slots require an explicit test update.

---

## Table inventory (schema modules)

**6 tables** in `security.*`, all tenant-scoped with RLS + `service_role` bypass.

| Schema basis | Tables |
| ------------ | ------ |
| Identity | `users` |
| Role catalog | `roles` |
| User ↔ role | `user_roles` |
| Permission catalog | `permissions` |
| Role ↔ permission | `role_permissions` |
| User ↔ permission | `user_permissions` |

**Legacy / physical naming note:** The tenant FK column is stored as **`tenant_id`** in PostgreSQL for `security.*` (snake_case). Code uses `securityTenantSqlColumn` and `tenantIsolationPolicies(tableName, securityTenantSqlColumn)` so RLS matches the database.

**Table change policy:**

- Add tables with matching migrations, README + ARCHITECTURE updates, and `_relations.ts` entries for internal edges.
- Do not drop or rename tables without an explicit migration plan and stakeholder sign-off.
- Extend enums additively unless a breaking migration is approved.

---

## Feature guides

### RLS and service role

Every table uses `tenantIsolationPolicies("<table>", securityTenantSqlColumn)` and `serviceBypassPolicy("<table>")`. Session context must set the tenant GUC expected by `rls-policies` (see `packages/db/src/pg-session/`). Batch jobs using `service_role` rely on bypass policies.

### Composite foreign keys

Intra-domain and audit references prefer `(tenant_id, …)` child columns referencing parent `(tenant_id, …)`, with unique indexes on parents. See migration `packages/db/migrations/20260331140000_security_hr_pattern_composite_fk_rls/migration.sql` for the DDL bundle that aligns existing databases.

### Relations catalog

[`_relations.ts`](./_relations.ts) lists SECURITY→SECURITY edges in HR-style shape (optional `onDelete` / `onUpdate` for parity with Drizzle). Update it whenever you add or change internal `foreignKey()` definitions. CI **RELATIONS_DRIFT** compares this catalog to extracted `foreignKey()` edges. Use `expandSecurityRelationsForDiagram()` for ERD-style parent→child `one-to-many` views alongside stored `many-to-one` rows.

### Zod and branded IDs

Shared branded numeric IDs live in [`_zodShared.ts`](./_zodShared.ts). Per-table insert/update schemas compose these for API and seed safety.

### DB-backed permission checks (queries package)

Runtime evaluation (`hasPermission`, `createPermissionResolver`) lives in **`@afenda/db/queries/security`**, not under `schema/security`. It reuses [`permission-precedence.ts`](./permission-precedence.ts). See [security-docs/PERMISSION_RUNTIME.md](./security-docs/PERMISSION_RUNTIME.md).

---

## Local development

- Schema lives under `packages/db`; run Drizzle Kit from that package (`pnpm --filter @afenda/db db:generate`, etc.) per repo workflow.
- After editing tables or policies, run **full** `pnpm ci:gate:schema-quality` before opening a PR that touches FKs or RLS.

---

## Testing

```bash
# Security wire + Zod contract (reference sync with table modules)
pnpm --filter @afenda/db exec vitest run src/schema/security/__test__/wire.test.ts

# Example: column-kit coverage touches security.users via barrel
pnpm --filter @afenda/db exec vitest run src/column-kit/__test__/shared-columns.test.ts

# Full schema quality gate (recommended before merge)
pnpm ci:gate:schema-quality
```

---

## ADRs (decisions)

No standalone ADR folder under `security/`. Normative rules live in [**security-docs/SCHEMA_LOCKDOWN.md**](./security-docs/SCHEMA_LOCKDOWN.md). **Doc index:** [**security-docs/README.md**](./security-docs/README.md) (every module + tests + links). For cross-domain HR comparison, see `packages/db/src/schema/hr/hr-docs/`.

---

## Related documentation

- [security-docs/README.md](./security-docs/README.md) — Hub: source file map, tests, cross-links
- [ARCHITECTURE.md](./ARCHITECTURE.md) — Design philosophy, boundaries, table-first analysis, consumers, governance
- [security-docs/PERMISSION_RUNTIME.md](./security-docs/PERMISSION_RUNTIME.md) — `queries/security` entry points
- [security-docs/SCHEMA_LOCKDOWN.md](./security-docs/SCHEMA_LOCKDOWN.md) — Change checklist and rules
- [packages/db/ARCHITECTURE.md](../../ARCHITECTURE.md) — Package-level database architecture (mentions security table count)

---

## Stability policy

- **Tables and public export names** are stable API for other schema packages and apps; breaking renames require migrations and coordinated consumer updates.
- **Internal file layout** may evolve but should stay HR-aligned (underscore infra, domain modules, single barrel).
- **RLS semantics** are part of the security contract; changing predicates requires app/session audit and migration notes.

---

## Checklist (optional)

| Before merge | Done? |
| ------------ | ----- |
| `_relations.ts` updated for new internal FKs | ☐ |
| `SCHEMA_LOCKDOWN` + README inventory if tables changed | ☐ |
| Migration authored / linked for physical DB changes | ☐ |
| `pnpm ci:gate:schema-quality` (full) green | ☐ |
| `securityWire` mapping + `wire.test.ts` leaf count if wire changed | ☐ |
| `security-docs/README.md` file map if you add/rename domain `.ts` files | ☐ |
