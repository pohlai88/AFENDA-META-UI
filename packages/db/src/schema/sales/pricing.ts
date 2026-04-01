import { sql } from "drizzle-orm";
import {
boolean,
check,
foreignKey,
index,
integer,
numeric,
text,
timestamp,
uniqueIndex,
uuid
} from "drizzle-orm/pg-core";
import { createInsertSchema,createSelectSchema,createUpdateSchema } from "drizzle-orm/zod";
import { z } from "zod/v4";

import {
auditColumns,
nameColumn,
softDeleteColumns,
timestampColumns,
} from "../../column-kit/index.js";
import { serviceBypassPolicy,tenantIsolationPolicies } from "../../rls-policies/index.js";
import { dateOnlyWire,instantWire } from "../../wire/temporal.js";
import { tenants } from "../core/tenants.js";
import { currencies } from "../reference/index.js";
import { users } from "../security/index.js";
import {
DiscountPolicySchema,
PaymentTermValueTypeSchema,
PricelistAppliedOnSchema,
PricelistBaseTypeSchema,
PricelistComputeTypeSchema,
SalesTruthDocumentTypeSchema,
discountPolicyEnum,
paymentTermValueTypeEnum,
pricelistAppliedOnEnum,
pricelistBaseTypeEnum,
pricelistComputeTypeEnum,
salesTruthDocumentTypeEnum
} from "./_enums.js";
import { salesSchema } from "./_schema.js";
import {
LineItemDiscountIdSchema,
PaymentTermIdSchema,
PaymentTermLineIdSchema,
PricelistIdSchema,
PricelistItemIdSchema,
ProductCategoryIdSchema,
ProductIdSchema,
RoundingPolicyIdSchema,
discountStringSchema,
percentageStringSchema,
positiveMoneyStringSchema
} from "./_zodShared.js";

import { productCategories,products } from "./product.js";


export const paymentTerms = salesSchema.table(
  "payment_terms",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: integer("tenant_id").notNull(),
    ...nameColumn,
    note: text("note"),
    isActive: boolean("is_active").notNull().default(true),
    ...timestampColumns,
    ...softDeleteColumns,
    ...auditColumns(() => users.userId),
  },
  (table) => [
    index("idx_sales_payment_terms_tenant").on(table.tenantId),
    index("idx_sales_payment_terms_active").on(table.tenantId, table.isActive),
    uniqueIndex("uq_sales_payment_terms_name")
      .on(table.tenantId, sql`lower(${table.name})`)
      .where(sql`${table.deletedAt} IS NULL`),
    foreignKey({
      columns: [table.tenantId],
      foreignColumns: [tenants.tenantId],
      name: "fk_sales_payment_terms_tenant",
    })
      .onDelete("restrict")
      .onUpdate("cascade"),
    ...tenantIsolationPolicies("sales_payment_terms"),
    serviceBypassPolicy("sales_payment_terms"),
  ]
);

export const paymentTermLines = salesSchema.table(
  "payment_term_lines",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: integer("tenant_id").notNull(),
    paymentTermId: uuid("payment_term_id").notNull(),
    valueType: paymentTermValueTypeEnum("value_type").notNull().default("balance"),
    value: numeric("value", { precision: 10, scale: 4 }).notNull().default("0"),
    days: integer("days").notNull().default(0),
    dayOfMonth: integer("day_of_month"),
    endOfMonth: boolean("end_of_month").notNull().default(false),
    sequence: integer("sequence").notNull().default(10),
    ...timestampColumns,
    ...auditColumns(() => users.userId),
  },
  (table) => [
    index("idx_sales_payment_term_lines_tenant").on(table.tenantId),
    index("idx_sales_payment_term_lines_term").on(
      table.tenantId,
      table.paymentTermId,
      table.sequence
    ),
    uniqueIndex("uq_sales_payment_term_lines_sequence").on(
      table.tenantId,
      table.paymentTermId,
      table.sequence
    ),
    check("chk_sales_payment_term_lines_value_non_negative", sql`${table.value} >= 0`),
    check(
      "chk_sales_payment_term_lines_percent_range",
      sql`${table.valueType} <> 'percent' OR ${table.value} <= 100`
    ),
    check("chk_sales_payment_term_lines_days_non_negative", sql`${table.days} >= 0`),
    check(
      "chk_sales_payment_term_lines_day_of_month_range",
      sql`${table.dayOfMonth} IS NULL OR (${table.dayOfMonth} >= 1 AND ${table.dayOfMonth} <= 31)`
    ),
    check("chk_sales_payment_term_lines_sequence_non_negative", sql`${table.sequence} >= 0`),
    foreignKey({
      columns: [table.tenantId],
      foreignColumns: [tenants.tenantId],
      name: "fk_sales_payment_term_lines_tenant",
    })
      .onDelete("restrict")
      .onUpdate("cascade"),
    foreignKey({
      columns: [table.paymentTermId],
      foreignColumns: [paymentTerms.id],
      name: "fk_sales_payment_term_lines_term",
    })
      .onDelete("cascade")
      .onUpdate("cascade"),
    ...tenantIsolationPolicies("sales_payment_term_lines"),
    serviceBypassPolicy("sales_payment_term_lines"),
  ]
);

