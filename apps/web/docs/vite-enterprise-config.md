# Enterprise Vite Configuration — AFENDA Web

## Overview

The workspace Vite setup has been upgraded from a minimal development configuration to an enterprise-grade build pipeline following the official [Vite documentation](https://vite.dev/config/) best practices.

---

## Architecture

```
apps/web/
├── vite.config.ts          # Conditional dev/build enterprise configuration
├── vitest.config.ts         # Test configuration (unchanged — already enterprise)
├── playwright.config.ts     # E2E configuration (unchanged — already enterprise)
├── index.html               # Enhanced with meta tags, dynamic title
├── .env.development         # Dev-mode VITE_* variables
├── .env.production          # Prod-mode VITE_* variables
├── src/
│   └── vite-env.d.ts        # TypeScript env type declarations
```

---

## Configuration Features

### Conditional Dev/Build Config

Uses `defineConfig(({ command, mode }) => ...)` pattern for mode-specific optimization:

- **Dev (`vite`)**: Server warmup, dep pre-bundling, security headers, proxy
- **Build (`vite build`)**: Sourcemaps, chunk splitting, minification, manifest, license

### Build Optimization

| Feature              | Value          | Rationale                                                     |
| -------------------- | -------------- | ------------------------------------------------------------- |
| `build.target`       | `es2022`       | Matches tsconfig target, modern browsers                      |
| `build.sourcemap`    | `hidden`       | Generated for error tracking (Sentry), not exposed to browser |
| `build.minify`       | `oxc`          | 30-90x faster than terser, ~0.5-2% worse compression          |
| `build.cssMinify`    | `lightningcss` | Native CSS minification engine                                |
| `build.cssCodeSplit` | `true`         | Per-route CSS loading                                         |
| `build.manifest`     | `true`         | Asset manifest for cache busting / backend integration        |
| `build.license`      | `true`         | License compliance for bundled dependencies                   |

### Chunk Splitting Strategy

Manual vendor chunks for optimal caching:

| Chunk          | Contents                             | Cache Strategy                              |
| -------------- | ------------------------------------ | ------------------------------------------- |
| `vendor-react` | react, react-dom, react-router-dom   | Changes rarely → long TTL                   |
| `vendor-query` | @tanstack/react-query, devtools      | Semi-stable → medium TTL                    |
| `vendor-ui`    | radix-ui, lucide-react, sonner, cmdk | Semi-stable → medium TTL                    |
| `[auto]`       | Application code                     | Changes frequently → short TTL / hash-based |

### Dev Server Performance

| Feature            | Configuration                                                           |
| ------------------ | ----------------------------------------------------------------------- |
| **Warmup**         | Pre-transforms `main.tsx`, `App.tsx`, layout components, renderers      |
| **Pre-bundling**   | react, react-dom, react-router-dom, @tanstack/react-query, lucide-react |
| **Monorepo dedup** | `resolve.dedupe` prevents duplicate react/react-dom copies              |

### Security

| Feature            | Configuration                                              |
| ------------------ | ---------------------------------------------------------- |
| `server.fs.strict` | `true` — restricts file serving to workspace               |
| `server.fs.deny`   | Blocks `.env`, `.env.*`, cert/key files, `.git/`           |
| `server.headers`   | `X-Content-Type-Options: nosniff`                          |
| `.gitignore`       | Prevents `.env.local`, `.env.*.local` from being committed |

---

## Environment Variables

### Type-Safe Variables (`vite-env.d.ts`)

All `VITE_*` variables are typed in `src/vite-env.d.ts`:

```typescript
interface ImportMetaEnv {
  readonly VITE_API_URL: string;
  readonly VITE_APP_TITLE: string;
  readonly VITE_APP_ENV: string;
}
```

Access via `import.meta.env.VITE_API_URL` with full IntelliSense.

### Mode-Specific `.env` Files

| File                     | Loaded When            | Purpose                         |
| ------------------------ | ---------------------- | ------------------------------- |
| `.env.development`       | `vite` (dev server)    | Local API URL, dev title        |
| `.env.production`        | `vite build`           | Prod title, API URL placeholder |
| `.env.local`             | Always (git-ignored)   | Local overrides, secrets        |
| `.env.development.local` | Dev only (git-ignored) | Per-developer overrides         |

### Compile-Time Constants

| Constant          | Type     | Usage                               |
| ----------------- | -------- | ----------------------------------- |
| `__APP_VERSION__` | `string` | Package version from `package.json` |
| `__BUILD_TIME__`  | `string` | ISO timestamp of build              |

### HTML Constant Replacement

`%VITE_APP_TITLE%` in `index.html` is replaced at build time with the current env value.

---

## Build Pipeline (Turborepo)

### Environment Passthrough

`turbo.json` includes `globalPassThroughEnv` for Vite variables so Turborepo properly invalidates cache when env values change:

```json
"globalPassThroughEnv": ["VITE_API_URL", "VITE_APP_TITLE", "VITE_APP_ENV"]
```

### Build Outputs

The `build` pipeline captures both `dist/**` and `.vite/**` (manifest, license).

---

## TypeScript

### `isolatedModules: true`

Added to `tsconfig.base.json`. Required by Vite because it uses Oxc for file-by-file transpilation without type information. This ensures TS warns about code patterns (like `const enum`, implicit type-only imports) that don't work with per-file transpilation.

---

## Commands

```bash
# Development
pnpm --filter web dev          # Start dev server with warmup + proxy

# Build
pnpm --filter web build        # Production build with chunk splitting + sourcemaps

# Preview
pnpm --filter web preview      # Serve production build locally

# Type check
pnpm --filter web typecheck    # tsc --noEmit (separate from Vite's transpilation)
```

## Output Structure

After `pnpm --filter web build`:

```
dist/
├── index.html
├── .vite/
│   ├── manifest.json          # Asset mapping for cache busting
│   └── license.md             # Bundled dependency licenses
├── assets/
│   ├── vendor-react-[hash].js # React core chunk
│   ├── vendor-query-[hash].js # TanStack Query chunk
│   ├──  vendor-ui-[hash].js    # UI library chunk
│   ├── index-[hash].js        # Application entry
│   ├── [route]-[hash].js      # Code-split route chunks
│   └── [name]-[hash].css      # Per-route CSS files
```
