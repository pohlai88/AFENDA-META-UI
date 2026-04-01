import { sql } from "drizzle-orm";
import { createInsertSchema, createSelectSchema, createUpdateSchema } from "drizzle-orm/zod";
import {
  boolean,
  check,
  foreignKey,
  index,
  integer,
  numeric,
  timestamp,
  text,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { z } from "zod/v4";

import { tenantIsolationPolicies, serviceBypassPolicy } from "../../rls-policies/index.js";
import {
  auditColumns,
  nameColumn,
  softDeleteColumns,
  timestampColumns,
} from "../../column-kit/index.js";
import { dateOnlyWire } from "../../wire/temporal.js";
import { tenants } from "../core/tenants.js";
import { users } from "../security/index.js";
import {
  RestockPolicySchema,
  restockPolicyEnum,
  ReturnConditionSchema,
  returnConditionEnum,
  ReturnStatusSchema,
  returnStatusEnum,
} from "./_enums.js";
import {
  DocumentTruthBindingIdSchema,
  PartnerIdSchema,
  PriceResolutionIdSchema,
  positiveMoneyStringSchema,
  ProductIdSchema,
  quantityStringSchema,
  ReturnOrderIdSchema,
  ReturnOrderLineIdSchema,
  ReturnReasonCodeIdSchema,
  SalesOrderIdSchema,
  SalesOrderLineIdSchema,
} from "./_zodShared.js";
import { salesSchema } from "./_schema.js";

import { partners } from "./partner.js";
import { priceResolutions } from "./pricingTruth.js";
import { products } from "./product.js";
import { salesOrderLines, salesOrders } from "./orders.js";
import { documentTruthBindings } from "./truthBindings.js";


export const returnReasonCodes = salesSchema.table(
  "return_reason_codes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: integer("tenant_id").notNull(),
    code: text("code").notNull(),
    ...nameColumn,
    requiresInspection: boolean("requires_inspection").notNull().default(false),
    restockPolicy: restockPolicyEnum("restock_policy").notNull().default("restock"),
    isActive: boolean("is_active").notNull().default(true),
    ...timestampColumns,
    ...softDeleteColumns,
    ...auditColumns(() => users.userId),
  },
  (table) => [
    index("idx_sales_return_reason_codes_tenant").on(table.tenantId),
    index("idx_sales_return_reason_codes_active").on(table.tenantId, table.isActive),
    uniqueIndex("uq_sales_return_reason_codes_code")
      .on(table.tenantId, sql`lower(${table.code})`)
      .where(sql`${table.deletedAt} IS NULL`),
    uniqueIndex("uq_sales_return_reason_codes_name")
      .on(table.tenantId, sql`lower(${table.name})`)
      .where(sql`${table.deletedAt} IS NULL`),
    foreignKey({
      columns: [table.tenantId],
      foreignColumns: [tenants.tenantId],
      name: "fk_sales_return_reason_codes_tenant",
    })
      .onDelete("restrict")
      .onUpdate("cascade"),
    ...tenantIsolationPolicies("sales_return_reason_codes"),
    serviceBypassPolicy("sales_return_reason_codes"),
  ]
);

