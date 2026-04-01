import { sql } from "drizzle-orm";
import { createInsertSchema, createSelectSchema, createUpdateSchema } from "drizzle-orm/zod";
import {
  boolean,
  check,
  date,
  foreignKey,
  index,
  integer,
  jsonb,
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
import { currencies } from "../reference/index.js";
import { users } from "../security/index.js";
import {
  CommissionBaseSchema,
  commissionBaseEnum,
  CommissionCalculationModeSchema,
  commissionCalculationModeEnum,
  CommissionEntryStatusSchema,
  commissionEntryStatusEnum,
  CommissionLiabilityStatusSchema,
  commissionLiabilityStatusEnum,
  CommissionTypeSchema,
  commissionTypeEnum,
} from "./_enums.js";
import {
  CommissionEntryIdSchema,
  DocumentTruthBindingIdSchema,
  CommissionLiabilityIdSchema,
  CommissionPlanIdSchema,
  CommissionPlanTierIdSchema,
  CommissionResolutionIdSchema,
  PaymentTermIdSchema,
  nonNegativeMoneyStringSchema,
  percentageStringSchema,
  positiveMoneyStringSchema,
  PriceResolutionIdSchema,
  SalesOrderIdSchema,
} from "./_zodShared.js";
import { salesSchema } from "./_schema.js";
import { documentTruthBindings } from "./truthBindings.js";
import { paymentTerms } from "./pricing.js";
import { priceResolutions } from "./pricingTruth.js";

import { salesOrders } from "./orders.js";

export const commissionPlans = salesSchema.table(
  "commission_plans",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: integer("tenant_id").notNull(),
    ...nameColumn,
    type: commissionTypeEnum("type").notNull().default("percentage"),
    base: commissionBaseEnum("base").notNull().default("revenue"),
    /** Interpretation of `commission_plan_tiers` when `type = tiered` (ignored for flat/percentage-without-tiers). */
    calculationMode: commissionCalculationModeEnum("calculation_mode")
      .notNull()
      .default("tiered_cumulative"),
    isActive: boolean("is_active").notNull().default(true),
    notes: text("notes"),
    ...timestampColumns,
    ...softDeleteColumns,
    ...auditColumns(() => users.userId),
  },
  (table) => [
    index("idx_sales_commission_plans_tenant").on(table.tenantId),
    index("idx_sales_commission_plans_active").on(table.tenantId, table.isActive),
    index("idx_sales_commission_plans_type_base").on(table.tenantId, table.type, table.base),
    uniqueIndex("uq_sales_commission_plans_name")
      .on(table.tenantId, sql`lower(${table.name})`)
      .where(sql`${table.deletedAt} IS NULL`),
    foreignKey({
      columns: [table.tenantId],
      foreignColumns: [tenants.tenantId],
      name: "fk_sales_commission_plans_tenant",
    })
      .onDelete("restrict")
      .onUpdate("cascade"),
    ...tenantIsolationPolicies("sales_commission_plans"),
    serviceBypassPolicy("sales_commission_plans"),
  ]
);

