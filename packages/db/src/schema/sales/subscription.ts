import { sql } from "drizzle-orm";
import { createInsertSchema, createSelectSchema, createUpdateSchema } from "drizzle-orm/zod";
import {
  boolean,
  check,
  customType,
  foreignKey,
  index,
  integer,
  jsonb,
  numeric,
  pgPolicy,
  timestamp,
  text,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { z } from "zod/v4";

import {
  appUserRole,
  serviceBypassPolicy,
  tenantInsertPolicy,
  tenantIsolationPolicies,
  tenantSelectPolicy,
} from "../../rls-policies/index.js";
import {
  auditColumns,
  nameColumn,
  softDeleteColumns,
  timestampColumns,
} from "../../column-kit/index.js";
import { dateOnlyWire, instantWire } from "../../wire/temporal.js";
import { tenants } from "../core/tenants.js";
import { currencies, unitsOfMeasure } from "../reference/index.js";
import { users } from "../security/index.js";
import {
  SubscriptionBillingPeriodSchema,
  subscriptionBillingPeriodEnum,
  SubscriptionLogEventTypeSchema,
  subscriptionLogEventTypeEnum,
  SubscriptionStatusSchema,
} from "./_enums.js";
import {
  discountStringSchema,
  PaymentTermIdSchema,
  PricelistIdSchema,
  PartnerIdSchema,
  positiveMoneyStringSchema,
  ProductIdSchema,
  quantityStringSchema,
  SubscriptionCloseReasonIdSchema,
  SubscriptionIdSchema,
  SubscriptionLineIdSchema,
  SubscriptionLogIdSchema,
  SubscriptionTemplateIdSchema,
} from "./_zodShared.js";
import { salesSchema } from "./_schema.js";

import { partners } from "./partner.js";
import { products } from "./product.js";
import { paymentTerms, pricelists } from "./pricing.js";

const tstzrange = customType<{ data: string; driverData: string }>({
  dataType() {
    return "tstzrange";
  },
});

/**
 * Temporal overlap for billable subscription periods is enforced in PostgreSQL with
 * `EXCLUDE USING gist` on `billing_overlap_period` (see migration
 * `20260401120000_sales_subscription_truth_kernel` and `truth-supplemental-triggers.sql`).
 * Drizzle does not model EXCLUDE constraints; keep generated `tstzrange` + SQL in sync.
 *
 * Lookup rows for `subscriptions.status` (code is the FK target). Add rows without
 * changing column types; overlap prevention uses status codes in a generated range (see subscriptions).
 */
export const subscriptionStatuses = salesSchema.table(
  "subscription_statuses",
  {
    code: text("code").primaryKey(),
    ...nameColumn,
    sortOrder: integer("sort_order").notNull().default(0),
  },
  (table) => [
    index("idx_sales_subscription_statuses_sort").on(table.sortOrder),
    pgPolicy("sales_subscription_statuses_select", {
      as: "permissive",
      for: "select",
      to: appUserRole,
      using: sql`true`,
    }),
    serviceBypassPolicy("sales_subscription_statuses"),
  ]
);

export const subscriptionCloseReasons = salesSchema.table(
  "subscription_close_reasons",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: integer("tenant_id").notNull(),
    code: text("code").notNull(),
    ...nameColumn,
    isChurn: boolean("is_churn").notNull().default(true),
    isActive: boolean("is_active").notNull().default(true),
    ...timestampColumns,
    ...softDeleteColumns,
    ...auditColumns(() => users.userId),
  },
  (table) => [
    index("idx_sales_subscription_close_reasons_tenant").on(table.tenantId),
    index("idx_sales_subscription_close_reasons_churn").on(table.tenantId, table.isChurn),
    uniqueIndex("uq_sales_subscription_close_reasons_code")
      .on(table.tenantId, sql`lower(${table.code})`)
      .where(sql`${table.deletedAt} IS NULL`),
    uniqueIndex("uq_sales_subscription_close_reasons_name")
      .on(table.tenantId, sql`lower(${table.name})`)
      .where(sql`${table.deletedAt} IS NULL`),
    foreignKey({
      columns: [table.tenantId],
      foreignColumns: [tenants.tenantId],
      name: "fk_sales_subscription_close_reasons_tenant",
    })
      .onDelete("restrict")
      .onUpdate("cascade"),
    ...tenantIsolationPolicies("sales_subscription_close_reasons"),
    serviceBypassPolicy("sales_subscription_close_reasons"),
  ]
);

