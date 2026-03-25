# Export Contracts CI Gate

Validates that all lazy-loaded route pages and metadata-driven renderers export the expected module shapes to prevent runtime failures. Also validates the renderer registry integrity.

## Purpose

Prevents **Renderer Version Drift** — a common failure mode in metadata-driven platforms where:

- Lazy imports resolve to `undefined` because exports were renamed/removed
- TypeScript can't catch these errors (dynamic imports bypass type checking)
- Apps crash at runtime with: `Element type is invalid. Received a promise that resolves to: undefined.`

## What It Checks

### Export Contracts (19 tests)

1. **Lazy route pages** export default React components
2. **Metadata renderers** export named functions with correct signatures
3. **Module paths** resolve correctly (no 404s on dynamic imports)
4. **Export types** match what routes/orchestrators expect

### Registry Integrity (60 tests)

1. **All registered renderers are loadable** (loader functions exist)
2. **Contracts are complete** (rendererId, version, type, capabilities, etc.)
3. **Modules export expected components** (named or default exports)
4. **Registry query functions work** (getRenderer, getLatestRenderer, hasCapability)
5. **Safe lazy loader handles all failure modes** (null module, missing export, wrong type)

## Usage

### Standalone Execution

```bash
# Run from root
pnpm ci:contracts

# Run from tools/ci-gate
node contracts/index.mjs

# With verbose output
node contracts/index.mjs --verbose
```

### Via Master CI Gate

```bash
# Run all gates (includes contracts)
pnpm ci:gate

# Run only contracts gate
pnpm ci:gate --gate=contracts

# With verbose output
pnpm ci:gate --gate=contracts --verbose
```

## Output Format

### Success

```
Export Contracts CI Gate

Validating lazy-page and renderer export contracts...

Running: pnpm test:contracts

✓ All export contracts validated successfully
All lazy-loaded modules export the expected shapes.
```

### Failure (Enhanced Diagnostics)

When contracts fail, you get detailed categorized errors:

```
Export Contracts CI Gate

Validating lazy-page and renderer export contracts...

❌ Export contract validation failed

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🚫 Missing Default Export (1)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📍 Location: src/routes/lazy-pages.contract.test.ts
   Test: ../pages/model-list exports a default React component

❌ Module '../pages/model-list' does not export a default component

💡 Explanation:
   The lazy route expects a default export, but the module exports undefined.

🔧 Fix suggestions:
   Add a default export to apps/web/src/pages/model-list.tsx:
     export default function YourComponent() { ... }

   Or if using named export, wrap it:
     export { YourComponent as default };

📂 Related files:
   • apps/web/src/pages/model-list.tsx
```

## Error Categories

### 🚫 Missing Default Export

**Cause**: Lazy route page doesn't export `default`

**Fix**:

```typescript
// ❌ Wrong
export function ModelList() { ... }

// ✅ Correct
export default function ModelList() { ... }
```

### ⚠️ Missing Named Export

**Cause**: Renderer doesn't export expected named function

**Fix**:

```typescript
// ❌ Wrong (in MetaListV2.tsx)
export default function MetaList() { ... }

// ✅ Correct
export function MetaListV2() { ... }
```

### 🔀 Wrong Export Type

**Cause**: Export exists but is wrong type (object instead of function, etc.)

**Fix**:

```typescript
// ❌ Wrong
export default { Component: MyComponent };

// ✅ Correct
export default function MyComponent() { ... }
```

### 📁 Module Not Found

**Cause**: File doesn't exist at expected location

**Fix**:

- Restore file at expected path, OR
- Update route definition path, OR
- Update contract test path list

## Architecture

