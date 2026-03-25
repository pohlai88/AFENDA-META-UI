# Vercel Deployment Guide

## Overview

This document covers deploying the AFENDA Meta UI application to Vercel with optimized caching, security headers, and performance monitoring.

## Quick Start

### Prerequisites

- Vercel CLI installed: `pnpm install -g vercel`
- Vercel account connected to GitHub repository
- Environment variables configured in Vercel project settings

### Deploy Commands

```bash
# Preview deployment (PR)
vercel

# Production deployment
vercel --prod

# Deploy specific branch
vercel --scope=your-team --prod
```

## Configuration

### vercel.json Structure

The repository includes two `vercel.json` files:

1. **Root** (`/vercel.json`) - Workspace-level configuration
2. **Web App** (`/apps/web/vercel.json`) - App-specific configuration

Vercel will use the **root** `vercel.json` by default.

### Current Configuration

```json
{
  "buildCommand": "pnpm --filter web build",
  "outputDirectory": "apps/web/dist",
  "installCommand": "pnpm install --frozen-lockfile",
  "framework": null
}
```

### Cache Control Headers

#### HTML Files (index.html)

```
Cache-Control: no-cache, no-store, must-revalidate
```

**Why**: Prevents stale chunk references after deployments. Users always get the latest HTML pointing to current asset versions.

#### Asset Files (/assets/*)

```
Cache-Control: public, max-age=31536000, immutable
```

**Why**: Hashed filenames (`index-DiGv-KaS.js`) never change content. Browsers can cache indefinitely, reducing bandwidth and improving load times.

#### Static Files (favicon, robots.txt)

```
Cache-Control: public, max-age=86400
```

**Why**: These files change infrequently (daily cache).

### Security Headers

Configured for all routes:

| Header | Value | Purpose |
|--------|-------|---------|
| `X-Content-Type-Options` | `nosniff` | Prevent MIME sniffing attacks |
| `X-Frame-Options` | `DENY` | Prevent clickjacking (no iframes) |
| `X-XSS-Protection` | `1; mode=block` | Enable browser XSS protection |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | Control referrer information leakage |
| `Permissions-Policy` | Restricts features | Disable unused browser APIs |

### SPA Routing

```json
{
  "rewrites": [
    {
      "source": "/((?!api/).*)",
      "destination": "/index.html"
    }
  ]
}
```

All non-API routes fall through to `index.html` for client-side routing (React Router).

## Environment Variables

### Required Variables

Configure in Vercel Project Settings → Environment Variables:

```bash
# Application
VITE_APP_TITLE="AFENDA Meta UI"
VITE_APP_ENV="production"

# API Backend
VITE_API_URL="https://api.afenda.io"

# Analytics (Optional)
VITE_ANALYTICS_PROVIDERS="posthog"
VITE_POSTHOG_API_KEY="phc_..."
VITE_POSTHOG_HOST="https://us.i.posthog.com"

# Feature Flags (Optional)
VITE_NOTIFICATION_TOAST_DEDUPE_MS="3000"
VITE_PERMISSIONS_BOOTSTRAP_ENDPOINT="/api/permissions"
```

### Environment-Specific Variables

| Environment | VITE_APP_ENV | VITE_API_URL |
|-------------|--------------|--------------|
| Production | `production` | `https://api.afenda.io` |
| Staging | `staging` | `https://api-staging.afenda.io` |
| Preview | `preview` | `https://api-dev.afenda.io` |

### Security Best Practices

⚠️ **Never use `VITE_*` prefix for secrets!**

All `VITE_*` variables are **inlined at build time** and visible in the browser bundle.

For server-side secrets (API keys, tokens):
- Use non-`VITE_` prefixed variables
- Access on server/API routes only
- Never expose in client code

## Build Configuration

### Monorepo Build Command

```bash
pnpm --filter web build
```

Turbo will automatically handle dependency builds (`@afenda/meta-types`, `@afenda/db`).

### Build Output

```
apps/web/dist/
├── index.html              # Entry point (non-cacheable)
├── assets/
│   ├── index-DiGv-KaS.js   # Main bundle (hashed, immutable)
│   ├── vendor-react-Abc123.js
│   ├── vendor-query-Def456.js
│   └── index-Ghi789.css
├── .vite/
│   └── manifest.json       # Asset manifest
└── favicon.svg
```

### Build Performance

Expected build times:
- Cold build: 30-60 seconds
- Turbo cached: 5-10 seconds

Vercel caches `node_modules` and Turbo cache between builds.

## Performance Optimization

### Bundle Size Monitoring

Automated bundle monitoring runs on every build via CI gate:

```bash
pnpm ci:gate:bundle
```

See [tools/ci-gate/bundle/README.md](../tools/ci-gate/bundle/README.md) for details.

### Performance Budgets

| Metric | Budget |
|--------|--------|
| Total JS | 800 KB |
| Total CSS | 100 KB |
| Main Entry | 300 KB |
| Vendor Chunk | 400 KB |
| FCP | < 1.8s |
| LCP | < 2.5s |
| TTI | < 3.8s |

### Optimization Checklist

- [x] Code splitting (`React.lazy()`, dynamic imports)
- [x] Vendor chunk splitting (5 vendor chunks)
- [x] CSS code splitting per route
- [x] Asset compression (Oxc minifier, LightningCSS)
- [x] Tree shaking (ESM imports, sideEffects: false)
- [x] Image optimization (WebP, lazy loading)
- [ ] HTTP/2 Server Push (todo: investigate Vercel support)
- [ ] Brotli compression (automatic on Vercel)

