# Vite Bundle Monitoring & Performance Implementation

**Status**: ✅ Complete  
**Date**: March 25, 2026  
**Phase**: Production-Ready

## Overview

This document summarizes the complete implementation of bundle monitoring, performance budgets, and production deployment optimizations for the AFENDA Meta UI application, following Vite industry best practices.

## What Was Implemented

### 1. Bundle Size Monitoring CI Gate ✅

**Location**: `tools/ci-gate/bundle/`

**Features**:
- Automated bundle analysis from Vite manifest
- Hard budget enforcement (fails build if exceeded)
- Baseline tracking for regression detection
- Detailed reporting with chunk breakdown
- Git-tracked baseline for PR comparisons

**Budgets** (configurable in `index.mjs`):
```javascript
{
  totalJS: 800 KB,      // Total JavaScript bundle size
  totalCSS: 100 KB,     // Total CSS size
  mainEntry: 300 KB,    // Main entry chunk limit
  vendorChunk: 400 KB,  // Vendor chunk limit
  asyncChunk: 150 KB,   // Async chunk warning
  maxChunks: 25,        // Maximum chunk count
}
```

**Regression Thresholds**:
```javascript
{
  totalJS: 10%,         // Fail if JS increases >10%
  totalCSS: 15%,        // Warn if CSS increases >15%
  chunkCount: 20%,      // Warn if chunk count increases >20%
}
```

**Usage**:
```bash
# Validate against baseline (CI)
pnpm ci:gate:bundle

# Generate report only
pnpm ci:gate:bundle --report

# Update baseline (after approved changes)
pnpm ci:gate:bundle --update

# Visualize bundle composition
pnpm --filter web analyze
```

**CI Integration**: Runs automatically on every build in GitHub Actions.

---

### 2. Vercel Deployment Configuration ✅

**Files**:
- `/vercel.json` - Root workspace configuration
- `/apps/web/vercel.json` - App-specific configuration

**Cache Headers** (Industry Standard):

| Resource | Cache-Control | TTL |
|----------|---------------|-----|
| `/index.html` | `no-cache, no-store, must-revalidate` | 0s |
| `/assets/*` | `public, max-age=31536000, immutable` | 1 year |
| `favicon.ico` | `public, max-age=86400` | 1 day |

**Security Headers**:
```json
{
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "X-XSS-Protection": "1; mode=block",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "accelerometer=(), camera=(), ..."
}
```

**SPA Routing**: All non-API routes rewrite to `/index.html` for client-side routing.

---

### 3. Content Security Policy (CSP) Documentation ✅

**Location**: `docs/CSP_IMPLEMENTATION.md`

**Current Status**: Basic security headers implemented, strict CSP deferred to Phase 2

**Provides**:
- Complete implementation guide for strict CSP with nonce support
- Step-by-step instructions for Vite plugin creation
- Server-side nonce generation patterns
- CSP violation monitoring setup
- Gradual rollout strategy
- Testing and validation procedures

**Implementation Timeline**:
- ✅ Phase 1 (Now): Basic security headers + documentation
- 📋 Phase 2 (Future): Nonce-based strict CSP (2-4 week project)

---

### 4. Production Build Enhancements ✅

**Dynamic Import Error Handling** (`apps/web/src/main.tsx`):
```typescript
window.addEventListener("vite:preloadError", (event) => {
  // Handles chunk load failures (stale builds, network issues)
  // Prompts user to refresh with session guard
});
```

Prevents broken UX when users have stale HTML referencing deleted chunks.

**Vite Configuration Enhancements** (`apps/web/vite.config.ts`):
- Explicit `base: "/"` for deployment flexibility
- CSP implementation guidance in comments
- Performance profiling commands documented
- Security warnings for `VITE_*` prefix exposure
- Plugin audit instructions
- Industry best practice references

**Cache Strategy Documentation** (`apps/web/index.html`):
- Complete HTML comment block explaining cache strategy
- CSP deployment considerations
- Server configuration requirements

---

### 5. CI/CD Pipeline Integration ✅

**GitHub Actions Workflow** (`.github/workflows/ci.yml`):

```yaml
- name: Build all packages
  run: pnpm turbo run build

- name: Bundle size monitoring
  run: pnpm ci:gate:bundle
  continue-on-error: false

- name: Generate bundle report
  if: github.event_name == 'pull_request'
  run: pnpm ci:gate:bundle --report

- name: Comment bundle report on PR
  uses: actions/github-script@v7
  # Posts bundle analysis to PR comments
```