export const subscriptionTemplates = salesSchema.table(
  "subscription_templates",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: integer("tenant_id").notNull(),
    ...nameColumn,
    billingPeriod: subscriptionBillingPeriodEnum("billing_period").notNull().default("monthly"),
    billingDay: integer("billing_day").notNull().default(1),
    autoRenew: boolean("auto_renew").notNull().default(true),
    renewalPeriod: integer("renewal_period").notNull().default(1),
    paymentTermId: uuid("payment_term_id"),
    pricelistId: uuid("pricelist_id"),
    notes: text("notes"),
    isActive: boolean("is_active").notNull().default(true),
    ...timestampColumns,
    ...softDeleteColumns,
    ...auditColumns(() => users.userId),
  },
  (table) => [
    index("idx_sales_subscription_templates_tenant").on(table.tenantId),
    index("idx_sales_subscription_templates_active").on(table.tenantId, table.isActive),
    index("idx_sales_subscription_templates_payment_term").on(table.tenantId, table.paymentTermId),
    index("idx_sales_subscription_templates_pricelist").on(table.tenantId, table.pricelistId),
    uniqueIndex("uq_sales_subscription_templates_name")
      .on(table.tenantId, sql`lower(${table.name})`)
      .where(sql`${table.deletedAt} IS NULL`),
    check(
      "chk_sales_subscription_templates_billing_day_range",
      sql`${table.billingDay} BETWEEN 1 AND 31`
    ),
    check(
      "chk_sales_subscription_templates_renewal_period_positive",
      sql`${table.renewalPeriod} > 0`
    ),
    foreignKey({
      columns: [table.tenantId],
      foreignColumns: [tenants.tenantId],
      name: "fk_sales_subscription_templates_tenant",
    })
      .onDelete("restrict")
      .onUpdate("cascade"),
    foreignKey({
      columns: [table.paymentTermId],
      foreignColumns: [paymentTerms.id],
      name: "fk_sales_subscription_templates_payment_term",
    })
      .onDelete("set null")
      .onUpdate("cascade"),
    foreignKey({
      columns: [table.pricelistId],
      foreignColumns: [pricelists.id],
      name: "fk_sales_subscription_templates_pricelist",
    })
      .onDelete("set null")
      .onUpdate("cascade"),
    ...tenantIsolationPolicies("sales_subscription_templates"),
    serviceBypassPolicy("sales_subscription_templates"),
  ]
);

