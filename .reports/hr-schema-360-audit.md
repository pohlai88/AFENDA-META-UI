# HR Schema 360° Audit Report

**Date:** 2026-03-29  
**Scope:** `packages/db/src/schema/hr/` — **146** physical `hr.*` tables across **27** domain modules (excluding `_*.ts` infra and `onboarding.ts`), plus shared `_enums.ts`, `_zodShared.ts`, `_relations.ts`, `CUSTOM_SQL_REGISTRY.json`, and migration chain under `packages/db/migrations/`.  
**Method:** Grep inventory, automated scan (`tools/scripts/hr-schema-audit-scan.mjs` → `.reports/hr-audit-scan-raw.json`), targeted file reads, `pnpm exec drizzle-kit check` from `packages/db`.  
**Plan reference:** Cursor plan *HR schema 360 audit* (do not edit plan file); mirror template in `.reports/hr-schema-360-audit-PLAN.md`.

---

## Severity rubric (applied to every finding)

| Severity | Definition |
|----------|------------|
| **P0** | Breaks tenant isolation, referential integrity, or RLS; cross-tenant or orphan data risk; or blocks migration verification. |
| **P1** | Conventions, performance, maintainability; Zod vs DB drift that rejects valid rows or accepts invalid shapes. |
| **P2** | Documentation, symbolic relation catalog drift, naming ergonomics without wrong DB behavior. |

---

## Executive summary

- **Inventory:** Reconciled `hrSchema.table(` count to **146** tables. The P0 registry in `HR_SCHEMA_UPGRADE_GUIDE.md` previously showed **141** in the Total row (arithmetic drift); **Total is corrected to 146**, and README / `index.ts` / `PROJECT-INDEX.md` / `hr-docs/README.md` / `ADR-001` were aligned to **146**.
- **RLS (dimension 2):** Scan shows **no file** where `tenantIsolationPolicies` or `serviceBypassPolicy` counts diverge from table count (`rlsMismatch: false` for all 27 modules; **146/146** tables).
- **Referential integrity (dimension 1):** At least **two confirmed P0 gaps** in `benefits.ts` (`benefit_enrollments.employee_id`, `benefit_claims.reviewed_by`). A broader pattern of `approved_by` / `reviewed_by` UUID columns exists across HR; **full composite FK coverage to `employees` was not exhaustively proven** in this pass — backlog item.
- **Zod parity (dimension 5):** **`benefits.ts` insert schemas** validate `tenantId` as **UUID** while Drizzle defines **`integer("tenant_id")`** — **P0** runtime/DB mismatch for all five insert schemas in that file. **`insertBenefitDependentCoverageSchema`** uses **`dependentName`** while the table uses **`name`** (`nameColumn`) — **P1** insert-shape drift.
- **Indexes (dimension 3):** **Anonymous `index().on(...)`** is concentrated in `benefits.ts` and `learning.ts`; **anonymous `uniqueIndex().on(...)`** appears in `benefits.ts`, `learning.ts`, and `recruitment.ts` — **P1** per SCHEMA_LOCKDOWN / naming conventions.
- **Migrations (dimension 10):** **`drizzle-kit check` fails** with **non-commutative migrations** (duplicate `create_schema: core`). **P0 process risk:** cannot rely on kit for SQL↔TS parity until the graph is reconciled.

**Counts (this report):** **P0 — 5** documented findings | **P1 — 4** (including one umbrella) | **P2 — 2**.

**Go / no-go (opinion):** Do **not** treat HR schema as a closed enterprise baseline for **benefits** until **P0 FK + Zod tenant type** are fixed. **Globally**, unblock **`drizzle-kit check`** before declaring migration hygiene green.

---

## Compliance summary table

| Dimension | Tables / units reviewed | Pass | Fail / N/A | Notes |
|-----------|---------------------------|------|------------|--------|
| 1 Tenant isolation & FKs | 146 tables | Partial | **Fail** (known gaps + incomplete sweep) | Confirmed issues in `benefits.ts`; `approved_by` / `reviewed_by` pattern needs grep-driven completion. |
| 2 RLS & policies | 146 tables | **146** | 0 | From `hr-audit-scan-raw.json`. |
| 3 Indexes & uniqueness | 146 tables | Partial | **Fail** (convention) | Anonymous `index()` / `uniqueIndex()` in benefits, learning, recruitment. |
| 4 Constraints & types | Sampled | Partial | N/A | Wide `text` + `check()` usage; full enum alignment not cataloged row-by-row. |
| 5 Zod & workflow parity | `benefits.ts` deep + `loans.ts` spot | Partial | **Fail** | Benefits tenant UUID vs int; dependent name key mismatch. |
| 6 `_relations.ts` | Symbolic catalog | Partial | **Fail** (coverage) | `benefit_*` tables not represented (grep). |
| 7 Cross-schema & circular FKs | Registry files | Pass | N/A | Deferred SQL / circular paths: see appendix; no new SQL edits in audit. |
| 8 Domain consistency | Narrative | N/A | N/A | Dual benefit concepts (`employment` vs `benefits`) — document for product; not a single-table defect. |
| 9 Documentation | Guide + README | **Pass** (post-fix) | 0 | 141→146 drift remediated in listed files. |
| 10 Migration drift | `drizzle-kit check` | **Fail** | **Fail** | Non-commutative migration graph. |

