# HR Domain Schema

> **Schema:** `hr` (`pgSchema("hr")`)
> **Package:** `@afenda/db`
> **Path:** `packages/db/src/schema/hr/`

> **Status:** Production-ready with comprehensive meta-types integration and enterprise-grade validation

## 📚 Documentation Index

- **[README.md](./README.md)** — This file (domain overview, table catalog)
- **[SCHEMA_LOCKDOWN.md](./hr-docs/SCHEMA_LOCKDOWN.md)** — Governance & conventions
- **[CIRCULAR_FKS.md](./hr-docs/CIRCULAR_FKS.md)** — Deferred FK documentation
- **[SCHEMA_DIAGRAM.md](./hr-docs/SCHEMA_DIAGRAM.md)** — ERD diagrams for all domains
- **[PROJECT-INDEX.md](./hr-docs/PROJECT-INDEX.md)** — Project structure and file index
- **[ADR-001](./hr-docs/ADR-001-domain-file-split.md)** — Domain split rationale
- **[ADR-002](./hr-docs/ADR-002-circular-fk-handling.md)** — Circular FK handling
- **[ADR-003](./hr-docs/ADR-003-meta-types-integration.md)** — meta-types integration rationale

---

## Directory Layout

```
hr/
├── README.md                  ← You are here
├── hr-docs/                   ← Documentation directory
│   ├── README.md              ← Documentation index
│   ├── SCHEMA_LOCKDOWN.md     ← Governance & conventions
│   ├── CIRCULAR_FKS.md        ← Deferred FK documentation
│   ├── SCHEMA_DIAGRAM.md      ← ERD diagrams
│   ├── PROJECT-INDEX.md       ← Project structure
│   └── ADR-*.md               ← Architecture decision records
├── _schema.ts                 ← pgSchema("hr") definition
├── _enums.ts                  ← 80+ pgEnum + Zod enum definitions
├── _zodShared.ts              ← Branded ID schemas + meta-types integration
├── _relations.ts              ← String-based relation catalog
├── index.ts                   ← Barrel re-exports (sole public API)
├── people.ts                  ← Org structure (5 tables)
├── employment.ts              ← Contracts & benefits (3 tables)
├── benefits.ts                ← Benefits management (5 tables)
├── payroll.ts                 ← Compensation (10 tables)
├── attendance.ts              ← Leave & time (10 tables)
├── talent.ts                  ← Performance & skills (7 tables)
├── recruitment.ts             ← Hiring pipeline (7 tables)
├── learning.ts                ← Learning & development (16 tables)
├── operations.ts              ← Ops & compliance (8 tables)
├── employeeExperience.ts      ← Self-service & engagement (6 tables)
├── workforceStrategy.ts       ← Succession & career planning (8 tables)
├── peopleAnalytics.ts         ← Analytics & reporting (6 tables)
└── globalWorkforce.ts         ← Global mobility & compliance (6 tables)
```

**Total: 97 tables across 13 domain files, 80+ enums, 100+ branded ID schemas**

---

## Tables by Domain

### `people.ts` — Org Structure (5 tables)

| Table                       | SQL Name                         | Purpose                                 | Unique Key                                        |
| --------------------------- | -------------------------------- | --------------------------------------- | ------------------------------------------------- |
| `departments`               | `hr.departments`                 | Organisational units with hierarchy     | `(tenantId, departmentCode)`                      |
| `jobPositions`              | `hr.job_positions`               | Roles within departments with headcount | `(tenantId, positionCode)`                        |
| `employees`                 | `hr.employees`                   | Core employee master record             | `(tenantId, employeeNumber)`, `(tenantId, email)` |
| `employeeDependents`        | `hr.employee_dependents`         | Dependent family members                | —                                                 |
| `employeeEmergencyContacts` | `hr.employee_emergency_contacts` | Emergency contact information           | —                                                 |
| `employeeAddresses`         | `hr.employee_addresses`          | Residential and postal addresses        | —                                                 |
| `costCenters`               | `hr.cost_centers`                | Financial cost allocation units         | `(tenantId, costCenterCode)`                      |

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

| Table                 | SQL Name                  | Purpose                              | Unique Key                   |
| --------------------- | ------------------------- | ------------------------------------ | ---------------------------- |
| `employmentContracts` | `hr.employment_contracts` | Contract records per employee        | `(tenantId, contractNumber)` |
| `benefitPlans`        | `hr.benefit_plans`        | Company-wide benefit plans catalog   | `(tenantId, planCode)`       |
| `employeeBenefits`    | `hr.employee_benefits`    | Employee enrollment in benefit plans | —                            |