export const subscriptions = salesSchema.table(
  "subscriptions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: integer("tenant_id").notNull(),
    ...nameColumn,
    partnerId: uuid("partner_id").notNull(),
    templateId: uuid("template_id").notNull(),
    status: text("status").notNull().default("draft"),
    dateStart: timestamp("date_start", { withTimezone: true }).notNull(),
    dateEnd: timestamp("date_end", { withTimezone: true }),
    nextInvoiceDate: timestamp("next_invoice_date", { withTimezone: true }).notNull(),
    recurringTotal: numeric("recurring_total", { precision: 14, scale: 2 }).notNull().default("0"),
    mrr: numeric("mrr", { precision: 14, scale: 2 }).notNull().default("0"),
    arr: numeric("arr", { precision: 14, scale: 2 }).notNull().default("0"),
    /** Monotonic optimistic-lock / replay cursor; bump on each domain mutation. */
    truthRevision: integer("truth_revision").notNull().default(1),
    /** When set, `mrr` / `arr` / `recurring_total` are treated as locked commercial truth (see `pricing_snapshot`). */
    pricingLockedAt: timestamp("pricing_locked_at", { withTimezone: true }),
    pricingSnapshot: jsonb("pricing_snapshot")
      .notNull()
      .default(sql`'{}'::jsonb`),
    /** Canonical instant that billing-cycle math anchors to (usually first activation). */
    billingAnchorDate: timestamp("billing_anchor_date", { withTimezone: true }).notNull(),
    /** Denormalized from template pricelist at pricing lock; nullable when template has no pricelist. */
    currencyId: integer("currency_id"),
    closeReasonId: uuid("close_reason_id"),
    lastInvoicedAt: timestamp("last_invoiced_at", { withTimezone: true }),
    notes: text("notes"),
    ...timestampColumns,
    ...softDeleteColumns,
    billingOverlapPeriod: tstzrange("billing_overlap_period")
      .generatedAlwaysAs(
        sql`CASE
          WHEN deleted_at IS NULL AND status IN ('active', 'past_due', 'paused')
          THEN tstzrange(date_start, COALESCE(date_end, 'infinity'::timestamptz), '[)')
          ELSE 'empty'::tstzrange
        END`
      )
      .notNull(),
    ...auditColumns(() => users.userId),
  },
  (table) => [
    index("idx_sales_subscriptions_tenant").on(table.tenantId),
    index("idx_sales_subscriptions_partner").on(table.tenantId, table.partnerId),
    index("idx_sales_subscriptions_template").on(table.tenantId, table.templateId),
    index("idx_sales_subscriptions_status").on(table.tenantId, table.status, table.nextInvoiceDate),
    index("idx_sales_subscriptions_tenant_next_invoice").on(table.tenantId, table.nextInvoiceDate),
    index("idx_sales_subscriptions_close_reason").on(table.tenantId, table.closeReasonId),
    uniqueIndex("uq_sales_subscriptions_name")
      .on(table.tenantId, sql`lower(${table.name})`)
      .where(sql`${table.deletedAt} IS NULL`),
    check(
      "chk_sales_subscriptions_end_after_start",
      sql`${table.dateEnd} IS NULL OR ${table.dateEnd} >= ${table.dateStart}`
    ),
    check(
      "chk_sales_subscriptions_recurring_total_non_negative",
      sql`${table.recurringTotal} >= 0`
    ),
    check("chk_sales_subscriptions_mrr_non_negative", sql`${table.mrr} >= 0`),
    check("chk_sales_subscriptions_arr_non_negative", sql`${table.arr} >= 0`),
    check("chk_sales_subscriptions_arr_consistency", sql`${table.arr} = ${table.mrr} * 12`),
    check(
      "chk_sales_subscriptions_closed_requires_end_date",
      sql`${table.status} NOT IN ('cancelled', 'expired') OR ${table.dateEnd} IS NOT NULL`
    ),
    foreignKey({
      columns: [table.tenantId],
      foreignColumns: [tenants.tenantId],
      name: "fk_sales_subscriptions_tenant",
    })
      .onDelete("restrict")
      .onUpdate("cascade"),
    foreignKey({
      columns: [table.status],
      foreignColumns: [subscriptionStatuses.code],
      name: "fk_sales_subscriptions_status",
    })
      .onDelete("restrict")
      .onUpdate("cascade"),
    foreignKey({
      columns: [table.partnerId],
      foreignColumns: [partners.id],
      name: "fk_sales_subscriptions_partner",
    })
      .onDelete("restrict")
      .onUpdate("cascade"),
    foreignKey({
      columns: [table.templateId],
      foreignColumns: [subscriptionTemplates.id],
      name: "fk_sales_subscriptions_template",
    })
      .onDelete("restrict")
      .onUpdate("cascade"),
    foreignKey({
      columns: [table.closeReasonId],
      foreignColumns: [subscriptionCloseReasons.id],
      name: "fk_sales_subscriptions_close_reason",
    })
      .onDelete("set null")
      .onUpdate("cascade"),
    foreignKey({
      columns: [table.currencyId],
      foreignColumns: [currencies.currencyId],
      name: "fk_sales_subscriptions_currency",
    })
      .onDelete("restrict")
      .onUpdate("cascade"),
    ...tenantIsolationPolicies("sales_subscriptions"),
    serviceBypassPolicy("sales_subscriptions"),
  ]
);