export const pricelists = salesSchema.table(
  "pricelists",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: integer("tenant_id").notNull(),
    ...nameColumn,
    currencyId: integer("currency_id").notNull(),
    discountPolicy: discountPolicyEnum("discount_policy").notNull().default("with_discount"),
    isActive: boolean("is_active").notNull().default(true),
    sequence: integer("sequence").notNull().default(10),
    ...timestampColumns,
    ...softDeleteColumns,
    ...auditColumns(() => users.userId),
  },
  (table) => [
    index("idx_sales_pricelists_tenant").on(table.tenantId),
    index("idx_sales_pricelists_currency").on(table.tenantId, table.currencyId),
    index("idx_sales_pricelists_active").on(table.tenantId, table.isActive, table.sequence),
    uniqueIndex("uq_sales_pricelists_name")
      .on(table.tenantId, sql`lower(${table.name})`)
      .where(sql`${table.deletedAt} IS NULL`),
    check("chk_sales_pricelists_sequence_non_negative", sql`${table.sequence} >= 0`),
    foreignKey({
      columns: [table.tenantId],
      foreignColumns: [tenants.tenantId],
      name: "fk_sales_pricelists_tenant",
    })
      .onDelete("restrict")
      .onUpdate("cascade"),
    foreignKey({
      columns: [table.currencyId],
      foreignColumns: [currencies.currencyId],
      name: "fk_sales_pricelists_currency",
    })
      .onDelete("restrict")
      .onUpdate("cascade"),
    ...tenantIsolationPolicies("sales_pricelists"),
    serviceBypassPolicy("sales_pricelists"),
  ]
);