**Key relationships:** employmentContracts → employees, employeeBenefits → employees + benefitPlans

---

### `benefits.ts` — Benefits Management (5 tables)

| Table                       | SQL Name                         | Purpose                            | Unique Key                 |
| --------------------------- | -------------------------------- | ---------------------------------- | -------------------------- |
| `benefitProviders`          | `hr.benefit_providers`           | Insurance and benefits providers   | `(tenantId, providerCode)` |
| `benefitPlanBenefits`       | `hr.benefit_plan_benefits`       | Provider-plan associations         | —                          |
| `benefitEnrollments`        | `hr.benefit_enrollments`         | Employee enrollment in benefits    | —                          |
| `benefitDependentCoverages` | `hr.benefit_dependent_coverages` | Dependent coverage details         | —                          |
| `benefitClaims`             | `hr.benefit_claims`              | Insurance and reimbursement claims | `(tenantId, claimNumber)`  |

---

### `payroll.ts` — Compensation (10 tables)

| Table                  | SQL Name                   | Purpose                               | Unique Key                                |
| ---------------------- | -------------------------- | ------------------------------------- | ----------------------------------------- |
| `salaryComponents`     | `hr.salary_components`     | Earning/deduction component catalog   | `(tenantId, componentCode)`               |
| `employeeSalaries`     | `hr.employee_salaries`     | Employee-component salary mappings    | —                                         |
| `payrollPeriods`       | `hr.payroll_periods`       | Pay period definitions                | `(tenantId, periodCode)`                  |
| `payrollEntries`       | `hr.payroll_entries`       | Period+employee pay summary           | `(tenantId, payrollPeriodId, employeeId)` |
| `payrollLines`         | `hr.payroll_lines`         | Line-item breakdown per entry         | —                                         |
| `taxBrackets`          | `hr.tax_brackets`          | Country-specific tax rules            | —                                         |
| `statutoryDeductions`  | `hr.statutory_deductions`  | Mandatory deductions (CPF, EPF, etc.) | —                                         |
| `payrollAdjustments`   | `hr.payroll_adjustments`   | One-time adjustments and corrections  | —                                         |
| `payslips`             | `hr.payslips`              | Generated payslip documents           | `(tenantId, payslipNumber)`               |
| `paymentDistributions` | `hr.payment_distributions` | Bank transfer records                 | —                                         |

**CHECK constraints:**

- `employee_salaries_amount_positive`: `amount >= 0`
- `payroll_periods_date_range`: `startDate <= endDate`
- `payroll_entries_gross_positive`: `grossPay >= 0`
- `payroll_entries_net_positive`: `netPay >= 0`
- `payroll_lines_quantity_positive`: `quantity > 0`

---

### `attendance.ts` — Leave & Time (10 tables)

| Table               | SQL Name                | Purpose                               | Unique Key                                                  |
| ------------------- | ----------------------- | ------------------------------------- | ----------------------------------------------------------- |
| `leaveTypeConfigs`  | `hr.leave_type_configs` | Per-tenant leave type settings        | `(tenantId, leaveType)`                                     |
| `leaveAllocations`  | `hr.leave_allocations`  | Annual leave balance per employee     | `(tenantId, employeeId, leaveTypeConfigId, allocationYear)` |
| `leaveRequests`     | `hr.leave_requests`     | Leave request with approval workflow  | `(tenantId, requestNumber)`                                 |
| `holidayCalendars`  | `hr.holiday_calendars`  | Regional holiday calendar definitions | `(tenantId, calendarCode)`                                  |
| `holidays`          | `hr.holidays`           | Individual holiday entries            | —                                                           |
| `timeSheets`        | `hr.time_sheets`        | Weekly/periodic time tracking         | `(tenantId, timesheetNumber)`                               |
| `timeSheetLines`    | `hr.time_sheet_lines`   | Daily hours per time sheet            | —                                                           |
| `attendanceRecords` | `hr.attendance_records` | Daily attendance check-in/out         | `(tenantId, employeeId, attendanceDate)`                    |
| `shiftSchedules`    | `hr.shift_schedules`    | Shift definition catalog              | `(tenantId, shiftCode)`                                     |
| `shiftAssignments`  | `hr.shift_assignments`  | Employee-to-shift daily mapping       | `(tenantId, employeeId, assignmentDate)`                    |

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

