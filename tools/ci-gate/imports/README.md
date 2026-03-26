# Imports CI Gate

Validates import consistency patterns across the codebase to ensure type safety and maintainability.

## Checks

### 1. Decimal.js Import Consistency

**Purpose**: Ensures all `decimal.js` imports use the named import pattern for consistent TypeScript type inference.

**Pattern to enforce:**
```typescript
✅ import { Decimal } from "decimal.js";  // Named import (correct)
❌ import Decimal from "decimal.js";      // Default import (incorrect)
```

**Rationale:**
- Named imports allow direct type usage: `amount: Decimal`
- Default imports require namespace workarounds that don't exist: `type DecimalInstance = Decimal.Instance`
- Matches TypeScript type inference from decimal.js exports
- Ensures consistency with existing codebase (partner-engine.ts, reference-data.ts, money.ts, scenarios.ts)

**Auto-fix:** Converts default imports to named imports automatically.

## Usage

### Manual execution
```bash
# Check only
node tools/ci-gate/imports/index.mjs

# Check and auto-fix
node tools/ci-gate/imports/index.mjs --fix

# Verbose output
node tools/ci-gate/imports/index.mjs -v
```

### Via pnpm scripts
```bash
# Check only
pnpm ci:imports

# Check and auto-fix
pnpm ci:imports --fix
```

### Via master CI gate
```bash
# Run all gates including imports
pnpm ci:gate

# Run specific gate
node tools/ci-gate/index.mjs --gate=imports

# Auto-fix
node tools/ci-gate/index.mjs --gate=imports --fix
```

## Exit Codes

- `0` - All checks passed
- `1` - Validation errors found

## Scope

Scans all TypeScript files:
- `apps/**/*.{ts,tsx}`
- `packages/**/*.{ts,tsx}`

Excludes:
- `**/node_modules/**`
- `**/dist/**`
- `**/build/**`
- `**/.turbo/**`

## Example Output

### Errors found:
```
🔍 Running imports CI gate checks...

Running: Decimal.js Import Consistency
============================================================

❌ Decimal.js Import Consistency
  apps/api/src/modules/sales/logic/tax-engine.ts:15:1
    Use named import: import { Decimal } from "decimal.js" (not default import)
    Suggestion: Change "import Decimal from" to "import { Decimal } from"

❌ CI gate failed with 1 error(s)

Next steps:
  1. Fix the locations listed above
  2. Re-run: pnpm ci:imports
  3. Re-run full gate: pnpm ci:gate
```

### All checks passed:
```
🔍 Running imports CI gate checks...

Running: Decimal.js Import Consistency
============================================================

✅ All imports CI gate checks passed!
```

### With auto-fix:
```
🔍 Running imports CI gate checks...

Running: Decimal.js Import Consistency
  ✓ Fixed: apps/api/src/modules/sales/logic/tax-engine.ts
============================================================

✅ All imports CI gate checks passed!
  Fixed: 1 file(s)
```

## Integration

This gate is automatically discovered and executed by the master CI gate runner at `tools/ci-gate/index.mjs`.

Gate discovery pattern:
```javascript
const gates = await discoverGates(); // Finds all tools/ci-gate/*/index.mjs
```

## Adding New Import Checks

1. Create a new check module in `tools/ci-gate/imports/checks/your-check.mjs`
2. Export an async function with signature: `({ fix }) => Promise<{ errors, fixed? }>`
3. Add the check to the `CHECKS` array in `index.mjs`

Example:
```javascript
// tools/ci-gate/imports/checks/your-check.mjs
export async function yourCheck({ fix }) {
  const errors = [];
  let fixCount = 0;
  
  // Your validation logic here
  
  return { errors, fixed: fix ? fixCount : undefined };
}

// tools/ci-gate/imports/index.mjs
import { yourCheck } from "./checks/your-check.mjs";

const CHECKS = [
  { name: "Decimal.js Import Consistency", fn: decimalConsistency },
  { name: "Your Check Name", fn: yourCheck },
];
```

## See Also

- [CI Gate Documentation](../README.md)
- [Logger Gate](../logger/README.md) - Similar pattern for logging validation
- [TypeScript Gate](../typescript/README.md) - TypeScript-specific validation
