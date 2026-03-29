# Truth Test Quality Metrics

> **Purpose:** Quantifiable quality gates for truth-layer testing infrastructure
> **Status:** ⚠️ Below target — 34 tests blocked (see [COVERAGE-SUMMARY.md](./COVERAGE-SUMMARY.md))
> **Last Updated:** March 28, 2026

---

## Current Coverage (Baseline)

| Metric         | Current | Target | Gap    | Status   |
| -------------- | ------- | ------ | ------ | -------- |
| **Lines**      | 43.65%  | 80%    | -36.35 | 🔴 Below |
| **Branches**   | 36.92%  | 75%    | -38.08 | 🔴 Below |
| **Functions**  | 51.56%  | 85%    | -33.44 | 🔴 Below |
| **Statements** | 43.64%  | 80%    | -36.36 | 🔴 Below |

**Test Execution:**

- ✅ **178/212 tests passing** (83.9%)
- 🔴 **34 tests blocked** (tenant isolation issues — see blockers below)
- ⏭️ **19 tests skipped** (conditional/optional)

**Coverage Report:** [`coverage/index.html`](./coverage/index.html)
**Last Run:** March 28, 2026 @ 14:56 UTC

### Test Files Location

All test files are in **`src/__test__/`**:

- ✅ `evaluate-condition.test.ts` — 17 unit tests for condition evaluator
- ✅ `auto-generated.test.ts` — 156 auto-generated tests from truth-config
- ✅ `integration.test.ts` — 5 DB integration tests (skipIf no DATABASE_URL)
- 🔴 `truth-engine.tenant-isolation.test.ts` — 8 failing (FK violations)
- 🔴 `truth-engine.sales-mutations.test.ts` — 14 skipped (tenant setup)
- 🔴 `truth-engine.invariants.test.ts` — 12 skipped (tenant setup)

**Vitest Config:** `include: ["src/**/__test__/**/*.{test,spec}.{ts,js}"]`

### Coverage vs. Metrics Comparison

**How V8 Coverage Relates to METRICS.md:**

| Coverage Type           | V8 Provider Measures                            | METRICS.md Defines                                                         |
| ----------------------- | ----------------------------------------------- | -------------------------------------------------------------------------- |
| **Standard Coverage**   | Lines, branches, functions, statements executed | Targets: 80%, 75%, 85%, 80% (respectively)                                 |
| **Truth-Grade Metrics** | N/A (requires custom analysis)                  | Invariant coverage, transition coverage, mutation coverage, event coverage |

**Key Differences:**

- **V8 Coverage** = Code execution metrics (what lines ran during tests)
- **Truth-Grade Metrics** = Business logic validation metrics (what invariants/transitions/mutations were tested)

**Example:**

- V8 might report `evaluateCondition()` has 95% line coverage
- Truth-grade reports 2/15 invariants tested (13% invariant coverage)

Both are needed for comprehensive quality:

1. **V8 Coverage** → Ensures test infrastructure code is tested
2. **Truth-Grade Metrics** → Ensures business rules are validated

### Blockers Preventing 80% Target

**Root Cause:** 34 tests blocked by tenant setup issues

**Failed Tests:**

- `truth-engine.tenant-isolation.test.ts` — 8 tests failing with FK violations
  - Error: `Key (tenant_id)=(9) is not present in table "tenants"`
  - Error: `duplicate key value violates unique constraint "uq_tenants_code"`
- `truth-engine.sales-mutations.test.ts` — 14 tests skipped (beforeAll failure)
- `truth-engine.invariants.test.ts` — 12 tests skipped (beforeAll failure)

**Impact:** ~16% of codebase remains untested (34 tests × ~0.5% coverage each)

**Solution Options:**

1. **Clean DB Setup** (15 min) — Add `TRUNCATE CASCADE` to vitest.setup.ts
2. **Dynamic Fixtures** (1-2 hours) — Refactor tests to create tenants dynamically
3. **Upsert Pattern** (30 min) — Use `INSERT ... ON CONFLICT DO NOTHING`

**Recommended:** Option 1 (quick win, unlocks +12% coverage)

### Module-Level Coverage Breakdown

