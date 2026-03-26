# Content Security Policy (CSP) Implementation Guide

## Overview

This guide covers implementing strict Content Security Policy (CSP) for production deployments of the AFENDA Meta UI application.

## Current Status

✅ **Basic Security Headers** - Configured in `vercel.json`  
⚠️ **CSP Headers** - Not yet implemented (requires nonce support)  
📋 **Implementation Guidance** - Documented below

## Why CSP Matters

CSP prevents:
- Cross-Site Scripting (XSS) attacks
- Clickjacking attempts
- Unauthorized data exfiltration
- Code injection vulnerabilities

Industry compliance requirements (SOC 2, PCI-DSS, HIPAA) often mandate strict CSP.

## Quick Start (Permissive CSP)

For immediate deployment with basic protection, add to `vercel.json`:

```json
{
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "Content-Security-Policy",
          "value": "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https://us.i.posthog.com; frame-ancestors 'none'; base-uri 'self'; form-action 'self'"
        }
      ]
    }
  ]
}
```

**⚠️ Warning**: This uses `unsafe-inline` and `unsafe-eval` which weakens CSP protection.

## Strict CSP Implementation (Recommended)

### Prerequisites

1. **Remove Inline Scripts** - Already done ✅ (Vite bundles everything)
2. **Nonce Support** - Need to implement (see below)
3. **No eval()** - Verify no dependencies use eval
4. **Asset Inlining** - Configure Vite appropriately

### Step 1: Configure Vite for CSP

Update `apps/web/vite.config.ts`:

```typescript
export default defineConfig({
  build: {
    // Disable inline assets to avoid data: URIs violating CSP
    assetsInlineLimit: 0,
    
    // Generate CSP-compatible HTML
    // Note: Requires custom plugin for nonce injection
  },
});
```

### Step 2: Create Nonce Injection Plugin

Create `apps/web/vite-plugin-csp-nonce.ts`:

```typescript
import type { Plugin } from 'vite';
import { createHash } from 'crypto';

export function cspNoncePlugin(): Plugin {
  return {
    name: 'vite-plugin-csp-nonce',
    enforce: 'post',
    transformIndexHtml(html) {
      // In production, nonce is generated server-side
      // This is a build-time placeholder
      const nonce = process.env.CSP_NONCE || '__CSP_NONCE__';
      
      // Add nonce to all script and style tags
      html = html.replace(
        /<script/g,
        `<script nonce="${nonce}"`
      );
      
      html = html.replace(
        /<style/g,
        `<style nonce="${nonce}"`
      );
      
      return html;
    },
  };
}
```

Add to `vite.config.ts`:

```typescript
import { cspNoncePlugin } from './vite-plugin-csp-nonce';

export default defineConfig({
  plugins: [
    react(),
    cspNoncePlugin(),
    // ... other plugins
  ],
});
```

### Step 3: Server-Side Nonce Generation

For Vercel Edge Functions, create `apps/web/api/_middleware.ts`:

```typescript
import type { NextRequest, NextResponse } from 'next/server';
import { randomBytes } from 'crypto';

export function middleware(request: NextRequest) {
  const nonce = randomBytes(16).toString('base64');
  
  // Store nonce for this request
  const response = NextResponse.next();
  
  // Set CSP header with nonce
  response.headers.set(
    'Content-Security-Policy',
    `default-src 'self'; ` +
    `script-src 'self' 'nonce-${nonce}'; ` +
    `style-src 'self' 'nonce-${nonce}'; ` +
    `img-src 'self' data: https:; ` +
    `font-src 'self'; ` +
    `connect-src 'self' https://us.i.posthog.com; ` +
    `frame-ancestors 'none'; ` +
    `base-uri 'self'; ` +
    `form-action 'self'`
  );
  
  return response;
}
```

### Step 4: Update index.html

Ensure `apps/web/index.html` uses nonce placeholder:

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <!-- CSP meta tag for local dev -->
    <meta http-equiv="Content-Security-Policy" content="upgrade-insecure-requests">
    
    <!-- Server will inject nonce into script tags -->
    <title>%VITE_APP_TITLE%</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

### Step 5: Strict CSP Header (Production)

Final CSP header for production (in `vercel.json` or middleware):

```
Content-Security-Policy:
  default-src 'self';
  script-src 'self' 'nonce-{NONCE}';
  style-src 'self' 'nonce-{NONCE}';
  img-src 'self' data: https:;
  font-src 'self';
  connect-src 'self' https://us.i.posthog.com https://api.afenda.io;
  frame-ancestors 'none';
  base-uri 'self';
  form-action 'self';
  upgrade-insecure-requests;
  block-all-mixed-content;
