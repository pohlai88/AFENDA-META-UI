---
"@afenda/db": patch
---

HR Zod normalization: shared tenant id validator for all HR insert schemas.

- Export `hrTenantIdSchema` from `_zodShared.ts` (`z.number().int().positive()` aligned with `integer("tenant_id")` / `core.tenants`).
- Replace inline `tenantId: z.number().int().positive()` with `hrTenantIdSchema` across HR domain modules; consolidate duplicate `_zodShared` imports where `currencyAmountSchema` was imported twice.