---

## Matrix summary (aggregate)

Columns: FK tenant composite | orphan `_id` | RLS tenant | RLS bypass | indexes OK | constraints OK | Zod parity | `_relations` | notes.

| Metric | Result |
|--------|--------|
| RLS tenant + bypass per table | **292/292** policy slots matched to 146 tables (automated). |
| FK / orphan / Zod / relations | **Not** fully green; see findings. |
| Per-file table counts | See `.reports/hr-audit-scan-raw.json` (`files[].tableCount`, `tables`). |

---

## Findings by dimension

### Dimension 1 — Tenant isolation & referential integrity

#### P0 — `hr.benefit_enrollments` missing FK on `employee_id`

- **Evidence:** `packages/db/src/schema/hr/benefits.ts` — table `benefit_enrollments`, column `employeeId` at lines **79–80**; only FK is to `benefit_providers` (lines **90–93**). No `foreignKey` to `employees`.
- **Recommendation:** Add composite `foreignKey({ columns: [table.tenantId, table.employeeId], foreignColumns: [employees.tenantId, employees.id] })` (import `employees` from `people.ts` or barrel as per project rules).
- **Effort:** S (0.5h) + migration.

#### P0 — `hr.benefit_claims` missing FK on `reviewed_by`

- **Evidence:** `packages/db/src/schema/hr/benefits.ts` — `reviewedBy: uuid("reviewed_by")` at line **160**; table constraints (lines **165–184**) include FK only to enrollments, not to `employees`.
- **Recommendation:** When `reviewed_by` is non-null, enforce `(tenant_id, reviewed_by)` → `employees`; use nullable FK pattern appropriate for PG/Drizzle.
- **Effort:** S (0.5h) + migration.

#### P1 — Umbrella: `approved_by` / `reviewed_by` UUID columns without verified employee FKs

- **Evidence:** Grep `approvedBy: uuid|reviewedBy: uuid` under `packages/db/src/schema/hr/*.ts` — hits include `payroll.ts`, `employeeExperience.ts`, `attendanceEnhancements.ts`, `expenses.ts`, `lifecycle.ts`, `globalWorkforce.ts`, `loans.ts`, `benefits.ts`, `attendance.ts`, `workforcePlanning.ts`, `leaveEnhancements.ts`, `travel.ts` (not each line-audited for FK presence).
- **Recommendation:** Script or checklist: for each column, assert `foreignKey` to `(employees.tenant_id, employees.id)` when the semantic is “HR user/employee.”
- **Effort:** M (4–8h).

---

### Dimension 2 — RLS

No failing findings. Automated evidence: `.reports/hr-audit-scan-raw.json` — all entries `rlsMismatch: false`, `totalTables: 146`.

---

### Dimension 3 — Indexes & uniqueness

#### P1 — Anonymous `index().on(...)` (naming / ops)

- **Evidence:** `packages/db/src/schema/hr/benefits.ts` — lines **63–64, 102–104, 137–138, 179–181, 217–219** (`index().on(...)`). `packages/db/src/schema/hr/learning.ts` — multiple occurrences (e.g. **107–111, 148–149, …** through **710–714**); ripgrep pattern `index\(\)\.on` yields **59** lines across these two files.
- **Recommendation:** Replace with named indexes, e.g. `index("benefit_providers_tenant_idx").on(table.tenantId)`, per lockdown conventions.
- **Effort:** M (per file: 1–2h).

#### P1 — Anonymous `uniqueIndex().on(...)`

- **Evidence:** `benefits.ts` lines **212–214** (`benefit_plan_benefits`). `learning.ts` lines **205, 311, 454, 657** (grep `uniqueIndex\(\)`). `recruitment.ts` lines **329–334** (`interview_feedback`).
- **Recommendation:** Name partial uniques for migration clarity and DBA review.
- **Effort:** S–M.

---

### Dimension 4 — Constraints & types

#### P2 — `text` + `check()` vs `pgEnum` (pattern)

- **Evidence:** Prevalent pattern (e.g. `benefits.ts` enrollment status checks lines **98–100**); full cross-file inventory omitted — not scored table-by-table.
- **Recommendation:** Prioritize high-churn enums for `pgEnum` + Zod shared types in a dedicated refactor.
- **Effort:** L (epic).

---

### Dimension 5 — Zod & workflow parity

#### P0 — `tenantId` validated as UUID while DB is `integer`

- **Evidence:** `packages/db/src/schema/hr/benefits.ts` — Drizzle `tenantId: integer("tenant_id").notNull()` (e.g. lines **52, 78, 118, 152, 195**). Zod: `tenantId: z.string().uuid("Invalid tenant ID")` in `insertBenefitProviderSchema` (line **235**), `insertBenefitEnrollmentSchema` (line **252**), `insertBenefitDependentCoverageSchema` (line **279**), `insertBenefitClaimSchema` (line **296**), and `insertBenefitPlanBenefitSchema` (lines **335–337**).
- **Recommendation:** Align with `_zodShared` tenant integer/branded schema used elsewhere in HR.
- **Effort:** S (1h) including tests.

