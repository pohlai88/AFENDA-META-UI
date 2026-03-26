---
name: eslint-enterprise-monorepo
description: Official ESLint + typescript-eslint + boundaries best practices for enterprise monorepos (flat config, typed linting, architectural boundaries, CI quality gates).
metadata:
  author: GitHub Copilot
  version: "2026.3.26"
  source: ESLint + typescript-eslint + TypeScript + eslint-plugin-boundaries official docs
---

# ESLint Enterprise Monorepo

Use this skill when setting up, hardening, or refactoring ESLint for a pnpm/Turborepo-style monorepo.

## Official Sources

- https://eslint.org/docs/latest/use/configure/
- https://eslint.org/docs/latest/use/configure/migration-guide
- https://typescript-eslint.io/getting-started/
- https://typescript-eslint.io/getting-started/typed-linting
- https://typescript-eslint.io/troubleshooting/typed-linting/monorepos/
- https://typescript-eslint.io/users/configs/
- https://www.typescriptlang.org/docs/handbook/tsconfig-json.html
- https://github.com/javierbrea/eslint-plugin-boundaries#readme

## When To Use This Skill

Use when user asks to:

- set up enterprise ESLint in monorepo
- migrate to flat config
- fix TypeScript lint rule conflicts
- enforce package/app boundaries
- create CI lint quality gates
- make linting scalable and predictable

## Enterprise Baseline

1. Use flat config only with eslint.config.js or eslint.config.mjs.
2. Use a single root config as policy source; app/package blocks are scoped by files globs.
3. Keep ignores in config (not .eslintignore for flat-config-first setups).
4. Separate JS and TS rule surfaces to prevent duplicate/conflicting rule execution.
5. Enable typed linting only where needed using parserOptions.projectService or explicit project config.
6. Enforce architecture boundaries for apps/packages with eslint-plugin-boundaries.
7. Make CI deterministic: max warnings policy, unused disable reporting, explicit lint scripts.
8. Use config debugging and inspection commands when inheritance behavior is unclear.

## Install (pnpm workspace)

```bash
pnpm add -Dw eslint @eslint/js typescript-eslint eslint-config-prettier globals eslint-plugin-boundaries eslint-plugin-import eslint-import-resolver-typescript
```

Optional framework plugins by stack:

```bash
pnpm add -Dw eslint-plugin-react-hooks eslint-plugin-react-refresh eslint-plugin-vitest
```

## Root Flat Config Blueprint

Use this pattern in root eslint.config.js:

```js
import js from "@eslint/js";
import tseslint from "typescript-eslint";
import prettierConfig from "eslint-config-prettier";
import globals from "globals";
import boundaries from "eslint-plugin-boundaries";

export default tseslint.config(
  {
    ignores: ["**/node_modules/**", "**/dist/**", "**/.turbo/**", "**/coverage/**", "**/build/**"],
    linterOptions: {
      reportUnusedDisableDirectives: "warn",
      reportUnusedInlineConfigs: "warn",
    },
  },

  js.configs.recommended,
  ...tseslint.configs.recommended,

  {
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      "no-redeclare": "off",
      "no-unused-vars": "off",
      "@typescript-eslint/no-redeclare": ["error", { ignoreDeclarationMerge: true }],
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],
    },
  },

  {
    files: ["apps/web/**/*.{ts,tsx,js,jsx}"],
    languageOptions: {
      globals: globals.browser,
    },
  },

  {
    files: ["apps/api/**/*.{ts,tsx,js,jsx}"],
    languageOptions: {
      globals: globals.node,
    },
  },

  {
    plugins: {
      boundaries,
    },
    settings: {
      "boundaries/elements": [
        { type: "app", pattern: "apps/*/src/**", mode: "full" },
        { type: "package", pattern: "packages/*/src/**", mode: "full" },
      ],
    },
    rules: {
      ...boundaries.configs.recommended.rules,
    },
  },

  prettierConfig
);
```

## TSConfig Strategy For Typed Linting

- The root tsconfig strategy must keep include and exclude narrow and intentional.
- If one root tsconfig cannot cover all lint targets cleanly, create tsconfig.eslint.json with noEmit set to true.
- Avoid include patterns that are too broad (for example, matching build artifacts or generated output).

Example tsconfig.eslint.json:

```json
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "noEmit": true
  },
  "include": ["apps", "packages", "tools"],
  "exclude": ["**/dist/**", "**/build/**", "**/coverage/**"]
}
```

## Monorepo Rule Governance

- Root defines invariant rules and defaults.
- Workspace blocks adjust only runtime context (browser vs node vs test).
- Package-local configs should be avoided unless there is a strict local exception.
- Prefer severity design:
  - error: correctness and architecture safety
  - warn: maintainability and cleanup debt

## Typed Linting Policy

- Start with tseslint.configs.recommended for broad adoption.
- Add recommendedTypeChecked only after TS project references and performance baseline are stable.
- Use disableTypeChecked for JS or generated files if needed.

## Boundaries Policy (Enterprise)

- Define element types for apps, shared packages, infra, and test utilities.
- Restrict imports so feature code cannot bypass public APIs.
- Ban cross-app imports unless explicitly whitelisted.
- Promote rule strictness from recommended to strict after cleanup window.

## CI Quality Gates

Recommended scripts:

```json
{
  "scripts": {
    "lint": "eslint .",
    "lint:strict": "eslint . --max-warnings=0 --no-warn-ignored",
    "lint:fix": "eslint . --fix"
  }
}
```

Debug and config-introspection commands:

```bash
pnpm eslint --inspect-config
pnpm eslint --print-config apps/web/src/main.tsx
pnpm eslint --debug apps/web/src/main.tsx
```

Pipeline expectations:

1. lint:strict passes on changed scopes.
2. typecheck passes for all impacted packages.
3. no new eslint-disable comments without ticket reference.
4. no drift in root config ownership and review policy.

## Migration Playbook

1. Consolidate to root flat config.
2. Configure ignores and linterOptions in config.
3. Add JS baseline and TS baseline separately.
4. Add runtime globals by workspace path.
5. Disable conflicting base rules for TS files.
6. Add boundaries plugin in recommended mode.
7. Run lint, fix, and stage cleanup in waves.
8. Enforce lint:strict in CI after debt drops below agreed threshold.
9. Add strict no-inline-config policy only after disable-directive cleanup is complete.

## Anti-Patterns To Avoid

- Mixing old .eslintrc extends chains with new flat config without controlled compat mapping.
- Enabling all type-aware rules immediately in large repos without performance measurement.
- Letting app-local configs silently override root correctness rules.
- Using broad ignore patterns that hide source folders.
- Treating no-redeclare overload errors with file-level disables instead of correct TS rule routing.
