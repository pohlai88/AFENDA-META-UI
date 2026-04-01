# Security domain — documentation hub

Canonical index for `packages/db/src/schema/security/`. Start here, then open linked docs.

| Document | Purpose |
| -------- | ------- |
| [../README.md](../README.md) | Quick start, imports, table inventory, `securityWire` contract |
| [../ARCHITECTURE.md](../ARCHITECTURE.md) | Boundaries, philosophy, CI, consumers |
| [SCHEMA_LOCKDOWN.md](./SCHEMA_LOCKDOWN.md) | Governance rules and change checklist |
| [PERMISSION_RUNTIME.md](./PERMISSION_RUNTIME.md) | Where DB-backed permission checks live (outside this folder) |

---

## Source file map (schema domain)

Infrastructure and policy are **underscore / dedicated modules**; tables follow **FK order** in the barrel.

| File | Responsibility |
| ---- | -------------- |
| [`index.ts`](../index.ts) | Public barrel: infra → `permission-precedence` → tables → `securityWire` |
| [`_schema.ts`](../_schema.ts) | `securitySchema`, `securityTenantSqlColumn` |
| [`_enums.ts`](../_enums.ts) | `user_status`, `permission_grant_type` + Zod mirrors |
| [`_zodShared.ts`](../_zodShared.ts) | Branded ID schemas, shared refinements |
| [`_relations.ts`](../_relations.ts) | SECURITY→SECURITY FK catalog (RELATIONS_DRIFT) |
| [`permission-precedence.ts`](../permission-precedence.ts) | Pure precedence: inactive permission, user GRANT/DENY, role union |
| [`users.ts`](../users.ts) | `users` + Zod trio |
| [`roles.ts`](../roles.ts) | `roles` + Zod trio |
| [`userRoles.ts`](../userRoles.ts) | `user_roles` + assignment insert/update schemas |
| [`permissions.ts`](../permissions.ts) | `permissions`, `role_permissions`, `user_permissions` + Zod |
| [`wire.ts`](../wire.ts) | `securityWire` — namespaced Zod bundle for JSON/API |

---

## Tests (`__test__/`)

| File | Focus |
| ---- | ----- |
| [`contracts.test.ts`](../__test__/contracts.test.ts) | RELATIONS_DRIFT gate + RLS policy counts |
| [`wire.test.ts`](../__test__/wire.test.ts) | `securityWire` ↔ table schema reference parity |
| [`permission-precedence.test.ts`](../__test__/permission-precedence.test.ts) | Pure precedence invariants |
| [`_relations.test.ts`](../__test__/_relations.test.ts) | Relations catalog shape |
| [`_enums.test.ts`](../__test__/_enums.test.ts) | Enum / Zod alignment |
| [`users-schema.test.ts`](../__test__/users-schema.test.ts) | Users Zod / table |
| [`roles-schema.test.ts`](../__test__/roles-schema.test.ts) | Roles Zod / table |
| [`user-roles-schema.test.ts`](../__test__/user-roles-schema.test.ts) | User roles Zod / refinements |

DB-backed permission parity tests live under [`queries/security/__test__/`](../../../queries/security/__test__/) — `hasPermission.integration.test.ts`, `permissionResolver.integration.test.ts` (opt-in `DB_SECURITY_PERMISSION_TESTS=1`).

---

## Related packages (not in this folder)

| Area | Path |
| ---- | ---- |
| Permission queries | [`queries/security`](../../../queries/security/) — `hasPermission`, `createPermissionResolver` |
| Session / RLS GUCs | [`pg-session`](../../../pg-session/) |
| Seeds (e.g. system user) | [`seeds`](../../../seeds/) |

---

## Cross-domain alignment

HR governance style: `schema/hr/hr-docs/`. Security uses the same discipline: `_relations` updates, full `ci:gate:schema-quality` on structural changes, migrations under `packages/db/migrations/`.
