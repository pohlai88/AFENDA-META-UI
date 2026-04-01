import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  foreignKey,
  index,
  integer,
  jsonb,
  numeric,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { createInsertSchema,createSelectSchema,createUpdateSchema } from "drizzle-orm/zod";
import { z } from "zod/v4";

import {
auditColumns,
nameColumn,
softDeleteColumns,
timestampColumns,
} from "../../column-kit/index.js";
import { serviceBypassPolicy, tenantIsolationPolicies } from "../../rls-policies/index.js";
import { dateOnlyWire,instantWire } from "../../wire/temporal.js";
import { tenants } from "../core/tenants.js";
import { currencies,unitsOfMeasure } from "../reference/index.js";
import { users } from "../security/index.js";
import {
  DeliveryStatusSchema,
  DiscountSourceSchema,
  DisplayLineTypeSchema,
  InvoiceStatusSchema,
  OrderStatusSchema,
  PriceSourceSchema,
  TaxAmountTypeSchema,
  TaxComputationMethodSchema,
  deliveryStatusEnum,
  discountSourceEnum,
  displayLineTypeEnum,
  invoiceStatusEnum,
  orderStatusEnum,
  priceSourceEnum,
} from "./_enums.js";
import { salesSchema } from "./_schema.js";
import {
FiscalPositionIdSchema,
PartnerAddressIdSchema,
PartnerIdSchema,
PaymentTermIdSchema,
PricingDecisionIdSchema,
PricelistIdSchema,
ProductIdSchema,
SaleOrderLineTaxIdSchema,
SaleOrderOptionLineIdSchema,
SaleOrderStatusHistoryIdSchema,
SaleOrderTaxSummaryIdSchema,
SalesOrderIdSchema,
SalesOrderLineIdSchema,
TaxGroupIdSchema,
TaxRateIdSchema,
discountStringSchema,
percentageStringSchema,
positiveMoneyStringSchema,
quantityStringSchema
} from "./_zodShared.js";

import { partnerAddresses,partners } from "./partner.js";
import { pricelists } from "./pricing.js";
import { productTemplates,products } from "./product.js";
import { taxGroups, taxRates, type SaleOrderLineTaxComputationSnapshot } from "./tax.js";


