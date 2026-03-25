# Monorepo Dependency Map

This document catalogues all dependencies with their roles in the monorepo, version alignment requirements, and configuration notes.

Governance policy and PR workflow references:

- [Dependency Governance Policy](../../docs/DEPENDENCY_GOVERNANCE_POLICY.md)
- [Dependency Change Checklist](../../docs/DEPENDENCY_CHANGE_CHECKLIST.md)

---

## Root-Level DevDependencies (shared tooling)

| Package | Version | Purpose | Notes |
|---|---|---|---|
| `turbo` | ^1.13.4 | Task orchestration (build, dev, lint, test) | v1 — uses `"pipeline"` in turbo.json |
| `typescript` | ^5.4.5 | TypeScript compiler | Base config in `tsconfig.base.json` |
| `prettier` | ^3.8.1 | Code formatter | Config in `.prettierrc` |
| `eslint-config-prettier` | ^10.1.8 | Disable ESLint rules that conflict with Prettier | |
| `glob` | ^13.0.6 | File globbing (used by ci-gate) | |

---

## `apps/api` Dependencies

### Runtime
| Package | Version | Purpose | Config Required |
|---|---|---|---|
| `drizzle-orm` | 1.0.0-beta.19 | ORM | Must match `@afenda/db` version exactly |
| `express` | ^4.19.2 | HTTP framework | |
| `graphql-yoga` | ^5.0.0 | GraphQL server | |
| `drizzle-graphql` | ^0.8.0 | Auto-generate GraphQL from Drizzle schema | |
| `graphql` | ^16.8.1 | GraphQL core | |
| `pg` | ^8.11.5 | PostgreSQL driver | `DATABASE_URL` env var |
| `zod` | ^4.3.6 | Schema validation | |
| `jose` | ^5.2.4 | JWT sign/verify | Configure secret key |
| `pino` + `pino-http` | ^10/^11 | Structured JSON logging | Use `pino-pretty` in dev |
| `helmet` | ^7.1.0 | HTTP security headers | |
| `express-rate-limit` | ^8.3.1 | Rate limiting | Configure in middleware |
| `express-mongo-sanitize` | ^2.2.0 | NoSQL injection protection | |
| `express-validator` | 7.2.1 | Request validation | |
| `cors` | ^2.8.5 | CORS middleware | Configure allowed origins |
| `multer` | ^2.1.1 | File upload handling | |
| `@aws-sdk/client-s3` | ^3.1016.0 | S3 file storage | AWS credentials env vars |
| `compression` | ^1.8.1 | HTTP response compression | |
| `filtrex` | ^3.1.0 | Expression evaluation (RBAC rules) | |
| `dotenv` | ^16.4.5 | `.env` file loading | |

### DevDependencies
| Package | Version | Purpose |
|---|---|---|
| `tsx` | ^4.10.5 | TypeScript execute for dev server |
| `drizzle-kit` | 1.0.0-beta.19 | DB migrations (must match drizzle-orm) |
| `vitest` | ^4.1.0 | Unit testing |
| `supertest` | ^7.2.2 | HTTP integration testing |
| `pino-pretty` | ^13.1.3 | Human-readable pino logs in dev |
| `commander` | ^14.0.3 | CLI argument parsing |

---

## `apps/web` Dependencies

### Runtime
| Package | Version | Purpose | Config Required |
|---|---|---|---|
| `react` + `react-dom` | ^18.3.1 | UI framework | |
| `@reduxjs/toolkit` | ^2.11.2 | State management | store in `src/` |
| `@tanstack/react-query` | ^5.40.0 | Server state / data fetching | Configure `QueryClient` |
| `@tanstack/react-table` | ^8.21.3 | Headless table | |
| `react-hook-form` | ^7 (peer) | Form state management | |
| `@hookform/resolvers` | ^5.2.2 | Zod resolver for RHF | |
| `zod` | ^4 | Schema validation | Shared with api |
| `@rjsf/core` + `@rjsf/validator-ajv8` | ^5.19.4 | JSON Schema dynamic forms | |
| `@afenda/meta-types` | workspace:* | Shared types | |
| `@afenda/ui` | workspace:* | Shared components | |
| `class-variance-authority` | ^0.7.1 | Component variant styling | |
| `clsx` + `tailwind-merge` | ^2/^3 | CSS class merging | |
| `cmdk` | ^1.1.1 | Command palette | |
| `sonner` | ^2.0.7 | Toast notifications | |
| `next-themes` | ^0.4.6 | Theme (dark/light) switching | |
| `date-fns` | ^3.6.0 | Date utilities | |
| `react-day-picker` | ^9.14.0 | Date picker UI | |
| `@dnd-kit/*` | ^6/^10/^3 | Drag and drop | |
| `@tiptap/react` + extensions | ^3.20.5 | Rich text editor | |
| `react-window` + types | — | Virtual list rendering | |
| `@fontsource-variable/geist` | ^5.2.8 | Geist variable font | Import in `src/index.css` |