```
┌─────────────────────────────────────────────┐
│ tools/ci-gate/contracts/                    │
│                                             │
│  index.mjs           Main gate runner       │
│  utils/                                     │
│    error-parser.mjs  Vitest output parser   │
│                      + diagnostic generator  │
└─────────────────────────────────────────────┘
            │
            │ executes
            ▼
┌─────────────────────────────────────────────┐
│ apps/web/package.json                       │
│                                             │
│  "test:contracts": "vitest run ..."         │
└─────────────────────────────────────────────┘
            │
            │ runs
            ▼
┌─────────────────────────────────────────────┐
│ Contract Tests                              │
│                                             │
│  lazy-pages.contract.test.ts    18 tests    │
│  renderers/*.contract.test.ts   N tests     │
└─────────────────────────────────────────────┘
```

## Adding New Contracts

### For New Lazy Page

1. Add page in `apps/web/src/pages/new-page.tsx`
2. Add to route definition in `routes/index.tsx`
3. **Add to contract test** in `lazy-pages.contract.test.ts`:
   ```typescript
   const lazyPageModulePaths = [
     // ... existing paths
     "../pages/new-page", // ← Add this
   ] as const;
   ```

### For New Renderer

1. Create renderer at `apps/web/src/renderers/NewRenderer.tsx`
2. **Create contract test** at `renderers/NewRenderer.contract.test.ts`:

   ```typescript
   import * as Module from "./NewRenderer";

   describe("NewRenderer contract", () => {
     it("exports NewRenderer as callable component", () => {
       expect(typeof Module.NewRenderer).toBe("function");
     });
   });
   ```

3. Update `test:contracts` script to include new test file

## Performance

- **Runtime**: ~5-7 seconds (19+ tests)
- **Scope**: Export shape validation only (no behavior tests)
- **Parallelization**: Vitest runs tests across CPU cores
- **Caching**: Vite cache speeds up subsequent runs

## Exit Codes

- `0` — All contracts validated successfully
- `1` — One or more contract violations found

## Integration Points

### Pre-commit Hook

```bash
#!/bin/bash
# .husky/pre-commit
pnpm ci:contracts
```

### CI/CD Pipeline

```yaml
# .github/workflows/ci.yml
- name: Validate Export Contracts
  run: pnpm ci:contracts
```

### Pre-merge Checklist

```bash
# Before opening PR
pnpm ci:gate              # Run all gates
pnpm ci:contracts         # Just contracts (fast feedback)
```

## Diagnostic Features

### Error Parsing

Parses Vitest output to extract:

- Test file location
- Failing module path
- Expected vs received types
- Assertion messages

### Categorization

Groups errors by type:

- Missing default export
- Missing named export
- Wrong export type
- Module not found
- Generic contract violation

### Fix Suggestions

For each error type, provides:

- **Explanation**: Why it failed
- **Fix steps**: Exact code changes needed
- **Related files**: Where to make changes
- **Examples**: Correct export patterns

### Context Preservation

Maintains test context:

- Which test file failed
- Which module is affected
- What was expected
- What was received

## Troubleshooting

### Tests pass locally but fail in CI

**Cause**: File not committed to git

**Fix**: Ensure all new files are committed

### Import paths don't match

**Cause**: TSConfig path aliases not aligned

**Fix**: Check `tsconfig.json` paths configuration

### Contract test runs but doesn't catch issue

**Cause**: Contract test not covering all modules

**Fix**: Add missing modules to contract test arrays

### Vitest can't find test files

**Cause**: Glob pattern in `test:contracts` script incorrect

**Fix**: Use explicit file paths instead of globs

## Related Documentation

- [Export Contracts Guide](../../apps/web/docs/export-contracts.md) — Full pattern documentation
- [CONTRIBUTING.md](../../CONTRIBUTING.md) — When to add contract tests
- [Master CI Gate](./README.md) — CI gate system overview

## Maintenance

Contract tests are **self-maintaining** for existing modules:

- No updates needed when module implementation changes
- Only update when module paths change or new modules added
- Test runtime stays constant (~5-7s) regardless of codebase size

## Future Enhancements

Potential improvements:

- [ ] Auto-discover lazy pages from route definitions (no manual list)
- [ ] Generate contract tests automatically from route config
- [ ] Validate prop type contracts (beyond just export existence)
- [ ] Integration with TypeScript type checking
- [ ] Performance regression detection (track test runtime trends)
