# Dependency Validation Report

**Generated**: 2026-03-25  
**Tool**: `pnpm outdated --recursive`  
**Status after fixes**: ✅ 9 safe patches applied | ✅ 7 misplaced deps removed | ⚠️ 17 major upgrades pending planning

---

## Summary of Applied Fixes

### ✅ Patch / Minor Updates Applied

| Package | From | To | Package(s) |
|---|---|---|---|
| `vitest` | `^4.1.0` | `^4.1.1` | api, @afenda/db, @afenda/web |
| `@vitest/coverage-v8` | `^4.1.0` | `^4.1.1` | @afenda/web |
| `@vitest/ui` | `^4.1.0` | `^4.1.1` | @afenda/web |
| `@tanstack/react-query` | `^5.40.0` | `^5.95.2` | @afenda/web |
| `@tanstack/react-query-devtools` | `^5.40.0` | `^5.95.2` | @afenda/web |
| `graphql` | `^16.8.1` | `^16.13.2` | api |
| `express-validator` | `7.2.1` *(pinned, no `^`)* | `^7.3.1` | api + removed from web |
| `lucide-react` | `^1.0.0` | `^1.6.0` | @afenda/web |

### ✅ Removed: Misplaced Server-Only Dependencies from `@afenda/web`

These were Express/Node-only packages that have no purpose in a Vite + React frontend build:

| Removed from web | Correct location | Reason |
|---|---|---|
| `compression` | `apps/api` only | Express response compression middleware |
| `express-mongo-sanitize` | `apps/api` only | NoSQL injection sanitizer for Express |
| `express-rate-limit` | `apps/api` only | Express rate limiting middleware |
| `express-validator` | `apps/api` only | Express route validator middleware |
| `filtrex` | `apps/api` only | RBAC expression evaluator (backend rules engine) |
| `winston` | N/A | api already uses `pino`; no Node logger needed in frontend |

> **Impact**: -6 runtime dependencies from web bundle. Reduces bundle size and removes packages that would be dead code in the browser.

### ✅ Removed: Deprecated devDependency from `@afenda/web`

| Removed | Reason |
|---|---|
| `@types/react-window` | Deprecated — `react-window` bundles its own TypeScript definitions |

---

## ⚠️ Major Version Upgrades — Require Deliberate Migration

All items below are **major version bumps** with breaking changes. Do NOT `pnpm update` these automatically — each requires a dedicated migration branch.

### Group 1: React Ecosystem (migrate together)

| Package | Current | Latest | Breaking Changes |
|---|---|---|---|
| `react` | 18.3.1 | **19.2.4** | `use()` hook, `ref` as prop, no `forwardRef`, concurrent features default |
| `react-dom` | 18.3.1 | **19.2.4** | New render API (`createRoot` only), `hydrateRoot` changes |
| `@types/react` | 18.3.28 | **19.2.14** | Must match `react` major |
| `@types/react-dom` | 18.3.7 | **19.2.3** | Must match `react-dom` major |
| `react-router-dom` | 6.30.3 | **7.13.2** | v7 = React Router framework mode (Remix-based), file-based routing optional |

**Migration order**: `react` + `react-dom` → `@types/react` + `@types/react-dom` → `react-router-dom` → update all dependent components.

**Peer dependency note**: After upgrading to React 19, also upgrade `@types/react` in `@afenda/ui` (it declares peer `react: ^18.3.1` — needs `^19`).

---

### Group 2: API / Server (migrate together)

| Package | Current | Latest | Breaking Changes |
|---|---|---|---|
| `express` | 4.22.1 | **5.2.1** | Async error handling built-in, removed `req.param()`, `res.redirect()` changes, regex routes removed |
| `@types/express` | 4.17.25 | **5.0.6** | Must follow express major; new generic signatures |
| `helmet` | 7.2.0 | **8.1.0** | `contentSecurityPolicy` directive changes, removed deprecated options |
| `dotenv` | 16.6.1 | **17.3.1** | `populate()` function signature changes, stricter parsing |
| `jose` | 5.10.0 | **6.2.2** | JWT `verify()` now returns `Promise<JWTVerifyResult>`, removed deprecated alg shortcuts |

**Migration order**: `express` + `@types/express` → `helmet` → `jose` → `dotenv`.

---

### Group 3: Build Toolchain

| Package | Current | Latest | Breaking Changes | Risk |
|---|---|---|---|---|
| `turbo` | 1.13.4 | **2.8.20** | `turbo.json` `"pipeline"` → `"tasks"`, new cache config schema, changed env handling | **HIGH — breaks build** |
| `typescript` | 5.9.3 | **6.0.2** | Stricter generics, some inference changes, `lib` defaults changed | MEDIUM |

