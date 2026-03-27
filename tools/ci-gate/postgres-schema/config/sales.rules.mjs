/**
 * Engine v2 — Sales Domain Pack
 * ===============================
 * Maps all sales constraints matrix rules (SO-001 through MT-001)
 * plus enriched tables to concrete Engine v2 rule instances.
 *
 * Coverage: 10 original matrix tables + 9 enriched tables = 19 tables
 */

import { constraintExistsRule, fkExistsRule, indexExistsRule, namingConventionRule } from '../rules/structural.mjs';
import { constraintSemanticRule } from '../rules/semantic.mjs';
import { stateMachineRule } from '../rules/workflow.mjs';
import { allTenantRules } from '../rules/tenant.mjs';
import { allAuditRules } from '../rules/audit.mjs';
import { derivedFieldProtectionRule } from '../rules/derived.mjs';

// ─────────────────────────────────────────────────────────────────────
// Matrix tables (10 original)
// ─────────────────────────────────────────────────────────────────────

const MATRIX_TABLES = [
  'sales_orders',
  'sales_order_lines',
  'pricelist_items',
  'tax_rates',
  'tax_rate_children',
  'document_approvals',
  'document_attachments',
  'line_item_discounts',
  'accounting_postings',
  'rounding_policies',
];

// Enriched tables (structurally identical pattern, missing from original matrix)
const ENRICHED_TABLES = [
  'sale_order_line_taxes',
  'sale_order_tax_summary',
  'sale_order_status_history',
  'fiscal_position_tax_maps',
  'fiscal_position_account_maps',
  'document_status_history',
  'consignment_stock_reports',
  'commission_entries',
  'subscriptions',
];

const ALL_TABLES = [...MATRIX_TABLES, ...ENRICHED_TABLES];

// ─────────────────────────────────────────────────────────────────────
// SO — Sales Orders rules
// ─────────────────────────────────────────────────────────────────────

const salesOrderRules = [
  // SO-001: Order totals cannot be negative
  constraintExistsRule('SO-001a', 'sales_orders', 'chk_sales_orders_amount_untaxed_non_negative', 'Order amount_untaxed cannot be negative'),
  constraintExistsRule('SO-001b', 'sales_orders', 'chk_sales_orders_amount_cost_non_negative', 'Order amount_cost cannot be negative'),
  constraintExistsRule('SO-001c', 'sales_orders', 'chk_sales_orders_amount_profit_non_negative', 'Order amount_profit cannot be negative'),
  constraintExistsRule('SO-001d', 'sales_orders', 'chk_sales_orders_amount_tax_non_negative', 'Order amount_tax cannot be negative'),
  constraintExistsRule('SO-001e', 'sales_orders', 'chk_sales_orders_amount_total_non_negative', 'Order amount_total cannot be negative'),

  // SO-002: Profit must equal untaxed minus cost (structural + semantic)
  constraintExistsRule('SO-002', 'sales_orders', 'chk_sales_orders_amount_profit_formula', 'Profit formula constraint must exist'),
  constraintSemanticRule('SO-002-sem', 'sales_orders', 'chk_sales_orders_amount_profit_formula',
    '${table.amountProfit} = round(${table.amountUntaxed} - ${table.amountCost}, 2)',
    'Profit must equal round(untaxed - cost, 2)'),

  // SO-003: Margin percent must derive from profit and untaxed amount (structural + semantic)
  constraintExistsRule('SO-003', 'sales_orders', 'chk_sales_orders_margin_percent_formula', 'Margin formula constraint must exist'),
  constraintSemanticRule('SO-003-sem', 'sales_orders', 'chk_sales_orders_margin_percent_formula',
    '${table.marginPercent} = CASE WHEN ${table.amountUntaxed} = 0 THEN 0 ELSE round((${table.amountProfit} / ${table.amountUntaxed}) * 100, 4) END',
    'Margin percent must derive from profit / untaxed * 100'),

  // SO-004: Validity date cannot be earlier than quotation date
  constraintExistsRule('SO-004', 'sales_orders', 'chk_sales_orders_validity_date_after_quotation', 'Validity date must be after quotation date'),

  // SO-005: Exchange rates must be positive, source required
  constraintExistsRule('SO-005a', 'sales_orders', 'chk_sales_orders_company_currency_rate_positive', 'Company currency rate must be positive'),
  constraintExistsRule('SO-005b', 'sales_orders', 'chk_sales_orders_exchange_rate_used_positive', 'Exchange rate must be positive'),
  constraintExistsRule('SO-005c', 'sales_orders', 'chk_sales_orders_exchange_rate_source_required', 'Exchange rate source required when rate present'),

  // SO-006: Credit approval consistency
  constraintExistsRule('SO-006a', 'sales_orders', 'chk_sales_orders_credit_limit_at_check_non_negative', 'Credit limit at check must be non-negative'),
  constraintExistsRule('SO-006b', 'sales_orders', 'chk_sales_orders_credit_check_consistency', 'Credit check fields must be consistent'),
  fkExistsRule('SO-006c', 'sales_orders', 'fk_sales_orders_credit_check_by', 'Credit check by must reference valid user'),

  // SO-007: Sequence number uniqueness
  indexExistsRule('SO-007', 'sales_orders', 'uq_sales_orders_sequence_number', 'Sequence number must be unique for active orders'),

  // SO-008: Core order references
  fkExistsRule('SO-008a', 'sales_orders', 'fk_sales_orders_partner', 'Order must reference valid partner'),
  fkExistsRule('SO-008b', 'sales_orders', 'fk_sales_orders_currency', 'Order must reference valid currency'),
  fkExistsRule('SO-008c', 'sales_orders', 'fk_sales_orders_pricelist_snapshot', 'Order must reference valid pricelist snapshot'),
  fkExistsRule('SO-008d', 'sales_orders', 'fk_sales_orders_invoice_address', 'Order must reference valid invoice address'),
  fkExistsRule('SO-008e', 'sales_orders', 'fk_sales_orders_delivery_address', 'Order must reference valid delivery address'),

  // Workflow: order status enum coverage
  stateMachineRule('SO-WF', 'sales_orders', 'status', ['draft', 'sent', 'sale', 'done', 'cancel'], 'orderStatusEnum', 'Order status must cover all business states'),
];

