# @afenda/db/truth-compiler

**Compile business truth contracts** (`TruthModel`, entity defs, invariants, state machines, mutation policies) **into deterministic PostgreSQL artifacts** (checks, triggers, functions) plus **runtime mutation-policy helpers** aligned with the same registries.

**Data-layer submodule** — ships inside `@afenda/db`; consumers import `@afenda/db/truth-compiler`. The root `@afenda/db` barrel does **not** re-export this subpath. CLIs: `truth:generate`, `truth:check`, `truth:schema:compare`, `truth:schema:compare:warn` (see [generate-truth-sql.ts](./generate-truth-sql.ts), [compare-truth-schema.ts](./compare-truth-schema.ts)).

**Strict local preflight (repo root):** `pnpm truth:gate` — runs `truth:check`, blocking schema compare, and `ci:gate:truth` (truth-score). **Advisory (CI / local):** `pnpm truth:gate:advisory` — same signals, always exits 0; use for warn-only pipelines.

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

#### Strategy A — Subpath (recommended)

```typescript
import {
  normalize,
  compileInvariants,
  compileCrossInvariants,
  compileMutationPolicies,
  compileTransitions,
  compileEvents,
  buildDependencyGraph,
  emitSqlSegments,
  compareTruthToSchema,
  formatSchemaCompareReport,
  MUTATION_POLICIES,
  resolveMutationPolicy,
  isDirectMutationAllowed,
  COMPILER_INPUT,
  SALES_TRUTH_MODEL,
  buildOrderedSqlSegments,
} from "@afenda/db/truth-compiler";
```

**Use when:** You need compiler stages, `NormalizedTruthModel`, SQL segment emission, `compareTruthToSchema` / `formatSchemaCompareReport`, or runtime mutation-policy resolution in the API command layer.

#### Strategy B — Scripts and CI only

Use package scripts instead of importing:

```bash
pnpm --filter @afenda/db truth:generate
pnpm --filter @afenda/db truth:check
pnpm --filter @afenda/db truth:schema:compare
```

**Use when:** You only need to regenerate or verify `migrations/generated/truth-v1.sql` and do not need programmatic access.

---

## Public surface (summary)

| Area | Symbols / modules |
| ---- | ----------------- |
| **Config** | `COMPILER_INPUT`, `SALES_TRUTH_MODEL`, registries in [truth-config.ts](./truth-config.ts) |
| **Normalize** | `normalize`, `NormalizerInput` → `NormalizedTruthModel` ([types.ts](./types.ts)) |
| **Pipeline** | `buildOrderedSqlSegments` — same compile order as `generate-truth-sql.ts` ([compile-pipeline.ts](./compile-pipeline.ts)) |
| **Compile** | `compileInvariants`, `compileCrossInvariants`, `compileMutationPolicies`, `compileTransitions`, `compileEvents` |
| **Order / emit** | `buildDependencyGraph`, `applyDependencyOrder` (via [generate-truth-sql.ts](./generate-truth-sql.ts)), `emitSqlSegments`, `TRUTH_SQL_BUNDLE_HEADER` |
| **Drift** | `compareTruthToSchema`, `formatSchemaCompareReport`, `SchemaCompareResult` ([schema-compiler.ts](./schema-compiler.ts)) |
| **Runtime policy** | `MUTATION_POLICIES`, `resolveMutationPolicy`, `isDirectMutationAllowed` ([mutation-policy-runtime.ts](./mutation-policy-runtime.ts)) |
| **Types** | `SqlSegment`, `SqlSegmentKind`, `NormalizedTruthModel` |
| **Graph constants** | [graph-constants.ts](./graph-constants.ts) (truth priority alignment) |

Full barrel: [`index.ts`](./index.ts).

---

## Meta-types contract (validated shape)

The compiler input and normalized model are **typed against `@afenda/meta-types`**. Keep `truth-config.ts` in sync with these exports:

| Concern | Subpath | Types used here |
| ------- | ------- | ----------------- |
| Manifest + entities + transitions | `@afenda/meta-types/compiler` | `TruthModel`, `EntityDef`, `StateMachineDefinition` |
| Invariants + cross-rules + mutation policies | `@afenda/meta-types/policy` | `InvariantRegistry`, `InvariantDefinition`, `CrossInvariantDefinition`, `MutationPolicyDefinition` |