/** Append-only pricing truth rows (recompute = new row, never update). */
export const subscriptionPricingResolutions = salesSchema.table(
  "subscription_pricing_resolutions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: integer("tenant_id").notNull(),
    subscriptionId: uuid("subscription_id").notNull(),
    resolutionRevision: integer("resolution_revision").notNull(),
    lockedAt: timestamp("locked_at", { withTimezone: true }).notNull().defaultNow(),
    snapshot: jsonb("snapshot").notNull(),
    recurringTotal: numeric("recurring_total", { precision: 14, scale: 2 }).notNull(),
    mrr: numeric("mrr", { precision: 14, scale: 2 }).notNull(),
    arr: numeric("arr", { precision: 14, scale: 2 }).notNull(),
  },
  (table) => [
    index("idx_sales_subscription_pricing_resolutions_tenant").on(table.tenantId),
    index("idx_sales_subscription_pricing_resolutions_subscription").on(
      table.tenantId,
      table.subscriptionId
    ),
    uniqueIndex("uq_sales_subscription_pricing_resolutions_sub_rev").on(
      table.tenantId,
      table.subscriptionId,
      table.resolutionRevision
    ),
    foreignKey({
      columns: [table.tenantId],
      foreignColumns: [tenants.tenantId],
      name: "fk_sales_subscription_pricing_resolutions_tenant",
    })
      .onDelete("restrict")
      .onUpdate("cascade"),
    foreignKey({
      columns: [table.subscriptionId],
      foreignColumns: [subscriptions.id],
      name: "fk_sales_subscription_pricing_resolutions_subscription",
    })
      .onDelete("cascade")
      .onUpdate("cascade"),
    ...tenantIsolationPolicies("sales_subscription_pricing_resolutions"),
    tenantSelectPolicy("sales_subscription_pricing_resolutions"),
    tenantInsertPolicy("sales_subscription_pricing_resolutions"),
    serviceBypassPolicy("sales_subscription_pricing_resolutions"),
  ]
);

export const subscriptionLines = salesSchema.table(
  "subscription_lines",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: integer("tenant_id").notNull(),
    subscriptionId: uuid("subscription_id").notNull(),
    productId: uuid("product_id").notNull(),
    uomId: integer("uom_id").notNull(),
    quantity: numeric("quantity", { precision: 12, scale: 4 }).notNull().default("1"),
    priceUnit: numeric("price_unit", { precision: 14, scale: 2 }).notNull().default("0"),
    discount: numeric("discount", { precision: 6, scale: 4 }).notNull().default("0"),
    subtotal: numeric("subtotal", { precision: 14, scale: 2 })
      .generatedAlwaysAs(
        sql`round((quantity * price_unit * (1 - discount / 100.0))::numeric, 2)`
      )
      .notNull(),
    sequence: integer("sequence").notNull().default(10),
    ...timestampColumns,
    ...auditColumns(() => users.userId),
  },
  (table) => [
    index("idx_sales_subscription_lines_tenant").on(table.tenantId),
    index("idx_sales_subscription_lines_subscription").on(table.tenantId, table.subscriptionId),
    index("idx_sales_subscription_lines_product").on(table.tenantId, table.productId),
    index("idx_sales_subscription_lines_uom").on(table.tenantId, table.uomId),
    uniqueIndex("uq_sales_subscription_lines_sequence").on(
      table.tenantId,
      table.subscriptionId,
      table.sequence
    ),
    check("chk_sales_subscription_lines_quantity_positive", sql`${table.quantity} > 0`),
    check("chk_sales_subscription_lines_price_non_negative", sql`${table.priceUnit} >= 0`),
    check(
      "chk_sales_subscription_lines_discount_percentage",
      sql`${table.discount} >= 0 AND ${table.discount} <= 100`
    ),
    check("chk_sales_subscription_lines_subtotal_non_negative", sql`${table.subtotal} >= 0`),
    check("chk_sales_subscription_lines_sequence_non_negative", sql`${table.sequence} >= 0`),
    foreignKey({
      columns: [table.tenantId],
      foreignColumns: [tenants.tenantId],
      name: "fk_sales_subscription_lines_tenant",
    })
      .onDelete("restrict")
      .onUpdate("cascade"),
    foreignKey({
      columns: [table.subscriptionId],
      foreignColumns: [subscriptions.id],
      name: "fk_sales_subscription_lines_subscription",
    })
      .onDelete("cascade")
      .onUpdate("cascade"),
    foreignKey({
      columns: [table.productId],
      foreignColumns: [products.id],
      name: "fk_sales_subscription_lines_product",
    })
      .onDelete("restrict")
      .onUpdate("cascade"),
    foreignKey({
      columns: [table.uomId],
      foreignColumns: [unitsOfMeasure.uomId],
      name: "fk_sales_subscription_lines_uom",
    })
      .onDelete("restrict")
      .onUpdate("cascade"),
    ...tenantIsolationPolicies("sales_subscription_lines"),
    serviceBypassPolicy("sales_subscription_lines"),
  ]
);

