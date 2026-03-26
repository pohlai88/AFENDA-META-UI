# Adding a Module

This document defines the canonical DB-first path to add a module end-to-end.

## 1. Database First (Required)

Create domain files under `packages/db/src/schema-domain/<domain>/`:

- `_schema.ts` — `pgSchema("<domain>")`
- `_enums.ts` — enum triplet (`as const` + Drizzle enum + Zod enum)
- `_zodShared.ts` — branded IDs and reusable refinement schemas
- `_relations.ts` — domain relation map
- `tables.ts` — table definitions, indexes, constraints, policies, Zod CRUD schemas
- `index.ts` — export all domain modules

Mandatory table requirements:

- `tenantId` on every table
- `...timestampColumns`, `...softDeleteColumns`, `...auditColumns`
- Explicit index for every FK column (tenant-leading where applicable)
- Partial unique indexes for soft-delete-safe uniqueness (`WHERE deletedAt IS NULL`)
- DB `CHECK` constraints for hard invariants
- `tenantIsolationPolicies()` + `serviceBypassPolicy()` in table config

## 2. Schema Exports + Migration

- Export domain from `packages/db/src/schema-domain/index.ts`
- Ensure domain appears via `packages/db/src/schema/index.ts`
- Add migration SQL (`drizzle-kit generate`) for schema/table/index/constraint changes

## 3. Metadata + API

- Add module manifest in `apps/api/src/modules/<domain>/index.ts`
- Ensure metadata introspection includes the new models
- Implement domain logic in `apps/api/src/modules/<domain>/logic.ts` for state transitions and invariants
- Keep generic CRUD routes RBAC-aware and filter-safe

## 4. UI Integration

- Ensure module appears in navigation/menu
- Validate list/form rendering for new fields and relations
- Add custom field widgets only when metadata-driven defaults are insufficient

## 5. Seed + Invariant Coverage

- Extend deterministic seeds in `packages/db/src/_seeds/`
- Ensure tenant scope exists before seeding tenant-bound tables
- Add invariant tests for domain math/state machine rules

## 6. Validation Gates

```bash
pnpm --filter @afenda/db typecheck
pnpm ci:gate:boundaries
pnpm ci:gate:typescript
pnpm ci:contracts
pnpm ci:gate
```

## 7. Definition of Done

- Module schema follows canonical domain pattern
- CRUD + domain logic paths are working and tested
- Seeds are deterministic and tenant-safe
- CI gates pass
- Documentation updated (module behavior, migration impact, operational notes)
