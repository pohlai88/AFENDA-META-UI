# Auto-Generated Test Quick Start

## Summary

Expanded test auto-generation via 4 strategies. Phase 4 uses dynamic Zod schema
discovery across `@afenda/meta-types` and `@afenda/db`, generating 1,555 tests
from 364 schemas in under 400 ms.

## Files Created

### Test Generators

1. **`generate-snapshot-tests.ts`** - API response contract snapshots
2. **`generate-property-tests.ts`** - Property-based tests with fast-check
3. **`generate-zod-tests.ts`** - Zod schema validation tests (Zod 4 introspection engine)

### Registry

1. **`schema-registry.ts`** - Dynamic schema discovery via namespace imports
2. **`property-registry.ts`** - Dynamic function discovery for property-based generation

### Documentation

1. **`TEST-GENERATION-STRATEGY.md`** - Full strategy and decision matrix
2. **`IMPLEMENTATION-GUIDE.md`** - Step-by-step implementation instructions

## Quick Start

### Phase 1: Remove Legacy Tests ✅

```
Removed 4 legacy schema contract files (-842 lines, -55 tests)
```

### Phase 2: API Snapshots ✅

```powershell
pnpm --filter @afenda/truth-test test api-snapshot.auto.test.ts
# Result: 30 routes discovered, skipped (pending API app setup)
```

### Phase 3: Property-Based Tests ✅

```powershell
pnpm --filter @afenda/truth-test test property-based.auto.test.ts
# Result: 24 registry-driven properties × 100 cases = 2,400 test cases
# Dynamic inputs: auto-discovered function registry + custom property definitions
# Environment controls: FASTCHECK_SEED, FASTCHECK_RUNS, FASTCHECK_VERBOSE
```

### Phase 4: Zod Validation ✅

```powershell
pnpm --filter @afenda/truth-test test zod-validation.auto.test.ts
# Result: 364 schemas → 1,555 tests, 100% pass rate
# Sources: @afenda/meta-types (37), @afenda/db tables + enums + UUIDs (327)
```

## Actual Metrics

| Phase           | Tests            | Notes                                       |
| --------------- | ---------------- | ------------------------------------------- |
| Phase 1         | −55              | Legacy schema contracts removed             |
| Phase 2         | +1 (skipped)     | 30 API routes, needs API app setup          |
| Phase 3         | +24              | Property-based registry generation (2,400 cases) |
| Phase 4         | +1,555           | 364 Zod schemas, dynamic discovery          |
| **Suite total** | **1,752 passed** | **40 skipped, 0 failures**                  |

## Key Principles

### Auto-Generable Tests (Structure)

✅ State machine transitions
✅ API response contracts
✅ Mathematical properties
✅ Zod schema validation
✅ CRUD operation patterns

### Manual Tests (Behavior)

❌ Business logic (domain expertise)
❌ Security rules (threat model)
❌ UI interactions (UX specifications)
❌ Edge cases (experience-based)
❌ Workflow orchestration (multi-step)

## Validation

```powershell
# Run all auto-generated tests
pnpm test --grep "Auto-Generated"

# Check coverage
pnpm --filter @afenda/truth-test test:coverage

# Count test distribution
Get-ChildItem -Recurse -Filter "*.test.ts" |
  Select-String "describe|test" |
  Group-Object Filename |
  Sort-Object Count -Descending
```

## Success Criteria

- [x] 50%+ tests auto-generated
- [ ] 80%+ V8 coverage across packages
- [ ] <5% maintenance burden per release
- [ ] <10 minutes CI test execution time

## Next Steps

1. Execute Phase 1 cleanup script
2. Follow IMPLEMENTATION-GUIDE.md for Phases 2-4
3. Monitor coverage and CI time metrics
4. Iterate on test generators based on findings

## References

- **Strategy**: `TEST-GENERATION-STRATEGY.md` - Full decision matrix
- **Implementation**: `IMPLEMENTATION-GUIDE.md` - Detailed steps
- **Generators**: `packages/truth-test/src/auto/generate-*.ts` - Generator code
- **Evidence**: Martin Fowler (Test Pyramid), Vitest (snapshots), Mark Seemann (property-based)
