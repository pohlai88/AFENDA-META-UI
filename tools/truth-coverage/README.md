# Truth Coverage Tool

Tracks and enforces truth-test coverage across the AFENDA-META-UI codebase.

## Purpose

Ensure that:
1. Invariants defined in truth-config have corresponding tests
2. State machines are exercised with transition tests
3. Mutations go through the truth harness (not direct DB writes)

## Usage

### Report Coverage

```bash
pnpm truth-coverage
```

Outputs:
```
Truth Coverage Report
================================================================================

Invariant Coverage: 30/50 (60.0%)
State Machine Coverage: 3/5 (60.0%)

Truth Test Files: 6
Total Truth Tests: 45

Direct DB Writes (violations): 87

⚠️  Files with direct DB writes outside truth harness:
   apps/api/src/modules/sales/services/commission-service.ts
   apps/api/src/modules/sales/services/sales-order-service.ts
   ...
```

### Enforce Thresholds (CI Gate)

```bash
pnpm truth-coverage --enforce
```

Fails with exit code 1 if:
- Invariant coverage < 50%
- State machine coverage < 40%
- Direct DB writes > 100

## Metrics Tracked

| Metric | Description | Threshold |
|---|---|---|
| **Invariant Coverage** | % of invariants with at least one test | 50% |
| **State Machine Coverage** | % of state machines with transition tests | 40% |
| **Direct DB Writes** | Count of files with direct `db.insert/update/delete` | ≤ 100 |

## CI Integration

Add to `.github/workflows/ci.yml`:

```yaml
- name: Check Truth Coverage
  run: pnpm truth-coverage --enforce
```

## How It Works

1. **Counts Invariants:** Parses `@afenda/db/truth-compiler` exports to count total invariants
2. **Counts Tests:** Scans `packages/truth-test/src/__test__/*.test.ts` for test cases
3. **Detects Violations:** Greps `apps/api/src` for `db.insert/update/delete` outside truth harness
4. **Enforcement:** Throws error if thresholds not met

## Migration Strategy

As direct DB writes are converted to truth harness usage:
- `maxDirectDbWrites` threshold decreases over time
- Target: 0 direct DB writes (all mutations via truth engine)

## Files

- `index.ts` — Core metrics calculation
- `cli.ts` — CLI entrypoint
- `package.json` — Standalone tool package
- `README.md` — This file
