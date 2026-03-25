# TypeScript Configuration Guide — Declaration Exports

This document explains how `@afenda/*` packages export types and maintain proper `.d.ts` generation across the monorepo.

## Export Strategy

All packages use **conditional exports** via `"exports"` field in `package.json`:

```json
{
  "exports": {
    ".": {
      "import": "./dist/index.js",
      "types": "./dist/index.d.ts"
    },
    "./schema": {
      "import": "./dist/schema/index.js",
      "types": "./dist/schema/index.d.ts"
    }
  }
}
```

**Key rules:**
- Always include `"types"` field alongside `"import"`/`"require"`
- Types are generated via TypeScript `declaration: true`
- Sub-path exports must have corresponding type definitions

## Package Export Map

| Package | Exports | Declaration | Notes |
|---------|---------|-------------|-------|
| `@afenda/meta-types` | `. (main)` | ✅ emitted | Pure types package — zero runtime |
| `@afenda/db` | `.`, `./schema`, `./schema-meta`, `./schema-domain`, `./shared`, `./session`, `./rls` | ✅ emitted | Multi-path exports for schema modularity |
| `@afenda/ui` | `. (main)`, `./styles.css` (assets) | ✅ emitted | Component library + styling |
| `api` (Express server) | ❌ No exports | ❌ not emitted | Runtime-only; no internal TypeScript consumption |

## Build Information Cache

**Location:** `node_modules/.tsbuildinfo`

TypeScript caches build state here to enable incremental compilation. This is **auto-generated** and should **never be committed**.

**.gitignore** already covers: `*.tsbuildinfo`

## IDE Resolution

For IDE to resolve types correctly:

```bash
# Workspace-aware TypeScript SDK
code # Opens with TypeScript v5.9.x from workspace

# Manual verification
pnpm tsc --version  # Should show 5.9.x+
```

## Common Issues & Fixes

### "Cannot find types for module"
- Ensure `package.json` has `"types"` in exports
- Run `pnpm build` to regenerate `.d.ts` files
- Check `.gitignore` doesn't exclude `dist/` directory

### Stale IDE types
- Restart VS Code
- Run `pnpm typecheck --force` to rebuild cache
- Delete `node_modules/.tsbuildinfo`

### Sub-path imports not resolving
- Verify `package.json` exports include all sub-paths
- Each export must have a corresponding `.d.ts` file in `dist/`
- Example: `"./schema"` export needs `dist/schema/index.d.ts`

## Future: TS 6.0+ Upgrade

When upgrading to TypeScript 6.0+:
- `isolatedDeclarations` becomes available (faster emit)
- Consider enabling for library packages (`@afenda/ui`, `@afenda/db`)
- No breaking changes to export strategy

---

## Advanced Type Safety — Boundary Hardening (March 2026)

### Overview

The Tier-1 dynamic boundaries (renderer contracts, adapters, plugin engine, rule engine, safeLazy) were refactored to eliminate unsafe `any` usage. The changes follow a three-layer strategy:

1. **Shared type utilities** — `@afenda/meta-types` now exports `JsonValue`, `JsonObject`, `Brand`, `DeepPartial`, `DeepReadonly`, `NonEmptyArray`, `MaybePromise`, `assertNever`, and three type guards (`isJsonObject`, `isJsonArray`, `isJsonPrimitive`).
2. **Boundary contracts** — `RendererBaseProps`, `ListRendererProps`, `FormRendererProps` are generic over `TRecord extends JsonObject`. `RendererModule` uses `[key: string]: unknown`. `MetadataAdapter` defaults to `unknown` instead of `any`.
3. **CI enforcement** — The TypeScript gate now enforces per-file `any` budgets and `as unknown as` budgets, preventing regressions.

### Migration Guide

#### Using `JsonObject` for record callbacks

```ts
// Before
onSaved?: (record: any) => void;

// After — inferred from the renderer's TRecord generic
onSaved?: (record: TRecord) => void;  // TRecord extends JsonObject
```

#### Using `MetaSchemaVersion` instead of bare strings

```ts
// Before
function detectVersion(meta: any): string { ... }

// After
import type { MetaSchemaVersion } from "./adapters";
function detectVersion(meta: unknown): MetaSchemaVersion { ... }
```

#### Using narrowing helpers at API boundaries

```ts
// Before
function process(data: any) { return data.customer.name; }

// After
import { isJsonObject } from "@afenda/meta-types";
function process(data: unknown) {
  if (!isJsonObject(data)) return;
  const customer = data.customer;
  if (!isJsonObject(customer)) return;
  // now customer is JsonObject — safe to access
}
```

#### Exhaustive union switches

```ts
import { assertNever } from "@afenda/meta-types";

switch (decision.type) {
  case "allow":  return allow();
  case "block":  return block(decision.reason);
  case "warn":   return warn(decision.message);
  case "notify": return notify(decision.channels, decision.message);
  default:       return assertNever(decision); // compile error if new variant added
}
```

### any Budget

The CI gate tracks `any` occurrences in critical-path files. Budgets are defined in [tools/ci-gate/typescript/index.mjs](../tools/ci-gate/typescript/index.mjs) under `ANY_BUDGET`. To add a new file to the budget, add an entry and set its limit to `0`.

### as-unknown-as Budget

`as unknown as T` casts are tracked across `apps/web/src` and `apps/api/src`. Budgets are in the same gate file under `UNSAFE_CAST_BUDGET`. The budget covers only pre-existing necessary casts (e.g., `React.lazy` return type coercion). New double-casts will trigger a CI warning.
