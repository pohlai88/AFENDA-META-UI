# HR Domain Schema

> **Schema:** `hr` (`pgSchema("hr")`)
> **Package:** `@afenda/db`
> **Path:** `packages/db/src/schema/hr/`

> **⚠️ ACTIVE UPGRADE PROJECT:** We are enhancing the HR schema to exceed legacy capabilities through meta-types integration. See [UPGRADE-EXECUTIVE-SUMMARY.md](./UPGRADE-EXECUTIVE-SUMMARY.md) for details.

## 📚 Documentation Index

### Current State
- **[README.md](./README.md)** — This file (domain overview, table catalog)
- **[SCHEMA_LOCKDOWN.md](./SCHEMA_LOCKDOWN.md)** — Governance & conventions
- **[CIRCULAR_FKS.md](./CIRCULAR_FKS.md)** — Deferred FK documentation
- **ADR-001** — Domain split rationale (in SCHEMA_LOCKDOWN.md)
- **ADR-002** — Circular FK handling (in CIRCULAR_FKS.md)

### Upgrade Project (3-4 Weeks, Active)
- **[UPGRADE-EXECUTIVE-SUMMARY.md](./UPGRADE-EXECUTIVE-SUMMARY.md)** — Executive summary (start here)
- **[UPGRADE-PLAN.md](./UPGRADE-PLAN.md)** — Comprehensive technical plan
- **[UPGRADE-QUICKREF.md](./UPGRADE-QUICKREF.md)** — Developer quick reference
- **[LEGACY-COMPARISON-ANALYSIS.md](./LEGACY-COMPARISON-ANALYSIS.md)** — Side-by-side with afenda-hybrid
- **[LEGACY-GAP-SUMMARY.md](./LEGACY-GAP-SUMMARY.md)** — Gap analysis summary
- **[IMPLEMENTATION-PROPOSAL.md](./IMPLEMENTATION-PROPOSAL.md)** — Detailed table definitions

**Quick Summary:** Adding 24 tables (Benefits: 5, Learning: +11, Payroll: +5, Recruitment: +3) with meta-types integration for superior type safety.

---

## Directory Layout

```
hr/
├── README.md              ← You are here
├── SCHEMA_LOCKDOWN.md     ← Governance & conventions
├── CIRCULAR_FKS.md        ← Deferred FK documentation
├── _schema.ts             ← pgSchema("hr") definition
├── _enums.ts              ← 38 pgEnum + Zod enum definitions
├── _zodShared.ts          ← Branded ID schemas + cross-field refinements
├── _relations.ts          ← String-based relation catalog
├── index.ts               ← Barrel re-exports (sole public API)
├── people.ts              ← Org structure (5 tables)
├── employment.ts          ← Contracts & benefits (3 tables)
├── payroll.ts             ← Compensation (5 tables)
├── attendance.ts          ← Leave & time (10 tables)
├── talent.ts              ← Performance & skills (7 tables)
├── recruitment.ts         ← Hiring pipeline (4 tables)
├── training.ts            ← Learning & development (3 tables)
└── operations.ts          ← Ops & compliance (8 tables)
```

**Total: 45 tables, 38 enums, 60+ branded ID schemas**

---

## Tables by Domain

### `people.ts` — Org Structure (5 tables)

| Table | SQL Name | Purpose | Unique Key |
|-------|----------|---------|------------|
| `departments` | `hr.departments` | Organisational units with hierarchy | `(tenantId, departmentCode)` |
| `jobTitles` | `hr.job_titles` | Title catalog with salary bands | `(tenantId, titleCode)` |
| `jobPositions` | `hr.job_positions` | Roles within departments with headcount | `(tenantId, positionCode)` |
| `employees` | `hr.employees` | Core employee master record | `(tenantId, employeeNumber)`, `(tenantId, email)` |
| `costCenters` | `hr.cost_centers` | Financial cost allocation units | `(tenantId, costCenterCode)` |

**Self-references:**
- `departments.parentDepartmentId` → `departments.id`
- `jobPositions.reportsToPositionId` → `jobPositions.id`
- `employees.managerId` → `employees.id`
- `costCenters.parentCostCenterId` → `costCenters.id`

**Circular FKs (deferred — see [CIRCULAR_FKS.md](CIRCULAR_FKS.md)):**
- `departments.managerId` → `employees.id` (cannot declare — departments defined before employees)
- `departments.costCenterId` → `costCenters.id` (cannot declare — departments defined before costCenters)

---

### `employment.ts` — Contracts & Benefits (3 tables)

| Table | SQL Name | Purpose | Unique Key |
|-------|----------|---------|------------|
| `employmentContracts` | `hr.employment_contracts` | Contract records per employee | `(tenantId, contractNumber)` |
| `benefitPlans` | `hr.benefit_plans` | Company-wide benefit plans catalog | `(tenantId, planCode)` |
| `employeeBenefits` | `hr.employee_benefits` | Employee enrollment in benefit plans | — |

**Key relationships:** employmentContracts → employees, employeeBenefits → employees + benefitPlans

---

### `payroll.ts` — Compensation (5 tables)

