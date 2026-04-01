# Sales Schema Envelope

Operational guardrails to keep the Sales schema DRY, consistent, and drift-resistant.

## Change Gate Checklist

- [ ] Table change made in the correct sales bounded-context module (`partner.ts`, `orders.ts`, …)
- [ ] Relation impact reflected in `_relations.ts`
- [ ] Enum impact reflected in `_enums.ts` (tuple + pgEnum + Zod + type)
- [ ] Shared validator or branded ID impact reflected in `_zodShared.ts`
- [ ] Custom SQL captured in `CUSTOM_SQL_REGISTRY.json` if Drizzle cannot emit it
- [ ] Migration generated and reviewed
- [ ] RLS and tenant isolation preserved
- [ ] Zod contract coverage is complete (select/insert/update) or explicitly documented as immutable/append-only

## DRY Rules

- Reuse column helpers from `column-kit`
- Reuse shared validators from `_zodShared.ts`
- Avoid duplicate enum literals inside table schemas
- Avoid copy-paste FK naming; follow existing naming convention (`fk_sales_*`)

## Drift Controls

- Structural drift: schema object and relations catalog must evolve together
- Contract drift: enum tuples, pgEnums, and Zod schemas must evolve together
- Migration drift: hand-authored SQL is invalid unless in `CUSTOM_SQL_REGISTRY.json`

## Consistency Rules

- Tenant-first indexes for tenant-scoped access patterns
- Explicit FK actions (`onDelete`, `onUpdate`) for every FK
- Monetary fields use exact numeric precision and checks
- Soft-delete aware uniqueness where business identity must remain unique among active rows

## Refactor Strategy

- Prefer small, DAG-respecting changes inside the existing bounded-context file
- Maintain existing exported symbols through `index.ts`
- Keep migration scope narrow (one conceptual refactor per migration)
- Validate no behavior change before moving to next extraction
- If table behavior changes, update migration + `_relations.ts` + README/ARCHITECTURE in the same PR

