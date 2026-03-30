# HR enum integration — schema & validation map

**Scope:** Canonical enums in `_enums.ts` and how consuming HR schema modules use them (Drizzle `pgEnum`, Zod, DB checks, shared workflows).

---

## Updated in this pass

| Area | File(s) | Change |
|------|---------|--------|
| Shared workflow states | `_zodShared.ts` | `leaveRequestWorkflow.states` now references `standardApprovalWorkflowStatuses` from `_enums.ts` (single source of truth with `leave_status` / employee-request lifecycle). |
| Workflow type exports | `_enums.ts` | `LeaveStatus`, `StaffingPlanStatus`, and `RequestStatus` co-located immediately after `RequestStatusSchema` (canonical block). |
| Leave + time sheets | `attendance.ts` | `CHECK` `leave_requests_approval_matches_status` and `time_sheets_approval_matches_status`: `approved` ⇔ `approved_by` + approval date set; other statuses ⇔ both null. New `insertLeaveRequestSchema` and `insertTimeSheetSchema` using `LeaveStatusSchema` + matching `superRefine`. |
| Employee requests | `employeeExperience.ts` | Replaced weak approval pairing check with `employee_requests_approval_matches_status` (aligned with `request_status`). `insertEmployeeRequestSchema` uses `superRefine` consistent with staffing plans. |
| SQL migration | `migrations/20260329234500_hr_workflow_approval_checks/migration.sql` | Idempotent constraints for `hr.employee_requests`, `hr.leave_requests`, `hr.time_sheets`; drops legacy `employee_requests_approval_consistency`. |

---

## Already wired (verified, no code change)

| Enum / concept | Table / module | Drizzle | Zod insert / shared |
|----------------|----------------|---------|---------------------|
| `leave_status` | `lifecycle.ts`, `attendanceEnhancements.ts` | `leaveStatusEnum` | `LeaveStatusSchema` |
| `staffing_plan_status` | `workforcePlanning.ts` | `staffingPlanStatusEnum` | `StaffingPlanStatusSchema` + refinements |
| `request_status` | `employeeExperience.employee_requests` | `requestStatusEnum` | `RequestStatusSchema` |
| `benefit_status` (+ `pending`) | `employment.employee_benefits` | `benefitStatusEnum` | `BenefitStatusSchema` in `insertEmployeeBenefitSchema` |
| `fuel_type` (+ hydrogen, biofuel) | `travel.company_vehicles` | `fuelTypeEnum` | `FuelTypeSchema` in `insertCompanyVehicleSchema` |
| `dei_metric_type` | `globalWorkforce.dei_metrics` | `deiMetricTypeEnum` | `DeiMetricTypeSchema` in `insertDeiMetricSchema` |
| `equity_grant_status` | `compensation.equity_grants` | `equityGrantStatusEnum` | `EquityGrantStatusSchema` in `insertEquityGrantSchema` |

---

## Intentionally omitted (different domain or no insert surface)

| Item | Reason |
|------|--------|
| `travel_request_status` | Separate lifecycle from standard approval tuple; already uses `TravelRequestStatusSchema` in `travel.ts` + DB checks. |
| `compensatory_leave_status` | Different enum (`pending`, …); `leaveEnhancements.ts` + `CompensatoryLeaveStatusSchema`. |
| **Apps / UI** outside `packages/db` | This package owns schema and validation exports only. |
| **Query access layers** (`queries/hr/*.access.ts`) | Typed via Drizzle `$inferSelect`; no duplicate enum literals added. |
| **Default change** `employee_benefits.benefit_status` → `pending` | Product decision; documented in `HR_ENUM_PHASE2_4_SIGNOFF.md`. |
| **`leave_requests` / `time_sheets` in `meta-types` workflows** | `leaveRequestStateSchema` validates transition pairs; table inserts use new Zod schemas above — full FSM wiring in services is optional. |

---

## Operational notes

- Applying `20260329234500_hr_workflow_approval_checks` **requires** existing rows to satisfy the new checks; fix or backfill bad data first.
- Re-run `pnpm ci:gate:hr-enums-schema` after editing `_enums.ts` pgEnum spreads.
