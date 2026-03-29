---
"@afenda/db": patch
---

HR insert Zod wave 6: recruitment, payroll, and onboarding checklist FK fields.

- **recruitment:** Job openings, applications, interviews, offers, applicant documents, interview feedback, and offer letters use branded IDs (`JobOpeningIdSchema`, `JobApplicationIdSchema`, `InterviewIdSchema`, `JobOfferIdSchema`, `JobPositionIdSchema`, `DepartmentIdSchema`, `EmployeeIdSchema`) instead of raw UUID strings.
- **payroll:** Salary components, employee salaries, periods, entries, lines, adjustments, payslips, and payment distributions use `SalaryComponentIdSchema`, `EmployeeSalaryIdSchema`, `PayrollPeriodIdSchema`, `PayrollEntryIdSchema`, `PayrollLineIdSchema`, and `EmployeeIdSchema` as appropriate.
- **operations:** `insertOnboardingChecklistSchema` optional `departmentId` / `jobPositionId` use `DepartmentIdSchema` and `JobPositionIdSchema`.