export const salesOrders = salesSchema.table(
  "sales_orders",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: integer("tenant_id").notNull(),
    ...nameColumn,
    partnerId: uuid("partner_id").notNull(),
    status: orderStatusEnum("status").notNull().default("draft"),
    sequenceNumber: text("sequence_number"),
    quotationDate: timestamp("quotation_date", { withTimezone: true }),
    validityDate: timestamp("validity_date", { withTimezone: true }),
    confirmationDate: timestamp("confirmation_date", { withTimezone: true }),
    confirmedBy: integer("confirmed_by"),
    currencyId: integer("currency_id"),
    pricelistId: uuid("pricelist_id"),
    paymentTermId: uuid("payment_term_id"),
    fiscalPositionId: uuid("fiscal_position_id"),
    invoiceAddressId: uuid("invoice_address_id"),
    deliveryAddressId: uuid("delivery_address_id"),
    /** Immutable copy of partner / invoice address at confirmation (Truth Engine). */
    invoiceAddressSnapshot: jsonb("invoice_address_snapshot").$type<Record<string, unknown>>(),
    /** Immutable copy of delivery address at confirmation. */
    deliveryAddressSnapshot: jsonb("delivery_address_snapshot").$type<Record<string, unknown>>(),
    warehouseId: text("warehouse_id"),
    companyCurrencyRate: numeric("company_currency_rate", { precision: 14, scale: 6 }),
    exchangeRateUsed: numeric("exchange_rate_used", { precision: 14, scale: 6 }),
    exchangeRateSource: text("exchange_rate_source"),
    pricelistSnapshotId: uuid("pricelist_snapshot_id"),
    /**
     * Active pricing decision head for this order (UI / reads). Set by pricing runner and confirmation pipeline.
     * FK enforced in SQL only (avoids circular import with `pricingDecisions`).
     */
    activePricingDecisionId: uuid("active_pricing_decision_id"),
    creditCheckPassed: boolean("credit_check_passed").notNull().default(false),
    creditCheckAt: timestamp("credit_check_at", { withTimezone: true }),
    creditCheckBy: integer("credit_check_by"),
    creditLimitAtCheck: numeric("credit_limit_at_check", { precision: 14, scale: 2 }),
    invoiceStatus: invoiceStatusEnum("invoice_status").notNull().default("no"),
    deliveryStatus: deliveryStatusEnum("delivery_status").notNull().default("no"),
    signedBy: text("signed_by"),
    signedOn: timestamp("signed_on", { withTimezone: true }),
    clientOrderRef: text("client_order_ref"),
    origin: text("origin"),
    teamId: text("team_id"),
    userId: integer("user_id"),
    cancelReason: text("cancel_reason"),
    orderDate: timestamp("order_date", { withTimezone: true }).defaultNow().notNull(),
    deliveryDate: timestamp("delivery_date", { withTimezone: true }),
    assignedToId: text("assigned_to_id"),
    notes: text("notes"),
    amountUntaxed: numeric("amount_untaxed", { precision: 14, scale: 2 }).notNull().default("0"),
    amountCost: numeric("amount_cost", { precision: 14, scale: 2 }).notNull().default("0"),
    amountProfit: numeric("amount_profit", { precision: 14, scale: 2 }).notNull().default("0"),
    marginPercent: numeric("margin_percent", { precision: 9, scale: 4 }).notNull().default("0"),
    amountTax: numeric("amount_tax", { precision: 14, scale: 2 }).notNull().default("0"),
    amountTotal: numeric("amount_total", { precision: 14, scale: 2 }).notNull().default("0"),
    ...timestampColumns,
    ...softDeleteColumns,
    ...auditColumns(() => users.userId),
  },
  (table) => [
    index("idx_sales_orders_tenant").on(table.tenantId),
    index("idx_sales_orders_partner").on(table.tenantId, table.partnerId),
    index("idx_sales_orders_status").on(table.tenantId, table.status, table.orderDate),
    index("idx_sales_orders_credit_check").on(
      table.tenantId,
      table.creditCheckPassed,
      table.orderDate
    ),
    index("idx_sales_orders_currency").on(table.tenantId, table.currencyId),
    index("idx_sales_orders_pricelist").on(table.tenantId, table.pricelistId),
    index("idx_sales_orders_pricelist_snapshot").on(table.tenantId, table.pricelistSnapshotId),
    index("idx_sales_orders_active_pricing_decision").on(table.tenantId, table.activePricingDecisionId),
    index("idx_sales_orders_credit_check_by").on(table.tenantId, table.creditCheckBy),
    index("idx_sales_orders_payment_term").on(table.tenantId, table.paymentTermId),
    index("idx_sales_orders_fiscal_position").on(table.tenantId, table.fiscalPositionId),
    index("idx_sales_orders_invoice_status").on(
      table.tenantId,
      table.invoiceStatus,
      table.orderDate
    ),
    index("idx_sales_orders_delivery_status").on(
      table.tenantId,
      table.deliveryStatus,
      table.orderDate
    ),
    uniqueIndex("uq_sales_orders_sequence_number")
      .on(table.tenantId, table.sequenceNumber)
      .where(sql`${table.deletedAt} IS NULL AND ${table.sequenceNumber} IS NOT NULL`),
    check("chk_sales_orders_amount_untaxed_non_negative", sql`${table.amountUntaxed} >= 0`),
    check("chk_sales_orders_amount_cost_non_negative", sql`${table.amountCost} >= 0`),
    check("chk_sales_orders_amount_profit_non_negative", sql`${table.amountProfit} >= 0`),
    check("chk_sales_orders_amount_tax_non_negative", sql`${table.amountTax} >= 0`),
    check("chk_sales_orders_amount_total_non_negative", sql`${table.amountTotal} >= 0`),
    check(
      "chk_sales_orders_amount_profit_formula",
      sql`${table.amountProfit} = round(${table.amountUntaxed} - ${table.amountCost}, 2)`
    ),
    check(
      "chk_sales_orders_margin_percent_formula",
      sql`${table.marginPercent} = CASE
        WHEN ${table.amountUntaxed} = 0 THEN 0
        ELSE round((${table.amountProfit} / ${table.amountUntaxed}) * 100, 4)
      END`
    ),
    check(
      "chk_sales_orders_validity_date_after_quotation",
      sql`${table.validityDate} IS NULL OR ${table.quotationDate} IS NULL OR ${table.validityDate} >= ${table.quotationDate}`
    ),
    check(
      "chk_sales_orders_company_currency_rate_positive",
      sql`${table.companyCurrencyRate} IS NULL OR ${table.companyCurrencyRate} > 0`
    ),
    check(
      "chk_sales_orders_exchange_rate_used_positive",
      sql`${table.exchangeRateUsed} IS NULL OR ${table.exchangeRateUsed} > 0`
    ),
    check(
      "chk_sales_orders_exchange_rate_source_required",
      sql`${table.exchangeRateUsed} IS NULL OR ${table.exchangeRateSource} IS NOT NULL`
    ),
    check(
      "chk_sales_orders_credit_limit_at_check_non_negative",
      sql`${table.creditLimitAtCheck} IS NULL OR ${table.creditLimitAtCheck} >= 0`
    ),
    check(
      "chk_sales_orders_credit_check_consistency",
      sql`NOT ${table.creditCheckPassed} OR (${table.creditCheckAt} IS NOT NULL AND ${table.creditCheckBy} IS NOT NULL)`
    ),
    check(
      "chk_sales_orders_signature_consistency",
      sql`(${table.signedBy} IS NULL AND ${table.signedOn} IS NULL) OR (${table.signedBy} IS NOT NULL AND ${table.signedOn} IS NOT NULL)`
    ),
    check(
      "chk_sales_orders_invoiced_requires_sales_state",
      sql`${table.invoiceStatus} <> 'invoiced' OR ${table.status} IN ('sale', 'done')`
    ),
    check(
      "chk_sales_orders_delivery_progress_requires_sales_state",
      sql`${table.deliveryStatus} = 'no' OR ${table.status} IN ('sale', 'done')`
    ),
    foreignKey({
      columns: [table.tenantId],
      foreignColumns: [tenants.tenantId],
      name: "fk_sales_orders_tenant",
    })
      .onDelete("restrict")
      .onUpdate("cascade"),
    foreignKey({
      columns: [table.partnerId],
      foreignColumns: [partners.id],
      name: "fk_sales_orders_partner",
    })
      .onDelete("restrict")
      .onUpdate("cascade"),
    foreignKey({
      columns: [table.confirmedBy],
      foreignColumns: [users.userId],
      name: "fk_sales_orders_confirmed_by",
    })
      .onDelete("set null")
      .onUpdate("cascade"),
    foreignKey({
      columns: [table.userId],
      foreignColumns: [users.userId],
      name: "fk_sales_orders_user",
    })
      .onDelete("set null")
      .onUpdate("cascade"),
    foreignKey({
      columns: [table.currencyId],
      foreignColumns: [currencies.currencyId],
      name: "fk_sales_orders_currency",
    })
      .onDelete("set null")
      .onUpdate("cascade"),
    foreignKey({
      columns: [table.pricelistSnapshotId],
      foreignColumns: [pricelists.id],
      name: "fk_sales_orders_pricelist_snapshot",
    })
      .onDelete("set null")
      .onUpdate("cascade"),
    foreignKey({
      columns: [table.creditCheckBy],
      foreignColumns: [users.userId],
      name: "fk_sales_orders_credit_check_by",
    })
      .onDelete("set null")
      .onUpdate("cascade"),
    foreignKey({
      columns: [table.invoiceAddressId],
      foreignColumns: [partnerAddresses.id],
      name: "fk_sales_orders_invoice_address",
    })
      .onDelete("set null")
      .onUpdate("cascade"),
    foreignKey({
      columns: [table.deliveryAddressId],
      foreignColumns: [partnerAddresses.id],
      name: "fk_sales_orders_delivery_address",
    })
      .onDelete("set null")
      .onUpdate("cascade"),
    ...tenantIsolationPolicies("sales_orders"),
    serviceBypassPolicy("sales_orders"),
  ]
);