// ─────────────────────────────────────────────────────────────────────
// SOL — Sales Order Lines rules
// ─────────────────────────────────────────────────────────────────────

const salesOrderLineRules = [
  // SOL-001: Quantity must be positive
  constraintExistsRule('SOL-001', 'sales_order_lines', 'chk_sales_order_lines_quantity_positive', 'Line quantity must be positive'),

  // SOL-002: Price, cost, totals cannot be negative
  constraintExistsRule('SOL-002a', 'sales_order_lines', 'chk_sales_order_lines_price_unit_non_negative', 'Line price_unit cannot be negative'),
  constraintExistsRule('SOL-002b', 'sales_order_lines', 'chk_sales_order_lines_cost_unit_non_negative', 'Line cost_unit cannot be negative'),
  constraintExistsRule('SOL-002c', 'sales_order_lines', 'chk_sales_order_lines_subtotal_non_negative', 'Line subtotal cannot be negative'),
  constraintExistsRule('SOL-002d', 'sales_order_lines', 'chk_sales_order_lines_price_subtotal_non_negative', 'Line price_subtotal cannot be negative'),
  constraintExistsRule('SOL-002e', 'sales_order_lines', 'chk_sales_order_lines_price_tax_non_negative', 'Line price_tax cannot be negative'),
  constraintExistsRule('SOL-002f', 'sales_order_lines', 'chk_sales_order_lines_price_total_non_negative', 'Line price_total cannot be negative'),
  constraintExistsRule('SOL-002g', 'sales_order_lines', 'chk_sales_order_lines_cost_subtotal_non_negative', 'Line cost_subtotal cannot be negative'),
  constraintExistsRule('SOL-002h', 'sales_order_lines', 'chk_sales_order_lines_profit_amount_non_negative', 'Line profit_amount cannot be negative'),

  // SOL-003: Discount range [0, 100]
  constraintExistsRule('SOL-003', 'sales_order_lines', 'chk_sales_order_lines_discount_range', 'Line discount must be [0, 100]'),

  // SOL-004: Price override requires reason and approval
  constraintExistsRule('SOL-004a', 'sales_order_lines', 'chk_sales_order_lines_price_override_reason_required', 'Price override requires reason'),
  constraintExistsRule('SOL-004b', 'sales_order_lines', 'chk_sales_order_lines_price_override_approval_required', 'Price override requires approval'),

  // SOL-005: Formula constraints (structural + semantic)
  constraintExistsRule('SOL-005a', 'sales_order_lines', 'chk_sales_order_lines_cost_subtotal_formula', 'Cost subtotal formula constraint must exist'),
  constraintExistsRule('SOL-005b', 'sales_order_lines', 'chk_sales_order_lines_profit_formula', 'Profit formula constraint must exist'),
  constraintExistsRule('SOL-005c', 'sales_order_lines', 'chk_sales_order_lines_margin_percent_formula', 'Margin formula constraint must exist'),

  constraintSemanticRule('SOL-005a-sem', 'sales_order_lines', 'chk_sales_order_lines_cost_subtotal_formula',
    '${table.costSubtotal} = round(${table.quantity} * ${table.costUnit}, 2)',
    'Cost subtotal must equal round(quantity * costUnit, 2)'),
  constraintSemanticRule('SOL-005b-sem', 'sales_order_lines', 'chk_sales_order_lines_profit_formula',
    '${table.profitAmount} = round(${table.priceSubtotal} - ${table.costSubtotal}, 2)',
    'Profit must equal round(priceSubtotal - costSubtotal, 2)'),
  constraintSemanticRule('SOL-005c-sem', 'sales_order_lines', 'chk_sales_order_lines_margin_percent_formula',
    '${table.marginPercent} = CASE WHEN ${table.priceSubtotal} = 0 THEN 0 ELSE round((${table.profitAmount} / ${table.priceSubtotal}) * 100, 4) END',
    'Margin percent must derive from profitAmount / priceSubtotal * 100'),

  // SOL-006: Delivery/invoicing quantities cannot be negative
  constraintExistsRule('SOL-006a', 'sales_order_lines', 'chk_sales_order_lines_qty_delivered_non_negative', 'Qty delivered cannot be negative'),
  constraintExistsRule('SOL-006b', 'sales_order_lines', 'chk_sales_order_lines_qty_to_invoice_non_negative', 'Qty to invoice cannot be negative'),
  constraintExistsRule('SOL-006c', 'sales_order_lines', 'chk_sales_order_lines_qty_invoiced_non_negative', 'Qty invoiced cannot be negative'),

  // SOL-007: References
  fkExistsRule('SOL-007a', 'sales_order_lines', 'fk_sales_order_lines_order', 'Line must reference valid order'),
  fkExistsRule('SOL-007b', 'sales_order_lines', 'fk_sales_order_lines_product', 'Line must reference valid product'),
  fkExistsRule('SOL-007c', 'sales_order_lines', 'fk_sales_order_lines_product_uom', 'Line must reference valid UOM'),
  fkExistsRule('SOL-007d', 'sales_order_lines', 'fk_sales_order_lines_discount_authority_user', 'Discount authority user FK'),
  fkExistsRule('SOL-007e', 'sales_order_lines', 'fk_sales_order_lines_price_approved_by', 'Price approved by FK'),
];

