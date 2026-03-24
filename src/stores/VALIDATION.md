# State Management Validation

This directory contains validation scripts and CI gates for enforcing state management best practices.

## CI Gates

### 1. Type Safety Gate
```bash
pnpm typecheck
```
Ensures all stores have proper TypeScript types.

### 2. Lint Gate
```bash
pnpm lint
```
Enforces state management rules:
- No direct localStorage usage
- No useState for global state
- Proper import patterns

### 2b. Incremental Strict Lint Gate (State Paths Only)
```bash
pnpm lint:state
```
Fails on warnings (`--max-warnings 0`) only for state-management paths:
- `src/stores/**/*.{ts,tsx}`
- `src/components/layout/top-bar.tsx`
- `src/components/layout/app-shell.tsx`
- `src/components/theme-provider.tsx`

### 2c. Incremental Strict Lint Gate Phase 2 (State + Hooks)
```bash
pnpm lint:phase2
```
Extends strict linting to the next feature folder phase:
- All `lint:state` paths
- `src/hooks/**/*.{ts,tsx}`

### 2d. Incremental Strict Lint Gate Phase 3 (State + Hooks + Lib)
```bash
pnpm lint:phase3
```
Extends strict linting with shared utilities:
- All `lint:phase2` paths
- `src/lib/**/*.{ts,tsx}`

### 2e. Incremental Strict Lint Gate Phase 3 Alternative (State + Hooks + Pages)
```bash
pnpm lint:phase3:pages
```
Low-risk feature-folder-first rollout:
- All `lint:phase2` paths
- `src/pages/**/*.{ts,tsx}`

### 2f. Incremental Strict Lint Gate Phase 4 (State + Hooks + Lib + Pages)
```bash
pnpm lint:phase4
```
Expanded strict rollout after Phase 3 stabilization:
- All `lint:phase3` paths
- `src/pages/**/*.{ts,tsx}`

### 3. Test Coverage Gate
```bash
pnpm test:coverage
```
Requirements:
- Stores: 80% minimum coverage
- Selectors: 100% coverage

### 4. Bundle Size Gate
```bash
pnpm analyze
```
Monitors:
- UI stores (Zustand): < 10kb
- Business stores (Redux): < 30kb
- Total: < 50kb

## Pre-Commit Hooks

Already configured via `lint-staged`:
```json
{
  "src/stores/**/*.ts": [
    "eslint --fix",
    "prettier --write",
    "vitest related --run"
  ]
}
```

## PR Review Checklist

Copy this checklist to your PR description:

```markdown
## State Management Review

- [ ] Correct tool used (Zustand/Redux/React Query)
- [ ] TypeScript types defined
- [ ] Unit tests written (80%+ coverage)
- [ ] No state duplication
- [ ] DevTools work correctly
- [ ] Documentation updated
```

## Automated Validation

Run all validations:
```bash
pnpm validate
```

Run incremental strict state validation:
```bash
pnpm validate:state
```
Default strict alias (promoted): `validate:state` now runs `validate:phase4`.

Run incremental strict validation phase 2 (state + hooks):
```bash
pnpm validate:phase2
```

Run incremental strict validation phase 3 (state + hooks + lib):
```bash
pnpm validate:phase3
```

Run incremental strict validation phase 3 alternative (state + hooks + pages):
```bash
pnpm validate:phase3:pages
```

Run incremental strict validation phase 4 (state + hooks + lib + pages):
```bash
pnpm validate:phase4
```

Run CI incremental strict state validation (includes build):
```bash
pnpm validate:ci:state
```
Default strict CI alias (promoted): `validate:ci:state` now runs `validate:ci:phase4`.

Run CI incremental strict validation phase 2 (includes build):
```bash
pnpm validate:ci:phase2
```

Run CI incremental strict validation phase 3 (includes build):
```bash
pnpm validate:ci:phase3
```

Run CI incremental strict validation phase 3 alternative (includes build):
```bash
pnpm validate:ci:phase3:pages
```

Run CI incremental strict validation phase 4 (includes build):
```bash
pnpm validate:ci:phase4
```

## Promotion Policy

- Promotion complete: default strict aliases now point to Phase 4 (`validate:state` and `validate:ci:state`).
- Keep `validate:ci:phase3:pages` available as the low-risk fallback variant.
- Keep full-repo strict mode (`validate:ci`) unchanged until phased gates stabilize.

This runs:
1. Type checking
2. Linting
3. Tests
4. Build check

## Common Issues

### Issue: "Use Zustand instead of localStorage"
**Solution**: Use Zustand's `persist` middleware

❌ **Wrong**:
```tsx
const [value, setValue] = useState(() => 
  localStorage.getItem('key')
);
```

✅ **Correct**:
```tsx
const useStore = create(
  persist(
    (set) => ({ value: '' }),
    { name: 'key' }
  )
);
```

### Issue: "Use store instead of useState for global state"
**Solution**: Move to appropriate store

❌ **Wrong**:
```tsx
const [sidebarOpen, setSidebarOpen] = useState(false);
```

✅ **Correct**:
```tsx
const { isOpen } = useSidebarStore();
```

### Issue: "Store missing tests"
**Solution**: Add unit tests

```tsx
describe('useSidebarStore', () => {
  it('should toggle sidebar', () => {
    const { result } = renderHook(() => useSidebarStore());
    
    act(() => result.current.toggle());
    
    expect(result.current.isOpen).toBe(false);
  });
});
```

## Monitoring

### Bundle Size Monitoring
```bash
pnpm analyze
```
Opens bundle visualizer to inspect store sizes.

### DevTools
- Redux DevTools: Track Redux actions
- React Query DevTools: Monitor server state
- Zustand DevTools: Inspect Zustand stores

## References
- [State Management README](./README.md)
- Architecture Decision Record (see README.md)