export const salesOrderLines = salesSchema.table(
  "sales_order_lines",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: integer("tenant_id").notNull(),
    orderId: uuid("order_id").notNull(),
    productId: uuid("product_id").notNull(),
    productTemplateId: uuid("product_template_id"),
    taxId: uuid("tax_id"),
    productUomId: integer("product_uom_id"),
    description: text("description"),
    quantity: numeric("quantity", { precision: 12, scale: 4 }).notNull().default("1"),
    priceUnit: numeric("price_unit", { precision: 12, scale: 2 }).notNull(),
    discount: numeric("discount", { precision: 5, scale: 2 }).notNull().default("0"),
    priceListedAt: numeric("price_listed_at", { precision: 14, scale: 2 }),
    priceOverrideReason: text("price_override_reason"),
    priceApprovedBy: integer("price_approved_by"),
    costUnit: numeric("cost_unit", { precision: 12, scale: 2 }).notNull().default("0"),
    subtotal: numeric("subtotal", { precision: 14, scale: 2 }).notNull(),
    priceSubtotal: numeric("price_subtotal", { precision: 14, scale: 2 }).notNull().default("0"),
    priceTax: numeric("price_tax", { precision: 14, scale: 2 }).notNull().default("0"),
    priceTotal: numeric("price_total", { precision: 14, scale: 2 }).notNull().default("0"),
    costSubtotal: numeric("cost_subtotal", { precision: 14, scale: 2 }).notNull().default("0"),
    profitAmount: numeric("profit_amount", { precision: 14, scale: 2 }).notNull().default("0"),
    marginPercent: numeric("margin_percent", { precision: 9, scale: 4 }).notNull().default("0"),
    qtyDelivered: numeric("qty_delivered", { precision: 12, scale: 4 }).notNull().default("0"),
    qtyToInvoice: numeric("qty_to_invoice", { precision: 12, scale: 4 }).notNull().default("0"),
    qtyInvoiced: numeric("qty_invoiced", { precision: 12, scale: 4 }).notNull().default("0"),
    invoiceStatus: invoiceStatusEnum("invoice_status").notNull().default("no"),
    customerLead: integer("customer_lead").notNull().default(0),
    displayType: displayLineTypeEnum("display_type").notNull().default("product"),
    priceSource: priceSourceEnum("price_source").notNull().default("manual"),
    discountSource: discountSourceEnum("discount_source").notNull().default("manual"),
    appliedPricelistId: uuid("applied_pricelist_id"),
    appliedFiscalPositionId: uuid("applied_fiscal_position_id"),
    taxRuleSnapshot: text("tax_rule_snapshot"),
    discountAuthorityUserId: integer("discount_authority_user_id"),
    discountApprovedAt: timestamp("discount_approved_at", { withTimezone: true }),
    sequence: integer("sequence").notNull().default(10),
    ...timestampColumns,
    ...softDeleteColumns,
    ...auditColumns(() => users.userId),
  },
  (table) => [
    index("idx_sales_order_lines_tenant").on(table.tenantId),
    index("idx_sales_order_lines_order").on(table.tenantId, table.orderId, table.sequence),
    index("idx_sales_order_lines_product").on(table.tenantId, table.productId),
    index("idx_sales_order_lines_uom").on(table.tenantId, table.productUomId),
    index("idx_sales_order_lines_invoice_status").on(table.tenantId, table.invoiceStatus),
    index("idx_sales_order_lines_price_source").on(table.tenantId, table.priceSource),
    index("idx_sales_order_lines_tax").on(table.tenantId, table.taxId),
    index("idx_sales_order_lines_price_approved_by").on(table.tenantId, table.priceApprovedBy),
    check("chk_sales_order_lines_quantity_positive", sql`${table.quantity} > 0`),
    check("chk_sales_order_lines_price_unit_non_negative", sql`${table.priceUnit} >= 0`),
    check(
      "chk_sales_order_lines_price_listed_at_non_negative",
      sql`${table.priceListedAt} IS NULL OR ${table.priceListedAt} >= 0`
    ),
    check(
      "chk_sales_order_lines_discount_range",
      sql`${table.discount} >= 0 AND ${table.discount} <= 100`
    ),
    check(
      "chk_sales_order_lines_price_override_reason_required",
      sql`${table.priceListedAt} IS NULL OR ${table.priceUnit} >= ${table.priceListedAt} OR ${table.priceOverrideReason} IS NOT NULL`
    ),
    check(
      "chk_sales_order_lines_price_override_approval_required",
      sql`${table.priceListedAt} IS NULL OR ${table.priceUnit} >= ${table.priceListedAt} OR ${table.priceApprovedBy} IS NOT NULL`
    ),
    check("chk_sales_order_lines_cost_unit_non_negative", sql`${table.costUnit} >= 0`),
    check("chk_sales_order_lines_subtotal_non_negative", sql`${table.subtotal} >= 0`),
    check("chk_sales_order_lines_price_subtotal_non_negative", sql`${table.priceSubtotal} >= 0`),
    check("chk_sales_order_lines_price_tax_non_negative", sql`${table.priceTax} >= 0`),
    check("chk_sales_order_lines_price_total_non_negative", sql`${table.priceTotal} >= 0`),
    check("chk_sales_order_lines_cost_subtotal_non_negative", sql`${table.costSubtotal} >= 0`),
    check("chk_sales_order_lines_profit_amount_non_negative", sql`${table.profitAmount} >= 0`),
    check(
      "chk_sales_order_lines_cost_subtotal_formula",
      sql`${table.costSubtotal} = round(${table.quantity} * ${table.costUnit}, 2)`
    ),
    check(
      "chk_sales_order_lines_profit_formula",
      sql`${table.profitAmount} = round(${table.priceSubtotal} - ${table.costSubtotal}, 2)`
    ),
    check(
      "chk_sales_order_lines_margin_percent_formula",
      sql`${table.marginPercent} = CASE
        WHEN ${table.priceSubtotal} = 0 THEN 0
        ELSE round((${table.profitAmount} / ${table.priceSubtotal}) * 100, 4)
      END`
    ),
    check("chk_sales_order_lines_qty_delivered_non_negative", sql`${table.qtyDelivered} >= 0`),
    check("chk_sales_order_lines_qty_to_invoice_non_negative", sql`${table.qtyToInvoice} >= 0`),
    check("chk_sales_order_lines_qty_invoiced_non_negative", sql`${table.qtyInvoiced} >= 0`),
    check(
      "chk_sales_order_lines_qty_delivered_within_ordered",
      sql`${table.qtyDelivered} <= ${table.quantity}`
    ),
    check(
      "chk_sales_order_lines_qty_invoiced_within_ordered",
      sql`${table.qtyInvoiced} <= ${table.quantity}`
    ),
    check(
      "chk_sales_order_lines_qty_to_invoice_within_ordered",
      sql`${table.qtyToInvoice} <= ${table.quantity}`
    ),
    check("chk_sales_order_lines_customer_lead_non_negative", sql`${table.customerLead} >= 0`),
    foreignKey({
      columns: [table.tenantId],
      foreignColumns: [tenants.tenantId],
      name: "fk_sales_order_lines_tenant",
    })
      .onDelete("restrict")
      .onUpdate("cascade"),
    foreignKey({
      columns: [table.orderId],
      foreignColumns: [salesOrders.id],
      name: "fk_sales_order_lines_order",
    })
      .onDelete("cascade")
      .onUpdate("cascade"),
    foreignKey({
      columns: [table.productId],
      foreignColumns: [products.id],
      name: "fk_sales_order_lines_product",
    })
      .onDelete("restrict")
      .onUpdate("cascade"),
    foreignKey({
      columns: [table.productTemplateId],
      foreignColumns: [productTemplates.id],
      name: "fk_sales_order_lines_product_template",
    })
      .onDelete("set null")
      .onUpdate("cascade"),
    foreignKey({
      columns: [table.productUomId],
      foreignColumns: [unitsOfMeasure.uomId],
      name: "fk_sales_order_lines_product_uom",
    })
      .onDelete("set null")
      .onUpdate("cascade"),
    foreignKey({
      columns: [table.discountAuthorityUserId],
      foreignColumns: [users.userId],
      name: "fk_sales_order_lines_discount_authority_user",
    })
      .onDelete("set null")
      .onUpdate("cascade"),
    foreignKey({
      columns: [table.priceApprovedBy],
      foreignColumns: [users.userId],
      name: "fk_sales_order_lines_price_approved_by",
    })
      .onDelete("set null")
      .onUpdate("cascade"),
    ...tenantIsolationPolicies("sales_order_lines"),
    serviceBypassPolicy("sales_order_lines"),
  ]
);

