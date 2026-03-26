# Vite CI Gate - Quick Reference

## Quick Commands

```bash
# Run all Vite checks
pnpm ci:gate:vite

# Verbose output
pnpm ci:gate:vite --verbose

# Auto-fix (where possible)
pnpm ci:gate:vite --fix

# Run all gates including Vite
pnpm ci:gate
```

## What It Checks (30+ Validations)

### 🔧 Build Performance
- ✅ Manifest generation enabled
- ✅ Plugin configuration optimized
- ✅ Dependency pre-bundling
- ✅ Warmup file limits (<20)

### 🔒 Environment Security
- ✅ No secrets in `VITE_*` vars
- ✅ `.env.*` in `.gitignore`
- ✅ TypeScript env definitions
- ✅ Safe `loadEnv` usage

### ⚙️ Configuration Quality
- ✅ TypeScript config (`vite.config.ts`)
- ✅ `defineConfig` for IntelliSense
- ✅ Explicit `base` path
- ✅ Modern target (`es2022`)
- ✅ Oxc/ESBuild minification
- ✅ Proper sourcemaps

### 🎨 Asset Optimization
- ✅ CSP-compatible inline limits
- ✅ Public dir size (<5MB)
- ✅ Large file detection
- ✅ Image optimization plugins

### 🔌 Plugin Health
- ✅ React plugin first
- ✅ Mode guards on analyzers
- ✅ Transform filters
- ✅ Virtual module patterns

## Common Fixes

### ❌ Secret in VITE_* Variable
```bash
# BAD - exposed in browser
VITE_API_KEY=sk_live_123

# GOOD - server-side only
API_KEY=sk_live_123
```

### ❌ Manifest Not Enabled
```typescript
// vite.config.ts
export default defineConfig({
  build: {
    manifest: true, // Add this
  },
});
```

### ❌ Outdated Build Target
```typescript
// vite.config.ts
export default defineConfig({
  build: {
    target: 'es2022', // Update from es2015/es2020
  },
});
```

### ⚠️ Visualizer Without Guard
```typescript
// vite.config.ts
plugins: [
  react(),
  isAnalyze && visualizer(), // Add mode guard
].filter(Boolean),
```

### ⚠️ React Plugin Not First
```typescript
// vite.config.ts
plugins: [
  react(), // Move to first position
  // other plugins...
],
```

### ⚠️ CSP + Inline Assets
```typescript
// vite.config.ts (for strict CSP)
export default defineConfig({
  build: {
    assetsInlineLimit: 0, // Disable data URIs
  },
});
```

## Understanding Results

### ❌ Errors (Exit Code 1)
Critical issues that block CI:
- Secrets exposed via VITE_*
- Manifest not enabled
- Missing TypeScript config
- React plugin ordering

### ⚠️ Warnings (Exit Code 0)
Recommendations that don't block CI:
- Large public directory
- Missing optimization plugins
- Outdated build targets
- Non-optimal settings

## CI Workflow

```yaml
# .github/workflows/ci.yml
- name: Vite configuration gate
  run: pnpm ci:gate:vite
  continue-on-error: false  # Blocks merge on failure
```

## File Structure

```
tools/ci-gate/vite/
├── index.mjs                    # Main runner
├── README.md                    # Full documentation
└── checks/
    ├── build-performance.mjs
    ├── env-security.mjs
    ├── config-quality.mjs
    ├── asset-optimization.mjs
    └── plugin-health.mjs
```

## Related Commands

```bash
# Bundle monitoring (requires manifest: true)
pnpm ci:gate:bundle

# TypeScript validation
pnpm ci:gate:typescript

# All gates
pnpm ci:gate

# Master gate help
node tools/ci-gate/index.mjs --help
```

## Exit Codes

- `0` = All checks passed ✅
- `1` = Critical errors found ❌

## When to Use `--fix`

Auto-fix is limited. Most issues require manual intervention:
- ✅ Can auto-fix: Formatting, simple config updates
- ❌ Cannot auto-fix: Secrets removal, plugin reordering

## Documentation

- **Full Guide:** `tools/ci-gate/vite/README.md`
- **Implementation:** `docs/VITE_CI_GATE_IMPLEMENTATION.md`
- **Vite Docs:** https://vite.dev/

## Critical Security Rule

> **Never use `VITE_*` prefix for secrets!**
>
> All `VITE_*` variables are inlined in the browser bundle at build time.
> Anyone can inspect your JavaScript and see these values.
>
> ✅ Use `VITE_*` for: API URLs, feature flags, public config
> ❌ Never use `VITE_*` for: API keys, tokens, credentials, database URLs

## Performance Tips

1. **Guard expensive plugins:**
   ```typescript
   isAnalyze && visualizer()
   ```

2. **Limit warmup files (<20):**
   ```typescript
   server: {
     warmup: {
       clientFiles: ['./src/main.tsx', './src/App.tsx']
     }
   }
   ```

3. **Pre-bundle large deps:**
   ```typescript
   optimizeDeps: {
     include: ['react', 'react-dom', 'lodash']
   }
   ```

4. **Modern target:**
   ```typescript
   build: { target: 'es2022' }
   ```

## Troubleshooting

```bash
# See detailed output
pnpm ci:gate:vite --verbose

# Check specific file
node tools/ci-gate/vite/checks/env-security.mjs

# Validate CI integration
node tools/ci-gate/index.mjs --gate=vite

# List all available gates
node tools/ci-gate/index.mjs --help
```

## Version Info

- **Vite:** 8.0.0-beta (Rolldown-powered)
- **Target:** ES2022
- **Minifier:** Oxc (default in Vite 8)
- **Bundler:** Rolldown (replaces Rollup)
- **Transformer:** Oxc (replaces ESBuild for transforms)

---

**🎯 Goal:** Enforce Vite industry best practices automatically in CI pipeline

**📚 Learn More:** See `tools/ci-gate/vite/README.md` for complete documentation