export const returnOrders = salesSchema.table(
  "return_orders",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: integer("tenant_id").notNull(),
    ...nameColumn,
    sourceOrderId: uuid("source_order_id").notNull(),
    partnerId: uuid("partner_id").notNull(),
    status: returnStatusEnum("status").notNull().default("draft"),
    reasonCodeId: uuid("reason_code_id"),
    approvedBy: integer("approved_by"),
    approvedDate: timestamp("approved_date", { withTimezone: true }),
    notes: text("notes"),
    /** Financial-commit boundary when return is credited / posted (links to same truth model as sales orders). */
    truthBindingId: uuid("truth_binding_id"),
    ...timestampColumns,
    ...softDeleteColumns,
    ...auditColumns(() => users.userId),
  },
  (table) => [
    index("idx_sales_return_orders_tenant").on(table.tenantId),
    index("idx_sales_return_orders_source_order").on(table.tenantId, table.sourceOrderId),
    index("idx_sales_return_orders_partner").on(table.tenantId, table.partnerId),
    index("idx_sales_return_orders_status").on(table.tenantId, table.status, table.updatedAt),
    index("idx_sales_return_orders_reason").on(table.tenantId, table.reasonCodeId),
    index("idx_sales_return_orders_truth_binding").on(table.tenantId, table.truthBindingId),
    check(
      "chk_sales_return_orders_approved_requires_actor",
      sql`${table.status} <> 'approved' OR (${table.approvedBy} IS NOT NULL AND ${table.approvedDate} IS NOT NULL)`
    ),
    check(
      "chk_sales_return_orders_progressed_requires_approval",
      sql`${table.status} IN ('draft', 'cancelled') OR (${table.approvedBy} IS NOT NULL AND ${table.approvedDate} IS NOT NULL)`
    ),
    check(
      "chk_sales_return_orders_credited_requires_reason",
      sql`${table.status} <> 'credited' OR ${table.reasonCodeId} IS NOT NULL`
    ),
    foreignKey({
      columns: [table.tenantId],
      foreignColumns: [tenants.tenantId],
      name: "fk_sales_return_orders_tenant",
    })
      .onDelete("restrict")
      .onUpdate("cascade"),
    foreignKey({
      columns: [table.sourceOrderId],
      foreignColumns: [salesOrders.id],
      name: "fk_sales_return_orders_source_order",
    })
      .onDelete("restrict")
      .onUpdate("cascade"),
    foreignKey({
      columns: [table.partnerId],
      foreignColumns: [partners.id],
      name: "fk_sales_return_orders_partner",
    })
      .onDelete("restrict")
      .onUpdate("cascade"),
    foreignKey({
      columns: [table.reasonCodeId],
      foreignColumns: [returnReasonCodes.id],
      name: "fk_sales_return_orders_reason_code",
    })
      .onDelete("set null")
      .onUpdate("cascade"),
    foreignKey({
      columns: [table.approvedBy],
      foreignColumns: [users.userId],
      name: "fk_sales_return_orders_approved_by",
    })
      .onDelete("set null")
      .onUpdate("cascade"),
    foreignKey({
      columns: [table.truthBindingId],
      foreignColumns: [documentTruthBindings.id],
      name: "fk_sales_return_orders_truth_binding",
    })
      .onDelete("set null")
      .onUpdate("cascade"),
    ...tenantIsolationPolicies("sales_return_orders"),
    serviceBypassPolicy("sales_return_orders"),
  ]
);

export const returnOrderLines = salesSchema.table(
  "return_order_lines",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: integer("tenant_id").notNull(),
    returnOrderId: uuid("return_order_id").notNull(),
    sourceLineId: uuid("source_line_id"),
    productId: uuid("product_id").notNull(),
    quantity: numeric("quantity", { precision: 12, scale: 4 }).notNull().default("0"),
    condition: returnConditionEnum("condition").notNull().default("used"),
    unitPrice: numeric("unit_price", { precision: 14, scale: 2 }).notNull().default("0"),
    creditAmount: numeric("credit_amount", { precision: 14, scale: 2 }).notNull().default("0"),
    /** Optional link to the original sale line’s frozen price resolution (replay / credit traceability). */
    sourcePriceResolutionId: uuid("source_price_resolution_id"),
    notes: text("notes"),
    ...timestampColumns,
    ...auditColumns(() => users.userId),
  },
  (table) => [
    index("idx_sales_return_order_lines_tenant").on(table.tenantId),
    index("idx_sales_return_order_lines_return_order").on(table.tenantId, table.returnOrderId),
    index("idx_sales_return_order_lines_source_line").on(table.tenantId, table.sourceLineId),
    index("idx_sales_return_order_lines_product").on(table.tenantId, table.productId),
    index("idx_sales_return_order_lines_source_price_resolution").on(
      table.tenantId,
      table.sourcePriceResolutionId
    ),
    check("chk_sales_return_order_lines_quantity_positive", sql`${table.quantity} > 0`),
    check("chk_sales_return_order_lines_unit_price_non_negative", sql`${table.unitPrice} >= 0`),
    check("chk_sales_return_order_lines_credit_non_negative", sql`${table.creditAmount} >= 0`),
    foreignKey({
      columns: [table.tenantId],
      foreignColumns: [tenants.tenantId],
      name: "fk_sales_return_order_lines_tenant",
    })
      .onDelete("restrict")
      .onUpdate("cascade"),
    foreignKey({
      columns: [table.returnOrderId],
      foreignColumns: [returnOrders.id],
      name: "fk_sales_return_order_lines_return_order",
    })
      .onDelete("cascade")
      .onUpdate("cascade"),
    foreignKey({
      columns: [table.sourceLineId],
      foreignColumns: [salesOrderLines.id],
      name: "fk_sales_return_order_lines_source_line",
    })
      .onDelete("set null")
      .onUpdate("cascade"),
    foreignKey({
      columns: [table.productId],
      foreignColumns: [products.id],
      name: "fk_sales_return_order_lines_product",
    })
      .onDelete("restrict")
      .onUpdate("cascade"),
    foreignKey({
      columns: [table.sourcePriceResolutionId],
      foreignColumns: [priceResolutions.id],
      name: "fk_sales_return_order_lines_source_price_resolution",
    })
      .onDelete("set null")
      .onUpdate("cascade"),
    ...tenantIsolationPolicies("sales_return_order_lines"),
    serviceBypassPolicy("sales_return_order_lines"),
  ]
);

