# Bundle CI Gate

Automated bundle size monitoring and performance budget enforcement for the web application.

## Overview

This gate validates that the production build stays within performance budgets and prevents bundle size regressions in pull requests.

## Features

- ✅ **Hard Budgets** - Fail build if total JS/CSS exceeds limits
- ✅ **Regression Detection** - Alert on % increases from baseline
- ✅ **Chunk Analysis** - Monitor vendor/entry/async chunk sizes
- ✅ **Baseline Tracking** - Git-tracked baseline for comparison
- ✅ **Detailed Reports** - See largest chunks and size changes

## Performance Budgets

| Metric | Budget | Threshold |
|--------|--------|-----------|
| Total JS | 1300 KB | 10% increase |
| Total CSS | 100 KB | 15% increase |
| Main Entry | 300 KB | Hard limit |
| Vendor Chunk | 550 KB | Hard limit |
| Async Chunk | 150 KB | Warning |
| Max Chunks | 40 | 20% increase |

## Usage

### Run validation (CI)

```bash
pnpm ci:gate:bundle
```

### Generate report only

```bash
pnpm ci:gate:bundle --report
```

### Update baseline

```bash
# After intentional bundle changes on main branch
pnpm ci:gate:bundle --update
```

### Analyze bundle composition

```bash
# Opens interactive treemap visualization
pnpm --filter web analyze
```

## How It Works

1. **Build Analysis** - Parses Vite manifest and measures actual file sizes
2. **Budget Validation** - Checks absolute size limits (hard failures)
3. **Baseline Comparison** - Detects regressions vs tracked baseline
4. **Report Generation** - Shows detailed breakdown and recommendations

## When to Update Baseline

Update the baseline **only** when:

- ✅ Intentionally adding new features that increase bundle size
- ✅ Upgrading dependencies that change bundle composition
- ✅ After optimizations that reduce bundle size
- ❌ Never update baseline to "make CI pass" without investigation

## Integration

### CI Workflow

The gate runs automatically in CI on:

- Pull requests (validates against baseline)
- Main branch merges (can update baseline)

### Package Scripts

```json
{
  "ci:gate:bundle": "node tools/ci-gate/bundle/index.mjs",
  "ci:gate:bundle:update": "node tools/ci-gate/bundle/index.mjs --update"
}
```

## Optimization Strategies

If bundle size exceeds budget:

1. **Analyze Composition**
   ```bash
   pnpm --filter web analyze
   ```

2. **Check for Common Issues**
   - Accidental imports of entire libraries (use tree-shakeable imports)
   - Missing code splitting on routes
   - Large dependencies that could be replaced
   - Barrel file imports slowing tree-shaking

3. **Optimize Chunks**
   - Review `vite.config.ts` `manualChunks` configuration
   - Split large vendor chunks strategically
   - Lazy load non-critical features

4. **Reduce Dependencies**
   - Replace large libraries with lighter alternatives
   - Use `pnpm ls <package>` to find why dependencies are included
   - Add to `externals` if used in SSR only

## Troubleshooting

### "Manifest not found"

Ensure `vite.config.ts` has:

```ts
export default defineConfig({
  build: {
    manifest: true,
  },
});
```

### "Build failed"

The gate will automatically attempt to build if `dist/` is missing, but you can pre-build:

```bash
pnpm --filter web build
```

### False Positives

If legitimate changes exceed thresholds:

1. Run `pnpm ci:gate:bundle --report` to see details
2. Verify the increase is justified
3. Update baseline: `pnpm ci:gate:bundle --update`
4. Commit `baseline.json` with explanation

## Baseline File

The `baseline.json` file contains:

- Total JS/CSS sizes
- Chunk count and individual chunk sizes
- Timestamp of last update

This file is **git-tracked** and should be updated only on main branch after code review.

## Industry Best Practices

This gate implements bundle monitoring recommendations from:

- [Vite Build Guide](https://vite.dev/guide/build) - Production build optimization
- [Web.dev Performance Budgets](https://web.dev/performance-budgets-101/) - Budget methodology
- [Chrome DevTools Coverage](https://developer.chrome.com/docs/devtools/coverage/) - Unused code detection

## Related Tools

- `pnpm --filter web analyze` - Interactive bundle visualization
- `pnpm --filter web build --profile` - Build performance profiling
- `vite --debug plugin-transform` - Plugin cost analysis

## Exit Codes

- `0` - All checks passed
- `1` - Budget exceeded or regression detected
- `2` - Build failed or manifest missing
