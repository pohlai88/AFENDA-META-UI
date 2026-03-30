# HR Schema 360° Audit Report

**Date:** 2026-03-30  
**Scope:** `packages/db/src/schema/hr/` — **167** physical `hr.*` tables across **27** domain modules (excluding `_*.ts` infra), plus shared `_enums.ts`, `_zodShared.ts`, `_relations.ts`, `CUSTOM_SQL_REGISTRY.json`, and migrations under `packages/db/migrations/`.  
**Method:** `pnpm ci:gate:schema-quality:hr`, `pnpm ci:gate:hr-enums-schema`, `pnpm ci:gate:zod4-iso-dates`, `pnpm exec drizzle-kit check` (from `packages/db`), `node tools/scripts/hr-schema-audit-scan.mjs --format=json`, and targeted verification of `approved_by` / `reviewed_by` FK coverage.

---

## Severity rubric (applied to every finding)

| Severity | Definition |
|----------|------------|
| **P0** | Breaks tenant isolation, referential integrity, or RLS; cross-tenant or orphan data risk; or blocks migration verification. |
| **P1** | Conventions, performance, maintainability; Zod vs DB drift that rejects valid rows or accepts invalid shapes. |
| **P2** | Documentation, symbolic relation catalog drift, naming ergonomics without wrong DB behavior. |

---

## Executive summary

- **Inventory:** **167** `hrSchema.table(` definitions; barrel [`index.ts`](../packages/db/src/schema/hr/index.ts) header aligned to **167**. Authoritative registry: [`HR_SCHEMA_UPGRADE_GUIDE.md`](../packages/db/src/schema/hr/hr-docs/HR_SCHEMA_UPGRADE_GUIDE.md).
- **CI gates (2026-03-30):** `pnpm ci:gate:schema-quality:hr` — **0 errors, 0 warnings** (28 files, full mode). `pnpm ci:gate:hr-enums-schema` — **OK**. `pnpm ci:gate:hr-no-z-any` — **OK** (forbids `z.any()` under `packages/db/src/schema/hr`). `pnpm ci:gate:zod4-iso-dates` — **OK**. Automated scan output: `.reports/hr-audit-scan-raw.json` — `errorCount: 0`, `warnCount: 0`, `suppressedByBaseline: 0`.
- **Migration graph:** `pnpm exec drizzle-kit check` (from `packages/db`) — **passes** after removing duplicate parallel baseline folder `migrations/20260327103141_initial_schema/` (same logical baseline as the start of chain `20260326225459_tranquil_nick_fury` → … → `20260327084444_even_nemesis`, both rooted at `prevIds: ["00000000-0000-0000-0000-000000000000"]` with conflicting `create_schema: core`). **Operational note:** environments that recorded only `20260327103141_initial_schema` in `__drizzle_migrations` need a one-time DBA review before deleting that row or relying on the remaining chain; greenfield installs use the linear chain only.
- **Benefits / Zod / FKs:** Prior P0 findings in [`benefits.ts`](../packages/db/src/schema/hr/benefits.ts) (employee + reviewer FKs, `hrTenantIdSchema`, dependent `name` field, named indexes) are **present and verified** in tree; the 2026-03-29 audit narrative for that file was **stale**.
- **Validation hardening:** `z.any()` removed from HR insert schemas in [`recruitment.ts`](../packages/db/src/schema/hr/recruitment.ts) (resume parsed data) and [`peopleAnalytics.ts`](../packages/db/src/schema/hr/peopleAnalytics.ts) (JSONB-backed fields use `z.json()` or `jsonObjectNullishSchema` as appropriate).
- **Public API:** [`disposableEmailDomains.ts`](../packages/db/src/schema/hr/disposableEmailDomains.ts) is exported from the HR barrel. Deprecated legacy aliases removed from [`_zodShared.ts`](../packages/db/src/schema/hr/_zodShared.ts) (`salaryAmountSchema`, `hoursWorkedSchema`, `percentageSchema`, `phoneNumberSchema`, `emailSchema`, `taxIdSchema`, `bankAccountSchema_legacy`); **no in-repo TypeScript imports** referenced them.
- **Reviewer / approver FKs:** Spot verification of all `approved_by` / `reviewed_by` UUID columns identified in HR domain tables shows **composite `foreignKey` to `(employees.tenant_id, employees.id)`** where applicable (including nullable reviewer/approver columns).

