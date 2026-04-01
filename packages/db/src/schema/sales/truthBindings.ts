import { sql } from "drizzle-orm";
import { createInsertSchema, createSelectSchema, createUpdateSchema } from "drizzle-orm/zod";
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
import { z } from "zod/v4";

import { auditColumns, timestampColumns } from "../../column-kit/index.js";
import { serviceBypassPolicy, tenantIsolationPolicies } from "../../rls-policies/index.js";
import { instantWire } from "../../wire/temporal.js";
import { tenants } from "../core/tenants.js";
import { currencies } from "../reference/index.js";
import { users } from "../security/index.js";
import {
  SalesTruthDocumentTypeSchema,
  salesTruthDocumentTypeEnum,
  TruthBindingCommitPhaseSchema,
  truthBindingCommitPhaseEnum,
} from "./_enums.js";
import { salesSchema } from "./_schema.js";
import {
  DocumentTruthBindingIdSchema,
  nonNegativeMoneyStringSchema,
  positiveMoneyStringSchema,
} from "./_zodShared.js";
import { documentTruthLinks } from "./documentTruthLinks.js";

/**
 * Immutable financial truth boundary for a commercial document: frozen totals + JSON snapshots,
 * anchored to `document_truth_links` for pricing. Accounting postings should prefer `truth_binding_id`.
 */
export const documentTruthBindings = salesSchema.table(
  "document_truth_bindings",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: integer("tenant_id").notNull(),
    documentType: salesTruthDocumentTypeEnum("document_type").notNull(),
    documentId: uuid("document_id").notNull(),
    documentStatusAtCommit: varchar("document_status_at_commit", { length: 32 }).notNull(),
    commitPhase: truthBindingCommitPhaseEnum("commit_phase").notNull().default("financial_commit"),
    committedAt: timestamp("committed_at", { withTimezone: true }).notNull(),
    lockedAt: timestamp("locked_at", { withTimezone: true }).notNull(),
    committedBy: integer("committed_by").notNull(),
    priceTruthLinkId: uuid("price_truth_link_id"),
    currencyId: integer("currency_id").notNull(),
    /** Monotonic per (tenant, document_type, document_id); voided rows keep their version for audit chain. */
    bindingVersion: integer("binding_version").notNull().default(1),
    totalAmount: numeric("total_amount", { precision: 14, scale: 2 }).notNull(),
    subtotalAmount: numeric("subtotal_amount", { precision: 14, scale: 2 }).notNull(),
    taxAmount: numeric("tax_amount", { precision: 14, scale: 2 }).notNull(),
    /** Deterministic hash of economic snapshots + totals (see truth commit engine). */
    snapshotHash: text("snapshot_hash").notNull(),
    /** Document currency → base (functional) currency, when known at commit. */
    fxRate: numeric("fx_rate", { precision: 18, scale: 8 }),
    fxAsOf: timestamp("fx_as_of", { withTimezone: true }),
    baseCurrencyId: integer("base_currency_id").references(() => currencies.currencyId, {
      onDelete: "restrict",
      onUpdate: "cascade",
    }),
    /** Optional dedupe key for commit retries (unique per tenant when set). */
    idempotencyKey: text("idempotency_key"),
    headerSnapshot: jsonb("header_snapshot")
      .notNull()
      .default(sql`'{}'::jsonb`)
      .$type<Record<string, unknown>>(),
    lineSnapshot: jsonb("line_snapshot")
      .notNull()
      .default(sql`'{}'::jsonb`)
      .$type<Record<string, unknown>>(),
    /** Frozen tax rows + metadata at financial commit (line junction + order summary); not derived from live tax master after lock. */
    taxSnapshot: jsonb("tax_snapshot")
      .notNull()
      .default(sql`'{}'::jsonb`)
      .$type<Record<string, unknown>>(),
    commissionSnapshotId: uuid("commission_snapshot_id"),
    supersedesBindingId: uuid("supersedes_binding_id"),
    voidedAt: timestamp("voided_at", { withTimezone: true }),
    voidedBy: integer("voided_by"),
    voidReason: text("void_reason"),
    ...timestampColumns,
    ...auditColumns(() => users.userId),
  },
  (table) => [
    uniqueIndex("uq_sales_document_truth_bindings_active")
      .on(table.tenantId, table.documentType, table.documentId)
      .where(sql`${table.voidedAt} IS NULL`),
    uniqueIndex("uq_sales_document_truth_bindings_doc_version").on(
      table.tenantId,
      table.documentType,
      table.documentId,
      table.bindingVersion
    ),
    uniqueIndex("uq_sales_document_truth_bindings_idempotency")
      .on(table.tenantId, table.idempotencyKey)
      .where(sql`${table.idempotencyKey} IS NOT NULL`),
    index("idx_sales_document_truth_bindings_tenant").on(table.tenantId),
    index("idx_sales_document_truth_bindings_document").on(
      table.tenantId,
      table.documentType,
      table.documentId,
      table.committedAt
    ),
    index("idx_sales_document_truth_bindings_price_link").on(table.tenantId, table.priceTruthLinkId),
    check("chk_sales_document_truth_bindings_total_non_negative", sql`${table.totalAmount} >= 0`),
    check("chk_sales_document_truth_bindings_subtotal_non_negative", sql`${table.subtotalAmount} >= 0`),
    check("chk_sales_document_truth_bindings_tax_non_negative", sql`${table.taxAmount} >= 0`),
    check(
      "chk_sales_document_truth_bindings_total_matches_parts",
      sql`${table.totalAmount} = ${table.subtotalAmount} + ${table.taxAmount}`
    ),
    check(
      "chk_sales_document_truth_bindings_snapshot_hash_nonempty",
      sql`length(btrim(${table.snapshotHash})) >= 8`
    ),
    check(
      "chk_sales_document_truth_bindings_lock_after_commit",
      sql`${table.lockedAt} >= ${table.committedAt}`
    ),
    check(
      "chk_sales_document_truth_bindings_phase_lock_void",
      sql`(${table.voidedAt} IS NULL AND ${table.commitPhase} IN ('financial_commit', 'posted') AND ${table.lockedAt} IS NOT NULL) OR (${table.voidedAt} IS NOT NULL AND ${table.voidedBy} IS NOT NULL AND ${table.commitPhase} IN ('voided', 'superseded'))`
    ),
    check(
      "chk_sales_document_truth_bindings_header_snapshot_object",
      sql`jsonb_typeof(${table.headerSnapshot}) = 'object'`
    ),
    check(
      "chk_sales_document_truth_bindings_line_snapshot_shape",
      sql`jsonb_typeof(${table.lineSnapshot}) = 'object' AND jsonb_typeof(${table.lineSnapshot}->'lines') = 'array'`
    ),
    check(
      "chk_sales_document_truth_bindings_tax_snapshot_object",
      sql`jsonb_typeof(${table.taxSnapshot}) = 'object'`
    ),
    foreignKey({
      columns: [table.tenantId],
      foreignColumns: [tenants.tenantId],
      name: "fk_sales_document_truth_bindings_tenant",
    })
      .onDelete("restrict")
      .onUpdate("cascade"),
    foreignKey({
      columns: [table.committedBy],
      foreignColumns: [users.userId],
      name: "fk_sales_document_truth_bindings_committed_by",
    })
      .onDelete("restrict")
      .onUpdate("cascade"),
    foreignKey({
      columns: [table.currencyId],
      foreignColumns: [currencies.currencyId],
      name: "fk_sales_document_truth_bindings_currency",
    })
      .onDelete("restrict")
      .onUpdate("cascade"),
    foreignKey({
      columns: [table.priceTruthLinkId],
      foreignColumns: [documentTruthLinks.id],
      name: "fk_sales_document_truth_bindings_price_truth_link",
    })
      .onDelete("set null")
      .onUpdate("cascade"),
    foreignKey({
      columns: [table.voidedBy],
      foreignColumns: [users.userId],
      name: "fk_sales_document_truth_bindings_voided_by",
    })
      .onDelete("set null")
      .onUpdate("cascade"),
    foreignKey({
      columns: [table.supersedesBindingId],
      foreignColumns: [table.id],
      name: "fk_sales_document_truth_bindings_supersedes",
    })
      .onDelete("set null")
      .onUpdate("cascade"),
    ...tenantIsolationPolicies("sales_document_truth_bindings"),
    serviceBypassPolicy("sales_document_truth_bindings"),
  ]
);

