# Column Kit — Architecture

> **Status:** Production-ready infrastructure boundary
> **Import path:** `@afenda/db/columns`
> **Tests:** `packages/db/src/column-kit/__test__/shared-columns.test.ts`
> **Runtime deps:** `drizzle-orm/pg-core`

---

## Design philosophy

| Old approach | New approach |
| ------------ | ------------ |
| Column + wire helpers bundled together | `column-kit` handles Drizzle schema primitives only |
| Ad hoc column checks in tests | Fingerprints + coverage evaluator provide reusable governance |
| Deep module coupling risk | Flat root boundary with explicit subpath exports |

---

## Module role

`column-kit` defines shared table-column conventions for lifecycle, auditability, and naming across all DB domains.

- **Upstream consumers:** `schema/core`, `schema/security`, `schema/reference`, `schema/sales`, `schema/hr`, tests
- **Downstream:** PostgreSQL DDL generated through Drizzle table definitions
- **Boundary:** No wire-schema (`zod`), no session/rls logic, no domain table imports

### Boundary position

```
apps/api, tests
      │
      ▼
@afenda/db/schema/*  ───────────────┐
      │                             │ uses
      ▼                             │
@afenda/db/columns (column-kit) ◄──┘
      │
      ├── drizzle-mixins/*   (runtime table columns)
      └── fingerprints/*     (governance descriptors)

@afenda/db/wire is a separate sibling boundary.
```

---

## Package structure

```
packages/db/src/column-kit/
├── index.ts
├── governance.ts
├── drizzle-mixins/
│   ├── timestamps.ts
│   ├── audit.ts
│   └── name.ts
└── fingerprints/
    ├── timestamps.ts
    ├── audit.ts
    ├── name.ts
    └── shared.ts
```

---

## Core architecture

### 1. Mixin-first schema composition

`drizzle-mixins/*` exports immutable column fragments (`as const`) that are spread into table definitions, ensuring consistency and minimizing duplication.

Key guarantees:
- Timestamp fields are timezone-aware (`timestamptz`) and defaulted where required.
- Audit fields are required integer actor references.
- Name field is non-null bounded text (`varchar(255)`).

### 2. Fingerprint + governance contract

`fingerprints/*` define stable descriptors for each shared column shape. `governance.ts` adds reusable audit helpers:

- `isSharedColumnName(columnName)` — runtime/type guard for known shared keys.
- `evaluateSharedColumnCoverage(columnNames, options?)` — report for:
  - missing mandatory / recommended shared columns
  - unexpected columns matching `fingerprints/patterns.ts` (critical vs informational)
  - `isCompliant` when mandatory coverage holds and there are no **critical** unexpected matches (informational is advisory)

This pattern supports CI checks and schema review automation without coupling to Drizzle internals.
For runtime evidence against live PostgreSQL metadata, use
`tools/ci-gate/column-kit-shared-columns/introspect-live-db.mts`
(`pnpm ci:gate:column-kit:live-db`).

---

## Design patterns

- **Separation of concerns:** Drizzle column primitives only; wire/session/rls are separate modules.
- **Single responsibility:** mixins define columns; fingerprints describe governance; evaluator computes coverage.
- **Explicit contracts:** mandatory/recommended column tuples act as policy primitives.
- **Low-level composability:** consumers opt-in via spread syntax, avoiding hidden magic.

---

## Consumer map

| Consumer area | Usage |
| --- | --- |
| `packages/db/src/schema/*` | Spread mixins in table definitions |
| `packages/db/src/column-kit/__test__` | Shared columns and governance assumptions |
| Future CI checks | Evaluate schema coverage against mandatory/recommended contracts |

---

## Testing strategy

- Unit tests verify exported mixins, fingerprints, and governance evaluator behavior.
- Typecheck ensures compile-time compatibility with schema modules.
- Regression guard: unexpected shared-style columns are surfaced by evaluator.
- Evidence guard: live DB introspection validates real column metadata against fingerprints.

---

## Build and typecheck

```bash
pnpm --filter @afenda/db exec tsc --noEmit
pnpm --filter @afenda/db test:db
```

---

## Governance rules

1. Keep `column-kit` free from domain table imports and request/runtime context logic.
2. Any new shared column mixin must include matching fingerprint updates.
3. Update mandatory/recommended tuples only with explicit migration rationale.
4. Prefer additive exports; document removals as breaking changes.
5. Keep all column names camelCase in code mapped to snake_case DB names.

---

## Import strategy

```typescript
import {
  timestampColumns,
  softDeleteColumns,
  auditColumns,
  evaluateSharedColumnCoverage,
} from "@afenda/db/columns";
```

Use this subpath for schema modules. Do not import internals like `./drizzle-mixins/*` directly from consumers.

---

## Summary

`column-kit` is the infrastructure contract for consistent shared columns in AFENDA’s Drizzle schemas, with enterprise-focused governance primitives to enforce compliance at scale.

**Related:** [README.md](./README.md)