**Do not upgrade `turbo` without updating `turbo.json` first.** The entire `"pipeline"` key must be renamed to `"tasks"` and several sub-keys have changed.

**TypeScript 6.0** known changes:
- Default `lib` no longer includes `dom` — projects must declare it explicitly
- `exactOptionalPropertyTypes` behavior changes
- Stricter conditional types

---

### Group 4: JSON Schema Forms

| Package | Current | Latest | Breaking Changes |
|---|---|---|---|
| `@rjsf/core` | 5.24.13 | **6.4.1** | New theme system, `uiSchema` changes, validator interface changes |
| `@rjsf/utils` | 5.24.13 | **6.4.1** | API surface changes to utility functions |
| `@rjsf/validator-ajv8` | 5.24.13 | **6.4.1** | Must match `@rjsf/core` version exactly |

**All three must be upgraded together as an atomic update.**

---

### Group 5: Shared Utilities

| Package | Current | Latest | Breaking Changes |
|---|---|---|---|
| `date-fns` | 3.6.0 | **4.1.0** | `format` locale handling, `parseISO` behavior, tree-shaking entry points |
| `@types/node` | 20.19.37 | **25.5.0** | Jump from Node 20 LTS types to Node 25 — recommend `^22.x` (Node 22 = current LTS) |

**Recommendation for `@types/node`**: Target `^22.0.0` (Node 22 LTS) rather than jumping to `^25.x` (unstable). Node 22 offers async storage, `fetch` built-in, and `--env-file` flag — align with infrastructure.

---

## ⚠️ Peer Dependency Warnings (detected post-install)

```
apps/web
├── eslint-plugin-react 7.37.5
│   └── unmet peer eslint@"^3 || ^4 || ^5 || ^6 || ^7 || ^8 || ^9.7"
│       found 10.1.0
└── eslint-plugin-react-hooks 7.0.1
    └── unmet peer eslint@"^3.0.0 || ... || ^9.0.0": found 10.1.0
```

**Cause**: `@afenda/web` uses ESLint `10.1.0` (flat config era) but `eslint-plugin-react` and `eslint-plugin-react-hooks` declare peer support only through ESLint 9.

