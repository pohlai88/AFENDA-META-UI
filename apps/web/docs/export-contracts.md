# Export Contracts for Lazy-Loaded Routes and Renderers

## Overview

Export contracts are test-time guarantees that lazy-loaded modules export the expected shape. They prevent **Renderer Version Drift** — a common failure mode in metadata-driven platforms where runtime imports resolve to `undefined` because an expected export was accidentally removed or renamed.

### Problem Statement

In a metadata-driven UI platform, components are often:

1. **Lazy-loaded** via `React.lazy()` for code splitting
2. **Dynamically selected** based on ModelMeta definitions
3. **Architecturally critical** — a single missing export breaks entire feature areas

Traditional TypeScript type-checking **cannot catch** lazy-loading contract violations:

```tsx
// Route definition (checked at build time)
const MetaListV2 = lazy(async () => {
  const module = await import("~/renderers/MetaListV2");
  return { default: module.MetaListV2 }; // TypeScript can't validate this!
});
```

If `MetaListV2.tsx` is accidentally replaced with different code, the app builds successfully but crashes at runtime:

```
Error: Element type is invalid. Received a promise that resolves to: undefined.
```

## Solution: Contract Testing

Contract tests validate module export shapes at **test time** (before merge), catching drift before it reaches production.

### Architecture

```
┌─────────────────────────────────────────────────────────────┐
│ Route Definition (pages/model-list.tsx)                     │
│                                                              │
│   const MetaListV2 = lazy(async () => {                     │
│     const module = await import("~/renderers/MetaListV2");  │
│     return { default: module.MetaListV2 };                  │
│   });                                                        │
└─────────────────────────────────────────────────────────────┘
                              │
                              │ expects named export
                              ▼
┌─────────────────────────────────────────────────────────────┐
│ Renderer Module (renderers/MetaListV2.tsx)                  │
│                                                              │
│   export function MetaListV2({ model, ...props }) {         │
│     // ...implementation                                     │
│   }                                                          │
└─────────────────────────────────────────────────────────────┘
                              │
                              │ validated by
                              ▼
┌─────────────────────────────────────────────────────────────┐
│ Contract Test (renderers/MetaListV2.contract.test.ts)       │
│                                                              │
│   it("exports MetaListV2 as callable component", () => {    │
│     expect(typeof MetaListV2Module.MetaListV2)              │
│       .toBe("function");                                     │
│   });                                                        │
└─────────────────────────────────────────────────────────────┘
```

## Implementation

### 1. Renderer Contract Tests

Create a contract test for each metadata-driven renderer:

**File**: `apps/web/src/renderers/MetaListV2.contract.test.ts`

```typescript
import { describe, it, expect } from "vitest";
import * as MetaListV2Module from "./MetaListV2";

describe("MetaListV2 renderer contract", () => {
  it("exports MetaListV2 as a callable component", () => {
    expect(typeof MetaListV2Module.MetaListV2).toBe("function");
  });
});
```

**What it validates**:

- Named export `MetaListV2` exists
- Export is a function (React component)
- Module can be imported without errors

**When it fails**:

- File accidentally overwritten with different code
- Export renamed without updating route
- File deleted or moved

### 2. Lazy Route Page Contracts

Create a single parameterized test for all lazy-loaded pages:

**File**: `apps/web/src/routes/lazy-pages.contract.test.ts`

```typescript
import { describe, it, expect } from "vitest";

const lazyPageModulePaths = [
  "../pages/home",
  "../pages/module-landing",
  "../pages/model-list",
  "../pages/model-detail",
  // ... all lazy-loaded pages
] as const;

describe("route lazy page contracts", () => {
  for (const modulePath of lazyPageModulePaths) {
    it(`${modulePath} exports a default React component`, async () => {
      const pageModule = (await import(modulePath)) as { default?: unknown };
      expect(typeof pageModule.default).toBe("function");
    });
  }
});
```

**What it validates**:

- Each lazy route module exports a `default` function
- Module path resolves correctly
- No import-time errors

**When it fails**:

- Page component missing default export
- Page file moved without updating route definition
- Syntax errors in page module

### 3. Package Scripts

Add a fast contract-only test runner:

**File**: `apps/web/package.json`

```json
{
  "scripts": {
    "test:contracts": "vitest run src/routes/lazy-pages.contract.test.ts src/renderers/MetaListV2.contract.test.ts"
  }
}
```

**Runtime**: ~5-6 seconds (no behavior tests, only export shape validation)

### 4. Root CI Alias

Wire into root workspace for pre-merge gate:

**File**: `package.json` (root)

```json
{
  "scripts": {
    "ci:contracts": "pnpm --filter @afenda/web run test:contracts"
  }
}
```

### 5. CI Gate Integration

Integrate with master CI gate system:

**File**: `tools/ci-gate/contracts/index.mjs`

```javascript
#!/usr/bin/env node
import { execSync } from "node:child_process";

function main() {
  try {
    execSync("pnpm test:contracts", {
      cwd: "../../../apps/web",
      encoding: "utf-8",
      stdio: "inherit",
    });
    console.log("✓ All export contracts validated");
    process.exit(0);
  } catch (error) {
    console.error("✗ Export contract validation failed");
    process.exit(1);
  }
}

main();
```