**High Coverage (>90%):**

- ✅ `generate-state-machine-tests.ts` — **100%** lines (auto-generator tested by own output)
- ✅ `evaluate-condition.ts` — **95.65%** lines (17 unit tests)
- ✅ `generate-policy-tests.ts` — **93.87%** lines

**Moderate Coverage (50-80%):**

- ⚠️ `test-db.ts` — **52.56%** lines (CRUD operations partially tested)
- ⚠️ `generate-invariant-tests.ts` — **53.01%** lines (synthesis logic gaps)

**Zero Coverage (0%):**

- 🔴 `assert-event.ts` — **0%** (22 lines, not used in current tests)
- 🔴 `assert-invariant.ts` — **0%** (37 lines, not used in current tests)
- 🔴 `assert-projection.ts` — **0%** (12 lines, not used in current tests)
- 🔴 `assert-state.ts` — **0%** (19 lines, not used in current tests)
- 🔴 `seed-entity.ts` — **0%** (7 lines, not used in current tests)
- 🔴 `replay-events.ts` — **0%** (43 lines, not used in current tests)

**Path to 80% Coverage:**

1. Fix tenant tests (+12%) → **55.65%**
2. Add assert module tests (+8%) → **63.65%**
3. Add seed/replay tests (+2%) → **65.65%**
4. Improve execute-mutation coverage (+3%) → **68.65%**
5. Add projection/event tests (+12%) → **80.65%** ✅

---

## Coverage Targets

### Code Coverage (Standard)

| Metric                 | Target | Rationale                   |
| ---------------------- | ------ | --------------------------- |
| **Line Coverage**      | 80%+   | Core execution paths tested |
| **Branch Coverage**    | 75%+   | Decision points validated   |
| **Function Coverage**  | 85%+   | All public APIs exercised   |
| **Statement Coverage** | 80%+   | Logic paths verified        |

**Exclusions:**

- Test files (`src/__test__/**`)
- Type definitions only
- Deprecated code paths

---

## Truth-Grade Metrics

### 1. Invariant Testing Coverage

**Target:** 100% of invariants tested (positive + negative cases)

#### Requirements per Invariant:

- ✅ **Positive case:** Valid data passes invariant
- ✅ **Negative case:** Invalid data triggers `InvariantViolationError`
- ✅ **Boundary case:** Edge values tested (min, max, null)
- ✅ **Tenant override:** If `tenantOverridable: true`, test override behavior

#### Measurement:

```typescript
// Count invariants
const totalInvariants = SALES_INVARIANT_REGISTRIES.flatMap(r => r.invariants).length;

// Count tested invariants (grep test files for invariant IDs)
const testedInvariants = /* scan test files */;

const invariantCoverage = (testedInvariants / totalInvariants) * 100;
// Target: 100%
```

#### Current Inventory:

- **Total Invariants:** ~15-20 (from `SALES_INVARIANT_REGISTRIES`)
- **Tested:** TBD (run coverage)
- **Coverage:** TBD%

---

### 2. State Machine Transition Coverage

**Target:** 100% of transitions tested (valid + invalid)

#### Requirements per State Machine:

- ✅ **Valid transitions:** All `from → event → to` paths tested
- ✅ **Invalid transitions:** Reject transitions not in definition
- ✅ **Guard conditions:** All guards evaluated (pass + fail)
- ✅ **Terminal states:** All terminal states reachable
- ✅ **Initial state:** Verified on entity creation
- ✅ **Event emissions:** All `emits` verified

#### Measurement:

```typescript
// Count transitions
const totalTransitions = SALES_STATE_MACHINES.flatMap(sm => sm.transitions).length;

// Valid transition tests
const validTests = /* count test cases for valid transitions */;

// Invalid transition tests (boundary)
const invalidTests = /* count test cases rejecting invalid transitions */;

const transitionCoverage = ((validTests + invalidTests) / (totalTransitions * 2)) * 100;
// Target: 100% (valid + invalid)
```

#### Current Inventory:

- **Total Transitions:** ~8-12 (from `SALES_STATE_MACHINES`)
- **Tested (valid):** TBD
- **Tested (invalid):** TBD
- **Coverage:** TBD%

