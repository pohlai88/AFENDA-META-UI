---
"@afenda/db": patch
---

HR `employees.user_id` aligned with `security.users.userId` (integer FK).

- **`people.ts`:** `employees.userId` column type changed from `uuid` to `integer("user_id")` so Drizzle matches the existing `foreignKey` to `security.users`.
- **`insertEmployeeSchema`:** `userId` uses `UserIdSchema` from the security module (optional).

**Database note:** If an environment still has `hr.employees.user_id` as `uuid`, drop the inconsistent FK, migrate values to `security.users.userId`, then `ALTER COLUMN ... TYPE integer` (or rebuild the column) before re-applying the FK.