export const subscriptionLogs = salesSchema.table(
  "subscription_logs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: integer("tenant_id").notNull(),
    subscriptionId: uuid("subscription_id").notNull(),
    eventType: subscriptionLogEventTypeEnum("event_type").notNull().default("created"),
    oldMrr: numeric("old_mrr", { precision: 14, scale: 2 }).notNull().default("0"),
    newMrr: numeric("new_mrr", { precision: 14, scale: 2 }).notNull().default("0"),
    changeReason: text("change_reason"),
    eventAt: timestamp("event_at", { withTimezone: true }).notNull().defaultNow(),
    actorId: integer("actor_id"),
    ...timestampColumns,
    ...auditColumns(() => users.userId),
  },
  (table) => [
    index("idx_sales_subscription_logs_tenant").on(table.tenantId),
    index("idx_sales_subscription_logs_subscription").on(table.tenantId, table.subscriptionId),
    index("idx_sales_subscription_logs_event").on(table.tenantId, table.eventType, table.eventAt),
    check("chk_sales_subscription_logs_old_mrr_non_negative", sql`${table.oldMrr} >= 0`),
    check("chk_sales_subscription_logs_new_mrr_non_negative", sql`${table.newMrr} >= 0`),
    foreignKey({
      columns: [table.tenantId],
      foreignColumns: [tenants.tenantId],
      name: "fk_sales_subscription_logs_tenant",
    })
      .onDelete("restrict")
      .onUpdate("cascade"),
    foreignKey({
      columns: [table.subscriptionId],
      foreignColumns: [subscriptions.id],
      name: "fk_sales_subscription_logs_subscription",
    })
      .onDelete("cascade")
      .onUpdate("cascade"),
    foreignKey({
      columns: [table.actorId],
      foreignColumns: [users.userId],
      name: "fk_sales_subscription_logs_actor",
    })
      .onDelete("set null")
      .onUpdate("cascade"),
    ...tenantIsolationPolicies("sales_subscription_logs"),
    serviceBypassPolicy("sales_subscription_logs"),
  ]
);