// ─────────────────────────────────────────────────────────────────────
// PLI — Pricelist Items rules
// ─────────────────────────────────────────────────────────────────────

const pricelistItemRules = [
  // PLI-001
  constraintExistsRule('PLI-001', 'pricelist_items', 'chk_sales_pricelist_items_min_quantity_positive', 'Min quantity must be positive'),

  // PLI-002
  constraintExistsRule('PLI-002a', 'pricelist_items', 'chk_sales_pricelist_items_percent_price_range', 'Percent price must be in range'),
  constraintExistsRule('PLI-002b', 'pricelist_items', 'chk_sales_pricelist_items_price_discount_range', 'Price discount must be in range'),
  constraintExistsRule('PLI-002c', 'pricelist_items', 'chk_sales_pricelist_items_margins_non_negative', 'Margins must be non-negative'),

  // PLI-003
  constraintExistsRule('PLI-003a', 'pricelist_items', 'chk_sales_pricelist_items_date_range', 'Date range must be ordered'),
  constraintExistsRule('PLI-003b', 'pricelist_items', 'chk_sales_pricelist_items_effective_order', 'Effective window must be ordered'),

  // PLI-004
  fkExistsRule('PLI-004a', 'pricelist_items', 'fk_sales_pricelist_items_superseded_by', 'Supersession self-FK must exist'),
  indexExistsRule('PLI-004b', 'pricelist_items', 'idx_sales_pricelist_items_superseded_by', 'Supersession index must exist'),

  // PLI-005
  fkExistsRule('PLI-005a', 'pricelist_items', 'fk_sales_pricelist_items_pricelist', 'Pricelist FK must exist'),
  fkExistsRule('PLI-005b', 'pricelist_items', 'fk_sales_pricelist_items_product', 'Product FK must exist'),
  fkExistsRule('PLI-005c', 'pricelist_items', 'fk_sales_pricelist_items_category', 'Category FK must exist'),
  fkExistsRule('PLI-005d', 'pricelist_items', 'fk_sales_pricelist_items_base_pricelist', 'Base pricelist FK must exist'),
];