### Build Tools (devDependencies)
| Package | Version | Purpose | Config |
|---|---|---|---|
| `vite` | ^5 | Build bundler | `vite.config.ts` |
| `@vitejs/plugin-react` | — | React HMR/transform | In `vite.config.ts` |
| `tailwindcss` + `@tailwindcss/vite` | v4 | CSS utility framework | `postcss.config.js` |
| `vitest` | ^4.1.0 | Unit/component testing | `vitest.config.ts` |
| `@playwright/test` | — | E2E testing | `playwright.config.ts` |
| `eslint` + plugins | — | Linting | `eslint.config.js` |
| `husky` | — | Git hooks | `.husky/` dir |

---

## `packages/db` (@afenda/db)

| Package | Version | Purpose | Notes |
|---|---|---|---|
| `drizzle-orm` | 1.0.0-beta.19 | ORM core | Must match `apps/api` |
| `pg` | — | PostgreSQL driver | `DATABASE_URL` env var |
| `drizzle-kit` | 1.0.0-beta.19 | Migrations | `drizzle.config.ts` at pkg root |
| `tsx` | — | Run seed scripts | |

---

## `packages/ui` (@afenda/ui)

Peer dependencies (consumers install these):
| Package | Version Pinned | Notes |
|---|---|---|
| `react` + `react-dom` | ^18.3.1 | |
| `lucide-react` | ^1.0.0 | Icon library |
| `radix-ui` | ^1.4.3 | Accessible primitives |
| `date-fns` | ^3.6.0 | Date utilities |
| `react-day-picker` | ^9.14.0 | Date picker |
| `react-hook-form` | ^7.72.0 | Forms |
| `next-themes` | ^0.4.6 | Theme switching |
| `cmdk` | ^1.1.1 | Command palette |
| `sonner` | ^2.0.7 | Toasts |

Runtime (bundled):
| Package | Version | Purpose |
|---|---|---|
| `class-variance-authority` | ^0.7.1 | Component variants |
| `clsx` | ^2.1.1 | Class merging |
| `tailwind-merge` | ^3.5.0 | Tailwind class dedup |

---

## Version Alignment Critical Pairs

These packages **must be the same version** across all workspace members:

| Package | All Must Use | Reason |
|---|---|---|
| `drizzle-orm` | `1.0.0-beta.19` | Schema type compatibility |
| `drizzle-kit` | `1.0.0-beta.19` | Must match drizzle-orm |
| `typescript` | `^5.4.5` | Shared type definitions |
| `zod` | `^4.3.6` | Schema type compatibility |

---

## Recommended Missing Configurations

These are not yet configured but are referenced by tooling:

### 1. `turbo.json` — Add `globalDependencies` for precise caching

```json
{
  "globalDependencies": [
    "tsconfig.base.json",
    ".env"
  ]
}
```

### 2. `pnpm-workspace.yaml` — Add `tools/*` to expose ci-gate as managed workspace

```yaml
packages:
  - "apps/*"
  - "packages/*"
  # - "tools/*"  ← optional, only if ci-gate needs workspace deps
```

### 3. `turbo.json` — Add `test` task for unified test orchestration

```json
"test": {
  "dependsOn": ["^build"],
  "outputs": ["coverage/**"],
  "cache": true
}
```

### 4. Turborepo Remote Cache (CI)

Add to CI environment:
```
TURBO_TOKEN=<vercel-token>
TURBO_TEAM=<team-slug>
```

### 5. pnpm Catalogs (optional, for version alignment)

Upgrade `pnpm-workspace.yaml` to use catalogs:
```yaml
packages:
  - "apps/*"
  - "packages/*"

catalog:
  drizzle-orm: "1.0.0-beta.19"
  drizzle-kit: "1.0.0-beta.19"
  typescript: "^5.4.5"
  zod: "^4.3.6"
```

Then in `package.json` files use `catalog:` instead of a version string.

---

## Security-Sensitive Dependencies

| Package | Risk Area | Mitigation |
|---|---|---|
| `jose` | JWT handling | Validate `alg`, `iss`, `aud` — never `none` alg |
| `express-rate-limit` | DoS protection | Configure per-route limits |
| `helmet` | HTTP headers | Enabled globally in Express |
| `express-mongo-sanitize` | NoSQL injection | Applied as global middleware |
| `multer` | File upload | Validate MIME type + size limits |
| `@aws-sdk/client-s3` | Cloud credentials | Never log AWS keys; use IAM roles in prod |
| `cors` | CORS policy | Whitelist only known origins in production |

---

## Operational Workflow For Dependency Changes

Use this sequence whenever dependencies are changed:

1. Classify the update: patch, minor, or major.
2. Confirm policy compliance using the checklist in `docs/DEPENDENCY_CHANGE_CHECKLIST.md`.
3. Run validation commands:

```bash
pnpm install --frozen-lockfile
pnpm outdated --recursive
pnpm ci:gate
pnpm lint
pnpm typecheck
```

4. For major upgrades, add migration documentation and rollback strategy.
5. Update `.agents/docs/dependency-validation-report.md` with outcomes and deferred items.
