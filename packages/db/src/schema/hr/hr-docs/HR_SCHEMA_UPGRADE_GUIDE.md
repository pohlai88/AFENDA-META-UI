# HR Schema Upgrade Guide

## Purpose

Document the global upgrade cadence for the `hr` schema (`pgSchema("hr")`). This guide explains how to annotate new modules, reference existing domains, and keep the schema consistent before going live. It prioritizes a **P0 cleanup stage** that eliminates technical debt before adding new features so the db-first, clean-architecture promise is upheld.

## P0: Foundation Cleanup

- Review existing tables for orphaned references, stale enums, or undocumented columns. **Status (v2.2):** Ongoing discipline; domain placement audit (below) confirms no misplaced tables; circular/deferred FKs remain documented in `CIRCULAR_FKS.md`.
- Refactor lingering inconsistencies (tenant FK order, enum vs CHECK mismatches, missing GIN indexes) before introducing new domains. **Status (v2.2):** GIN coverage and onboarding/payroll enum parity called out in baseline; new inconsistencies should be fixed before expanding domains.
- Update documentation and CHANGESET entries to note cleanup results, ensuring the next release starts from a known-clean baseline. **Status (v2.2):** This guide, `hr-docs/README.md`, `RELATIONS_DRIFT_REMEDIATION.md`, and `PROJECT-INDEX.md` updated with closure notes; use Changesets for release-facing notes.

**P0 baseline (v2.2, 2026-03-29):** Grievance category self-FK now tenant-scoped; `_relations` catalog completed for grievances/loans and corrected `onboarding_progress` / `shift_assignments` field names; `CUSTOM_SQL_REGISTRY` SQL text aligned with applied migration constraint names; onboarding SWOT enums wired into `operations.ts` with CHECK + Zod parity; new `hr_policy_documents` / `employee_policy_acknowledgments`; `shift_swap_requests` with workflow + Zod; GIN expression indexes on JSON text columns (analytics dashboards, exports, dimensions, overtime rule scope, biometric logs, notifications); payroll adjustment insert schema uses shared `PayrollAdjustmentTypeSchema`.

**P0 completion — relations & drift gate (v2.2, 2026-03-29):**

- **`_relations.ts`:** Catalog entries now cover all HR modules whose `foreignKey()` edges are in scope for the gate (upgrade modules, lifecycle, tax, travel, workforce planning/strategy, recruitment extensions, skills, people analytics, etc.). `fromField` / `toField` values match Drizzle SQL column names. Rows that implied deferred or nonexistent physical FKs were removed (see `CIRCULAR_FKS.md` / ADR-002); duplicate `job_openings.recruiter_id` removed in favor of `hiring_manager_id`.
- **Extractor:** `tools/ci-gate/drizzle-schema-quality/hr-fk-graph.mjs` emits the second leg of composite `[table.tenantId, table.id]` self-FKs (e.g. `course_modules.prerequisite_module_id`, `grievance_categories.parent_category_id`, `career_path_steps.prerequisite_step_id`).
- **Schema correction:** `staffing_plans.approved_by` references `employees`, not `departments` (`workforcePlanning.ts`). If a database was created with the old FK, add a migration to align the physical constraint.
- **CI:** `RELATIONS_DRIFT` is **`error`** in `tools/ci-gate/drizzle-schema-quality/rules-matrix.json` when the catalog matches extracted edges. Run `pnpm ci:gate:schema-quality` from the repo root before merging HR schema changes. Playbook: `hr-docs/RELATIONS_DRIFT_REMEDIATION.md`.

### P0 domain placement audit (schema namespace & file ownership)

**Single PostgreSQL schema:** All HR tables are declared with `hrSchema.table(...)` in `_schema.ts` (`pgSchema("hr")`). There is no split across multiple Postgres schemas inside this folder; cross-schema references only go outward (e.g. `core.tenants`, `reference.currencies`).

