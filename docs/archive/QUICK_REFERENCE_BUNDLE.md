# Bundle Monitoring & Performance - Quick Reference

## 🚀 Common Commands

### Bundle Analysis
```bash
# Validate bundle (CI)
pnpm ci:gate:bundle

# Generate detailed report
pnpm ci:gate:bundle --report

# Update baseline (after approved changes)
pnpm ci:gate:bundle --update

# Interactive visualization
pnpm --filter web analyze
```

### Development
```bash
# Build with performance profiling
pnpm --filter web build --profile

# Debug slow transforms
vite --debug plugin-transform

# Check for large dependencies
pnpm --filter web build && du -sh apps/web/dist/assets/*
```

### Deployment
```bash
# Preview deployment
vercel

# Production deployment
vercel --prod

# Check deployed headers
curl -I https://your-app.vercel.app/index.html
curl -I https://your-app.vercel.app/assets/index-abc123.js
```

---

## 📊 Performance Budgets

| Metric | Budget | Action on Exceed |
|--------|--------|------------------|
| Total JS | 1300 KB | ❌ Fail PR |
| Total CSS | 100 KB | ❌ Fail PR |
| Entry Chunk | 300 KB | ❌ Fail PR |
| Vendor Chunk | 550 KB | ❌ Fail PR |
| Async Chunk | 150 KB | ⚠️ Warning |
| Chunk Count | 40 | ⚠️ Warning |
| JS Regression | +10% | ❌ Fail PR |

---

## 🎯 Quick Fixes

### Bundle Too Large?

1. **Analyze**: `pnpm --filter web analyze`
2. **Check**: Look for large vendor chunks
3. **Fix**: 
   - Use named imports instead of defaults
   - Lazy load routes with `React.lazy()`
   - Replace large libraries with lighter alternatives
   - Check for duplicate dependencies

### CI Gate Failing?

```bash
# See what changed
pnpm ci:gate:bundle --report

# If intentional (new feature):
pnpm ci:gate:bundle --update
git add tools/ci-gate/bundle/baseline.json
git commit -m "chore: update bundle baseline"

# If unintentional:
# - Review recent changes
# - Check for accidental imports
# - Optimize chunks
```

### Chunk Load Errors in Production?

✅ **Already handled!** Error handler in `main.tsx` prompts user to refresh.

Verify:
1. `index.html` cache: `Cache-Control: no-cache` ✅
2. Assets cache: `Cache-Control: max-age=31536000, immutable` ✅
3. Error handler installed in `main.tsx` ✅

---

## 🔧 Configuration Files

| File | Purpose |
|------|---------|
| `tools/ci-gate/bundle/index.mjs` | Bundle monitoring gate |
| `tools/ci-gate/bundle/baseline.json` | Performance baseline |
| `vercel.json` | Deployment config + cache headers |
| `apps/web/vite.config.ts` | Build optimization |
| `.github/workflows/ci.yml` | CI with bundle checks |

---

## 🎨 Cache Strategy

| Resource | Header | TTL | Why |
|----------|--------|-----|-----|
| `index.html` | `no-cache` | 0s | Always fresh, points to latest assets |
| `/assets/*` | `immutable` | 1 year | Hashed filenames never change |
| `favicon.ico` | `public` | 1 day | Rarely changes |

---

## 📚 Documentation

- 📖 [Bundle Monitoring Implementation](./BUNDLE_MONITORING_IMPLEMENTATION.md) - Complete overview
- 📦 [Bundle CI Gate](../tools/ci-gate/bundle/README.md) - Gate usage
- 🚀 [Vercel Deployment](./VERCEL_DEPLOYMENT.md) - Deployment guide
- 🔒 [CSP Implementation](./CSP_IMPLEMENTATION.md) - Security hardening

---

## ⚡ Performance Tips

1. **Code Splitting**
   ```tsx
   const Dashboard = React.lazy(() => import('./Dashboard'));
   ```

2. **Named Imports**
   ```tsx
   // ❌ Imports entire library
   import _ from 'lodash';
   
   // ✅ Tree-shakeable
   import { debounce } from 'lodash-es';
   ```

3. **Chunk Strategy**
   - Keep vendor chunks < 550 KB
   - Split by change frequency
   - Group related features

4. **Dependency Audit**
   ```bash
   pnpm ls <package>  # Why is this included?
   npx vite-bundle-visualizer  # Alternative analyzer
   ```

---

## 🚨 Troubleshooting

### "Manifest not found"
➜ Check `vite.config.ts` has `build.manifest: true` ✅

### "Build failed"
➜ Run `pnpm --filter web build` manually to see errors

### "Budget exceeded"
➜ Run `pnpm ci:gate:bundle --report` to see details

### "Baseline outdated"
➜ Update after review: `pnpm ci:gate:bundle --update`

---

## 🎓 Resources

- [Vite Build Guide](https://vite.dev/guide/build)
- [Web.dev Performance](https://web.dev/vitals/)
- [Bundle Analyzer](https://github.com/btd/rollup-plugin-visualizer)
- [Lighthouse CI](https://github.com/GoogleChrome/lighthouse-ci)

---

**Quick Support**: Check the full docs linked above or ask in #frontend Slack channel.
