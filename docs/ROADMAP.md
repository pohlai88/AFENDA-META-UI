# AFENDA-META-UI — Strategic Roadmap

**Date**: March 26, 2026
**Status**: Living document — update as phases complete

---

## Implementation Kickoff (March 26, 2026)

### Completed

- Started Phase 0.5 schema hardening for Sales domain in `@afenda/db`
- Upgraded sales tables to tenant-aware, indexed, `pgSchema("sales")` definitions
- Added DB-level check constraints for core numeric invariants in sales lines/orders
- Added domain Zod contracts and branded identifiers for sales entities
- Added tenant FK enforcement across sales domain tables
- Added sales relations map module and exported it in the sales barrel
- Made deterministic seeds tenant-safe by ensuring a baseline tenant exists before domain inserts
- Added missing dependency catalog entries and switched core app dependencies to `catalog:` references

### Next

- Add read-model/query-layer usage of sales relations map
- Backfill migration SQL for moving sales objects into `sales` schema on existing environments

---

## System Identity

This is not a web app with features.
This is a **Business Truth Engine** — a system whose job is to encode reality correctly and let UI/API emerge from it.

Every decision below serves one question:

> **What strengthens truth, integrity, and scalability of the system core?**

---

## Current State (March 2026)

### What's Strong

| Layer | Maturity | Notes |
|-------|----------|-------|
| Database schemas | Enterprise-grade | Domain-separated, tenant-isolated, RLS policies, consistent column primitives |
| Metadata pipeline | Strategic advantage | Schema → Metadata → CRUD API → Generated UI (Odoo/ERPNext-class pattern) |
| Deterministic seeds | Elite-level | Scenario-driven, deterministic ID graphs, invariant calculators |
| UI renderers | Production-ready | MetaListV2, MetaFormV2, MetaDashboard, MetaKanban, 20+ field types |
| CI gates | Complete | TypeScript, boundaries, lint, bundle monitoring, Vite quality gates |

### Where We're Leaking Leverage

1. **Documentation overgrowth** — 34 docs with fragmented knowledge; truth exists but is hard to locate
2. **Domain logic is thin** — Modules are data structures with CRUD, not business engines (no state machines, invariants, posting rules)
3. **UI maturity > Domain maturity** — Beautiful shell, thin business core; ERP value comes from the core

---

## Strategic Priorities (Highest ROI First)

### Priority 1 — Strengthen Business Truth Layer (Domain Logic Engines)

Complete domain logic that turns CRUD tables into truth engines: state machines, invariants, posting rules, lifecycle transitions, reconciliation logic.

### Priority 2 — Deterministic Truth Governance (CI-Level Guarantees)

Snapshot DB truth in CI, seed versioning, invariant test harness. Turn the system into a verifiable machine.

### Priority 3 — Documentation Consolidation

Reduce 34 docs to ~8 canonical sources. Docs are the developer UI.

### Priority 4 — Domain Expansion (DB-First, Metadata-Driven)

Add ERP modules breadth using the metadata pipeline. Each new Drizzle table auto-generates API + UI.

### Deprioritized

- New UI renderers (Grid, Calendar) — doesn't increase system truth
- DevOps polish — useful later, not leverage-critical now
- Fancy features — if it doesn't strengthen truth invariants, referential integrity, or domain state machines, it waits

---

## Phase 0 — Documentation Consolidation

**Goal**: Reduce 34 docs → 8 focused files. Eliminate redundancy from overlapping status/gap/validation reports.

### Consolidation Map

