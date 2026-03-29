# Truth-Test Coverage Summary

> **Date:** March 28, 2026
> **User:** @pohlai88
> **Session:** Neon Migration + Coverage Baseline

---

## ✅ Completed

### 1. Schema Validation & Neon Migration

- ✅ Validated local Drizzle migrations (latest: `20260327123000_snake_case_shared_columns`)
- ✅ Compared schemas between local and Neon (minimal non-breaking differences)
- ✅ Confirmed Neon project `AFENDA-METADATA` (calm-lab-59199054) is production-ready
- ✅ Created clean test branch `truth-test-clean` (br-muddy-cake-a14ufixe)
- ✅ Set `TEST_DATABASE_URL` pointing to clean Neon branch

**Neon Connection:**

```
postgresql://neondb_owner:***@ep-misty-salad-a1oruxef-pooler.ap-southeast-1.aws.neon.tech/neondb
Branch: br-muddy-cake-a14ufixe (truth-test-clean)
```

### 2. Coverage Baseline Measurement

**Test Results:**

- ✅ 178/212 tests passing (83.9%)
- 🔴 34 tests blocked by tenant isolation issues
- ⏳ 19 tests skipped (sales mutations, invariants — no production tenant setup)

**Coverage Achieved:**

| Metric             | Target | Current | Status | Gap     |
| ------------------ | ------ | ------- | ------ | ------- |
| Line Coverage      | 80%    | 43.65%  | 🔴     | -36.35% |
| Branch Coverage    | 75%    | 36.92%  | 🔴     | -38.08% |
| Function Coverage  | 85%    | 51.56%  | 🔴     | -33.44% |
| Statement Coverage | 80%    | 43.64%  | 🔴     | -36.36% |

---

## 📊 Module-Level Coverage Analysis

### ✅ High Coverage (>80%)

| Module                            | Lines  | Branches | Functions | Status       |
| --------------------------------- | ------ | -------- | --------- | ------------ |
| `evaluate-condition.ts`           | 95.65% | 87.8%    | 100%      | ✅ Excellent |
| `generate-state-machine-tests.ts` | 100%   | 100%     | 100%      | ✅ Complete  |
| `generate-policy-tests.ts`        | 93.87% | 88.88%   | 92.3%     | ✅ Excellent |
| `test-context.ts`                 | 100%   | 100%     | 100%      | ✅ Complete  |

### ⚠️ Moderate Coverage (40-80%)

| Module                        | Lines  | Branches | Functions | Priority |
| ----------------------------- | ------ | -------- | --------- | -------- |
| `execute-query.ts`            | 80%    | 50%      | 100%      | Medium   |
| `create-harness.ts`           | 72.72% | 57.14%   | 57.14%    | Medium   |
| `generate-invariant-tests.ts` | 53.01% | 29.03%   | 91.66%    | High     |
| `test-db.ts`                  | 52.56% | 47.36%   | 60%       | High     |

### 🔴 Zero Coverage (0%)

| Module                 | Lines | Reason                 |
| ---------------------- | ----- | ---------------------- |
| `assert-event.ts`      | 22    | No event tests yet     |
| `assert-invariant.ts`  | 37    | No invariant tests yet |
| `assert-projection.ts` | 12    | No projection tests    |
| `assert-state.ts`      | 19    | No state tests         |
| `seed-entity.ts`       | 7     | Not used yet           |
| `replay-events.ts`     | 43    | Event sourcing WIP     |
| `index.ts` (barrels)   | 0     | Type-only exports      |

### 🟡 Low Coverage (<40%)

| Module                | Lines | Issue                       |
| --------------------- | ----- | --------------------------- |
| `execute-mutation.ts` | 25%   | PATH 1 missing, error paths |
| `table-names.ts`      | 25%   | Entity alias edge cases     |
| `seed-scenario.ts`    | 9.43% | Scenario DSL not tested     |

---

## 🚧 Blockers Identified

### Issue 1: Tenant Isolation Test Failures (34 tests)

**Files Affected:**

- `src/__test__/truth-engine.tenant-isolation.test.ts` (8 failures)
- `src/__test__/truth-engine.sales-mutations.test.ts` (14 skipped)
- `src/__test__/truth-engine.invariants.test.ts` (12 skipped)

**Root Cause:**
Tests attempt to create tenants with hardcoded IDs (e.g., `tenantId: 9`, `tenantId: 11`) which violate foreign key constraints because these tenant IDs don't exist in the database. The `beforeAll` setup tries to insert a tenant with code `"AFENDA_DEMO"` which already exists in production branch data, causing duplicate key violations.

**Error Examples:**

```
error: insert or update on table "partners" violates foreign key constraint "fk_sales_partners_tenant"
Key (tenant_id)=(9) is not present in table "tenants".

error: duplicate key value violates unique constraint "uq_tenants_code"
Key (lower("tenantCode"))=(afenda_demo) already exists.

error: null value in column "tenant_id" of relation "partners" violates not-null constraint
```

**Impact:**

- Blocks 16% of test suite (34/212 tests)
- Prevents testing of:
  - Tenant data isolation
  - Mutation tenant enrichment
  - Cross-tenant data leakage prevention
  - Sales order invariants
  - State machine transitions