export const commissionPlanTiers = salesSchema.table(
  "commission_plan_tiers",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: integer("tenant_id").notNull(),
    planId: uuid("plan_id").notNull(),
    minAmount: numeric("min_amount", { precision: 14, scale: 2 }).notNull().default("0"),
    maxAmount: numeric("max_amount", { precision: 14, scale: 2 }),
    rate: numeric("rate", { precision: 9, scale: 4 }).notNull().default("0"),
    sequence: integer("sequence").notNull().default(10),
    ...timestampColumns,
    ...auditColumns(() => users.userId),
  },
  (table) => [
    index("idx_sales_commission_plan_tiers_tenant").on(table.tenantId),
    index("idx_sales_commission_plan_tiers_range").on(
      table.tenantId,
      table.planId,
      table.minAmount,
      table.maxAmount
    ),
    uniqueIndex("uq_sales_commission_plan_tiers_sequence").on(
      table.tenantId,
      table.planId,
      table.sequence
    ),
    check("chk_sales_commission_plan_tiers_min_non_negative", sql`${table.minAmount} >= 0`),
    check(
      "chk_sales_commission_plan_tiers_max_after_min",
      sql`${table.maxAmount} IS NULL OR ${table.maxAmount} >= ${table.minAmount}`
    ),
    check(
      "chk_sales_commission_plan_tiers_rate_percentage",
      sql`${table.rate} >= 0 AND ${table.rate} <= 100`
    ),
    check("chk_sales_commission_plan_tiers_sequence_non_negative", sql`${table.sequence} >= 0`),
    foreignKey({
      columns: [table.tenantId],
      foreignColumns: [tenants.tenantId],
      name: "fk_sales_commission_plan_tiers_tenant",
    })
      .onDelete("restrict")
      .onUpdate("cascade"),
    foreignKey({
      columns: [table.planId],
      foreignColumns: [commissionPlans.id],
      name: "fk_sales_commission_plan_tiers_plan",
    })
      .onDelete("cascade")
      .onUpdate("cascade"),
    ...tenantIsolationPolicies("sales_commission_plan_tiers"),
    serviceBypassPolicy("sales_commission_plan_tiers"),
  ]
);

