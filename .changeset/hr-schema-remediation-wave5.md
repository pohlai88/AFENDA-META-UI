---
"@afenda/db": patch
---

HR insert Zod: branded UUIDs aligned with Drizzle FKs.

- **workforceStrategy:** succession, talent pool members, career paths/steps, and aspirations use `JobPositionIdSchema`, `EmployeeIdSchema`, `DepartmentIdSchema`, `TalentPoolIdSchema`, `CareerPathIdSchema`, and `CareerPathStepIdSchema` instead of raw `z.string().uuid()`.
- **compensation:** `insertCompensationBudgetSchema` uses `CompensationCycleIdSchema`, `DepartmentIdSchema`, and `JobPositionIdSchema` for FK fields.
- **loans:** `insertEmployeeLoanSchema` uses `EmployeeIdSchema` and `LoanTypeIdSchema`.
- **learning:** course / path enrollments and certificates use `EmployeeIdSchema` for `employeeId`.
- **employeeExperience:** profile, request, notification, preference, and survey response schemas use `EmployeeIdSchema` / `EmployeeSurveyIdSchema` as appropriate.
- **globalWorkforce:** assignments, allowances, permits, and relocation services use `EmployeeIdSchema` and `InternationalAssignmentIdSchema` for FK-shaped fields.
- **grievances:** employee grievance insert uses `GrievanceCategoryIdSchema`, `DepartmentIdSchema`, and `EmployeeIdSchema` for related IDs.