export const documentTruthBindingSelectSchema = createSelectSchema(documentTruthBindings);

export const documentTruthBindingInsertSchema = createInsertSchema(documentTruthBindings, {
  id: DocumentTruthBindingIdSchema.optional(),
  tenantId: z.number().int().positive(),
  documentType: SalesTruthDocumentTypeSchema,
  documentId: z.uuid(),
  documentStatusAtCommit: z.string().min(1).max(32),
  commitPhase: TruthBindingCommitPhaseSchema.optional(),
  committedAt: instantWire,
  lockedAt: instantWire,
  committedBy: z.number().int().positive(),
  priceTruthLinkId: z.uuid().optional().nullable(),
  currencyId: z.number().int().positive(),
  bindingVersion: z.number().int().positive().optional(),
  totalAmount: positiveMoneyStringSchema,
  subtotalAmount: nonNegativeMoneyStringSchema,
  taxAmount: nonNegativeMoneyStringSchema,
  snapshotHash: z.string().min(8).max(128),
  fxRate: z.string().max(30).optional().nullable(),
  fxAsOf: instantWire.optional().nullable(),
  baseCurrencyId: z.number().int().positive().optional().nullable(),
  idempotencyKey: z.string().min(8).max(200).optional().nullable(),
  headerSnapshot: z.record(z.string(), z.unknown()).optional(),
  lineSnapshot: z.record(z.string(), z.unknown()).optional(),
  taxSnapshot: z.record(z.string(), z.unknown()).optional(),
  commissionSnapshotId: z.uuid().optional().nullable(),
  supersedesBindingId: DocumentTruthBindingIdSchema.optional().nullable(),
  voidedAt: instantWire.optional().nullable(),
  voidedBy: z.number().int().positive().optional().nullable(),
  voidReason: z.string().max(4000).optional().nullable(),
  createdBy: z.number().int().positive(),
  updatedBy: z.number().int().positive(),
});

export const documentTruthBindingUpdateSchema = createUpdateSchema(documentTruthBindings);

export type DocumentTruthBinding = typeof documentTruthBindings.$inferSelect;
export type NewDocumentTruthBinding = typeof documentTruthBindings.$inferInsert;
