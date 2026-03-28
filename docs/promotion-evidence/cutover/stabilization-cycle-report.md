# Cutover Stabilization Cycle Report

- Generated at (UTC): 2026-03-27T23:52:09.402Z
- Mode: dev-mode (core gates only)
- Note: Infrastructure gates skipped (ci:gate, contracts, build, full test suite)
- Focus: Promotion-specific validation only (policy, parity, projection replay)

## Cutover Gate Pass (full run prerequisite)

- [x] pnpm ci:policy:contract-consistency
- [x] pnpm ci:api:command-bounded-context
- [x] pnpm ci:api:projection-replay
- [x] pnpm ci:promotion:non-sales
- [x] pnpm ci:parity:non-sales
- [x] pnpm ci:promotion:organization:checklist
- [x] pnpm --filter @afenda/db truth:check
- [x] pnpm --filter @afenda/db truth:schema:compare

## Stabilization Cycle (policy violations and projection drift)

- [x] pnpm --filter @afenda/api exec vitest run src/policy/__test__/mutation-command-gateway.test.ts
- [x] pnpm --filter @afenda/api exec vitest run src/routes/__test__/tenant.route.test.ts src/routes/__test__/organization.route.test.ts src/routes/__test__/workflow.route.test.ts
- [x] pnpm --filter @afenda/api exec vitest run src/events/__test__/projectionRuntime.test.ts src/events/__test__/cross-context-drift-fixture.test.ts src/events/__test__/workflow-replay-concurrency-fixture.test.ts
- [x] pnpm ci:parity:non-sales

## Enforcement Summary

- Cutover pass proceeds only when every full-run gate command is green.
- Rollback points are tracked in docs/promotion-evidence/cutover/phase-rollback-points.md.
- Stabilization cycle explicitly checks mutation-policy guardrails and projection-drift diagnostics.
