# HR enum additive catalog — Phase 2 & 4 sign-off

**Purpose:** Record product/engineering agreement for PostgreSQL enum **additive** labels shipped with `_enums.ts` and migration `20260329230000_hr_enum_additive_catalog`.

## Phase 2 — `fuel_type` and `dei_metric_type`

| Change | Labels | Notes |
|--------|--------|--------|
| Travel / fleet | `hydrogen`, `biofuel` | Extends `fuelTypes` for low-carbon reporting. |
| DEI metrics | `hiring_rate`, `attrition_rate` | Extends `deiMetricTypes` for workforce analytics. |

**Sign-off**

- Engineering: values merged in `_enums.ts`; SQL migration applies `ADD VALUE IF NOT EXISTS` when types exist.
- Product: _________________________ Date: ___________

## Phase 4 — `benefit_status` (`pending`)

| Change | Label | Notes |
|--------|-------|--------|
| Core employment enrollment | `pending` | Distinct from upgrade-module `benefitEnrollmentWorkflowStatuses`; use for pre-active enrollment on `employment` rows. |

**Sign-off**

- Product confirms `pending` is required for core employment UX (optional until checked).
- Product: _________________________ Date: ___________

**Default:** `employment.benefit_status` remains `active` by default in Drizzle until product requests a default of `pending` and a data migration.

## Links

- Migration: `packages/db/migrations/20260329230000_hr_enum_additive_catalog/migration.sql`
- Catalog: `packages/db/src/schema/hr/_enums.ts`
