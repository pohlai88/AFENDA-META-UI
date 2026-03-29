# Truth Test — Next Steps Guide

> **Current Status:** Metrics infrastructure established, baseline coverage measured
> **Date:** March 28, 2026

---

## ✅ Completed

1. **METRICS.md created** — comprehensive truth-grade quality metrics defined
2. **Coverage config updated** — vitest.config.ts with coverage thresholds
3. **Baseline measured** — pure logic tests coverage: 31.47% (39 DB tests skipped)

---

## 🎯 Immediate Next Steps

### Step 1: Set Up Test Database (5 min)

**Option A: Local PostgreSQL**

```powershell
# Create local test database
createdb truth_test

# Set environment variable
$env:TEST_DATABASE_URL = "postgresql://localhost:5432/truth_test"
```

**Option B: Neon Branch** (Recommended)

```powershell
# Use existing Neon branch script
node tools/scripts/neon-branch-create.mjs

# Copy the generated DATABASE_URL
$env:TEST_DATABASE_URL = "postgresql://..."
```

**Option C: Use Existing DB**

```powershell
# Point to existing test/dev database (CAREFUL: tables will be truncated)
$env:TEST_DATABASE_URL = $env:DATABASE_URL
```

---

### Step 2: Run Full Test Suite with Coverage (2 min)

```powershell
cd D:\AFENDA-META-UI\packages\truth-test

# Run all tests with coverage
pnpm test --coverage --run
```

**Expected Results:**

- All 212 tests run (173 pure + 39 DB integration)
- Coverage jumps to ~60-70% (DB modules now exercised)
- Truth-grade metrics measurable

---

### Step 3: Analyze Coverage Report (5 min)

```powershell
# Open HTML coverage report
start coverage/index.html
```

**Look for:**

- ✅ Green files (>80% coverage)
- ⚠️ Yellow files (50-80% coverage) — add tests
- 🔴 Red files (<50% coverage) — priority for testing

**Key Modules to Check:**

- `src/assert/assert-invariant.ts` — Should be >80% after DB tests
- `src/execute/execute-mutation.ts` — Should be >70%
- `src/harness/test-db.ts` — Should be >60%
- `src/seed/seed-entity.ts` — Should be >70%

---

### Step 4: Measure Truth-Grade Metrics (10 min)

**Invariant Coverage:**

```powershell
# Count total invariants
node -e "const {SALES_INVARIANT_REGISTRIES} = require('./node_modules/@afenda/db/truth-compiler'); console.log('Total invariants:', SALES_INVARIANT_REGISTRIES.flatMap(r => r.invariants).length)"

# Count tested invariants
grep -r "assertEntityInvariant\|assertAllEntityInvariants" src/__test__/ | wc -l
```

**Transition Coverage:**

```powershell
# Count total transitions
node -e "const {SALES_STATE_MACHINES} = require('./node_modules/@afenda/db/truth-compiler'); console.log('Total transitions:', SALES_STATE_MACHINES.flatMap(sm => sm.transitions).length)"

# Count tested transitions
grep -r "transition\|status.*change" src/__test__/truth-engine.sales-mutations.test.ts | wc -l
```

**Event Coverage:**

```powershell
# Count event assertions
grep -r "assertEvent" src/__test__/ | wc -l
```

**Update METRICS.md with actual numbers.**

---

### Step 5: Identify Coverage Gaps (5 min)

Review `coverage/index.html` and create a priority list:

**High Priority (Core Functionality):**

- [ ] `execute-mutation.ts` — dual-path execution
- [ ] `test-db.ts` — CRUD operations
- [ ] `assert-invariant.ts` — invariant assertions

**Medium Priority (Support Functions):**

- [ ] `seed-entity.ts` — test data seeding
- [ ] `table-names.ts` — entity name resolution
- [ ] `assert-state.ts` — state assertions

**Low Priority (Already High Coverage):**

- [ ] `evaluate-condition.ts` — 96% ✅
- [ ] `generate-state-machine-tests.ts` — 100% ✅
- [ ] `generate-policy-tests.ts` — 93.87% ✅

---

### Step 6: Write Missing Tests (Ongoing)

**Template for New Test File:**

