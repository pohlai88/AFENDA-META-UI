import { sql } from "drizzle-orm";
import { createInsertSchema, createSelectSchema, createUpdateSchema } from "drizzle-orm/zod";
import {
  check,
  foreignKey,
  index,
  integer,
  jsonb,
  text,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { z } from "zod/v4";

import { auditColumns, timestampColumns } from "../../column-kit/index.js";
import { serviceBypassPolicy, tenantIsolationPolicies } from "../../rls-policies/index.js";
import { tenants } from "../core/tenants.js";
import { users } from "../security/index.js";
import { salesSchema } from "./_schema.js";
import { AccountingDecisionIdSchema } from "./_zodShared.js";
import { documentTruthBindings } from "./truthBindings.js";

/**
 * Immutable accounting projection decision for a truth binding (rules digest, engine version, mapping keys).
 * Journal entries reference this for deterministic replay — parallel to `pricing_decisions` for pricing truth.
 */
export const accountingDecisions = salesSchema.table(
  "accounting_decisions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: integer("tenant_id").notNull(),
    truthBindingId: uuid("truth_binding_id").notNull(),
    accountingEngineVersion: varchar("accounting_engine_version", { length: 64 })
      .notNull()
      .default("v1"),
    /** Normalized inputs + rule ids used to project lines (hash-friendly for drift detection). */
    decisionSnapshot: jsonb("decision_snapshot")
      .notNull()
      .default(sql`'{}'::jsonb`)
      .$type<Record<string, unknown>>(),
    documentInputsDigest: text("document_inputs_digest"),
    ...timestampColumns,
    ...auditColumns(() => users.userId),
  },
  (table) => [
    index("idx_sales_accounting_decisions_tenant").on(table.tenantId),
    index("idx_sales_accounting_decisions_truth_binding").on(table.tenantId, table.truthBindingId),
    check("chk_sales_accounting_decisions_engine_version", sql`length(${table.accountingEngineVersion}) >= 1`),
    foreignKey({
      columns: [table.tenantId],
      foreignColumns: [tenants.tenantId],
      name: "fk_sales_accounting_decisions_tenant",
    })
      .onDelete("restrict")
      .onUpdate("cascade"),
    foreignKey({
      columns: [table.truthBindingId],
      foreignColumns: [documentTruthBindings.id],
      name: "fk_sales_accounting_decisions_truth_binding",
    })
      .onDelete("restrict")
      .onUpdate("cascade"),
    foreignKey({
      columns: [table.createdBy],
      foreignColumns: [users.userId],
      name: "fk_sales_accounting_decisions_created_by",
    })
      .onDelete("restrict")
      .onUpdate("cascade"),
    foreignKey({
      columns: [table.updatedBy],
      foreignColumns: [users.userId],
      name: "fk_sales_accounting_decisions_updated_by",
    })
      .onDelete("restrict")
      .onUpdate("cascade"),
    ...tenantIsolationPolicies("sales_accounting_decisions"),
    serviceBypassPolicy("sales_accounting_decisions"),
  ]
);

export const accountingDecisionSelectSchema = createSelectSchema(accountingDecisions);
export const accountingDecisionInsertSchema = createInsertSchema(accountingDecisions, {
  id: AccountingDecisionIdSchema.optional(),
  tenantId: z.number().int().positive(),
  truthBindingId: z.uuid(),
  accountingEngineVersion: z.string().min(1).max(64).optional(),
  decisionSnapshot: z.record(z.string(), z.unknown()).optional(),
  documentInputsDigest: z.string().max(512).optional().nullable(),
  createdBy: z.number().int().positive(),
  updatedBy: z.number().int().positive(),
});
export const accountingDecisionUpdateSchema = createUpdateSchema(accountingDecisions);

export type AccountingDecision = typeof accountingDecisions.$inferSelect;
export type NewAccountingDecision = typeof accountingDecisions.$inferInsert;
