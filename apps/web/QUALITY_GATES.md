# React Enterprise Quality Gates

This document describes the automated quality checks that ensure enterprise-grade React code quality.

## 🎯 Overview

Every commit and pull request is validated against **7 critical quality gates**:

| Gate | Tool | Purpose | Blocks PR |
|------|------|---------|-----------|
| 🔍 **Type Safety** | TypeScript | Catches type errors at compile time | ✅ Yes |
| 🧹 **Code Quality** | ESLint | Enforces React Hooks rules & best practices | ✅ Yes |
| 🧪 **Unit Tests** | Vitest | Validates component behavior | ✅ Yes |
| 🏗️ **Build** | Vite | Ensures production build succeeds | ✅ Yes |
| 📊 **Bundle Size** | Custom script | Prevents bundle bloat | ✅ Yes |
| ⚠️ **React Warnings** | Test output parser | Catches runtime React warnings | ✅ Yes |
| 🔀 **Code Splitting** | Chunk analysis | Verifies lazy loading works | ✅ Yes |

## 🚀 Quick Start

### Run All Quality Checks Locally

```bash
# Run the full validation suite (same as CI)
pnpm --filter web validate

# Or run individual checks
pnpm --filter web typecheck     # TypeScript
pnpm --filter web lint          # ESLint
pnpm --filter web test:run      # Tests
pnpm --filter web build         # Production build
```

### Auto-fix Issues

```bash
# Fix ESLint issues automatically
pnpm --filter web lint:fix

# Format code with Prettier
pnpm --filter web format
```

## 📋 Quality Gate Details

### Gate 1: TypeScript Strict Type Checking

**Command:** `pnpm --filter web typecheck`

**What it checks:**
- Type errors across all `.ts` and `.tsx` files
- Strict null checks
- No implicit any
- Unused variables/imports

**Common failures:**
- Missing type annotations
- Incorrect prop types
- Null/undefined access without checks

**Fix:**
```bash
pnpm --filter web typecheck
# Review errors and add proper types
```

### Gate 2: ESLint (React Hooks + Best Practices)

**Command:** `pnpm --filter web lint --max-warnings 0`

**Critical rules enforced:**

| Rule | Purpose | Example |
|------|---------|---------|
| `react-hooks/rules-of-hooks` | Ensures hooks are called correctly | No hooks in loops/conditions |
| `react-hooks/exhaustive-deps` | Prevents stale closures | All dependencies listed |
| `react/no-unstable-nested-components` | Prevents performance issues | No components defined inside components |
| `react/jsx-no-constructed-context-values` | Prevents unnecessary rerenders | Memoize Context values |

**Fix:**
```bash
pnpm --filter web lint:fix
```

### Gate 3: Unit Tests

**Command:** `pnpm --filter web test:run`

**What it checks:**
- All test files pass
- No runtime errors
- Component rendering works

**Write tests for:**
- Component rendering logic
- Hook behavior
- Utility functions
- Form validation

**Example test:**
```typescript
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MyComponent } from './MyComponent';

describe('MyComponent', () => {
  it('renders without crashing', () => {
    render(<MyComponent />);
    expect(screen.getByRole('button')).toBeInTheDocument();
  });
});
```

### Gate 4: Production Build

**Command:** `pnpm --filter web build`

**What it checks:**
- Code compiles without errors
- All imports resolve correctly
- Build optimizations work
- Code splitting succeeds

**Common failures:**
- Missing dependencies
- Import path errors
- TypeScript errors (caught earlier)

### Gate 5: Bundle Size Limits

**Limits:**
- Main bundle: **200KB** (gzipped)
- React vendor: **250KB** (gzipped)

**What happens on failure:**
CI fails with:
```
❌ Main bundle too large! Limit: 200KB, Actual: 245KB
```

**How to fix:**
1. Analyze bundle: `pnpm --filter web analyze`
2. Look for large dependencies
3. Code-split heavy components with `React.lazy()`
4. Tree-shake unused exports

**Analyze bundle:**
```bash
pnpm --filter web analyze
# Opens interactive visualization in browser
```

### Gate 6: React Runtime Warnings

**What it checks:**
- No React warnings in application code
- Proper key props in lists
- No ref forwarding issues
- No memory leaks

**Common warnings:**
- `Warning: Each child in a list should have a unique "key" prop`
- `Warning: Function components cannot be given refs`
- `Warning: Can't perform a React state update on an unmounted component`