/** Append-only compliance trail (no update/delete policies for `app_user`). */
export const subscriptionComplianceAudit = salesSchema.table(
  "subscription_compliance_audit",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: integer("tenant_id").notNull(),
    subscriptionId: uuid("subscription_id").notNull(),
    changeKind: text("change_kind").notNull(),
    payload: jsonb("payload").notNull(),
    actorId: integer("actor_id"),
    recordedAt: timestamp("recorded_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_sales_subscription_compliance_audit_tenant").on(table.tenantId),
    index("idx_sales_subscription_compliance_audit_subscription").on(
      table.tenantId,
      table.subscriptionId
    ),
    index("idx_sales_subscription_compliance_audit_recorded").on(table.tenantId, table.recordedAt),
    foreignKey({
      columns: [table.tenantId],
      foreignColumns: [tenants.tenantId],
      name: "fk_sales_subscription_compliance_audit_tenant",
    })
      .onDelete("restrict")
      .onUpdate("cascade"),
    foreignKey({
      columns: [table.subscriptionId],
      foreignColumns: [subscriptions.id],
      name: "fk_sales_subscription_compliance_audit_subscription",
    })
      .onDelete("restrict")
      .onUpdate("cascade"),
    foreignKey({
      columns: [table.actorId],
      foreignColumns: [users.userId],
      name: "fk_sales_subscription_compliance_audit_actor",
    })
      .onDelete("set null")
      .onUpdate("cascade"),
    tenantSelectPolicy("sales_subscription_compliance_audit"),
    tenantInsertPolicy("sales_subscription_compliance_audit"),
    serviceBypassPolicy("sales_subscription_compliance_audit"),
  ]
);

export const subscriptionTemplateSelectSchema = createSelectSchema(subscriptionTemplates);
export const subscriptionSelectSchema = createSelectSchema(subscriptions);
export const subscriptionLineSelectSchema = createSelectSchema(subscriptionLines);
export const subscriptionLogSelectSchema = createSelectSchema(subscriptionLogs);
export const subscriptionCloseReasonSelectSchema = createSelectSchema(subscriptionCloseReasons);
export const subscriptionStatusSelectSchema = createSelectSchema(subscriptionStatuses);
export const subscriptionComplianceAuditSelectSchema = createSelectSchema(subscriptionComplianceAudit);

export const subscriptionTemplateInsertSchema = createInsertSchema(subscriptionTemplates, {
  id: SubscriptionTemplateIdSchema.optional(),
  tenantId: z.number().int().positive(),
  name: z.string().min(1).max(200),
  billingPeriod: SubscriptionBillingPeriodSchema.optional(),
  billingDay: z.number().int().min(1).max(31).optional(),
  autoRenew: z.boolean().optional(),
  renewalPeriod: z.number().int().positive().optional(),
  paymentTermId: PaymentTermIdSchema.optional().nullable(),
  pricelistId: PricelistIdSchema.optional().nullable(),
  notes: z.string().max(4000).optional().nullable(),
  isActive: z.boolean().optional(),
  createdBy: z.number().int().positive(),
  updatedBy: z.number().int().positive(),
});

export const subscriptionCloseReasonInsertSchema = createInsertSchema(subscriptionCloseReasons, {
  id: SubscriptionCloseReasonIdSchema.optional(),
  tenantId: z.number().int().positive(),
  code: z.string().min(1).max(80),
  name: z.string().min(1).max(200),
  isChurn: z.boolean().optional(),
  isActive: z.boolean().optional(),
  createdBy: z.number().int().positive(),
  updatedBy: z.number().int().positive(),
});

export const subscriptionInsertSchema = createInsertSchema(subscriptions, {
  id: SubscriptionIdSchema.optional(),
  tenantId: z.number().int().positive(),
  name: z.string().min(1).max(200),
  partnerId: PartnerIdSchema,
  templateId: SubscriptionTemplateIdSchema,
  status: SubscriptionStatusSchema.optional(),
  dateStart: dateOnlyWire,
  dateEnd: dateOnlyWire.optional().nullable(),
  nextInvoiceDate: dateOnlyWire,
  billingAnchorDate: dateOnlyWire,
  truthRevision: z.number().int().positive().optional(),
  pricingLockedAt: instantWire.optional().nullable(),
  pricingSnapshot: z.record(z.string(), z.unknown()).optional(),
  currencyId: z.number().int().positive().optional().nullable(),
  recurringTotal: positiveMoneyStringSchema.optional(),
  mrr: positiveMoneyStringSchema.optional(),
  arr: positiveMoneyStringSchema.optional(),
  closeReasonId: SubscriptionCloseReasonIdSchema.optional().nullable(),
  lastInvoicedAt: instantWire.optional().nullable(),
  notes: z.string().max(4000).optional().nullable(),
  createdBy: z.number().int().positive(),
  updatedBy: z.number().int().positive(),
});