export const saleOrderLineTaxes = salesSchema.table(
  "sale_order_line_taxes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: integer("tenant_id").notNull(),
    orderLineId: uuid("order_line_id").notNull(),
    taxId: uuid("tax_id").notNull(),
    sequence: integer("sequence").notNull().default(10),
    /**
     * Immutable copy of `tax_rates` math parameters at attach time (`tax_id` remains for lineage).
     * Null = legacy row before snapshot enforcement.
     */
    computationSnapshot: jsonb("computation_snapshot").$type<
      SaleOrderLineTaxComputationSnapshot & Record<string, unknown>
    >(),
    ...timestampColumns,
    ...auditColumns(() => users.userId),
  },
  (table) => [
    index("idx_sales_sale_order_line_taxes_tenant").on(table.tenantId),
    index("idx_sales_sale_order_line_taxes_line").on(
      table.tenantId,
      table.orderLineId,
      table.sequence
    ),
    index("idx_sales_sale_order_line_taxes_tax").on(table.tenantId, table.taxId),
    uniqueIndex("uq_sales_sale_order_line_taxes_unique").on(
      table.tenantId,
      table.orderLineId,
      table.taxId
    ),
    check("chk_sales_sale_order_line_taxes_sequence_non_negative", sql`${table.sequence} >= 0`),
    foreignKey({
      columns: [table.tenantId],
      foreignColumns: [tenants.tenantId],
      name: "fk_sales_sale_order_line_taxes_tenant",
    })
      .onDelete("restrict")
      .onUpdate("cascade"),
    foreignKey({
      columns: [table.orderLineId],
      foreignColumns: [salesOrderLines.id],
      name: "fk_sales_sale_order_line_taxes_line",
    })
      .onDelete("cascade")
      .onUpdate("cascade"),
    foreignKey({
      columns: [table.taxId],
      foreignColumns: [taxRates.id],
      name: "fk_sales_sale_order_line_taxes_tax",
    })
      .onDelete("restrict")
      .onUpdate("cascade"),
    ...tenantIsolationPolicies("sales_sale_order_line_taxes"),
    serviceBypassPolicy("sales_sale_order_line_taxes"),
  ]
);

