# @afenda/meta-types → Truth Contract Layer

> Unified upgrade plan: engineering quality + Truth Engine maturity.
> Both plans merged with explicit architecture decisions at each fork.

---

## The Reframe

`@afenda/meta-types` is **not** a utility package. It is **not** a shared types folder.

It is:

> **The Schema of Reality — the canonical Business Truth Language.**

Everything else (DB, API, UI) is a **projection** of this layer.

The engineering plan below treats it as such: every step either hardens the contract or extends its semantic power.

## Terminology Canon

To keep this plan internally consistent, these terms are used with strict meanings:

- **Truth Contract Layer**: The package boundary (`@afenda/meta-types`) that owns declarative business truth definitions.
- **Truth DSL**: The type-level definitions and registries authored in the Truth Contract Layer.
- **Truth Model**: The normalized manifest compiled from Truth DSL and consumed by compiler stages.
- **Compiler Output Artifact**: Deterministic generated outputs (SQL, Drizzle schema, migration artifacts) committed and reviewed in PRs.
- **Truth Runtime**: The write gateway flow (`command -> event -> validation -> projection`) for opted-in bounded contexts.

All sections below follow this canonical vocabulary.

---

## Implementation Status Update (2026-03-27)

This section reflects the **actual repository implementation state** as of 2026-03-27.

### Verified Signals

- `pnpm --filter @afenda/meta-types test:run` -> passed (`5 files`, `21 tests`)
- `pnpm --filter @afenda/meta-types lint:strict` -> passed
- `pnpm --filter @afenda/db exec vitest run src/truth-compiler/dependency-graph.test.ts src/truth-compiler/event-compiler.test.ts` -> passed (`2 files`, `4 tests`)
- `pnpm --filter @afenda/api exec vitest run src/policy/invariant-enforcer.test.ts` -> passed (`1 file`, `4 tests`)
- `pnpm --filter @afenda/db truth:generate` -> completed (`packages/db/migrations/generated/truth-v1.sql`)
- `pnpm --filter @afenda/db truth:check` -> passed
- `Set-Location apps/api; pnpm vitest run src/modules/sales/__test__/sales-order-command-service.test.ts src/routes/__test__/sales.route.test.ts` -> passed (`2 files`, `29 tests`)
- `Set-Location apps/api; pnpm vitest run src/modules/sales/__test__/subscription-command-service.test.ts src/modules/sales/__test__/return-order-command-service.test.ts src/events/__test__/projectionRuntime.test.ts src/routes/__test__/sales.route.test.ts` -> passed (`4 files`, `37 tests`)
- `pnpm --dir apps/api typecheck` -> passed
- `pnpm run build` (workspace root) -> passed

### Phase Progress Matrix

| Phase | Status | Notes |
| ----- | ------ | ----- |
| `0` Reframe & Document | Done | README exists, package description updated, `@module` headers present across meta-types modules. |
| `1` Quality Gates | Done | Local ESLint + Vitest setup in `@afenda/meta-types`; runtime and constants tests are implemented and green. |
| `2` Structural Hardening | Done | Runtime moved under `src/runtime/`; backward-compatible re-export retained; subpath exports added; consumer mappings now resolve to `dist`. |
| `3` Truth Engine Foundations | Done | `invariants.ts`, `state-machine.ts`, `truth-model.ts`, and event transition binding are implemented and exported. |
| `3.6` Compiler V1 | Done (local gates) | Compiler modules + API invariant enforcer exist; scripts wired; generated artifact is now present and `truth:check` passes locally. |
| `3.7` Compiler V2 Extensions | Partial (compiler/runtime slice substantially complete) | Cross-invariant compiler now emits `check`, `trigger`, and `deferred-trigger` SQL with dependency-ordered assembly, including join-backed multi-model trigger evaluation via explicit `joinPaths`. A real join-backed cross invariant is now wired into compiler input, and the generic API CRUD path routes writes through a mutation command gateway that blocks unsupported bulk writes and appends command-mapped domain events across sales orders, subscriptions, and return orders. Bounded-context command orchestration is now live for sales-order confirm/cancel, subscription activate/cancel, and return-order approve routes. Remaining: migrate more opted-in write paths off generic CRUD and reduce dual-write surface area. |
| `3.8` Engine V5 Foundations | Partial (runtime hardening in progress) | Projection runtime utilities now exist for deterministic replay, projection checkpoints, and drift diagnostics (version/hash/staleness checks) with focused tests. Bounded-context command services cover sales orders plus initial subscription/return-order rollout under explicit mutation policy contracts. Remaining: schema compiler target, persisted projection checkpoint plumbing, replay tooling integration, and broader bounded-context rollout. |
| `4` Governance & Stability | Partial | Export snapshot test added and `.changeset/config.json` added. Remaining: wire changeset flow into release/CI policy. |

### Baseline Drift Note

The next section (`Current State (Audit Summary)`) is the original baseline snapshot and is now historically useful but no longer current (tests/lint/docs/compiler work have progressed beyond it).

---

## Next Wave of Development (Wave 2)

Goal: close Phase `3.6` into a fully reviewable compiler flow, then establish Phase `4` governance, then start executable Phase `3.7` behavior.

### Wave 2 Scope (Priority Order)

1. **Close 3.6 artifact and gate gaps**
  - Run `truth:generate` and commit `packages/db/migrations/generated/truth-v1.sql`.
  - Add/confirm CI gate executing `pnpm --filter @afenda/db truth:check`.
  - Ensure generated SQL remains deterministic across consecutive runs.

2. **Establish Phase 4 contract governance**
  - [x] Add `packages/meta-types/src/__tests__/api-contract.test.ts` export snapshot test.
  - [x] Add `.changeset/config.json` and make `@afenda/meta-types` versioning enforceable.
  - Document deprecation workflow updates in the package README (if any deltas remain).

3. **Start 3.7 executable compiler behavior**
  - [x] Add cross-invariant compiler stage (respecting `executionKind` and strict-mode rejection).
  - [x] Integrate dependency graph topological order into compiler assembly order.
  - [x] Add deterministic tests for ordering and actionable cycle diagnostics.

4. **Prepare event-sourcing rollout contracts (without full cutover)**
  - [x] Introduce typed mutation policy contract (`direct | dual-write | event-only`) in the compiler/runtime boundary.
  - [x] Implement guardrails to keep behavior opt-in per bounded context.

### Definition of Done for Wave 2