#### P1 — Dependent coverage insert key mismatch (`dependentName` vs `name`)

- **Evidence:** Table `benefit_dependent_coverage` uses `...nameColumn` → column **`name`** (`packages/db/src/columns/nameColumns.ts`). Zod `insertBenefitDependentCoverageSchema` uses **`dependentName`** (`benefits.ts` lines **277–287**).
- **Recommendation:** Rename Zod field to `name` or map in application layer; prefer single source of truth with Drizzle column name.
- **Effort:** S.

#### P2 — Spot check: `loans.ts` status enum

- **Evidence:** Sampled `insertEmployeeLoanSchema` / loan status — no contradiction found in spot check (no line citation required for pass).

---

### Dimension 6 — `_relations.ts` accuracy

#### P2 — `benefit_*` tables absent from symbolic relation catalog

- **Evidence:** `grep -i benefit packages/db/src/schema/hr/_relations.ts` returns only `employee_benefits` / `benefit_plans` style keys, **not** `benefit_providers`, `benefit_enrollments`, etc.
- **Recommendation:** Add symbolic edges for new benefits module or document intentional omission.
- **Effort:** S–M.

---

### Dimension 7 — Cross-schema & circular FKs

- **Evidence:** `packages/db/src/schema/hr/CUSTOM_SQL_REGISTRY.json`, `packages/db/migrations/0001_add_circular_fk_constraints.sql`, `hr-docs/CIRCULAR_FKS.md` (if present) — **not** modified in this audit.
- **Recommendation:** When adding `benefits` FKs to `employees`, ensure no conflict with circular FK deferred list.
- **Effort:** S review when implementing FE-001/002.

---

### Dimension 8 — Domain model consistency

#### P2 — Dual benefit models

- **Evidence:** `employment.ts` / legacy `benefit_plans` vs `benefits.ts` Phase-1 tables — architectural duplication; not a single FK line.
- **Recommendation:** ADR or upgrade guide section: convergence roadmap.
- **Effort:** M (doc).

---

### Dimension 9 — Documentation

#### P2 — Historical “141 tables” drift (remediated)

- **Evidence:** Prior state: `HR_SCHEMA_UPGRADE_GUIDE.md` Total row **141**; per-file sums **146**. **Fixed:** Total **146** in guide; `README.md`, `index.ts`, `PROJECT-INDEX.md`, `hr-docs/README.md`, `ADR-001-domain-file-split.md` updated to **146**.
- **Recommendation:** Add CI grep: sum of per-file table counts vs Total row.
- **Effort:** S.

---

### Dimension 10 — Migration drift

#### P0 — `drizzle-kit check` blocked (non-commutative migrations)

- **Evidence:** Command: `Set-Location packages/db; pnpm exec drizzle-kit check` — exit **1**. Output: **Non-commutative migrations detected** — conflict on `create_schema: core` between folder `migrations\20260326225459_tranquil_nick_fury` (and siblings) vs `migrations\20260327103141_initial_schema`.
- **Recommendation:** Reconcile migration history (single authoritative `core` creation path or squash) until `drizzle-kit check` passes.
- **Effort:** L.

---

## Remediation backlog (priority order)

| ID | Sev | Item | Effort |
|----|-----|------|--------|
| MIG-001 | P0 | Fix non-commutative migrations; green `drizzle-kit check` | L |
| FE-001 | P0 | FK `benefit_enrollments` → `employees` (tenant composite) | S |
| FE-002 | P0 | FK `benefit_claims.reviewed_by` → `employees` (nullable pattern) | S |
| ZOD-001 | P0 | Fix `benefits.ts` insert schemas: `tenantId` integer not UUID | S |
| FK-REV | P1 | Audit all `approved_by` / `reviewed_by` for employee FKs | M |
| IDX-001 | P1 | Name anonymous indexes/uniques in `benefits.ts`, `learning.ts`, `recruitment.ts` | M |
| ZOD-002 | P1 | Align `dependentName` → `name` for dependent coverage | S |
| REL-001 | P2 | Extend `_relations.ts` for `benefit_*` module | S–M |
| DOC-001 | P2 | CI guard for table-count vs guide | S |
| ARC-001 | P2 | ADR: dual benefit models | M |

---

## Appendix

### A. Inventory command (reference)

```bash
rg "hrSchema\.table\(" packages/db/src/schema/hr --glob "*.ts" --glob "!_*" --glob "!onboarding.ts" -c
```

### B. Automation

- **Script:** `tools/scripts/hr-schema-audit-scan.mjs`
- **Output:** `.reports/hr-audit-scan-raw.json` (`totalTables: 146`, `issues: []`)

### C. `drizzle-kit check` (2026-03-29)

See Dimension 10 — non-commutative migrations on `create_schema: core`.

### D. Severity + matrix rubric source

Mirrored from `.reports/hr-schema-360-audit-PLAN.md` and the execution plan.
