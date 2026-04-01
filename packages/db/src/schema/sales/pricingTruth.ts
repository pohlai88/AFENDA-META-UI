/**
 * Pricing truth slice: versioned line resolutions + lifecycle events.
 *
 * DB lifecycle (see migrations `20260331204500_sales_pricing_truth_phase2_locks`,
 * `20260331210000_sales_pricing_truth_phase3_events`, `20260401020000_sales_pricing_decision_lifecycle`):
 * 1) Run pricing engine: `sales_order_pricing_decisions` (draft → **final** via `finalizePricingDecision`), then
 *    `sales_order_price_resolutions` with `pricing_decision_id`, `input_snapshot`, `applied_rule_ids`, `pricing_engine_version`.
 * 2) Insert `sales_order_document_truth_links` only when decision `status = final` (DB trigger); same `pricing_decision_id`.
 * 3) Transition `sales_orders.status` → `sale`. Trigger requires truth link; syncs `locked_at` onto open resolutions.
 * 4) `document_truth_bindings` freezes totals; `truth_binding_id` is stamped on resolutions (FK enforced in DB).
 *
 * Note: `sales_order_price_resolutions.truth_binding_id` → `document_truth_bindings` is **not** declared as a Drizzle FK here
 * to avoid a TypeScript circular import with `truthBindings.ts` / `documentTruthLinks.ts`. The constraint exists in SQL.
 */