export const pricelistItems = salesSchema.table(
  "pricelist_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: integer("tenant_id").notNull(),
    pricelistId: uuid("pricelist_id").notNull(),
    appliedOn: pricelistAppliedOnEnum("applied_on").notNull().default("global"),
    productTmplId: uuid("product_tmpl_id"),
    productId: uuid("product_id"),
    categId: uuid("categ_id"),
    minQuantity: numeric("min_quantity", { precision: 12, scale: 4 }).notNull().default("1"),
    dateStart: timestamp("date_start", { withTimezone: true }),
    dateEnd: timestamp("date_end", { withTimezone: true }),
    effectiveFrom: timestamp("effective_from", { withTimezone: true }).notNull().defaultNow(),
    effectiveTo: timestamp("effective_to", { withTimezone: true }),
    supersededBy: uuid("superseded_by"),
    computePrice: pricelistComputeTypeEnum("compute_price").notNull().default("fixed"),
    fixedPrice: numeric("fixed_price", { precision: 14, scale: 4 }),
    percentPrice: numeric("percent_price", { precision: 9, scale: 4 }),
    base: pricelistBaseTypeEnum("base").notNull().default("list_price"),
    basePricelistId: uuid("base_pricelist_id"),
    priceSurcharge: numeric("price_surcharge", { precision: 14, scale: 4 }).notNull().default("0"),
    priceDiscount: numeric("price_discount", { precision: 9, scale: 4 }).notNull().default("0"),
    priceRound: numeric("price_round", { precision: 14, scale: 6 }),
    priceMinMargin: numeric("price_min_margin", { precision: 14, scale: 4 }).notNull().default("0"),
    priceMaxMargin: numeric("price_max_margin", { precision: 14, scale: 4 }).notNull().default("0"),
    sequence: integer("sequence").notNull().default(10),
    isActive: boolean("is_active").notNull().default(true),
    ...timestampColumns,
    ...softDeleteColumns,
    ...auditColumns(() => users.userId),
  },
  (table) => [
    index("idx_sales_pricelist_items_tenant").on(table.tenantId),
    index("idx_sales_pricelist_items_pricelist").on(
      table.tenantId,
      table.pricelistId,
      table.sequence
    ),
    index("idx_sales_pricelist_items_scope").on(table.tenantId, table.appliedOn, table.isActive),
    index("idx_sales_pricelist_items_product").on(table.tenantId, table.productId),
    index("idx_sales_pricelist_items_category").on(table.tenantId, table.categId),
    index("idx_sales_pricelist_items_effective").on(
      table.tenantId,
      table.pricelistId,
      table.effectiveFrom
    ),
    index("idx_sales_pricelist_items_superseded_by").on(table.tenantId, table.supersededBy),
    check("chk_sales_pricelist_items_min_quantity_positive", sql`${table.minQuantity} > 0`),
    check(
      "chk_sales_pricelist_items_percent_price_range",
      sql`${table.percentPrice} IS NULL OR (${table.percentPrice} >= 0 AND ${table.percentPrice} <= 100)`
    ),
    check(
      "chk_sales_pricelist_items_price_discount_range",
      sql`${table.priceDiscount} >= -100 AND ${table.priceDiscount} <= 100`
    ),
    check(
      "chk_sales_pricelist_items_date_range",
      sql`${table.dateEnd} IS NULL OR ${table.dateStart} IS NULL OR ${table.dateEnd} >= ${table.dateStart}`
    ),
    check(
      "chk_sales_pricelist_items_effective_order",
      sql`${table.effectiveTo} IS NULL OR ${table.effectiveTo} >= ${table.effectiveFrom}`
    ),
    check(
      "chk_sales_pricelist_items_margins_non_negative",
      sql`${table.priceMinMargin} >= 0 AND ${table.priceMaxMargin} >= 0`
    ),
    check("chk_sales_pricelist_items_sequence_non_negative", sql`${table.sequence} >= 0`),
    check(
      "chk_sales_pricelist_items_applied_on_scope",
      sql`(
        (${table.appliedOn} = 'global' AND ${table.productTmplId} IS NULL AND ${table.productId} IS NULL AND ${table.categId} IS NULL)
        OR (${table.appliedOn} = 'product_template' AND ${table.productTmplId} IS NOT NULL AND ${table.productId} IS NULL AND ${table.categId} IS NULL)
        OR (${table.appliedOn} = 'product_variant' AND ${table.productId} IS NOT NULL AND ${table.productTmplId} IS NULL AND ${table.categId} IS NULL)
        OR (${table.appliedOn} = 'product_category' AND ${table.categId} IS NOT NULL AND ${table.productTmplId} IS NULL AND ${table.productId} IS NULL)
      )`
    ),
    foreignKey({
      columns: [table.tenantId],
      foreignColumns: [tenants.tenantId],
      name: "fk_sales_pricelist_items_tenant",
    })
      .onDelete("restrict")
      .onUpdate("cascade"),
    foreignKey({
      columns: [table.pricelistId],
      foreignColumns: [pricelists.id],
      name: "fk_sales_pricelist_items_pricelist",
    })
      .onDelete("cascade")
      .onUpdate("cascade"),
    foreignKey({
      columns: [table.productId],
      foreignColumns: [products.id],
      name: "fk_sales_pricelist_items_product",
    })
      .onDelete("set null")
      .onUpdate("cascade"),
    foreignKey({
      columns: [table.categId],
      foreignColumns: [productCategories.id],
      name: "fk_sales_pricelist_items_category",
    })
      .onDelete("set null")
      .onUpdate("cascade"),
    foreignKey({
      columns: [table.basePricelistId],
      foreignColumns: [pricelists.id],
      name: "fk_sales_pricelist_items_base_pricelist",
    })
      .onDelete("set null")
      .onUpdate("cascade"),
    foreignKey({
      columns: [table.supersededBy],
      foreignColumns: [table.id],
      name: "fk_sales_pricelist_items_superseded_by",
    })
      .onDelete("set null")
      .onUpdate("cascade"),
    ...tenantIsolationPolicies("sales_pricelist_items"),
    serviceBypassPolicy("sales_pricelist_items"),
  ]
);

