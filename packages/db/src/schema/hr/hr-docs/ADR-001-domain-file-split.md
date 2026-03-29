# ADR-001: HR Schema Domain File Split

**Status:** ✅ Implemented
**Date:** 2026-03-29
**Deciders:** Database team

---

## Context

The HR schema initially existed as a monolithic `tables.ts` file containing ~1,500 lines of code defining 45+ tables. This structure had several issues:

- **Poor maintainability:** Developers had to navigate a 1,500-line file to find table definitions
- **Merge conflicts:** Multiple developers editing the same large file caused frequent Git conflicts
- **Unclear domain boundaries:** No clear separation between fundamentally different HR concerns (payroll vs recruitment vs performance management)
- **Cognitive overload:** Understanding the schema required reading the entire file

## Decision

**Split the monolithic `tables.ts` into 8 domain-specific files based on functional cohesion:**

| File | Domain | Tables | Lines |
|------|--------|--------|-------|
| `people.ts` | Org structure | departments, jobTitles, jobPositions, employees, costCenters | 5 |
| `employment.ts` | Contracts & benefits | employmentContracts, benefitPlans, employeeBenefits | 3 |
| `payroll.ts` | Compensation | salaryComponents, employeeSalaries, payrollPeriods, payrollEntries, payrollLines | 5 |
| `attendance.ts` | Leave & time | leaveTypeConfigs, leaveAllocations, leaveRequests, holidayCalendars, holidays, timeSheets, timeSheetLines, attendanceRecords, shiftSchedules, shiftAssignments | 10 |
| `talent.ts` | Performance & skills | performanceReviewCycles, performanceReviews, goals, skills, employeeSkills, certifications, employeeCertifications | 7 |
| `recruitment.ts` | Hiring pipeline | jobOpenings, jobApplications, interviews, jobOffers | 4 |
| `training.ts` | Learning & development | trainingPrograms, trainingSessions, trainingAttendance | 3 |
| `operations.ts` | Ops & compliance | employeeDocuments, expenseClaims, expenseLines, disciplinaryActions, exitInterviews, onboardingChecklists, onboardingTasks, onboardingProgress | 8 |

**Barrel export pattern:**
Created `index.ts` to re-export all tables, types, and schemas. External code imports from `../hr/index.js` only.

## Rationale

### Domain cohesion
Each file groups tables by **functional domain**, not just by prefix. For example:
- `attendance.ts` handles leave, timesheets, shifts, holidays — all "time and attendance" concerns
- `recruitment.ts` handles the end-to-end hiring pipeline
- `payroll.ts` handles salary components, pay periods, and payroll processing

### Precedent from production systems
This structure mirrors successful patterns in mature ERP systems (e.g., legacy afenda-hybrid) where domain-specific subdirectories prevent monolithic schemas.

### Team ownership
Each domain file can have a clear owner:
- Payroll specialist owns `payroll.ts`
- Talent management specialist owns `talent.ts`
- Time & attendance specialist owns `attendance.ts`

### Reduced coupling
Changes to payroll logic don't require reviewing attendance or recruitment code.

## Consequences

### ✅ Positive

- **10x faster file navigation:** Jump directly to the relevant domain file
- **No merge conflicts:** Different developers work in different files
- **Clear code ownership:** Each file has a DRI (Directly Responsible Individual)
- **Better onboarding:** New developers read one 200-line file instead of 1,500 lines
- **Explicit dependencies:** Import statements show cross-domain relationships
- **Type safety:** Barrel re-exports maintain full type safety
- **Future microservice extraction:** Can extract a domain (e.g., `payroll/`) into a separate service

### ⚠️ Considerations

- **Circular dependencies:** Some FKs create circular references (see [ADR-002](ADR-002-circular-fk-handling.md))
- **Import discipline:** Developers must import from `../hr/index.js`, never from subfiles directly
- **File organization overhead:** New tables require choosing the correct domain file (documented in [SCHEMA_LOCKDOWN.md](SCHEMA_LOCKDOWN.md))

## Alternatives Considered

### 1. Keep monolithic file
**Rejected:** Does not scale. At 45 tables, the file is already unwieldy. Adding more tables (benefits, learning, compliance) would push it to 2,000+ lines.

### 2. Split by entity type (master data vs transactional)
**Rejected:** Entity type is an implementation detail. Functional domain is what developers think in.

### 3. Split by subdirectory (e.g., `hr/people/`, `hr/payroll/`)
**Deferred:** Possible future enhancement if domains grow beyond 500 lines per file. Current 8-file structure is sufficient.

## Current state (supersedes table above)

The schema has grown to **27 domain modules** and **146 tables**, all still under `pgSchema("hr")`. Expenses moved to `expenses.ts`, exit interviews to `lifecycle.ts`, skills to `skills.ts`, learning to `learning.ts`, and many upgrade modules were added. The historical table in **Decision** is frozen for context; the **authoritative** file → bounded-context map is **[HR_SCHEMA_UPGRADE_GUIDE.md](./HR_SCHEMA_UPGRADE_GUIDE.md) → P0 domain placement audit**.

## References

- Implementation: [packages/db/src/schema/hr/](.)
- Governance: [SCHEMA_LOCKDOWN.md](SCHEMA_LOCKDOWN.md)
- Domain catalog: [README.md](README.md)
- P0 registry: [HR_SCHEMA_UPGRADE_GUIDE.md](./HR_SCHEMA_UPGRADE_GUIDE.md)
- Circular FK handling: [ADR-002](ADR-002-circular-fk-handling.md)