export const commissionEntries = salesSchema.table(
  "commission_entries",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: integer("tenant_id").notNull(),
    /** Correction / replan lineage within the same natural key. */
    entryVersion: integer("entry_version").notNull().default(1),
    orderId: uuid("order_id").notNull(),
    salespersonId: integer("salesperson_id").notNull(),
    planId: uuid("plan_id").notNull(),
    /** Optional line-level price truth; order-level slices use `commission_resolutions`. */
    priceResolutionId: uuid("price_resolution_id"),
    /** Financial commit boundary this entry was materialized under (when set). */
    truthBindingId: uuid("truth_binding_id"),
    currencyId: integer("currency_id"),
    baseAmount: numeric("base_amount", { precision: 14, scale: 2 }).notNull().default("0"),
    commissionAmount: numeric("commission_amount", { precision: 14, scale: 2 })
      .notNull()
      .default("0"),
    status: commissionEntryStatusEnum("status").notNull().default("draft"),
    paidDate: date("paid_date"),
    periodStart: date("period_start").notNull(),
    periodEnd: date("period_end").notNull(),
    /** Financial lock; immutable commission truth once set (enforced in DB). */
    lockedAt: timestamp("locked_at", { withTimezone: true }),
    notes: text("notes"),
    ...timestampColumns,
    ...softDeleteColumns,
    ...auditColumns(() => users.userId),
  },
  (table) => [
    index("idx_sales_commission_entries_tenant").on(table.tenantId),
    index("idx_sales_commission_entries_order").on(table.tenantId, table.orderId),
    index("idx_sales_commission_entries_salesperson").on(table.tenantId, table.salespersonId),
    index("idx_sales_commission_entries_plan").on(table.tenantId, table.planId),
    index("idx_sales_commission_entries_order_plan_salesperson").on(
      table.tenantId,
      table.orderId,
      table.planId,
      table.salespersonId
    ),
    index("idx_sales_commission_entries_price_resolution").on(table.tenantId, table.priceResolutionId),
    index("idx_sales_commission_entries_truth_binding").on(table.tenantId, table.truthBindingId),
    index("idx_sales_commission_entries_status_period").on(
      table.tenantId,
      table.status,
      table.periodStart
    ),
    index("idx_sales_commission_entries_period_end").on(table.tenantId, table.periodEnd),
    index("idx_sales_commission_entries_locked").on(table.tenantId, table.lockedAt),
    check("chk_sales_commission_entries_base_non_negative", sql`${table.baseAmount} >= 0`),
    check("chk_sales_commission_entries_amount_non_negative", sql`${table.commissionAmount} >= 0`),
    check(
      "chk_sales_commission_entries_period_order",
      sql`${table.periodEnd} >= ${table.periodStart}`
    ),
    check(
      "chk_sales_commission_entries_paid_requires_date",
      sql`${table.status} <> 'paid' OR ${table.paidDate} IS NOT NULL`
    ),
    check(
      "chk_sales_commission_entries_locked_currency",
      sql`${table.lockedAt} IS NULL OR ${table.currencyId} IS NOT NULL`
    ),
    check("chk_sales_commission_entries_entry_version_positive", sql`${table.entryVersion} >= 1`),
    uniqueIndex("uq_sales_commission_entries_order_salesperson_plan_version")
      .on(table.tenantId, table.orderId, table.salespersonId, table.planId, table.entryVersion)
      .where(sql`${table.deletedAt} IS NULL`),
    foreignKey({
      columns: [table.tenantId],
      foreignColumns: [tenants.tenantId],
      name: "fk_sales_commission_entries_tenant",
    })
      .onDelete("restrict")
      .onUpdate("cascade"),
    foreignKey({
      columns: [table.orderId],
      foreignColumns: [salesOrders.id],
      name: "fk_sales_commission_entries_order",
    })
      .onDelete("restrict")
      .onUpdate("cascade"),
    foreignKey({
      columns: [table.salespersonId],
      foreignColumns: [users.userId],
      name: "fk_sales_commission_entries_salesperson",
    })
      .onDelete("restrict")
      .onUpdate("cascade"),
    foreignKey({
      columns: [table.planId],
      foreignColumns: [commissionPlans.id],
      name: "fk_sales_commission_entries_plan",
    })
      .onDelete("restrict")
      .onUpdate("cascade"),
    foreignKey({
      columns: [table.priceResolutionId],
      foreignColumns: [priceResolutions.id],
      name: "fk_sales_commission_entries_price_resolution",
    })
      .onDelete("restrict")
      .onUpdate("cascade"),
    foreignKey({
      columns: [table.truthBindingId],
      foreignColumns: [documentTruthBindings.id],
      name: "fk_sales_commission_entries_truth_binding",
    })
      .onDelete("set null")
      .onUpdate("cascade"),
    foreignKey({
      columns: [table.currencyId],
      foreignColumns: [currencies.currencyId],
      name: "fk_sales_commission_entries_currency",
    })
      .onDelete("restrict")
      .onUpdate("cascade"),
    ...tenantIsolationPolicies("sales_commission_entries"),
    serviceBypassPolicy("sales_commission_entries"),
  ]
);

/**
 * Minimum explainability payload for `commission_resolutions.input_snapshot` (extra keys allowed).
 */
export const commissionResolutionInputSnapshotSchema = z
  .object({
    calculation_mode: CommissionCalculationModeSchema.optional(),
    plan_type: z.string().optional(),
    tier_sequence: z.number().int().optional(),
    base_component: z.string().optional(),
  })
  .passthrough();

export type CommissionResolutionInputSnapshot = z.infer<typeof commissionResolutionInputSnapshotSchema>;