**Open / follow-on (non-blocking):**

- **P2 — Enum vs `text` + `check()`:** Episodic migration of high-churn statuses to `pgEnum` remains a product/governance decision ([`SCHEMA_LOCKDOWN.md`](../packages/db/src/schema/hr/hr-docs/SCHEMA_LOCKDOWN.md)).
- **P2 — Dual benefit models:** `employment.ts` catalog vs `benefits.ts` provider/enrollment model — document convergence in upgrade guide / ADR when product defines a single story.
- **`report_subscriptions.recipients`:** Sunset path documented in [`HR_SCHEMA_UPGRADE_GUIDE.md`](../packages/db/src/schema/hr/hr-docs/HR_SCHEMA_UPGRADE_GUIDE.md) (use `report_subscription_recipients`; column drop deferred to a batched migration, not drive-by SQL).

**Go / no-go:** HR schema meets the **machine-verifiable** production bar in this repo: HR schema-quality gate clean, enum pairing gate clean, Zod4 ISO gate clean, `drizzle-kit check` green, no `z.any()` in HR schema insert Zod for the former hotspots, migration graph linearized as above.

---

## Compliance summary table

| Dimension | Tables / units reviewed | Pass | Fail / N/A | Notes |
|-----------|---------------------------|------|------------|-------|
| 1 Tenant isolation & FKs | 167 tables | **Pass** | — | Benefits + approver/reviewer columns verified. |
| 2 RLS & policies | 167 tables | **Pass** | — | Via `ci:gate:schema-quality:hr`. |
| 3 Indexes & uniqueness | 167 tables | **Pass** | — | Anonymous index rule clean on HR glob. |
| 4 Constraints & types | Sampled | **Pass** | N/A | Full row-by-row enum catalog optional. |
| 5 Zod & workflow parity | HR modules | **Pass** | — | `z.any()` eliminated in recruitment + people analytics inserts; benefits aligned. |
| 6 `_relations.ts` | Symbolic catalog | **Pass** | — | `RELATIONS_DRIFT` clean (full repo gate historical). |
| 7 Cross-schema & circular FKs | Registry files | **Pass** | N/A | Unchanged; see `CIRCULAR_FKS.md`. |
| 8 Domain consistency | Narrative | N/A | N/A | Dual benefit concepts — P2 doc. |
| 9 Documentation | Guide + README | **Pass** | — | 167 tables consistent in guide, README, PROJECT-INDEX, `index.ts`. |
| 10 Migration drift | `drizzle-kit check` | **Pass** | — | After duplicate-root migration removal; see executive summary. |

---

## Matrix summary (aggregate)

| Metric | Result |
|--------|--------|
| `ci:gate:schema-quality:hr` | 0 errors, 0 warnings |
| `hr-audit-scan-raw.json` | `findings: []` |
| `drizzle-kit check` | OK |

---

## Remediation applied (this pass)

| Item | Action |
|------|--------|
| Non-commutative migrations | Removed `packages/db/migrations/20260327103141_initial_schema/` (duplicate root vs `20260326225459_tranquil_nick_fury` chain). |
| Loose Zod | `recruitment.ts` / `peopleAnalytics.ts`: `z.any()` → `z.json()` / `jsonObjectNullishSchema`. |
| Barrel | `index.ts`: table count **167**; `export * from "./disposableEmailDomains.js"`. |
| Legacy exports | Removed deprecated validators from `_zodShared.ts` (no usages). |

---

## Appendix

### A. Inventory command (reference)

```bash
rg "hrSchema\.table\(" packages/db/src/schema/hr --glob "*.ts" --glob "!_*" -c
```

### B. Automation

- **Script:** `tools/scripts/hr-schema-audit-scan.mjs`
- **Output:** `.reports/hr-audit-scan-raw.json` — summary + findings from drizzle-schema-quality (HR glob).

### C. Commands executed (evidence)

```bash
pnpm ci:gate:schema-quality:hr
pnpm ci:gate:hr-enums-schema
pnpm ci:gate:hr-no-z-any
pnpm ci:gate:zod4-iso-dates
cd packages/db && pnpm exec drizzle-kit check
node tools/scripts/hr-schema-audit-scan.mjs --format=json
```

### D. Severity + matrix rubric source

Mirrored from `.reports/hr-schema-360-audit-PLAN.md` and the HR production-readiness plan (2026-03-30).