---

### 3. Mutation Operation Coverage

**Target:** 100% of CRUD operations tested per entity

#### Requirements per Entity:

| Operation  | Requirements                                                                 |
| ---------- | ---------------------------------------------------------------------------- |
| **Create** | ✅ Valid data, ✅ Invalid data (violates invariant), ✅ Duplicate unique key |
| **Update** | ✅ Valid change, ✅ Invalid change, ✅ Missing record, ✅ State transition   |
| **Delete** | ✅ Existing record, ✅ Missing record, ✅ Cascade behavior                   |
| **Read**   | ✅ By ID, ✅ By filter, ✅ Not found, ✅ Tenant isolation                    |

#### Measurement:

```typescript
const entitiesUnderTest = ["customer", "vendor", "salesOrder", "salesOrderLine"];
const operationsPerEntity = 4; // CRUD

const totalOperations = entitiesUnderTest.length * operationsPerEntity;
const testedOperations = /* count from test files */;

const mutationCoverage = (testedOperations / totalOperations) * 100;
// Target: 100%
```

#### Current Inventory:

- **Entities:** `customer`, `vendor`, `salesOrder`, `salesOrderLine` (4)
- **Operations per Entity:** 4 (CRUD)
- **Total Operations:** 16
- **Tested:** TBD
- **Coverage:** TBD%

---

### 4. Event Emission Coverage

**Target:** 100% of domain events verified

#### Requirements per Event:

- ✅ **Event structure:** `{ id, aggregateType, aggregateId, eventType, payload, metadata, version, timestamp }`
- ✅ **Event sequence:** Order of events for multi-step operations
- ✅ **Event isolation:** Seed events not in `harness.events`
- ✅ **Event replay:** Projections rebuild correctly from events

#### Measurement:

```typescript
// Count distinct eventTypes from mutations
const distinctEvents = new Set(/* extract from mutation definitions */);

// Count tested events
const testedEvents = /* grep for assertEvent, assertEventSequence */;

const eventCoverage = (testedEvents.size / distinctEvents.size) * 100;
// Target: 100%
```

#### Current Inventory:

- **Event Types:** `CustomerCreated`, `OrderCreated`, `OrderUpdated`, etc.
- **Total Unique Events:** TBD
- **Tested:** TBD
- **Coverage:** TBD%

---

### 5. Execution Path Coverage

**Target:** Both PATH 1 and PATH 2 tested with equivalence verification

#### PATH 1 — Full Truth Engine

```typescript
harness.execute(mutation)
  → context.mutationGateway({ model, operation, mutate, policies })
      → apps/api/mutation-command-gateway
          → policy enforcement
          → invariant checking
          → DB write
          → DomainEvent
```

**Requirements:**

- ✅ Policy enforcement tested
- ✅ Invariant checking tested
- ✅ Event produced by gateway
- ✅ `invariantsChecked` count in result

#### PATH 2 — Direct TestDB

```typescript
harness.execute(mutation)
  → enrichedInput = { ...input, tenantId, createdBy, updatedBy }
  → context.db.insert/update/delete (Drizzle)
  → DomainEvent built locally
```

**Requirements:**

- ✅ Direct DB operations tested
- ✅ Event produced locally
- ✅ Tenant enrichment verified
- ✅ Audit columns set

#### Dual-Path Equivalence

**Requirements:**

- ✅ Same input → same output (PATH 1 ≈ PATH 2)
- ✅ Event payloads equivalent
- ✅ DB state identical after execution

#### Measurement:

```typescript
const path1Tests = /* count tests using mutationGateway */;
const path2Tests = /* count tests using direct DB */;
const equivalenceTests = /* count tests comparing both paths */;

// Target: path1Tests > 0 && path2Tests > 0 && equivalenceTests > 0
```

#### Current Status:

- **PATH 1 Tests:** TBD (requires `mutationGateway` wire-up)
- **PATH 2 Tests:** 39 (all current DB tests)
- **Equivalence Tests:** 0 (future work)

---

### 6. Assertion API Coverage

**Target:** All public assertion functions used in tests