export const saleOrderOptionLines = salesSchema.table(
  "sale_order_option_lines",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: integer("tenant_id").notNull(),
    orderId: uuid("order_id").notNull(),
    productId: uuid("product_id").notNull(),
    name: varchar("name", { length: 255 }).notNull(),
    quantity: numeric("quantity", { precision: 12, scale: 3 }).notNull().default("1"),
    priceUnit: numeric("price_unit", { precision: 14, scale: 2 }).notNull(),
    discount: numeric("discount", { precision: 5, scale: 2 }).notNull().default("0"),
    uomId: integer("uom_id").notNull(),
    sequence: integer("sequence").notNull().default(10),
    ...timestampColumns,
    ...auditColumns(() => users.userId),
  },
  (table) => [
    index("idx_sales_sale_order_option_lines_tenant").on(table.tenantId),
    index("idx_sales_sale_order_option_lines_order").on(
      table.tenantId,
      table.orderId,
      table.sequence
    ),
    index("idx_sales_sale_order_option_lines_product").on(table.tenantId, table.productId),
    check("chk_sales_sale_order_option_lines_quantity_positive", sql`${table.quantity} > 0`),
    check(
      "chk_sales_sale_order_option_lines_price_unit_non_negative",
      sql`${table.priceUnit} >= 0`
    ),
    check(
      "chk_sales_sale_order_option_lines_discount_range",
      sql`${table.discount} >= 0 AND ${table.discount} <= 100`
    ),
    foreignKey({
      columns: [table.tenantId],
      foreignColumns: [tenants.tenantId],
      name: "fk_sales_sale_order_option_lines_tenant",
    })
      .onDelete("restrict")
      .onUpdate("cascade"),
    foreignKey({
      columns: [table.orderId],
      foreignColumns: [salesOrders.id],
      name: "fk_sales_sale_order_option_lines_order",
    })
      .onDelete("cascade")
      .onUpdate("cascade"),
    foreignKey({
      columns: [table.productId],
      foreignColumns: [products.id],
      name: "fk_sales_sale_order_option_lines_product",
    })
      .onDelete("restrict")
      .onUpdate("cascade"),
    foreignKey({
      columns: [table.uomId],
      foreignColumns: [unitsOfMeasure.uomId],
      name: "fk_sales_sale_order_option_lines_uom",
    })
      .onDelete("restrict")
      .onUpdate("cascade"),
    ...tenantIsolationPolicies("sales_sale_order_option_lines"),
    serviceBypassPolicy("sales_sale_order_option_lines"),
  ]
);

