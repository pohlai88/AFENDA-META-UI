# Auto-Generated Test Implementation Guide

## Overview

This guide walks through implementing the 4-phase test auto-generation strategy to expand coverage from 0.8% to 58%.

## Phase 1: Remove Legacy Schema Contract Tests (15 min)

### Why Remove?

TypeScript already validates column existence at compile time. These tests are redundant:

```typescript
// Redundant test (TypeScript already checks this)
test("workflow_instance has state column", () => {
  expect(workflowInstanceSchema.state).toBeDefined();
});
```

### Files to Remove

- [ ] `packages/db/src/__test__/domain-schema-contracts.test.ts`
- [ ] `packages/db/src/__test__/platform-schema-contracts.test.ts`
- [ ] `packages/db/src/__test__/phase4-schema-contracts.test.ts`
- [ ] `packages/db/src/__test__/meta-schema-contracts.test.ts`

### Command

```powershell
# Remove schema contract tests
Remove-Item packages/db/src/__test__/*-schema-contracts.test.ts -Verbose

# Run tests to verify
pnpm --filter @afenda/db test
```

### Expected Impact

- **Lines removed**: ~963
- **Tests removed**: ~211
- **Coverage impact**: None (redundant with TypeScript)
- **CI time saved**: ~5 seconds

---

## Phase 2: API Snapshot Tests (2 hours)

### Goal

Auto-generate snapshot tests for all API endpoints to catch breaking changes in response contracts.

### Dependencies

```json
{
  "devDependencies": {
    "fast-check": "^3.15.0",
    "supertest": "^6.3.3",
    "@types/supertest": "^6.0.2"
  }
}
```

### Implementation Steps

1. **Install dependencies**

```powershell
pnpm --filter @afenda/truth-test add -D fast-check supertest @types/supertest
```

2. **Create route discovery script**
   Create `packages/truth-test/src/auto/discover-routes.ts`:

```typescript
import { Express } from "express";

export interface DiscoveredRoute {
  method: string;
  path: string;
  authenticated: boolean;
}

export function discoverRoutes(app: Express): DiscoveredRoute[] {
  const routes: DiscoveredRoute[] = [];

  // Parse Express router stack
  app._router.stack.forEach((middleware: any) => {
    if (middleware.route) {
      const methods = Object.keys(middleware.route.methods);
      methods.forEach((method) => {
        routes.push({
          method: method.toUpperCase(),
          path: middleware.route.path,
          authenticated: requiresAuth(middleware),
        });
      });
    }
  });

  return routes;
}
```

3. **Create snapshot test file**
   Create `packages/truth-test/src/auto/api-snapshot.auto.test.ts`:

```typescript
import { describe, test, beforeAll } from "vitest";
import { app } from "@afenda/api";
import { generateApiSnapshotTests } from "./generate-snapshot-tests";
import { discoverRoutes } from "./discover-routes";

const routes = discoverRoutes(app);

generateApiSnapshotTests(routes, () => app);
```

4. **Configure snapshot serializers**
   Add to `packages/truth-test/vitest.config.ts`:

```typescript
export default defineConfig({
  test: {
    snapshotSerializers: ["./src/auto/snapshot-serializer.ts"],
  },
});
```

5. **Run and capture snapshots**

```powershell
# Generate initial snapshots
pnpm --filter @afenda/truth-test test api-snapshot.auto.test.ts

# Review snapshots
git diff packages/truth-test/src/auto/__snapshots__/
```

### Expected Impact

- **Tests generated**: ~30
- **Coverage increase**: +2.4%
- **Maintenance**: Auto-updates when routes change

---

## Phase 3: Property-Based Tests (4 hours)

### Goal

Auto-generate property tests for pure functions (calculations, transformations).

### Target Functions

Identify pure functions in:

- `packages/meta-types/src/calculations/` - Tax, pricing, totals
- `packages/truth-test/src/transformers/` - Data transformations
- `apps/api/src/utils/` - Utility functions

### Implementation Steps

1. **Create function registry**
   Create `packages/truth-test/src/auto/pure-functions.ts`:

```typescript
import fc from "fast-check";
import { PureFunctionDef, domainArbitraries } from "./generate-property-tests";
import { calculateTax, calculateTotal } from "@afenda/meta-types/calculations";

export const pureFunctions: PureFunctionDef[] = [
  {
    name: "calculateTax",
    fn: calculateTax,
    domain: [domainArbitraries.positiveAmount, domainArbitraries.taxRate],
    properties: ["bounded", "monotonic"],
  },
  {
    name: "calculateTotal",
    fn: calculateTotal,
    domain: [fc.array(domainArbitraries.positiveAmount)],
    properties: ["bounded", "monotonic"],
  },
  // Add more functions...
];
```

2. **Create property test file**
   Create `packages/truth-test/src/auto/property-based.auto.test.ts`:

```typescript
import { generatePropertyBasedTests } from "./generate-property-tests";
import { pureFunctions } from "./pure-functions";

generatePropertyBasedTests(pureFunctions);
```

3. **Run property tests**

```powershell
pnpm --filter @afenda/truth-test test property-based.auto.test.ts
```

### Expected Impact

- **Tests generated**: ~80
- **Coverage increase**: +6.5%
- **Bugs caught**: Logic errors in edge cases

---

## Phase 4: Zod Validation Tests (6 hours)

### Goal

Auto-generate validation tests from Zod schemas to ensure input validation is comprehensive.

### Implementation Steps

1. **Create schema registry**
   Create `packages/truth-test/src/auto/schema-registry.ts`:

```typescript
import { SchemaRegistry } from "./generate-zod-tests";
import { OrderSchema, PartnerSchema, WorkflowSchema } from "@afenda/meta-types";

export const schemaRegistry: SchemaRegistry = {
  Order: OrderSchema,
  Partner: PartnerSchema,
  Workflow: WorkflowSchema,
  // Add all Zod schemas from meta-types
};
```

2. **Improve schema introspection**
   Enhance `generate-zod-tests.ts` to extract actual constraints:

```typescript
function extractSchemaTestCases(schemaName: string, schema: ZodSchema) {
  const schemaDef = schema._def;

  // Handle z.object()
  if (schemaDef.typeName === "ZodObject") {
    return generateObjectTestCases(schemaName, schemaDef.shape());
  }

  // Handle z.string()
  if (schemaDef.typeName === "ZodString") {
    return generateStringTestCases(schemaName, schemaDef);
  }

  // Handle z.number()
  if (schemaDef.typeName === "ZodNumber") {
    return generateNumberTestCases(schemaName, schemaDef);
  }

  // ... more types
}
```

3. **Create validation test file**
   Create `packages/truth-test/src/auto/zod-validation.auto.test.ts`:

```typescript
import { generateZodValidationTests } from "./generate-zod-tests";
import { schemaRegistry } from "./schema-registry";

generateZodValidationTests(schemaRegistry);
```

4. **Run validation tests**

```powershell
pnpm --filter @afenda/truth-test test zod-validation.auto.test.ts
```

### Expected Impact

- **Tests generated**: ~450 (150 schemas × 3 test cases each)
- **Coverage increase**: +36.5%
- **Validation bugs caught**: Missing constraints, incorrect types

---

## Success Metrics

### Coverage Goals

| Phase                | Tests Added  | Coverage % | Cumulative %           |
| -------------------- | ------------ | ---------- | ---------------------- |
| Phase 1 (Remove)     | -211         | -17.1%     | 0.8% → baseline        |
| Phase 2 (Snapshots)  | +30          | +2.4%      | 2.4%                   |
| Phase 3 (Properties) | +80          | +6.5%      | 8.9%                   |
| Phase 4 (Zod)        | +450         | +36.5%     | 45.4%                  |
| **Total**            | **+349 net** | **+28.3%** | **58% auto-generated** |

### Quality Gates

- [ ] Test count: 1,232 total (716 auto-generated, 516 manual)
- [ ] V8 coverage: ≥80% across packages
- [ ] CI time: <10 minutes for full test suite
- [ ] Maintenance: <5% of tests need updates per release

### Validation Commands

```powershell
# Run all tests
pnpm test

# Check coverage
pnpm --filter @afenda/truth-test test:coverage

# Verify auto-generated tests
pnpm --filter @afenda/truth-test test --grep "Auto-Generated"

# Count tests by type
Get-ChildItem -Recurse -Filter "*.test.ts" | Select-String "describe|test" | Group-Object Filename
```

---

## Rollback Plan

If auto-generation causes issues:

1. **Disable specific generator**

```typescript
// In vitest.config.ts
export default defineConfig({
  test: {
    exclude: [
      "**/api-snapshot.auto.test.ts", // Disable snapshots
    ],
  },
});
```

2. **Remove snapshots**

```powershell
Remove-Item -Recurse packages/truth-test/src/auto/__snapshots__/
```

3. **Revert dependency additions**

```powershell
pnpm --filter @afenda/truth-test remove fast-check supertest
```

---

## Maintenance Guide

### When to Update Auto-Generated Tests

1. **API snapshots**: Update when response contract changes intentionally

```powershell
pnpm --filter @afenda/truth-test test -u api-snapshot.auto.test.ts
```

2. **Property tests**: Add new functions to `pure-functions.ts` registry

3. **Zod tests**: Add new schemas to `schema-registry.ts`

### Weekly Health Check

```powershell
# Run all auto-generated tests
pnpm test --grep "Auto-Generated"

# Check snapshot drift
git status packages/truth-test/src/auto/__snapshots__/

# Review coverage report
pnpm --filter @afenda/truth-test test:coverage
```
