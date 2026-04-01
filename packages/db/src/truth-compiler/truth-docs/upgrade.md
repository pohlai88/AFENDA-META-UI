# Truth compiler — upgrade and roadmap

This document tracks **remaining platform work** beyond the compiler core. For day-to-day operations, use [README.md](./README.md) and [ARCHITECTURE.md](./ARCHITECTURE.md).

## Completed in compiler (baseline)

- **Non-entity invariants:** `aggregate` / `cross_aggregate` / `global` scopes emit `CREATE OR REPLACE FUNCTION` + `DEFERRABLE INITIALLY DEFERRED` constraint triggers (not comment-only stubs). See [`invariant-compiler.ts`](./invariant-compiler.ts).
- **Deterministic bundle:** `generate-truth-sql.ts` + [`compile-pipeline.ts`](./compile-pipeline.ts) — single ordering for invariants → cross-invariants (strict) → mutation policies (strict) → transitions → events.
- **Advisory CI + strict local:** `pnpm truth:gate:advisory` (repo root, always exit 0) vs `pnpm truth:gate` (strict pre-merge).

## Wave 5A — Remaining P0 items (outside or spanning compiler)

These items were originally tracked as P0; several remain in **replay**, **projection**, **observability**, or **API** layers:

| Phase | Topic | Status | Notes |
| ----- | ----- | ------ | ----- |
| 2 | Replay engine correctness | Open | `replay-events.ts` — UUID handling, no silent no-ops |
| 3 | `assertProjectionReplay` | Open | `assert-projection.ts` in truth-test / API harness |
| 4 | Gateway invariant hook | Partial | `validateInvariants` + `invariantEnforcementMiddleware` now evaluate conditions via `@afenda/truth-test/auto`; optional wiring per route still required |
| 5 | Projection drift validator | Open | `createProjectionDriftValidator` factory (documented in gateway) |
| 6 | Mutation policy violation persistence | Open | Table + ops route pattern in plan |

### Verification commands (when touching compiler output)

1. `pnpm --filter @afenda/db truth:generate`
2. `pnpm --filter @afenda/db truth:check`
3. `pnpm --filter @afenda/db test:truth-compiler`
4. `pnpm truth:gate` (from repo root, strict)

## Wave 5B preview

- Multi-domain `COMPILER_INPUT`, HR (or other) registries in `truth-config.ts`
- Decouple hard-coded `SALES_` assumptions in truth-test assert paths where needed

## Audit and governance

- [BASELINE_AUDIT_CHECKLIST.md](./BASELINE_AUDIT_CHECKLIST.md)
- [BASELINE_AUDIT_FINDINGS.md](./BASELINE_AUDIT_FINDINGS.md)
