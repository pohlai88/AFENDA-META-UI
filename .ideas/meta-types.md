## Plan: Meta-Types Domain Normalization & ERP Scaling

Restructure `@afenda/meta-types` from a flat 19-file types package into a domain-organized, Zod-validated, runtime-extracted truth contract layer — with a repeatable methodology template for adding new ERP domains. Breaking restructure, single migration pass across all 3 consumers.

---

### Current State: Issues Found

| # | Issue | Impact |
|---|-------|--------|
| 1 | **Flat structure** — 19 files in root `src/` with no domain grouping | Unmanageable as ERP grows |
| 2 | **Runtime in "types" package** — mutation-policy.ts exports 4 functions, resolutionCache.ts re-exports a full LRU class, audit.ts/graph.ts/utils.ts export const objects and guards | Violates foundation-layer contract |
| 3 | **No Zod validation** — web generates Zod at runtime (`zodResolver(schema as any)`); API has no shared schemas | Duplicated validation, runtime `as any` casts |
| 4 | **DB↔Type mismatch** — 5+ `as unknown as` casts in API command services | Unsafe boundaries |
| 5 | **No domain template** — Each new domain added ad-hoc | Inconsistent shapes across domains |
| 6 | **Growing barrel** — Single index.ts mixes `export *` and `export type *` | Erodes tree-shaking |
| 7 | **No Branded IDs** — `Brand<T,B>` utility exists but unused | Structurally identical IDs are mixable |

---

### Phase 1: Domain Directory Structure *(foundation)*

Reorganize from flat to domain-grouped:

```
src/
  core/         → json, brand, utility-types, guards, ids
  schema/       → field-types, field-def, model-meta, condition-dsl, views, permissions, actions
  rbac/         → session, resolution context
  audit/        → change tracking, masking contracts
  events/       → DomainEvent, EventReducer, AggregateSnapshot
  policy/       → PolicyDefinition, MutationPolicy (TYPES ONLY), invariants, sandbox
  graph/        → truth graph nodes/edges
  mesh/         → event mesh pub/sub
  workflow/     → workflow engine types
  platform/     → tenant, organization, cache contracts (TYPES ONLY)
  compiler/     → entity-def, truth-model, state-machine, record-bridge
  module/       → plugin architecture
  layout/       → UI layout contracts
  _template/    → methodology template for new domains
```

New subpath exports replace the current 22 flat paths:

| New Path | Replaces |
|----------|----------|
| `@afenda/meta-types/core` | `./utils` |
| `@afenda/meta-types/schema` | `./schema` |
| `@afenda/meta-types/policy` | `./mutation-policy`, `./invariants`, `./sandbox` |
| `@afenda/meta-types/compiler` | `./entity-def`, `./truth-model`, `./state-machine` |
| `@afenda/meta-types/platform` | `./tenant`, `./organization`, `./resolutionCache` |
| ... | (all others map 1:1 to domain) |

---

### Phase 2: Runtime Extraction *(*depends on Phase 1*)*

| Current Location | Runtime Export | Target |
|---|---|---|
| mutation-policy.ts | `resolveMutationPolicy()`, `isDirectMutationAllowed()`, `assertDirectMutationAllowed()` | `packages/db/src/truth-compiler/mutation-policy-runtime.ts` |
| resolutionCache.ts + runtime/resolution-cache.ts | `ResolutionCache` class, `ResolutionCacheService`, `getGlobalResolutionCache()` | `apps/api/src/tenant/resolution-cache.ts` |
| audit.ts | `DEFAULT_MASKING_RULES` | `apps/api/src/audit/masking-defaults.ts` |
| graph.ts | `TRUTH_PRIORITY` | `packages/db/src/truth-compiler/graph-constants.ts` |
| utils.ts | `assertNever()`, `isJson*()` | **KEEP** in `core/guards.ts` (used monorepo-wide, lightweight) |

After extraction: index.ts becomes 100% `export type *` except `core/` (guards only).

---

### Phase 3: Zod Validation Layer *(parallel with Phase 2)*

Add `zod` as peerDep + devDep. Convention: `.schema.ts` suffix files co-located per domain.

