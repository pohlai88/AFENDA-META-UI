# RELATIONS_DRIFT remediation (living checklist)

**Gate:** `pnpm ci:gate:schema-quality` — rule `RELATIONS_DRIFT` (**error**) compares `hrRelations` in `_relations.ts` to `foreignKey()` edges extracted from HR schema modules. See `tools/ci-gate/drizzle-schema-quality/README.md` and `LIMITATIONS.md` for scope (single-column FKs + composite `[tenantId, id]` second leg only).

**Goal:** Align the catalog with physical Drizzle FKs so the diff is actionable. **`RELATIONS_DRIFT` is `error`** in `rules-matrix.json` as of 2026-03-29 (gate clean); regressions fail the default `ci:gate:schema-quality` threshold.

---

## How to work

1. Run from repo root: `pnpm ci:gate:schema-quality` (optionally `--format=json` for sorting/filtering).
2. Classify each finding into a **bucket** below.
3. Prefer **fix catalog or schema** over `baseline.json`. Use baseline only for time-boxed debt with an explicit `reason`.

---

## Bucket A — Catalog field names ≠ SQL columns

**Symptom:** Gate says catalog expects `table.old_name → …` but the schema uses a different SQL column (e.g. `parent_id` vs `parent_department_id`, `leave_type_id` vs `leave_type_config_id`).

**Fix:** In `_relations.ts`, set `fromField` / `toField` to the **exact** string inside Drizzle column definitions (`uuid("…")`, `integer("…")`, etc.).

### Checklist (add rows as you fix)

| Done | Catalog key / area | Was (wrong) | Should be (SQL) | PR / notes |
|------|-------------------|-------------|-----------------|------------|
| [ ] | | | | |

---

## Bucket B — Code has FK; catalog missing row

**Symptom:** Finding points at a `.ts` file: “foreignKey … has no matching hrRelations entry”.

**Fix:** Add a `hrRelations` entry with correct `from`, `to`, `kind`, `fromField`, `toField` (physical edge after `kind` mapping). Use a stable camelCase key name (naming is human-facing only; CI dedupes by physical FK key — see comment block at top of `_relations.ts`).

### Checklist

| Done | Edge (child.col → parent.col) | New `hrRelations` key | PR / notes |
|------|------------------------------|------------------------|------------|
| [ ] | | | |

---

## Bucket C — Catalog row; no `foreignKey()` in schema

**Symptom:** Finding points at `_relations.ts`: “hrRelations expects FK … but no matching foreignKey()”.

**Fix:** Either add `foreignKey()` in Drizzle, **or** remove/adjust the catalog entry if the link is deferred, logical-only, or documented in `CIRCULAR_FKS.md` / ADR-002.

### Checklist

| Done | Catalog entry | Resolution (FK added / row removed / doc link) | PR / notes |
|------|---------------|--------------------------------------------------|------------|
| [ ] | | | |

---

## Bucket D — Extractor / scope gap

**Symptom:** Legitimate FK exists but is not a single-column FK and not a composite `[ref.tenantId, ref.id]` second-leg pattern.

**Fix:** Extend `hr-fk-graph.mjs`, accept as documented limitation until Phase 3, or **baseline** the stable `key` with reason and issue link.

### Checklist

| Done | Finding key / description | Approach | PR / notes |
|------|---------------------------|----------|------------|
| [x] | Self-table composite: `[table.tenantId, table.id]` as `foreignColumns` | Emit second leg in `hr-fk-graph.mjs` when `foreignColumns` both use `table` | 2026-03-29 |

---

## Batch PR strategy

| PR | Scope | Review focus |
|----|--------|--------------|
| 1 | **Bucket A** only — rename `fromField` / `toField` to match SQL | Diff noise should drop sharply; no behavior change in DB if names were doc-only wrong labels. |
| 2 | **Bucket B** — add missing `hrRelations` rows | Consistency with existing catalog style and `kind` semantics. |
| 3 | **Bucket C** — schema FKs or catalog removals + doc pointers | Cross-check `CIRCULAR_FKS.md` and migrations. |
| 4 | **Bucket D** — tooling, baselines, or follow-ups | Small, explicit. |

---

## Severity promotion

**Done (2026-03-29):** `RELATIONS_DRIFT.severity` is `error` in `rules-matrix.json`; baseline has no suppressions for this rule.

If the rule is ever relaxed temporarily:

1. Revert to `warn` only with team agreement and a dated baseline entry + issue link.
2. Restore `error` when the catalog and extractor are aligned again.

---

## Progress log

| Date | RELATIONS_DRIFT count (approx) | Notes |
|------|--------------------------------|-------|
| 2026-03-29 | ~43 warn | Initial gate shipping; catalog vs SQL name drift common. |
| 2026-03-29 | 0 | Full catalog pass, deferred-row removals, `hr-fk-graph` self-composite second leg, `staffing_plans.approved_by` → employees; severity → **error**. |

---

## Owners / target (optional)

| Area | Owner | Target date |
|------|--------|-------------|
| Bucket A | | |
| Bucket B | | |
| Bucket C | | |
| Bucket D | | |