**Authoritative domain file → table count** (each row is one TypeScript module; counts are `hrSchema.table(` definitions only):

| Domain file | Tables | Bounded context |
|-------------|-------:|-------------------|
| `learning.ts` | 16 | LMS, courses, assessments, certificates |
| `recruitment.ts` | 10 | Hiring pipeline, offers, pipeline analytics, resume parsing |
| `payroll.ts` | 10 | Pay runs, lines, tax, statutory, payslips, distributions |
| `attendance.ts` | 10 | Leave, holidays, time sheets, attendance, shifts |
| `skills.ts` | 7 | Skills taxonomy, job skill requirements, resume lines |
| `peopleAnalytics.ts` | 6 | Facts, metrics, dashboards, exports, subscriptions, dimensions |
| `expenses.ts` | 6 | HR expense categories, policies, claims, reports, lines, approvals |
| `globalWorkforce.ts` | 6 | Assignments, permits, compliance, relocation, DEI |
| `workforceStrategy.ts` | 6 | Succession, talent pools, career paths |
| `employeeExperience.ts` | 6 | ESS profiles, requests, notifications, preferences, surveys |
| `attendanceEnhancements.ts` | 5 | Attendance requests, OT rules, biometric, shift swaps |
| `operations.ts` | 5 | Employee documents, discipline, onboarding |
| `taxCompliance.ts` | 5 | Tax exemptions, declarations, proofs |
| `benefits.ts` | 5 | Providers, enrollments, coverage, claims, plan benefits |
| `compensation.ts` | 5 | Equity, comp cycles, budgets, benchmarks, vesting |
| `talent.ts` | 5 | Review cycles, reviews, goals, certifications |
| `people.ts` | 5 | Departments, job titles, positions, employees, cost centers |
| `lifecycle.ts` | 4 | Promotions, transfers, exit interviews, F&F settlement |
| `travel.ts` | 4 | Travel requests, itineraries, vehicles, logs |
| `leaveEnhancements.ts` | 3 | Comp-off, restrictions, encashment |
| `engagement.ts` | 3 | Bonus points program |
| `appraisalTemplates.ts` | 3 | Appraisal templates, KRAs |
| `employment.ts` | 3 | Contracts, **legacy** benefit plan catalog, employee_benefits |
| `policyAcknowledgments.ts` | 2 | HR policy documents, acknowledgments |
| `grievances.ts` | 2 | Grievance categories, employee grievances |
| `loans.ts` | 2 | Loan types, employee loans |
| `workforcePlanning.ts` | 2 | Staffing plans |
| **Total** | **146** | |

**Placement checks (no misplaced tables detected):** Expenses live only in `expenses.ts` (not `operations`). Exit interviews are `lifecycle.hrExitInterviews`, not `operations`. Onboarding and employee documents stay in `operations.ts`. Policies/attestations stay in `policyAcknowledgments.ts`. Base time/leave/shift data stays in `attendance.ts`; corrective requests, biometric, overtime rules, and shift swaps stay in `attendanceEnhancements.ts`. Performance vs skills split (`talent.ts` vs `skills.ts`) is intentional.

**Known model overlap (backlog, not a wrong file):** `employment.benefit_plans` / `employment.employee_benefits` are a simpler catalog + enrollment path; `benefits.ts` adds provider-centric enrollments, claims, and dependent coverage. They do not FK to each other—converge in product/migrations when ready.

**Ongoing P0 rule:** New tables must extend the domain file that matches the bounded context above; if a table fits two domains, add it to the narrower file and document the FK in `_relations.ts`—do not duplicate entities.

## Version Timeline