| Table                     | SQL Name                       | Purpose                           | Unique Key                        |
| ------------------------- | ------------------------------ | --------------------------------- | --------------------------------- |
| `performanceReviewCycles` | `hr.performance_review_cycles` | Review period definitions         | `(tenantId, cycleCode)`           |
| `performanceReviews`      | `hr.performance_reviews`       | Individual reviews within a cycle | `(tenantId, reviewNumber)`        |
| `goals`                   | `hr.goals`                     | Employee goal tracking            | `(tenantId, goalCode)`            |
| `skills`                  | `hr.skills`                    | Skill catalog                     | `(tenantId, skillCode)`           |
| `employeeSkills`          | `hr.employee_skills`           | Employee skill assessments        | `(tenantId, employeeId, skillId)` |
| `certifications`          | `hr.certifications`            | Certification catalog             | `(tenantId, certificationCode)`   |
| `employeeCertifications`  | `hr.employee_certifications`   | Employee certification records    | —                                 |

**Key patterns:** reviewerId and verifiedBy columns reference employees (same-schema FK).

---

### `recruitment.ts` — Hiring Pipeline (7 tables)

| Table                | SQL Name                 | Purpose                               | Unique Key                      |
| -------------------- | ------------------------ | ------------------------------------- | ------------------------------- |
| `jobOpenings`        | `hr.job_openings`        | Posted positions for hiring           | `(tenantId, openingCode)`       |
| `jobApplications`    | `hr.job_applications`    | Applicant records per opening         | `(tenantId, applicationNumber)` |
| `interviews`         | `hr.interviews`          | Interview records per application     | —                               |
| `jobOffers`          | `hr.job_offers`          | Formal offer management               | `(tenantId, offerNumber)`       |
| `applicantDocuments` | `hr.applicant_documents` | Resume, cover letter, certifications  | —                               |
| `interviewFeedback`  | `hr.interview_feedback`  | Structured feedback forms             | —                               |
| `offerLetters`       | `hr.offer_letters`       | Generated offer letters with workflow | `(tenantId, offerLetterNumber)` |

**Pipeline:** jobOpenings → jobApplications → interviews → jobOffers

---

### `learning.ts` — Learning & Development (16 tables)

| Table                     | SQL Name                       | Purpose                            | Unique Key                      |
| ------------------------- | ------------------------------ | ---------------------------------- | ------------------------------- |
| `courses`                 | `hr.courses`                   | Course catalog with metadata       | `(tenantId, courseCode)`        |
| `courseSessions`          | `hr.course_sessions`           | Scheduled course sessions          | `(tenantId, sessionCode)`       |
| `courseEnrollments`       | `hr.course_enrollments`        | Employee enrollments with progress | —                               |
| `coursePrerequisites`     | `hr.course_prerequisites`      | Course prerequisite relationships  | —                               |
| `courseMaterials`         | `hr.course_materials`          | Learning resources and materials   | —                               |
| `assessmentAttempts`      | `hr.assessment_attempts`       | Quiz/exam attempt records          | —                               |
| `certificates`            | `hr.certificates`              | Issued certification records       | `(tenantId, certificateNumber)` |
| `learningPaths`           | `hr.learning_paths`            | Learning path definitions          | `(tenantId, pathCode)`          |
| `learningPathCourses`     | `hr.learning_path_courses`     | Course associations with paths     | —                               |
| `assessments`             | `hr.assessments`               | Quizzes and exams                  | `(tenantId, assessmentCode)`    |
| `assessmentQuestions`     | `hr.assessment_questions`      | Question bank                      | —                               |
| `assessmentAttempts`      | `hr.assessment_attempts`       | Individual attempts tracking       | —                               |
| `learningProgress`        | `hr.learning_progress`         | Module-level completion tracking   | —                               |
| `trainingFeedback`        | `hr.training_feedback`         | Post-training evaluations          | —                               |
| `trainingCosts`           | `hr.training_costs`            | Budget tracking                    | —                               |
| `learningPathEnrollments` | `hr.learning_path_enrollments` | Employee path enrollments          | —                               |

**Key features:** Comprehensive LMS with course modules, learning paths, assessments, certificates, and progress tracking

---

### `operations.ts` — Ops & Compliance (8 tables)

