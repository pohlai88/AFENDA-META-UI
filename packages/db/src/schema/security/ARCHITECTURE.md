# Security domain schema — Architecture

> **Status:** Production — RBAC and tenant identity (`security.*`) inside `@afenda/db`
> **Import path:** `@afenda/db/schema` (re-exports) · `@afenda/db/schema/security` (subpath)
> **Tests:** `schema/security/__test__` (Vitest) + `pnpm ci:gate:schema-quality` (RELATIONS_DRIFT)
> **Runtime deps:** (via package) `drizzle-orm`, `zod`; local helpers `column-kit`, `rls-policies`, `core.tenants`

---

## Design philosophy

| Old approach | New approach |
| ------------ | ------------ |
| `securitySchema` owned by `users.ts` and cross-imports from “users as schema root” | `_schema.ts` owns `pgSchema("security")` and `securityTenantSqlColumn` |
| Enums and branded IDs colocated per file | `_enums.ts` + `_zodShared.ts` centralize pgEnum/Zod and branded IDs |
| No relations catalog for SECURITY→SECURITY edges | `_relations.ts` documents internal FK semantics (HR-style) |
| Minimal barrel, ad-hoc consumer imports | Layered `index.ts` (infra → policy → tables → `securityWire`); package exports `@afenda/db/schema/security` and `/wire` |
| RLS only on some tables; single-column audit FKs only | All six tenant tables: tenant isolation + service bypass; composite `(tenant_id, …)` FKs where needed |
| Light or missing domain docs | README + ARCHITECTURE (this file) + `security-docs/SCHEMA_LOCKDOWN.md` |

---

## Module role

This folder is the **canonical Drizzle + Zod definition** of the PostgreSQL `security` namespace: users, roles, role assignments, permission registry, and junction tables for role- and user-level grants. It enforces **multi-tenant row isolation** at the database layer and aligns structurally with the **HR domain** (underscore infra files, bounded-context domain modules, relations catalog).

- **Upstream consumers:** `schema/hr/*`, `schema/sales/*`, `schema/reference/*`, `schema/core/*`, application services that import `@afenda/db/schema` or `@afenda/db/schema/security`
- **Downstream:** PostgreSQL (`security.*` tables, enums, policies, constraints); Drizzle migrations under `packages/db/migrations/`
- **Boundary:** No application HTTP or UI logic here. Cross-domain FKs point **into** `security.users` for audit actors and identity links; tenant root remains `core.tenants`.

### Boundary position

```
                    ┌─────────────────────┐
                    │  apps/api, workers  │
                    └──────────┬──────────┘
                               │ import schema types / tables
                    ┌──────────▼──────────┐
                    │  @afenda/db/schema  │
                    │  (+ schema/security)│
                    └──────────┬──────────┘
                               │
         ┌─────────────────────┼─────────────────────┐
         │                     │                     │
┌────────▼────────┐   ┌────────▼────────┐   ┌────────▼────────┐
│  schema/hr      │   │  schema/sales   │   │  schema/core   │
│  (references    │   │  (references    │   │  tenants       │
│   users)        │   │   users)        │   │                │
└─────────────────┘   └─────────────────┘   └────────┬────────┘
                                                       │
                                            ┌──────────▼──────────┐
                                            │  security/*         │
                                            │  users, roles, …    │
                                            └──────────┬──────────┘
                                                       │
                                            ┌──────────▼──────────┐
                                            │  PostgreSQL         │
                                            │  namespace security │
                                            └─────────────────────┘
```

---

## Repository structure (this domain)

```
packages/db/src/schema/security/
├── ARCHITECTURE.md              # This document
├── README.md                    # Quick start, imports, inventory, wire contract
├── index.ts                     # Public barrel (infra → policy → tables → wire)
├── _schema.ts                   # securitySchema, securityTenantSqlColumn
├── _enums.ts                    # user_status, permission_grant_type + Zod
├── _zodShared.ts                # UserId, RoleId, PermissionId, UserRoleId brands
├── _relations.ts                # SECURITY→SECURITY relation catalog (RELATIONS_DRIFT)
├── permission-precedence.ts     # Pure precedence (no SQL)
├── users.ts                     # users
├── roles.ts                     # roles
├── userRoles.ts                 # user_roles
├── permissions.ts               # permissions, role_permissions, user_permissions
├── wire.ts                      # securityWire (Zod JSON bundle)
├── __test__/                    # Vitest: wire, precedence, relations, contracts, schemas
└── security-docs/               # Doc hub — see security-docs/README.md
    ├── README.md                # Index: every module + tests + cross-links
    ├── SCHEMA_LOCKDOWN.md       # Governance checklist
    └── PERMISSION_RUNTIME.md    # queries/security (hasPermission, resolver)
```