| New File | Absorbs | Purpose |
|----------|---------|---------|
| `README.md` *(keep)* | — | Architecture overview, quick start, project structure |
| `PROJECT_STATUS.md` *(new)* | ACTUAL_COMPLETION_STATUS, ACTUAL_GAPS_CORRECTED, IMPLEMENTATION_STATUS, IMPLEMENTATION_PROGRESS, SPRINT_1_COMPLETION, VALIDATION_REPORT, VALIDATION_GAP_ANALYSIS, VALIDATION_COMPREHENSIVE, GAP_ANALYSIS_COMPREHENSIVE, GAP_CLOSURE_COMPLETE, GAP_CLOSURE_SUMMARY, IMPLEMENTATION_COMPLETE_PHASE_5_6, PHASE_4_GAP_REPORT | Single source of truth: completion %, remaining P1/P2/P3 gaps, phase status |
| `ARCHITECTURE.md` *(new)* | PHASE_3_ARCHITECTURE_VALIDATION, PHASE_3_IMPLEMENTATION_SUMMARY, RENDERER_PLATFORM_SUMMARY, ui-system.md | Business Truth Engine pillars, tenant resolution, renderer contracts |
| `ROADMAP.md` *(this file)* | PHASE_4_STRATEGIC_ROADMAP, PHASE_1_STABILIZATION_PLAN | Forward-looking phases + completed phase history |
| `DEPLOYMENT.md` *(new)* | deployment.md, DOCKER_SETUP, VERCEL_DEPLOYMENT, BUNDLE_MONITORING_IMPLEMENTATION, ENTERPRISE_VITE_VALIDATION | Unified deployment: Docker, Vercel, bundle monitoring |
| `CI_GATES.md` *(new)* | VITE_CI_GATE_IMPLEMENTATION, VITE_GATE_QUICK_REFERENCE, QUICK_REFERENCE_BUNDLE | All CI gate commands + quick reference |
| `CONTRIBUTING.md` *(expand)* | DEPENDENCY_GOVERNANCE_POLICY, DEPENDENCY_CHANGE_CHECKLIST, TYPESCRIPT_EXPORTS, CSP_IMPLEMENTATION | Merge governance + deps into contributing |
| `GUIDES.md` *(new)* | field-types.md, adding-a-module.md | Developer reference: field types + module onboarding |

**Result**: 26 files deleted, 8 focused files remain.

### Steps

1. Create consolidated files (merge authoritative content from sources)
2. Delete absorbed files
3. Update cross-references in AGENT.md and remaining docs
4. Verify no broken links

---

## Phase 1 — Sales Truth Engine

**Goal**: Turn the existing Sales domain from CRUD tables into a **business truth engine** with state machines, invariants, and financial correctness.

### 1A. Order State Machine

```
draft → confirmed → shipped → done
  ↓                              ↓
cancelled ←────────────────── cancelled
```

Implement in `apps/api/src/modules/sales/logic.ts`:

- State transition validation (cannot ship a draft, cannot cancel a shipped order)
- Guard conditions per transition (e.g., confirm requires ≥1 line)
- Reversal logic for cancellation (undo reservations, reverse postings)

### 1B. Financial Invariants

| Invariant | Rule | Enforcement |
|-----------|------|-------------|
| Line subtotal | `subtotal = quantity × unit_price × (1 - discount/100)` | Computed, never stored raw |
| Order untaxed | `amount_untaxed = Σ(line.subtotal)` | Derived from lines |
| Order tax | `amount_tax = Σ(line.subtotal × tax_rate)` | Derived from lines + tax table |
| Order total | `amount_total = amount_untaxed + amount_tax` | Derived, immutable |
| Balance check | `amount_total ≥ 0` | DB CHECK constraint |

Add to `packages/db/src/schema-domain/sales/tables.ts`:
- Tax rate reference columns on order lines
- Computed amount columns on sales orders

### 1C. Invariant Test Suite

Create `apps/api/src/__tests__/sales-invariants.test.ts`:
- Seed a full order graph (partner → order → lines → products)
- Assert subtotal/tax/total derivation correctness
- Assert invalid state transitions throw
- Assert cancellation reverses correctly
- Run against deterministic seed IDs

### 1D. Schema Additions

Extend `partners` table:
- `partner_type` enum: `customer | vendor | both`
- `is_company` boolean
- `vat_number` text (nullable)
- `payment_term_id` FK (once accounting exists)

Extend `salesOrders` table:
- `amount_untaxed` numeric(14,2)
- `amount_tax` numeric(14,2)
- `amount_total` numeric(14,2)

Extend `salesOrderLines` table:
- `discount` numeric(5,2) default 0
- `tax_id` FK (once tax_rates table exists)
- `subtotal` numeric(14,2)

---

## Phase 2 — Accounting Double-Entry Engine (The Mathematical Spine)

**Goal**: Build the financial backbone. If this is correct, everything else (sales, inventory, payroll, purchasing) becomes **postings into this engine**.

### Why This Before New Modules

Every ERP domain eventually needs to answer: "What's the financial impact?" Without an accounting engine, each domain invents its own financial logic. With one, all domains post journal entries and the system self-balances.

### Tables

Create `packages/db/src/schema-domain/accounting/tables.ts`:

| Table | Purpose | Key Columns |
|-------|---------|-------------|
| `chart_of_accounts` | Account tree | code, name, account_type (asset/liability/equity/revenue/expense), parent_id (self-ref), reconcile (bool) |
| `fiscal_years` | Accounting periods | date_from, date_to, state (open/closed) |
| `fiscal_periods` | Monthly periods within fiscal year | fiscal_year_id FK, date_from, date_to |
| `journals` | Transaction grouping | type (sale/purchase/cash/bank/general), default_debit_account_id, default_credit_account_id |
| `journal_entries` | Header | journal_id FK, date, reference, state (draft/posted/cancelled), partner_id |
| `journal_entry_lines` | Debit/credit lines | entry_id FK, account_id FK, debit numeric(14,2), credit numeric(14,2), partner_id |
| `tax_rates` | Tax definitions | name, amount (%), tax_type (percent/fixed), account_id FK |
| `payment_terms` | Payment schedule | name, lines JSONB [{days, percent}] |
| `invoices` | Customer/vendor invoices | partner_id, type (out_invoice/in_invoice/out_refund/in_refund), state, amounts, origin_order_id |
| `invoice_lines` | Invoice detail | invoice_id FK, product_id, quantity, price_unit, tax_ids JSONB, account_id |
| `payments` | Payment records | partner_id, journal_id FK, amount, type (inbound/outbound), state, invoice_ids JSONB |

### Critical Invariants

| Invariant | Rule | Enforcement |
|-----------|------|-------------|
| Double-entry balance | `Σ(debit) = Σ(credit)` for every journal entry | DB trigger + API validation |
| No posting to closed periods | Entry date must fall in open fiscal period | API guard |
| Invoice → journal entry | Creating invoice auto-generates balanced journal entry | Domain logic |
| Payment reconciliation | Payment amount matched against open invoice balances | Domain logic |

### Domain Logic

Create `apps/api/src/modules/accounting/logic.ts`:
- `validateJournalEntry()` — assert debit/credit balance
- `postInvoice()` — generate journal entry from invoice
- `reconcilePayment()` — match payment to invoices
- `closePeriod()` — lock period, prevent future postings

### Posting Pipeline: Sales → Accounting

```
Sales Order confirmed
  → Invoice created (state: draft)
    → Invoice validated
      → Journal Entry auto-posted (debit: Receivable, credit: Revenue)
        → Payment received
          → Payment Entry posted (debit: Bank, credit: Receivable)
            → Invoice marked paid (reconciled)
```

This is the **economic event chain** that proves your system is internally consistent.

---

## Phase 3 — Deterministic Truth Governance (CI Layer)

**Goal**: Automate proof that the system is correct. No manual verification.

### 3A. Invariant Test Harness

Create `apps/api/src/__tests__/truth-invariants.test.ts`:

```
Financial:
 ✓ Every journal entry balances (debit = credit)
 ✓ Invoice totals match journal entry amounts
 ✓ Payment reconciliation leaves zero residual
 ✓ Order totals = Σ(line subtotals) + tax

Relational:
 ✓ No orphaned FK references
 ✓ All tenant-scoped records have valid tenant_id
 ✓ Soft-deleted records excluded from active queries

Seed:
 ✓ Seed IDs are deterministic across runs
 ✓ Seed financial data passes all invariant checks
```

### 3B. Seed Versioning

Add `packages/db/src/_seeds/version.ts`:
- Seed scenario version numbers
- Breaking change detection (schema changes that invalidate existing seeds)
- CI check: if schema changed, seeds must be updated in same PR

### 3C. Schema Snapshot

Add CI step: `drizzle-kit introspect` → snapshot JSON → compare with committed baseline
- Detects unintentional schema drift
- Forces explicit migration for every schema change

---

## Phase 4 — Domain Expansion (DB-First Modules)

**Prerequisite**: Phases 1-3 complete. The truth layer is strong. Now expand breadth.

Each new domain follows the repeatable recipe:
1. Create `packages/db/src/schema-domain/<domain>/tables.ts` (using shared columns, RLS policies)
2. Create barrel `packages/db/src/schema-domain/<domain>/index.ts`
3. Update `packages/db/src/schema-domain/index.ts`
4. Create `apps/api/src/modules/<domain>/index.ts` (module manifest)
5. Add seeds to `packages/db/src/_seeds/`
6. Run `meta:introspect` → API + UI auto-generated
7. Add domain logic where business rules require it
8. Add invariant tests
9. Run `pnpm ci:gate` → validate

### 4A. CRM (Customer Relationship Management)

