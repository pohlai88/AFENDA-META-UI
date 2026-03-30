# ADR-004: Skills taxonomy and performance ratings (Phase 5 — deferred)

## Status

Accepted — **implementation deferred** until product defines taxonomy and rating models. No new enum values or columns beyond this decision record until sign-off.

## Context

- **Skill categories** (`skillTypeCategories` in [`_enums.ts`](../_enums.ts)) may need splitting into clearer dimensions (for example domain vs proficiency vs certification) for analytics and career paths.
- **Performance ratings** today use descriptive labels (`performanceRatings`). Some organizations require a parallel numeric scale (1–5) or a single canonical scale shared with compensation.

## Decision (pending implementation)

1. Whether to introduce additional enums or tagged structures for skill taxonomy, or to normalize via reference tables.
2. Whether to add a numeric rating enum or column, replace descriptive labels, or maintain a mapping layer in application code.

Until product completes the above, engineering keeps the current `_enums.ts` catalogs stable aside from unrelated HR work, and any change follows ADR + additive migration policy.

## Consequences

- Any new enum values require PostgreSQL `ADD VALUE` migrations and backward-compatible defaults.
- HR insert schemas and reporting must stay aligned with `_enums.ts` after changes.
- Phase 5 completion = updated ADR section "Decision" moved from pending to concrete + schema/migration PR.

## Links

- [`_enums.ts`](../_enums.ts) — `skillTypeCategories`, `performanceRatings`
- [`HR_SCHEMA_UPGRADE_GUIDE.md`](./HR_SCHEMA_UPGRADE_GUIDE.md) — upgrade cadence for HR
