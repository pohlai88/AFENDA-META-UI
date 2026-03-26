## Plan: Optimized DB-First ERP Roadmap

The current roadmap has a **critical blind spot**: `schema-domain/sales` is prototype-quality while `schema-platform` tables are production-grade. They use completely different patterns. This must be fixed before any domain expansion, otherwise every new module copies the wrong template.

---

### Critical Finding: Sales vs Platform Quality Gap

| Aspect | schema-platform (users, tenants, etc.) | schema-domain/sales | Severity |
|--------|--------------------------------------|---------------------|----------|
| Schema isolation | `pgSchema("security")`, `pgSchema("core")` | `pgTable()` (public schema) | **CRITICAL** |
| Tenant column | `tenantId: integer().notNull()` | **Missing entirely** | **CRITICAL** |
| Indexes | Tenant-leading composites + partial uniques | **Zero indexes** | **CRITICAL** |
| RLS policies | `tenantIsolationPolicies()` + `serviceBypassPolicy()` | **None** | **CRITICAL** |
| Shared columns | `...timestampColumns, ...softDeleteColumns, ...auditColumns` | Inline `createdAt`/`updatedAt` only | **HIGH** |
| Timestamps | `timestamp({ withTimezone: true })` | `timestamp()` — no timezone | **HIGH** |
| Zod schemas | `createInsertSchema`/`Select`/`Update` with overrides + branded IDs | **None** | **HIGH** |
| Enum pattern | `as const` + `pgSchema.enum()` + `z.enum` triplet | `pgEnum()` only | **MEDIUM** |
| FK declarations | `foreignKey()` explicit + companion `index()` | `.references()` inline, no indexes | **HIGH** |
| PK strategy | `integer().generatedAlwaysAsIdentity()` | `uuid().defaultRandom()` | **Decision needed** |

---

### Optimized Phase Structure

**Phase 0** — Documentation Consolidation *(unchanged — 34 → 8 docs)*

**Phase 0.5 — Schema Foundation Standards** *(NEW — highest leverage)*

> Fix the template before the template gets copied 6 more times.

1. **Rewrite sales/tables.ts to match platform quality**:
   - Add `pgSchema("sales")` namespace isolation
   - Add `tenantId` + FK to tenants on all tables
   - Use `...timestampColumns, ...softDeleteColumns, ...auditColumns`
   - Fix `timestamp()` → `timestamp({ withTimezone: true })`
   - Add explicit indexes on **every FK column** (PG does NOT auto-index FKs), all tenant-leading
   - Add partial unique indexes: SKU unique per tenant `WHERE deletedAt IS NULL`
   - Add CHECK constraints: `quantity > 0`, `discount BETWEEN 0 AND 100`, `subtotal >= 0`
   - Add RLS policies via `tenantIsolationPolicies()` + `serviceBypassPolicy()`

2. **Split sales domain into per-domain file pattern** (ported from `afenda-hybrid`):
   - `_enums.ts` — Enum triplet: `as const` → `salesSchema.enum()` → `z.enum()` 
   - `_zodShared.ts` — Domain refinements: `refinePricePositive()`, `refineDiscountRange()`, `refineDeliveryAfterOrder()`
   - `_relations.ts` — Drizzle `defineRelations()` for relational queries
   - `tables.ts` — Clean table definitions importing from above

3. **Add Zod schemas with branded IDs**:
   - `createInsertSchema`/`createSelectSchema`/`createUpdateSchema` per table
   - Branded types: `z.number().int().brand<"SalesOrderId">()`, `PartnerId`, `ProductId`, etc.
   - Cross-field `superRefine` that **mirrors** CHECK constraints (double-safety)

4. **Decide PK strategy** — Standardize UUID vs integer identity across all domains *(decision needed from you)*

5. **Update adding-a-module.md** with full canonical checklist covering every requirement above

6. **Adapt seed system** to work with `pgSchema`-namespaced tables

**Phase 1** — Sales Truth Engine *(same scope, now builds on solid 0.5 foundation)*
- State machine, financial invariants, invariant tests
- `GENERATED ALWAYS AS STORED` for computed subtotal/totals (PostgreSQL skill recommendation)
- All Zod refinements mirror corresponding CHECK constraints

