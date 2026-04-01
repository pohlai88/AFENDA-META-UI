import { sql } from "drizzle-orm";
import { createInsertSchema, createSelectSchema, createUpdateSchema } from "drizzle-orm/zod";
import {
  boolean,
  check,
  foreignKey,
  index,
  integer,
  text,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { z } from "zod/v4";

import { auditColumns, softDeleteColumns, timestampColumns } from "../../column-kit/index.js";
import { serviceBypassPolicy, tenantIsolationPolicies } from "../../rls-policies/index.js";
import { tenants } from "../core/tenants.js";
import { users } from "../security/index.js";
import { salesSchema } from "./_schema.js";
import { GlAccountIdSchema } from "./_zodShared.js";

/**
 * Tenant chart-of-accounts anchor. `journal_lines.account_code` remains a denormalized copy for exports;
 * `gl_account_id` is the integrity key for postings.
 */
export const glAccounts = salesSchema.table(
  "gl_accounts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: integer("tenant_id").notNull(),
    accountCode: varchar("account_code", { length: 64 }).notNull(),
    /** Display label; empty string when unset (column-kit name fingerprint requires notNull). */
    name: varchar("name", { length: 255 }).notNull().default(""),
    isActive: boolean("is_active").notNull().default(true),
    ...timestampColumns,
    ...softDeleteColumns,
    ...auditColumns(() => users.userId),
  },
  (table) => [
    uniqueIndex("uq_sales_gl_accounts_tenant_code")
      .on(table.tenantId, table.accountCode)
      .where(sql`${table.deletedAt} IS NULL`),
    index("idx_sales_gl_accounts_tenant").on(table.tenantId),
    check("chk_sales_gl_accounts_code_nonempty", sql`length(trim(${table.accountCode})) >= 1`),
    foreignKey({
      columns: [table.tenantId],
      foreignColumns: [tenants.tenantId],
      name: "fk_sales_gl_accounts_tenant",
    })
      .onDelete("restrict")
      .onUpdate("cascade"),
    foreignKey({
      columns: [table.createdBy],
      foreignColumns: [users.userId],
      name: "fk_sales_gl_accounts_created_by",
    })
      .onDelete("restrict")
      .onUpdate("cascade"),
    foreignKey({
      columns: [table.updatedBy],
      foreignColumns: [users.userId],
      name: "fk_sales_gl_accounts_updated_by",
    })
      .onDelete("restrict")
      .onUpdate("cascade"),
    ...tenantIsolationPolicies("sales_gl_accounts"),
    serviceBypassPolicy("sales_gl_accounts"),
  ]
);

export const glAccountSelectSchema = createSelectSchema(glAccounts);
export const glAccountInsertSchema = createInsertSchema(glAccounts, {
  id: GlAccountIdSchema.optional(),
  tenantId: z.number().int().positive(),
  accountCode: z.string().min(1).max(64),
  name: z.string().max(255).optional(),
  isActive: z.boolean().optional(),
  createdBy: z.number().int().positive(),
  updatedBy: z.number().int().positive(),
});
export const glAccountUpdateSchema = createUpdateSchema(glAccounts);

export type GlAccount = typeof glAccounts.$inferSelect;
export type NewGlAccount = typeof glAccounts.$inferInsert;
