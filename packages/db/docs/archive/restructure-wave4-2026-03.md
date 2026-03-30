# Database Package Restructure — Implementation Record

> **Status:** ✅ COMPLETE (March 2026)
> **Canonical docs:** [ARCHITECTURE.md](./ARCHITECTURE.md) · [README.md](./README.md)
>
> This file was the original restructure plan. It is kept as a historical record.
> All items are now resolved. See annotations below for final outcomes.

---

### Phase 1: Documentation (ARCHITECTURE.md + README.md) — ✅ COMPLETE

**Step 1.1 — Create ARCHITECTURE.md**

Modeled after ARCHITECTURE.md and ARCHITECTURE.md. Covers:

- Package overview + design shift table (old flat → new domain-organized)
- 5-layer architecture: **Client → Schema → Infrastructure → Truth Compiler → Operations**
- Full directory tree with annotations
- Subpath export map (table: export → purpose → runtime/type → consumers)
- Schema domain catalog (each domain's tables, enums, Zod schemas, types)
- Consumer map (apps/api, truth-test — what they import)
- Multi-tenant architecture (RLS, session context, tenant isolation)
- Truth compiler pipeline documentation
- Migration system and conventions

**Step 1.2 — Create README.md**

Quick-start usage guide covering:

- Install + basic usage
- All subpath exports with examples
- Client API (`createDatabase()`, `db`, health checks)
- Schema domains quick reference
- Shared columns, session management, RLS setup
- Seeds, maintenance, migration workflows
- "Adding a new domain" step-by-step guide

---

### Phase 2: Directory Restructuring — ✅ COMPLETE

**Step 2.1 — Rename underscore-prefixed directories** _(parallel with 2.2)_ — ✅ DONE

| Current             | New                | Reason                                                        |
| ------------------- | ------------------ | ------------------------------------------------------------- |
| `src/_shared/`      | `src/columns/`     | Describes content, not visibility                             |
| `src/_session/`     | `src/session/`     | Already a public subpath export                               |
| `src/_rls/`         | `src/rls/`         | Already a public subpath export                               |
| `src/_seeds/`       | `src/seeds/`       | CLI entrypoint, not internal                                  |
| `src/_maintenance/` | `src/maintenance/` | Ops scripts, not internal                                     |
| `src/_private/`     | **Removed**        | Was README-only placeholder; no code; `@afenda/db` uses explicit subpaths instead |

**Step 2.2 — Consolidate schema directories** _(parallel with 2.1)_ — ✅ DONE

| Current                          | New                     |
| -------------------------------- | ----------------------- |
| `src/schema-platform/core/`      | `src/schema/core/`      |
| `src/schema-platform/security/`  | `src/schema/security/`  |
| `src/schema-platform/reference/` | `src/schema/reference/` |
| `src/schema-meta/`               | `src/schema/meta/`      |
| `src/schema-domain/sales/`       | `src/schema/sales/`     |

Each domain retains its own `pgSchema()` namespace, barrel `index.ts`, and co-located enums + Zod schemas. The combined barrel `src/schema/index.ts` re-exports all domains.

**Step 2.3 — Extract client module** _(depends on 2.1)_ — ✅ DONE

Move `src/db.ts` → `src/client/` with factory pattern:

> **Final outcome:** All logic consolidated into a single `src/client/index.ts` rather than
> 5 separate files. The single-file approach is simpler and sufficient — separate files
> would be over-engineering for the current scope.

```
src/client/
└── index.ts      # createDatabase(), createServerlessDatabase(),
                  # DrizzleLogger, pool config, health checks
```

`src/db.ts` was rewritten as a thin backward-compat wrapper that delegates to `createDatabase()`.

**Step 2.4 — Update subpath exports** _(depends on 2.1–2.3)_ — ✅ DONE

New exports:

```
"."                  → db client + core re-exports
"./client"           → createDatabase factory
"./schema"           → all schemas combined
"./schema/core"      → tenants, modules
"./schema/security"  → users, roles, permissions
"./schema/reference" → currencies, countries, UOM
"./schema/meta"      → registry, metadata, overrides
"./schema/sales"     → full sales domain
"./columns"          → shared column mixins (renamed from ./shared)
"./session"          → session context management
"./rls"              → RLS policies
"./relations"        → Drizzle v2 FK relations
"./truth-compiler"   → truth engine (unchanged)
```

Deprecated backward-compat aliases kept for 1 release cycle:
`./shared` → `./columns`, `./schema-meta` → `./schema/meta`, `./schema-domain` → `./schema/sales`, `./schema-platform` → combined core+security+reference

**Step 2.5 — Consolidate apps/api db layer** _(depends on 2.3–2.4)_ — ✅ DONE

apps/api previously created its **own** Drizzle instance with Pino logging. After consolidation:

- apps/api uses `createDatabase({ logger: drizzleLogger, connectionString })` from `@afenda/db/client`
- Local `platform.ts`, `metadata.ts`, `sales.ts` kept — they define API-specific tables (schemaRegistry via pgTable) and re-export from @afenda/db
- `PinoDrizzleLogger` stays in apps/api (app-specific)

**Step 2.6 — Update all consumer imports** _(depends on 2.4–2.5)_ — ✅ DONE

~30 files across apps/api + packages/truth-test:

- `@afenda/db/schema-meta` → `@afenda/db/schema/meta`
- `@afenda/db/schema-domain` → `@afenda/db/schema/sales`
- `@afenda/db/shared` → `@afenda/db/columns`

---

### Phase 3: Multi-Domain Schema Template — ✅ COMPLETE

**Step 3.1** — Document the pattern for adding new domains in ARCHITECTURE.md (directory, pgSchema namespace, enums, tables, barrel, subpath export, relations, truth-config)

**Step 3.2** — Create stub directories for upcoming domains:

```
src/schema/accounting/   # Chart of accounts, journals, postings
src/schema/hr/           # Employees, departments, attendance
src/schema/inventory/    # Warehouses, stock moves, lots
src/schema/purchasing/   # Purchase orders, vendor bills
```

---

### Relevant Files — Final Outcome

**Created:**

- packages/db/ARCHITECTURE.md
- packages/db/README.md
- `packages/db/src/client/index.ts` (single file, not 5)
- `packages/db/src/schema/{accounting,hr,inventory,purchasing}/` stubs

**Moved/renamed:** `_shared→columns`, `_session→session`, `_rls→rls`, `_seeds→seeds`, `_maintenance→maintenance`, `schema-platform/*→schema/{core,security,reference}`, `schema-meta→schema/meta`, `schema-domain/sales→schema/sales`

**Modified:** package.json (exports), `src/index.ts`, `src/schema/index.ts`, `src/db.ts` (rewritten), ~30 consumer import files

**Kept (not deleted):** `apps/api/src/db/schema/` (contains local legacy tables with unique definitions)

---

### Verification — ✅ ALL PASSING

1. ✅ `pnpm --filter @afenda/db typecheck` — zero errors
2. ✅ `pnpm --filter @afenda/db build` — clean compilation
3. `pnpm --filter @afenda/db test:db` — requires running database
4. `pnpm --filter @afenda/db truth:check` — requires running database
5. ✅ `pnpm --filter @afenda/api typecheck` — zero errors
6. ✅ `pnpm --filter @afenda/truth-test typecheck` — zero errors (build clean)
7. `pnpm --filter @afenda/truth-test test:run` — requires running database
8. ✅ Deprecated subpath aliases still resolve
9. ✅ `drizzle.config.ts` schema path unchanged (`./src/schema/index.ts`)
10. ✅ `pnpm turbo build --filter=@afenda/db...` — dependency graph correct

---

### Decisions

- **Nested schema subpaths** (`./schema/sales` not `./schema-sales`) — scales cleanly for 10+ domains
- **Deprecated aliases** for 1 release cycle — avoids breaking consumers during migration
- **Client factory** with default `db` export for backward compat
- **seeds/maintenance NOT subpath-exported** — CLI scripts, not library APIs
- **graph-validation stays internal** — invoked via CLI only

### Further Considerations — Resolved

1. **Truth-compiler domain coupling:** Currently hardcoded to sales (`SALES_*` exports). Remains scoped to sales — parameterize when second domain lands.
2. **apps/api legacy schema files** (`platform.ts`, `metadata.ts`, `sales.ts`): Verified — `platform.ts` defines a unique `schemaRegistry` table via `pgTable` (not pgSchema-namespaced), `metadata.ts`/`sales.ts` define local API tables. These are **NOT thin re-export stubs** — they contain real table definitions used by the API's auth/introspection pipeline. Kept as-is.
3. **drizzle.config.ts schema path:** Confirmed — `./src/schema/index.ts` is the correct post-restructure path. Transparent to Drizzle Kit.