| Table                  | SQL Name                   | Purpose                               | Unique Key                                 |
| ---------------------- | -------------------------- | ------------------------------------- | ------------------------------------------ |
| `employeeDocuments`    | `hr.employee_documents`    | Employee document management          | `(tenantId, documentNumber)`               |
| `expenseClaims`        | `hr.expense_claims`        | Expense reimbursement requests        | `(tenantId, claimNumber)`                  |
| `expenseLines`         | `hr.expense_lines`         | Line items per expense claim          | —                                          |
| `disciplinaryActions`  | `hr.disciplinary_actions`  | Formal disciplinary records           | `(tenantId, actionNumber)`                 |
| `exitInterviews`       | `hr.exit_interviews`       | Exit interview feedback records       | `(tenantId, interviewNumber)`              |
| `onboardingChecklists` | `hr.onboarding_checklists` | Template checklists per dept/position | `(tenantId, checklistCode)`                |
| `onboardingTasks`      | `hr.onboarding_tasks`      | Individual task definitions           | —                                          |
| `onboardingProgress`   | `hr.onboarding_progress`   | Employee progress per task            | `(tenantId, employeeId, onboardingTaskId)` |

**CHECK constraints:**

- `expense_claims_total_amount_check`: `totalAmount >= 0`
- `expense_lines_amount_check`: `amount > 0`
- `onboarding_tasks_order_check`: `taskOrder > 0`
- `onboarding_tasks_days_check`: `daysFromStart >= 0`

---

### `employeeExperience.ts` — Self-Service & Engagement (6 tables)

| Table                         | SQL Name                            | Purpose                                                     | Unique Key                              |
| ----------------------------- | ----------------------------------- | ----------------------------------------------------------- | --------------------------------------- |
| `employeeSelfServiceProfiles` | `hr.employee_self_service_profiles` | Portal access and login tracking                            | `(tenantId, employeeId)`                |
| `employeeRequests`            | `hr.employee_requests`              | Generic request workflow (time off, documents, pay changes) | `(tenantId, requestNumber)`             |
| `employeeNotifications`       | `hr.employee_notifications`         | System notifications and alerts                             | —                                       |
| `employeePreferences`         | `hr.employee_preferences`           | UI, communication, privacy settings                         | `(tenantId, employeeId, preferenceKey)` |
| `employeeSurveys`             | `hr.employee_surveys`               | Survey definitions (engagement, pulse, exit)                | `(tenantId, surveyCode)`                |
| `surveyResponses`             | `hr.survey_responses`               | Anonymous survey responses                                  | —                                       |

**Key features:** Employee self-service portal with request management, notifications, and engagement surveys

---

### `workforceStrategy.ts` — Succession & Career Planning (8 tables)

| Table                 | SQL Name                  | Purpose                                  | Unique Key              |
| --------------------- | ------------------------- | ---------------------------------------- | ----------------------- |
| `successionPlans`     | `hr.succession_plans`     | Leadership replacement plans             | `(tenantId, planCode)`  |
| `talentPools`         | `hr.talent_pools`         | Talent pool definitions                  | `(tenantId, poolCode)`  |
| `talentPoolMembers`   | `hr.talent_pool_members`  | Pool membership with readiness tracking  | —                       |
| `careerPaths`         | `hr.career_paths`         | Career progression tracks                | `(tenantId, pathCode)`  |
| `careerPathSteps`     | `hr.career_path_steps`    | Steps in career paths with prerequisites | —                       |
| `careerAspirations`   | `hr.career_aspirations`   | Employee career goals                    | —                       |
| `compensationCycles`  | `hr.compensation_cycles`  | Annual compensation planning cycles      | `(tenantId, cycleCode)` |
| `compensationBudgets` | `hr.compensation_budgets` | Department/position budgets              | —                       |

**Key features:** Strategic workforce planning with succession, talent pools, career paths, and compensation planning

---

### `peopleAnalytics.ts` — Analytics & Reporting (6 tables)

| Table                 | SQL Name                  | Purpose                                            | Unique Key                  |
| --------------------- | ------------------------- | -------------------------------------------------- | --------------------------- |
| `analyticsFacts`      | `hr.analytics_facts`      | Partitioned fact table for daily HR metrics        | —                           |
| `hrMetrics`           | `hr.hr_metrics`           | KPI definitions and calculations                   | `(tenantId, metricCode)`    |
| `analyticsDashboards` | `hr.analytics_dashboards` | Dashboard configurations                           | `(tenantId, dashboardCode)` |
| `dataExports`         | `hr.data_exports`         | Export job tracking                                | `(tenantId, exportCode)`    |
| `reportSubscriptions` | `hr.report_subscriptions` | Scheduled report delivery                          | —                           |
| `analyticsDimensions` | `hr.analytics_dimensions` | Slowly changing dimensions for historical analysis | —                           |