## Deployment Workflow

### Automatic Deployments

GitHub integration triggers deployments:

1. **Pull Request** → Preview deployment
   - Unique URL: `afenda-meta-ui-git-{branch}-{team}.vercel.app`
   - Posted as PR comment
   - Runs bundle monitoring CI

2. **Merge to main** → Production deployment
   - Domain: `afenda-meta-ui.vercel.app` (or custom domain)
   - Updates bundle baseline
   - Tags deployment in monitoring

### Manual Deployment

From local machine:

```bash
# Preview (does not affect production)
vercel

# Production (requires confirmation)
vercel --prod
```

### Rollback

```bash
# List recent deployments
vercel ls

# Promote previous deployment
vercel promote <deployment-url>
```

Or use Vercel Dashboard → Deployments → Promote.

## Monitoring

### Vercel Analytics

Enabled automatically for Pro/Enterprise plans:

- Core Web Vitals (LCP, FID, CLS)
- Real User Monitoring (RUM)
- Geographic performance breakdown

Access: Vercel Dashboard → Analytics

### Bundle Size Tracking

CI gate tracks bundle size on every build:

```bash
# Generate report
pnpm ci:gate:bundle --report

# Compare to baseline
pnpm ci:gate:bundle
```

Baseline stored in `tools/ci-gate/bundle/baseline.json`.

### Error Tracking

For production error monitoring, integrate:

- **Sentry** (recommended) - Full stack traces, breadcrumbs
- **Datadog RUM** - Application Performance Monitoring
- **PostHog** - Session replay + analytics

## Troubleshooting

### Build Fails

**Error**: `pnpm: command not found`  
**Fix**: Ensure `packageManager` is set in root `package.json`

**Error**: `Cannot find module '@afenda/meta-types'`  
**Fix**: Turbo should build dependencies first. Check `turbo.json` dependencies.

**Error**: `ENOSPC: no space left on device`  
**Fix**: Vercel build container full. Contact support or reduce `node_modules` size.

### Deployment Fails

**Error**: `Output directory "apps/web/dist" is empty`  
**Fix**: Build command may have failed silently. Check build logs.

**Error**: `Environment variable VITE_API_URL is not defined`  
**Fix**: Set in Vercel Project Settings → Environment Variables.

### Runtime Errors

**Error**: `Failed to load application chunk`  
**Fix**: Handled by `vite:preloadError` listener in `main.tsx`. User prompted to refresh.

**Error**: `404 on /api/...`  
**Fix**: Configure `VITE_API_URL` to point to correct backend.

## Custom Domain

### Add Domain

1. Vercel Dashboard → Project → Settings → Domains
2. Add domain: `app.afenda.io`
3. Configure DNS:
   - Type: `CNAME`
   - Name: `app` (or `@` for apex)
   - Value: `cname.vercel-dns.com`

### SSL Certificates

Automatic via Let's Encrypt (free, auto-renewing).

### Domain Aliases

```json
{
  "alias": [
    "afenda.io",
    "www.afenda.io",
    "app.afenda.io"
  ]
}
```

## CI/CD Integration

### GitHub Actions Workflow

```yaml
name: Deploy to Vercel
on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v5
      - uses: actions/setup-node@v5
        with:
          node-version: 20
      
      - name: Install Vercel CLI
        run: pnpm install -g vercel
      
      - name: Pull Vercel Environment
        run: vercel pull --yes --environment=production --token=${{ secrets.VERCEL_TOKEN }}
      
      - name: Build Project
        run: vercel build --prod --token=${{ secrets.VERCEL_TOKEN }}
      
      - name: Deploy to Vercel
        run: vercel deploy --prebuilt --prod --token=${{ secrets.VERCEL_TOKEN }}
```

### Required Secrets

Add to GitHub repository settings:

- `VERCEL_TOKEN` - Vercel API token (Settings → Tokens)
- `VERCEL_ORG_ID` - Team ID (`.vercel/project.json`)
- `VERCEL_PROJECT_ID` - Project ID (`.vercel/project.json`)

## Best Practices

1. ✅ **Always use `--frozen-lockfile`** - Ensures reproducible builds
2. ✅ **Monitor bundle size** - Run `pnpm ci:gate:bundle` before merge
3. ✅ **Test preview deployments** - Catch issues before production
4. ✅ **Set cache headers** - Already configured in `vercel.json`
5. ✅ **Use environment variables** - Never hardcode API URLs
6. ⚠️ **Review Vercel logs** - Check for build warnings
7. ⚠️ **Update baseline after optimization** - `pnpm ci:gate:bundle --update`

## Resources

- [Vercel Documentation](https://vercel.com/docs)
- [Vercel CLI Reference](https://vercel.com/docs/cli)
- [Vercel monorepo guide](https://vercel.com/docs/monorepos)
- [Performance Best Practices](https://web.dev/vitals/)

## Support

- Vercel Dashboard: https://vercel.com/dashboard
- Vercel Support: support@vercel.com
- Internal: #deployments Slack channel

---

**Last Updated**: March 25, 2026  
**Configuration Version**: 1.0  
**Maintained By**: DevOps Team