/** Audit trail: one row per calculation slice, ordered by `sequence`. */
export const commissionResolutions = salesSchema.table(
  "commission_resolutions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: integer("tenant_id").notNull(),
    commissionEntryId: uuid("commission_entry_id").notNull(),
    sequence: integer("sequence").notNull().default(1),
    inputSnapshot: jsonb("input_snapshot")
      .notNull()
      .default(sql`'{}'::jsonb`)
      .$type<CommissionResolutionInputSnapshot & Record<string, unknown>>(),
    appliedTierId: uuid("applied_tier_id"),
    baseAmount: numeric("base_amount", { precision: 14, scale: 2 }).notNull(),
    rate: numeric("rate", { precision: 9, scale: 4 }).notNull(),
    computedAmount: numeric("computed_amount", { precision: 14, scale: 2 }).notNull(),
    sourcePriceResolutionId: uuid("source_price_resolution_id"),
    resolvedAt: timestamp("resolved_at", { withTimezone: true }).notNull().defaultNow(),
    ...timestampColumns,
    ...auditColumns(() => users.userId),
  },
  (table) => [
    uniqueIndex("uq_sales_commission_resolutions_entry_sequence").on(
      table.tenantId,
      table.commissionEntryId,
      table.sequence
    ),
    index("idx_sales_commission_resolutions_tenant").on(table.tenantId),
    index("idx_sales_commission_resolutions_source_price").on(
      table.tenantId,
      table.sourcePriceResolutionId
    ),
    check("chk_sales_commission_resolutions_base_non_negative", sql`${table.baseAmount} >= 0`),
    check(
      "chk_sales_commission_resolutions_rate_bounds",
      sql`${table.rate} >= 0 AND ${table.rate} <= 100`
    ),
    check(
      "chk_sales_commission_resolutions_computed_non_negative",
      sql`${table.computedAmount} >= 0`
    ),
    check("chk_sales_commission_resolutions_sequence_positive", sql`${table.sequence} >= 1`),
    foreignKey({
      columns: [table.tenantId],
      foreignColumns: [tenants.tenantId],
      name: "fk_sales_commission_resolutions_tenant",
    })
      .onDelete("restrict")
      .onUpdate("cascade"),
    foreignKey({
      columns: [table.commissionEntryId],
      foreignColumns: [commissionEntries.id],
      name: "fk_sales_commission_resolutions_entry",
    })
      .onDelete("cascade")
      .onUpdate("cascade"),
    foreignKey({
      columns: [table.appliedTierId],
      foreignColumns: [commissionPlanTiers.id],
      name: "fk_sales_commission_resolutions_applied_tier",
    })
      .onDelete("restrict")
      .onUpdate("cascade"),
    foreignKey({
      columns: [table.sourcePriceResolutionId],
      foreignColumns: [priceResolutions.id],
      name: "fk_sales_commission_resolutions_source_price_resolution",
    })
      .onDelete("restrict")
      .onUpdate("cascade"),
    foreignKey({
      columns: [table.createdBy],
      foreignColumns: [users.userId],
      name: "fk_sales_commission_resolutions_created_by",
    })
      .onDelete("restrict")
      .onUpdate("cascade"),
    foreignKey({
      columns: [table.updatedBy],
      foreignColumns: [users.userId],
      name: "fk_sales_commission_resolutions_updated_by",
    })
      .onDelete("restrict")
      .onUpdate("cascade"),
    ...tenantIsolationPolicies("sales_commission_resolutions"),
    serviceBypassPolicy("sales_commission_resolutions"),
  ]
);