export const lineItemDiscounts = salesSchema.table(
  "line_item_discounts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: integer("tenant_id").notNull(),
    documentType: salesTruthDocumentTypeEnum("document_type").notNull(),
    lineId: uuid("line_id").notNull(),
    discountType: text("discount_type").notNull(),
    discountSource: text("discount_source"),
    discountPercent: numeric("discount_percent", { precision: 5, scale: 2 }),
    discountAmount: numeric("discount_amount", { precision: 14, scale: 2 }),
    authorizedBy: integer("authorized_by"),
    authorizedAt: timestamp("authorized_at", { withTimezone: true }),
    maxDiscountAllowed: numeric("max_discount_allowed", { precision: 5, scale: 2 }),
    reason: text("reason"),
    sequence: integer("sequence").notNull().default(1),
    ...timestampColumns,
    ...auditColumns(() => users.userId),
  },
  (table) => [
    index("idx_sales_line_item_discounts_tenant").on(table.tenantId),
    index("idx_sales_line_item_discounts_audit").on(
      table.tenantId,
      table.discountType,
      table.authorizedBy,
      table.authorizedAt
    ),
    index("idx_sales_line_item_discounts_line").on(
      table.tenantId,
      table.documentType,
      table.lineId,
      table.sequence
    ),
    check(
      "chk_sales_line_item_discounts_percent_range",
      sql`${table.discountPercent} IS NULL OR (${table.discountPercent} >= 0 AND ${table.discountPercent} <= 100)`
    ),
    check(
      "chk_sales_line_item_discounts_amount_non_negative",
      sql`${table.discountAmount} IS NULL OR ${table.discountAmount} >= 0`
    ),
    check(
      "chk_sales_line_item_discounts_requires_value",
      sql`${table.discountPercent} IS NOT NULL OR ${table.discountAmount} IS NOT NULL`
    ),
    check(
      "chk_sales_line_item_discounts_manual_auth",
      sql`${table.discountType} <> 'manual' OR ${table.authorizedBy} IS NOT NULL`
    ),
    check("chk_sales_line_item_discounts_sequence_positive", sql`${table.sequence} > 0`),
    foreignKey({
      columns: [table.tenantId],
      foreignColumns: [tenants.tenantId],
      name: "fk_sales_line_item_discounts_tenant",
    })
      .onDelete("restrict")
      .onUpdate("cascade"),
    foreignKey({
      columns: [table.authorizedBy],
      foreignColumns: [users.userId],
      name: "fk_sales_line_item_discounts_authorized_by",
    })
      .onDelete("set null")
      .onUpdate("cascade"),
    ...tenantIsolationPolicies("sales_line_item_discounts"),
    serviceBypassPolicy("sales_line_item_discounts"),
  ]
);

export const roundingPolicies = salesSchema.table(
  "rounding_policies",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: integer("tenant_id").notNull(),
    policyName: text("policy_name").notNull(),
    policyKey: text("policy_key").notNull(),
    roundingMethod: text("rounding_method").notNull(),
    roundingPrecision: integer("rounding_precision").notNull().default(2),
    roundingUnit: numeric("rounding_unit", { precision: 14, scale: 6 }),
    appliesTo: text("applies_to").notNull(),
    currencyCode: text("currency_code"),
    isActive: boolean("is_active").notNull().default(true),
    effectiveFrom: timestamp("effective_from", { withTimezone: true }).notNull().defaultNow(),
    effectiveTo: timestamp("effective_to", { withTimezone: true }),
    ...timestampColumns,
    ...softDeleteColumns,
    ...auditColumns(() => users.userId),
  },
  (table) => [
    index("idx_sales_rounding_policies_tenant").on(table.tenantId),
    index("idx_sales_rounding_policies_lookup").on(
      table.tenantId,
      table.policyKey,
      table.currencyCode,
      table.effectiveFrom
    ),
    index("idx_sales_rounding_policies_active").on(table.tenantId, table.appliesTo, table.isActive),
    uniqueIndex("uq_sales_rounding_policies_effective")
      .on(table.tenantId, table.policyKey, table.currencyCode, table.effectiveFrom)
      .where(sql`${table.deletedAt} IS NULL AND ${table.isActive} = true`),
    check(
      "chk_sales_rounding_policies_method",
      sql`${table.roundingMethod} IN ('round', 'ceil', 'floor', 'truncate')`
    ),
    check(
      "chk_sales_rounding_policies_precision_range",
      sql`${table.roundingPrecision} BETWEEN 0 AND 6`
    ),
    check(
      "chk_sales_rounding_policies_unit_positive",
      sql`${table.roundingUnit} IS NULL OR ${table.roundingUnit} > 0`
    ),
    check(
      "chk_sales_rounding_policies_effective_order",
      sql`${table.effectiveTo} IS NULL OR ${table.effectiveTo} >= ${table.effectiveFrom}`
    ),
    foreignKey({
      columns: [table.tenantId],
      foreignColumns: [tenants.tenantId],
      name: "fk_sales_rounding_policies_tenant",
    })
      .onDelete("restrict")
      .onUpdate("cascade"),
    ...tenantIsolationPolicies("sales_rounding_policies"),
    serviceBypassPolicy("sales_rounding_policies"),
  ]
);