---

## Table-first schema analysis

### Inventory snapshot

**6 tables** in `security.*`, grouped into identity, RBAC definitions, and grant junctions. All are tenant-scoped (FK to `core.tenants`) except where noted; all six use RLS + `service_role` bypass.

### Schema-basis breakdown

| Schema basis | Tables | Notes |
| ------------ | ------ | ----- |
| Tenant identity | `users` | PK `userId`; soft delete; self-referential audit via composite `(tenantId, created_by|updated_by)` → `(tenantId, userId)` |
| Role definitions | `roles` | `roleCode` + optional JSONB `permissions` hint; soft delete; audit columns |
| Assignments | `user_roles` | Composite PK `(userId, roleId)`; `assignedBy`, optional `expiresAt` with CHECK vs `assignedAt` |
| Permission registry | `permissions` | Stable `key` (resource.action shape); soft delete |
| Role ↔ permission | `role_permissions` | Unique `(tenantId, roleId, permissionId)` |
| User ↔ permission | `user_permissions` | Direct grants; optional `reason` |

### Legacy + new planning continuity

- **Physical naming:** Tenant FK column in PostgreSQL remains **`tenant_id`** (snake_case) for `security.*`; this is explicit in code via `securityTenantSqlColumn` and RLS helpers (see `rls-policies/tenant-policies.ts` optional tenant column argument).
- **No silent table drops:** Removing or renaming tables requires an approved migration and doc updates (README, this file, lockdown).
- **Additive enums:** Extend `user_status` (and future enums) additively unless a breaking migration is explicitly approved.

### Table evolution rules

- Prefer **additive** columns and indexes; use partial unique indexes for soft-delete-aware uniqueness.
- Any new **SECURITY→SECURITY** `foreignKey()` must be reflected in `_relations.ts`.
- **RLS:** Every new tenant-scoped security table gets `tenantIsolationPolicies(name, securityTenantSqlColumn)` and `serviceBypassPolicy(name)`.
- **Migrations:** Hand-authored SQL for policy/FK/index bundles lives under `packages/db/migrations/` with idempotent patterns where practical.

---

## Core architecture

### 1. HR-parity module split

Infrastructure lives in underscore-prefixed files (`_schema`, `_enums`, `_zodShared`, `_relations`). **Policy** (`permission-precedence`) and **domain tables** (`users`, `roles`, `userRoles`, `permissions`) follow in FK order; **`securityWire`** closes the barrel. This matches `schema/hr/index.ts` discipline. Table definitions stay out of `_relations.ts` and `_enums.ts` except for enum ownership.

### 2. Tenant isolation and composite FKs

**RLS** predicates compare the session GUC to the row’s tenant column; security passes the literal column name `tenant_id` so generated policies match existing PostgreSQL identifiers. **Composite foreign keys** tie child `(tenantId, entityId)` to parent `(tenantId, entityId)` with supporting `UNIQUE (tenant_id, …)` on parents, reducing cross-tenant reference bugs. **CHECK** on `user_roles` enforces `expiresAt` after `assignedAt` when set.

### 3. Migrations and drift

Composite FK + extended RLS for tables that previously lacked policies are applied via dedicated migration SQL (see README “Migrations” pointer). CI **drizzle-schema-quality** counts `tenantIsolationPolicies("table", secondArg)` via an updated matcher so security’s two-argument calls pair correctly with `serviceBypassPolicy`.

---

## Design patterns