import { sql } from "drizzle-orm";
import {
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
import { createInsertSchema, createSelectSchema, createUpdateSchema } from "drizzle-orm/zod";
import { z } from "zod/v4";

import { auditColumns, timestampColumns } from "../../column-kit/index.js";
import { serviceBypassPolicy, tenantIsolationPolicies } from "../../rls-policies/index.js";
import { dateOnlyWire, instantWire } from "../../wire/temporal.js";
import { tenants } from "../core/tenants.js";
import { currencies } from "../reference/index.js";
import { users } from "../security/index.js";
import {
  PriceResolutionEventTypeSchema,
  priceResolutionEventTypeEnum,
  type PricelistAppliedOn,
} from "./_enums.js";
import { salesSchema } from "./_schema.js";
import {
  PriceResolutionEventIdSchema,
  PriceResolutionIdSchema,
  PricingDecisionIdSchema,
  PricelistIdSchema,
  ProductIdSchema,
  positiveMoneyStringSchema,
  quantityStringSchema,
} from "./_zodShared.js";
import { salesOrderLines, salesOrders } from "./orders.js";
import { pricingDecisions } from "./pricingDecisions.js";

/**
 * Deterministic rule-narrowing rank: lower number wins before `sequence` tie-break.
 * Engine implementation should filter candidates first, sort by this rank, then by `sequence`.
 */
export const PRICELIST_APPLIED_ON_PRECEDENCE: Record<PricelistAppliedOn, number> = {
  product_variant: 0,
  product_template: 1,
  product_category: 2,
  global: 3,
};

/**
 * Minimum JSON shape stored in `price_resolutions.input_snapshot` so a resolver can be replayed.
 * Keys are snake_case to match persisted JSON; extra keys are allowed for forward compatibility.
 */
export const priceResolutionSnapshotContextSchema = z
  .object({
    channel: z.string().optional(),
    warehouse: z.string().optional(),
    promotion: z.string().optional(),
  })
  .strict();

export const PriceResolutionInputSnapshotSchema = z
  .object({
    product_id: ProductIdSchema,
    quantity: quantityStringSchema,
    uom_id: z.number().int().positive(),
    pricelist_id: PricelistIdSchema,
    currency_id: z.number().int().positive(),
    customer_segment: z.string().optional(),
    date: dateOnlyWire,
    context: priceResolutionSnapshotContextSchema.optional(),
    /** Optional stable id of the rule pack / compiler version used for this snapshot. */
    ruleset_id: z.uuid().optional(),
    /** Optional content hash of normalized engine inputs (deterministic replay guard). */
    inputs_digest: z.string().min(8).max(128).optional(),
    /**
     * Deterministic pricing trace from `resolvePrice` in `pricingResolveEngine.ts` (winning rule, path, discounts,
     * rounding). Stored for replay / audit alongside `applied_rule_ids` / amounts on `price_resolutions`.
     */
    pricing_snapshot: z.record(z.string(), z.unknown()).optional(),
  })
  .strict();

export type PriceResolutionInputSnapshot = z.infer<typeof PriceResolutionInputSnapshotSchema>;

/** Positive decimal string for FX (e.g. company currency per document currency); up to 8 fractional digits. */
export const exchangeRateStringSchema = z
  .string()
  .regex(/^\d+(\.\d{1,8})?$/, "Must be a valid positive exchange rate string")
  .refine((v) => Number(v) > 0, "Exchange rate must be > 0");

/**
 * Per order line: versioned explainable price path + amounts; latest row per line is highest `resolution_version`.
 *
 * Each row is the **pure output** of `f(decision.inputs, line.input_snapshot)` for a single engine run
 * (`pricing_decision_id`): amounts + applied rules + per-line input snapshot. Mutate by inserting a new
 * `resolution_version`, not by editing locked rows (DB triggers enforce after truth lock).
 */
export const priceResolutions = salesSchema.table(
  "sales_order_price_resolutions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: integer("tenant_id").notNull(),
    orderId: uuid("order_id").notNull(),
    lineId: uuid("line_id").notNull(),
    /** Document-level decision head; groups all line resolutions for one engine run / version. */
    pricingDecisionId: uuid("pricing_decision_id").notNull(),
    /** Monotonic per line; insert a new version instead of updating a locked row. */
    resolutionVersion: integer("resolution_version").notNull().default(1),
    inputSnapshot: jsonb("input_snapshot")
      .notNull()
      .default(sql`'{}'::jsonb`)
      .$type<PriceResolutionInputSnapshot & Record<string, unknown>>(),
    appliedRuleIds: uuid("applied_rule_ids")
      .array()
      .notNull()
      .default(sql`'{}'::uuid[]`),
    basePrice: numeric("base_price", { precision: 14, scale: 2 }).notNull(),
    finalPrice: numeric("final_price", { precision: 14, scale: 2 }).notNull(),
    currencyId: integer("currency_id").notNull(),
    /** FX to company currency at resolution time; both columns null when N/A (e.g. already company currency). */
    exchangeRate: numeric("exchange_rate", { precision: 18, scale: 8 }),
    exchangeRateSource: text("exchange_rate_source"),
    /**
     * When `final_price` is strictly greater than `base_price`, set to the approving user.
     * Discounts (final strictly below base) do not require an approver on this row.
     */
    overrideApprovedBy: integer("override_approved_by"),
    /**
     * Identifies the pricing engine / schema generation used for this row (replay + audit).
     * Bump when resolver semantics change; keep old values for historical rows.
     */
    pricingEngineVersion: varchar("pricing_engine_version", { length: 64 }).notNull().default("v1"),
    resolvedAt: timestamp("resolved_at", { withTimezone: true }).notNull().defaultNow(),
    /** Set when the parent document is truth-locked; DB triggers block mutation after this. */
    lockedAt: timestamp("locked_at", { withTimezone: true }),
    /** Set when a `document_truth_bindings` row is created (FK in DB only; see module header). */
    truthBindingId: uuid("truth_binding_id"),
    ...timestampColumns,
    ...auditColumns(() => users.userId),
  },
  (table) => [
    uniqueIndex("uq_sales_sopr_line_version").on(
      table.tenantId,
      table.orderId,
      table.lineId,
      table.resolutionVersion
    ),
    index("idx_sales_price_resolutions_tenant").on(table.tenantId),
    index("idx_sales_sopr_order").on(table.tenantId, table.orderId),
    index("idx_sales_price_resolutions_line").on(table.tenantId, table.lineId),
    index("idx_sales_price_resolutions_resolved").on(table.tenantId, table.resolvedAt),
    index("idx_sales_price_resolutions_truth_binding").on(table.tenantId, table.truthBindingId),
    index("idx_sales_price_resolutions_pricing_decision").on(table.tenantId, table.pricingDecisionId),
    check("chk_sales_price_resolutions_base_non_negative", sql`${table.basePrice} >= 0`),
    check("chk_sales_price_resolutions_final_non_negative", sql`${table.finalPrice} >= 0`),
    check(
      "chk_sales_price_resolutions_locked_after_resolve",
      sql`${table.lockedAt} IS NULL OR ${table.lockedAt} >= ${table.resolvedAt}`
    ),
    check(
      "chk_sales_price_resolutions_exchange_pair",
      sql`(${table.exchangeRate} IS NULL AND ${table.exchangeRateSource} IS NULL) OR (${table.exchangeRate} IS NOT NULL AND ${table.exchangeRateSource} IS NOT NULL AND ${table.exchangeRate} > 0)`
    ),
    check(
      "chk_sales_price_resolutions_override_above_base",
      sql`${table.finalPrice} <= ${table.basePrice} OR ${table.overrideApprovedBy} IS NOT NULL`
    ),
    foreignKey({
      columns: [table.tenantId],
      foreignColumns: [tenants.tenantId],
      name: "fk_sales_price_resolutions_tenant",
    })
      .onDelete("restrict")
      .onUpdate("cascade"),
    foreignKey({
      columns: [table.orderId],
      foreignColumns: [salesOrders.id],
      name: "fk_sales_sopr_order",
    })
      .onDelete("cascade")
      .onUpdate("cascade"),
    foreignKey({
      columns: [table.pricingDecisionId],
      foreignColumns: [pricingDecisions.id],
      name: "fk_sales_sopr_pricing_decision",
    })
      .onDelete("restrict")
      .onUpdate("cascade"),
    foreignKey({
      columns: [table.lineId],
      foreignColumns: [salesOrderLines.id],
      name: "fk_sales_price_resolutions_order_line",
    })
      .onDelete("cascade")
      .onUpdate("cascade"),
    foreignKey({
      columns: [table.currencyId],
      foreignColumns: [currencies.currencyId],
      name: "fk_sales_price_resolutions_currency",
    })
      .onDelete("restrict")
      .onUpdate("cascade"),
    foreignKey({
      columns: [table.createdBy],
      foreignColumns: [users.userId],
      name: "fk_sales_price_resolutions_created_by",
    })
      .onDelete("restrict")
      .onUpdate("cascade"),
    foreignKey({
      columns: [table.updatedBy],
      foreignColumns: [users.userId],
      name: "fk_sales_price_resolutions_updated_by",
    })
      .onDelete("restrict")
      .onUpdate("cascade"),
    foreignKey({
      columns: [table.overrideApprovedBy],
      foreignColumns: [users.userId],
      name: "fk_sales_price_resolutions_override_approved_by",
    })
      .onDelete("set null")
      .onUpdate("cascade"),
    ...tenantIsolationPolicies("sales_price_resolutions"),
    serviceBypassPolicy("sales_price_resolutions"),
  ]
);

