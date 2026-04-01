# PR: feat(core) — truth runtime foundation and invariant execution contracts

## Title

```
feat(core): add truth runtime foundation and invariant execution contracts
```

## Body

Introduces `packages/core/src/runtime/`: load generated doctrines, invariants, and resolutions (not hand-authored specs), build keyed registries, and construct **blocking invariant failure payloads** (invariant + doctrine + evidence + optional resolution) via `buildInvariantFailurePayload`.

Adds `createInvariantRunner` (pre/post-commit shell), `executeCommand` skeleton following optional **bindTenant** → authorize → validate → idempotency → pre-commit invariants → mutation → **appendMemory** → updateProjections → post-commit invariants, plus `AppendOnlyMemoryWriter` / `appendMemoryRecord` and `TransactionBoundary` interfaces. `ExecuteCommandArgs<TInput>` and `RuntimeInvariant<TInput>` keep `CommandContext` input typed.

Does **not** add projection engines, replay/checksum, HTTP APIs, or UI.

## PR 2 acceptance criteria (“done” line)

1. **Runtime loads generated artifacts, not raw specs** — Truth for registry and failure payloads comes from `loadGeneratedTruthArtifacts()` / `src/generated/*`, not hand-parsed spec sources.
2. **Invariant registry resolves doctrine and resolution correctly** — `buildTruthRegistry()` maps doctrines, invariants, and resolutions by key; `buildInvariantFailurePayload` resolves `doctrineRef` / `resolutionRef` and fails clearly on broken refs.
3. **Blocking invariant produces structured failure payload** — Pre-commit failures yield `InvariantFailurePayload` (invariant + doctrine + evidence + optional resolution), not opaque errors.
4. **Command skeleton follows required execution order** — `executeCommand` runs optional `bindTenant` (when provided) → authorize → validateContract → checkIdempotency → pre-commit invariants → (on success) applyMutation → appendMemory → updateProjections → post-commit invariants.
5. **Mutation path cannot skip memory append contract** — The skeleton always calls `appendMemory` after a successful mutation and before projections; memory types enforce the append record shape (`MemoryRecordInput` / `AppendOnlyMemoryWriter`).
6. **No API / UI / projection logic added yet** — No new HTTP handlers, UI, or real projection/replay engines in this PR (hooks only where the skeleton already exists).

## Next (PR 3)

Authority projection, blocked reasons surfacing, replay from memory, checksum comparison — after this runtime layer is stable.