/** Payable slices per entry (installments). */
export const commissionLiabilities = salesSchema.table(
  "commission_liabilities",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: integer("tenant_id").notNull(),
    commissionEntryId: uuid("commission_entry_id").notNull(),
    installmentSeq: integer("installment_seq").notNull().default(1),
    amount: numeric("amount", { precision: 14, scale: 2 }).notNull(),
    status: commissionLiabilityStatusEnum("status").notNull().default("accrued"),
    dueDate: date("due_date"),
    paymentTermId: uuid("payment_term_id"),
    notes: text("notes"),
    ...timestampColumns,
    ...auditColumns(() => users.userId),
  },
  (table) => [
    uniqueIndex("uq_sales_commission_liabilities_entry_installment").on(
      table.tenantId,
      table.commissionEntryId,
      table.installmentSeq
    ),
    index("idx_sales_commission_liabilities_tenant").on(table.tenantId),
    index("idx_sales_commission_liabilities_status_due").on(
      table.tenantId,
      table.status,
      table.dueDate
    ),
    check("chk_sales_commission_liabilities_amount_non_negative", sql`${table.amount} >= 0`),
    check(
      "chk_sales_commission_liabilities_installment_positive",
      sql`${table.installmentSeq} >= 1`
    ),
    foreignKey({
      columns: [table.tenantId],
      foreignColumns: [tenants.tenantId],
      name: "fk_sales_commission_liabilities_tenant",
    })
      .onDelete("restrict")
      .onUpdate("cascade"),
    foreignKey({
      columns: [table.commissionEntryId],
      foreignColumns: [commissionEntries.id],
      name: "fk_sales_commission_liabilities_entry",
    })
      .onDelete("cascade")
      .onUpdate("cascade"),
    foreignKey({
      columns: [table.paymentTermId],
      foreignColumns: [paymentTerms.id],
      name: "fk_sales_commission_liabilities_payment_term",
    })
      .onDelete("set null")
      .onUpdate("cascade"),
    foreignKey({
      columns: [table.createdBy],
      foreignColumns: [users.userId],
      name: "fk_sales_commission_liabilities_created_by",
    })
      .onDelete("restrict")
      .onUpdate("cascade"),
    foreignKey({
      columns: [table.updatedBy],
      foreignColumns: [users.userId],
      name: "fk_sales_commission_liabilities_updated_by",
    })
      .onDelete("restrict")
      .onUpdate("cascade"),
    ...tenantIsolationPolicies("sales_commission_liabilities"),
    serviceBypassPolicy("sales_commission_liabilities"),
  ]
);

export const commissionPlanSelectSchema = createSelectSchema(commissionPlans);
export const commissionPlanTierSelectSchema = createSelectSchema(commissionPlanTiers);
export const commissionEntrySelectSchema = createSelectSchema(commissionEntries);
export const commissionResolutionSelectSchema = createSelectSchema(commissionResolutions);
export const commissionLiabilitySelectSchema = createSelectSchema(commissionLiabilities);

export const commissionPlanInsertSchema = createInsertSchema(commissionPlans, {
  id: CommissionPlanIdSchema.optional(),
  tenantId: z.number().int().positive(),
  name: z.string().min(1).max(200),
  type: CommissionTypeSchema.optional().default("percentage"),
  base: CommissionBaseSchema.optional().default("revenue"),
  calculationMode: CommissionCalculationModeSchema.optional().default("tiered_cumulative"),
  isActive: z.boolean().optional().default(true),
  notes: z.string().max(4000).optional().nullable(),
  createdBy: z.number().int().positive(),
  updatedBy: z.number().int().positive(),
});

export const commissionPlanTierInsertSchema = createInsertSchema(commissionPlanTiers, {
  id: CommissionPlanTierIdSchema.optional(),
  tenantId: z.number().int().positive(),
  planId: CommissionPlanIdSchema,
  minAmount: nonNegativeMoneyStringSchema.optional().default("0"),
  maxAmount: nonNegativeMoneyStringSchema.optional().nullable(),
  rate: percentageStringSchema.optional().default("0"),
  sequence: z.number().int().min(0).optional().default(10),
  createdBy: z.number().int().positive(),
  updatedBy: z.number().int().positive(),
}).superRefine((data, ctx) => {
  const min = Number(data.minAmount ?? "0");
  if (data.maxAmount != null && Number(data.maxAmount) < min) {
    ctx.addIssue({
      code: "custom",
      message: "maxAmount must be greater than or equal to minAmount",
      path: ["maxAmount"],
    });
  }
});

