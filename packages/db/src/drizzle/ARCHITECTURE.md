# Drizzle Runtime Boundary — Architecture

> **Status:** Active (internal runtime boundary under `@afenda/db`)
> **Import path:** `@afenda/db` (public), `@afenda/db/client`, `@afenda/db/relations`
> **Tests:** Covered by `@afenda/db` build/tests and downstream `@afenda/api` typecheck
> **Runtime deps:** `drizzle-orm`, `pg`, `@neondatabase/serverless`, `dotenv`

---

## Design philosophy

| Old approach | New approach |
| ------------ | ------------ |
| Runtime Drizzle files at package root (`src/client`, `src/db.ts`, `src/relations.ts`) | Runtime Drizzle files grouped under `src/drizzle/` |
| Domain relation metadata and runtime relation map easy to confuse | Clear split: domain catalogs in `src/schema/*/_relations.ts`; runtime map in `src/drizzle/relations.ts` |
| Flat root mixed composition and domain concerns | Root `src/index.ts` becomes a stable public barrel over explicit internal boundaries |

---

## Module role

`src/drizzle/` is the runtime assembly layer that turns schema definitions into executable Drizzle clients and relations. It is intentionally internal and exported only through stable package entry points.

- **Upstream consumers:** `apps/api`, `packages/truth-test`, scripts and seeds via `@afenda/db` public exports
- **Downstream:** PostgreSQL/Neon, Drizzle relational query API, schema modules under `src/schema`
- **Boundary:** no domain business logic here; only runtime wiring, pooling/driver behavior, and relation graph composition

### Boundary position

```
apps/api, truth-test, scripts
        |
        v
@afenda/db public exports (index.ts, package.json exports)
        |
        v
src/drizzle/ (client, db, relations)  ---> src/schema/* (table definitions)
        |
        v
pg / Neon / Drizzle runtime
```

---

## Structure

```
src/drizzle/
  ARCHITECTURE.md
  README.md
  db.ts                # default singleton wiring
  relations.ts         # runtime defineRelations(schema, ...)
  client/
    index.ts           # pooled/serverless factories + env/pool helpers
    README.md
```

---

## Core architecture

### 1. Runtime composition with stable public contracts

`src/index.ts` re-exports the runtime pieces from `src/drizzle/*` while preserving stable consumer entry points:
- `@afenda/db/client` -> `dist/drizzle/client/index.js`
- `@afenda/db/relations` -> `dist/drizzle/relations.js`
- `@afenda/db` barrel re-exports singleton/client/relations

This keeps internal layout flexible without forcing consumer rewrites.

### 2. Single responsibility split

- `client/index.ts`: pool config/env parsing, connection factories, and diagnostics
- `db.ts`: singleton convenience exports only
- `relations.ts`: runtime relation graph for Drizzle query ergonomics

Domain ownership stays in `src/schema/*`; runtime composition stays here.

---

## Design patterns

- **Composition root pattern:** runtime wiring centralized in one internal boundary.
- **Public facade pattern:** external imports go through stable package exports.
- **Separation of concerns:** domain metadata (`schema/*/_relations.ts`) separated from runtime relation graph (`drizzle/relations.ts`).

---

## Consumer map

- **Direct public use**
  - `@afenda/db/client` for factory-first usage
  - `@afenda/db/relations` for relation graph usage/mocking
  - `@afenda/db` barrel for singleton + mixed exports
- **Internal package use**
  - queries, request-context, and runners import types/helpers from `src/drizzle/*`

---

## Testing strategy

- Compile-time safety via `pnpm --filter @afenda/db build`.
- Consumer compatibility via `pnpm --filter @afenda/api typecheck`.
- Existing DB/integration tests exercise runtime wiring through public exports.

---

## Build and typecheck

```bash
pnpm --filter @afenda/db build
pnpm --filter @afenda/db test
pnpm --filter @afenda/api typecheck
```

---

## Governance rules

1. Do not introduce direct public export `@afenda/db/drizzle`; keep this layer internal.
2. Preserve `@afenda/db/client` and `@afenda/db/relations` as stable contracts.
3. Keep `db.ts` thin and side-effect minimal beyond intended singleton initialization.
4. Keep runtime relation assembly in `drizzle/relations.ts`; keep domain relation catalogs in `schema/*/_relations.ts`.
5. Update docs and export map together whenever runtime files move.

---

## Import strategy

```typescript
// Preferred external usage (stable public contracts)
import { createDatabase } from "@afenda/db/client";
import { relations } from "@afenda/db/relations";
import { db } from "@afenda/db";
```

Avoid direct imports from `src/drizzle/*` outside `@afenda/db` package internals.

---

## Summary

`src/drizzle/` formalizes a clean runtime boundary: schemas define data structures, while this layer composes executable clients and relational runtime behavior. The refactor improves clarity and maintainability while keeping external import contracts stable.

**Related:** [README.md](./README.md)