export const subscriptionLineInsertSchema = createInsertSchema(subscriptionLines, {
  id: SubscriptionLineIdSchema.optional(),
  tenantId: z.number().int().positive(),
  subscriptionId: SubscriptionIdSchema,
  productId: ProductIdSchema,
  uomId: z.number().int().positive(),
  quantity: quantityStringSchema.optional(),
  priceUnit: positiveMoneyStringSchema.optional(),
  discount: discountStringSchema.optional(),
  sequence: z.number().int().min(0).optional(),
  createdBy: z.number().int().positive(),
  updatedBy: z.number().int().positive(),
});

export const subscriptionComplianceAuditInsertSchema = createInsertSchema(subscriptionComplianceAudit, {
  id: z.uuid().optional(),
  tenantId: z.number().int().positive(),
  subscriptionId: SubscriptionIdSchema,
  changeKind: z.string().min(1).max(120),
  payload: z.record(z.string(), z.unknown()),
  actorId: z.number().int().positive().optional().nullable(),
  recordedAt: instantWire.optional(),
});

export const subscriptionLogInsertSchema = createInsertSchema(subscriptionLogs, {
  id: SubscriptionLogIdSchema.optional(),
  tenantId: z.number().int().positive(),
  subscriptionId: SubscriptionIdSchema,
  eventType: SubscriptionLogEventTypeSchema.optional(),
  oldMrr: positiveMoneyStringSchema.optional(),
  newMrr: positiveMoneyStringSchema.optional(),
  changeReason: z.string().max(2000).optional().nullable(),
  eventAt: instantWire.optional(),
  actorId: z.number().int().positive().optional().nullable(),
  createdBy: z.number().int().positive(),
  updatedBy: z.number().int().positive(),
});

export const subscriptionTemplateUpdateSchema = createUpdateSchema(subscriptionTemplates);
export const subscriptionUpdateSchema = createUpdateSchema(subscriptions);
export const subscriptionLineUpdateSchema = createUpdateSchema(subscriptionLines);
export const subscriptionLogUpdateSchema = createUpdateSchema(subscriptionLogs);
export const subscriptionCloseReasonUpdateSchema = createUpdateSchema(subscriptionCloseReasons);

export type SubscriptionTemplate = typeof subscriptionTemplates.$inferSelect;
export type NewSubscriptionTemplate = typeof subscriptionTemplates.$inferInsert;
export type Subscription = typeof subscriptions.$inferSelect;
export type NewSubscription = typeof subscriptions.$inferInsert;
export type SubscriptionLine = typeof subscriptionLines.$inferSelect;
export type NewSubscriptionLine = typeof subscriptionLines.$inferInsert;
export type SubscriptionLog = typeof subscriptionLogs.$inferSelect;
export type NewSubscriptionLog = typeof subscriptionLogs.$inferInsert;
export type SubscriptionCloseReason = typeof subscriptionCloseReasons.$inferSelect;
export type NewSubscriptionCloseReason = typeof subscriptionCloseReasons.$inferInsert;
export type SubscriptionStatusRow = typeof subscriptionStatuses.$inferSelect;
export type SubscriptionComplianceAuditEntry = typeof subscriptionComplianceAudit.$inferSelect;
export type NewSubscriptionComplianceAuditEntry = typeof subscriptionComplianceAudit.$inferInsert;
export type SubscriptionPricingResolution = typeof subscriptionPricingResolutions.$inferSelect;
export type NewSubscriptionPricingResolution = typeof subscriptionPricingResolutions.$inferInsert;