**Features**:
- Automatic bundle validation on every build
- PR comments with bundle size analysis
- Baseline comparison for PRs
- Fails PR if budget exceeded

---

### 6. Documentation ✅

Created comprehensive guides:

1. **Bundle CI Gate** (`tools/ci-gate/bundle/README.md`)
   - Usage instructions
   - Budget configuration
   - Optimization strategies
   - Troubleshooting guide

2. **Vercel Deployment** (`docs/VERCEL_DEPLOYMENT.md`)
   - Quick start guide
   - Environment variable configuration
   - Cache header setup
   - Performance optimization checklist
   - Monitoring and troubleshooting

3. **CSP Implementation** (`docs/CSP_IMPLEMENTATION.md`)
   - Complete nonce-based CSP guide
   - Step-by-step implementation
   - Testing and validation
   - Gradual rollout strategy

---

## Performance Baseline

### Current Bundle Metrics

*To be established on first CI run with actual build*

Initial baseline created at: `tools/ci-gate/bundle/baseline.json`

### Target Metrics

Based on Vite industry best practices and Web.dev recommendations:

| Metric | Target | Current | Status |
|--------|--------|---------|--------|
| Total JS | < 800 KB | TBD | ⏳ Pending first build |
| Total CSS | < 100 KB | TBD | ⏳ Pending first build |
| Chunk Count | < 25 | TBD | ⏳ Pending first build |
| FCP | < 1.8s | TBD | ⏳ Needs RUM |
| LCP | < 2.5s | TBD | ⏳ Needs RUM |
| TTI | < 3.8s | TBD | ⏳ Needs RUM |

### Optimization Implemented

- ✅ Strategic vendor chunk splitting (5 chunks)
- ✅ Per-route CSS code splitting
- ✅ Oxc minification (30-90x faster than Terser)
- ✅ LightningCSS minification
- ✅ Tree shaking with ESM
- ✅ Dynamic imports for routes
- ✅ Asset optimization pipeline

---

## Scripts Reference

### Bundle Monitoring

```bash
# CI validation
pnpm ci:gate:bundle

# Update baseline
pnpm ci:gate:bundle:update

# Generate report
pnpm ci:gate:bundle:report
```

### Bundle Analysis

```bash
# Interactive treemap visualization
pnpm --filter web analyze

# Generate build profile
pnpm --filter web build --profile

# Debug plugin transforms
vite --debug plugin-transform
```

### Deployment

```bash
# Preview deployment
vercel

# Production deployment
vercel --prod

# Rollback to previous
vercel promote <deployment-url>
```

---

## Integration Checklist

- [x] Bundle monitoring CI gate created
- [x] Baseline file initialized
- [x] Package.json scripts added
- [x] CI workflow updated with bundle checks
- [x] Vercel configuration with cache headers
- [x] Security headers configured
- [x] SPA routing configured
- [x] Dynamic import error handler implemented
- [x] Vite config enhanced with best practices
- [x] CSP implementation guide created
- [x] Deployment guide created
- [x] Bundle gate documentation created
- [ ] First successful CI run with baseline update
- [ ] Vercel project connected and deployed
- [ ] Environment variables configured in Vercel
- [ ] RUM metrics collection enabled
- [ ] Monitoring alerts configured

---

## Next Steps

### Immediate (Deploy Ready)

1. **Verify CI Build**: Push changes to trigger first CI run
2. **Review Baseline**: Check `baseline.json` after first build
3. **Connect Vercel**: Link repository to Vercel project
4. **Configure Env Vars**: Add all `VITE_*` variables in Vercel
5. **Deploy Preview**: Create preview deployment for testing
6. **Verify Cache Headers**: Check browser DevTools Network tab
7. **Validate Bundle Size**: Review bundle report in PR comment

### Phase 2 (Future Enhancements)

8. **Enable Vercel Analytics**: Configure in Vercel dashboard
9. **Set Up Error Tracking**: Integrate Sentry or Datadog
10. **Implement Strict CSP**: Follow `CSP_IMPLEMENTATION.md`
11. **Configure Budget Alerts**: Set up Slack/email notifications
12. **Add Performance Tests**: Lighthouse CI integration
13. **Monitor Core Web Vitals**: RUM with Vercel Analytics

---

## Monitoring & Alerts

### CI Alerts

