# TypeScript DX CI Gate

Validates TypeScript DX baseline rules with inline diagnostics and actionable fix suggestions.

## What It Checks

- Root TypeScript scripts exist and are standardized:
  - `typecheck`
  - `typecheck:verbose`
  - `typecheck:debug`
- Root baseline in `tsconfig.base.json`:
  - `strict: true`
  - `isolatedModules: true`
  - `declaration: true`
  - `declarationMap: true`
  - `incremental: true`
  - `tsBuildInfoFile: node_modules/.tsbuildinfo`
- All main workspaces resolve `incremental: true` via merged tsconfig:
  - `apps/api`
  - `apps/web`
  - `packages/db`
  - `packages/ui`
  - `packages/meta-types`
- Library declaration contract hygiene for:
  - `@afenda/db`
  - `@afenda/ui`
  - `@afenda/meta-types`
- TypeScript DX artifacts:
  - `docs/TYPESCRIPT_EXPORTS.md`
  - `_private/README.md` boundary docs in library packages
- Live type safety check via `pnpm typecheck`

## Run

```bash
# From repo root
node tools/ci-gate/typescript/index.mjs

# Strict mode (warnings fail gate)
node tools/ci-gate/typescript/index.mjs --strict

# Verbose mode
node tools/ci-gate/typescript/index.mjs --verbose
```

## Output Style

Diagnostics are grouped by category and include:

- error message
- explanation
- related files
- fix suggestions
- inline diagnostic lines for failing commands

This follows the same contracts/dependencies gate style for consistency in CI.
