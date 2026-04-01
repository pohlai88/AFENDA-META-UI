# Sales Stability Contract

This document defines the minimum stability bar for `schema/sales` changes.

## Stability Checklist

- [ ] All changes preserve bounded-context file naming and placement (`partner.ts`, `orders.ts`, etc.)
- [ ] `_relations.ts` updated in the same PR for any FK edge changes
- [ ] `drizzle-schema-quality` passes with zero sales-domain errors
- [ ] `pnpm --filter @afenda/db typecheck` passes
- [ ] `truth-score` and `postgres-schema` gates still pass
- [ ] Docs updated in `README.md` and/or `ARCHITECTURE.md` when contracts change

## Automated Guardrails

- `RELATIONS_DRIFT` validates sales relations catalog parity against extracted `foreignKey()` edges.
- `truth-score` reads canonical sales module list and validates high-risk table controls.
- `postgres-schema` reads canonical sales module list and evaluates business-truth rules.

## Intentional Exceptions

- Query access layer currently uses a single aggregate entrypoint: `queries/sales/tables.access.ts`.
- This exception is explicitly mapped in db-access discovery and documented in db-access gate docs.

## Residual Risk Notes

- Relations drift checker currently focuses on table-level FK edge parity; semantic relation naming quality is still manual review.
- Business behavior changes that require SQL migration (new FKs/checks/indexes) must be paired with migration + docs + relation updates in one PR.