Bundle gate will **fail PR** if:
- Total JS exceeds 800 KB
- Total CSS exceeds 100 KB
- Any entry chunk exceeds 300 KB
- Any vendor chunk exceeds 400 KB
- JS size increases >10% from baseline
- CSS size increases >15% from baseline

### Recommended External Monitoring

1. **Vercel Analytics** (Included)
   - Core Web Vitals tracking
   - Real User Monitoring (RUM)
   - Geographic performance breakdown

2. **Bundle Size Bot** (Optional)
   - [Bundlewatch](https://bundlewatch.io/)
   - [Size Limit](https://github.com/ai/size-limit)
   - GitHub app integration

3. **Error Tracking** (Recommended)
   - Sentry for full stack traces
   - Datadog RUM for APM
   - PostHog for session replay

---

## Troubleshooting

### Bundle Gate Fails

**Error**: "Total JS size exceeds budget"

1. Run `pnpm --filter web analyze` to visualize bundle
2. Check for accidentally imported large libraries
3. Review `vite.config.ts` chunk splitting strategy
4. Ensure tree-shaking is working (check for side effects)
5. Consider lazy loading non-critical features

**Error**: "Build failed or manifest missing"

1. Verify `vite.config.ts` has `build.manifest: true`
2. Run `pnpm --filter web build` manually to see errors
3. Check Turbo cache: `pnpm turbo run build --force`

### Deployment Issues

**Error**: "Environment variable VITE_API_URL not defined"

1. Go to Vercel Project → Settings → Environment Variables
2. Add all required `VITE_*` variables
3. Redeploy

**Error**: "Failed to load application chunk"

1. Verify cache headers are configured (check Network tab)
2. Ensure `index.html` has `Cache-Control: no-cache`
3. Check `vite:preloadError` handler is in `main.tsx`
4. User should see refresh prompt automatically

---

## Performance Impact

### Expected Improvements

| Metric | Before | After | Improvement |
|--------|--------|-------|-------------|
| Bundle Size | TBD | TBD | Monitored ✅ |
| First Load | TBD | TBD | Cache strategy ✅ |
| Subsequent Loads | TBD | TBD | Immutable assets ✅ |
| Chunk Load Failures | Crashes | Graceful prompts | Error handler ✅ |

### Cache Hit Rates (Expected)

- HTML: 0% (always fresh)
- Assets: ~95% (1-year cache)
- Fonts: ~98% (rarely change)

---

## Industry Standards Compliance

This implementation follows official recommendations from:

- ✅ [Vite Production Build Guide](https://vite.dev/guide/build)
- ✅ [Vite Performance Guide](https://vite.dev/guide/performance)
- ✅ [Web.dev Performance Budgets](https://web.dev/performance-budgets-101/)
- ✅ [MDN Cache-Control Best Practices](https://developer.mozilla.org/en-US/docs/Web/HTTP/Caching)
- ✅ [OWASP Security Headers](https://owasp.org/www-project-secure-headers/)
- ✅ [Vercel Deployment Best Practices](https://vercel.com/docs/concepts/deployments/overview)

---

## Maintenance

### Weekly

- [ ] Review bundle size trends
- [ ] Check for outdated dependencies affecting bundle
- [ ] Monitor Vercel Analytics for performance regressions

### Monthly

- [ ] Audit large dependencies for lighter alternatives
- [ ] Review chunk splitting strategy effectiveness
- [ ] Update performance budgets if needed

### Quarterly

- [ ] Re-baseline after major features
- [ ] Review CSP implementation feasibility
- [ ] Evaluate new Vite/Rolldown optimizations

---

## Success Metrics

### Short Term (1 month)

- [ ] Bundle size stays < 800 KB total
- [ ] Zero chunk load errors in production
- [ ] Cache hit rate > 90% for assets
- [ ] All PRs validate against bundle budget

### Long Term (3 months)

- [ ] Core Web Vitals: Good on all metrics
- [ ] Bundle size trend: Stable or decreasing
- [ ] Zero security header violations
- [ ] CSP implementation completed

---

## Resources

- [Bundle Gate README](../tools/ci-gate/bundle/README.md)
- [Vercel Deployment Guide](./VERCEL_DEPLOYMENT.md)
- [CSP Implementation Guide](./CSP_IMPLEMENTATION.md)
- [Vite Industry Quality Skill](../.agents/skills/vite-industry-quality/SKILL.md)
- [Vite Official Skill](../.agents/skills/vite/SKILL.md)

---

**Implementation Lead**: GitHub Copilot  
**Review Status**: Ready for Production  
**Last Updated**: March 25, 2026