// ─────────────────────────────────────────────────────────────────────
// TAX — Tax Rates rules
// ─────────────────────────────────────────────────────────────────────

const taxRateRules = [
  // TAX-001
  constraintExistsRule('TAX-001a', 'tax_rates', 'chk_sales_tax_rates_amount_non_negative', 'Tax amount cannot be negative'),
  constraintExistsRule('TAX-001b', 'tax_rates', 'chk_sales_tax_rates_percent_range', 'Tax percent must be in range'),

  // TAX-002
  constraintExistsRule('TAX-002', 'tax_rates', 'chk_sales_tax_rates_effective_order', 'Tax effective window must be ordered'),

  // TAX-003
  fkExistsRule('TAX-003a', 'tax_rates', 'fk_sales_tax_rates_replaced_by', 'Tax replacement self-FK must exist'),
  indexExistsRule('TAX-003b', 'tax_rates', 'idx_sales_tax_rates_replaced_by', 'Tax replacement index must exist'),
];

// ─────────────────────────────────────────────────────────────────────
// TAX-004/005 — Tax Rate Children rules
// ─────────────────────────────────────────────────────────────────────

const taxRateChildrenRules = [
  // TAX-004
  constraintExistsRule('TAX-004a', 'tax_rate_children', 'chk_sales_tax_rate_children_distinct', 'Parent and child taxes must differ'),
  constraintExistsRule('TAX-004b', 'tax_rate_children', 'uq_sales_tax_rate_children_unique', 'Parent-child pair must be unique'),

  // TAX-005
  fkExistsRule('TAX-005a', 'tax_rate_children', 'fk_sales_tax_rate_children_parent', 'Parent tax FK must exist'),
  fkExistsRule('TAX-005b', 'tax_rate_children', 'fk_sales_tax_rate_children_child', 'Child tax FK must exist'),
];

// ─────────────────────────────────────────────────────────────────────
// APV — Document Approvals rules
// ─────────────────────────────────────────────────────────────────────

const documentApprovalRules = [
  // APV-001
  constraintExistsRule('APV-001', 'document_approvals', 'chk_sales_document_approvals_level_positive', 'Approval level must be positive'),

  // APV-002
  constraintExistsRule('APV-002', 'document_approvals', 'chk_sales_document_approvals_status', 'Approval status must be in supported set'),

  // APV-003
  constraintExistsRule('APV-003a', 'document_approvals', 'chk_sales_document_approvals_approved_consistency', 'Approved state timestamp consistency'),
  constraintExistsRule('APV-003b', 'document_approvals', 'chk_sales_document_approvals_rejected_consistency', 'Rejected state timestamp consistency'),

  // APV-004
  constraintExistsRule('APV-004', 'document_approvals', 'chk_sales_document_approvals_amount_non_negative', 'Approval amount cannot be negative'),

  // APV-005
  fkExistsRule('APV-005', 'document_approvals', 'fk_sales_document_approvals_approver', 'Approver must be valid user'),
];

// ─────────────────────────────────────────────────────────────────────
// ATT — Document Attachments rules
// ─────────────────────────────────────────────────────────────────────

const documentAttachmentRules = [
  // ATT-001
  constraintExistsRule('ATT-001', 'document_attachments', 'chk_sales_document_attachments_size_non_negative', 'Attachment size cannot be negative'),

  // ATT-002
  indexExistsRule('ATT-002', 'document_attachments', 'uq_sales_document_attachments_storage_path', 'Storage path must be unique for active attachments'),
];

// ─────────────────────────────────────────────────────────────────────
// DISC — Line Item Discounts rules
// ─────────────────────────────────────────────────────────────────────

const lineItemDiscountRules = [
  // DISC-001
  constraintExistsRule('DISC-001', 'line_item_discounts', 'chk_sales_line_item_discounts_requires_value', 'Discount must include percent or amount'),

  // DISC-002
  constraintExistsRule('DISC-002', 'line_item_discounts', 'chk_sales_line_item_discounts_percent_range', 'Discount percent must be [0, 100]'),

  // DISC-003
  constraintExistsRule('DISC-003', 'line_item_discounts', 'chk_sales_line_item_discounts_amount_non_negative', 'Discount amount cannot be negative'),

  // DISC-004
  constraintExistsRule('DISC-004a', 'line_item_discounts', 'chk_sales_line_item_discounts_manual_auth', 'Manual discounts require authorizer'),
  fkExistsRule('DISC-004b', 'line_item_discounts', 'fk_sales_line_item_discounts_authorized_by', 'Discount authorized by FK must exist'),

  // DISC-005
  constraintExistsRule('DISC-005', 'line_item_discounts', 'chk_sales_line_item_discounts_sequence_positive', 'Discount sequence must be positive'),
];

