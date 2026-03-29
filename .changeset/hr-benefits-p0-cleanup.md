---
"@afenda/db": patch
---

HR benefits module: P0 integrity and validation alignment from HR 360 audit.

- Composite `foreignKey` from `benefit_enrollments` to `employees` on `(tenant_id, employee_id)`.
- Composite `foreignKey` from `benefit_claims` to `employees` on `(tenant_id, reviewed_by)` (nullable reviewer).
- Insert Zod: `tenantId` as positive integer to match `integer("tenant_id")`; `employeeId` / optional `reviewedBy` use `EmployeeIdSchema`; dependent row uses `name` to match `nameColumn`.
- Replace anonymous `index()` / `uniqueIndex()` with stable names on all `benefits.ts` tables.

Apply matching SQL migrations when generating from Drizzle or before production deploy.