- `truth:check` passes locally and in CI. (local done)
- Generated SQL artifact is present and stable in PR diffs.
- Export snapshot test exists and passes.
- Changeset config exists and supports package versioning.
- Cross-invariant compiler stage is callable and covered by tests.
- Compiler execution order uses dependency graph topological sorting.

### Wave 2 Execution Log (Current)

- Step 1 completed: generated truth SQL artifact and restored passing `truth:check` gate.
- Step 2 completed: added API export snapshot coverage and initial changeset configuration.
- Step 3 completed for current compiler slice: `trigger` / `deferred-trigger` cross-invariant SQL generation is implemented with green tests, multi-model trigger invariants compile through explicit join paths instead of per-model row-local evaluation, and `truth-v1.sql` now exercises that path through a real authored cross invariant.
- Step 4 advanced beyond scaffolding: mutation policy contracts, runtime guard helpers, dependency nodes, `event-only` DB blockers, and an initial generic API mutation command gateway are implemented with green tests.
- Step 4 runtime refinement: sales-order flows now use command-specific event mapping and the gateway supports projection-aware `event-only` execution (append + project + optional projection persistence).
- Step 5 bounded-context runtime path: `/api/sales/orders/confirm` and `/api/sales/orders/cancel` now execute through a dedicated sales-order command service that loads projection state, appends command-specific events, and persists the refreshed sales-order projection.
- Step 6 bounded-context expansion: `/api/sales/subscriptions/activate`, `/api/sales/subscriptions/cancel`, and `/api/sales/returns/approve` now execute through dedicated command services with explicit `dual-write` policy enforcement and command-specific event typing.
- Step 7 projection runtime hardening: added deterministic replay/checkpoint/drift helpers (`projectionRuntime`) and focused tests for replay determinism, non-monotonic version rejection, and drift diagnostics.
- Next active focus: persist projection checkpoints in opted-in command flows, then continue migration of remaining opted-in write paths off generic CRUD.

## Next Wave of Development (Wave 3)

Goal: turn the current sales-order bounded-context slice into a repeatable runtime pattern for additional aggregates and strengthen operational guarantees for `event-only` execution.

### Wave 3 Scope (Priority Order)

1. **Bounded-context expansion of command runtime**
  - [x] Implement command services and routes for at least two additional aggregates currently using generic CRUD write paths (`subscription`, `return_order`).
  - Reuse the same command flow shape proven in sales-order (`load -> validate -> append -> project -> persist projection`).
  - Keep mutation policy enforcement explicit per aggregate.

2. **Projection runtime hardening**
  - [x] Add projection version metadata and replay-safe projector contracts for opted-in bounded contexts.
  - [x] Add deterministic replay tests (`append event stream -> rebuild projection -> compare expected state`).
  - [x] Add projection drift diagnostics (stale projection detection and actionable error payloads).

3. **Generic CRUD de-scope for opted-in models**
  - For models under `event-only`/`dual-write` rollout, route writes through command services by default.
  - Keep read paths unchanged; only write orchestration moves.
  - Add explicit guardrail tests proving unsupported bulk writes remain blocked.

4. **Governance + CI closure for runtime rollout**
  - Add focused CI test targets for bounded-context command services and projection replay checks.
  - Wire release/change documentation for runtime policy transitions (`direct -> dual-write -> event-only`).

### Definition of Done for Wave 3

- At least two additional bounded contexts have command services using append-and-project runtime orchestration.
- Projection replay tests exist and pass for all opted-in bounded contexts.
- Generic CRUD no longer owns write orchestration for opted-in models.
- CI includes bounded-context command + projection replay checks.
- Runtime policy transition guidance is documented for operators.

### Suggested Execution Sequence (Low-Risk)

1. `3.6` artifact closure (`truth-v1.sql` generation + CI gate confirmation)
2. Phase `4` governance primitives (snapshot + changesets)
3. `3.7` compiler stage extension (cross-invariants + ordering)
4. Event-sourcing contract flags and opt-in wiring

---

## Current State (Audit Summary)

| Metric                | Value                                             |
| --------------------- | ------------------------------------------------- |
| Source files          | 14                                                |
| Total exports         | ~97 (90 types + 4 functions + 1 class + 2 consts) |
| External dependencies | 0 (only `typescript` devDep)                      |
| Consumer packages     | 3 (`api`, `web`, `db`)                            |
| Total import sites    | 84+                                               |
| Turbo tag             | `foundation`                                      |
| Boundary layer        | Lowest — nothing may depend downward              |
| Tests                 | 0                                                 |
| Lint scripts          | 0                                                 |
| README                | None                                              |
| Version               | `0.1.0` (hardcoded, no changelog)                 |

### Module Classification

| Module               | Pure Types | Runtime Exports                                                 |
| -------------------- | ---------- | --------------------------------------------------------------- |
| `schema.ts`          | Yes (34)   | —                                                               |
| `rbac.ts`            | Yes (2)    | —                                                               |
| `module.ts`          | Yes (9)    | —                                                               |
| `layout.ts`          | Yes (8)    | —                                                               |
| `policy.ts`          | Yes (8)    | —                                                               |
| `audit.ts`           | Hybrid     | `DEFAULT_MASKING_RULES` const                                   |
| `events.ts`          | Yes (6)    | —                                                               |
| `sandbox.ts`         | Yes (4)    | —                                                               |
| `graph.ts`           | Hybrid     | `TRUTH_PRIORITY` const                                          |
| `mesh.ts`            | Yes (6)    | —                                                               |
| `workflow.ts`        | Yes (7)    | —                                                               |
| `tenant.ts`          | Yes (5)    | —                                                               |
| `resolutionCache.ts` | Hybrid     | `ResolutionCache` class, `ResolutionCacheService`               |
| `utils.ts`           | Hybrid     | `isJsonObject`, `isJsonArray`, `isJsonPrimitive`, `assertNever` |

### Path Mapping Inconsistency

| Consumer      | Points to                                | Issue                   |
| ------------- | ---------------------------------------- | ----------------------- |
| `apps/api`    | `../../packages/meta-types/src/*`        | Source — dev/prod drift |
| `apps/web`    | `../../packages/meta-types/src/index.ts` | Source — dev/prod drift |
| `packages/db` | `../../packages/meta-types/dist/*`       | Correct — built output  |

---

## Maturity Model