| Assertion                     | Purpose                        | Usage Count |
| ----------------------------- | ------------------------------ | ----------- |
| `assertInvariant()`           | Callback-based invariant check | TBD         |
| `assertEntityInvariant()`     | Single invariant evaluation    | TBD         |
| `assertAllEntityInvariants()` | All invariants for entity      | TBD         |
| `assertEvent()`               | Single event verification      | TBD         |
| `assertEventSequence()`       | Event order verification       | TBD         |
| `assertNoEvent()`             | Event absence check            | TBD         |
| `assertEventCount()`          | Event count validation         | TBD         |
| `assertState()`               | Generic state assertion        | TBD         |
| `assertExists()`              | Entity existence check         | TBD         |
| `assertNotExists()`           | Entity absence check           | TBD         |
| `assertRowCount()`            | DB row count check             | TBD         |
| `assertProjection()`          | Projection state verification  | TBD         |
| `assertProjectionReplay()`    | Replay correctness check       | TBD         |

**Measurement:** Grep test files for each assertion function usage.

---

### 7. Tenant Isolation Coverage

**Target:** 100% of multi-tenant scenarios tested

#### Requirements:

- ✅ **Tenant-scoped queries:** User A cannot see User B's data
- ✅ **Tenant-scoped mutations:** Mutations write to correct tenant
- ✅ **Cross-tenant protection:** Operations fail for wrong tenant
- ✅ **Tenant override scenarios:** Test tenant-specific invariant overrides

#### Measurement:

```typescript
const tenantTests = /* grep for tenantId checks in test assertions */;

// Target: tenantTests >= 10 (comprehensive multi-tenant coverage)
```

#### Current Status:

- **Tenant Isolation Tests:** 10 (in `truth-engine.tenant-isolation.test.ts`)
- **Cross-Tenant Tests:** TBD
- **Override Tests:** 0 (future work)

---

## Test Distribution Targets

### Test Categories

| Category                    | Target | Current | Gap         |
| --------------------------- | ------ | ------- | ----------- |
| **Unit Tests** (pure logic) | 150+   | 173     | ✅ Exceeded |
| **Integration Tests** (DB)  | 50+    | 39      | -11         |
| **Auto-Generated Tests**    | 150+   | 156     | ✅ Exceeded |
| **Total**                   | 350+   | 368     | ✅ Exceeded |

### Test Execution Time

| Category                 | Target  | Current | Status |
| ------------------------ | ------- | ------- | ------ |
| **Pure Logic Tests**     | < 100ms | 41ms    | ✅     |
| **DB Integration Tests** | < 500ms | TBD     | —      |
| **Auto-Generated Tests** | < 200ms | 32ms    | ✅     |
| **Full Suite**           | < 5s    | 3.39s   | ✅     |

---

## Quality Gates (CI/CD)

### Blocking Gates (Must Pass)

1. ✅ **All tests pass** — 0 failures
2. ✅ **Line coverage ≥ 80%** — no regression
3. ✅ **Branch coverage ≥ 75%** — decision paths tested
4. ✅ **No skipped tests** — all tests run (if `TEST_DATABASE_URL` set)
5. ✅ **TypeScript clean** — 0 type errors
6. ✅ **Build succeeds** — `pnpm build` exits 0

### Warning Gates (Non-Blocking)

1. ⚠️ **Function coverage < 85%** — recommend adding tests
2. ⚠️ **New untested invariants** — flag in PR review
3. ⚠️ **New untested state transitions** — flag in PR review
4. ⚠️ **Test execution time > 5s** — investigate slow tests

---

## Measurement Commands

### Run Tests with Coverage

```bash
# Pure logic only (no DB)
pnpm --filter @afenda/truth-test test --coverage

# Full suite (with DB)
$env:TEST_DATABASE_URL = "postgresql://..."
pnpm --filter @afenda/truth-test test --coverage
```

### Coverage Report Locations

- **HTML Report:** `packages/truth-test/coverage/index.html`
- **JSON Summary:** `packages/truth-test/coverage/coverage-summary.json`
- **Terminal Output:** Printed after test run

### Extract Metrics