**Phase 2** — Accounting Double-Entry Engine *(enhanced)*
- Same scope + `pgSchema("accounting")` from day one
- BRIN indexes on journal entry `date` columns (time-series PG optimization)
- Trial balance invariant: `Σ(debit) = Σ(credit)` enforced at DB CHECK + Zod + API

**Phase 3** — CI Truth Governance *(enhanced)*
- Same scope + automated FK index coverage check (verify every FK has a companion index)
- Schema snapshot: `drizzle-kit introspect` → JSON diff in CI
- Dependency catalog completeness check

**Phase 4** — Domain Expansion *(each domain follows canonical pattern)*
- Same 6 domains (CRM, Purchasing, Inventory, HR, Manufacturing, Projects)
- HR domain can be largely **ported from `afenda-hybrid`** legacy (employees, departments, positions, attendance, leave + payroll/benefits/learning/recruitment/talent)
- Each domain gets: `pgSchema`, `_enums.ts`, `_zodShared.ts`, `_relations.ts`, tenant-leading indexes, branded IDs, RLS, CHECK constraints

**Phase 5 — Dependency Governance** *(NEW — parallel with Phase 0.5)*

1. Move to pnpm catalog: `react`, `react-dom`, `vite`, `express`, `graphql-yoga`, `@tanstack/react-query`, `@tanstack/react-table`, `recharts`, `lucide-react`, `@reduxjs/toolkit`
2. Pin infrastructure deps exactly (drop caret): `react`, `vite`, `typescript`
3. Document `drizzle-orm` beta risk + monitoring plan in CONTRIBUTING.md
4. Add new-dependency admission checklist

---

### Relevant Files

- tables.ts — **Full rewrite** (prototype → production quality)
- users.ts — **Reference pattern** to match (pgSchema, indexes, Zod, RLS, branded IDs)
- tenants.ts — **Reference** for enum triplet pattern
- _shared — Shared columns to adopt in sales
- tenant-policies.ts — RLS factory to apply
- index.ts — Adapt for pgSchema tables
- pnpm-workspace.yaml — Add missing deps to catalog
- adding-a-module.md — Update canonical checklist
- ROADMAP.md — Update with optimized phases

---

### Verification

1. **Phase 0.5**: `pnpm ci:gate` passes + manual diff confirming sales tables now have: pgSchema, tenantId, indexes on every FK, RLS policies, Zod schemas with branded IDs, shared columns
2. **Phase 1**: Invariant test suite passes — state transitions, financial computation
3. **Phase 2**: `Σ(debit) = Σ(credit)` holds for all seed scenarios
4. **Phase 3**: CI catches intentional schema drift, missing FK indexes, seed hash mismatch
5. **Phase 5**: `pnpm syncpack list-mismatches` returns clean

---

### Decisions Needed

1. **PK strategy**: UUID (`uuid().defaultRandom()` — current sales) vs integer identity (`integer().generatedAlwaysAsIdentity()` — current platform). *Recommendation*: standardize on integer identity for internal PKs, optional UUID for external-facing identifiers.
2. **Sales schema migration**: Moving from public schema to `pgSchema("sales")` requires a PostgreSQL schema migration. Accept this?
3. **HR port scope**: Port table structures + Zod patterns directly from `afenda-hybrid`, or redesign? Legacy has ~25+ Zod refinements and mature CHECK constraints ready to port.

---

### Further Considerations

1. **GENERATED columns for computed fields**: PostgreSQL supports `GENERATED ALWAYS AS STORED` — use for `subtotal = quantity * price_unit * (1 - discount/100)` to eliminate computation drift. Drizzle ORM support needs verification.
2. **fundamentals/ + operations/ directory split**: Legacy uses this per domain (master data vs transactional). Worth adopting, or keep flat? *Recommendation*: adopt for domains with 5+ tables.
3. **BRIN indexes**: For time-series columns (journal entries, audit logs, attendance). Dramatically smaller than B-tree for append-mostly data. Use where physical row order correlates with column value.