/** Append-only lifecycle log for `price_resolutions` (`resolved` + `locked` rows are also inserted by DB triggers). */
export const priceResolutionEvents = salesSchema.table(
  "price_resolution_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: integer("tenant_id").notNull(),
    resolutionId: uuid("resolution_id").notNull(),
    eventType: priceResolutionEventTypeEnum("event_type").notNull(),
    payload: jsonb("payload")
      .notNull()
      .default(sql`'{}'::jsonb`)
      .$type<Record<string, unknown>>(),
    occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull().defaultNow(),
    createdBy: integer("created_by").notNull(),
  },
  (table) => [
    index("idx_sales_price_resolution_events_tenant").on(table.tenantId),
    index("idx_sales_price_resolution_events_resolution").on(
      table.tenantId,
      table.resolutionId,
      table.occurredAt
    ),
    foreignKey({
      columns: [table.tenantId],
      foreignColumns: [tenants.tenantId],
      name: "fk_sales_price_resolution_events_tenant",
    })
      .onDelete("restrict")
      .onUpdate("cascade"),
    foreignKey({
      columns: [table.resolutionId],
      foreignColumns: [priceResolutions.id],
      name: "fk_sales_price_resolution_events_resolution",
    })
      .onDelete("cascade")
      .onUpdate("cascade"),
    foreignKey({
      columns: [table.createdBy],
      foreignColumns: [users.userId],
      name: "fk_sales_price_resolution_events_created_by",
    })
      .onDelete("restrict")
      .onUpdate("cascade"),
    ...tenantIsolationPolicies("sales_price_resolution_events"),
    serviceBypassPolicy("sales_price_resolution_events"),
  ]
);