// ─────────────────────────────────────────────────────────────────────
// ACC — Accounting Postings rules
// ─────────────────────────────────────────────────────────────────────

const accountingPostingRules = [
  // ACC-001
  constraintExistsRule('ACC-001', 'accounting_postings', 'chk_sales_accounting_postings_amount_non_negative', 'Posting amount cannot be negative'),

  // ACC-002
  constraintExistsRule('ACC-002', 'accounting_postings', 'chk_sales_accounting_postings_status', 'Posting status must be in supported set'),

  // ACC-003
  constraintExistsRule('ACC-003a', 'accounting_postings', 'chk_sales_accounting_postings_posted_consistency', 'Posted state require actor/timestamp'),
  fkExistsRule('ACC-003b', 'accounting_postings', 'fk_sales_accounting_postings_posted_by', 'Posted by FK must exist'),

  // ACC-004
  constraintExistsRule('ACC-004a', 'accounting_postings', 'chk_sales_accounting_postings_reversed_consistency', 'Reversed state requires actor/timestamp'),
  fkExistsRule('ACC-004b', 'accounting_postings', 'fk_sales_accounting_postings_reversed_by', 'Reversed by FK must exist'),

  // ACC-005
  fkExistsRule('ACC-005', 'accounting_postings', 'fk_sales_accounting_postings_reversal_entry', 'Reversal entry self-FK must exist'),
];

// ─────────────────────────────────────────────────────────────────────
// RND — Rounding Policies rules
// ─────────────────────────────────────────────────────────────────────

const roundingPolicyRules = [
  // RND-001
  constraintExistsRule('RND-001', 'rounding_policies', 'chk_sales_rounding_policies_method', 'Rounding method must be in supported set'),

  // RND-002
  constraintExistsRule('RND-002', 'rounding_policies', 'chk_sales_rounding_policies_precision_range', 'Rounding precision must be [0, 6]'),

  // RND-003
  constraintExistsRule('RND-003', 'rounding_policies', 'chk_sales_rounding_policies_unit_positive', 'Rounding unit must be positive'),

  // RND-004
  constraintExistsRule('RND-004', 'rounding_policies', 'chk_sales_rounding_policies_effective_order', 'Rounding effective window must be ordered'),

  // RND-005
  indexExistsRule('RND-005', 'rounding_policies', 'uq_sales_rounding_policies_effective', 'Active effective policy tuple must be unique'),
];

// ─────────────────────────────────────────────────────────────────────
// Cross-cutting rules generated for ALL 19 tables
// ─────────────────────────────────────────────────────────────────────

// Tables where soft-delete is intentionally omitted:
//  - Immutable audit/history logs (postings, approvals, status history)
//  - Junction/detail tables (tax line items, tax summaries, mappings, children)
//  - Discount detail records tied to parent lifecycle
const SOFT_DELETE_EXEMPT = new Set([
  'accounting_postings',
  'document_approvals',
  'document_status_history',
  'fiscal_position_account_maps',
  'fiscal_position_tax_maps',
  'line_item_discounts',
  'sale_order_line_taxes',
  'sale_order_status_history',
  'sale_order_tax_summary',
  'tax_rate_children',
]);

const tenantRules = ALL_TABLES.flatMap((table) => allTenantRules(table));
const auditRules = ALL_TABLES.flatMap((table) =>
  allAuditRules(table, { skipSoftDelete: SOFT_DELETE_EXEMPT.has(table) })
);
const derivedRules = ALL_TABLES.map((table) => derivedFieldProtectionRule(table));
const namingRules = ALL_TABLES.map((table) => namingConventionRule(table));

// ─────────────────────────────────────────────────────────────────────
// Assembled domain pack
// ─────────────────────────────────────────────────────────────────────

export const salesRules = [
  // Matrix constraint rules
  ...salesOrderRules,
  ...salesOrderLineRules,
  ...pricelistItemRules,
  ...taxRateRules,
  ...taxRateChildrenRules,
  ...documentApprovalRules,
  ...documentAttachmentRules,
  ...lineItemDiscountRules,
  ...accountingPostingRules,
  ...roundingPolicyRules,

  // Cross-cutting rules for all 19 tables
  ...tenantRules,
  ...auditRules,
  ...derivedRules,
  ...namingRules,
];