```
Level 1   Shared types folder              — scattered, no ownership
Level 2   Centralized type package          — monorepo boundary, barrel export
Level 3   Documented + tested              — README, lint, test, snapshot
Level 4   Stable contract layer            — versioned, governed, sub-path exports
Level 5   Truth Engine (target)            — invariants, state machines, event→state coupling
```

**Current: Level 2.5** — centralized, boundary-enforced, but undocumented and untested.

---

## Architecture Decisions

Each fork between the two plans is resolved below with rationale.

### AD-1: Package Rename → `@afenda/truth-contract`?

**Decision: Not now. Reframe in README.**

Rationale: 84+ import sites across 3 packages. A rename creates mechanical churn with zero semantic gain until the Truth Engine compiler (V3) actually consumes the package as a schema. Instead:

- README declares it as the Truth Contract Layer
- `package.json` description updated to reflect this role
- Physical rename tracked as a milestone for Phase 5 / Engine V3

### AD-2: Where do Invariants live?

**Decision: Invariant _definitions_ in `meta-types`. Invariant _enforcement_ in consumers.**

Rationale (DDD skill — Strategic Design): The truth contract defines **what must be true**. The enforcement engine (api/db) decides **how to enforce it** (SQL constraints, middleware guards, triggers). Mixing enforcement into the contract couples the contract to a specific runtime — violating the foundation boundary.

```
meta-types:  Invariant<T> type + declarative invariant registries
api:         InvariantEnforcer — evaluates invariants at request time
db:          Check constraints + triggers compiled from invariant definitions
```

### AD-3: Where does ResolutionCache go?

**Decision: Stays in package, isolated into `src/runtime/` directory. Future extraction to `@afenda/meta-runtime` tracked.**

Rationale: ResolutionCache is zero-dep, ~200 LoC, imported by both `api` and `web`. Extracting to a new package now adds workspace topology overhead (new package.json, new turbo config, new boundary declaration) for minimal gain. Better: isolate it structurally, document the migration path, and extract when the runtime grows large enough to warrant its own governance.

### AD-4: State machines — new file or extend workflow.ts?

**Decision: New `src/state-machine.ts` with explicit transition types. `workflow.ts` references it.**

Rationale: Workflow is a _consumer_ of state machines, not the definition layer. A consignment, an invoice, and a workflow all have state machines. The transition definition (`from + event → to`) is a universal truth primitive that belongs at the same level as events and invariants.

### AD-5: Sub-path exports — granular per module or grouped?

**Decision: Granular per module (`./schema`, `./audit`, etc.) with `"."` preserved as barrel.**

Rationale: 84 existing import sites use the barrel. Sub-path exports are additive — new code can opt in to targeted imports without breaking existing code. Granular mapping (1:1 with source files) is simplest to maintain and matches the domain catalog structure.

### AD-6: `export type *` enforcement

**Decision: Yes, for all 11 pure-type modules. Runtime-hybrid modules keep `export *`.**

Rationale: `export type *` enables bundlers to fully elide type-only re-exports at compile time. Since 11 of 14 modules are pure types, this is a significant tree-shaking win for `web` consumers. ESLint rule `@typescript-eslint/consistent-type-exports` will enforce going forward.

### AD-7: Branded IDs (`TenantId`, `UserId`, `OrderId`)

**Decision: Deferred to follow-up after Phase 3. Tracked as Phase 5 milestone.**

Rationale: The `Brand<T, B>` utility already exists in `utils.ts`. Defining canonical IDs requires consensus on which entities get branded types — that decision is best made after the invariant system exists, since invariants are typed against their target entities.

### AD-8: Truth Compiler execution model — runtime or build artifact?

**Decision: Build artifact with committed SQL outputs and CI diff checks.**

Rationale: Truth enforcement must be deterministic and reviewable. Compiler output is generated during build/migration prep, then committed and code-reviewed like any other schema change.

### AD-9: Invariant representation for Engine V3

**Decision: Dual representation: declarative condition + optional runtime predicate metadata.**

Rationale: DB remains the final authority (`CHECK`/trigger enforcement), while API pre-write guards provide fast feedback. The contract layer defines both representations without taking a runtime dependency.

### AD-10: Transition trigger strategy

**Decision: One transition guard function/trigger per entity state field, not per transition row.**

Rationale: Per-transition triggers can conflict and create ordering bugs. A unified trigger validates the allowed transition graph atomically.

### AD-11: SQL safety boundary in compiler

**Decision: No free-form SQL interpolation for identifiers; strict validation + escaping + deterministic naming.**

Rationale: Compiler-generated enforcement must be safe by construction. Identifier and expression handling must prevent injection and unstable diffs.

### AD-12: Cross-entity invariant modeling (Engine V4)

**Decision: Add first-class cross-entity invariants with explicit kind metadata; never infer kind from SQL text.**

Rationale: Real ERP truth rules span joins and aggregates. Classification by string heuristics (`sql.includes("SELECT")`) is fragile and unsafe. The contract must explicitly declare whether enforcement target is `check`-eligible or `trigger`-required.

### AD-13: Dependency graph as contract behavior (Engine V4)

**Decision: Compiler must build dependency graph + topological order + cycle detection with deterministic tie-breaking.**

Rationale: Enforcement order is part of correctness. Without explicit ordering, cross-entity rules and event projections can run in invalid sequences.

### AD-14: Event sourcing enforcement scope (Engine V4)

**Decision: Event-sourcing enforcement is opt-in per bounded context/entity group, not globally forced at once.**

Rationale: Full write-path inversion is high impact. Progressive adoption (dual-write, verification, then mutation blocking) reduces operational risk while preserving long-term append-only truth goals.

### AD-15: Drizzle schema as compiler target (Engine V5)

**Decision: Truth model becomes schema source; Drizzle schema is generated artifact with an initial compatibility mode.**

Rationale: Contract drift is eliminated when schema is compiled from truth definitions. To avoid destabilizing delivery, start with diff/compare mode, then move to authoritative generation after parity gates pass.

### AD-16: Projection contract as first-class runtime surface (Engine V5)

**Decision: Projections are explicit contracts (`source`, `handler`, consistency mode), not ad hoc query logic.**

Rationale: In an event-sourced flow, read state must be deterministic and testable. Projection definitions need versioning and replay guarantees.

### AD-17: Truth Runtime write gateway (Engine V5)

**Decision: All domain writes converge through a command -> event gateway for opted-in bounded contexts.**

Rationale: This is the enforceable boundary that prevents invariant bypass and direct state mutation drift. Rollout remains incremental using mutation policy flags from AD-14.