export const saleOrderStatusHistory = salesSchema.table(
  "sale_order_status_history",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: integer("tenant_id").notNull(),
    orderId: uuid("order_id").notNull(),
    oldStatus: orderStatusEnum("old_status").notNull(),
    newStatus: orderStatusEnum("new_status").notNull(),
    changedBy: integer("changed_by"),
    changedAt: timestamp("changed_at", { withTimezone: true }).defaultNow().notNull(),
    reason: text("reason"),
    ...timestampColumns,
    ...auditColumns(() => users.userId),
  },
  (table) => [
    index("idx_sales_sale_order_status_history_tenant").on(table.tenantId),
    index("idx_sales_sale_order_status_history_order").on(
      table.tenantId,
      table.orderId,
      table.changedAt
    ),
    index("idx_sales_sale_order_status_history_status").on(
      table.tenantId,
      table.newStatus,
      table.changedAt
    ),
    foreignKey({
      columns: [table.tenantId],
      foreignColumns: [tenants.tenantId],
      name: "fk_sales_sale_order_status_history_tenant",
    })
      .onDelete("restrict")
      .onUpdate("cascade"),
    foreignKey({
      columns: [table.orderId],
      foreignColumns: [salesOrders.id],
      name: "fk_sales_sale_order_status_history_order",
    })
      .onDelete("cascade")
      .onUpdate("cascade"),
    foreignKey({
      columns: [table.changedBy],
      foreignColumns: [users.userId],
      name: "fk_sales_sale_order_status_history_changed_by",
    })
      .onDelete("set null")
      .onUpdate("cascade"),
    ...tenantIsolationPolicies("sales_sale_order_status_history"),
    serviceBypassPolicy("sales_sale_order_status_history"),
  ]
);

export const saleOrderTaxSummary = salesSchema.table(
  "sale_order_tax_summary",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: integer("tenant_id").notNull(),
    orderId: uuid("order_id").notNull(),
    taxId: uuid("tax_id").notNull(),
    taxGroupId: uuid("tax_group_id"),
    baseAmount: numeric("base_amount", { precision: 14, scale: 2 }).notNull().default("0"),
    taxAmount: numeric("tax_amount", { precision: 14, scale: 2 }).notNull().default("0"),
    isTaxIncluded: boolean("is_tax_included").notNull().default(false),
    ...timestampColumns,
    ...auditColumns(() => users.userId),
  },
  (table) => [
    index("idx_sales_sale_order_tax_summary_tenant").on(table.tenantId),
    index("idx_sales_sale_order_tax_summary_order").on(table.tenantId, table.orderId),
    index("idx_sales_sale_order_tax_summary_tax").on(table.tenantId, table.taxId),
    uniqueIndex("uq_sales_sale_order_tax_summary_unique").on(
      table.tenantId,
      table.orderId,
      table.taxId
    ),
    check("chk_sales_sale_order_tax_summary_base_non_negative", sql`${table.baseAmount} >= 0`),
    check("chk_sales_sale_order_tax_summary_tax_non_negative", sql`${table.taxAmount} >= 0`),
    foreignKey({
      columns: [table.tenantId],
      foreignColumns: [tenants.tenantId],
      name: "fk_sales_sale_order_tax_summary_tenant",
    })
      .onDelete("restrict")
      .onUpdate("cascade"),
    foreignKey({
      columns: [table.orderId],
      foreignColumns: [salesOrders.id],
      name: "fk_sales_sale_order_tax_summary_order",
    })
      .onDelete("cascade")
      .onUpdate("cascade"),
    foreignKey({
      columns: [table.taxId],
      foreignColumns: [taxRates.id],
      name: "fk_sales_sale_order_tax_summary_tax",
    })
      .onDelete("restrict")
      .onUpdate("cascade"),
    foreignKey({
      columns: [table.taxGroupId],
      foreignColumns: [taxGroups.id],
      name: "fk_sales_sale_order_tax_summary_tax_group",
    })
      .onDelete("set null")
      .onUpdate("cascade"),
    ...tenantIsolationPolicies("sales_sale_order_tax_summary"),
    serviceBypassPolicy("sales_sale_order_tax_summary"),
  ]
);