**Fix:**
Run tests and check console:
```bash
pnpm --filter web test:run
```

### Gate 7: Code Splitting Verification

**What it checks:**
- At least 3 separate page chunks exist
- Routes are lazy-loaded
- Vite's code splitting is working

**Expected output:**
```
✅ Code splitting verified: 6 page chunks found
```

Files checked:
- `home-*.js`
- `model-list-*.js`
- `model-form-*.js`
- `404-*.js`
- `403-*.js`
- `500-*.js`

## 🔧 Configuration Files

| File | Purpose |
|------|---------|
| `.github/workflows/react-quality-gate.yml` | CI pipeline definition |
| `eslint.config.js` | ESLint rules (React Hooks enforcement) |
| `tsconfig.json` | TypeScript strict mode settings |
| `vite.config.ts` | Build configuration + bundle analyzer |
| `vitest.config.ts` | Test framework configuration |
| `.prettierrc` | Code formatting rules |

## 🛠️ Development Workflow

### Before Committing

```bash
# 1. Format your code
pnpm --filter web format

# 2. Fix linting issues
pnpm --filter web lint:fix

# 3. Run tests
pnpm --filter web test:run

# 4. Verify build
pnpm --filter web build
```

### During Code Review

CI will automatically run all checks. Look for the **✅ All checks passed** status.

If checks fail:
1. Click on the failed check in GitHub
2. Review the error logs
3. Fix locally
4. Push again

### When Checks Fail in CI

**Type errors:**
```bash
pnpm --filter web typecheck
# Fix reported errors
```

**Lint errors:**
```bash
pnpm --filter web lint
# Review and fix, or use --fix
pnpm --filter web lint:fix
```

**Test failures:**
```bash
pnpm --filter web test
# Fix failing tests
```

**Bundle too large:**
```bash
pnpm --filter web analyze
# Identify large dependencies
# Add code splitting or remove unused dependencies
```

## 📚 Resources

### Official React Documentation
- [React Hooks Rules](https://react.dev/reference/rules/rules-of-hooks)
- [Exhaustive Dependencies](https://react.dev/reference/rules/react-hooks-exhaustive-deps)
- [React.memo](https://react.dev/reference/react/memo)
- [forwardRef](https://react.dev/reference/react/forwardRef)
- [Component Purity](https://react.dev/reference/rules/components-and-hooks-must-be-pure)

### Tools
- [ESLint React Hooks Plugin](https://www.npmjs.com/package/eslint-plugin-react-hooks)
- [Vitest Documentation](https://vitest.dev)
- [React Testing Library](https://testing-library.com/react)
- [Vite Build Optimization](https://vitejs.dev/guide/build.html)

## 🤝 Contributing

When adding new React components:

1. ✅ Use TypeScript with explicit prop types
2. ✅ Follow React Hooks rules (enforced by ESLint)
3. ✅ Write unit tests for component behavior
4. ✅ Use `React.lazy()` for route-level components
5. ✅ Memoize expensive computations with `useMemo`
6. ✅ Stabilize callbacks with `useCallback`
7. ✅ Test your changes locally with `pnpm validate`

## 🚨 Troubleshooting

### "ESLint error: exhaustive-deps"

**Problem:** Missing dependency in `useEffect`/`useCallback`/`useMemo`

**Fix:** Add the missing dependency to the array, or if it's intentional, add:
```typescript
// eslint-disable-next-line react-hooks/exhaustive-deps
```

### "Bundle size exceeded"

**Problem:** Bundle is too large

**Solutions:**
1. Lazy load heavy components
2. Remove unused dependencies
3. Use dynamic imports for rarely-used code
4. Check with `pnpm --filter web analyze`

### "React warnings in tests"

**Problem:** React warnings detected in console

**Fix:** Look for:
- Missing keys in lists
- Refs on function components (use `forwardRef`)
- State updates after unmount

### "TypeScript errors in CI but not locally"

**Problem:** Different TypeScript versions or cached types

**Fix:**
```bash
# Clear cache and reinstall
rm -rf node_modules
pnpm install
pnpm --filter web typecheck
```

## 📊 Metrics

Our quality gates ensure:
- ✅ **Zero** React Hooks violations
- ✅ **Zero** TypeScript errors in production
- ✅ **Zero** failing tests
- ✅ Bundle size under **200KB** (main) + **250KB** (React vendor)
- ✅ All routes lazy-loaded for optimal performance
- ✅ No runtime React warnings

---

**Questions?** Contact the frontend team or open an issue.