---

## Execution Plan

### Phase 0 — Reframe & Document

> Goal: Establish the package as the Truth Contract Layer in documentation.

#### Step 0.1: Create `README.md`

Content structure:

1. **Purpose** — "This package defines the canonical business truth. All other layers must conform to it."
2. **Architecture Role** — Foundation layer diagram, ESLint boundary enforcement
3. **Domain Catalog** — One section per module with exported types table
4. **Truth Primitives Taxonomy** — Entities | Events | Invariants | Transitions | Relationships
5. **Consumer Map** — Which packages depend on this and which modules they use
6. **Adding a New Domain** — Step-by-step for contributors
7. **Contract Stability Policy** — Deprecation workflow (`@deprecated` → 1 minor release → removal)

#### Step 0.2: Update `package.json` description

```json
"description": "Canonical business truth contract — entities, events, invariants, and state transitions for the AFENDA metadata engine"
```

#### Step 0.3: Add `@module` JSDoc headers to all 14 source files

Each file gets a consistent doc block:

```ts
/**
 * @module schema
 * @description Core metadata model — field types, model definitions, views, permissions, actions.
 * @layer truth-contract
 * @consumers api, web, db
 */
```

---

### Phase 1 — Quality Gates

> Goal: Wire lint + test into CI pipeline so no regression enters undetected.

#### Step 1.1: Add `eslint.config.js`

- Extends root config
- Enables `@typescript-eslint/consistent-type-exports` (error)
- Enables `@typescript-eslint/no-non-null-assertion` (error)
- Enables `@typescript-eslint/consistent-type-imports` (error)

#### Step 1.2: Add lint scripts to `package.json`

```json
"lint": "eslint src/",
"lint:strict": "eslint src/ --max-warnings 0",
"lint:fix": "eslint src/ --fix"
```

#### Step 1.3: Add `vitest.config.ts` and test scripts

- `vitest.config.ts` at package root
- `"test": "vitest"`, `"test:run": "vitest run"` scripts
- `vitest` added as catalog devDep

#### Step 1.4: Write runtime tests

- `src/__tests__/resolution-cache.test.ts` — get/set, TTL expiry, LRU eviction, dependency invalidation, tenant invalidation, stats, key generation, pruning
- `src/__tests__/utils.test.ts` — `isJsonObject`, `isJsonArray`, `isJsonPrimitive`, `assertNever` exhaustiveness
- `src/__tests__/audit-constants.test.ts` — `DEFAULT_MASKING_RULES` shape validation
- `src/__tests__/graph-constants.test.ts` — `TRUTH_PRIORITY` ordering validation

#### Step 1.5: Verify turbo pipeline picks up lint + test tasks

- Confirm `turbo.json` root tasks include `lint` and `test` with proper `dependsOn`
- Ensure `pnpm turbo lint --filter=@afenda/meta-types` runs
- Ensure `pnpm turbo test --filter=@afenda/meta-types` runs

---

### Phase 2 — Structural Hardening

> Goal: Clean separation of types vs. runtime. Normalize consumer path mappings.

#### Step 2.1: Isolate runtime into `src/runtime/` directory

Move:

- `ResolutionCache` class + `ResolutionCacheService` + helpers → `src/runtime/resolution-cache.ts`
- Re-export from `src/resolutionCache.ts` for backward compat
- Type interfaces (`CacheEntry`, `CacheStats`, `ResolutionCacheConfig`) stay in `src/resolutionCache.ts`

#### Step 2.2: Enforce `export type *` in barrel

```ts
// src/index.ts — pure type modules
export type * from "./schema.js";
export type * from "./rbac.js";
export type * from "./module.js";
export type * from "./layout.js";
export type * from "./policy.js";
export type * from "./events.js";
export type * from "./sandbox.js";
export type * from "./mesh.js";
export type * from "./workflow.js";
export type * from "./tenant.js";

// hybrid modules (have runtime exports)
export * from "./audit.js";
export * from "./graph.js";
export * from "./resolutionCache.js";
export * from "./utils.js";
```

#### Step 2.3: Add sub-path exports to `package.json`

```json
"exports": {
  ".": { "types": "./dist/index.d.ts", "import": "./dist/index.js" },
  "./schema": { "types": "./dist/schema.d.ts", "import": "./dist/schema.js" },
  "./rbac": { "types": "./dist/rbac.d.ts", "import": "./dist/rbac.js" },
  "./module": { "types": "./dist/module.d.ts", "import": "./dist/module.js" },
  "./layout": { "types": "./dist/layout.d.ts", "import": "./dist/layout.js" },
  "./policy": { "types": "./dist/policy.d.ts", "import": "./dist/policy.js" },
  "./audit": { "types": "./dist/audit.d.ts", "import": "./dist/audit.js" },
  "./events": { "types": "./dist/events.d.ts", "import": "./dist/events.js" },
  "./sandbox": { "types": "./dist/sandbox.d.ts", "import": "./dist/sandbox.js" },
  "./graph": { "types": "./dist/graph.d.ts", "import": "./dist/graph.js" },
  "./mesh": { "types": "./dist/mesh.d.ts", "import": "./dist/mesh.js" },
  "./workflow": { "types": "./dist/workflow.d.ts", "import": "./dist/workflow.js" },
  "./tenant": { "types": "./dist/tenant.d.ts", "import": "./dist/tenant.js" },
  "./utils": { "types": "./dist/utils.d.ts", "import": "./dist/utils.js" }
}
```

#### Step 2.4: Normalize all consumer path mappings to `dist/`

- `apps/api/tsconfig.json` → change from `src/*` to `dist/*`
- `apps/web/tsconfig.json` → change from `src/index.ts` to `dist/index.d.ts`
- `apps/web/vite.config.ts` → remove resolve alias (pnpm workspace link handles it)
- `packages/db/tsconfig.json` → already correct (`dist/*`)

---

### Phase 3 — Truth Engine Foundations

> Goal: Introduce the three missing truth primitives — invariants, state machines, event→state coupling.
> This is the phase that transforms the package from "shared types" into "Truth Contract".

#### Step 3.1: Create `src/invariants.ts` — Hard Truth Rules

