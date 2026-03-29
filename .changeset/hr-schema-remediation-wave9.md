---
"@afenda/db": patch
---

HR insert Zod wave 9: talent & performance module parity (no DB migrations).

- **`talent.ts`:** Add `insertPerformanceReviewCycleSchema`, `insertPerformanceReviewSchema`, `insertGoalSchema`, `insertCertificationSchema`, and `insertEmployeeCertificationSchema` using existing branded ID schemas, `hrTenantIdSchema`, `EmployeeIdSchema`, and shared enum Zod types from `_enums.ts`.
- Includes light `superRefine` date ordering checks aligned with table semantics (cycle dates, goal start/target/completion, certification issue vs expiry).