| Table | SQL Name | Purpose | Unique Key |
|-------|----------|---------|------------|
| `salaryComponents` | `hr.salary_components` | Earning/deduction component catalog | `(tenantId, componentCode)` |
| `employeeSalaries` | `hr.employee_salaries` | Employee-component salary mappings | — |
| `payrollPeriods` | `hr.payroll_periods` | Pay period definitions | `(tenantId, periodCode)` |
| `payrollEntries` | `hr.payroll_entries` | Period+employee pay summary | `(tenantId, payrollPeriodId, employeeId)` |
| `payrollLines` | `hr.payroll_lines` | Line-item breakdown per entry | — |

**CHECK constraints:**
- `employee_salaries_amount_positive`: `amount >= 0`
- `payroll_periods_date_range`: `startDate <= endDate`
- `payroll_entries_gross_positive`: `grossPay >= 0`
- `payroll_entries_net_positive`: `netPay >= 0`
- `payroll_lines_quantity_positive`: `quantity > 0`

---

### `attendance.ts` — Leave & Time (10 tables)

| Table | SQL Name | Purpose | Unique Key |
|-------|----------|---------|------------|
| `leaveTypeConfigs` | `hr.leave_type_configs` | Per-tenant leave type settings | `(tenantId, leaveType)` |
| `leaveAllocations` | `hr.leave_allocations` | Annual leave balance per employee | `(tenantId, employeeId, leaveTypeConfigId, allocationYear)` |
| `leaveRequests` | `hr.leave_requests` | Leave request with approval workflow | `(tenantId, requestNumber)` |
| `holidayCalendars` | `hr.holiday_calendars` | Regional holiday calendar definitions | `(tenantId, calendarCode)` |
| `holidays` | `hr.holidays` | Individual holiday entries | — |
| `timeSheets` | `hr.time_sheets` | Weekly/periodic time tracking | `(tenantId, timesheetNumber)` |
| `timeSheetLines` | `hr.time_sheet_lines` | Daily hours per time sheet | — |
| `attendanceRecords` | `hr.attendance_records` | Daily attendance check-in/out | `(tenantId, employeeId, attendanceDate)` |
| `shiftSchedules` | `hr.shift_schedules` | Shift definition catalog | `(tenantId, shiftCode)` |
| `shiftAssignments` | `hr.shift_assignments` | Employee-to-shift daily mapping | `(tenantId, employeeId, assignmentDate)` |

**CHECK constraints:**
- `leave_type_configs_allocation_positive`: `annualAllocation >= 0`
- `leave_allocations_balance_valid`: `balance >= 0`
- `leave_requests_date_range`: `startDate <= endDate`
- `leave_requests_days_positive`: `daysRequested > 0`
- `time_sheets_date_range`: `periodStartDate <= periodEndDate`
- `time_sheets_hours_positive`: `totalHours >= 0`
- `time_sheet_lines_hours_valid`: `hoursWorked >= 0 AND hoursWorked <= 24`
- `shift_schedules_working_hours_positive`: `workingHours > 0`
- `shift_schedules_break_positive`: `breakMinutes >= 0`

---

### `talent.ts` — Performance & Skills (7 tables)

| Table | SQL Name | Purpose | Unique Key |
|-------|----------|---------|------------|
| `performanceReviewCycles` | `hr.performance_review_cycles` | Review period definitions | `(tenantId, cycleCode)` |
| `performanceReviews` | `hr.performance_reviews` | Individual reviews within a cycle | `(tenantId, reviewNumber)` |
| `goals` | `hr.goals` | Employee goal tracking | `(tenantId, goalCode)` |
| `skills` | `hr.skills` | Skill catalog | `(tenantId, skillCode)` |
| `employeeSkills` | `hr.employee_skills` | Employee skill assessments | `(tenantId, employeeId, skillId)` |
| `certifications` | `hr.certifications` | Certification catalog | `(tenantId, certificationCode)` |
| `employeeCertifications` | `hr.employee_certifications` | Employee certification records | — |

**Key patterns:** reviewerId and verifiedBy columns reference employees (same-schema FK).

---

### `recruitment.ts` — Hiring Pipeline (4 tables)

| Table | SQL Name | Purpose | Unique Key |
|-------|----------|---------|------------|
| `jobOpenings` | `hr.job_openings` | Posted positions for hiring | `(tenantId, openingCode)` |
| `jobApplications` | `hr.job_applications` | Applicant records per opening | `(tenantId, applicationNumber)` |
| `interviews` | `hr.interviews` | Interview records per application | — |
| `jobOffers` | `hr.job_offers` | Formal offer management | `(tenantId, offerNumber)` |

**Pipeline:** jobOpenings → jobApplications → interviews → jobOffers

---

### `training.ts` — Learning & Development (3 tables)

| Table | SQL Name | Purpose | Unique Key |
|-------|----------|---------|------------|
| `trainingPrograms` | `hr.training_programs` | Training program catalog | `(tenantId, programCode)` |
| `trainingSessions` | `hr.training_sessions` | Scheduled sessions per program | `(tenantId, sessionCode)` |
| `trainingAttendance` | `hr.training_attendance` | Employee attendance + scores | `(tenantId, trainingSessionId, employeeId)` |

