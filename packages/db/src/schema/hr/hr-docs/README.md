# HR Schema Documentation Index

**Last Updated:** 2026-03-30
**Schema Version:** 2.3
**Status:** Production Ready (Phase 10 Commission Release)

---

## Active documentation

### Reference Suite

- **[HR_SCHEMA_UPGRADE_GUIDE.md](./HR_SCHEMA_UPGRADE_GUIDE.md)** - P0 cadence, domain placement audit, version timeline, and upgrade workflow.
- **[README.md](../README.md)** - Complete table catalog, domain map, and quick start guidance for HR developers.
- **[SCHEMA_LOCKDOWN.md](./SCHEMA_LOCKDOWN.md)** - Governance rules, naming conventions, and RLS/tenant policies enforced across the HR schema.
- **[CIRCULAR_FKS.md](./CIRCULAR_FKS.md)** - Current circular foreign-key registry and resolution guidance.
- **[RELATIONS_DRIFT_REMEDIATION.md](./RELATIONS_DRIFT_REMEDIATION.md)** - Living checklist to align `hrRelations` with `foreignKey()` (drizzle-schema-quality `RELATIONS_DRIFT`).
- **[HR_JSONB_GOVERNANCE_PLAN.md](./HR_JSONB_GOVERNANCE_PLAN.md)** / **[HR_JSONB_INDEX_AND_PARTITION_RUNBOOK.md](./HR_JSONB_INDEX_AND_PARTITION_RUNBOOK.md)** - JSONB rollout and operational indexing.

### Architecture Decisions

- **[ADR-001-domain-file-split.md](./ADR-001-domain-file-split.md)** - Why the schema is split into domains instead of a monolithic table list.
- **[ADR-002-circular-fk-handling.md](./ADR-002-circular-fk-handling.md)** - Deferred FK handling strategy for the HR schema.
- **[ADR-003-meta-types-integration.md](./ADR-003-meta-types-integration.md)** - Philosophy and outcomes of adopting `@afenda/meta-types` for validation and workflows.
- **[ADR-004-skills-taxonomy-performance-ratings.md](./ADR-004-skills-taxonomy-performance-ratings.md)** - Phase 5: skills taxonomy and performance ratings (deferred until product sign-off).
- **[ADR-005-equity-grant-lifecycle.md](./ADR-005-equity-grant-lifecycle.md)** - Equity grant status enum and lifecycle semantics.
- **[ADR-006-people-org-deferred-fks-and-hierarchy.md](./ADR-006-people-org-deferred-fks-and-hierarchy.md)** - People/org deferred FKs and hierarchy notes.
- **[ADR-007-ess-workflow-and-events.md](./ADR-007-ess-workflow-and-events.md)** - ESS SLA, approval tasks, events/outbox, survey questionnaire versions.
- **[HR_ENUM_PHASE2_4_SIGNOFF.md](./HR_ENUM_PHASE2_4_SIGNOFF.md)** - Phase 2 & 4 additive enum sign-off checklist (fuel, DEI, core benefit `pending`).
- **[HR_ENUM_SCHEMA_INTEGRATION.md](./HR_ENUM_SCHEMA_INTEGRATION.md)** - Which tables use catalog enums, what was integrated vs intentionally omitted.
- **[HR_SCHEMA_ENUM_AND_INSERT_VALIDATION.md](./HR_SCHEMA_ENUM_AND_INSERT_VALIDATION.md)** - Enum centralization + full insert-schema coverage checklist.

### Diagrams & Visualizations

- **[SCHEMA_DIAGRAM.md](./SCHEMA_DIAGRAM.md)** - Mermaid ERDs, module overviews, and workflow diagrams for the current release.

### Project Resources

- **[PROJECT-INDEX.md](./PROJECT-INDEX.md)** - Chronological release index and ownership pointers.

---

## 🆕 Latest Releases

