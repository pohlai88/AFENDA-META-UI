# Monorepo — Turborepo + pnpm Workspaces

**Domain**: Monorepo configuration, task orchestration, workspace dependency management  
**Stack**: pnpm@9 · Turborepo v1.13.4 · TypeScript 5.4.5 · Node 20

Use this skill when:
- Adding or modifying workspace packages/apps
- Configuring Turborepo tasks (`turbo.json`)
- Managing cross-package dependencies (`workspace:*`)
- Setting up TypeScript path aliases across packages
- Debugging build order / caching issues
- Running scoped commands with `pnpm --filter`
- Configuring CI pipelines for this monorepo

---

## Workspace Layout

```
afenda-meta-ui/            ← monorepo root (private, no publish)
├── apps/
│   ├── api/               ← Express + GraphQL Yoga + Drizzle ORM (name: "api")
│   └── web/               ← Vite + React 18 + RTK (name: "@afenda/web")
├── packages/
│   ├── db/                ← @afenda/db   — Drizzle ORM schemas + migrations
│   ├── meta-types/        ← @afenda/meta-types — shared TypeScript types
│   └── ui/                ← @afenda/ui   — shared React component library
├── tools/
│   └── ci-gate/           ← Internal CI validation tool (not a workspace pkg)
├── pnpm-workspace.yaml
├── turbo.json
└── tsconfig.base.json
```

**pnpm-workspace.yaml** — declares workspace members:
```yaml
packages:
  - "apps/*"
  - "packages/*"
```

---

## Internal Package Dependency Graph

```
api  ──depends──▶  @afenda/db
api  ──depends──▶  @afenda/meta-types
@afenda/web  ──depends──▶  @afenda/meta-types
@afenda/web  ──depends──▶  @afenda/ui
@afenda/db   ──(standalone, no internal deps)
@afenda/meta-types  ──(standalone, no internal deps)
@afenda/ui   ──(standalone, no internal deps)
```

**Always reference internal packages with `workspace:*`:**
```json
{
  "dependencies": {
    "@afenda/db": "workspace:*",
    "@afenda/meta-types": "workspace:*"
  }
}
```

---

## Turborepo Configuration (`turbo.json`)

This repo uses **Turborepo v1.x** which uses `"pipeline"` (not `"tasks"` — that is v2+).

```json
{
  "$schema": "https://turbo.build/schema.json",
  "globalEnv": ["DATABASE_URL", "NODE_ENV", "PORT"],
  "globalPassThroughEnv": ["VITE_API_URL", "VITE_APP_TITLE", "VITE_APP_ENV"],
  "pipeline": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**", ".vite/**"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    },
    "lint": {},
    "typecheck": {
      "dependsOn": ["^build"]
    }
  }
}
```

### Key Turborepo Concepts

| Concept | Explanation |
|---|---|
| `"dependsOn": ["^build"]` | Build dependency packages first (topological) |
| `"dependsOn": ["build"]` | Run `build` in the same package first |
| `"cache": false` | Never cache (e.g., `dev`, `db:push`) |
| `"persistent": true` | Long-running task (e.g., `dev` server) |
| `outputs` | Files to cache — must list or cache won't restore |
| `globalEnv` | Env vars that affect cache key globally |
| `globalPassThroughEnv` | Env vars passed through but not hashed |

### Adding a New Task to turbo.json

```json
"my-task": {
  "dependsOn": ["^build"],
  "outputs": ["dist/**"],
  "cache": true
}
```

---

## TypeScript Path Aliases (`tsconfig.base.json`)

All internal packages are mapped in the root `tsconfig.base.json`. Each app/package extends this base.

```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@afenda/meta-types": ["packages/meta-types/src/index.ts"],
      "@afenda/db": ["packages/db/src/index.ts"],
      "@afenda/db/*": ["packages/db/src/*"]
    }
  }
}
```

**When adding a new package**, add a path alias entry here AND in the consuming package's `tsconfig.json` via `extends: "../../tsconfig.base.json"`.

---

## Package Exports Pattern

All shared packages use explicit ESM exports:

```json
{
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "import": "./dist/index.js",
      "types": "./dist/index.d.ts"
    },
    "./sub-module": {
      "import": "./dist/sub-module/index.js",
      "types": "./dist/sub-module/index.d.ts"
    }
  }
}
```

