# HR schema validation — enums & Zod insert coverage

**Scope:** `packages/db/src/schema/hr` (excluding `_schema.ts`, `index.ts`, `_relations.ts`).

## 1. No inline PostgreSQL enums

- **Rule:** `hrSchema.enum(...)` appears only in `_enums.ts`.
- **Result:** Satisfied. Domain modules import `*Enum` from `./_enums.js`.
- **Zod:** `z.enum([...])` for HR catalogs appears only in `_enums.ts` (plus `_zodShared.ts` workflow factory `z.enum(workflowDef.states)` — not a catalog duplicate).

## 2. Every `hrSchema.table` has a matching `insert*Schema`

Each table export has a corresponding `export const insert<TableName>Schema` in the same module (PascalCase table → camelCase insert name).

| Module | Tables | Insert schemas | Notes |
|--------|--------|----------------|--------|
| `attendance.ts` | 10 | 10 | Added: leave type config, allocation, holiday calendar, holiday, time sheet line, attendance record, shift schedule, shift assignment; existing: leave request, time sheet. |
| `employment.ts` | 3 | 3 | |
| `people.ts` | 5 | 5 | |
| `payroll.ts` | 10 | 10 | |
| `talent.ts` | 5 | 5 | |
| `recruitment.ts` | 10 | 10 | |
| `learning.ts` | 16 | 16 | Added: course module, learning path, learning path course. |
| `policyAcknowledgments.ts` | 2 | 2 | |
| `operations.ts` | 5 | 5 | |
| `benefits.ts` | 5 | 5 | |
| `employeeExperience.ts` | 6 | 6 | |
| `workforceStrategy.ts` | 8 | 8 | |
| `peopleAnalytics.ts` | 7 | 7 | Includes `report_subscription_recipients`. |
| `globalWorkforce.ts` | 6 | 6 | |
| `expenses.ts` | 6 | 6 | Added: `insertExpenseClaimSchema` for legacy `expense_claims`. |
| `leaveEnhancements.ts` | 3 | 3 | |
| `grievances.ts` | 2 | 2 | |
| `loans.ts` | 3 | 3 | Includes `employee_loan_installments`. |
| `lifecycle.ts` | 4 | 4 | |
| `travel.ts` | 4 | 4 | |
| `workforcePlanning.ts` | 2 | 2 | |
| `appraisalTemplates.ts` | 3 | 3 | |
| `compensation.ts` | 5 | 5 | |
| `attendanceEnhancements.ts` | 5 | 5 | |
| `taxCompliance.ts` | 5 | 5 | |
| `engagement.ts` | 3 | 3 | |
| `skills.ts` | 7 | 7 | |

**Non-table files:** `_enums.ts`, `_zodShared.ts`, `_schema.ts`, `_relations.ts`, `index.ts` — no `hrSchema.table`.

## 3. Maintenance

- After adding a table, add `insert…Schema` in the same file using `*Schema` types from `_enums.ts` for enum fields.
- Run `pnpm exec tsc --noEmit -p packages/db` and `pnpm ci:gate:hr-enums-schema` from repo root.
