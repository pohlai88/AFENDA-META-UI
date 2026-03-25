# Dependencies CI Gate

Validates dependency governance rules with categorized, inline diagnostics and actionable fixes.

## What It Checks

- Critical package version alignment (`drizzle-orm`, `drizzle-kit`, `zod`, `vitest`)
- Server/client boundary violations (server-only packages in `apps/web` runtime deps)
- Internal workspace spec consistency (`@afenda/*` must use `workspace:*`)
- React runtime/type major mismatch in web package
- Security baseline (`pnpm audit --audit-level=high`)
- Advisory major drift reporting (`pnpm outdated --recursive --format json`)

## Run

```bash
# From repo root
node tools/ci-gate/dependencies/index.mjs

# Strict mode (warnings fail build)
node tools/ci-gate/dependencies/index.mjs --strict

# Verbose diagnostics
node tools/ci-gate/dependencies/index.mjs --verbose
```

## Output Style

The gate prints grouped diagnostics with:

- Category title and count
- Error message
- Explanation
- Related files
- Fix suggestions
- End summary by category

This mirrors the contracts gate diagnostic style for consistent CI experience.