- **Drizzle `securitySchema.table`:** explicit `foreignKey`, `index` / `uniqueIndex`, `check` where needed; named constraints for operability in migrations.
- **Zod:** `createSelectSchema` / `createInsertSchema` / `createUpdateSchema` beside tables; overrides for email, branded IDs from `_zodShared`, refinements (e.g. future-dated `expiresAt` on inserts).
- **Column kit:** `timestampColumns`, `softDeleteColumns`, `nameColumn` on applicable tables; audit `created_by` / `updated_by` as plain integers + composite FKs to `users` (avoid implicit `.references()` duplication).
- **Relations catalog:** `_relations.ts` types and objects mirror HR’s `hrRelations` style for documentation; CI **RELATIONS_DRIFT** compares this catalog to extracted `foreignKey()` edges for **hr, sales, and security** (see `tools/ci-gate/drizzle-schema-quality/rules/relations-drift.mjs`).

---

## Consumer map

| Consumer area | Typical import | Usage |
| ------------- | -------------- | ----- |
| HR schema | `../security/index.js` | `users`, `UserIdSchema`, audit FK targets |
| Sales / reference / core | `../security/index.js` or `@afenda/db/schema` | `users` for actor columns and links |
| Column-kit tests / docs | `../../schema/security/index.js` | Shared-column coverage against `users` |
| Postgres-schema CI gate | Explicit list of `security/*.ts` paths | Truth extraction for platform matrices |
| Application API | `@afenda/db/schema` | Runtime queries (with tenant session + RLS) |
| Permission resolution | `@afenda/db/queries/security` | `hasPermission`, `createPermissionResolver` (uses `permission-precedence`) |

---

## Testing strategy

- **Domain-local:** `schema/security/__test__/` — wire contract, precedence, relations, enums, per-table schema tests, contracts (RELATIONS_DRIFT + RLS counts).
- **Queries:** `packages/db/src/queries/security/__test__/` — DB-backed `hasPermission` / resolver parity (opt-in `DB_SECURITY_PERMISSION_TESTS=1`).
- **Package-level:** Tests that import `users` from the security barrel (e.g. column-kit) guard breakage of the public surface.
- **CI:** Run `pnpm ci:gate:schema-quality` (full) on merge-worthy changes; optionally `--glob=packages/db/src/schema/security/**/*.ts` for a fast slice during development.

---

## Build and typecheck

```bash
# From repo root
pnpm --filter @afenda/db typecheck

# Schema quality (full gate)
pnpm ci:gate:schema-quality

# Schema quality — security only, fast mode
node tools/ci-gate/drizzle-schema-quality/index.mjs --mode=fast --glob=packages/db/src/schema/security/**/*.ts --baseline=tools/ci-gate/drizzle-schema-quality/baseline.json
```

---

## Governance rules

1. Follow [security-docs/SCHEMA_LOCKDOWN.md](./security-docs/SCHEMA_LOCKDOWN.md) for day-to-day change discipline.
2. Keep **barrel-only** imports for consumers outside `security/` (exceptions only for tooling allowlists).
3. Update **README table inventory** and this **ARCHITECTURE** breakdown when adding tables or bounded contexts.
4. Run **full** schema-quality before merging structural or RLS changes.
5. Record non-trivial hand SQL in `packages/db/migrations/` with clear comments; prefer idempotent `DO` blocks for policy creation.

---

## Import strategy

```typescript
// Recommended — package subpath (matches package.json exports)
import { users, roles, userRoles, UserIdSchema } from "@afenda/db/schema";

// Or explicit security barrel
import { permissions, rolePermissions, userPermissions } from "@afenda/db/schema/security";

// Inside packages/db schema code — relative barrel
import { users, UserIdSchema } from "../security/index.js";
```

Do not import `../security/users.js` from sibling domains unless a CI tool requires an explicit file path; prefer `index.js` for consistency with HR.

---

## Summary

The security domain is a **small, high-leverage** schema: six tables, strict tenant isolation, and composite FK hardening aligned with HR’s organizational patterns. Treat `_schema`, `_enums`, `_zodShared`, and `_relations` as **contracts** alongside the domain `.ts` files; keep documentation ([README](./README.md), this file, [security-docs/](./security-docs/README.md)) updated whenever the physical model or RLS story changes.

**Related:** [README.md](./README.md) · [security-docs/README.md](./security-docs/README.md) · [security-docs/SCHEMA_LOCKDOWN.md](./security-docs/SCHEMA_LOCKDOWN.md) · [security-docs/PERMISSION_RUNTIME.md](./security-docs/PERMISSION_RUNTIME.md)