```ts
/**
 * @module invariants
 * @description Hard invariants that must NEVER be violated. Declarative definitions
 * that downstream layers (API, DB) compile into enforcement mechanisms.
 * @layer truth-contract
 */

/** Scope of an invariant — determines where enforcement runs */
export type InvariantScope = "entity" | "aggregate" | "cross-aggregate" | "global";

/** Severity — determines enforcement behavior */
export type InvariantSeverity = "fatal" | "error" | "warning";

/** A declarative invariant definition (no runtime logic in this layer) */
export interface InvariantDefinition {
  /** Unique identifier: MODULE.ENTITY.RULE e.g. "sales.consignment.balance_non_negative" */
  readonly id: string;

  /** Human-readable description for audit trails and error messages */
  readonly description: string;

  /** Which entity/aggregate this invariant applies to */
  readonly targetModel: string;

  /** Scope determines enforcement strategy */
  readonly scope: InvariantScope;

  /** Severity determines whether violation blocks or warns */
  readonly severity: InvariantSeverity;

  /**
   * Declarative condition expression using the same DSL as policy.ts.
   * The enforcement layer compiles this to SQL CHECK constraints,
   * middleware guards, or trigger conditions depending on scope.
   */
  readonly condition: ConditionExpression;

  /** Which operations trigger this invariant check */
  readonly triggerOn: Array<"create" | "update" | "delete" | "transition">;

  /** Optional: related invariants that form an invariant group */
  readonly group?: string;

  /** Tenant-specific override: can this invariant be relaxed per tenant? */
  readonly tenantOverridable: boolean;
}

/**
 * Result of evaluating an invariant against a record.
 * Produced by the enforcement layer, typed here for cross-layer contract.
 */
export interface InvariantViolation {
  readonly invariantId: string;
  readonly severity: InvariantSeverity;
  readonly message: string;
  readonly context: Record<string, unknown>;
}

/**
 * Registry of all invariants for a model — used by enforcement layers
 * to compile into the appropriate mechanism.
 */
export interface InvariantRegistry {
  readonly model: string;
  readonly invariants: readonly InvariantDefinition[];
}
```

**Architecture Note**: Invariant _definitions_ are declarative data (types + readonly structures). They describe **what must be true**. The enforcement layer (api, db) decides **how**:

- `entity` scope → SQL CHECK constraint + API middleware guard
- `aggregate` scope → DB trigger + API aggregate root validation
- `cross-aggregate` scope → API saga validation
- `global` scope → DB trigger + scheduled integrity check

#### Step 3.2: Create `src/state-machine.ts` — Lifecycle Transitions

```ts
/**
 * @module state-machine
 * @description Explicit state machine definitions for entity lifecycles.
 * Decoupled from workflow orchestration — a state machine is a truth primitive;
 * a workflow is a process that drives transitions.
 * @layer truth-contract
 */

/** A state within an entity lifecycle */
export type State = string;

/** An event that triggers a state transition */
export type TransitionEvent = string;

/** A single transition: from + event → to */
export interface Transition {
  readonly from: State;
  readonly event: TransitionEvent;
  readonly to: State;

  /** Guards that must pass for this transition (invariant IDs) */
  readonly guards?: readonly string[];

  /** Side-effect events emitted on successful transition */
  readonly emits?: readonly string[];
}

/** Complete state machine definition for an entity */
export interface StateMachineDefinition {
  /** Which entity this state machine governs */
  readonly model: string;

  /** The field on the entity that holds the current state */
  readonly stateField: string;

  /** All valid states */
  readonly states: readonly State[];

  /** The initial state for new instances */
  readonly initialState: State;

  /** Terminal states (no outgoing transitions) */
  readonly terminalStates: readonly State[];

  /** All valid transitions */
  readonly transitions: readonly Transition[];

  /** Tenant-overridable: can tenants add custom transitions? */
  readonly tenantExtensible: boolean;
}

/**
 * Result of attempting a transition — produced by the engine,
 * typed here for cross-layer contract.
 */
export interface TransitionResult {
  readonly success: boolean;
  readonly from: State;
  readonly to: State | null;
  readonly event: TransitionEvent;
  readonly guardViolations: readonly string[];
  readonly emittedEvents: readonly string[];
}
```

**Why separate from `workflow.ts`?**: A workflow is a _process_ (multi-step, multi-actor, potentially spanning days). A state machine is a _constraint on a single entity's lifecycle_. A consignment has a state machine (DRAFT → ACTIVE → CLOSED). A purchase approval has a workflow (request → review → approve → fulfill). The workflow _drives_ the state machine, not the other way around.

#### Step 3.3: Couple Events to State Transitions

Update `events.ts` to reference state machine transitions:

```ts
/**
 * Link between a domain event and the state transition it represents.
 * This is the bridge between causality (events) and lifecycle (state machines).
 */
export interface EventTransitionBinding {
  /** The domain event type (e.g., "consignment.closed") */
  readonly eventType: string;

  /** The state machine model this event applies to */
  readonly model: string;

  /** The transition event name in the state machine */
  readonly transitionEvent: string;
}
```

#### Step 3.4: Define `TruthModel` — The Compiler Input (Engine V3 Prep)

```ts
/**
 * @module truth-model
 * @description The complete truth definition for a business entity.
 * This is the future input to the Truth Compiler (Engine V3)
 * that generates DB schemas, API contracts, and enforcement code.
 * @layer truth-contract
 */

/**
 * A complete truth model manifest — everything the compiler needs
 * to generate enforcement artifacts and runtime contracts.
 */
export interface TruthModel {
  /** Entity definitions and references (from schema.ts) */
  readonly entities: readonly string[];

  /** Domain event definitions and bindings (from events.ts) */
  readonly events: readonly string[];

  /** Entity-scoped invariants (from invariants.ts) */
  readonly invariants: readonly string[];

  /** Cross-entity invariants (Engine V4 extension) */
  readonly crossInvariants?: readonly string[];

  /** State machine references (from state-machine.ts) */
  readonly stateMachines?: readonly string[];

  /** Relationships in the Business Truth Graph (from graph.ts) */
  readonly relationships: readonly string[];

  /** Policy references (from policy.ts) */
  readonly policies: readonly string[];
}
```

**Note**: `TruthModel` uses string references (IDs) rather than embedded objects. This keeps it a lightweight manifest. Compiler stages resolve references during normalization.

#### Step 3.5: Update barrel `index.ts`

Add new modules to barrel:

```ts
export type * from "./invariants.js";
export type * from "./state-machine.js";
export type * from "./truth-model.js";
```

Add `EventTransitionBinding` is part of `events.ts` — already exported.

### Phase 3.6 — Engine V3 Compiler v1 (Execution Layer)

