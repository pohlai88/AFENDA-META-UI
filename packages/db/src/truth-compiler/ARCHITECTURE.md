# Truth Compiler - Architecture

> **Status:** Production active, enterprise hardening in progress
> **Package:** `@afenda/db/truth-compiler`
> **Layer:** Data enforcement compiler
> **Current maturity:** 7.4/10 (strong deterministic compiler, partial enterprise truth completeness)

---

## Design Philosophy

| Old approach | Truth-compiler approach |
| --- | --- |
| Hand-written scattered DB constraints | Contract-first compilation pipeline |
| Runtime-only policy checks | DB + runtime aligned enforcement |
| Drift-prone schema governance | Deterministic SQL artifact + CI drift gates |
| Ad-hoc event rollout | Explicit mutation policy contract model |

---

## Package Role

`@afenda/db/truth-compiler` converts business truth contracts into executable and auditable database behavior.

- Source of contract execution logic for invariants, policies, transitions, and event hooks.
- Deterministic compiler that turns truth contracts into SQL artifacts for merge and release governance.
- Runtime helper source for command gateways to align direct-write behavior with event-sourcing policy.

### Boundary Position

```text
apps/api command gateway + routes
        |
        v
@afenda/db/truth-compiler  <--- contracts from @afenda/meta-types
        |
        v
generated SQL + runtime policy decisions
        |
        v
PostgreSQL enforcement + migration governance
```

---

## Package Structure

```text
packages/db/src/truth-compiler/
├── truth-config.ts               # canonical contract registry
├── normalizer.ts                 # model resolution and deduplication
├── invariant-compiler.ts         # entity invariant checks
├── cross-invariant-compiler.ts   # cross-model constraints
├── mutation-policy-compiler.ts   # policy -> SQL trigger guards
├── mutation-policy-runtime.ts    # policy resolution at runtime
├── transition-compiler.ts        # state machine transition enforcement
├── event-compiler.ts             # domain event hook generation
├── dependency-graph.ts           # topological order + cycle detection
├── emitter.ts                    # deterministic SQL bundle generation
├── schema-compiler.ts            # truth vs Drizzle drift compare
├── generate-truth-sql.ts         # orchestration CLI
├── compare-truth-schema.ts       # drift CLI
├── graph-constants.ts            # truth-priority constants
├── sql-utils.ts                  # SQL quoting and literal hardening
├── types.ts                      # compiler contracts
└── index.ts                      # public subpath exports
```

---

## Core Architecture

### 1. Contract Input Layer

`truth-config.ts` defines the source contracts:
- entities
- events
- invariant registries
- cross-invariants
- mutation policies
- state machines

This file is the governance choke point for truth evolution.

### 2. Normalization Layer

`normalizer.ts` produces `NormalizedTruthModel` by:
- merging entity definitions
- filtering to declared models
- deduplicating invariants and events
- applying namespace context

### 3. Compilation Layer

Compiler stages generate `SqlSegment[]` independently:
- `compileInvariants`
- `compileCrossInvariants`
- `compileMutationPolicies`
- `compileTransitions`
- `compileEvents`

### 4. Dependency and Ordering Layer

`dependency-graph.ts` builds a graph of entity, invariant, policy, transition, and event nodes, then performs cycle-aware topological ordering.

### 5. Emission Layer

`emitter.ts` provides deterministic assembly guarantees:
- stable sort by dependency order
- stable segment-kind ordering
- deterministic output for CI-friendly artifact checks

### 6. Runtime Alignment Layer

`mutation-policy-runtime.ts` provides the runtime twin of compile-time mutation policy semantics so APIs can block forbidden direct writes before DB failure.

---

## Truth Boundary: Enforced vs Advisory

| Capability | Enforcement Level | Notes |
| --- | --- | --- |
| Entity invariant checks | Strong (DB) | CHECK constraints generated |
| Transition validation | Strong (DB) | Trigger/function generated |
| Event hook consistency | Strong (DB) | Append-only event hooks generated |
| Runtime direct-write policy gating | Strong (App runtime) | API gateway uses runtime helpers |
| Cross-entity truth (all forms) | Medium | Supported, but authoring and strictness require careful joins |
| Aggregate/global invariant truth | Weak | Deferred to future implementation; currently advisory comments in some paths |
| Dual-write observability completeness | Medium-low | Policy model exists, full audit-grade enforcement pending |

