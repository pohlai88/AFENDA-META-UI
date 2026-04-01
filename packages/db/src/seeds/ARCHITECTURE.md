# Seeds — Architecture

> **Layer:** Operational tooling (Layer 5b in package `ARCHITECTURE.md`)  
> **Package export:** None — use `pnpm --filter @afenda/db seed` or import `src/seeds/**/*.ts` from tests/tools  
> **Primary entry:** `index.ts` (`seed()` + CLI when executed as main)

---

## Purpose

Provide **repeatable**, **transactional** database fixtures for:

- Local development and manual QA
- Automated tests (`packages/db` invariant / truth tests import `seed` and validators)
- Optional large-scale load scenarios (`load-test-1M`)

Seeds are **not** the source of truth for production data; they mirror a **subset** of ERP domains with stable IDs for tests and demos.

---

## Design (current)

### Orchestration

```
seed()
  └─ db.transaction
        ├─ clearExistingData(tx)     // destructive; FK order from clear-tables.ts
        └─ runSeedEngine(phases)
              ├─ foundation → ensureDefaultTenant / ensureSystemUser
              ├─ business   → seedCore (or load-test business slice)
              ├─ scenario   → scenario tail (sales, consignment, …) per scenario
              └─ synthetic  → (optional; use seed:synthetic — not in default pipeline)
  └─ verifySnapshot(generateSeedHash())   // skipped for load-test-1M
  └─ assertSeedContract(db)                 // skipped when inappropriate; see README
```

- **Atomicity:** One transaction for clear + insert for standard scenarios (load-test path still uses transactional inserts but custom ordering inside scenario).
- **Audit scope:** `SeedAuditScope` threads `tenantId`, `createdBy`, `updatedBy` into domain seeders.

### Determinism

- **`SEED_IDS`:** Single flat registry of UUIDs shared across domains to avoid circular imports and stabilize cross-table FKs.
- **`seed.snapshot`:** SHA-256 over a manifest (`SEED_IDS` + selected money computations). CI-style verification ensures accidental ID or money drift is caught.

### Domain modules

Each `domains/<name>/index.ts` typically exports:

- `seed…(tx, seedAuditScope)` — inserts
- `validate…Invariants(tx, …)` — optional post-conditions

Naming still carries **phase** suffixes (`Phase6`, `Phase7`, …) from an older rollout; they do not necessarily match current schema versioning or product phases.

### Performance subdirectory

- **`load-test-generator.ts`** — bulk order generation for `load-test-1M`
- **`validate-partitions.ts`** — partition validation helper (run via tsx per file header)

---

## Consumer map

| Consumer | Usage |
| -------- | ----- |
| Developers | `pnpm --filter @afenda/db seed` |
| `packages/db` tests | `import { seed } from "../seeds/index.js"`, domain validators, `SEED_IDS` |
| CI / gates | Snapshot hash vs `seed.snapshot` (when wired in pipeline) |

---

## Known gaps & staleness

This section exists so we can **plan a full refresh** without guessing.

1. **Schema drift:** Domain seeders may not cover new tables/columns added after the last seed pass; `clear.ts` may omit new tables → leftover rows or FK failures.
2. **Scenario placeholders:** `demo` and `stress` largely duplicate `baseline` and only log placeholder messages — not distinct datasets yet.
3. **Phase naming:** Function names (`Phase6`, …) are historical; they should be renamed or mapped to domain-owned modules during refactor.
4. **HR / other schema:** Large HR schema exists under `src/schema/hr`, but there is **no** `seeds/domains/hr` today — coverage is skewed toward sales/commercial paths.
5. **RLS / roles:** Orchestrator uses default `db` from `drizzle/db.ts`. If the connected role hits RLS, seeding may fail or require `setSessionContext` / service role — **document and test** for your deployment model.
6. **Package boundaries:** Seeds import schema tables directly; they are coupled to internal module layout. A future refactor might isolate `seeds` behind narrow insert APIs — not done yet.

---

## Modernization checklist (next pass)

Use this after schema/product priorities are clear:

- [ ] Inventory **tables** touched vs **all** tenant-scoped tables in `schema/`
- [ ] Align `clear.ts` delete order with current FK graph (or generate from metadata)
- [ ] Decide **per scenario** datasets (demo vs stress vs baseline)
- [ ] Rename phase-based exports to **domain language**
- [ ] Add **HR** (or other) domains or explicitly mark out-of-scope
- [ ] Confirm **RLS/service role** story for CI and local
- [ ] Regenerate **`seed.snapshot`** only after intentional ID/money contract changes

---

## Testing

```bash
pnpm --filter @afenda/db exec vitest run src/seeds/__test__
pnpm --filter @afenda/db exec vitest run src/seeds/performance/__test__
```

Broader DB tests that call `seed()` may require a live database and env — see package test scripts.

---

## Summary

The seed system is a **coherent orchestrator** (clear → foundation → scenario → snapshot) with **strong determinism** goals, but **domain coverage and naming reflect past milestones**. Treat this document as the baseline for the next **intentional** seeds program — not as a claim that every seed file matches today’s schema.

**Related:** [README.md](./README.md)
