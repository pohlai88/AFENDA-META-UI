# Database seeds (`src/seeds`)

Operational **CLI + library** entry points that populate a development/test database with deterministic ERP-shaped data. This folder is **not** a published `@afenda/db/*` subpath; consumers import deep paths (e.g. tests) or invoke the script via pnpm.

**Status (documentation pass):** Architecture and workflows are described here so the team can **audit and modernize** seed domains next. Several areas are **legacy or placeholder** (see [ARCHITECTURE.md](./ARCHITECTURE.md#known-gaps--staleness)).

---

## Quick start

From repo root:

```bash
pnpm --filter @afenda/db seed
# alias:
pnpm --filter @afenda/db db:seed
```

With scenario or phases:

```bash
pnpm --filter @afenda/db db:seed -- --scenario=baseline
pnpm --filter @afenda/db db:seed -- --phases=foundation,business --skip-contract
pnpm --filter @afenda/db db:seed -- --help
```

After a **canonical** seed, optional isolated synthetic rows:

```bash
pnpm --filter @afenda/db seed:synthetic
```

Assert contract only (DB already seeded):

```bash
pnpm --filter @afenda/db seed:assert-contract
```

Verify clear delete order vs live FK graph (needs DB URL):

```bash
pnpm --filter @afenda/db verify:clear-plan
```

Valid scenarios are defined in `index.ts` (currently `baseline`, `demo`, `stress`, `load-test-1M`).

**Neon / connection matrix (production-safe defaults)**

| Operation | URL |
| --------- | --- |
| `drizzle-kit migrate` | **Direct** (`DATABASE_URL_MIGRATIONS` in `drizzle.config.ts`) |
| Canonical seed (`db:seed`) | **Direct** — avoids pooler transaction quirks and heavy churn on pooled connections |
| `seed:synthetic` (drizzle-seed bulk) | Pooled is usually OK |
| App runtime | Pooled `DATABASE_URL` |

**Requirements**

- `DATABASE_URL` (and typical `.env` from `pnpm env:sync`). For migrate + canonical seed, prefer **`DATABASE_URL_MIGRATIONS`** (non-pooled) when using Neon.
- A database that matches current migrations (seeds assume tables/columns exist).
- Prefer **disposable dev** targets; the orchestrator **clears** many tables before inserting.

---

## What runs (high level)

1. **Single Drizzle transaction** on the default `db` (`../drizzle/db.js`).
2. **`clearExistingData(tx)`** — deletes rows in FK-safe order via `SEED_CLEAR_TABLES_IN_DELETE_ORDER` (`clear-tables.ts`, invoked from `clear.ts`).
3. **Phased pipeline** (`seed.engine.ts`): **`foundation`** (default tenant + system user) → **`business`** (`seedCore` or load-test business slice) → **`scenario`** (sales, consignment, returns, subscriptions, commissions, or load generator) → optional **`synthetic`** (use `seed:synthetic`, not mixed into canonical snapshot).
4. **Snapshot check** — deterministic hash from `SEED_IDS` + money fixtures (`snapshot.ts` → `packages/db/seed.snapshot`), skipped for `load-test-1M`.
5. **Seed contract** — `assert-seed-contract.ts` validates counts, required IDs, and invariants after commit for full baseline-style runs (skipped for `load-test-1M` or `--skip-contract`, or when `--phases` omits `scenario`).

---

## Layout

| Path | Role |
| ---- | ---- |
| `index.ts` | Orchestrator, scenario registry, phased engine, CLI (only when executed as main) |
| `seed.contract.ts` / `assert-seed-contract.ts` | Versioned guarantees + runtime validation |
| `seed.engine.ts` | Phase runner + scenario plugin hooks |
| `clear-tables.ts` | Ordered table list for FK-safe wipe |
| `clear-plan.ts` | FQN list + FK-order verification vs `information_schema` |
| `seed-types.ts` | `Tx`, `SeedScenario`, `SeedAuditScope`, default tenant/user constants |
| `seed-ids.ts` | Central deterministic UUID pool (`SEED_IDS`) |
| `clear.ts` | Calls `clearExistingData` using `clear-tables` order |
| `synthetic-seed.ts` | Isolated `drizzle-seed` allowlist (`seed:synthetic`) |
| `snapshot.ts` | `generateSeedHash` / `verifySnapshot` |
| `money.ts` | Decimal-safe money helpers |
| `factories.ts` | `SeedFactory` pattern |
| `scenarios.ts` | Scenario-style DSL for tests |
| `domains/*/` | Per-domain `seed*` + `validate*` functions |
| `performance/*` | Load-test generator, partition validation scripts |
| `__test__/`, `performance/__test__/` | Vitest |

---

## Adding or changing a domain (current protocol)

Documented in `index.ts` header; summarized here:

1. Add `domains/<domain>/index.ts` with seed + optional validate functions.
2. Extend `seed-ids.ts` (UUID changes **intentionally** break snapshot CI until `seed.snapshot` is updated).
3. Extend `clear-tables.ts` (`SEED_CLEAR_TABLES_IN_DELETE_ORDER`) with deletes in **reverse FK** order.
4. Wire imports and calls into `seedCore` and/or `scenarioSeeds` in `index.ts`.

Until a broader refresh, treat this protocol as **the contract** even if some domains lag the live schema.

---

## Related documentation

- [ARCHITECTURE.md](./ARCHITECTURE.md) — Flow, roles, gaps, modernization checklist
- [../../ARCHITECTURE.md](../../ARCHITECTURE.md) — Package-level mention of seeds as operational tooling
- [../drizzle/README.md](../drizzle/README.md) — Default `db` used by the orchestrator

---

## Stability & safety

- **Do not** point seeds at production without an explicit ops decision (destructive clear phase).
- Changing `SEED_IDS` or snapshot inputs requires updating **`seed.snapshot`** and team sign-off (hash gate).
- **RLS:** Seeds use the default app `db` connection; if your pool user is subject to RLS, confirm whether migrations/service role allow seeding or whether GUC/session setup is required — this is an open operational detail to resolve during refresh.

**E2E (`apps/web`)** — `playwright.config.ts` runs `e2e/playwright-global-setup.ts`: `db:migrate` + `db:seed --scenario=baseline` (includes contract assert) when `DATABASE_URL` is set. Set `E2E_SKIP_SEED_GATE=1` to skip.