| Version | Date       | Highlights                                                                                                          |
| ------- | ---------- | ------------------------------------------------------------------------------------------------------------------- |
| 2.2     | 2026-03-29 | P0 guide closure: policy acknowledgments, shift swap workflow, onboarding enum/CHECK/Zod wiring, GIN indexes, full `hrRelations` catalog vs `foreignKey()` with `RELATIONS_DRIFT` as CI **error**, self-composite FK extraction, `staffing_plans.approved_by` → employees. |
| 2.1     | 2026-03-29 | SWOT Proposal release: Grievance Management + Loan Management, 8 new pgEnums, workflow state machines, ERD updates. |
| 2.0     | 2025-09-12 | Phase 10 Commission release; meta-types workflow enforcement tightened.                                             |
| 1.9     | 2025-05-07 | Global Workforce + People Analytics stabilization.                                                                  |
| 1.8     | 2025-01-18 | Employee Experience + Workforce Strategy enhancements.                                                              |

## Global Upgrade Principles

1. **Domain-first annotations:** Each domain file must open with a header describing scope, creation date, and tables. New domains follow business groupings (People, Employment, Benefits, etc.) and reference the current version.
2. **Naming conventions:** Tables use the `hr.` prefix, lower_snake_case names, UUID PKs, `(tenantId, …)` composite FKs, and enums from `_enums.ts`. Zod insert schemas mimic table constraints via `_zodShared.ts` branded IDs and workflow state schemas.
3. **Documentation updates:** Every schema change updates `README.md` (summary + catalog), `hr-docs/README.md` (releases + naming guide), `SCHEMA_DIAGRAM.md` (ERDs & timeline), and `PROJECT-INDEX.md` (phase list). New domain diagrams are required for additions.
4. **Changelog:** Add a changeset mentioning module rationale, enumerations, and workflow state machines, with a `minor` bump for multi-table releases.
5. **Testing:** Run `npx tsc --noEmit`, database generation scripts as applicable, and **`pnpm ci:gate:schema-quality`** so `RELATIONS_DRIFT` and other drizzle-schema-quality rules stay green.

## Upgrade Workflow

1. Record the capability gap in the SWOT/backlog and confirm the new domain fits the business mapping.
2. Add schema artifacts (tables/enums/Zod workflows) under the relevant domain file, diligently documenting relationships.
3. Update `_enums.ts`, `_zodShared.ts`, `_relations.ts` (for new/changed FKs in gate scope), README files, diagrams, and `PROJECT-INDEX.md`. Include ERD snippets for new modules. If you introduce FK shapes outside `LIMITATIONS.md`, document them there or extend `hr-fk-graph.mjs` as needed.
4. Run tests, generate schema docs if needed, and create a changeset describing the upgrade.
5. Submit PR referencing this guide and the SWOT report for context.

## Next Steps for Future Upgrades

- Payroll **corrections** remain modeled via `payroll_adjustments.adjustment_type = 'correction'` (with Zod aligned to `payrollAdjustmentTypeEnum`); extend reporting or UI affordances if product needs a dedicated “correction run” entity.
- Monitor GIN index usage (`pg_stat_user_indexes`) on tenants with very large JSON payloads; consider `jsonb_path_ops` or partial predicates if write amplification becomes measurable.
- **Keep `hrRelations` in sync:** Whenever you add or change `foreignKey()` in HR domain files, add or update the matching entry in `_relations.ts` (`from` / `to` / `kind` / `fromField` / `toField` using **Drizzle SQL column names**). If an FK is intentionally deferred, record it in `CIRCULAR_FKS.md` / ADR-002 and **do not** add a catalog row that implies a physical edge the schema does not declare. Run `pnpm ci:gate:schema-quality` before merge (`RELATIONS_DRIFT` is an error).
- **Respect gate scope (`LIMITATIONS.md`):** The drift gate only understands single-column FKs and the composite `[tenantId, id]` second-leg patterns documented in `tools/ci-gate/drizzle-schema-quality/LIMITATIONS.md`. Other composite or exotic FK shapes are not compared to `hrRelations` until the extractor is extended or a baseline is agreed; do not assume the catalog is validated for those edges.
- Keep this guide synced with future releases and update the version timeline and domain mapping accordingly.