**High-value schemas:**
- `schema/field-types.schema.ts` → `MetaFieldSchema`, `FieldTypeSchema`, `ConditionExpressionSchema`
- `rbac/session.schema.ts` → `SessionContextSchema`, `ResolutionContextSchema`
- `workflow/types.schema.ts` → `WorkflowDefinitionSchema`, `WorkflowInstanceSchema`
- `platform/tenant.schema.ts` → `TenantDefinitionSchema`, `OrganizationDefinitionSchema`

Eliminates `zodResolver(schema as any)` in MetaFormV2.tsx and enables api route-level validation.

---

### Phase 4: Bridge Types & Branded IDs *(parallel with Phase 2)*

**`core/ids.ts`** — Branded IDs for all 8 aggregates:
- `TenantId`, `OrganizationId`, `WorkflowId`, `WorkflowInstanceId`, `SalesOrderId`, `SubscriptionId`, `ReturnOrderId`, `CommissionEntryId`

**`compiler/record-bridge.ts`** — Utility types:
- `RecordOf<T>` — maps meta-types interface to Drizzle row shape (Date→string|Date)
- `RowShape<T>` — adds `id`, `created_at`, `updated_at` columns

Eliminates `as unknown as` casts in tenant-command-service.ts, organization-command-service.ts, workflow-command-service.ts.

---

### Phase 5: Domain Template Methodology *(parallel with Phase 2)*

**`src/_template/README.md`** — standardized checklist:
1. Create domain folder (lowercase, singular)
2. Required files: `types.ts`, optionally `types.schema.ts`, always index.ts
3. Register branded IDs in `core/ids.ts`
4. Add package.json export entry
5. Update `api-contract.test.ts` snapshot
6. Update README domain catalog

**Proof-of-concept:** `src/inventory/` stub (WarehouseDefinition, StockMovement, InventoryItem, LocationDefinition) — validates the template end-to-end.

---

### Phase 6: Consumer Migration *(depends on Phases 1–4)*

Single coordinated pass updating all import paths:

| Package | ~Files | Primary Changes |
|---------|--------|-----------------|
| api | 45 | Domain subpath imports; runtime from new locations |
| web | 35 | Domain subpath imports; Zod schemas for forms |
| db | 25 | `./truth-model` → `./compiler`; mutation-policy runtime locally |
| ci-gate | 5 | assertNever path check, contract snapshot |

---

### Phase 7: CI Gate Updates *(depends on Phase 6)*

1. Update assertNever check in typescript/index.mjs → `src/core/guards.ts`
2. Update declaration export check → new subpath entries
3. Update api-contract.test.ts snapshot
4. Add structural lint: enforce no runtime `export *` outside `core/`

---

### Verification

1. `pnpm --filter @afenda/meta-types run build` — no TSC errors
2. `pnpm --filter @afenda/meta-types run test` — all tests pass (updated)
3. `pnpm --filter @afenda/meta-types gate:export-snapshot` — contract test passes
4. `pnpm run build` (root) — all consumers compile
5. `pnpm run test` (root) — full suite green
6. `pnpm --filter tools-ci-gate run ci:boundaries` — boundary rules pass
7. `pnpm --filter tools-ci-gate run ci:circular` — no circular deps
8. Manual: verify inventory stub compiles + exports correctly

---

### Execution Parallelism

```
Phase 1 (Directory)  ────────────┐
                                  ├──→  Phase 6 (Migration)  →  Phase 7 (CI)
Phase 2 (Runtime Extract)  ─────┤
Phase 3 (Zod Layer)  ───────────┤  (2,3,4,5 parallel after 1)
Phase 4 (Bridge Types)  ────────┤
Phase 5 (Template)  ────────────┘
```

---

### Scope

**Included:** Directory restructure, runtime extraction, Zod layer (high-value only), bridge types, branded IDs, domain template, consumer migration, CI updates

**Excluded:** Zod schemas for ALL types, commission_entry mixed-mode changes, truth-compiler logic changes, new ERP domain implementation beyond inventory stub, package rename

Plan is saved to session memory. Ready for your review — any adjustments before implementation? 