- **v2.3 (2026-03-30):** `hr-docs` + `SCHEMA_DIAGRAM.md` aligned to code (**167** HR tables; `benefits.ts` provider model; ESS ERD). `_relations.ts` header documents catalog naming, `kind` semantics, and that `RELATIONS_DRIFT` only compares HR→HR edges. See `HR_SCHEMA_UPGRADE_GUIDE.md` v2.3 row.
- **P0 / v2.2 (Upgrade guide closure):** HR policy catalog + employee acknowledgments, shift swap workflow (`shift_swap_requests` + `shiftSwapWorkflow`), onboarding task category/status wired with DB CHECK + Zod, GIN indexes on JSON text payloads (analytics, exports, dimensions, overtime scope, biometric logs, notifications), payroll adjustment Zod aligned to pgEnum, full `_relations` catalog aligned to `foreignKey()` with `pnpm ci:gate:schema-quality` / **`RELATIONS_DRIFT` as error**, extractor support for self-table composite second legs, `staffing_plans.approved_by` → employees, grievance category composite self-FK. See `HR_SCHEMA_UPGRADE_GUIDE.md` and `SCHEMA_DIAGRAM.md`.
- **SWOT Proposal Release:** Adds Grievance Management (2 tables) and Loan Management (2 tables) based on senior HR director SWOT analysis. Closes critical legal/compliance gap (grievances) and APAC/MEA market gap (salary advances/loans). New workflow state machines, branded IDs, 8 new pgEnums, ERDs, and Zod insert schemas. See `.reports/hr-schema-swot-analysis.md`.
- **Phase 10 (Commission & Sales Team Release):** Adds commission plans, tiers, entries, territories, territory rules, sales teams, and members so compensation can be modeled end-to-end. It closes the strategic HR gap for incentive and territory management while keeping all data within tenant boundaries.
- **Phase 9 to 6 Recap:** Employee Experience, Workforce Strategy, People Analytics, and Global Workforce domains remain active, with analytics fact tables partitioned manually as documented in `SCHEMA_DIAGRAM.md`.

## 🧭 Naming & Domain Sequencing

- Naming conventions mirror the root schema README: tables use the `hr.` prefix, lower_snake_case identifiers, tenant-scoped UUID PKs, and enums defined centrally in `_enums.ts`. Consult `../README.md` for the canonical list and naming rules before adding new tables.
- Domains are grouped by business responsibility, not the chronological creation order. Use `SCHEMA_DIAGRAM.md` for the current domain map and the `HR_SCHEMA_UPGRADE_GUIDE.md` (below) for past upgrade sequencing, so future modules preserve the structural narrative.

---

## 🗂️ File Structure

```
hr-docs/
├── README.md (this file)
├── ADR-001 … ADR-007 (*.md)
├── HR_ENUM_*.md, HR_JSONB_*.md, HR_SCHEMA_*.md
├── CIRCULAR_FKS.md, RELATIONS_DRIFT_REMEDIATION.md, PAYROLL_TAX_BRACKET_OVERLAP.md
├── PROJECT-INDEX.md, SCHEMA_DIAGRAM.md, SCHEMA_LOCKDOWN.md
└── (see directory listing — training tables live in `learning.ts`; no separate migration doc)
```

---

## 🚀 Quick Start

1. **New to the HR Schema?** Start with [README.md](../README.md).
2. **Need governance clarity?** Read [SCHEMA_LOCKDOWN.md](./SCHEMA_LOCKDOWN.md).
3. **Looking for relationships?** View [SCHEMA_DIAGRAM.md](./SCHEMA_DIAGRAM.md).
4. **Planning upgrades?** Follow [HR_SCHEMA_UPGRADE_GUIDE.md](./HR_SCHEMA_UPGRADE_GUIDE.md) for P0 cadence and documentation expectations.
5. **Implementing cross-domain changes?** Reference [ADR-003](./ADR-003-meta-types-integration.md) to understand shared validation helpers.
6. **Changing FKs or `hrRelations`?** Run `pnpm ci:gate:schema-quality` from the repo root (`RELATIONS_DRIFT` is an error). See [RELATIONS_DRIFT_REMEDIATION.md](./RELATIONS_DRIFT_REMEDIATION.md).
7. **ESS workflows and events?** See [ADR-007](./ADR-007-ess-workflow-and-events.md) and `employeeExperience.ts`.

---

## 📊 Schema Statistics

- **Total Tables:** 167 in `hr.*` (P0 domain placement audit in `HR_SCHEMA_UPGRADE_GUIDE.md`)
- **Total Enums:** 94+ (see `_enums.ts`; exact count changes with releases)
- **Total Domain modules:** 27 data modules under `packages/db/src/schema/hr/*.ts` (plus `_schema`, `_enums`, `_zodShared`, `_relations`, `index.ts`, helpers such as `disposableEmailDomains.ts`)
- **Documentation Files:** all `hr-docs/*.md` listed in this README’s “Active documentation” section
- **Last Major Update:** v2.3 docs + catalog header (2026-03-30); ESS enterprise upgrade (ADR-007) in `employeeExperience.ts`

---

## 🔄 Maintenance

- Archive supporting phase documentation only after the associated domain has stabilized and the knowledge has been captured elsewhere.
- Retain ADRs, governance, and diagram documents indefinitely.
- Update this README and `PROJECT-INDEX.md` whenever a new release or governance change lands.
- Quarterly-review the circular FK registry and soft-delete strategy for drift.

---

**Maintained by:** Database Architecture Team
