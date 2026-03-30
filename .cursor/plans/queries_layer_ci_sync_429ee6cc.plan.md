---
name: Queries layer CI sync
overview: "FINAL LOCK: deterministic DB access surface (CQRS-lite). Option A soft-archive in access layer. v1 CI = allowlisted schema files ↔ missing `.access.ts` only + `--fix` placeholders; no AST. v2 = table extract + Safe/Active/All/archive with inferred Id/tenantId/deletedAt. Database type from db.js; never NodePgDatabase or hardcoded id: number."
todos:
  - id: docs-architecture
    content: Replace ARCHITECTURE.md with production spec + exact Option A sentence + naming semantics table + ERP allowlist pointer; align README.md
    status: completed
  - id: gate-db-access-v1
    content: tools/ci-gate/db-access-layer/index.mjs — ALLOWED_DOMAINS, path filter isAllowed(), skip index.ts/_*.ts/hr-docs; mirror basename → queries/<domain>/<file>.access.ts; check existence only; --fix placeholder @generated; no overwrite
    status: completed
  - id: gate-codegen-v2
    content: Table extraction + emit functions; type Id = typeof T.$inferSelect.id; tenantId from inference; deletedAt via column detect (not assumed); archive only if soft-delete column; import type { Database } from ../../db.js
    status: completed
  - id: wire-scripts
    content: package.json ci:gate:db-access + :fix; tools/ci-gate README; optional packages/db exports ./queries/<domain>
    status: completed
  - id: golden-sample
    content: Optional hand-reviewed workforceStrategy.access.ts after v2 as reference
    status: completed
isProject: true
---

# FINAL LOCK — Database access surface + `db-access-layer` CI

## Verdict (frozen)

**Deterministic DB access surface (CQRS-lite, enterprise minimal):** generated `*.access.ts`, human-owned projections/reports, tenant + soft-delete enforced, lightweight CI. **Correct and worth building.**

---

## Conceptual tension — **Option A (chosen)**

**Read-first with one mechanical write:** Add this exact sentence to [packages/db/src/queries/ARCHITECTURE.md](packages/db/src/queries/ARCHITECTURE.md):

```md
This layer is read-first. The only permitted write is soft-archive (`archiveX`) as a mechanical operation aligned with soft-delete columns. All other mutations belong to the command layer.
```

Option B (pure read, move archive to `commands/`) — **not chosen** (would slow delivery).

---

## Naming semantics (never mix)

| Function       | Semantics                     |
| -------------- | ----------------------------- |
| `getXByIdSafe` | tenant + **excludes** deleted |
| `listXActive`  | **excludes** deleted          |
| `listXAll`     | **includes** deleted          |
| `archiveX`     | soft-delete only (Option A)   |

---

## Non-negotiable technical rules

### 1. ID types (generator v2)

- **Never** hardcode `id: number` / `id: string` per table guess.
- **Always** emit:

```ts
type SomeRowId = typeof someTable.$inferSelect.id;
// … id: SomeRowId
```

### 2. Database type

- **Do not** use `NodePgDatabase` in generated or hand templates.
- **Do** use:

```ts
import type { Database } from "../../db.js";
```

(relative depth adjusted per file under `queries/<domain>/`). Ensures schema-typed `Database` matches [packages/db/src/db.ts](packages/db/src/db.ts) / client.

### 3. CI domain allowlist (config)

```js
const ALLOWED_DOMAINS = ["hr", "sales", "inventory", "accounting", "purchasing"];
const EXCLUDED_DOMAINS = ["core", "security", "meta", "reference"]; // documentary; filter by allowlist first
```

`isAllowed(schemaPath)` — true only if path matches `packages/db/src/schema/<allowed>/` (posix-normalize on Windows). Also skip subfolders that are not domains (e.g. stray paths).

### 4. File exclusions (always)

Skip:

- `index.ts`
- `_*.ts` (e.g. `_schema.ts`, `_relations.ts`)
- non-`.ts` files
- e.g. `hr-docs/` under hr (no `.access.ts` for markdown)

### 5. Soft-delete detection (v2 only)

- **Do not** assume every table has `deletedAt`.
- v2: detect from extracted column list / schema body (same pipeline as column inference). If present: emit `isNull(...)` for Safe/Active + `archiveX`; if absent: omit those patterns (only tenant-scoped list/get as appropriate).

Note: `"deletedAt" in table.$inferSelect` is **TypeScript**-only; codegen uses **extractor output**, not TS compile of schema.

---

## Generator scope lock

### v1 (implement first)

- Enumerate allowlisted schema files (with exclusions).
- For each, require `queries/<domain>/<sameBasename>.access.ts`.
- CI **fails** if missing.
- `--fix`: create dirs + **placeholder** (`// @generated` + `export {}` or minimal stub).
- **No** table extraction, **no** function body validation, **no** AST of TS sources for semantics.

### v2 (later)

- Extract table symbols per file (reuse/adapt [drizzle-schema.mjs](tools/ci-gate/postgres-schema/extractors/drizzle-schema.mjs) or sibling).
- Emit `getXByIdSafe`, `listXActive`, `listXAll`, and `archiveX` (if soft-delete column) per table.
- Infer **Id**, **tenantId** column presence/type pattern, **deletedAt** as above.
- Prefer **uniform `async` functions** returning awaited results.

---

## CI philosophy (v1)

**Dumb and strict:**

- Checks: schema file (in allowlist) ↔ sibling `.access.ts` exists.
- Does **not**: validate function names inside file, parse AST for exports, or enforce naming by static analysis (defer to v2 docs/tests if needed).

---

## Target layout (post-implementation)

```txt
packages/db/src/schema/<domain>/*.ts     → structure
packages/db/src/queries/<domain>/*.access.ts  → @generated baseline (v1 placeholder → v2 full)
packages/db/src/queries/<domain>/*.ts    → human projections (never overwritten by gate)
apps/*                                   → orchestration
```

---

## ARCHITECTURE.md paste instructions

Use the user’s full **Database Access Layer — Architecture** markdown as the base body, then:

1. Insert the **Option A** sentence (read-first + only `archiveX`).
2. Add **ERP-only** scope referencing **ALLOWED_DOMAINS** / CI config.
3. Embed the **naming semantics** table above.
4. State **v1 vs v2** generator expectations (placeholder vs full emit).
5. Keep **meta-types** as optional `import type` for session/filter DTOs only.

---

## Success criteria

- Option A sentence present; naming table consistent with templates.
- v1 gate green after `--fix` for all allowlisted schema modules.
- `pnpm --filter @afenda/db build` passes once placeholders (or v2 outputs) exist.
- v2: no `NodePgDatabase`, no hardcoded numeric id for uuid tables, `Database` from `db.js`.

---

## Execution trigger

Implementation starts when the user explicitly says **execute the plan** (or Agent mode equivalent).