```typescript
/**
 * [Module Name] - Tests
 * Purpose: [What this module does]
 * Coverage Target: 80%+
 */

import { describe, it, expect, beforeEach } from "vitest";
import {} from /* imports */ "../[module].js";

const skipTests = !process.env.DATABASE_URL;

describe.skipIf(skipTests)("[Module Name]", () => {
  // Test cases here
});
```

**Priority Test Cases:**

1. **execute-mutation.ts:**
   - PATH 1 execution (with mutationGateway)
   - PATH 2 execution (direct DB)
   - Error handling (invalid entity, missing fields)
   - Event emission verification

2. **test-db.ts:**
   - CRUD operations (insert, findOne, find, update, delete)
   - Entity name resolution (aliases)
   - Tenant isolation
   - Reset operation

3. **assert-invariant.ts:**
   - Positive cases (invariants pass)
   - Negative cases (invariants fail)
   - Aggregate invariant checks
   - Error message formatting

---

## 📊 Success Criteria

### Phase 1: Baseline Established ✅

- [x] METRICS.md created
- [x] Coverage config added
- [x] Baseline measured

### Phase 2: Full Coverage Measured (Next)

- [ ] Test database set up
- [ ] All 212 tests run
- [ ] Coverage >60% overall
- [ ] Truth-grade metrics calculated

### Phase 3: Target Coverage Achieved (Goal)

- [ ] Line coverage ≥80%
- [ ] Branch coverage ≥75%
- [ ] Function coverage ≥85%
- [ ] Invariant coverage 100%
- [ ] Transition coverage 100%
- [ ] Truth-grade score ≥90%

---

## 🔧 Troubleshooting

### Issue: Tests Fail with "DATABASE_URL not set"

**Solution:**

```powershell
$env:TEST_DATABASE_URL = "postgresql://..."
pnpm test
```

### Issue: Coverage Still Low After DB Tests

**Possible Causes:**

- DB tests are skipping (check `skipTests` variable)
- DB connection failing (check `TEST_DATABASE_URL`)
- Tests not exercising all code paths

**Debug:**

```powershell
# Check which tests are running
pnpm test --reporter=verbose

# Check DB connection
node -e "console.log(process.env.TEST_DATABASE_URL)"
```

### Issue: Coverage Thresholds Failing in CI

**Short-term Fix:**
Lower thresholds temporarily in `vitest.config.ts`:

```typescript
thresholds: {
  lines: 60,    // Reduced from 80
  functions: 60, // Reduced from 85
  branches: 50,  // Reduced from 75
  statements: 60, // Reduced from 80
}
```

**Long-term Fix:**
Add missing tests to reach 80%+ coverage.

---

## 📝 Metrics Update Checklist

After running full test suite with DB:

1. Update METRICS.md "Status Summary" table
2. Update "Current" column with actual percentages
3. Change status icons (🔴 → 🟡 → 🟢)
4. Add "Coverage Analysis" section with module-level details
5. Update "Next Action" with specific test priorities
6. Commit changes with message: `chore(truth-test): update coverage baseline metrics`

---

## 🚀 Quick Commands Reference

```powershell
# Set up test database (one-time)
$env:TEST_DATABASE_URL = "postgresql://..."

# Run tests with coverage
pnpm --filter @afenda/truth-test test --coverage

# Run specific test file
pnpm --filter @afenda/truth-test test src/__test__/integration.test.ts

# Run tests in watch mode (for development)
pnpm --filter @afenda/truth-test test --watch

# Generate coverage report only (no test run)
pnpm --filter @afenda/truth-test vitest --coverage --run

# Open coverage report
start packages/truth-test/coverage/index.html
```

---

## 📚 Related Documents

- [ARCHITECTURE.md](./ARCHITECTURE.md) — Full package architecture
- [METRICS.md](./METRICS.md) — Quality metrics and targets
- [README.md](./README.md) — Quick start guide
- [INTEGRATION.md](./INTEGRATION.md) — PATH 1 (full truth engine) setup

---

**Current Focus:** Set up test database and run full suite with coverage (Steps 1-3)

**Time Estimate:** 15-20 minutes to complete Steps 1-4