export const salesOrderSelectSchema = createSelectSchema(salesOrders);
export const salesOrderLineSelectSchema = createSelectSchema(salesOrderLines);

export const saleOrderLineTaxSelectSchema = createSelectSchema(saleOrderLineTaxes);
export const saleOrderOptionLineSelectSchema = createSelectSchema(saleOrderOptionLines);
export const saleOrderStatusHistorySelectSchema = createSelectSchema(saleOrderStatusHistory);
export const saleOrderTaxSummarySelectSchema = createSelectSchema(saleOrderTaxSummary);

export const salesOrderInsertSchema = createInsertSchema(salesOrders, {
  id: SalesOrderIdSchema.optional(),
  tenantId: z.number().int().positive(),
  name: z.string().min(1).max(120),
  partnerId: PartnerIdSchema,
  status: OrderStatusSchema.optional(),
  sequenceNumber: z.string().max(120).optional().nullable(),
  quotationDate: dateOnlyWire.optional().nullable(),
  validityDate: dateOnlyWire.optional().nullable(),
  confirmationDate: dateOnlyWire.optional().nullable(),
  confirmedBy: z.number().int().positive().optional().nullable(),
  currencyId: z.number().int().positive().optional().nullable(),
  pricelistId: PricelistIdSchema.optional().nullable(),
  activePricingDecisionId: PricingDecisionIdSchema.optional().nullable(),
  paymentTermId: PaymentTermIdSchema.optional().nullable(),
  fiscalPositionId: FiscalPositionIdSchema.optional().nullable(),
  invoiceAddressId: PartnerAddressIdSchema.optional().nullable(),
  deliveryAddressId: PartnerAddressIdSchema.optional().nullable(),
  invoiceAddressSnapshot: z.record(z.string(), z.unknown()).optional().nullable(),
  deliveryAddressSnapshot: z.record(z.string(), z.unknown()).optional().nullable(),
  companyCurrencyRate: z
    .string()
    .regex(/^\d+(\.\d{1,6})?$/, "Must be a valid positive decimal string")
    .optional()
    .nullable(),
  invoiceStatus: InvoiceStatusSchema.optional(),
  deliveryStatus: DeliveryStatusSchema.optional(),
  signedBy: z.string().max(200).optional().nullable(),
  signedOn: dateOnlyWire.optional().nullable(),
  clientOrderRef: z.string().max(200).optional().nullable(),
  origin: z.string().max(200).optional().nullable(),
  teamId: z.string().max(120).optional().nullable(),
  userId: z.number().int().positive().optional().nullable(),
  cancelReason: z.string().max(4000).optional().nullable(),
  orderDate: dateOnlyWire.optional(),
  deliveryDate: dateOnlyWire.optional().nullable(),
  assignedToId: z.string().max(120).optional().nullable(),
  notes: z.string().max(4000).optional().nullable(),
  amountUntaxed: positiveMoneyStringSchema.optional(),
  amountCost: positiveMoneyStringSchema.optional(),
  amountProfit: positiveMoneyStringSchema.optional(),
  marginPercent: percentageStringSchema.optional(),
  amountTax: positiveMoneyStringSchema.optional(),
  amountTotal: positiveMoneyStringSchema.optional(),
  createdBy: z.number().int().positive(),
  updatedBy: z.number().int().positive(),
});

export const salesOrderLineInsertSchema = createInsertSchema(salesOrderLines, {
  id: SalesOrderLineIdSchema.optional(),
  tenantId: z.number().int().positive(),
  orderId: SalesOrderIdSchema,
  productId: ProductIdSchema,
  taxId: TaxRateIdSchema.optional().nullable(),
  productUomId: z.number().int().positive().optional().nullable(),
  description: z.string().max(4000).optional().nullable(),
  quantity: quantityStringSchema,
  priceUnit: positiveMoneyStringSchema,
  discount: discountStringSchema.optional(),
  costUnit: positiveMoneyStringSchema.optional(),
  subtotal: positiveMoneyStringSchema,
  priceSubtotal: positiveMoneyStringSchema.optional(),
  priceTax: positiveMoneyStringSchema.optional(),
  priceTotal: positiveMoneyStringSchema.optional(),
  costSubtotal: positiveMoneyStringSchema.optional(),
  profitAmount: positiveMoneyStringSchema.optional(),
  marginPercent: percentageStringSchema.optional(),
  qtyDelivered: quantityStringSchema.optional(),
  qtyToInvoice: quantityStringSchema.optional(),
  qtyInvoiced: quantityStringSchema.optional(),
  invoiceStatus: InvoiceStatusSchema.optional(),
  customerLead: z.number().int().min(0).optional(),
  displayType: DisplayLineTypeSchema.optional(),
  priceSource: PriceSourceSchema.optional(),
  discountSource: DiscountSourceSchema.optional(),
  appliedPricelistId: PricelistIdSchema.optional().nullable(),
  appliedFiscalPositionId: FiscalPositionIdSchema.optional().nullable(),
  discountAuthorityUserId: z.number().int().positive().optional().nullable(),
  sequence: z.number().int().positive().optional(),
  createdBy: z.number().int().positive(),
  updatedBy: z.number().int().positive(),
});