| Table | Key Columns | Domain Logic |
|-------|-------------|--------------|
| `pipeline_stages` | name, sequence, fold | Ordered pipeline stages |
| `leads` | name, partner_id (nullable), email, phone, stage_id, probability | Lead scoring, stage progression |
| `opportunities` | name, partner_id, stage_id, expected_revenue, close_date | Won → creates Sales Order |
| `activities` | model_ref, record_id, activity_type_id, assigned_to, due_date, state | Polymorphic activity tracking |
| `activity_types` | name, category (email/call/meeting/todo), default_delay_days | Activity templates |

**State machine**: Lead → Qualified → Opportunity → Won/Lost
**Posting**: Won opportunity → Sales Order (accounting impact via Phase 2)

### 4B. Purchasing

| Table | Key Columns | Domain Logic |
|-------|-------------|--------------|
| `purchase_orders` | partner_id (vendor), state, amount_untaxed/tax/total | Mirror of sales order pattern |
| `purchase_order_lines` | order_id FK, product_id, quantity, price_unit, subtotal | Line-level computation |
| `vendor_pricelists` | vendor_id, product_id, price, min_quantity, valid_from, valid_to | Price lookup |

**State machine**: draft → sent → confirmed → received → done
**Posting**: Confirmed PO → Vendor Invoice → Journal Entry (debit: Expense/Inventory, credit: Payable)
**Integration**: Reuse `partners` table with `partner_type = 'vendor'`

### 4C. Inventory & Warehouse

| Table | Key Columns | Domain Logic |
|-------|-------------|--------------|
| `warehouses` | name, code, address, active | Physical locations |
| `stock_locations` | warehouse_id FK, name, location_type (internal/supplier/customer/transit/production) | Location types |
| `stock_moves` | product_id, source_location_id, dest_location_id, quantity, state, reference | Double-entry stock movement |
| `stock_quants` | product_id, location_id, quantity, reserved_quantity | Materialized stock levels |
| `lot_serial_numbers` | product_id, lot_number, expiry_date | Traceability |
| `inventory_adjustments` | warehouse_id, state, counted_lines JSONB | Physical counts |

**Critical invariant**: Stock moves are double-entry (source decremented = destination incremented)
**Posting**: Stock valuation changes → Journal Entry (debit: Inventory, credit: COGS)
**Integration**: Sales Order confirmation → reserve quants; shipping → execute stock moves

### 4D. Human Resources

| Table | Key Columns | Domain Logic |
|-------|-------------|--------------|
| `departments` | name, parent_id (self-ref), manager_id | Org hierarchy |
| `job_positions` | name, department_id, headcount | Position management |
| `employees` | user_id FK (optional), department_id, job_position_id, manager_id, hire_date | Employee records |
| `contracts` | employee_id FK, date_start, date_end, wage, state, struct JSONB | Salary structures |
| `attendance` | employee_id FK, check_in, check_out, worked_hours | Time tracking |
| `leave_types` | name, allocation_type (fixed/unlimited) | Leave categories |
| `leave_requests` | employee_id FK, leave_type_id, date_from, date_to, state, number_of_days | Leave management |

**Integration**: Payroll → Journal Entry (debit: Salary Expense, credit: Payable)
**Workflow**: Leave requests use existing workflow engine for manager approval

### 4E. Manufacturing

| Table | Key Columns | Domain Logic |
|-------|-------------|--------------|
| `bill_of_materials` | product_id FK, quantity, type (normal/kit/subcontracting) | Product recipes |
| `bom_lines` | bom_id FK, component_product_id FK, quantity | Component requirements |
| `work_centers` | name, capacity, cost_per_hour | Production capacity |
| `routings` | name, bom_id FK | Production process definitions |
| `routing_operations` | routing_id FK, work_center_id FK, duration, sequence | Operation steps |
| `manufacturing_orders` | product_id, bom_id, quantity, state, scheduled_start/end | Production orders |
| `work_orders` | manufacturing_order_id FK, operation_id FK, state, actual_start/end, duration | Execution tracking |

**Critical invariant**: BOM explosion → consume components (stock moves) + produce finished goods (stock moves)
**Posting**: Manufacturing costs → Journal Entry (debit: WIP/Finished Goods, credit: Raw Materials)

### 4F. Projects & Documents