**CHECK constraints:**
- `training_programs_duration_check`: `durationHours > 0`
- `training_programs_cost_check`: `cost >= 0`
- `training_sessions_dates_check`: `startDate <= endDate`
- `training_sessions_participants_check`: `currentParticipants >= 0`
- `training_sessions_max_participants_check`: `maxParticipants > 0`

---

### `operations.ts` — Ops & Compliance (8 tables)

| Table | SQL Name | Purpose | Unique Key |
|-------|----------|---------|------------|
| `employeeDocuments` | `hr.employee_documents` | Employee document management | `(tenantId, documentNumber)` |
| `expenseClaims` | `hr.expense_claims` | Expense reimbursement requests | `(tenantId, claimNumber)` |
| `expenseLines` | `hr.expense_lines` | Line items per expense claim | — |
| `disciplinaryActions` | `hr.disciplinary_actions` | Formal disciplinary records | `(tenantId, actionNumber)` |
| `exitInterviews` | `hr.exit_interviews` | Exit interview feedback records | `(tenantId, interviewNumber)` |
| `onboardingChecklists` | `hr.onboarding_checklists` | Template checklists per dept/position | `(tenantId, checklistCode)` |
| `onboardingTasks` | `hr.onboarding_tasks` | Individual task definitions | — |
| `onboardingProgress` | `hr.onboarding_progress` | Employee progress per task | `(tenantId, employeeId, onboardingTaskId)` |

**CHECK constraints:**
- `expense_claims_total_amount_check`: `totalAmount >= 0`
- `expense_lines_amount_check`: `amount > 0`
- `onboarding_tasks_order_check`: `taskOrder > 0`
- `onboarding_tasks_days_check`: `daysFromStart >= 0`

---

## Enums (38 total)

Defined in `_enums.ts`. Each has a `pgEnum` for the database and a matching `z.enum()` Zod schema.

| Category | Enums |
|----------|-------|
| **Employment** | `employmentStatus`, `employmentType`, `employeeCategory`, `contractType`, `contractStatus` |
| **Personal** | `gender`, `maritalStatus`, `workLocationType` |
| **Leave/Time** | `leaveType`, `leaveStatus`, `attendanceStatus`, `shiftType` |
| **Payroll** | `payrollStatus`, `paymentMethod`, `componentType` |
| **Benefits** | `benefitType`, `benefitStatus` |
| **Performance** | `performanceReviewStatus`, `performanceRating`, `goalStatus`, `goalPriority` |
| **Recruitment** | `recruitmentStatus`, `applicationStatus`, `interviewStage`, `interviewResult`, `offerStatus` |
| **Training** | `trainingStatus`, `trainingType` |
| **Documents** | `documentType`, `documentStatus` |
| **Expenses** | `expenseType`, `expenseStatus` |
| **Discipline** | `disciplinaryActionType` |
| **Skills** | `skillLevel`, `certificationStatus` |
| **Org** | `departmentType`, `costCenterType`, `terminationReason`, `exitInterviewStatus`, `onboardingStatus` |

---

## Cross-Schema References

| From (HR) | To (External) | Via |
|-----------|---------------|-----|
| All tables | `core.tenants` | `tenantId → tenants.tenantId` |
| employees | `security.users` | `userId → users.userId` |
| employees | `reference.states`, `reference.countries` | `stateId`, `countryId` |
| holidayCalendars | `reference.states`, `reference.countries` | `stateId`, `countryId` |
| jobTitles, trainingPrograms, benefitPlans, jobOffers, payrollEntries | `reference.currencies` | `currencyId → currencies.currencyId` |

---

## Shared Patterns

Every table follows the conventions in [SCHEMA_LOCKDOWN.md](SCHEMA_LOCKDOWN.md):

- **Composite FKs:** All intra-HR FKs include `tenantId` (except self-refs and reference table FKs)
- **Tenant-leading indexes:** Non-unique indexes start with `tenantId`
- **Soft-delete partial uniques:** `WHERE deletedAt IS NULL` on unique indexes
- **CHECK constraints:** Business invariants enforced at DB level
- **RLS:** `tenantIsolationPolicies()` + `serviceBypassPolicy()` on every table
- **Column helpers:** `timestampColumns`, `auditColumns`, `softDeleteColumns`, `nameColumn`

---

## Import Rules

```ts
// ✅ External code — always use the barrel
import { employees, departments } from "../hr/index.js";

// ✅ Internal HR files — use relative imports
import { employees } from "./people.js";

// ❌ NEVER import directly from subfiles outside hr/
import { employees } from "../hr/people.js"; // WRONG
```

---

## Migration Workflow

1. Edit table definition in the appropriate domain file
2. Run `pnpm drizzle-kit generate` to produce migration SQL
3. If circular FKs involved, append custom SQL per [CIRCULAR_FKS.md](CIRCULAR_FKS.md)
4. Review migration in `packages/db/migrations/`
5. Run `pnpm drizzle-kit migrate` to apply