export const paymentTermSelectSchema = createSelectSchema(paymentTerms);
export const paymentTermLineSelectSchema = createSelectSchema(paymentTermLines);
export const pricelistSelectSchema = createSelectSchema(pricelists);
export const pricelistItemSelectSchema = createSelectSchema(pricelistItems);

export const lineItemDiscountSelectSchema = createSelectSchema(lineItemDiscounts);

export const roundingPolicySelectSchema = createSelectSchema(roundingPolicies);

export const paymentTermInsertSchema = createInsertSchema(paymentTerms, {
  id: PaymentTermIdSchema.optional(),
  tenantId: z.number().int().positive(),
  name: z.string().min(1).max(200),
  note: z.string().max(4000).optional().nullable(),
  isActive: z.boolean().optional(),
  createdBy: z.number().int().positive(),
  updatedBy: z.number().int().positive(),
});

export const paymentTermLineInsertSchema = createInsertSchema(paymentTermLines, {
  id: PaymentTermLineIdSchema.optional(),
  tenantId: z.number().int().positive(),
  paymentTermId: PaymentTermIdSchema,
  valueType: PaymentTermValueTypeSchema.optional(),
  value: z
    .string()
    .regex(/^\d+(\.\d{1,4})?$/, "Must be a valid non-negative decimal string")
    .optional(),
  days: z.number().int().min(0).optional(),
  dayOfMonth: z.number().int().min(1).max(31).optional().nullable(),
  endOfMonth: z.boolean().optional(),
  sequence: z.number().int().min(0).optional(),
  createdBy: z.number().int().positive(),
  updatedBy: z.number().int().positive(),
});

export const pricelistInsertSchema = createInsertSchema(pricelists, {
  id: PricelistIdSchema.optional(),
  tenantId: z.number().int().positive(),
  name: z.string().min(1).max(200),
  currencyId: z.number().int().positive(),
  discountPolicy: DiscountPolicySchema.optional(),
  isActive: z.boolean().optional(),
  sequence: z.number().int().min(0).optional(),
  createdBy: z.number().int().positive(),
  updatedBy: z.number().int().positive(),
});

export const pricelistItemInsertSchema = createInsertSchema(pricelistItems, {
  id: PricelistItemIdSchema.optional(),
  tenantId: z.number().int().positive(),
  pricelistId: PricelistIdSchema,
  appliedOn: PricelistAppliedOnSchema.optional(),
  productTmplId: z.uuid().optional().nullable(),
  productId: ProductIdSchema.optional().nullable(),
  categId: ProductCategoryIdSchema.optional().nullable(),
  minQuantity: z
    .string()
    .regex(/^\d+(\.\d{1,4})?$/, "Must be a valid quantity string")
    .optional(),
  dateStart: dateOnlyWire.optional().nullable(),
  dateEnd: dateOnlyWire.optional().nullable(),
  computePrice: PricelistComputeTypeSchema.optional(),
  fixedPrice: z
    .string()
    .regex(/^\d+(\.\d{1,4})?$/, "Must be a valid non-negative decimal string")
    .optional()
    .nullable(),
  percentPrice: percentageStringSchema.optional().nullable(),
  base: PricelistBaseTypeSchema.optional(),
  basePricelistId: PricelistIdSchema.optional().nullable(),
  priceSurcharge: z
    .string()
    .regex(/^\d+(\.\d{1,4})?$/, "Must be a valid non-negative decimal string")
    .optional(),
  priceDiscount: z
    .string()
    .regex(/^-?\d+(\.\d{1,4})?$/, "Must be a valid decimal string")
    .optional(),
  priceRound: z
    .string()
    .regex(/^\d+(\.\d{1,6})?$/, "Must be a valid non-negative decimal string")
    .optional()
    .nullable(),
  priceMinMargin: z
    .string()
    .regex(/^\d+(\.\d{1,4})?$/, "Must be a valid non-negative decimal string")
    .optional(),
  priceMaxMargin: z
    .string()
    .regex(/^\d+(\.\d{1,4})?$/, "Must be a valid non-negative decimal string")
    .optional(),
  sequence: z.number().int().min(0).optional(),
  isActive: z.boolean().optional(),
  createdBy: z.number().int().positive(),
  updatedBy: z.number().int().positive(),
});