const saleOrderLineTaxComputationSnapshotWire = z.object({
  amountType: TaxAmountTypeSchema,
  amount: z.string().min(1).max(32),
  computationMethod: TaxComputationMethodSchema,
  priceInclude: z.boolean(),
  taxEngineVersion: z.string().min(1).max(64).optional(),
});

export const saleOrderLineTaxInsertSchema = createInsertSchema(saleOrderLineTaxes, {
  id: SaleOrderLineTaxIdSchema.optional(),
  tenantId: z.number().int().positive(),
  orderLineId: SalesOrderLineIdSchema,
  taxId: TaxRateIdSchema,
  sequence: z.number().int().min(0).optional(),
  computationSnapshot: saleOrderLineTaxComputationSnapshotWire.optional().nullable(),
  createdBy: z.number().int().positive(),
  updatedBy: z.number().int().positive(),
});

export const saleOrderStatusHistoryInsertSchema = createInsertSchema(saleOrderStatusHistory, {
  id: SaleOrderStatusHistoryIdSchema.optional(),
  tenantId: z.number().int().positive(),
  orderId: SalesOrderIdSchema,
  oldStatus: OrderStatusSchema,
  newStatus: OrderStatusSchema,
  changedBy: z.number().int().positive().optional().nullable(),
  changedAt: instantWire.optional(),
  reason: z.string().max(2000).optional().nullable(),
  createdBy: z.number().int().positive(),
  updatedBy: z.number().int().positive(),
});

export const saleOrderTaxSummaryInsertSchema = createInsertSchema(saleOrderTaxSummary, {
  id: SaleOrderTaxSummaryIdSchema.optional(),
  tenantId: z.number().int().positive(),
  orderId: SalesOrderIdSchema,
  taxId: TaxRateIdSchema,
  taxGroupId: TaxGroupIdSchema.optional().nullable(),
  baseAmount: positiveMoneyStringSchema.optional(),
  taxAmount: positiveMoneyStringSchema.optional(),
  isTaxIncluded: z.boolean().optional(),
  createdBy: z.number().int().positive(),
  updatedBy: z.number().int().positive(),
});

export const saleOrderOptionLineInsertSchema = createInsertSchema(saleOrderOptionLines, {
  id: SaleOrderOptionLineIdSchema.optional(),
  tenantId: z.number().int().positive(),
  orderId: SalesOrderIdSchema,
  productId: ProductIdSchema,
  name: z.string().min(1).max(255),
  quantity: z
    .string()
    .regex(/^\d+(\.\d{1,3})?$/, "Must be a valid quantity string")
    .optional(),
  priceUnit: positiveMoneyStringSchema,
  discount: discountStringSchema.optional(),
  uomId: z.number().int().positive(),
  sequence: z.number().int().min(0).optional(),
  createdBy: z.number().int().positive(),
  updatedBy: z.number().int().positive(),
});

export const salesOrderUpdateSchema = createUpdateSchema(salesOrders);
export const salesOrderLineUpdateSchema = createUpdateSchema(salesOrderLines);

export const saleOrderLineTaxUpdateSchema = createUpdateSchema(saleOrderLineTaxes);
export const saleOrderOptionLineUpdateSchema = createUpdateSchema(saleOrderOptionLines);
export const saleOrderStatusHistoryUpdateSchema = createUpdateSchema(saleOrderStatusHistory);
export const saleOrderTaxSummaryUpdateSchema = createUpdateSchema(saleOrderTaxSummary);

export type SalesOrder = typeof salesOrders.$inferSelect;
export type NewSalesOrder = typeof salesOrders.$inferInsert;
export type SalesOrderLine = typeof salesOrderLines.$inferSelect;
export type NewSalesOrderLine = typeof salesOrderLines.$inferInsert;
export type SaleOrderLineTax = typeof saleOrderLineTaxes.$inferSelect;
export type NewSaleOrderLineTax = typeof saleOrderLineTaxes.$inferInsert;
export type SaleOrderStatusHistory = typeof saleOrderStatusHistory.$inferSelect;
export type NewSaleOrderStatusHistory = typeof saleOrderStatusHistory.$inferInsert;
export type SaleOrderTaxSummary = typeof saleOrderTaxSummary.$inferSelect;
export type NewSaleOrderTaxSummary = typeof saleOrderTaxSummary.$inferInsert;

export type SaleOrderOptionLine = typeof saleOrderOptionLines.$inferSelect;
export type NewSaleOrderOptionLine = typeof saleOrderOptionLines.$inferInsert;
