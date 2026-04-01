# Truth compiler — Architecture

> **Status:** Production module inside `@afenda/db`  
> **Import path:** `@afenda/db/truth-compiler`  
> **Tests:** `src/truth-compiler/__test__` (Vitest); run `pnpm --filter @afenda/db test:truth-compiler`  
> **Runtime deps:** `@afenda/meta-types`, `drizzle-orm` (schema compare), `zod` (via `@afenda/db` graph); CLIs use `tsx`

---

## Design philosophy

| Old approach | New approach |
| ------------ | ------------ |
| Hand-written scattered DB constraints | Contract-first compilation from `TruthModel` + registries |
| Runtime-only policy checks | DB triggers + runtime helpers sharing `MutationPolicyDefinition` |
| Drift-prone schema governance | Deterministic SQL bundle + `truth:check` CI gate |
| Implicit event rollout | Explicit mutation policies (`direct` / `dual-write` / `event-only`) |

---

## Module role

The truth compiler is the **enforcement plane** between declarative contracts in `@afenda/meta-types` and PostgreSQL: CHECK constraints, trigger functions, and supplemental SQL, plus **runtime policy resolution** so command handlers fail fast consistently with the database.

- **Upstream consumers:** `apps/api` (policy helpers, optional compile hooks), `@afenda/truth-test` (contract tests), CI (`truth:check`, `check:all`).
- **Downstream:** `migrations/generated/truth-v1.sql`, PostgreSQL (after migrations apply), Drizzle schema exports (via `compareTruthToSchema`).
- **Boundary:** No HTTP server. Pure compilation by default; schema compare touches Drizzle metadata. Contract source is `truth-config.ts`; types are owned by `@afenda/meta-types/compiler` and `@afenda/meta-types/policy`.

### Boundary position

```
┌────────────────────────────────────────────────────────────┐
│  apps/api (command gateway, resolveMutationPolicy, …)        │
└───────────────────────────┬────────────────────────────────┘
                            │ same MutationPolicyDefinition
                            ▼
┌────────────────────────────────────────────────────────────┐
│  @afenda/db/truth-compiler                                  │
│  truth-config → normalize → compile* → dependency graph    │
│       → emitSqlSegments → truth-v1.sql                      │
│       compareTruthSchema ◄── Drizzle schema                  │
└───────────────────────────┬────────────────────────────────┘
                            │
                            ▼
┌────────────────────────────────────────────────────────────┐
│  @afenda/meta-types (TruthModel, EntityDef, policies, …)   │
└────────────────────────────────────────────────────────────┘
                            │
                            ▼
                    PostgreSQL (CHECK, triggers, functions)
```

---

## Repository layout

```
packages/db/src/truth-compiler/
├── index.ts                      # Public exports
├── truth-config.ts               # COMPILER_INPUT, TruthModel + registries
├── normalizer.ts                 # NormalizerInput → NormalizedTruthModel
├── types.ts                      # NormalizedTruthModel, SqlSegment
├── invariant-compiler.ts
├── cross-invariant-compiler.ts
├── mutation-policy-compiler.ts
├── mutation-policy-runtime.ts
├── transition-compiler.ts
├── event-compiler.ts
├── dependency-graph.ts
├── emitter.ts
├── schema-compiler.ts
├── compare-truth-schema.ts       # CLI: truth vs Drizzle
├── generate-truth-sql.ts         # CLI: generate / --check
├── graph-constants.ts
├── sql-utils.ts
├── sql/
│   ├── truth-runtime-primitives.sql
│   └── truth-supplemental-triggers.sql
├── __test__/
├── upgrade.md                    # Roadmap / P0 gaps
├── README.md
└── ARCHITECTURE.md
```

---

## Core architecture

### 1. Contract input (`truth-config.ts`)

Registers `TruthModel` manifests (`entities`, `events`, `invariants`, `crossInvariants`, `stateMachines`, `relationships`, `policies`, `mutationPolicies`) plus parallel registries: `EntityDef[]`, `InvariantRegistry[]`, `StateMachineDefinition[]`, `CrossInvariantDefinition[]`, `MutationPolicyDefinition[]`. `COMPILER_INPUT` aggregates `NormalizerInput` for the pipeline. Types originate from `@afenda/meta-types/compiler` and `@afenda/meta-types/policy` (`MutationPolicyDefinition` is defined in `compiler/truth-model.ts` and re-exported from policy for a single consumer import path).

### 2. Normalization (`normalizer.ts`)

Produces `NormalizedTruthModel`: merged `EntityDef[]`, resolved `InvariantDefinition[]`, filtered cross-invariants and mutation policies, state machines, and event names, with optional `namespace` for generated SQL identifiers.

### 3. Compilation stages

Each stage returns `SqlSegment[]` (`model`, `kind`, `sql`, optional `nodeId`):

- **Invariants** → `check` segments (entity scope); aggregate/global paths may still be advisory — see [upgrade.md](./upgrade.md).
- **Cross-invariants** → triggers / checks spanning entities.
- **Mutation policies** → trigger guards aligned with `MutationPolicy`.
- **Transitions** → state machine validation (`StateMachineDefinition`).
- **Events** → append-only / hook SQL aligned with declared event names.

Kinds order in emission: `comment` → `check` → `function` → `trigger` ([types.ts](./types.ts)).

### 4. Dependency graph and emission

`buildDependencyGraph` connects entity, invariant, policy, transition, and event nodes; topological ordering breaks cycles deterministically. `generate-truth-sql.ts` applies order indices then `emitSqlSegments` for stable, diff-friendly output.

