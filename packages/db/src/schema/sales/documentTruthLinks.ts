import { sql } from "drizzle-orm";
import {
  check,
  foreignKey,
  index,
  integer,
  numeric,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-orm/zod";
import { z } from "zod/v4";

import { auditColumns, timestampColumns } from "../../column-kit/index.js";
import { serviceBypassPolicy, tenantIsolationPolicies } from "../../rls-policies/index.js";
import { instantWire } from "../../wire/temporal.js";
import { tenants } from "../core/tenants.js";
import { currencies } from "../reference/index.js";
import { users } from "../security/index.js";
import { salesSchema } from "./_schema.js";
import {
  DocumentTruthLinkIdSchema,
  PaymentTermIdSchema,
  PricelistIdSchema,
  PricingDecisionIdSchema,
} from "./_zodShared.js";
import { paymentTerms, pricelists } from "./pricing.js";
import { pricingDecisions } from "./pricingDecisions.js";
import { salesOrders } from "./orders.js";

/**
 * Binding between a sales order and the document-level pricing decision at lock time.
 * `pricing_decision_id` → `sales_order_pricing_decisions.id` (parent of line `sales_order_price_resolutions`).
 */
export const documentTruthLinks = salesSchema.table(
  "sales_order_document_truth_links",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: integer("tenant_id").notNull(),
    orderId: uuid("order_id").notNull(),
    pricingDecisionId: uuid("pricing_decision_id").notNull(),
    pricelistId: uuid("pricelist_id").notNull(),
    currencyId: integer("currency_id").notNull(),
    paymentTermId: uuid("payment_term_id"),
    exchangeRate: numeric("exchange_rate", { precision: 18, scale: 8 }),
    exchangeRateSource: text("exchange_rate_source"),
    lockedAt: timestamp("locked_at", { withTimezone: true }).notNull(),
    lockReason: text("lock_reason"),
    ...timestampColumns,
    ...auditColumns(() => users.userId),
  },
  (table) => [
    uniqueIndex("uq_sales_sodtl_order").on(table.tenantId, table.orderId),
    index("idx_sales_document_truth_links_tenant").on(table.tenantId),
    index("idx_sales_document_truth_links_locked").on(table.tenantId, table.lockedAt),
    index("idx_sales_sodtl_pricing_decision").on(table.tenantId, table.pricingDecisionId),
    check(
      "chk_sales_document_truth_links_exchange_pair",
      sql`(${table.exchangeRate} IS NULL AND ${table.exchangeRateSource} IS NULL) OR (${table.exchangeRate} IS NOT NULL AND ${table.exchangeRateSource} IS NOT NULL AND ${table.exchangeRate} > 0)`
    ),
    foreignKey({
      columns: [table.tenantId],
      foreignColumns: [tenants.tenantId],
      name: "fk_sales_document_truth_links_tenant",
    })
      .onDelete("restrict")
      .onUpdate("cascade"),
    foreignKey({
      columns: [table.orderId],
      foreignColumns: [salesOrders.id],
      name: "fk_sales_sodtl_order",
    })
      .onDelete("restrict")
      .onUpdate("cascade"),
    foreignKey({
      columns: [table.pricingDecisionId],
      foreignColumns: [pricingDecisions.id],
      name: "fk_sales_sodtl_pricing_decision",
    })
      .onDelete("restrict")
      .onUpdate("cascade"),
    foreignKey({
      columns: [table.pricelistId],
      foreignColumns: [pricelists.id],
      name: "fk_sales_document_truth_links_pricelist",
    })
      .onDelete("restrict")
      .onUpdate("cascade"),
    foreignKey({
      columns: [table.currencyId],
      foreignColumns: [currencies.currencyId],
      name: "fk_sales_document_truth_links_currency",
    })
      .onDelete("restrict")
      .onUpdate("cascade"),
    foreignKey({
      columns: [table.paymentTermId],
      foreignColumns: [paymentTerms.id],
      name: "fk_sales_document_truth_links_payment_term",
    })
      .onDelete("set null")
      .onUpdate("cascade"),
    foreignKey({
      columns: [table.createdBy],
      foreignColumns: [users.userId],
      name: "fk_sales_document_truth_links_created_by",
    })
      .onDelete("restrict")
      .onUpdate("cascade"),
    foreignKey({
      columns: [table.updatedBy],
      foreignColumns: [users.userId],
      name: "fk_sales_document_truth_links_updated_by",
    })
      .onDelete("restrict")
      .onUpdate("cascade"),
    ...tenantIsolationPolicies("sales_document_truth_links"),
    serviceBypassPolicy("sales_document_truth_links"),
  ]
);

export const documentTruthLinkSelectSchema = createSelectSchema(documentTruthLinks);

export const documentTruthLinkInsertSchema = createInsertSchema(documentTruthLinks, {
  id: DocumentTruthLinkIdSchema.optional(),
  tenantId: z.number().int().positive(),
  orderId: z.uuid(),
  pricingDecisionId: PricingDecisionIdSchema,
  pricelistId: PricelistIdSchema,
  currencyId: z.number().int().positive(),
  paymentTermId: PaymentTermIdSchema.optional().nullable(),
  exchangeRate: z
    .string()
    .regex(/^\d+(\.\d{1,8})?$/)
    .refine((v) => Number(v) > 0, "Exchange rate must be > 0")
    .optional()
    .nullable(),
  exchangeRateSource: z.string().min(1).optional().nullable(),
  lockedAt: instantWire,
  lockReason: z.string().min(1).max(512).optional().nullable(),
  createdBy: z.number().int().positive(),
  updatedBy: z.number().int().positive(),
});

/** DB trigger blocks updates; API validation rejects any payload. */
export const documentTruthLinkUpdateSchema: z.ZodType<never> = z.never();

export type DocumentTruthLink = typeof documentTruthLinks.$inferSelect;
export type NewDocumentTruthLink = typeof documentTruthLinks.$inferInsert;