| Table | Key Columns | Domain Logic |
|-------|-------------|--------------|
| `projects` | name, partner_id, manager_id, date_start/end, state | Project tracking |
| `project_stages` | name, sequence, fold | Kanban stages |
| `tasks` | project_id FK, stage_id FK, assigned_to, deadline, priority, estimated_hours | Task management |
| `timesheets` | task_id FK, employee_id FK, date, hours, description | Time billing |
| `document_folders` | name, parent_id (self-ref), model_ref, record_ref | Document organization |
| `documents` | folder_id FK, name, file_path, mime_type, size_bytes, uploaded_by, tags JSONB | File management |

**Integration**: Timesheets → billable hours → invoicing (accounting pipeline)

---

## Cross-Cutting Requirements (All Domains)

### Every New Table Must Include

```typescript
{
  ...timestampColumns,              // createdAt, updatedAt
  ...softDeleteColumns,             // deletedAt
  ...auditColumns,                  // createdBy, updatedBy
  tenantId: integer().notNull()     // FK → tenants
    .references(() => tenants.id, { onDelete: "restrict" }),
}
// + tenantIsolationPolicies() + serviceBypassPolicy() in table config
```

- UUID primary keys via `.defaultRandom()`
- Money fields: `numeric(14, 2)` precision
- Zod schemas via `createSelectSchema()` / `createInsertSchema()` / `createUpdateSchema()`
- Naming: `snake_case` in DB; `resolveTable` converts to `camelCase + "s"` (e.g., `purchase_order` → `purchaseOrders`)

### Domain Logic Placement

- Business rules in `apps/api/src/modules/<domain>/logic.ts` (testable, portable)
- Hard invariants as DB `CHECK` constraints (e.g., `CHECK (debit >= 0)`)
- State machines as domain functions, not DB triggers
- Financial posting as explicit domain operations, not implicit cascades

---

## 6-Week Execution Timeline

| Week | Focus | Deliverable |
|------|-------|-------------|
| **1** | Phase 0: Doc consolidation | 8 docs remain, 26 deleted; invariant library defined; seed baseline snapshot |
| **2–3** | Phase 1: Sales truth engine | State machine, financial invariants, invariant tests all passing |
| **4–5** | Phase 2: Accounting engine | Double-entry journal entries, invoice posting, payment reconciliation |
| **6** | Phase 3: CI truth verification | Schema snapshots, seed versioning, automated invariant checks in CI |
| **7+** | Phase 4: Domain expansion | CRM → Purchasing → Inventory → HR → Manufacturing → Projects (each ~1 week) |

---

## Decision Log

| Decision | Rationale |
|----------|-----------|
| Depth before breadth | Domain logic engines > more CRUD tables. ERP value is in the core, not the shell |
| Accounting engine before other modules | It becomes the mathematical spine — all domains post into it |
| Domain logic in API, not DB triggers | Testability, portability, explicit over implicit |
| Partner table unification | Vendors + customers share `partners` with `partner_type` flag, not separate tables |
| `pgSchema` namespaces per domain | Matches existing `core`/`security`/`meta` pattern for boundary clarity |
| `drizzle-kit push` for dev, `generate` for prod | Fast iteration in dev, explicit migrations for production |

---

## Mental Model

You are **not** building modules, pages, or CRUD features.

You are building:

> **A machine that guarantees business reality is internally consistent.**

Everything else is an interface to that machine.

If a task does not strengthen one of these, deprioritize it:

- Truth invariants
- Deterministic reproducibility
- Domain state machines
- Financial correctness
- Referential integrity
- Architectural clarity

These are the foundations of trustworthy systems, enterprise adoption, and long-term scalability.

---

## Reference: Key Files

| File | Purpose |
|------|---------|
| `packages/db/src/schema-domain/sales/tables.ts` | Reference pattern for domain table definitions |
| `packages/db/src/_shared/timestamps.ts` | Shared `timestampColumns`, `softDeleteColumns` |
| `packages/db/src/_shared/auditColumns.ts` | Shared `auditColumns` |
| `packages/db/src/_rls/tenant-policies.ts` | `tenantIsolationPolicies()`, `serviceBypassPolicy()` |
| `apps/api/src/modules/sales/index.ts` | Module manifest pattern |
| `apps/api/src/routes/api.ts` | Generic CRUD handler (`resolveTable` naming convention) |
| `apps/api/src/meta/compiler.ts` | Introspection compiler (schema → metadata) |
| `packages/db/src/_seeds/index.ts` | Deterministic seed pattern |
| `docs/adding-a-module.md` | Module onboarding checklist |