### 5. Schema drift (`schema-compiler.ts`)

`compareTruthToSchema` compares normalized truth entity defs to Drizzle exports; `formatSchemaCompareReport` renders CLI output (`truth:schema:compare`).

### 6. Runtime alignment (`mutation-policy-runtime.ts`)

Resolves `MutationPolicyDefinition` for an entity/operation so the API can deny direct writes when the compiled DB layer expects `event-only` or constrained `dual-write`.

---

## Design patterns

- **Single manifest:** `TruthModel` lists IDs; registries supply implementations — same pattern as type-level tests in `@afenda/meta-types`.
- **Deterministic artifact:** Ordered segments + normalized timestamp stripping in `truth:check` keep CI drift detection reliable.
- **Fail loud on compile:** Invalid combinations should throw during generation, not ship as silent SQL comments (ongoing hardening in [upgrade.md](./upgrade.md)).
- **SQL hardening:** Identifier and literal helpers in `sql-utils.ts` reduce injection risk in generated SQL.

---

## Consumer map

| Consumer | Usage |
| -------- | ----- |
| **CI / merge gates** | `truth:check`, `check:all` |
| **API** | `resolveMutationPolicy`, `isDirectMutationAllowed`, optional imports of compile stages |
| **@afenda/truth-test** | Contract tests driven from shared registries |
| **DB migrations** | Consumes generated `truth-v1.sql` |

---

## Testing strategy

- **Unit / contract:** `__test__/` — compilers, emitter ordering, dependency graph, mutation policy compile + runtime, truth-config, schema compare.
- **Integration:** Regenerate SQL and run `truth:check` after any `truth-config` or compiler change.

---

## Build and typecheck

```bash
pnpm --filter @afenda/db typecheck
pnpm --filter @afenda/db build
pnpm --filter @afenda/db truth:check
```

---

## Governance rules

1. **Artifact integrity:** Do not merge if `truth:check` fails; review `truth-v1.sql` diffs for unintended enforcement changes.
2. **Meta-types alignment:** New manifest fields or policy shapes start in `@afenda/meta-types`, then propagate to `truth-config` and compiler stages.
3. **Policy consistency:** `requiredEvents` and `mutationPolicy` must match what `event-compiler` and `mutation-policy-compiler` enforce.
4. **Privileged writes:** Direct SQL bypass of triggers should be reserved for controlled maintenance paths only.
5. **Roadmap honesty:** Compiler emits deferred triggers for aggregate/global scopes; remaining gaps (replay, violation logging, column-level schema compare) live in [upgrade.md](./upgrade.md) and [BASELINE_AUDIT_FINDINGS.md](./BASELINE_AUDIT_FINDINGS.md).

---

## Acceptance criteria (stabilization)

| Criterion | How we verify |
| --------- | ------------- |
| Committed SQL matches compiler | `pnpm --filter @afenda/db truth:check` (also in `pnpm truth:gate`) |
| Truth vs Drizzle table set | `pnpm --filter @afenda/db truth:schema:compare` |
| Compiler unit tests | `pnpm --filter @afenda/db test:truth-compiler` |
| Integration parity with pipeline | `truth-enforcement.integration.test.ts` uses `buildOrderedSqlSegments` |
| Advisory visibility without blocking merge | PR job `truth_compiler_advisory` + `pnpm truth:gate:advisory` |
| Pre-merge strict bundle | `pnpm truth:gate` at repo root |

---

## Enterprise stewardship (lightweight)

- **Domain steward:** Assign in [BASELINE_AUDIT_CHECKLIST.md](./BASELINE_AUDIT_CHECKLIST.md); owns checklist refresh and escalation when advisory signals repeat.
- **Change management:** Compiler-affecting PRs should attach `truth:check` result or note intentional artifact regen.
- **Quarterly review:** Re-run checklist; append metrics to [BASELINE_AUDIT_FINDINGS.md](./BASELINE_AUDIT_FINDINGS.md).
- **Scale:** New bounded contexts follow the same manifest + `compile-pipeline` + gates pattern (see [upgrade.md](./upgrade.md) Wave 5B).

---

## Import strategy

```typescript
import { normalize, compileInvariants, emitSqlSegments, resolveMutationPolicy } from "@afenda/db/truth-compiler";
```

Prefer the subpath over deep imports into `*.js` files under `truth-compiler/` so refactors stay centralized in `index.ts`.

---

## Enforcement vs advisory (summary)

| Capability | Level | Notes |
| ---------- | ----- | ----- |
| Entity invariants | Strong (DB) | CHECK constraints |
| State transitions | Strong (DB) | Trigger / function |
| Event hooks | Strong (DB) | Generated SQL |
| Runtime direct-write gating | Strong (app) | Policy runtime |
| Cross-entity rules | Medium | Authoring / join strictness |
| Aggregate / global invariants | Medium (DB) | Deferred triggers emitted; multi-row aggregate bodies may need tailoring |
| Dual-write observability | Partial | Policy model; DB audit completeness TBD |

---

## Summary

The truth compiler turns **`@afenda/meta-types` contracts** into **versioned, deterministic SQL** and keeps **runtime mutation policy** aligned with that SQL. Its operational contract is the pair: **source registries** (`truth-config.ts`) and **generated artifact** (`truth-v1.sql`) verified by **`truth:check`**.

**Related:** [README.md](./README.md) · [upgrade.md](./upgrade.md) · [packages/meta-types/ARCHITECTURE.md](../../../../meta-types/ARCHITECTURE.md)