This boundary matrix is intentionally explicit to avoid false confidence.

---

## Potential Evaluation (Enterprise Lens)

### Dimension Scores

| Dimension | Score | Evidence |
| --- | --- | --- |
| Contract expressiveness | 8.5/10 | Rich policy, invariant, transition, and event contracts |
| Deterministic compilation | 9.2/10 | ordered graph + deterministic emitter |
| Runtime and DB parity | 7.4/10 | strong policy helpers + SQL generation, but gaps remain |
| Multi-domain scale readiness | 6.2/10 | current config is sales-first and needs parameterization |
| Observability and compliance | 6.6/10 | partial controls and gates, incomplete dual-write observability |
| Operational governance | 8.3/10 | truth-check and policy consistency gates in place |

### Overall Potential

The compiler has high strategic potential and can become an enterprise-grade truth platform. Its fundamentals are strong: deterministic generation, typed contracts, and deployment gates. The remaining gap is not architecture direction, but enforcement completeness and scale generalization.

---

## Half-Truth Risk Register

### Critical

1. Aggregate/global invariants are not fully compiled to executable DB enforcement.
2. Dual-write mode is modeled but not yet fully observable as a compliance-grade enforcement flow.

### High

1. Single-state-field assumption constrains real ERP workflows.
2. Sales-centric bundling in `truth-config.ts` slows multi-domain onboarding.

### Medium

1. Cross-invariant authoring is strict and can be difficult without stronger ergonomics.
2. Event contract synchronization remains vulnerable without fully automated contract-to-schema alignment.

---

## Enterprise Upgrade Blueprint

### P0 (Must complete to become full truth platform)

1. Compile aggregate/global invariants into executable trigger/deferred-check enforcement.
2. Add dual-write audit enforcement and violation telemetry at DB level.
3. Enforce runtime/DB parity checks in CI for policy mode transitions.

Acceptance criteria:
- No advisory-only path for declared critical invariants.
- Dual-write violations are queryable and alertable.
- Promotion gates fail if runtime policy and SQL policy diverge.

### P1 (Scale and operational hardening)

1. Parameterize compiler input for multi-domain manifests.
2. Auto-generate or strongly validate event contract enums against truth model declarations.
3. Add cross-invariant tooling for safe join-path authoring and preview.

Acceptance criteria:
- New bounded context can onboard without forking compiler logic.
- Event declaration drift becomes impossible to merge.
- Cross-invariant onboarding time materially reduced.

### P2 (Enterprise polish and advanced resilience)

1. Support multi-state-field transition models.
2. Introduce stronger compiler observability metrics (segment counts, skipped paths, policy coverage).
3. Add rollout analytics and SLO dashboards for truth enforcement outcomes.

Acceptance criteria:
- Complex ERP lifecycle models compile without state flattening hacks.
- Compiler emits measurable quality signals consumed by ops.

---

## Best-Practice Upgrade Model for "Real Truth"

### Promotion Path

1. `direct` (legacy baseline)
2. `dual-write` (event and direct writes with strict observability)
3. `event-only` (direct writes blocked by runtime + DB enforcement)

### Recommended Controls at Each Stage

- Contract review gate for every mutation policy change.
- Deterministic artifact gate (`truth:check`) required for merge.
- Drift gate (`truth:schema:compare`) required for release.
- Runtime policy conformance tests required in API command services.
- Incident response runbook for policy violations and enforcement regressions.

---

## Security and Safety Properties

- SQL identifiers and literals are hardened through `sql-utils.ts`.
- Deterministic compilation reduces hidden drift risk.
- Explicit strict mode and CI checks provide fail-fast governance.

---

## Engineering Standards for Ongoing Evolution

1. Every new invariant/policy must include executable enforcement intent and test coverage.
2. No TODO/comment-only truth for critical business controls.
3. Contract changes must include both generated SQL diff and runtime behavior test updates.
4. Truth-compiler docs and gates are part of the production surface, not optional documentation.

By following this upgrade path, the truth-compiler can evolve from a strong enforcement engine into a fully authoritative enterprise truth system.