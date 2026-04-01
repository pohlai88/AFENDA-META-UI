import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  foreignKey,
  index,
  integer,
  jsonb,
  text,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-orm/zod";
import { z } from "zod/v4";

import { auditColumns, timestampColumns } from "../../column-kit/index.js";
import { serviceBypassPolicy, tenantIsolationPolicies } from "../../rls-policies/index.js";
import { tenants } from "../core/tenants.js";
import { users } from "../security/index.js";
import { pricingDecisionStatusEnum, PricingDecisionStatusSchema } from "./_enums.js";
import { salesSchema } from "./_schema.js";
import { PricingDecisionIdSchema } from "./_zodShared.js";
import { salesOrders } from "./orders.js";

/**
 * Sales-order pricing decision head: one logical engine run per order.
 * Line outputs live in `sales_order_price_resolutions` via `pricing_decision_id`;
 * `sales_order_document_truth_links` references a **final** head.
 *
 * - **Active head**: at most one row per order has `is_active = true` (partial unique index).
 * - **Immutability**: enforced in DB after `status = final` (see migration triggers); draft rows remain editable until finalized.
 * - **Final ≥1 resolution**: DB trigger rejects `status = final` without at least one `sales_order_price_resolutions` row.
 */
export const pricingDecisions = salesSchema.table(
  "sales_order_pricing_decisions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: integer("tenant_id").notNull(),
    orderId: uuid("order_id").notNull(),
    decisionVersion: integer("decision_version").notNull().default(1),
    /** Exactly one active row per order at a time (current working or finalized head). */
    isActive: boolean("is_active").notNull().default(false),
    /** Draft = preview / recomputable; final = frozen except `is_active` / audit columns. */
    status: pricingDecisionStatusEnum("status").notNull().default("draft"),
    pricingEngineVersion: varchar("pricing_engine_version", { length: 64 }).notNull().default("v1"),
    /** Normalized document-level inputs (header + line keys) for explain + replay. */
    documentInputs: jsonb("document_inputs")
      .notNull()
      .default(sql`'{}'::jsonb`)
      .$type<Record<string, unknown>>(),
    /** Deterministic hash over canonical `document_inputs` + engine version (see `computePricingDocumentInputsDigest`). */
    documentInputsDigest: text("document_inputs_digest").notNull(),
    ...timestampColumns,
    ...auditColumns(() => users.userId),
  },
  (table) => [
    uniqueIndex("uq_sales_sopd_order_version").on(table.tenantId, table.orderId, table.decisionVersion),
    uniqueIndex("uq_sales_sopd_one_active_per_order")
      .on(table.tenantId, table.orderId)
      .where(sql`${table.isActive} = true`),
    index("idx_sales_sopd_tenant_order").on(table.tenantId, table.orderId),
    index("idx_sales_sopd_status").on(table.tenantId, table.orderId, table.status),
    check("chk_sales_pricing_decisions_version_positive", sql`${table.decisionVersion} >= 1`),
    check(
      "chk_sales_pricing_decisions_digest_nonempty",
      sql`length(trim(both from ${table.documentInputsDigest})) >= 8`
    ),
    foreignKey({
      columns: [table.tenantId],
      foreignColumns: [tenants.tenantId],
      name: "fk_sales_pricing_decisions_tenant",
    })
      .onDelete("restrict")
      .onUpdate("cascade"),
    foreignKey({
      columns: [table.orderId],
      foreignColumns: [salesOrders.id],
      name: "fk_sales_sopd_order",
    })
      .onDelete("restrict")
      .onUpdate("cascade"),
    foreignKey({
      columns: [table.createdBy],
      foreignColumns: [users.userId],
      name: "fk_sales_pricing_decisions_created_by",
    })
      .onDelete("restrict")
      .onUpdate("cascade"),
    foreignKey({
      columns: [table.updatedBy],
      foreignColumns: [users.userId],
      name: "fk_sales_pricing_decisions_updated_by",
    })
      .onDelete("restrict")
      .onUpdate("cascade"),
    ...tenantIsolationPolicies("sales_pricing_decisions"),
    serviceBypassPolicy("sales_pricing_decisions"),
  ]
);

export const pricingDecisionSelectSchema = createSelectSchema(pricingDecisions);

export const pricingDecisionInsertSchema = createInsertSchema(pricingDecisions, {
  id: PricingDecisionIdSchema.optional(),
  tenantId: z.number().int().positive(),
  orderId: z.uuid(),
  decisionVersion: z.number().int().positive().optional(),
  isActive: z.boolean().optional(),
  status: PricingDecisionStatusSchema.optional(),
  pricingEngineVersion: z.string().min(1).max(64).optional(),
  documentInputs: z.record(z.string(), z.unknown()).optional(),
  documentInputsDigest: z.string().min(8).max(256),
  createdBy: z.number().int().positive(),
  updatedBy: z.number().int().positive(),
});

/** Rows are mutated only via controlled SQL paths (finalize, activate head); API must not send updates. */
export const pricingDecisionUpdateSchema: z.ZodType<never> = z.never();

export type PricingDecision = typeof pricingDecisions.$inferSelect;
export type NewPricingDecision = typeof pricingDecisions.$inferInsert;