```

## CSP Directives Explained

| Directive | Value | Purpose |
|-----------|-------|---------|
| `default-src 'self'` | Only load resources from same origin | Baseline security |
| `script-src 'self' 'nonce-{NONCE}'` | Scripts from same origin or with nonce | Prevent XSS |
| `style-src 'self' 'nonce-{NONCE}'` | Styles from same origin or with nonce | Prevent style injection |
| `img-src 'self' data: https:` | Images from same origin, data URIs, or HTTPS | Allow hosted images |
| `font-src 'self'` | Fonts from same origin only | Prevent font-based tracking |
| `connect-src 'self' https://...` | API/WebSocket connections allowed | Control data flow |
| `frame-ancestors 'none'` | Prevent embedding in iframes | Anti-clickjacking |
| `base-uri 'self'` | Prevent `<base>` tag hijacking | Security hardening |
| `form-action 'self'` | Forms submit to same origin only | Prevent form hijacking |

## Testing CSP

### 1. CSP Report-Only Mode

Test without breaking functionality:

```json
{
  "headers": [
    {
      "key": "Content-Security-Policy-Report-Only",
      "value": "default-src 'self'; script-src 'self' 'nonce-{NONCE}'; report-uri /api/csp-report"
    }
  ]
}
```

### 2. Browser DevTools

1. Open Chrome DevTools → Console
2. Look for CSP violation warnings
3. Identify blocked resources

### 3. CSP Validator

Use [CSP Evaluator](https://csp-evaluator.withgoogle.com/) to validate policy.

## Common CSP Issues

### Issue: Inline styles in third-party components

**Solution**: Extract to external stylesheet or use nonce

### Issue: `eval()` in dependencies

**Solution**: Replace dependency or use `unsafe-eval` (reduces security)

### Issue: Dynamic script loading

**Solution**: Use Vite's dynamic imports, not manual script injection

### Issue: Analytics/monitoring tools

**Solution**: Add domains to `connect-src`:

```
connect-src 'self' https://us.i.posthog.com https://api.segment.io
```

## Gradual Rollout Strategy

1. **Week 1** - Deploy Report-Only CSP, collect violations
2. **Week 2** - Fix violations, test in staging
3. **Week 3** - Deploy strict CSP to 10% of users (A/B test)
4. **Week 4** - Roll out to 100% if no issues

## Monitoring CSP Violations

### Option 1: CSP Report Endpoint

Create `apps/web/api/csp-report/route.ts`:

```typescript
import { NextRequest } from 'next/server';

export async function POST(request: NextRequest) {
  const violation = await request.json();
  
  // Log to monitoring service
  console.error('CSP Violation:', {
    blockedURI: violation['blocked-uri'],
    violatedDirective: violation['violated-directive'],
    sourceFile: violation['source-file'],
    lineNumber: violation['line-number'],
  });
  
  return new Response('OK', { status: 200 });
}
```

### Option 2: Third-Party Services

- [Report URI](https://report-uri.com/)
- [Sentry CSP Reporting](https://docs.sentry.io/product/security-policy-reporting/)
- [Datadog CSP Monitoring](https://www.datadoghq.com/blog/csp-monitoring/)

## Resources

- [MDN: Content Security Policy](https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP)
- [Google CSP Best Practices](https://web.dev/strict-csp/)
- [OWASP CSP Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Content_Security_Policy_Cheat_Sheet.html)
- [Vite CSP Plugin](https://github.com/vitejs/vite/discussions/8892)

## Implementation Checklist

- [ ] Review current dependencies for CSP compatibility
- [ ] Add `assetsInlineLimit: 0` to vite.config.ts
- [ ] Create nonce injection plugin
- [ ] Set up server-side nonce generation
- [ ] Deploy Report-Only CSP header
- [ ] Monitor violations for 1 week
- [ ] Fix reported violations
- [ ] Deploy strict CSP to staging
- [ ] A/B test in production (10%)
- [ ] Full rollout to production
- [ ] Set up violation monitoring alerts

## Current Vercel Configuration

The existing `vercel.json` includes:

✅ `X-Content-Type-Options: nosniff`  
✅ `X-Frame-Options: DENY`  
✅ `X-XSS-Protection: 1; mode=block`  
✅ `Referrer-Policy: strict-origin-when-cross-origin`  
✅ `Permissions-Policy` (restricts browser features)  
⚠️ CSP header not yet configured (requires nonce implementation)

## Next Steps

1. **Immediate** - Current security headers are sufficient for launch
2. **Phase 2** - Implement nonce-based CSP (2-4 week project)
3. **Ongoing** - Monitor CSP violations and adjust policy

---

**Status**: Documentation complete, implementation deferred to Phase 2  
**Owner**: Security/DevOps team  
**Priority**: Medium (current headers provide baseline protection)