`TruthModel` (see `packages/meta-types/src/compiler/truth-model.ts`) is the manifest: `entities`, `events`, `invariants`, optional `crossInvariants`, `stateMachines`, `relationships`, `policies`, `mutationPolicies`. `NormalizedTruthModel` resolves registries into concrete `EntityDef[]`, `InvariantDefinition[]`, etc. ([types.ts](./types.ts)).

`MutationPolicy` modes (`direct` \| `dual-write` \| `event-only`) and `MutationPolicyDefinition` are defined on the compiler truth-model type and re-exported through `@afenda/meta-types/policy` — import policy types from **policy** in app/db code for a single ergonomic entry.

---

## Feature guides

### 1. Generate and verify SQL

```bash
pnpm --filter @afenda/db truth:generate
pnpm --filter @afenda/db truth:check
```

Output: `packages/db/migrations/generated/truth-v1.sql`, assembled with primitives from [sql/truth-runtime-primitives.sql](./sql/truth-runtime-primitives.sql) and [sql/truth-supplemental-triggers.sql](./sql/truth-supplemental-triggers.sql).

### 2. Truth vs Drizzle drift

```bash
pnpm --filter @afenda/db truth:schema:compare
```

Use during schema evolution to keep Drizzle exports aligned with truth entity defs.

### 3. Runtime command gateway

Use `resolveMutationPolicy` / `isDirectMutationAllowed` so API direct writes match DB trigger guards and `MutationPolicyDefinition.requiredEvents`.

### 4. Add a bounded context

Follow the numbered checklist in the header of [truth-config.ts](./truth-config.ts): entity defs, invariant registries, state machines, `TruthModel` manifest, then `COMPILER_INPUT`. Regenerate SQL and run `truth:check`. Extend `@afenda/truth-test` when adding contracts.

---

## Local development

No database connection is required for `truth:generate` / `truth:check` (pure compilation). `truth:schema:compare` may need your usual `@afenda/db` env for schema loading — see package README.

```bash
pnpm --filter @afenda/db truth:generate
pnpm --filter @afenda/db truth:check
pnpm --filter @afenda/db truth:schema:compare
```

---

## Testing

```bash
pnpm --filter @afenda/db test:truth-compiler
pnpm --filter @afenda/db typecheck
pnpm --filter @afenda/db build
```

---

## ADRs (decisions)

- Roadmap and P0/P1 enforcement gaps: [upgrade.md](./upgrade.md)
- Wider type-system layout: [packages/meta-types/ARCHITECTURE.md](../../../../meta-types/ARCHITECTURE.md)

---

## Related documentation

- [ARCHITECTURE.md](./ARCHITECTURE.md) — Design, boundaries, consumers, governance, enforcement matrix
- [BASELINE_AUDIT_CHECKLIST.md](./BASELINE_AUDIT_CHECKLIST.md) — Quarterly / pre-change audit template
- [BASELINE_AUDIT_FINDINGS.md](./BASELINE_AUDIT_FINDINGS.md) — Recorded drift and parity risks
- [upgrade.md](./upgrade.md) — Truth completeness waves and acceptance criteria
- [../../README.md](../../README.md) — `@afenda/db` package overview
- [../../../../docs/TYPESCRIPT_EXPORTS.md](../../../../docs/TYPESCRIPT_EXPORTS.md) — Monorepo export conventions

---

## Stability policy

1. Treat `truth:check` and the committed `truth-v1.sql` artifact as a **contract**: generated SQL diffs should be reviewed like application code.
2. Changes to exported compiler functions or `NormalizedTruthModel` may affect `apps/api` and `@afenda/truth-test`; prefer additive APIs and `@deprecated` before removal.
3. Manifest and policy edits must stay consistent with `@afenda/meta-types` — run `pnpm --filter @afenda/meta-types build` (pulled in by db `typecheck`).

---

## Checklist (optional)

| Practice | Status |
| -------- | ------ |
| `truth:check` in CI / `check:all` | Intended |
| Regenerate SQL after `truth-config` changes | Required |
| `truth:schema:compare` on schema releases | Recommended |
| API uses mutation-policy runtime for governed entities | Recommended |