export const lineItemDiscountInsertSchema = createInsertSchema(lineItemDiscounts, {
  id: LineItemDiscountIdSchema.optional(),
  tenantId: z.number().int().positive(),
  documentType: SalesTruthDocumentTypeSchema,
  lineId: z.uuid(),
  discountType: z.string().min(1).max(80),
  discountSource: z.string().max(255).optional().nullable(),
  discountPercent: discountStringSchema.optional().nullable(),
  discountAmount: positiveMoneyStringSchema.optional().nullable(),
  authorizedBy: z.number().int().positive().optional().nullable(),
  authorizedAt: instantWire.optional().nullable(),
  maxDiscountAllowed: discountStringSchema.optional().nullable(),
  reason: z.string().max(2000).optional().nullable(),
  sequence: z.number().int().positive().optional(),
  createdBy: z.number().int().positive(),
  updatedBy: z.number().int().positive(),
});

export const roundingPolicyInsertSchema = createInsertSchema(roundingPolicies, {
  id: RoundingPolicyIdSchema.optional(),
  tenantId: z.number().int().positive(),
  policyName: z.string().min(1).max(160),
  policyKey: z.string().min(1).max(120),
  roundingMethod: z.enum(["round", "ceil", "floor", "truncate"]),
  roundingPrecision: z.number().int().min(0).max(6).optional(),
  roundingUnit: z
    .string()
    .regex(/^\d+(\.\d{1,6})?$/, "Must be a valid positive decimal")
    .optional()
    .nullable(),
  appliesTo: z.string().min(1).max(80),
  currencyCode: z.string().min(3).max(3).optional().nullable(),
  isActive: z.boolean().optional(),
  effectiveFrom: dateOnlyWire.optional(),
  effectiveTo: dateOnlyWire.optional().nullable(),
  createdBy: z.number().int().positive(),
  updatedBy: z.number().int().positive(),
});

export const paymentTermUpdateSchema = createUpdateSchema(paymentTerms);
export const paymentTermLineUpdateSchema = createUpdateSchema(paymentTermLines);
export const pricelistUpdateSchema = createUpdateSchema(pricelists);
export const pricelistItemUpdateSchema = createUpdateSchema(pricelistItems);
export const lineItemDiscountUpdateSchema = createUpdateSchema(lineItemDiscounts);
export const roundingPolicyUpdateSchema = createUpdateSchema(roundingPolicies);

export type PaymentTerm = typeof paymentTerms.$inferSelect;
export type NewPaymentTerm = typeof paymentTerms.$inferInsert;
export type PaymentTermLine = typeof paymentTermLines.$inferSelect;
export type NewPaymentTermLine = typeof paymentTermLines.$inferInsert;
export type Pricelist = typeof pricelists.$inferSelect;
export type NewPricelist = typeof pricelists.$inferInsert;
export type PricelistItem = typeof pricelistItems.$inferSelect;
export type NewPricelistItem = typeof pricelistItems.$inferInsert;
export type LineItemDiscount = typeof lineItemDiscounts.$inferSelect;
export type NewLineItemDiscount = typeof lineItemDiscounts.$inferInsert;
export type RoundingPolicy = typeof roundingPolicies.$inferSelect;
export type NewRoundingPolicy = typeof roundingPolicies.$inferInsert;