> Goal: Convert truth contracts into machine-enforced SQL + runtime guard hooks.

#### Step 3.6.1: Create compiler module in `packages/db`

Create:

- `packages/db/src/truth-compiler/normalizer.ts`
- `packages/db/src/truth-compiler/invariant-compiler.ts`
- `packages/db/src/truth-compiler/transition-compiler.ts`
- `packages/db/src/truth-compiler/event-compiler.ts`
- `packages/db/src/truth-compiler/emitter.ts`

Pipeline contract:

```
TruthModel
  -> normalize
  -> compileInvariants
  -> compileTransitions
  -> compileEvents
  -> emitSqlBundle
```

#### Step 3.6.2: Generate deterministic SQL artifacts

Create generation entrypoint:

- `packages/db/src/truth-compiler/generate-truth-sql.ts`

Output target:

- `packages/db/migrations/generated/truth-v1.sql`

Rules:

- Stable ordering: entity, then invariant/transition/event IDs (lexicographic)
- Deterministic naming convention for constraints/functions/triggers
- Generated file is committed and reviewed in PRs

#### Step 3.6.3: Compile invariants to DB enforcement

V1 scope:

- Entity-scoped invariants only
- Same-table checks only
- Generate `CHECK` constraints when expression is row-local
- Fall back to trigger guards for expressions not representable as `CHECK`

#### Step 3.6.4: Compile state transitions to unified entity guards

V1 scope:

- Single state field transitions per entity
- One `BEFORE UPDATE` trigger per entity state field
- Reject transitions not present in allowed transition graph

#### Step 3.6.5: Compile events to audit hooks

V1 scope:

- Generate append-only audit/event log insert hooks
- Event log schema remains consumer-owned (`packages/db`)
- Truth model defines event metadata; DB layer owns storage implementation

#### Step 3.6.6: API runtime invariant guard integration

Create API integration point:

- `apps/api/src/policy/invariant-enforcer.ts` (or existing policy pipeline extension)

Behavior:

- Evaluate runtime guard metadata before DB write
- Fail fast with invariant ID and message
- DB constraints remain authoritative fallback

#### Step 3.6.7: CI + migration workflow integration

Add scripts:

- `pnpm --filter @afenda/db truth:generate`
- `pnpm --filter @afenda/db truth:check` (fails on dirty generated diff)

Add CI gate:

- Truth SQL must be up-to-date
- Migration review required for generated DDL changes

#### Step 3.6.8: V1 explicit limitations

Out of scope for V1:

- Cross-entity invariants
- Dependency graph / topological ordering across aggregates
- Automatic Drizzle schema generation from truth model
- Temporal rollback semantics and full event replay compiler

### Phase 3.7 — Engine V4 Contract Extensions (V2)

> Goal: Add cross-entity truth, deterministic dependency ordering, and event-sourcing enforcement contracts.

#### Step 3.7.1: Extend truth DSL for cross-entity invariants

Add contract types:

- `CrossInvariantDefinition`
- `InvariantExecutionKind = "check" | "trigger" | "deferred-trigger"`
- `dependsOn: readonly string[]`

Rules:

- Cross-entity invariants explicitly declare involved entities and execution kind
- Compiler rejects ambiguous invariants in strict mode
- No SQL substring heuristics for execution mode selection

#### Step 3.7.2: Add dependency graph module in compiler

Create:

- `packages/db/src/truth-compiler/dependency-graph.ts`

Capabilities:

- Build nodes for entities, invariants, cross-invariants, transitions, event projections
- Topological sort with deterministic ordering
- Cycle detection with actionable error diagnostics

#### Step 3.7.3: Add event-sourcing contract capabilities

Add contract fields:

- `eventSourced: boolean`
- `eventStoreStream: string`
- `mutationPolicy: "direct" | "dual-write" | "event-only"`

Enforcement phases:

- `direct` -> existing write path
- `dual-write` -> state write + append event (verification period)
- `event-only` -> direct mutation blocked, state from projections

#### Step 3.7.4: Compiler V2 assembly

Implement `compileTruthV2` pipeline:

```
buildDependencyGraph -> topoSort ->
compileInvariants -> compileCrossInvariants ->
compileTransitions -> compileEvents -> compileEventSourcing
```

All emitted SQL must remain deterministic and migration-reviewable.

#### Step 3.7.5: Runtime orchestration contract

Add runtime flow requirement for event-sourced contexts:

1. Validate invariants in topological order
2. Append domain event with optimistic concurrency checks
3. Update/read projection model
4. Expose invariant or projection lag diagnostics

### Phase 3.8 — Engine V5 Foundations (Controlled)

> Goal: Establish compile-to-schema, deterministic projections, and unified runtime gateway without full-system cutover.

#### Step 3.8.1: Add schema compiler target (compatibility mode first)

Create:

- `packages/db/src/truth-compiler/schema-compiler.ts`

Modes:

- `compare` (default): compile schema and diff against existing Drizzle schema
- `emit`: generate Drizzle schema artifact for review
- `enforce` (later): generated schema is authoritative

#### Step 3.8.2: Add projection contract types

Add contract types in truth layer:

- `ProjectionDefinition`
- `ProjectionConsistency = "realtime" | "materialized"`
- `ProjectionVersion` metadata for replay compatibility

Requirements:

- Projections must be replay-deterministic
- Handler behavior must be side-effect free

#### Step 3.8.3: Add projection engine package surface

Create runtime surface (initially in API, extractable later):

- `project(events, projection)`
- `rebuildProjection(streamId, projectionVersion)`
- `applyEventToReadModel(event)`

#### Step 3.8.4: Add Truth Runtime command gateway

Create command flow contract:

1. Map command -> domain event
2. Load projection/state snapshot
3. Validate invariants (graph order)
4. Append event with optimistic concurrency
5. Update projection/read model

#### Step 3.8.5: Add rollout and anti-overengineering guardrails

Guardrails:

- Opt-in bounded contexts only
- Keep non-opted contexts on existing CRUD path
- No global cutover until parity, latency, and error-budget gates pass
- Reactive truth graph recomputation remains a future milestone (not part of 3.8 implementation)

---

### Phase 4 — Contract Stability & Governance

> Goal: Prevent accidental API breakage. Enable versioned evolution.

#### Step 4.1: Export contract snapshot test

Create `src/__tests__/api-contract.test.ts`:

