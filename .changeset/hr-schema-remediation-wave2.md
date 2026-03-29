---
"@afenda/db": patch
---

HR schema remediation (wave 2): learning/recruitment index names, Zod approver parity, benefits relations catalog.

- Name all anonymous `index()` / `uniqueIndex()` in `learning.ts` and the anonymous `uniqueIndex()` on `interview_feedback` in `recruitment.ts`.
- Use `EmployeeIdSchema` for nullable `approvedBy` / `reviewedBy` in insert Zod where the table already has a composite FK to `employees` (`payroll_adjustments`, `employee_requests`, `compliance_tracking`, `employee_loans`).
- Align `insertCourseSchema` / `insertCourseSessionSchema` optional `instructorId` with `EmployeeIdSchema` (matches `courses` / `course_sessions` employee FKs).
- Extend `hrRelations` with Phase-1 `benefit_*` edges (enrollments, dependent coverage, claims, plan benefits, reviewer).