---

## Common pnpm Commands

```bash
# Install all workspace deps
pnpm install

# Run dev for all apps
pnpm dev
# or
pnpm turbo dev

# Build all packages/apps in dependency order
pnpm build

# Run only for a specific package
pnpm --filter @afenda/web dev
pnpm --filter api build
pnpm --filter @afenda/db db:push

# Run for a package and all its dependencies
pnpm --filter @afenda/web... build

# Add a dep to a specific workspace
pnpm --filter @afenda/web add react-router-dom

# Add an internal workspace dep
pnpm --filter api add @afenda/db@workspace:*

# Typecheck everything
pnpm typecheck

# Format all files
pnpm format
```

---

## Adding a New Package

1. Create `packages/<name>/package.json` with `"name": "@afenda/<name>"`.
2. Set `"type": "module"` and define `exports`.
3. Add `tsconfig.json` extending `"../../tsconfig.base.json"`.
4. Register path alias in root `tsconfig.base.json`.
5. Add `build` + `typecheck` scripts.
6. Reference as `workspace:*` from consuming apps.
7. Add `build` outputs to `turbo.json` if needed (e.g., `"outputs": ["dist/**"]`).

---

## Adding a New App

1. Create `apps/<name>/package.json`.
2. Add all required scripts: `dev`, `build`, `lint`, `typecheck`.
3. The app is automatically picked up by `pnpm-workspace.yaml` (`apps/*`).
4. Add any Turborepo-specific task config in `turbo.json` if needed.

---

## CI Gate Commands

```bash
pnpm ci:gate           # Run full CI gate check
pnpm ci:gate:fix       # Auto-fix issues
pnpm ci:gate:verbose   # Verbose output
pnpm ci:contracts      # Run contract tests (web)
```

---

## Database Commands

```bash
# Apply schema changes (uses Drizzle Kit)
pnpm db:push           # via api package
pnpm db:push:db        # via @afenda/db package

# Generate migrations
pnpm db:generate

# Check database consistency
pnpm db:check

# Introspect meta schema
pnpm db:introspect
```

---

## Environment Variables

| Variable | Scope | Purpose |
|---|---|---|
| `DATABASE_URL` | api, @afenda/db | PostgreSQL connection string |
| `NODE_ENV` | global | development / production / test |
| `PORT` | api | HTTP server port |
| `VITE_API_URL` | @afenda/web | API base URL (passed-through) |
| `VITE_APP_TITLE` | @afenda/web | App title (passed-through) |
| `VITE_APP_ENV` | @afenda/web | App environment label (passed-through) |

Copy `.env.example` to `.env` in the root and in `apps/api/` before running.

---

## Dependency Management Best Practices

1. **Shared devDependencies** (TypeScript, Prettier, Turbo) belong at the root.
2. **App-specific deps** belong in the app's `package.json`.
3. **Shared runtime types** belong in `@afenda/meta-types`.
4. **Shared UI components** belong in `@afenda/ui`.
5. **Database schemas** belong in `@afenda/db`.
6. Use `pnpm dedupe` periodically to clean up duplicate indirect dependencies.
7. Keep `drizzle-orm` version **identical** across `api` and `@afenda/db` to avoid type mismatches.

---

## Turborepo Caching Tips

- `outputs` must be declared for cache to restore build artifacts.
- `globalDependencies` like `tsconfig.base.json` invalidate cache globally when changed — currently only `globalEnv` is configured.
- Consider adding for better cache precision:
  ```json
  {
    "globalDependencies": ["tsconfig.base.json", ".env"]
  }
  ```
- Remote caching: set `TURBO_TOKEN` + `TURBO_TEAM` for CI.

---

## Known Gotchas

- **Turborepo v1 uses `pipeline`, v2+ uses `tasks`** — this repo is v1.13.4.
- `tools/ci-gate/` is NOT in pnpm-workspace.yaml — it's invoked as a Node script.
- `@afenda/ui` has all peer dependencies listed — consumers install them separately.
- `api` package is named `"api"` (not scoped), filter with `pnpm --filter api`.
- `moduleResolution: NodeNext` requires explicit `.js` extensions in imports within `type: "module"` packages.
