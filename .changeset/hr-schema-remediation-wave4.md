---
"@afenda/db": patch
---

HR Zod parity: audit user ids and people-analytics employee refs.

- Export `hrAuditUserIdSchema` in `_zodShared.ts` for `integer("created_by")` / `integer("updated_by")` (`auditColumns`, aligned with `security.users.user_id`).
- `benefits.ts` insert schemas: `createdBy` / `updatedBy` use `hrAuditUserIdSchema.optional()` instead of UUID strings.
- `peopleAnalytics.ts`: `ownerId` → `EmployeeIdSchema.optional()`, `requestedBy` → `EmployeeIdSchema`, `createdBy` on report subscriptions → `hrAuditUserIdSchema` (matches DB FKs and audit column types).
