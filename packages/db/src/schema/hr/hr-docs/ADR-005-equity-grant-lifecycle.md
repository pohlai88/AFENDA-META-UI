# ADR-005: Equity grant lifecycle (`equity_grant_status`)

## Status

Accepted — catalog and migration aligned with `_enums.ts`; transition rules remain product-owned until tightened in app code or CHECK constraints.

## Context

Equity grants (`hr.equity_grants`, `packages/db/src/schema/hr/compensation.ts`) use `equity_grant_status` for lifecycle tracking. The enum was extended additively with `granted` (initial recorded grant) and `terminated` (administrative or legal end state distinct from `cancelled`).

## Decision

1. **Canonical values** live in `equityGrantStatuses` in [`_enums.ts`](../_enums.ts): `granted`, `active`, `vested`, `exercised`, `expired`, `cancelled`, `terminated`.
2. **Typical flow (informative, not enforced in DB):**

   ```mermaid
   stateDiagram-v2
     [*] --> granted: record grant
     granted --> active: enrollment / start
     active --> vested: vesting completes
     vested --> exercised: option/RSU settlement
     active --> expired: time-bound expiry
     granted --> cancelled: void before active
     active --> terminated: forced end
     vested --> terminated: forced end after vest
   ```

3. **Column default** today remains `active` on `equity_grants.status`; moving the default to `granted` is a separate product decision (data migration for existing rows).
4. **PostgreSQL** uses additive `ALTER TYPE ... ADD VALUE` (see `migrations/20260329230000_hr_enum_additive_catalog/migration.sql`) for databases that already had the pre-extension enum.

## Consequences

- Application services must validate allowed transitions; the database does not encode the graph.
- New states require ADR update + migration + Zod/Drizzle alignment in `_enums.ts`.

## Links

- [`compensation.ts`](../compensation.ts) — `equityGrants` table
- [`_enums.ts`](../_enums.ts) — `equityGrantStatuses`, `equityGrantStatusEnum`, `EquityGrantStatusSchema`
