# HR domain 360° schema audit plan (execution-ready)

This file mirrors the Cursor plan for the HR audit. Update it when the plan changes.

---

## Severity rubric

| Severity | Definition | Examples |
|----------|------------|----------|
| **P0** | Tenant isolation, referential integrity, or RLS broken; cross-tenant or orphan data risk. | Missing composite FK; `*_id` without `foreignKey` to known HR entity; missing RLS policies; migration drift blocking deploy. |
| **P1** | Conventions, performance, maintainability; Zod vs DB drift causing rejections. | Indexes not tenant-leading; missing partial unique; anonymous `index()`; `text`+CHECK where pgEnum+Zod would unify. |
| **P2** | Docs, naming, `_relations` catalog drift without wrong DB behavior. | README table count wrong; relation doc typo; export naming only. |

---

## Evidence standard

Every finding: **file + SQL table + line number(s) or constraint name**, **recommendation**, **effort (S/M/L or hours)**.

---

## Matrix (tracking grid)

Rows = `hr.*` tables. Columns = FK tenant | orphan `_id` | RLS tenant | RLS bypass | indexes | constraints | Zod parity | `_relations` | notes.

Export pass/fail counts into the executive summary.

---

## Execution order

1. **Inventory** — grep `hrSchema.table(` counts vs [HR_SCHEMA_UPGRADE_GUIDE.md](../packages/db/src/schema/hr/hr-docs/HR_SCHEMA_UPGRADE_GUIDE.md) (146 baseline; reconcile Total row).
2. **P0** — FK composite + orphan `_id`; RLS per table.
3. **Zod early** — insert schemas vs DB on critical paths, then expand.
4. **P1** — indexes, CHECK/enum/text.
5. **Relations** — FK graph diff vs `_relations.ts`.
6. **Docs** — lightweight README/guide counts.
7. **`pnpm exec drizzle-kit check`** — from `packages/db` when migration chain allows.

---

## Automation ideas

- Script: table count per file; RLS policy name count vs table count.
- Script: extract `foreignKey` pairs for diff to `_relations.ts`.
- Grep: `uuid(".*_id"`, `tenantIsolationPolicies(`, `foreignKey({`, `index().on`.

---

## Deliverable file

Primary output: **[`.reports/hr-schema-360-audit.md`](./hr-schema-360-audit.md)** (create at execution time).

---

## Deliverable document structure: HR Schema 360° Audit Report

Use this outline so the final report is executive-friendly and matches the dimension model. **Replace all bracketed placeholders** during execution; **do not** treat third-party example rows as facts until verified (see “Verified seeds” below).

### 1. Title & executive summary

- **Title:** HR Schema 360° Audit Report  
- **Scope:** 146 HR tables across 27 domain files, plus shared infra (`_enums.ts`, `_zodShared.ts`, `_relations.ts`), deferred SQL per `CUSTOM_SQL_REGISTRY.json` / `CIRCULAR_FKS.md`.  
- **Method:** Manual + grep + checklist matrix + (optional) small Node scripts + `drizzle-kit check` when unblocked.  
- **Outcome (fill in at end):**
  - Overall pass/fail or **% matrix cells green** per dimension.
  - **P0 / P1 / P2 counts** and top 3–5 **key risks**.
  - One paragraph **go / no-go** for treating current schema as enterprise baseline (optional).

### 2. Compliance summary table (before long findings)

| Dimension | Tables reviewed | Pass | Fail / N/A | Notes |
|-----------|-----------------|------|------------|--------|
| 1 Tenant isolation & FKs | 146 | | | |
| 2 RLS & policies | 146 | | | |
| 3 Indexes & uniqueness | 146 | | | |
| 4 Constraints & types | 146 | | | |
| 5 Zod & workflow parity | per module | | | |
| 6 `_relations.ts` | catalog rows | | | |
| 7 Cross-schema & circular FKs | all outward + deferred | | | |
| 8 Domain model consistency | thematic | | | |
| 9 Documentation drift | README + guide | | | |
| 10 Migrations vs Drizzle | migration set | | | |

### 3. Findings by dimension (repeatable block)

For **each** finding, use the same fields (sort **P0 first** within each section):

```markdown
#### Finding: [short title]

- **Severity:** P0 | P1 | P2  
- **Evidence:** `packages/db/...` — table `hr.*` — line(s) … or constraint `…`  
- **Recommendation:** …  
- **Effort:** Low | Medium | High (or hours)  
- **Backlog ID:** AUDIT-### (optional)
```

### 4. Remediation backlog

- Ordered list: **all P0**, then P1, then P2.  
- Columns: ID, dimension, severity, effort, owner (TBD), target PR/changeset.  
- Architecture epics (e.g. dual benefit convergence) stay **P2 + High effort** unless product mandates.

### 5. Appendix (optional)

- Grep commands used.  
- Script paths / one-off command lines.  
- `drizzle-kit check` output excerpt.  
- Inventory table: file → table count (grep snapshot).

---

## Verified seeds (pre-audit; re-confirm during execution)

These are **code-verified** candidates to include in the real report (still re-check line numbers after edits):

| Dimension | Note | Evidence (current) |
|-----------|------|---------------------|
| 1 FK / tenant | `benefit_enrollments.employee_id` has no `foreignKey` to `employees` | [`benefits.ts`](../packages/db/src/schema/hr/benefits.ts) — column ~L79; table callback has FK only to `benefit_providers` ~L90–93 |

**Illustrative-only examples** (common patterns to hunt; **not** pre-verified): anonymous `index()` in `benefits.ts`; `text`+CHECK vs pgEnum in payroll; Zod vs DB status mismatch; `_relations` vs FK drift; migration non-commutativity blocking `drizzle-kit generate`. Replace with real line numbers when auditing.

---

## Scope pointers

- Schema: `packages/db/src/schema/hr/`
- Lockdown: `packages/db/src/schema/hr/hr-docs/SCHEMA_LOCKDOWN.md`
- Registry: `packages/db/src/schema/hr/hr-docs/HR_SCHEMA_UPGRADE_GUIDE.md` (P0 domain placement audit)
