**Plan: Bulk Robust Vitest Suite for Meta-Types**

You asked for large-scale, architecture-true tests that fail hard and force code upgrades instead of weakening tests.
I aligned the plan to your decisions:

1. All 14 domains in one batch
2. Strict type-level gates enabled
3. Merge-blocking failure posture
4. Fully asserted tests (not skeleton-only)

I also saved this plan to session memory at /memories/session/plan.md for handoff continuity.

**Steps**
1. Phase 1: Baseline and guardrails
1.1 Keep existing contract tests as anchors in api-contract.test.ts and utils.test.ts.
1.2 Add explicit test gate scripts in package.json for runtime, schema, type-contract, and export-contract suites.
1.3 Enforce deterministic policy (no flaky random/time/network behavior in this package).

2. Phase 2: Test scaffolding for bulk generation (parallelizable)
2.1 Create domain-local test directories under src/<domain>/__test__.
2.2 Add cross-domain integration suite under src/__test__/integration.
2.3 Keep fixture logic inline unless duplication becomes significant.

3. Phase 3: Runtime and constants hardening (parallelizable)
3.1 Expand core guard coverage targeting guards.ts.
3.2 Add full cache behavior tests for cache.ts.
3.3 Add constant integrity suites for types.ts and types.ts.

4. Phase 4: Zod schema contract matrix (parallelizable by domain)
4.1 Add robust valid/invalid parse matrices for:
- field-types.schema.ts
- session.schema.ts
- types.schema.ts
- tenant.schema.ts
- types.schema.ts

5. Phase 5: Strict type-level contract gates
5.1 Add compile-time contract assertions with Vitest type testing for exported types vs inferred schema types.
5.2 Add branded-type distinctness checks from types.ts.
5.3 Add subpath/barrel contract checks using index.ts.

6. Phase 6: Domain DSL and cross-module integration suites
6.1 Add structure-level tests for workflow/compiler/policy/layout contracts where runtime-checkable semantics exist.
6.2 Add dependency-chain integration tests in src/__test__/integration for schema -> rbac -> policy/compiler/workflow compatibility.
6.3 Expand export-surface gate in api-contract.test.ts so drift is intentional and reviewed.

7. Phase 7: Enforcement and documentation
7.1 Wire non-watch CI test commands in package.json.
7.2 Block merge on any contract/type/schema failure (no CI auto snapshot updates).
7.3 Document this non-compromise policy in ARCHITECTURE.md.

8. Phase 8: Verification and impact checks
8.1 Run package lint/typecheck/full test gates.
8.2 Run consumer smoke checks for affected dependents (api, db, truth-test) when contracts change.
8.3 Publish failure triage grouped as contract regression, schema mismatch, type drift, runtime behavior drift.

**Verification**
1. pnpm --filter @afenda/meta-types lint
2. pnpm --filter @afenda/meta-types typecheck
3. pnpm --filter @afenda/meta-types test:ci
4. pnpm --filter @afenda/meta-types test:contracts
5. pnpm --filter @afenda/meta-types test:types
6. pnpm --filter @afenda/api typecheck
7. pnpm --filter @afenda/db typecheck
8. pnpm --filter @afenda/truth-test test:run

**Scope Boundaries**
1. Included: full 14-domain coverage, strict gates, merge-blocking failures, robust fully asserted tests.
2. Excluded: weakening tests to pass, adding unrelated frameworks, modifying production contracts just to silence failures.

If you approve this plan, I will hand off for implementation exactly in this order with parallel batching where marked.
