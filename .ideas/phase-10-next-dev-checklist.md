# Phase 10 Next-Dev Checklist

## Status

Closed on March 26, 2026.

## Goal

Close Phase 10 (Commissions & Sales Teams) by extending current partial implementation to full workflow coverage with tenant-safe orchestration, test completeness, and CI-gate compliance.

## Current Baseline (Validated)

- Commission schema tables (47-53) are present and contract-tested.
- Seed coverage + invariants now include draft, approved, and paid commission lifecycle states.
- Commission engine + generation/approve/pay/report services are implemented.
- API surface includes generation + lifecycle/report routes.
- Focused tests, typecheck, and full CI gate are green.

## Definition of Done

- Territory assignment is implemented and integrated into commission generation flow.
- Commission lifecycle operations are implemented: generate -> approve -> pay.
- Reporting surface is available for commission entries by salesperson/date range/status.
- Route/action metadata includes approve/pay/report operations.
- Tests cover engine + service + route lifecycle and territory matching edge cases.
- Full `pnpm ci:gate` passes.

## Ordered Implementation Tasks

### 1) Territory Resolution Layer

- [x] Add deterministic territory matcher from `territory_rules` (country/state/zip + priority).
- [x] Add service helper to resolve effective salesperson/team when order user is missing or overridden.
- [x] Add clear conflict behavior for overlapping rules with same priority.

Acceptance criteria:

- Given matching rules, highest priority rule is selected.
- Given no matching rule, fallback policy is explicit and tested.
- Matching behavior is tenant-scoped and soft-delete aware.

### 2) Commission Lifecycle Services

- [x] Add approval operation for draft entries by period/filter.
- [x] Add pay operation for approved entries with payment date handling.
- [x] Enforce guardrails: draft cannot be paid directly, paid cannot be re-approved.

Acceptance criteria:

- Lifecycle transitions mirror engine guard rules.
- Batch operations are idempotent for already transitioned records.
- Errors are descriptive for invalid transitions.

### 3) Reporting Service

- [x] Implement report query for entries by tenant/date range/salesperson/status.
- [x] Return summary totals and grouped status counts.
- [x] Ensure predictable sort order and pagination primitives.

Acceptance criteria:

- Report totals match summed entry values.
- Date-range filters are UTC-safe and tested.
- Response shape is stable for UI consumption.

### 4) API Routes + Metadata Actions

- [x] Add routes for approve/pay/report under `/api/sales/commissions/*`.
- [x] Add request schemas and payload validation.
- [x] Register module actions and route metadata for new operations.

Acceptance criteria:

- Invalid payloads return validation errors with actionable messages.
- Routes are tenant-aware and actor-aware.
- Existing generate route behavior remains backward compatible.

### 5) Tests

- [x] Expand engine tests for transition edge cases and rate boundary handling.
- [x] Add service tests for territory fallback, batch approval, payment transitions, and reporting.
- [x] Add route tests for approve/pay/report success + failure paths.

Minimum target:

- Commission engine tests: 12 total passing.
- Commission service tests: 8 total passing.
- Route tests: 15 total passing.

### 6) Seeds and Invariants

- [x] Extend Phase 10 seed scenarios to include draft, approved, paid entries.
- [x] Add invariant checks for transition integrity and report aggregation consistency.

Acceptance criteria:

- Seed validation confirms at least one entry per lifecycle status.
- Tier/rate math remains consistent with seeded commission entries.

## Verification Commands

```bash
pnpm --filter @afenda/api test -- src/modules/sales/logic/commission-engine.test.ts src/modules/sales/commission-service.test.ts
pnpm --filter @afenda/api typecheck
pnpm --filter @afenda/db test:db -- domain-schema-contracts
pnpm ci:gate
```

## Handoff Notes

- Follow the existing pattern used in consignment/returns/subscriptions: pure logic engine + service orchestration + audited route layer.
- Keep monetary math deterministic and string-safe at DB boundaries.
- Preserve tenant filters and soft-delete guards in every query path.

## Final Verification Snapshot

- `pnpm --filter @afenda/api test -- src/modules/sales/logic/commission-engine.test.ts src/modules/sales/commission-service.test.ts src/routes/sales.route.test.ts` ✅
- `pnpm --filter @afenda/api typecheck` ✅
- `pnpm --filter @afenda/db typecheck` ✅
- `pnpm --filter @afenda/db test:db -- domain-schema-contracts` ✅
- `pnpm ci:gate` ✅ (9/9 checks)
