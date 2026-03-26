# Plan: HRM Domain Expansion for AFENDA-META-UI

Port the full HRM system from the legacy `afenda-hybrid` repo into AFENDA-META-UI. The legacy has **~134 tables** across 6 PostgreSQL schemas (`hr`, `payroll`, `benefits`, `learning`, `recruitment`, `talent`). Implementation follows the current monorepo's `schema-domain/` convention, delivered in **12 dependency-ordered phases**.

**Philosophy**: Schema-first, match legacy quality, reuse existing patterns (sales domain as template).

---

## Architecture: `schema-domain/hrm/` Structure

```
packages/db/src/schema-domain/
├── sales/            # existing
├── hrm/              # NEW umbrella
│   ├── hr/           # pgSchema("hr")      — 45 tables
│   ├── payroll/      # pgSchema("payroll") — 35 tables
│   ├── benefits/     # pgSchema("benefits")— 5 tables
│   ├── learning/     # pgSchema("learning")— 14 tables
│   ├── recruitment/  # pgSchema("recruitment") — 17 tables
│   └── talent/       # pgSchema("talent")  — 17 tables
└── index.ts          # add hrm re-export
```

Each sub-domain has: `_schema.ts`, `_enums.ts`, `_zodShared.ts`, `_relations.ts`, `fundamentals/`, `operations/`, `index.ts` — one file per table (legacy pattern, necessary at 134 tables).

---

## Steps

### **Phase H0: Scaffold & Shared Infrastructure** (0 tables)

1. Create `packages/db/src/schema-domain/hrm/` directory tree with all 6 sub-domain directories
2. Create `_schema.ts` per sub-domain (`pgSchema("hr")`, `pgSchema("payroll")`, etc.)
3. Create `_enums.ts` per sub-domain — all PG enums (employee status, leave status, payroll status, etc.)
4. Create `_zodShared.ts` per sub-domain — branded IDs, money/date string helpers, cross-field refinements
5. Create barrel `index.ts` at each level
6. Wire into `schema-domain/index.ts` → `export * from "./hrm/index.js";`
7. Create `apps/api/src/modules/hrm/index.ts` MetaModule definition

**Verify**: `pnpm ci:gate:typescript`, `pnpm ci:gate:boundaries`

---

### **Phase H1: HR Fundamentals — People & Organization** (11 tables)