**Solution Options:**

1. **Recommended: Clean Test Database Setup**
   - Use `truth-test-clean` branch (already created)
   - Run `TRUNCATE TABLE core.tenants CASCADE;` before tests
   - Let tests create their own tenant data dynamically
   - Configure in `vitest.setup.ts`:
     ```typescript
     beforeAll(async () => {
       const db = createTestDB();
       // Clean slate for integration tests
       await db.execute(sql`TRUNCATE TABLE core.tenants CASCADE;`);
     });
     ```

2. **Alternative: Dynamic Tenant Fixtures**
   - Remove hardcoded tenant IDs from tests
   - Create fixtures that insert test tenants and return their IDs
   - Update tests to use fixture-generated IDs

3. **Alternative: Upsert Pattern**
   - Change tenant setup from `INSERT` to `INSERT ... ON CONFLICT DO NOTHING`
   - Query for existing tenant after upsert to get ID
   - Use retrieved ID for all test operations

**Effort Estimate:**

- Option 1 (Clean DB): 15 minutes — add setup script
- Option 2 (Fixtures): 1-2 hours — refactor test setup
- Option 3 (Upsert): 30 minutes — update beforeAll hooks

---

## 📈 Path to 80% Coverage

### Quick Wins (+12% coverage, 1-2 hours)

1. **Fix Tenant Test Suite** (+12%)
   - Implement Option 1 (clean DB setup)
   - Unblocks 34 tests with DB operations
   - Tests `execute-mutation.ts`, `test-db.ts`, `seed-entity.ts`

### Medium Priority (+10% coverage, 3-4 hours)

2. **Add Assert Module Tests** (+8%)
   - `assert-invariant.ts` — 5 test cases (positive, negative, aggregate, error messaging)
   - `assert-event.ts` — 4 test cases (single, sequence, count, no event)
   - `assert-state.ts` — 3 test cases (exists, not exists, row count)
   - **Files to create:** `src/__test__/assert-api.test.ts`

3. **Add Seed/Replay Tests** (+2%)
   - `seed-entity.ts` — 3 test cases (single, batch, via engine)
   - `replay-events.ts` — 2 test cases (basic replay, projection rebuild)
   - **Files to create:** `src/__test__/event-sourcing.test.ts`

### Long-term Improvements (+8% coverage, 4-6 hours)

4. **Increase execute-mutation.ts Coverage** (+3%)
   - Test error paths (invalid entity, missing fields)
   - Test PATH 1 execution (requires `mutationGateway` wire-up)
   - Test dual-path equivalence (PATH 1 vs PATH 2)

5. **Increase generate-invariant-tests.ts Coverage** (+3%)
   - Test edge cases (empty registries, no invariants)
   - Test boundary conditions (min/max values)
   - Test tenant overrides

6. **Table Names Edge Cases** (+2%)
   - Test entity alias resolution failures
   - Test unknown entity handling
   - Test schema key mapping

**Total Estimated Coverage:** 43.65% + 30% = **73.65%**
_(Close to 80% target, remaining gap requires architecture improvements)_

---

## 🎯 Next Immediate Actions

### For This Session (User Decision Required)

**Option A: Fix Tests Now** (15-30 min)

1. Add clean database setup to `vitest.setup.ts`
2. Re-run full test suite: `pnpm test --coverage --run`
3. Achieve ~56% coverage (43.65% + 12%)
4. Update METRICS.md with results

**Option B: Document and Defer**

1. ✅ Document findings (this file)
2. ✅ Update METRICS.md with baseline numbers
3. ✅ Update NEXT-STEPS.md with action plan
4. Create GitHub issue tracking tenant test fixes
5. Move to next work item

### For Next Work Session

1. **Tenant Test Fix** — Implement clean database setup
2. **Assert Module Tests** — Create `assert-api.test.ts`
3. **Coverage CI Gate** — Add GitHub Actions workflow
   ```yaml
   - name: Check Coverage Thresholds
     run: pnpm --filter @afenda/truth-test test --coverage --run
   ```

---

## 📝 Files Modified This Session

1. ✅ `packages/truth-test/METRICS.md` — Created comprehensive quality metrics
2. ✅ `packages/truth-test/vitest.config.ts` — Added coverage thresholds
3. ✅ `packages/truth-test/NEXT-STEPS.md` — Created step-by-step guide
4. ✅ `packages/truth-test/ARCHITECTURE.md` — Updated header with metrics reference
5. ✅ `packages/truth-test/COVERAGE-SUMMARY.md` — This document

---

## 🔗 Related Resources

- [METRICS.md](./METRICS.md) — Truth-grade quality metrics specification
- [NEXT-STEPS.md](./NEXT-STEPS.md) — Step-by-step completion guide
- [ARCHITECTURE.md](./ARCHITECTURE.md) — Package architecture documentation
- [Coverage Report](./coverage/index.html) — Interactive HTML coverage report (run locally)
- [Neon Console](https://console.neon.tech/app/projects/calm-lab-59199054/branches/br-muddy-cake-a14ufixe) — Database branch management

---

**End of Summary — Awaiting User Decision on Next Action** 🎯
