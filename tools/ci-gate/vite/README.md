# Vite CI Gate

Automated quality checks for Vite configuration and performance best practices.

## Overview

This gate validates your Vite setup against industry standards from the [official Vite documentation](https://vite.dev/), ensuring optimal performance, security, and maintainability.

## What It Checks

### 1. Build Performance
- ✅ Manifest generation enabled (`build.manifest: true`)
- ✅ Plugin configuration optimized
- ✅ Dependency pre-bundling configured
- ✅ Bundle fragmentation detection
- ✅ Expensive plugin guards

### 2. Environment Security
- ✅ No secrets in `VITE_*` environment variables
- ✅ Proper `.env.*` gitignore patterns
- ✅ TypeScript definitions for env vars
- ✅ Safe `loadEnv` usage

**Critical:** All `VITE_*` variables are inlined in the browser bundle at build time. Never use `VITE_` prefix for API keys, tokens, or credentials.

### 3. Configuration Quality
- ✅ TypeScript configuration (`vite.config.ts`)
- ✅ `defineConfig` usage for IntelliSense
- ✅ Explicit `base` path configuration
- ✅ Modern build target (`es2022`)
- ✅ Minification settings (Oxc/ESBuild)
- ✅ Sourcemap configuration

### 4. Asset Optimization
- ✅ `assetsInlineLimit` for CSP compatibility
- ✅ Public directory size monitoring
- ✅ Image optimization plugins
- ✅ Asset naming patterns
- ✅ Large file detection

### 5. Plugin Health
- ✅ Plugin ordering (React first)
- ✅ Mode guards on analysis plugins
- ✅ Filter patterns on transform plugins
- ✅ Virtual module patterns
- ✅ Deprecated plugin detection

## Usage

### Run All Checks

```bash
pnpm ci:gate:vite
```

### Verbose Output

```bash
pnpm ci:gate:vite --verbose
```

### Auto-fix (where possible)

```bash
pnpm ci:gate:vite --fix
```

## Exit Codes

- `0` - All checks passed
- `1` - One or more checks failed

## Integration

### CI Pipeline

Add to `.github/workflows/ci.yml`:

```yaml
- name: Vite Configuration Gate
  run: pnpm ci:gate:vite
```

### Pre-commit Hook

Add to `.husky/pre-commit`:

```bash
pnpm ci:gate:vite
```

## Common Issues

### Secret in VITE_* Variable

**Problem:** Environment variable with `VITE_` prefix contains sensitive data.

**Solution:** Remove `VITE_` prefix and access the variable server-side only:

```bash
# ❌ BAD - Exposed in browser
VITE_DATABASE_URL=postgresql://...

# ✅ GOOD - Server-side only
DATABASE_URL=postgresql://...
```

### Build Manifest Not Enabled

**Problem:** `build.manifest: true` not configured.

**Solution:** Add to `vite.config.ts`:

```typescript
export default defineConfig({
  build: {
    manifest: true, // Required for bundle monitoring
  },
});
```

### Outdated Build Target

**Problem:** Using `es2015` or other old targets.

**Solution:** Update to modern target:

```typescript
export default defineConfig({
  build: {
    target: 'es2022', // Chrome 111+, Edge 111+, Firefox 114+, Safari 16.4+
  },
});
```

### CSP + Inline Assets

**Problem:** Using `assetsInlineLimit > 0` with strict CSP.

**Solution:** Disable inline assets for CSP compatibility:

```typescript
export default defineConfig({
  build: {
    assetsInlineLimit: 0, // Disable data URIs for strict CSP
  },
});
```

### Large Public Directory

**Problem:** `public/` directory exceeds 5MB.

**Solution:** Move large assets to CDN or optimize:

```bash
# Optimize images
pnpm add -D vite-imagetools

# Or serve from CDN
mv public/large-assets/* ../cdn/
```

## Best Practices

### 1. Security

- ✅ Never use `VITE_` prefix for secrets
- ✅ Keep `.env.*` in `.gitignore`
- ✅ Use `loadEnv` with `'VITE'` prefix
- ✅ Set `assetsInlineLimit: 0` for strict CSP

### 2. Performance

- ✅ Guard analysis plugins with mode checks
- ✅ Use Oxc minifier (default in Vite 8)
- ✅ Configure `optimizeDeps.include` for large deps
- ✅ Limit `server.warmup` to critical files (<20)

### 3. Configuration

- ✅ Use TypeScript config (`vite.config.ts`)
- ✅ Wrap with `defineConfig()` for IntelliSense
- ✅ Set explicit `base: '/'`
- ✅ Use modern target (`es2022` or `esnext`)

### 4. Assets

- ✅ Keep public directory under 5MB
- ✅ Compress images (WebP format)
- ✅ Use explicit asset naming patterns
- ✅ Add image optimization plugins

### 5. Plugins

- ✅ Place React plugin first
- ✅ Add filters to transform plugins
- ✅ Guard visualizer with `isAnalyze &&`
- ✅ Use `\0` prefix for virtual module IDs

## Architecture

```
tools/ci-gate/vite/
├── index.mjs                    # Main gate runner
├── README.md                    # This file
└── checks/
    ├── build-performance.mjs    # Build time & manifest checks
    ├── env-security.mjs         # Environment variable security
    ├── config-quality.mjs       # Configuration best practices
    ├── asset-optimization.mjs   # Asset handling validation
    └── plugin-health.mjs        # Plugin configuration checks
```

Each check module exports:
```javascript
export default async function check(options) {
  return {
    errors: [],   // Critical issues (exit 1)
    warnings: [], // Suggestions (exit 0)
  };
}
```

## Related Gates

- **Bundle Gate** (`ci:gate:bundle`) - Monitors bundle size and performance budgets
- **TypeScript Gate** (`ci:gate:typescript`) - Validates TypeScript configuration
- **Dependencies Gate** (`ci:gate:dependencies`) - Checks dependency health

## Resources

- [Vite Configuration Reference](https://vite.dev/config/)
- [Vite Performance Guide](https://vite.dev/guide/performance.html)
- [Vite Environment Variables](https://vite.dev/guide/env-and-mode.html)
- [Vite Build Optimizations](https://vite.dev/guide/build.html)

## Support

If you encounter issues:

1. Run with `--verbose` for detailed output
2. Check the [Vite documentation](https://vite.dev/)
3. Review related documentation in `docs/`
4. Consult the changelog for recent changes

---

**Last Updated:** 2024
**Vite Version:** 8.0.0-beta (Rolldown-powered)
