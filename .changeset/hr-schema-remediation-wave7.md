---
"@afenda/db": patch
---

HR insert Zod wave 7: branded UUIDs for plan benefits, polymorphic refs, and location/project refs without Drizzle FKs.

- **`_zodShared`:** `BenefitPlanBenefitIdSchema`, `ExpenseLineProjectRefIdSchema`, `BonusPointTransactionReferenceIdSchema`, `HrWorkLocationUuidSchema` (+ `BenefitPlanBenefitId` type).
- **benefits:** `insertBenefitPlanBenefitSchema.id` uses `BenefitPlanBenefitIdSchema`.
- **engagement:** `insertBonusPointTransactionSchema.referenceId` uses `BonusPointTransactionReferenceIdSchema`.
- **lifecycle:** transfer `fromLocationId` / `toLocationId` use `HrWorkLocationUuidSchema`.
- **expenses:** expense line `projectId` uses `ExpenseLineProjectRefIdSchema`.
- **attendanceEnhancements:** biometric device `locationId` uses `HrWorkLocationUuidSchema`.
- **people:** employee `workLocationId` uses `HrWorkLocationUuidSchema`. `userId` remains raw UUID until `employees.user_id` is aligned with `security.users.user_id` (integer) in a dedicated migration.