- Snapshot all public exports from the package
- Any unintentional addition/removal of a public export fails the snapshot → forces intentional review
- Pattern: `Object.keys(await import("@afenda/meta-types")).sort()` snapshot

#### Step 4.2: Changeset configuration

- Ensure `@afenda/meta-types` is included in changeset scope
- Add `.changeset/config.json` if not present
- Version bumps required on any public API change
- Changelog generated from changeset descriptions

#### Step 4.3: Deprecation workflow

Document in README:

1. Mark with `@deprecated` JSDoc + replacement pointer
2. Changeset: minor version bump (deprecation is not breaking)
3. Deprecation survives one minor release cycle minimum
4. Removal: major version bump + changeset with migration guide

---

### Phase 5 — Truth Engine Milestones (Future)

> Tracked here for strategic planning. Not in current execution scope.

#### Milestone 5.1: Branded ID Types

Create `src/ids.ts` with canonical branded IDs:

```ts
export type TenantId = Brand<string, "TenantId">;
export type UserId = Brand<string, "UserId">;
export type ConsignmentId = Brand<string, "ConsignmentId">;
```

Enforce across all invariant definitions and event payloads.

#### Milestone 5.2: Package Rename

`@afenda/meta-types` → `@afenda/truth-contract`

Execute only when:

- All phases 0–4 are complete
- Truth Compiler roadmap implementation is active (`3.6+`)
- Codemod can automate all 84+ import site updates

#### Milestone 5.3: Runtime Extraction

`ResolutionCache` + type guards → `@afenda/meta-runtime`

Execute only when:

- Runtime logic in the package exceeds ~500 LoC
- Multiple runtime utilities need shared governance
- `meta-types` must become 100% type-only for compiler input

#### Milestone 5.4: Zod Schema Co-location

`@afenda/meta-schemas` — auto-derived Zod schemas from truth contract types.

Execute only when:

- API routes have 10+ manually-mirrored Zod schemas
- Schema drift has caused a production bug

#### Milestone 5.5: Truth Compiler Evolution Roadmap

```
TruthModel → Cross-aggregate invariant compiler (V2)
TruthModel → Dependency graph + topological compiler (V2)
TruthModel → Drizzle schema generation (V3)
TruthModel → Event sourcing temporal enforcement (V3+)
```

This is the moment the system **cannot lie**.

---

## Dependency Graph

```
                    ┌──────────────────────────────────┐
                    │     @afenda/meta-types            │
                    │     (Truth Contract Layer)        │
                    │                                   │
                    │  schema ─── module ─── layout     │
                    │  rbac ──── policy ─── sandbox     │
                    │  events ── workflow ── mesh        │
                    │  tenant ── graph                   │
                    │  invariants ── state-machine       │  ← Phase 3 additions
                    │  truth-model                       │  ← Phase 3 addition
                    │  utils ─── resolutionCache         │
                    └───────┬────────┬────────┬─────────┘
                            │        │        │
                 ┌──────────┘        │        └──────────┐
                 ▼                   ▼                   ▼
          ┌─────────────┐   ┌─────────────┐    ┌─────────────┐
          │  @afenda/db  │   │  @afenda/api │    │  @afenda/web │
          │  (data)      │   │  (app-server)│    │  (app-client)│
          │  4 files     │   │  29 files    │    │  37 files    │
          └─────────────┘   └─────────────┘    └─────────────┘
```

---

## Execution Order & Dependencies

```
Phase 0 ─── 0.1 README ──────────────┐
         ├─ 0.2 package.json desc     │  (parallel, no deps)
         └─ 0.3 JSDoc headers ────────┘

Phase 1 ─── 1.1 eslint.config.js ────┐
         ├─ 1.2 lint scripts          │  (parallel)
         ├─ 1.3 vitest config ────────┤
         ├─ 1.4 write tests ──────────┤  (depends on 1.3)
         └─ 1.5 turbo verify ─────────┘  (depends on 1.1, 1.2, 1.4)

Phase 2 ─── 2.1 runtime isolation ────┐
         ├─ 2.2 export type * ────────┤  (parallel with 2.1)
         ├─ 2.3 sub-path exports ─────┤  (depends on 2.1)
         └─ 2.4 path normalization ───┘  (depends on 2.3)

Phase 3 ─── 3.1 invariants.ts ────────┐
         ├─ 3.2 state-machine.ts ─────┤  (parallel with 3.1)
         ├─ 3.3 event coupling ───────┤  (depends on 3.2)
         ├─ 3.4 truth-model.ts ───────┤  (depends on 3.1, 3.2)
         └─ 3.5 barrel update ────────┘  (depends on all above)

Phase 3.6 ─ 3.6.1 compiler modules ───┐
          ├─ 3.6.2 SQL artifacts       │  (depends on 3.6.1)
          ├─ 3.6.3 invariants compile  │  (depends on 3.1, 3.6.1)
          ├─ 3.6.4 transition compile  │  (depends on 3.2, 3.6.1)
          ├─ 3.6.5 event compile ──────┤  (depends on 3.3, 3.6.1)
          ├─ 3.6.6 API guard hook ─────┤  (depends on 3.1, 3.6.3)
          └─ 3.6.7 CI gates ───────────┘  (depends on 3.6.2-3.6.6)

Phase 3.7 ─ 3.7.1 cross-invariants DSL ┐
          ├─ 3.7.2 dependency graph     │  (depends on 3.7.1)
          ├─ 3.7.3 event-sourcing caps  │  (depends on 3.4)
          ├─ 3.7.4 compiler v2 pipeline │  (depends on 3.7.1-3.7.3)
          └─ 3.7.5 runtime orchestration┘  (depends on 3.7.2, 3.7.4)

Phase 3.8 ─ 3.8.1 schema compiler      ┐
          ├─ 3.8.2 projection contracts │  (depends on 3.4)
          ├─ 3.8.3 projection engine    │  (depends on 3.8.2)
          ├─ 3.8.4 runtime gateway      │  (depends on 3.7.5, 3.8.3)
          └─ 3.8.5 rollout guardrails   ┘  (depends on 3.8.1-3.8.4)

Phase 4 ─── 4.1 contract snapshot ────┐
         ├─ 4.2 changeset config ─────┤  (parallel)
         └─ 4.3 deprecation policy ───┘  (parallel)
```

---

## Verification Checklist

After each phase, the following must pass:

### Phase 0

- [ ] README renders correctly on GitHub
- [ ] `@module` JSDoc visible on all 14 source files

### Phase 1