```bash
# Invariant coverage
grep -r "assertEntityInvariant\|assertAllEntityInvariants" src/__test__/ | wc -l

# State machine coverage
grep -r "assertTransition\|execute.*transition" src/__test__/ | wc -l

# Event coverage
grep -r "assertEvent\|assertEventSequence" src/__test__/ | wc -l

# Tenant isolation coverage
grep -r "tenantId" src/__test__/ | wc -l
```

---

## Maintenance Schedule

### Weekly

- Run full test suite with coverage
- Review coverage report for regressions
- Update "Current" columns in this document

### Per PR

- Run tests on changed files
- Verify new code has ≥ 80% coverage
- Check invariants/transitions added have tests

### Per Release

- Run full suite with coverage
- Generate coverage badge for README
- Document any coverage exceptions

---

## Future Metrics (Phase 3+)

### Mutation Strategy Coverage

**Target:** Test all mutation policy strategies

- `direct` — direct DB write
- `dual-write` — DB + event stream
- `event-only` — event stream only (no DB)

### Projection Consistency Coverage

**Target:** Test realtime vs materialized projections

- Realtime projection updates
- Materialized projection rebuilds
- Projection staleness detection

### Performance Benchmarks

**Target:** Execution time regression prevention

- Harness creation time < 10ms
- Single mutation execution < 50ms
- Reset operation < 200ms
- 100 mutations < 2s

---

## Appendix: Calculation Formulas

### Invariant Coverage

```
Invariant Coverage = (Tested Invariants / Total Invariants) × 100%

Where:
- Tested Invariants = unique invariant IDs in test assertions
- Total Invariants = sum of all invariants in registries
```

### Transition Coverage

```
Transition Coverage = (Valid Tests + Invalid Tests) / (Total Transitions × 2) × 100%

Where:
- Valid Tests = test cases for allowed transitions
- Invalid Tests = test cases for rejected transitions
- Total Transitions = sum of all transitions in state machines
```

### Truth-Grade Score

```
Truth-Grade Score = (
  Invariant Coverage × 0.3 +
  Transition Coverage × 0.3 +
  Mutation Coverage × 0.2 +
  Event Coverage × 0.1 +
  Path Coverage × 0.1
) / 5

Target: ≥ 90% (A-grade truth quality)
```

---

## Status Summary

| Metric              | Target | Current | Status                 |
| ------------------- | ------ | ------- | ---------------------- |
| Line Coverage       | 80%    | 31.47%  | 🔴 Below (no DB tests) |
| Branch Coverage     | 75%    | 24.52%  | 🔴 Below (no DB tests) |
| Function Coverage   | 85%    | 39.84%  | 🔴 Below (no DB tests) |
| Statement Coverage  | 80%    | 31.75%  | 🔴 Below (no DB tests) |
| Invariant Coverage  | 100%   | TBD     | 🔄 Pending DB tests    |
| Transition Coverage | 100%   | TBD     | 🔄 Pending DB tests    |
| Mutation Coverage   | 100%   | TBD     | 🔄 Pending DB tests    |
| Event Coverage      | 100%   | TBD     | 🔄 Pending DB tests    |
| Truth-Grade Score   | 90%+   | TBD     | 🔄 Pending DB tests    |

### Coverage Analysis (Pure Logic Tests Only)

**High Coverage Modules:**

- `src/auto/evaluate-condition.ts` — 96% (excellent, fully tested)
- `src/auto/generate-policy-tests.ts` — 93.87% (excellent)
- `src/auto/generate-state-machine-tests.ts` — 100% (perfect)
- `src/harness/test-context.ts` — 100% (perfect)

**Zero Coverage Modules (Require DB Integration Tests):**

- `src/assert/*` — 0% (all modules untested without DB)
- `src/execute/*` — 0% (all modules untested without DB)
- `src/seed/seed-entity.ts` — 0% (untested without DB)
- `src/harness/test-db.ts` — 1.25% (minimal usage)
- `src/harness/table-names.ts` — 0% (untested)

**Next Action:** Run with `TEST_DATABASE_URL` to exercise integration modules and get accurate truth-grade metrics.