Now `pnpm ci:gate` runs contract tests automatically.

## Usage

### Local Development

```bash
# Run contract tests only (fast)
pnpm --filter @afenda/web run test:contracts

# Or from root
pnpm ci:contracts

# Run all CI gates (includes contracts)
pnpm ci:gate
```

### Pre-Merge Validation

```bash
# Before committing changes to renderers or routes
pnpm ci:contracts

# Full pre-merge validation
pnpm ci:gate
```

### CI/CD Pipeline

```yaml
# .github/workflows/ci.yml
- name: Validate Export Contracts
  run: pnpm ci:contracts
```

## When to Add Contract Tests

### Always Required

1. **Lazy-loaded route pages** — any component loaded via `React.lazy()`
2. **Metadata-driven renderers** — components selected dynamically from ModelMeta
3. **Plugin/extension systems** — dynamically discovered modules

### Optional (Lower Risk)

1. **Eagerly imported components** — TypeScript catches missing exports
2. **Statically typed utilities** — build fails on import errors
3. **Internal implementation details** — not exposed via dynamic imports

## Common Failures and Fixes

### Failure: "Expected function but got undefined"

**Cause**: Named export missing from renderer module

**Fix**:

```typescript
// ❌ Wrong
export default function MetaListV2() { ... }

// ✅ Correct
export function MetaListV2() { ... }
```

### Failure: "Cannot find module '../pages/model-list'"

**Cause**: Page file moved or deleted

**Fix**:

1. Restore file at expected location, OR
2. Update route definition path, OR
3. Update contract test path list

### Failure: "Default export is not a function"

**Cause**: Page module exports object instead of component

**Fix**:

```typescript
// ❌ Wrong
export default { Component: ModelList };

// ✅ Correct
export default function ModelList() { ... }
```

## Performance Characteristics

| Test Type           | Count   | Runtime   | Covers                    |
| ------------------- | ------- | --------- | ------------------------- |
| Lazy page contracts | 18      | ~6s       | Route lazy imports        |
| Renderer contracts  | 1+      | ~1s       | Metadata renderer exports |
| **Total**           | **19+** | **~6-7s** | **All dynamic imports**   |

Contract tests are **10-50x faster** than behavior tests because they:

- Only validate export shape (no DOM rendering)
- No API mocking required
- No complex state setup
- Parallel execution across CPU cores

## Maintenance

### Adding New Lazy Pages

When adding a new lazy route:

1. Create page component at `apps/web/src/pages/new-page.tsx`:

   ```typescript
   export default function NewPage() {
     return <div>New Page</div>;
   }
   ```

2. Add route definition in `apps/web/src/routes/index.tsx`:

   ```typescript
   const NewPage = lazy(() => import("~/pages/new-page"));
   ```

3. **Add to contract test** in `lazy-pages.contract.test.ts`:

   ```typescript
   const lazyPageModulePaths = [
     // ... existing paths
     "../pages/new-page", // ← Add this
   ] as const;
   ```

4. Run contract test to verify:
   ```bash
   pnpm ci:contracts
   ```

### Adding New Renderers

When adding a metadata-driven renderer:

1. Create renderer at `apps/web/src/renderers/MetaGridV2.tsx`:

   ```typescript
   export function MetaGridV2({ model }: MetaGridV2Props) {
     // ...implementation
   }
   ```

2. **Create contract test** at `renderers/MetaGridV2.contract.test.ts`:

   ```typescript
   import * as MetaGridV2Module from "./MetaGridV2";

   describe("MetaGridV2 renderer contract", () => {
     it("exports MetaGridV2 as callable component", () => {
       expect(typeof MetaGridV2Module.MetaGridV2).toBe("function");
     });
   });
   ```

3. **Update test:contracts script** in `apps/web/package.json`:

   ```json
   {
     "test:contracts": "vitest run src/routes/lazy-pages.contract.test.ts src/renderers/*.contract.test.ts"
   }
   ```

4. Run contract test to verify:
   ```bash
   pnpm ci:contracts
   ```

## Benefits

### Development Time

- ✅ Catches lazy-loading errors **before** runtime
- ✅ CI fails **before merge** if exports drift
- ✅ Clear error messages pointing to exact module
- ✅ Fast feedback loop (~6s vs debugging in browser)

### Production Stability

- ✅ Prevents "Element type is invalid" runtime crashes
- ✅ Guards against accidental file overwrites
- ✅ Ensures metadata-driven platform contracts stay intact
- ✅ Reduces production hotfixes for missing exports

### Team Velocity

- ✅ Self-documenting — tests show expected export shape
- ✅ Refactoring confidence — rename detection via CI
- ✅ Onboarding clarity — new devs see export requirements
- ✅ Architectural enforcement — prevents drift over time

## Related Patterns

- **Type-Safe Routes**: Use TypeScript literal types for route paths
- **Module Federation Contracts**: Similar pattern for micro-frontend boundaries
- **API Contract Testing**: Same principle applied to backend endpoints

## Further Reading

- [React.lazy() Documentation](https://react.dev/reference/react/lazy)
- [Vite Code Splitting Guide](https://vitejs.dev/guide/features.html#code-splitting)
- [Martin Fowler - Contract Test](https://martinfowler.com/bliki/ContractTest.html)
