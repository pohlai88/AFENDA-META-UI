# Postgres Schema CI Gate — Engine v2

**Business Truth Enforcement Framework**

A reusable, domain-pluggable CI gate that enforces six dimensions of business truth against Drizzle schema source code via static analysis.

## Dimensions

| Dimension   | Severity | Purpose                                                      |
| ----------- | -------- | ------------------------------------------------------------ |
| Structural  | error    | Named CHECK/FK/INDEX constraints exist per matrix            |
| Semantic    | error    | Formula CHECK expressions match expected business logic      |
| Workflow    | error    | Status enum columns cover all expected business states       |
| Tenant      | error    | tenant_id + FK + index + RLS policies + service bypass       |
| Audit       | warn     | timestampColumns + auditColumns + softDeleteColumns presence |
| Derived     | warn     | Financial columns have protective CHECK constraints          |

## Coverage

**Sales domain pack** (19 tables):

- 10 matrix tables: `sales_orders`, `sales_order_lines`, `pricelist_items`, `tax_rates`, `tax_rate_children`, `document_approvals`, `document_attachments`, `line_item_discounts`, `accounting_postings`, `rounding_policies`
- 9 enriched tables: `sale_order_line_taxes`, `sale_order_tax_summary`, `sale_order_status_history`, `fiscal_position_tax_maps`, `fiscal_position_account_maps`, `document_status_history`, `consignment_stock_reports`, `commission_entries`, `subscriptions`

## Severity Policy

- **error** — Matrix constraint violations fail CI (blocking)
- **warn** — Advisory findings are reported but do not fail CI

## Source of Truth

Code is authoritative. The sales constraints matrix (`.ideas/sales-constraints-matrix.md`) drives required coverage but does not override schema definitions.

## Usage

```bash
# Run this gate only
pnpm ci:gate:postgres

# Run via master gate runner
pnpm ci:gate --gate=postgres-schema

# Run all gates (this gate is auto-discovered)
pnpm ci:gate
```

## Adding New Domains

1. Create a new rule pack: `config/{domain}.rules.mjs`
2. Import the pack in `index.mjs` and add to `composeDomainRules()`
3. The gate will automatically include the new domain's rules

## Architecture

```
postgres-schema/
├── index.mjs              # Gate entry (auto-discovered by master runner)
├── engine/
│   ├── rule-types.mjs     # JSDoc-typed contracts
│   ├── rule-registry.mjs  # composeDomainRules() — merge, dedup, sort
│   ├── evaluator.mjs      # runRules() — try/catch per rule, timing
│   └── reporter.mjs       # Categorized output, exit code management
├── extractors/
│   ├── drizzle-schema.mjs # Regex extraction from .ts source
│   └── sql-normalizer.mjs # SQL normalization for semantic comparison
├── rules/
│   ├── structural.mjs     # constraint-exists, fk-exists, index-exists
│   ├── semantic.mjs       # Expression equivalence for formulas
│   ├── workflow.mjs       # Status enum coverage
│   ├── tenant.mjs         # Tenant isolation primitives
│   ├── audit.mjs          # Timestamp/audit/soft-delete columns
│   └── derived.mjs        # Computed field protection
└── config/
    └── sales.rules.mjs    # Sales domain pack (19 tables)
```
