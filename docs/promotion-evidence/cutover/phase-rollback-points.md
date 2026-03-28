# Phase Rollback Points

- Last updated (UTC): 2026-03-27T23:52:09.402Z

## Phase 1

- Rollback point: Revert mutation policy registry changes in packages/db/src/truth-compiler/truth-config.ts and rerun pnpm ci:policy:contract-consistency.

## Phase 2

- Rollback point: Revert command-runtime spine extraction in apps/api command-service modules and rerun pnpm ci:api:command-bounded-context.

## Phase 3

- Rollback point: Revert shared actor-resolution helper usage in tenant/organization/workflow routes and rerun route tests for tenant/organization/workflow.

## Phase 4

- Rollback point: Revert shared non-sales governance engine integration and rerun pnpm ci:promotion:non-sales plus pnpm ci:parity:non-sales.

## Phase 5

- Rollback point: Revert rollout and evidence docs to prior reviewed baseline and rerun pnpm ci:promotion:non-sales to confirm required runbook markers.

## Phase 6

- Rollback point: Revert Phase 6 edge-case tests only if they fail legitimately and rerun targeted gateway/route/command-service suites before merging.

## Phase 7

- Rollback point: Revert CI hard-gate additions only with explicit approval and rerun pnpm ci:release:governance to verify required marker checks.

## Phase 8

- Rollback point: If any full-run gate or stabilization check fails, stop cutover, keep current production policy states, remediate failures, and rerun this cutover pass from the beginning.