- [ ] `pnpm --filter @afenda/meta-types lint:strict` → 0 warnings
- [ ] `pnpm --filter @afenda/meta-types test:run` → all pass
- [ ] `pnpm turbo lint --filter=@afenda/meta-types` → turbo task succeeds
- [ ] `pnpm turbo test --filter=@afenda/meta-types` → turbo task succeeds

### Phase 2

- [ ] `pnpm --filter @afenda/meta-types typecheck` → passes
- [ ] `pnpm typecheck:affected` → all consumers still compile
- [ ] `pnpm build:affected` → all consumers still build
- [ ] Import `from "@afenda/meta-types/schema"` resolves correctly

### Phase 3

- [ ] `pnpm --filter @afenda/meta-types typecheck` → passes (new files compile)
- [ ] `pnpm typecheck:affected` → no consumer regressions
- [ ] `InvariantDefinition` importable from barrel
- [ ] `StateMachineDefinition` importable from barrel
- [ ] `TruthModel` importable from barrel

### Phase 3.6

- [ ] `pnpm --filter @afenda/db truth:generate` produces deterministic SQL output
- [ ] `pnpm --filter @afenda/db truth:check` fails when generated SQL is stale
- [ ] Generated SQL includes constraint/trigger/function names that are stable across runs
- [ ] Invalid state transition update is rejected at DB level in tests
- [ ] Invariant violation is rejected at DB level in tests
- [ ] Runtime invariant guard rejects invalid payload before DB write in API tests
- [ ] Turbo/CI includes truth compiler generation check in required gates

### Phase 3.7

- [ ] Cross-entity invariant DSL compiles with explicit execution kinds (`check`/`trigger`)
- [ ] Compiler rejects ambiguous cross-entity invariants in strict mode
- [ ] Dependency graph topological sort is deterministic across runs
- [ ] Cycle detection returns actionable diagnostics (node IDs and dependency path)
- [x] Event-sourcing capability flags support `direct`, `dual-write`, and `event-only`
- [x] In `event-only` mode, direct mutation attempts are rejected for opted-in entities
- [ ] Projection update path has test coverage for append -> project flow

### Phase 3.8

- [ ] Schema compiler supports `compare` mode and reports drift against existing Drizzle schema
- [ ] Generated Drizzle schema artifact is deterministic in `emit` mode
- [ ] Projection handlers are replay-deterministic and side-effect free in tests
- [ ] Command gateway enforces command -> validate -> append -> project flow for opted-in contexts
- [ ] Optimistic concurrency conflicts are surfaced with actionable error payloads
- [ ] Non-opted contexts remain on existing CRUD path without regression

### Phase 4

- [ ] Contract snapshot test passes and captures all ~110 exports
- [ ] Changeset workflow: `npx changeset add` → selects `@afenda/meta-types`
- [ ] Deprecation policy documented in README

### Phase Gate Rules

- [ ] `Phase 3.8` cannot move from `compare` to `enforce` schema mode until `Phase 4` governance checks pass
- [ ] `event-only` mutation policy can only be enabled for a bounded context after dual-write parity validation
- [ ] All compiler output changes must be deterministic and reviewable in PR diffs

---

## What We Already Got Right

These existing strengths are **load-bearing** — do not break them:

- **Domain separation** — 14 files map 1:1 to business domains (audit, tenant, workflow, etc.)
- **Wide adoption** — 84+ import sites across the monorepo = strong signal of canonical status
- **ESLint boundary enforcement** — `foundation` layer cannot be violated
- **Zero external deps** — keeps the foundation immune to supply chain risk
- **Event sourcing primitives** — `DomainEvent<T>` + `EventReducer<T>` + `AggregateSnapshot<T>` are correctly modeled
- **Multi-tenant override stack** — Global → Industry → Tenant → Department → User resolution
- **Policy DSL** — Declarative condition expressions portable across layers

---

## Risk Register

| Risk                                        | Likelihood | Impact | Mitigation                                                                           |
| ------------------------------------------- | ---------- | ------ | ------------------------------------------------------------------------------------ |
| Consumer breakage from path normalization   | Medium     | High   | Run `typecheck:affected` + `build:affected` after                                    |
| Scope creep beyond approved phase gates     | High       | Medium | Strict phase gates for `3.6` → `3.7` → `3.8` → `4` progression                       |
| Invariant DSL inadequate for complex rules  | Low        | High   | Use existing `ConditionExpression` from `policy.ts`                                  |
| State machine definitions too rigid         | Medium     | Medium | `tenantExtensible` flag allows tenant customization                                  |
| Test setup delays Phase 1                   | Low        | Low    | vitest config is minimal for a type package                                          |
| Unsafe SQL generation in compiler           | Medium     | High   | Strict identifier validation + escaped emission + banned raw interpolation           |
| Trigger conflicts on transition enforcement | Medium     | High   | Single unified transition trigger per entity/state field                             |
| Zero-downtime migration regressions         | Medium     | High   | Generated SQL follows phased constraint validation and migration review gate         |
| Dependency cycles in truth graph            | Medium     | High   | Mandatory cycle detection with deterministic topo ordering and fail-fast diagnostics |
| Event-only rollout disrupts write paths     | Medium     | High   | Opt-in bounded context rollout with `dual-write` transition mode                     |
| Projection drift from event history         | Medium     | High   | Replay tests + projection versioning + rebuild tooling                               |
| V5 scope over-engineering                   | High       | Medium | Controlled rollout (3.8) with compare-first schema mode and no global cutover        |

---

## References

**Skills consulted**:

- `enterprise-architecture-patterns` — DDD bounded contexts, strategic design, tactical patterns
- `domain-driven-design` — Ubiquitous language, entities vs. value objects, domain events
- `event-sourcing` — Immutable events, temporal queries, aggregate snapshots
- `erp-workflow-patterns` — Business Truth Graph, ERP Event Mesh, tenant resolution
- `monorepo-governance` — Package boundaries, API stability, workspace topology
- `typescript-advanced-types` — Generics, conditional types, branded types
- `changesets` — Versioning, changelog management, semver compliance

**Files referenced**:

- `packages/meta-types/package.json`
- `packages/meta-types/tsconfig.json`
- `packages/meta-types/turbo.json`
- `packages/meta-types/src/` — all 14 source files
- `eslint.config.boundaries.js`
- `apps/api/tsconfig.json`
- `apps/web/tsconfig.json`
- `packages/db/tsconfig.json`
