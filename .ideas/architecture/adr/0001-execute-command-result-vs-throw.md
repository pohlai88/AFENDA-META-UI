# ADR 0001: Execute Command Block Signaling

Date: 2026-04-01
Status: accepted
Owners: core runtime

## Context

`phase-1-implementation-blueprint.md` describes an `InvariantBlockError` throw path for
pre-commit invariant failures. Current `packages/core` command runtime returns a typed result:

- success: `{ ok: true, mutationResult, postCommitFailures }`
- block: `{ ok: false, stage: "pre_commit_invariants", failures }`

Phase 1 currently does not include E10 API surface implementation and transaction boundary
semantics are still evolving alongside E6 vertical command work.

## Decision

For this sprint (PR-R4 scope), keep the result-object model and do not introduce throw-based flow.

- Added `isInvariantBlockResult(result)` type guard in `runtime/command/types.ts`.
- Keep `executeCommand` control flow unchanged.

## Rationale

- Avoids coupling command runtime internals to future API exception mapping before E10 lands.
- Keeps failure payloads explicit and testable without exception plumbing.
- Enables staged migration to throw semantics later if product/API boundaries require it.

## Consequences

- Callers must branch on `ok` (or use `isInvariantBlockResult`) rather than catch an exception.
- Blueprint deviation is intentional and temporary.

## Revisit trigger

Re-evaluate when E6 + E10 are implemented and transaction + API error mapping contracts are finalized.