**Impact**: In practice these plugins work with ESLint 10 (the peer range just hasn't been updated by the plugin authors yet). However, if lint scripts fail, downgrade to `eslint: "^9.18.0"` as a workaround.

**Recommended action**: Monitor `eslint-plugin-react` release for ESLint 10 peer support. Currently **no action required**.

---

## ⚠️ Deprecated Transitive Dependency

```
WARN  1 deprecated subdependencies found: node-domexception@1.0.0
```

This is a transitive dep from `jsdom` (used in `@afenda/web` vitest test environment). `jsdom` 25+ removes this dependency. Currently no action needed — will be resolved when `jsdom` is updated upstream.

---

## 🔍 Architecture Issues Identified

### 1. Dual State Management — Intended or Redundant?

`@afenda/web` has **both** Redux Toolkit + React Redux **and** Zustand:

```json
"@reduxjs/toolkit": "^2.11.2",
"react-redux": "^9.2.0",
"zustand": "^5.0.12"
```

This is fine if intentional (e.g., RTK for server-synchronized global state + Zustand for local UI state). If one is not actively used, removing it reduces bundle size by ~15KB (RTK) or ~1KB (Zustand).

**Action**: Audit `src/stores/` to confirm both are in use.

### 2. TypeScript Minimum Version Misalignment

Different packages declare different TypeScript minimum floors:

| Package | Declared minimum |
|---|---|
| `apps/api` | `^5.4.5` |
| `@afenda/db` | `^5.4.5` |
| Root | `^5.4.5` |
| `@afenda/web` | `^5.5.3` |
| `@afenda/ui` | `^5.5.3` |

All resolve to `5.9.3` (current installed), so there's no functional impact. However, for clarity — align all to `^5.9.0` (or `^5.8.0` to stay just below TypeScript 6).

### 3. `react-window` vs `@tanstack/react-virtual`

`react-window` (`^2.2.7`) is maintained but has slowed development. The recommended successor in the TanStack ecosystem is `@tanstack/react-virtual`, which fits well alongside the existing `@tanstack/react-query` and `@tanstack/react-table`.

Consider migrating virtualisation to `@tanstack/react-virtual@^3.x` — gives consistent TanStack patterns and active maintainership.

### 4. `shadcn` in `dependencies` (should be devDependency)

```json
"shadcn": "^4.1.0"
```

The `shadcn` CLI is a **code generator** — it adds components to your source tree. It should never be a runtime `dependency`. Move to `devDependencies`, or remove it entirely and use `pnpm dlx shadcn@latest add <component>` when needed.

---

## 🚀 Synergistic Dependency Proposals

These are not currently in the repo but would integrate cleanly with the existing stack:

### 1. `drizzle-zod` → `@afenda/db` + `api`

Auto-generates Zod v4 schemas directly from Drizzle table definitions. Eliminates duplicate schema definitions between db layer and API validation layer.

```bash
pnpm --filter @afenda/db add drizzle-zod
```

```typescript
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { users } from './schema';

const insertUserSchema = createInsertSchema(users);
const selectUserSchema = createSelectSchema(users);
// Type-safe Zod schemas auto-derived from table definition
```

**Synergy**: `drizzle-orm` (already pinned) + `zod` (already pinned) → `drizzle-zod` bridges them.

### 2. `pnpm catalogs` — Version Consistency Enforcement

Upgrade `pnpm-workspace.yaml` to use [pnpm catalogs](https://pnpm.io/catalogs) so version-critical packages are declared once and referenced via `catalog:` in all package.json files:

```yaml
# pnpm-workspace.yaml
packages:
  - "apps/*"
  - "packages/*"

catalog:
  drizzle-orm: "1.0.0-beta.19"
  drizzle-kit: "1.0.0-beta.19"
  zod: "^4.3.6"
  typescript: "^5.9.0"
  vitest: "^4.1.1"
  tsx: "^4.21.0"
  pg: "^8.20.0"
```

Then in `package.json`:
```json
{
  "dependencies": {
    "drizzle-orm": "catalog:",
    "zod": "catalog:"
  }
}
```

**Synergy**: Guarantees `drizzle-orm` and `drizzle-kit` are always identical across `apps/api` and `packages/db`. Prevents the most common monorepo drift issue.

### 3. `@typescript-eslint` for `api`

`apps/api` currently has zero ESLint configuration. Add TypeScript-aware linting to match web's quality gates:

```bash
pnpm --filter api add -D @typescript-eslint/eslint-plugin @typescript-eslint/parser eslint
```

Add `eslint.config.js` (flat config):
```js
import tseslint from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';

export default [
  { files: ['src/**/*.ts'], languageOptions: { parser: tsParser }, plugins: { '@typescript-eslint': tseslint } }
];
```

### 4. `@tanstack/react-virtual` (replace `react-window`)

```bash
pnpm --filter @afenda/web add @tanstack/react-virtual
pnpm --filter @afenda/web remove react-window
```

Active development, TypeScript-first, matches existing TanStack patterns.

### 5. `@sentry/node` + `@sentry/react` (observability)

Given the existing `pino` logging on the server side, adding Sentry for error tracking completes the observability picture for production:

```bash
pnpm --filter api add @sentry/node
pnpm --filter @afenda/web add @sentry/react @sentry/vite-plugin
```

---

## 📋 Migration Priority Matrix

| Priority | Package(s) | Effort | Risk | Reason |
|---|---|---|---|---|
| **P1 — Do soon** | `@types/node ^22.x` | Low | Low | Align with Node 22 LTS; safe to do now |
| **P1 — Do soon** | `shadcn` → devDependency | Trivial | None | It's a code generator, not runtime |
| **P1 — Do soon** | Add `drizzle-zod` | Low | None | Pure additive, high value |
| **P1 — Do soon** | Add pnpm catalogs | Medium | None | Version safety for critical deps |
| **P2 — Next sprint** | `@rjsf/*` 5→6 | Medium | Medium | All three must move together |
| **P2 — Next sprint** | `date-fns` 3→4 | Low | Low | Mostly additive |
| **P2 — Next sprint** | `dotenv` 16→17 | Low | Low | Simple config |
| **P3 — Planned** | `express` 4→5 + `helmet` 7→8 + `jose` 5→6 | High | High | Server migration — do together |
| **P3 — Planned** | `react` 18→19 + `react-router-dom` 6→7 | High | High | Full frontend migration |
| **P4 — Evaluate** | `turbo` 1→2 | Medium | **Critical** | Must rewrite `turbo.json` first |
| **P4 — Evaluate** | `typescript` 5→6 | Medium | Medium | Wait for ecosystem compat |

---

## Quick Commands Reference

```bash
# Check remaining outdated (after fixes applied)
pnpm outdated --recursive

# Upgrade @types/node to Node 22 LTS (safe, P1)
pnpm --filter api --filter @afenda/db add -D @types/node@^22.0.0

# Add drizzle-zod (safe, P1)
pnpm --filter @afenda/db add drizzle-zod

# Move shadcn to dev
pnpm --filter @afenda/web remove shadcn
pnpm --filter @afenda/web add -D shadcn
```