export const returnReasonCodeSelectSchema = createSelectSchema(returnReasonCodes);
export const returnOrderSelectSchema = createSelectSchema(returnOrders);
export const returnOrderLineSelectSchema = createSelectSchema(returnOrderLines);

export const returnReasonCodeInsertSchema = createInsertSchema(returnReasonCodes, {
  id: ReturnReasonCodeIdSchema.optional(),
  tenantId: z.number().int().positive(),
  code: z.string().min(1).max(80),
  name: z.string().min(1).max(200),
  requiresInspection: z.boolean().optional(),
  restockPolicy: RestockPolicySchema.optional(),
  isActive: z.boolean().optional(),
  createdBy: z.number().int().positive(),
  updatedBy: z.number().int().positive(),
});

export const returnOrderInsertSchema = createInsertSchema(returnOrders, {
  id: ReturnOrderIdSchema.optional(),
  tenantId: z.number().int().positive(),
  name: z.string().min(1).max(200),
  sourceOrderId: SalesOrderIdSchema,
  partnerId: PartnerIdSchema,
  status: ReturnStatusSchema.optional(),
  reasonCodeId: ReturnReasonCodeIdSchema.optional().nullable(),
  approvedBy: z.number().int().positive().optional().nullable(),
  approvedDate: dateOnlyWire.optional().nullable(),
  notes: z.string().max(4000).optional().nullable(),
  truthBindingId: DocumentTruthBindingIdSchema.optional().nullable(),
  createdBy: z.number().int().positive(),
  updatedBy: z.number().int().positive(),
});

export const returnOrderLineInsertSchema = createInsertSchema(returnOrderLines, {
  id: ReturnOrderLineIdSchema.optional(),
  tenantId: z.number().int().positive(),
  returnOrderId: ReturnOrderIdSchema,
  sourceLineId: SalesOrderLineIdSchema.optional().nullable(),
  productId: ProductIdSchema,
  quantity: quantityStringSchema,
  condition: ReturnConditionSchema.optional(),
  unitPrice: positiveMoneyStringSchema.optional(),
  creditAmount: positiveMoneyStringSchema.optional(),
  sourcePriceResolutionId: PriceResolutionIdSchema.optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
  createdBy: z.number().int().positive(),
  updatedBy: z.number().int().positive(),
});

export const returnReasonCodeUpdateSchema = createUpdateSchema(returnReasonCodes);
export const returnOrderUpdateSchema = createUpdateSchema(returnOrders);
export const returnOrderLineUpdateSchema = createUpdateSchema(returnOrderLines);

export type ReturnReasonCode = typeof returnReasonCodes.$inferSelect;
export type NewReturnReasonCode = typeof returnReasonCodes.$inferInsert;
export type ReturnOrder = typeof returnOrders.$inferSelect;
export type NewReturnOrder = typeof returnOrders.$inferInsert;
export type ReturnOrderLine = typeof returnOrderLines.$inferSelect;
export type NewReturnOrderLine = typeof returnOrderLines.$inferInsert;
