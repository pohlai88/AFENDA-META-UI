# @afenda/db/truth-compiler

Canonical truth-compilation pipeline for AFENDA: compile business contracts into deterministic PostgreSQL enforcement artifacts.

**Data tier compiler layer** — consumed by `@afenda/db`, `apps/api`, and `@afenda/truth-test` for schema enforcement, runtime policy guards, and drift governance.

---

## Quick Start

### Generate and Validate Truth SQL

```bash
# Generate deterministic SQL artifact
pnpm --filter @afenda/db truth:generate

# Verify generated SQL matches committed artifact (CI gate)
pnpm --filter @afenda/db truth:check

# Compare truth contracts against Drizzle schema exports
pnpm --filter @afenda/db truth:schema:compare
```

### Import Strategies

#### Strategy A - Subpath API (recommended)

```typescript
import {
  normalize,
  compileInvariants,
  compileCrossInvariants,
  compileMutationPolicies,
  compileTransitions,
  compileEvents,
  buildDependencyGraph,
  emit,
} from "@afenda/db/truth-compiler";
```

Use when you need compiler stages, runtime policy helpers, or extension points.

#### Strategy B - Runtime policy helpers in app layer

```typescript
import {
  MUTATION_POLICIES,
  resolveMutationPolicy,
  isDirectMutationAllowed,
} from "@afenda/db/truth-compiler";
```

Use when API command handlers must align direct writes with event-only or dual-write policy rollout.

---

## Available Modules

| Module | Purpose | Output |
| --- | --- | --- |
| `truth-config.ts` | Canonical truth manifest and registries | `COMPILER_INPUT`, policy registries |
| `normalizer.ts` | Resolve and deduplicate truth model input | `NormalizedTruthModel` |
| `invariant-compiler.ts` | Entity invariants to SQL constraints | `SqlSegment[]` (`check`) |
| `cross-invariant-compiler.ts` | Cross-entity rules to SQL guards/triggers | `SqlSegment[]` |
| `mutation-policy-compiler.ts` | Mutation modes to SQL trigger guards | `SqlSegment[]` |
| `transition-compiler.ts` | State machine transitions to trigger functions | `SqlSegment[]` |
| `event-compiler.ts` | Domain events to append-only hooks | `SqlSegment[]` |
| `dependency-graph.ts` | Dependency ordering and cycle detection | Graph + ordered node list |
| `emitter.ts` | Deterministic SQL bundle emission | SQL text artifact |
| `schema-compiler.ts` | Truth vs Drizzle drift comparison | `SchemaCompareResult` |
| `mutation-policy-runtime.ts` | Runtime policy resolution helpers | allow/deny policy result |
| `sql-utils.ts` | SQL hardening helpers | quoted/safe SQL fragments |

---

## Pipeline Overview

`truth-config` -> `normalize` -> `compile* stages` -> `buildDependencyGraph` -> `applyDependencyOrder` -> `emit` -> `migrations/generated/truth-v1.sql`

### Stage Breakdown

1. Normalize
- Merges entity definitions and deduplicates invariants.
- Filters state machines, cross-invariants, and mutation policies to declared models.

2. Compile
- Invariants to table checks.
- Cross-invariants to trigger/check scaffolds.
- Mutation policies to write guards.
- Transition rules to state validation triggers.
- Domain events to append-only event hooks.

3. Order and Emit
- Applies deterministic topological ordering.
- Produces stable SQL output so CI can detect real contract drift.

---

## Integration Patterns

### 1. Database Contract Enforcement

Use `truth:generate` during schema evolution and include generated SQL in migration review.

### 2. Runtime Command Gateway Enforcement

Use `resolveMutationPolicy` and `isDirectMutationAllowed` in command handlers so app-layer behavior matches DB-layer truth constraints.

### 3. CI Governance

Run `truth:check` in merge gates to prevent config and artifact drift.

### 4. Test Harness Alignment

Use `@afenda/truth-test` auto-generators to validate policy, invariant, and transition contract behavior from the same registries.

---

## Truth Boundary Matrix

| Area | Current Behavior | Status |
| --- | --- | --- |
| Entity-scoped invariants | Compiled to DB CHECK constraints | Enforced truth |
| State transitions | Compiled to trigger/function guards | Enforced truth |
| Event hook generation | Compiled to append-only hooks | Enforced truth |
| Runtime policy checks | Enforced through command gateway helpers | Enforced truth |
| Aggregate/global invariants | Placeholder comments for deferred work | Advisory only |
| Dual-write observability | Partial policy model, no complete DB audit guard | Partial truth |

This package is already a strong enforcement engine, but still has explicit areas where truth is advisory rather than fully executable.

---

## Add a New Domain or Bounded Context

1. Add domain entities, invariants, transitions, events, and policies in `truth-config.ts`.
2. Ensure event contracts and policy `requiredEvents` align.
3. Run `pnpm --filter @afenda/db truth:generate`.
4. Run `pnpm --filter @afenda/db truth:check`.
5. Run `pnpm --filter @afenda/db truth:schema:compare`.
6. Add or update `@afenda/truth-test` generator inputs for new domain contracts.
7. Verify runtime command handlers use policy helpers for the new model.

---

## Operational Guardrails

- Treat `truth-config.ts` as a governance-controlled contract source.
- Never bypass policy runtime checks for event-only models.
- Never ship changes that fail `truth:check`.
- Review generated SQL diffs like application code.
- Keep direct SQL write paths behind privileged maintenance controls only.

---

## Known Constraints

- Aggregate/global invariant compilation is not complete yet.
- Cross-invariant authoring is strict and requires explicit join paths for multi-model checks.
- State machine compiler currently assumes one state field per model.
- Current bundled config is sales-centric and needs parameterization for full multi-domain scaling.

These are roadmap items, not hidden behavior.
