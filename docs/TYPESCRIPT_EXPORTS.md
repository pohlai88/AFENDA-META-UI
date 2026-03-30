# TypeScript Exports & Package Boundaries

**Status:** Active
**Owner:** Engineering
**Last Updated:** March 28, 2026

---

## Purpose

This document codifies TypeScript export policies, package boundaries, and type export conventions for the AFENDA monorepo. Following these guidelines reduces type mismatch issues, maintains clean boundaries, and ensures reliable IntelliSense across the workspace.

---

## Package Boundary Rules

### Foundation Layer: `@afenda/meta-types`

**Purpose:** Truth contract layer — entities, events, invariants, and state transitions.

**Boundary Policy:**
- ✅ **Zero internal dependencies** — must not depend on any other monorepo package
- ✅ **Type-only exports** — main barrel uses `export type *` for all domains except `core/`
- ✅ **Runtime guards allowed** — `core/guards.ts` exports lightweight runtime functions (`assertNever`, `isJson*`)
- ✅ **Domain subpaths** — all exports organized by domain (schema, rbac, compiler, workflow, etc.)
- ❌ **No business logic** — no event handlers, no mutation functions, no caching classes

**Import Examples:**
```typescript
// ✅ Correct: Domain subpath imports
import type { MetaField, ModelMeta } from "@afenda/meta-types/schema";
import type { WorkflowDefinition } from "@afenda/meta-types/workflow";
import { assertNever, isJsonObject } from "@afenda/meta-types/core";

// ❌ Wrong: Root-level imports (legacy, deprecated)
import type { MetaField } from "@afenda/meta-types";
```

**Consumer Packages:** `@afenda/db`, `@afenda/ui`, `api`, `web`

---

### Data Layer: `@afenda/db`

**Purpose:** Database schema, migrations, seed data, and truth compiler runtime.

**Boundary Policy:**
- ✅ **Can import:** `@afenda/meta-types` only
- ❌ **Cannot import:** `@afenda/ui`, `api`, `web`
- ✅ **Exports:** Drizzle schema, query builders, seed utilities, **`@afenda/db/r2`** (Cloudflare R2 / S3-compatible object repo; docs: [packages/db/src/r2/README.md](../packages/db/src/r2/README.md))
- ✅ **Doc templates:** Reusable README/ARCHITECTURE skeletons — [tools/templates/package-docs/README.md](../tools/templates/package-docs/README.md)
- ✅ **Runtime:** Truth compiler runtime (extracted from meta-types Phase 2)

**Import Examples:**
```typescript
// ✅ Correct: Import types from foundation
import type { MutationPolicyDefinition } from "@afenda/meta-types/policy";
import { salesOrders, products } from "@afenda/db";

// ❌ Wrong: Cannot import from app layers
import { someApiUtil } from "@afenda/api"; // BLOCKED by boundaries
```

**Consumer Packages:** `api` only (not `web` — client must never import database code)

---

### Presentation Layer: `@afenda/ui`

**Purpose:** Reusable UI components (shadcn/ui, custom primitives).

**Boundary Policy:**
- ✅ **Can import:** `@afenda/meta-types` only
- ❌ **Cannot import:** `@afenda/db`, `api`
- ✅ **Exports:** React components, hooks, utilities
- ✅ **No business logic** — presentation primitives only

**Import Examples:**
```typescript
// ✅ Correct: Import types for component props
import type { MetaField } from "@afenda/meta-types/schema";
import { Button, Input } from "@afenda/ui";

// ❌ Wrong: Cannot import database or API code
import { salesOrders } from "@afenda/db"; // BLOCKED by boundaries
```

**Consumer Packages:** `web` only

---

### App Server Layer: `api`

**Purpose:** Express API server, business logic, command services.

**Boundary Policy:**
- ✅ **Can import:** `@afenda/db`, `@afenda/meta-types`
- ❌ **Cannot import:** `@afenda/ui`, `web`
- ✅ **Exports:** None (application entry point, not a library)

**Import Examples:**
```typescript
// ✅ Correct: Import data layer and types
import { db, salesOrders } from "@afenda/db";
import type { WorkflowInstance } from "@afenda/meta-types/workflow";

// ❌ Wrong: Cannot import UI or client code
import { Button } from "@afenda/ui"; // BLOCKED by boundaries
```

---

### App Client Layer: `web`

**Purpose:** Vite React application, UI composition, client-side logic.

**Boundary Policy:**
- ✅ **Can import:** `@afenda/ui`, `@afenda/meta-types`
- ❌ **Cannot import:** `@afenda/db`, `api` (except types)
- ✅ **Exports:** None (application entry point, not a library)

**Import Examples:**
```typescript
// ✅ Correct: Import UI and types
import { Button, Input } from "@afenda/ui";
import type { MetaField } from "@afenda/meta-types/schema";

// ❌ Wrong: Cannot import database or server code
import { db, salesOrders } from "@afenda/db"; // BLOCKED by boundaries
```

---

## Type Export Conventions

### Package.json Exports Configuration

All library packages must provide proper `exports` field with `types` mappings:

```json
{
  "name": "@afenda/meta-types",
  "exports": {
    ".": {
      "import": "./dist/index.js",
      "types": "./dist/index.d.ts"
    },
    "./core": {
      "import": "./dist/core/index.js",
      "types": "./dist/core/index.d.ts"
    }
  }
}
```

**CI Enforcement:** `tools/ci-gate/typescript/index.mjs` validates that all exports have `types` field.

---

### Barrel Export Patterns

#### Type-Only Barrels

For pure type packages, use `export type *`:

```typescript
// packages/meta-types/src/index.ts
export type * from "./schema/index.js";
export type * from "./workflow/index.js";
```

#### Mixed Barrels (Types + Runtime)

For packages with both types and runtime exports:

```typescript
// packages/meta-types/src/core/index.ts
export type * from "./types.js";
export * from "./guards.js"; // Runtime: assertNever, isJson*
```

#### Domain Subpath Pattern

Each domain organizes exports in its index:

```typescript
// packages/meta-types/src/workflow/index.ts
export type * from "./types.js";      // Pure types
export * from "./types.schema.js";   // Zod schemas (runtime)
```

---

## Type Safety Budget

### Unsafe Cast Budget

Maximum allowed `as unknown as` casts per area:

| Area | Budget | Current | Status |
|------|--------|---------|--------|
| `apps/web/src` | 4 | 11 | ⚠️ Over budget |
| `apps/api/src` | 6 | 12 | ⚠️ Over budget |

**CI Enforcement:** TypeScript gate warns when budgets are exceeded.

**Fix Strategy:**
1. Trace back to root cause of type mismatch
2. Fix upstream type definition to eliminate cast
3. If unavoidable (e.g., React.lazy internals), wrap in named helper and document invariant

### `any` Usage Budget

Maximum allowed bare `any` usages per Tier-1 boundary file:

| File | Budget | Purpose |
|------|--------|---------|
| `apps/web/src/renderers/safeLazy.tsx` | 2 | React.ComponentType<any> generic constraints |
| All others in Tier-1 | 0 | Zero tolerance for new `any` |

**CI Enforcement:** TypeScript gate warns on budget violations.

---

## Exhaustiveness Checking

### assertNever Pattern

All discriminated union switches must use `assertNever` for compile-time exhaustiveness:

```typescript
import { assertNever } from "@afenda/meta-types/core";

function handleStatus(status: "pending" | "approved" | "rejected") {
  switch (status) {
    case "pending": return "⏳";
    case "approved": return "✅";
    case "rejected": return "❌";
    default: return assertNever(status); // Compile error if new status added
  }
}
```

**CI Enforcement:** TypeScript gate verifies `assertNever` is exported from `packages/meta-types/src/core/guards.ts`.

---

## Declaration Maps

### Baseline Requirements

All packages must enable declaration generation in `tsconfig.json`:

```json
{
  "compilerOptions": {
    "declaration": true,
    "declarationMap": true
  }
}
```

**CI Enforcement:** TypeScript gate validates baseline settings.

---

## Private Implementation Details

### `_private/` Convention

Some packages use a `_private/` directory for internal implementation details that are **not** re-exported from the package root (see package `exports` in `package.json`).

Example (`@afenda/ui`):

```
packages/ui/src/
  index.ts          # Public API
  _private/         # Internal utilities, not exported
    README.md       # Documents internal structure
```

**Expected Docs:**
- `packages/ui/src/_private/README.md`

`@afenda/db` does not use `_private/`; internal helpers live next to their feature areas (e.g. `src/columns/`, `src/_shared/`) and are exported only via explicit subpaths.

---

## Violating Policies

### Boundary Violations

**Detection:** `pnpm --filter tools-ci-gate run ci:boundaries`

**Common Violations:**
- Web importing from `@afenda/db` (client must never touch database)
- UI importing from `api` (presentation layer must be decoupled)
- meta-types importing from any other package (foundation must be dependency-free)

### Type Export Violations

**Detection:** `node tools/ci-gate/typescript/index.mjs`

**Common Violations:**
- Missing `types` field in package.json exports
- Bare `export *` in meta-types barrel (should be `export type *`)
- New `any` usages in Tier-1 boundary files

---

## Migration Notes

### Phase 6 Migration (Completed)

All imports migrated from flat `@afenda/meta-types` to domain subpaths:

**Before:**
```typescript
import type { MetaField, WorkflowDefinition } from "@afenda/meta-types";
```

**After:**
```typescript
import type { MetaField } from "@afenda/meta-types/schema";
import type { WorkflowDefinition } from "@afenda/meta-types/workflow";
```

**Migration Script:** `tools/scripts/migrate-meta-imports.mjs` (240 symbol mappings)

---

## References

- **Monorepo Boundaries:** `eslint.config.boundaries.js`
- **TypeScript Gate:** `tools/ci-gate/typescript/index.mjs`
- **Meta-Types README:** `packages/meta-types/README.md`
- **Phase 6 Audit:** `.ideas/phase-6-audit-report.md`

---

**Enforcement:** These policies are validated in CI via ESLint boundaries plugin and TypeScript quality gates.
