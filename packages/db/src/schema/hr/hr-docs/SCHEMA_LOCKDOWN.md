# HR Schema Lockdown — Governance & Conventions

> Canonical rules for `packages/db/src/schema/hr/`. Every PR touching HR tables **must** follow these.

## File Organisation

| File | Domain | Tables |
|------|--------|--------|
| `people.ts` | Org structure | departments, jobTitles, jobPositions, employees, costCenters |
| `employment.ts` | Contracts & benefits | employmentContracts, benefitPlans, employeeBenefits |
| `payroll.ts` | Compensation | salaryComponents, employeeSalaries, payrollPeriods, payrollEntries, payrollLines |
| `attendance.ts` | Leave & time | leaveTypeConfigs, leaveAllocations, leaveRequests, holidayCalendars, holidays, timeSheets, timeSheetLines, attendanceRecords, shiftSchedules, shiftAssignments |
| `talent.ts` | Performance & skills | performanceReviewCycles, performanceReviews, goals, skills, employeeSkills, certifications, employeeCertifications |
| `recruitment.ts` | Hiring | jobOpenings, jobApplications, interviews, jobOffers |
| `training.ts` | L&D | trainingPrograms, trainingSessions, trainingAttendance |
| `operations.ts` | Ops & compliance | employeeDocuments, expenseClaims, expenseLines, disciplinaryActions, exitInterviews, onboardingChecklists, onboardingTasks, onboardingProgress |

**New tables** go into the file whose domain they belong to. If no domain fits, discuss before creating a new file.

## Mandatory Patterns

### 1. Composite Foreign Keys (tenant isolation)

Every FK referencing a table within the HR schema **must** include `tenantId`:

```ts
foreignKey({
  columns: [table.tenantId, table.employeeId],
  foreignColumns: [employees.tenantId, employees.id],
})
```

Single-column FKs are only acceptable for:
- `tenantId → tenants.tenantId` (the tenant itself)
- `currencyId → currencies.currencyId` (reference tables without tenantId)

### 2. Tenant-Leading Indexes

Every non-unique index **must** start with `table.tenantId`:

```ts
index("my_table_employee_idx").on(table.tenantId, table.employeeId)
```

This ensures the Postgres planner can prune by tenant on every query.

### 3. Soft-Delete Unique Indexes

Tables with `...softDeleteColumns` **must** use a partial unique index:

```ts
uniqueIndex("my_table_tenant_code_unique")
  .on(table.tenantId, table.code)
  .where(sql`${table.deletedAt} IS NULL`)
```

This allows re-use of business codes after soft deletion.

### 4. CHECK Constraints

Add `check()` constraints for business invariants:

| Constraint type | Example |
|----------------|---------|
| Non-negative amounts | `check("name", sql\`${table.amount} >= 0\`)` |
| Positive quantities | `check("name", sql\`${table.quantity} > 0\`)` |
| Date ranges | `check("name", sql\`${table.startDate} <= ${table.endDate}\`)` |
| Bounded values | `check("name", sql\`${table.hours} >= 0 AND ${table.hours} <= 24\`)` |

### 5. RLS Policies

Every table must include both policies:

```ts
...tenantIsolationPolicies("table_name"),
serviceBypassPolicy("table_name"),
```

### 6. Column Helpers

Use shared column helpers — never define `created_at`, `updated_at`, `deleted_at`, `name`, or audit fields manually:

- `...timestampColumns` — created_at, updated_at
- `...auditColumns` — created_by, updated_by
- `...softDeleteColumns` — deleted_at, deleted_by
- `...nameColumn` — name (text, not null)

## Import Rules

- All cross-file table imports within `hr/` use relative paths: `from "./people.js"`
- Cross-schema imports use relative paths: `from "../core/tenants.js"`
- The barrel `index.ts` is the **only** public API — external code imports `from "../hr/index.js"`
- Never import from a specific subfile outside of the `hr/` directory

## Naming Conventions

- **Table variables**: camelCase plural (`employees`, `jobOpenings`)
- **SQL table names**: snake_case (`job_openings`)
- **Index names**: `{table}_{columns}_idx` for indexes, `{table}_{columns}_unique` for unique
- **FK constraint names**: auto-generated (Drizzle default)
- **CHECK names**: `{table}_{column}_check` or `{table}_{rule}_check`
- **Enum imports**: from `./_enums.js` only
