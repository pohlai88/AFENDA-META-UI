# @afenda/meta-types

Canonical business truth contract for the AFENDA metadata engine.

This package is the Truth Contract Layer: it defines entities, events, invariants, transitions, policy contracts, and shared truth primitives that downstream layers must conform to.

## Purpose

`@afenda/meta-types` is the source of declarative business truth.

- `api` consumes contracts for runtime validation and enforcement orchestration.
- `db` consumes contracts for compiler outputs such as constraints, triggers, and migration artifacts.
- `web` consumes contracts for type-safe rendering and workflow behavior.

## Architecture Role

This package is the `foundation` boundary in the monorepo.

- It must remain dependency-light and stable.
- Upstream packages may depend on it.
- It must not depend on app/domain implementation packages.

## Domain Catalog

| Module               | Role                                  | Runtime Exports                                                 |
| -------------------- | ------------------------------------- | --------------------------------------------------------------- |
| `schema.ts`          | Core metadata model and condition DSL | No                                                              |
| `rbac.ts`            | Session and RBAC result contracts     | No                                                              |
| `module.ts`          | Module/plugin contract model          | No                                                              |
| `layout.ts`          | Recursive layout contract model       | No                                                              |
| `policy.ts`          | Cross-module policy contracts         | No                                                              |
| `audit.ts`           | Audit and masking contracts           | `DEFAULT_MASKING_RULES`                                         |
| `events.ts`          | Event-sourcing contracts              | No                                                              |
| `sandbox.ts`         | Policy simulation contracts           | No                                                              |
| `graph.ts`           | Business truth graph contracts        | `TRUTH_PRIORITY`                                                |
| `mesh.ts`            | Event mesh contracts                  | No                                                              |
| `workflow.ts`        | Workflow contracts                    | No                                                              |
| `tenant.ts`          | Multi-tenant override contracts       | No                                                              |
| `resolutionCache.ts` | Resolution cache contracts/runtime    | `ResolutionCache`, `ResolutionCacheService`                     |
| `utils.ts`           | Shared utility types and guards       | `isJsonObject`, `isJsonArray`, `isJsonPrimitive`, `assertNever` |

## Truth Primitives Taxonomy

- Entities: structural business objects and field contracts.
- Events: immutable records of business facts.
- Invariants: non-negotiable business rules.
- Transitions: allowed lifecycle state changes.
- Relationships: graph edges that connect truth across modules.

## Consumer Map

- `apps/api`
- `apps/web`
- `packages/db`

## Adding a New Domain

1. Add a new module file under `src/` with a `@module` header.
2. Keep domain contracts declarative (no app-layer runtime coupling).
3. Export from `src/index.ts` with `export type *` when type-only.
4. Add tests for any runtime exports or constants.
5. Document the module purpose and expected consumers in this README.

## Contract Stability Policy

1. Mark legacy contracts with `@deprecated` and a replacement path.
2. Keep deprecated contracts for at least one minor release cycle.
3. Remove only in major-version changes with migration notes.
4. Treat compiler output behavior as contract-facing and review in PRs.
