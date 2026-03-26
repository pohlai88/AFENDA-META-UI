---
name: eslint-monorepo-performance
description: Official ESLint and typescript-eslint performance tuning for large monorepos (cache strategy, concurrency, typed-linting scope, profiling).
metadata:
  author: GitHub Copilot
  version: "2026.3.26"
  source: ESLint + typescript-eslint + TypeScript official docs
---

# ESLint Monorepo Performance

Use this skill to speed up lint execution in large monorepos without reducing lint quality.

## Official Sources

- https://eslint.org/docs/latest/use/command-line-interface
- https://eslint.org/docs/latest/extend/custom-rules
- https://eslint.org/docs/latest/extend/stats
- https://typescript-eslint.io/troubleshooting/typed-linting/
- https://typescript-eslint.io/troubleshooting/typed-linting/performance/
- https://typescript-eslint.io/troubleshooting/typed-linting/monorepos/
- https://www.typescriptlang.org/docs/handbook/tsconfig-json.html

## When To Use This Skill

Use when user asks to:

- speed up eslint in monorepo
- reduce lint CI runtime
- profile slow lint rules
- tune typed linting performance
- optimize parserOptions project configuration

## Performance Baseline

1. Enable ESLint cache in local and CI jobs where cache persistence exists.
2. Prefer cache strategy `content` when mtime churn causes false invalidation.
3. Use `--concurrency auto` to utilize workers for larger file sets.
4. Profile rule cost before changing rule policy.
5. Narrow typed linting scope to TS files that need type-aware rules.
6. Avoid wide `**` globs in TypeScript project resolution.
7. Separate local fast feedback lint from CI strict lint.

## Fast Commands

```bash
pnpm eslint . --cache --cache-location .cache/eslint/.eslintcache --cache-strategy content --concurrency auto
```

```bash
TIMING=1 pnpm eslint .
```

```bash
TIMING=all pnpm eslint . --stats -f json
```

```bash
pnpm eslint . --max-warnings=0 --no-warn-ignored
```

## Windows PowerShell Variants

Use these in PowerShell to avoid shell-specific environment variable syntax issues:

```powershell
$env:TIMING = "1"; pnpm eslint .; Remove-Item Env:TIMING
```

```powershell
$env:TIMING = "all"; pnpm eslint . --stats -f json; Remove-Item Env:TIMING
```

```powershell
$env:NODE_OPTIONS = "--max-semi-space-size=256"; pnpm eslint .; Remove-Item Env:NODE_OPTIONS
```

Windows glob note: when passing glob arguments to ESLint CLI directly, prefer double quotes.

```powershell
pnpm eslint "apps/web/src/**/*.{ts,tsx}"
```

## Typed Linting Performance

- Prefer `parserOptions.projectService: true` for monorepo-scale typed linting. When this is enabled, dedicated monorepo parserOptions.project wiring is often unnecessary.
- Set `tsconfigRootDir` explicitly to stabilize project resolution.
- If using `parserOptions.project`, avoid `./**/tsconfig.json`; use explicit globs such as `./apps/*/tsconfig.json` and `./packages/*/tsconfig.json`.
- Disable type-checked linting for JS and generated files with `tseslint.configs.disableTypeChecked`.
- Keep tsconfig include scopes narrow to avoid parsing build and generated artifacts.
- If memory pressure appears in very large workspaces, test a higher Node semi-space setting for lint jobs.

Example:

```js
import tseslint from "typescript-eslint";

export default tseslint.config(
  ...tseslint.configs.recommendedTypeChecked,
  {
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  {
    files: ["**/*.{js,cjs,mjs}"],
    extends: [tseslint.configs.disableTypeChecked],
  }
);
```

## Rule Cost Controls

- Avoid eslint-plugin-prettier in large monorepos; run prettier check as a separate step instead.
- Prefer TypeScript-native checks over expensive import rules where equivalents exist.
- Defer costly graph rules (for example cycle detection) to CI or pre-push stages.

Recommended formatting gate:

```bash
pnpm prettier --check .
```

Optional memory tuning command:

```bash
NODE_OPTIONS=--max-semi-space-size=256 pnpm eslint .
```

## CI Optimization Pattern

1. Run lint on affected packages first.
2. Persist ESLint cache directory between CI runs.
3. Keep a separate strict job (`--max-warnings=0`) after fast feedback job.
4. Track lint duration trend per PR to catch regressions.
5. Use single-package fallback linting when very large monorepos hit memory pressure.

## Rule Profiling Playbook

1. Run `TIMING=1` and capture top expensive rules.
2. For deep diagnosis, run `--stats -f json` and inspect parse/lint/fix timings.
3. Optimize expensive custom rules or scope them with `files` patterns.
4. Re-run profiling to validate gains before changing severity.

Optional diagnostics:

```bash
pnpm eslint --inspect-config
pnpm eslint --print-config packages/ui/src/index.ts
```

## Anti-Patterns To Avoid

- Disabling expensive rules globally without measurement.
- Broad ignore patterns that mask source files instead of improving performance.
- Running typed rules against all JS files.
- Using recursive `**` project globs in large monorepos.
- Skipping cache on local iterative workflows.