8. **people/**: `persons`, `personNames`, `addresses`, `contactMethods`, `dependents`, `emergencyContacts`, `nationalIdentifiers`, `personDocuments` — person identity separated from employment
9. **fundamentals/**: `employees` (links person → org, status enum: ACTIVE/ON_LEAVE/TERMINATED/SUSPENDED/PROBATION), `departments` (hierarchical, self-ref `parentDepartmentId`), `positions` (salary ranges, department FK)
10. Handle circular FKs (employees↔departments↔positions) via custom SQL migration stubs per legacy CIRCULAR_FKS.md pattern
11. Logic: `apps/api/src/modules/hrm/logic/employee-engine.ts` — `validateEmployeeStatus()`, `getOrgChart()`, `getDirectReports()`
12. Seeds: 3 departments, 5 positions, 8 employees with full person records
13. Schema contracts test: `packages/db/src/__tests__/hrm-schema-contracts.test.ts`

---

### **Phase H2: Employment Management** (11 tables) — *depends on H1*

14. `employmentContracts` (type: PERMANENT/FIXED/PROBATION, dates, working hours, notice period)
15. `employmentStatusHistory` (audit trail of status transitions)
16. `jobFamilies`, `jobGrades` (salary ladder with min/mid/max), `jobRoles`
17. `reportingLines` (effective-dated, matrix reporting), `positionAssignments` (effective range)
18. `employeeTransfers`, `secondments`, `noticePeriodRecords`, `probationRecords`
19. Logic: `employment-engine.ts` — `computeContractEndDate()`, `validateTransfer()`, `isProbationComplete()`

---

### **Phase H3: Time & Attendance / Leave** (16 tables) — *parallel with H2*

20. **time/**: `workSchedules`, `shiftAssignments`, `shiftSwaps`, `timesheets`, `overtimeRecords`, `absenceRecords`, `leaveTypes`, `leaveBalances`, `holidayCalendars`, `holidayCalendarEntries`
21. **operations/**: `attendanceLogs`, `attendanceRequests`, `leaveRequests`, `compensatoryLeaveRequests`, `dailyWorkSummaries`
22. Logic: `leave-engine.ts` — `computeLeaveBalance()`, `validateLeaveRequest()`, `processLeaveAccrual()`, `computeWorkingDays()`
23. Logic: `attendance-engine.ts` — `computeWorkHours()`, `detectLateArrival()`, `generateDailyWorkSummary()`

---

### **Phase H4: HR Self-Service** (4 tables) — *parallel with H2, H3*

24. `assetAssignments`, `documentRequests`, `employeeDeclarations`, `serviceRequests`

---

### **Phase H5: Payroll Fundamentals** (18 tables) — *depends on H1, H2*

25. **fundamentals/**: `bankAccounts`, `compensationPackages`, `earningsTypes`, `deductionTypes`, `expenseTypes`, `payComponents`, `salaryStructures`, `salaryStructureDetails`, `payGradeStructures`
26. **statutory**: `socialInsuranceProfiles`, `statutorySchemes` (global — no tenantId), `statutorySchemeRates`, `taxProfiles`, `taxExemptionCategories`, `incomeTaxSlabs`, `incomeTaxSlabEntries`, `gratuityRules`, `gratuityRuleSlabs`
27. Logic: `salary-engine.ts` — `computeSalaryBreakdown()`, `computeIncomeTax()`, `computeStatutoryDeductions()`

---

### **Phase H6: Payroll Operations** (17 tables) — *depends on H5, H3*

28. `payrollPeriods`, `payrollRuns` (DRAFT→PROCESSING→APPROVED→PAID state machine), `payrollEntries`, `payslips`, `paymentRecords`
29. `expenseClaims`, `loanRecords`, `finalSettlements`, `salaryStructureAssignments`, `salaryWithholdings`
30. `taxExemptionDeclarations`, `taxExemptionDeclarationEntries`, `payrollCorrections`, `payrollCorrectionEntries`, `arrearEntries`, `gratuitySettlements`, `retentionBonuses`
31. Logic: `payroll-engine.ts` — `computePayroll()`, `generatePayslip()`, `computeFinalSettlement()`, `computeLoanEMI()`

---

### **Phase H7: Benefits Administration** (5 tables) — *parallel with H2*

32. **fundamentals/**: `benefitsProviders`, `benefitPlans` (health/dental/life/retirement, effective range, premium)
33. **operations/**: `benefitEnrollments`, `dependentCoverages`, `claimsRecords` (SUBMITTED→APPROVED→PAID workflow)
34. Logic: `benefits-engine.ts` — `checkEnrollmentEligibility()`, `computePremium()`, `validateClaim()`

---

### **Phase H8: Recruitment & Onboarding/Offboarding** (16 tables) — *parallel with H2*

35. `candidates` (reusable databank), `jobRequisitions` (approval workflow), `staffingPlans`, `staffingPlanDetails`
36. `applications`, `interviews`, `interviewRounds`, `interviewSchedules`, `interviewFeedback`
37. `offerLetters`, `backgroundChecks`, `onboardingChecklists`, `offboardingChecklists`
38. `probationEvaluations`, `exitInterviews`, `candidateSalaryBackfillIssues`
39. Logic: `recruitment-engine.ts` — `advanceApplication()`, `generateOfferLetter()`, `checkBoardingProgress()`

---

### **Phase H9: Learning & Development** (14 tables) — *parallel with H10*

40. **fundamentals/**: `courses` (CLASSROOM/ONLINE/WORKSHOP), `courseModules`, `trainers`, `learningPaths`, `learningPathCourses`
41. **operations/**: `trainingSessions`, `trainingEnrollments`, `courseEnrollments`, `learningPathAssignments`, `learningPathCourseProgress`, `assessments`, `certificationAwards`, `feedback`, `costRecords`
42. Logic: `learning-engine.ts` — `computePathProgress()`, `checkComplianceStatus()`, `scheduleRetraining()`

---

### **Phase H10: Talent — Performance & Skills** (12 tables) — *parallel with H9*

43. **fundamentals/**: `skills`, `certifications`, `competencyFrameworks`, `competencySkills`, `talentPools`
44. **operations/**: `employeeSkills`, `employeeCertifications`, `performanceGoals`, `goalTracking`, `performanceReviews`, `performanceReviewGoals`, `talentPoolMemberships`
45. Logic: `performance-engine.ts` — `computeReviewScore()`, `identifySkillGaps()`, `computeGoalProgress()`

---

### **Phase H11: Succession, Promotion & Employee Relations** (5 tables) — *depends on H10*

46. `promotionRecords`, `successionPlans`, `grievanceRecords`, `disciplinaryActions`, `caseLinks` (polymorphic edges)
47. Logic: `succession-engine.ts` — `computeSuccessionReadiness()`, `validatePromotion()`

---

### **Phase H12: Seeds, Integration & Cross-Domain Wiring** (0 tables) — *depends on all*

48. Create `packages/db/src/_seeds/domains/hrm/` with seed functions per sub-domain
49. Wire all `_relations.ts` graphs into `db.ts` for full RQB support
50. Comprehensive schema contract tests (`hrm-schema-contracts.test.ts`)
51. Cross-domain integration tests (employee → payroll → leave → attendance pipeline)
52. Register HRM MetaModule in module registry

---

## Dependency Graph

```
H0 ──→ H1 ──┬──→ H2 ──→ H5 ──→ H6
             ├──→ H3 ──────────→ H6
             ├──→ H4
             ├──→ H7
             ├──→ H8
             ├──→ H9         ──→ H12
             └──→ H10 ──→ H11 ──→ H12
```

H3, H4, H7, H8 can run **in parallel** after H1. H9 and H10 can run **in parallel**.

---

## Legacy Table Inventory (from afenda-hybrid)

### HR Core (~45 tables)

**fundamentals/**: `employees`, `departments`, `positions`
**people/**: `persons`, `personNames`, `addresses`, `contactMethods`, `dependents`, `emergencyContacts`, `nationalIdentifiers`, `personDocuments`
**employment/**: `employmentContracts`, `employmentStatusHistory`, `jobFamilies`, `jobGrades`, `jobRoles`, `reportingLines`, `positionAssignments`, `employeeTransfers`, `secondments`, `noticePeriodRecords`, `probationRecords`
**time/**: `workSchedules`, `shiftAssignments`, `shiftSwaps`, `timesheets`, `overtimeRecords`, `absenceRecords`, `leaveTypes`, `leaveBalances`, `holidayCalendars`, `holidayCalendarEntries`
**operations/**: `attendanceLogs`, `attendanceRequests`, `leaveRequests`, `compensatoryLeaveRequests`, `dailyWorkSummaries`
**selfservice/**: `assetAssignments`, `documentRequests`, `employeeDeclarations`, `serviceRequests`

### Payroll (~35 tables)

**fundamentals/**: `bankAccounts`, `compensationPackages`, `earningsTypes`, `deductionTypes`, `expenseTypes`, `payComponents`, `payGradeStructures`, `salaryStructures`, `salaryStructureDetails`, `socialInsuranceProfiles`, `statutorySchemes`, `statutorySchemeRates`, `taxProfiles`, `taxExemptionCategories`, `incomeTaxSlabs`, `incomeTaxSlabEntries`, `gratuityRules`, `gratuityRuleSlabs`
**operations/**: `payrollPeriods`, `payrollRuns`, `payrollEntries`, `payslips`, `paymentRecords`, `expenseClaims`, `loanRecords`, `finalSettlements`, `salaryStructureAssignments`, `salaryWithholdings`, `taxExemptionDeclarations`, `taxExemptionDeclarationEntries`, `payrollCorrections`, `payrollCorrectionEntries`, `arrearEntries`, `gratuitySettlements`, `retentionBonuses`

### Benefits (~5 tables)

**fundamentals/**: `benefitsProviders`, `benefitPlans`
**operations/**: `benefitEnrollments`, `dependentCoverages`, `claimsRecords`

### Learning & Development (~14 tables)

**fundamentals/**: `courses`, `courseModules`, `trainers`, `learningPaths`, `learningPathCourses`
**operations/**: `trainingSessions`, `trainingEnrollments`, `courseEnrollments`, `learningPathAssignments`, `learningPathCourseProgress`, `assessments`, `certificationAwards`, `feedback`, `costRecords`

### Recruitment (~16 tables)

**fundamentals/**: `candidates`
**operations/**: `jobRequisitions`, `staffingPlans`, `staffingPlanDetails`, `applications`, `interviews`, `interviewRounds`, `interviewSchedules`, `interviewFeedback`, `offerLetters`, `backgroundChecks`, `onboardingChecklists`, `offboardingChecklists`, `probationEvaluations`, `exitInterviews`, `candidateSalaryBackfillIssues`

### Talent Management (~17 tables)

**fundamentals/**: `skills`, `certifications`, `competencyFrameworks`, `competencySkills`, `talentPools`
**operations/**: `employeeSkills`, `employeeCertifications`, `performanceGoals`, `goalTracking`, `performanceReviews`, `performanceReviewGoals`, `talentPoolMemberships`, `promotionRecords`, `successionPlans`, `grievanceRecords`, `disciplinaryActions`, `caseLinks`

---

## Relevant Files (Pattern Templates)

**Schema**:
- `packages/db/src/schema-domain/sales/tables.ts` — table definition with RLS, constraints, indexes
- `packages/db/src/schema-domain/sales/_enums.ts` — enum + Zod pattern
- `packages/db/src/schema-domain/sales/_schema.ts` — pgSchema declaration
- `packages/db/src/_shared/timestamps.ts` — `timestampColumns`, `softDeleteColumns`, `auditColumns`
- `packages/db/src/_rls/tenant-policies.ts` — `tenantIsolationPolicies()`, `serviceBypassPolicy()`

**Logic**:
- `apps/api/src/modules/sales/logic/partner-engine.ts` — pure logic function pattern
- `apps/api/src/modules/sales/logic/tax-engine.ts` — computation engine pattern
- `apps/api/src/modules/sales/logic/payment-terms.ts` — date computation pattern

**Tests**:
- `packages/db/src/__tests__/domain-schema-contracts.test.ts` — schema contract test pattern
- `apps/api/src/modules/sales/logic/partner-engine.test.ts` — logic test pattern

**Seeds**:
- `packages/db/src/_seeds/domains/foundation/index.ts` — seed function pattern

**Files to modify**:
- `packages/db/src/schema-domain/index.ts` — add `export * from "./hrm/index.js";`

---

## Verification (Per Phase)

1. `pnpm --filter @afenda/db typecheck` — type safety
2. `pnpm --filter @afenda/db test:db -- hrm-schema-contracts` — schema contracts
3. `pnpm --filter @afenda/api test -- <engine-name>` — logic tests
4. `pnpm ci:gate` — master gate (Definition of Done per AGENT.md)

---

## Decisions

- **`schema-domain/hrm/` not `schema-hrm/`**: Follow current AFENDA-META-UI convention
- **6 pgSchemas maintained**: `hr`, `payroll`, `benefits`, `learning`, `recruitment`, `talent` — matching legacy boundaries
- **Table-per-file**: Given 134 tables, use one `.ts` per table (not a single `tables.ts`)
- **Circular FKs**: Handle via custom SQL migration stubs (employees↔departments↔positions)
- **Cross-domain FKs**: Custom SQL for payroll→hr, benefits→hr, etc. to avoid circular TS imports
- **Decimal.js for all money**: Salary, payroll, benefits amounts
- **Logic as pure functions**: No DB calls in core logic — testable in isolation

---

## Excluded Scope

- UI/React components (metadata-driven via MetaModule)
- API routes/controllers (tRPC/Hono, separate concern)
- RBAC permissions matrix (uses existing security schema)

---

## Further Considerations

1. **Table-per-file vs single `tables.ts`**: Plan uses table-per-file for HRM (legacy pattern). A 134-table single file would be 10k+ lines. Confirm preferred approach?

2. **Phasing granularity**: 12 phases keeps PRs small and independently verifiable. Could merge H4→H1 and H11→H10 for 10 phases. Confirm?

3. **Zod refinement depth**: Legacy has 50+ `superRefine` cross-field refinements. Port all immediately (better safety) or incrementally (faster per-phase delivery)?