**Key features:** Data warehouse with partitioned fact tables, KPI tracking, dashboards, and scheduled reporting

---

### `globalWorkforce.ts` — Global Mobility & Compliance (6 tables)

| Table                      | SQL Name                       | Purpose                                    | Unique Key                   |
| -------------------------- | ------------------------------ | ------------------------------------------ | ---------------------------- |
| `internationalAssignments` | `hr.international_assignments` | Global assignment management               | `(tenantId, assignmentCode)` |
| `assignmentAllowances`     | `hr.assignment_allowances`     | Expatriate allowances (housing, education) | —                            |
| `workPermits`              | `hr.work_permits`              | Visa and work authorization tracking       | `(tenantId, permitNumber)`   |
| `complianceTracking`       | `hr.compliance_tracking`       | EEO, OFCCP, GDPR compliance                | `(tenantId, complianceCode)` |
| `relocationServices`       | `hr.relocation_services`       | Moving and settlement services             | —                            |
| `deiMetrics`               | `hr.dei_metrics`               | Diversity, Equity & Inclusion measurements | —                            |

**Key features:** International assignment management, work permits, compliance tracking, and DEI metrics

---

## Enums (80+ total)

Defined in `_enums.ts`. Each has a `pgEnum` for the database and a matching `z.enum()` Zod schema.

| Category                | Enums                                                                                                                                                            |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Employment**          | `employmentStatus`, `employmentType`, `employeeCategory`, `contractType`, `contractStatus`                                                                       |
| **Personal**            | `gender`, `maritalStatus`, `workLocationType`                                                                                                                    |
| **Leave/Time**          | `leaveType`, `leaveStatus`, `attendanceStatus`, `shiftType`                                                                                                      |
| **Payroll**             | `payrollStatus`, `paymentMethod`, `componentType`, `country`, `taxType`, `statutoryDeductionType`, `payrollAdjustmentType`                                       |
| **Benefits**            | `benefitType`, `benefitStatus`, `providerType`, `planType`, `coverageLevel`, `claimStatus`, `claimType`                                                          |
| **Performance**         | `performanceReviewStatus`, `performanceRating`, `goalStatus`, `goalPriority`                                                                                     |
| **Recruitment**         | `recruitmentStatus`, `applicationStatus`, `interviewStage`, `interviewResult`, `offerStatus`, `documentType`, `feedbackCriteria`                                 |
| **Learning**            | `courseStatus`, `courseLevel`, `enrollmentStatus`, `assessmentType`, `assessmentStatus`, `questionType`, `attemptStatus`, `feedbackStatus`, `learningPathStatus` |
| **Documents**           | `documentStatus`, `employeeDocumentType`                                                                                                                         |
| **Expenses**            | `expenseType`, `expenseStatus`                                                                                                                                   |
| **Discipline**          | `disciplinaryActionType`                                                                                                                                         |
| **Skills**              | `skillLevel`, `certificationStatus`                                                                                                                              |
| **Org**                 | `departmentType`, `costCenterType`, `terminationReason`, `exitInterviewStatus`, `onboardingStatus`                                                               |
| **Employee Experience** | `requestType`, `requestStatus`, `notificationPriority`, `notificationStatus`, `surveyType`                                                                       |
| **Workforce Strategy**  | `successionReadiness`, `talentPoolStatus`, `careerPathStatus`, `compensationCycleStatus`                                                                         |
| **Analytics**           | `metricType`, `metricFrequency`, `exportFormat`, `exportStatus`, `dashboardType`                                                                                 |
| **Global**              | `assignmentType`, `assignmentStatus`, `permitType`, `permitStatus`, `complianceType`, `complianceStatus`                                                         |

---

## Cross-Schema References

| From (HR)                                                            | To (External)                             | Via                                  |
| -------------------------------------------------------------------- | ----------------------------------------- | ------------------------------------ |
| All tables                                                           | `core.tenants`                            | `tenantId → tenants.tenantId`        |
| employees                                                            | `security.users`                          | `userId → users.userId`              |
| employees                                                            | `reference.states`, `reference.countries` | `stateId`, `countryId`               |
| holidayCalendars                                                     | `reference.states`, `reference.countries` | `stateId`, `countryId`               |
| jobTitles, trainingPrograms, benefitPlans, jobOffers, payrollEntries | `reference.currencies`                    | `currencyId → currencies.currencyId` |

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