export const priceResolutionSelectSchema = createSelectSchema(priceResolutions);
export const priceResolutionEventSelectSchema = createSelectSchema(priceResolutionEvents);

export const priceResolutionInsertSchema = createInsertSchema(priceResolutions, {
  id: PriceResolutionIdSchema.optional(),
  tenantId: z.number().int().positive(),
  orderId: z.uuid(),
  lineId: z.uuid(),
  pricingDecisionId: PricingDecisionIdSchema,
  resolutionVersion: z.number().int().positive().optional(),
  inputSnapshot: z
    .union([PriceResolutionInputSnapshotSchema, z.record(z.string(), z.unknown())])
    .optional(),
  appliedRuleIds: z.array(z.uuid()).optional(),
  basePrice: positiveMoneyStringSchema,
  finalPrice: positiveMoneyStringSchema,
  currencyId: z.number().int().positive(),
  exchangeRate: exchangeRateStringSchema.optional().nullable(),
  exchangeRateSource: z.string().min(1).optional().nullable(),
  overrideApprovedBy: z.number().int().positive().optional().nullable(),
  pricingEngineVersion: z.string().min(1).max(64).optional(),
  resolvedAt: instantWire.optional(),
  lockedAt: instantWire.optional().nullable(),
  truthBindingId: z.uuid().optional().nullable(),
  createdBy: z.number().int().positive(),
  updatedBy: z.number().int().positive(),
});

export const priceResolutionEventInsertSchema = createInsertSchema(priceResolutionEvents, {
  id: PriceResolutionEventIdSchema.optional(),
  tenantId: z.number().int().positive(),
  resolutionId: PriceResolutionIdSchema,
  eventType: PriceResolutionEventTypeSchema,
  payload: z.record(z.string(), z.unknown()).optional(),
  occurredAt: instantWire.optional(),
  createdBy: z.number().int().positive(),
});

export const priceResolutionUpdateSchema = createUpdateSchema(priceResolutions);

export type PriceResolution = typeof priceResolutions.$inferSelect;
export type NewPriceResolution = typeof priceResolutions.$inferInsert;

/** Line-level deterministic pricing engine output shape (subset of persisted `price_resolutions`). */
export type PriceResolutionEngineOutput = {
  lineId: string;
  pricingDecisionId: string;
  resolutionVersion: number;
  inputSnapshot: PriceResolutionInputSnapshot & Record<string, unknown>;
  appliedRuleIds: string[];
  basePrice: string;
  finalPrice: string;
  currencyId: number;
  exchangeRate: string | null;
  exchangeRateSource: string | null;
  overrideApprovedBy: number | null;
  pricingEngineVersion: string;
};
export type PriceResolutionEvent = typeof priceResolutionEvents.$inferSelect;
export type NewPriceResolutionEvent = typeof priceResolutionEvents.$inferInsert;