export const commissionEntryInsertSchema = createInsertSchema(commissionEntries, {
  id: CommissionEntryIdSchema.optional(),
  tenantId: z.number().int().positive(),
  entryVersion: z.number().int().min(1).optional().default(1),
  orderId: SalesOrderIdSchema,
  salespersonId: z.number().int().positive(),
  planId: CommissionPlanIdSchema,
  priceResolutionId: PriceResolutionIdSchema.optional().nullable(),
  truthBindingId: DocumentTruthBindingIdSchema.optional().nullable(),
  currencyId: z.number().int().positive().optional().nullable(),
  baseAmount: positiveMoneyStringSchema.optional().default("0"),
  commissionAmount: positiveMoneyStringSchema.optional().default("0"),
  status: CommissionEntryStatusSchema.optional().default("draft"),
  paidDate: dateOnlyWire.optional().nullable(),
  periodStart: dateOnlyWire,
  periodEnd: dateOnlyWire,
  notes: z.string().max(2000).optional().nullable(),
  createdBy: z.number().int().positive(),
  updatedBy: z.number().int().positive(),
}).superRefine((data, ctx) => {
  if (data.periodEnd < data.periodStart) {
    ctx.addIssue({
      code: "custom",
      message: "periodEnd must be on or after periodStart",
      path: ["periodEnd"],
    });
  }
  if (data.status === "paid" && !data.paidDate) {
    ctx.addIssue({
      code: "custom",
      message: "paidDate is required when status is paid",
      path: ["paidDate"],
    });
  }
  if (data.lockedAt != null && data.currencyId == null) {
    ctx.addIssue({
      code: "custom",
      message: "currencyId is required when lockedAt is set",
      path: ["currencyId"],
    });
  }
});

export const commissionResolutionInsertSchema = createInsertSchema(commissionResolutions, {
  id: CommissionResolutionIdSchema.optional(),
  tenantId: z.number().int().positive(),
  commissionEntryId: CommissionEntryIdSchema,
  sequence: z.number().int().min(1).optional().default(1),
  inputSnapshot: commissionResolutionInputSnapshotSchema.default({}),
  appliedTierId: CommissionPlanTierIdSchema.optional().nullable(),
  baseAmount: nonNegativeMoneyStringSchema,
  rate: percentageStringSchema,
  computedAmount: nonNegativeMoneyStringSchema,
  sourcePriceResolutionId: PriceResolutionIdSchema.optional().nullable(),
  createdBy: z.number().int().positive(),
  updatedBy: z.number().int().positive(),
});

export const commissionLiabilityInsertSchema = createInsertSchema(commissionLiabilities, {
  id: CommissionLiabilityIdSchema.optional(),
  tenantId: z.number().int().positive(),
  commissionEntryId: CommissionEntryIdSchema,
  installmentSeq: z.number().int().min(1).optional().default(1),
  amount: nonNegativeMoneyStringSchema,
  status: CommissionLiabilityStatusSchema.optional().default("accrued"),
  dueDate: dateOnlyWire.optional().nullable(),
  paymentTermId: PaymentTermIdSchema.optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
  createdBy: z.number().int().positive(),
  updatedBy: z.number().int().positive(),
});

export const commissionPlanUpdateSchema = createUpdateSchema(commissionPlans);
export const commissionPlanTierUpdateSchema = createUpdateSchema(commissionPlanTiers);
export const commissionEntryUpdateSchema = createUpdateSchema(commissionEntries);
export const commissionResolutionUpdateSchema = createUpdateSchema(commissionResolutions);
export const commissionLiabilityUpdateSchema = createUpdateSchema(commissionLiabilities);

export type CommissionPlan = typeof commissionPlans.$inferSelect;
export type NewCommissionPlan = typeof commissionPlans.$inferInsert;
export type CommissionPlanTier = typeof commissionPlanTiers.$inferSelect;
export type NewCommissionPlanTier = typeof commissionPlanTiers.$inferInsert;
export type CommissionEntry = typeof commissionEntries.$inferSelect;
export type NewCommissionEntry = typeof commissionEntries.$inferInsert;
export type CommissionResolution = typeof commissionResolutions.$inferSelect;
export type NewCommissionResolution = typeof commissionResolutions.$inferInsert;
export type CommissionLiability = typeof commissionLiabilities.$inferSelect;
export type NewCommissionLiability = typeof commissionLiabilities.$inferInsert;
