---
"@afenda/db": minor
---

HR schema v2.2: close P0 items from `HR_SCHEMA_UPGRADE_GUIDE.md`

- Add `hr_policy_documents` and `employee_policy_acknowledgments` with pgEnums, RLS, and Zod insert schemas (`policyAcknowledgments.ts`).
- Add `shift_swap_requests`, `shiftSwapWorkflow` / `shiftSwapStateSchema`, and `insertShiftSwapRequestSchema`; align attendance enhancement Zod with shared enum schemas.
- Wire onboarding SWOT fields in `operations.ts` (task category, document/ack flags, policy link, detailed task status, submission URL, acknowledgment timestamp) with CHECK constraints and insert Zod; add operations insert schemas for documents, discipline, onboarding.
- GIN expression indexes on JSON text columns in `peopleAnalytics`, `attendanceEnhancements`, and `employeeExperience`.
- Fix grievance category self-FK to `(tenant_id, parent_category_id)`; complete `_relations` for grievances, loans, policies, shift swap; fix `onboarding_task_id` and `shift_schedule_id` relation fields; align `CUSTOM_SQL_REGISTRY.json` SQL with applied migration.
- `insertPayrollAdjustmentSchema` uses `PayrollAdjustmentTypeSchema` for enum parity with `payroll_adjustments`.
- P0 domain placement audit: all 141 tables confirmed under `pgSchema("hr")` with authoritative file→table registry in `HR_SCHEMA_UPGRADE_GUIDE.md`; corrected README/`index.ts` table counts and `people.ts` / `payroll.ts` / `recruitment.ts` headers; fixed README people & benefits catalog drift.
