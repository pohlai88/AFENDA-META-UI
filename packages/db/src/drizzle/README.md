# `packages/db/src/drizzle`

Internal Drizzle runtime composition boundary for `@afenda/db`: default singleton DB, client factories, and runtime relation map assembled from `schema`.

**Infrastructure tier** — internal module (no direct `@afenda/db/drizzle` export), consumed through `@afenda/db`, `@afenda/db/client`, and `@afenda/db/relations`.

---

## Quick Start

### Installation (within monorepo)

```json
{
  "dependencies": {
    "@afenda/db": "workspace:*"
  }
}
```

### Import Strategies

#### Strategy A — Subpath (recommended)

```typescript
import { createDatabase } from "@afenda/db/client";
import { relations } from "@afenda/db/relations";
```

**Use when:** You want stable public imports while this folder remains an internal implementation detail.

#### Strategy B — Barrel / alternative

```typescript
import { db, createDatabase, relations } from "@afenda/db";
```

**Use when:** You prefer one import root and already consume multiple `@afenda/db` exports.

---

## Public Surface (summary)

- `src/drizzle/client/index.ts` — pooled `pg` factory, read-replica factory, Neon serverless factories, pool/env diagnostics helpers
- `src/drizzle/db.ts` — default singleton `db`, `pool`, health helpers, and shutdown helper (`closeDatabase`)
- `src/drizzle/relations.ts` — Drizzle `defineRelations(schema, ...)` runtime map for relational query API

Full barrel: `@afenda/db` (with subpaths `@afenda/db/client` and `@afenda/db/relations`).

---

## Feature Guides

### 1. Runtime composition boundary

This folder centralizes runtime Drizzle wiring that used to sit at `src/` root. Domain schemas remain under `src/schema/*`; this folder assembles those schemas into executable runtime pieces.

### 2. Domain catalog vs runtime relations

`schema/sales/_relations.ts` and similar files are domain-level relation catalogs/metadata.  
`drizzle/relations.ts` is the actual runtime graph consumed by Drizzle (`db.query.*`).

### 3. Stable consumer imports

Consumers should not import from this folder directly. Public paths remain:
- `@afenda/db`
- `@afenda/db/client`
- `@afenda/db/relations`

---

## Local Development

- Keep env in repo-root `.env.config`, then run `pnpm env:sync`.
- Edit `drizzle/client/index.ts` for pool/driver behavior; keep `drizzle/db.ts` thin.
- Keep domain-level table and relation metadata in `src/schema/*`; update `drizzle/relations.ts` only for runtime relation assembly.

---

## Testing

```bash
pnpm --filter @afenda/db build
pnpm --filter @afenda/db test
pnpm --filter @afenda/api typecheck
```

---

## ADRs (decisions)

None dedicated yet. This folder reflects the decision to group Drizzle runtime composition under one internal boundary while preserving stable public subpaths.

---

## Related Documentation

- [ARCHITECTURE.md](./ARCHITECTURE.md) — Full design, boundary, consumers, governance
- [client/README.md](./client/README.md) — Client factory API and env tuning
- [../schema/sales/_relations.ts](../schema/sales/_relations.ts) — Sales relation metadata catalog
- [../../ARCHITECTURE.md](../../ARCHITECTURE.md) — Package-level architecture and export map

---

## Stability Policy

1. Keep this folder internal; do not add a direct package export for `./drizzle`.
2. Preserve `@afenda/db/client` and `@afenda/db/relations` compatibility when moving internals.
3. Keep `drizzle/db.ts` as a thin wrapper over `drizzle/client/index.ts`; avoid business logic in singleton wiring.

---

## Checklist (optional)

| Task | When |
| ---- | ---- |
| Run `pnpm --filter @afenda/db build` | After moving files or changing export targets |
| Verify `@afenda/db/client` and `@afenda/db/relations` still resolve | After edits to `package.json` exports |
| Update docs that reference old `src/client` / `src/db` / `src/relations` paths | During runtime layout refactors |
