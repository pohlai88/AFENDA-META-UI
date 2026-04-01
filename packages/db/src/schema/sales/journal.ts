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
import { users } from "../security/index.js";
import { JournalEntryStatusSchema, journalEntryStatusEnum } from "./_enums.js";
import { accountingDecisions } from "./accountingDecisions.js";
import { salesSchema } from "./_schema.js";
import {
  AccountingDecisionIdSchema,
  DocumentTruthBindingIdSchema,
  GlAccountIdSchema,
  JournalEntryIdSchema,
  JournalLineIdSchema,
  nonNegativeMoneyStringSchema,
} from "./_zodShared.js";
import { documentTruthBindings } from "./truthBindings.js";
import { glAccounts } from "./glAccounts.js";

/**
 * Double-entry journal header — always truth-anchored with an explicit accounting decision for replay.
 * Line balance for non-draft entries is enforced by a **deferred constraint trigger** (see migration);
 * immutability after post is enforced by **BEFORE triggers** on headers and lines.
 */
export const journalEntries = salesSchema.table(
  "journal_entries",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: integer("tenant_id").notNull(),
    /** Economic date (when the business event occurred). */
    entryDate: timestamp("entry_date", { withTimezone: true }).notNull(),
    /** When the entry was recognized in the ledger (set on post; distinct from `entry_date`). */
    postedAt: timestamp("posted_at", { withTimezone: true }),
    description: text("description"),
    reference: varchar("reference", { length: 120 }),
    /** Transaction / document currency for this entry. */
    currencyCode: varchar("currency_code", { length: 3 }).notNull(),
    /** Consolidation / book currency (tenant reporting currency). */
    baseCurrencyCode: varchar("base_currency_code", { length: 3 }).notNull(),
    /** FX from `currency_code` → `base_currency_code` when they differ; pair with `book_exchange_rate_source`. */
    bookExchangeRate: numeric("book_exchange_rate", { precision: 18, scale: 8 }),
    bookExchangeRateSource: text("book_exchange_rate_source"),
    truthBindingId: uuid("truth_binding_id").notNull(),
    accountingDecisionId: uuid("accounting_decision_id").notNull(),
    status: journalEntryStatusEnum("status").notNull().default("draft"),
    reversalJournalEntryId: uuid("reversal_journal_entry_id"),
    ...timestampColumns,
    ...auditColumns(() => users.userId),
  },
  (table) => [
    index("idx_sales_journal_entries_tenant").on(table.tenantId),
    index("idx_sales_journal_entries_date").on(table.tenantId, table.entryDate),
    index("idx_sales_journal_entries_truth_binding").on(table.tenantId, table.truthBindingId),
    index("idx_sales_journal_entries_accounting_decision").on(table.tenantId, table.accountingDecisionId),
    index("idx_sales_journal_entries_status").on(table.tenantId, table.status),
    index("idx_sales_journal_entries_posted_at").on(table.tenantId, table.postedAt),
    check(
      "chk_sales_journal_entries_reversal_not_self",
      sql`${table.reversalJournalEntryId} IS NULL OR ${table.reversalJournalEntryId} <> ${table.id}`
    ),
    check(
      "chk_sales_journal_entries_posted_has_posted_at",
      sql`${table.status} <> 'posted' OR ${table.postedAt} IS NOT NULL`
    ),
    check(
      "chk_sales_journal_entries_reversed_has_reversal",
      sql`${table.status} <> 'reversed' OR ${table.reversalJournalEntryId} IS NOT NULL`
    ),
    check(
      "chk_sales_journal_entries_book_fx_pair",
      sql`(${table.currencyCode} = ${table.baseCurrencyCode} AND ${table.bookExchangeRate} IS NULL AND ${table.bookExchangeRateSource} IS NULL) OR (${table.currencyCode} <> ${table.baseCurrencyCode} AND ${table.bookExchangeRate} IS NOT NULL AND ${table.bookExchangeRateSource} IS NOT NULL AND ${table.bookExchangeRate} > 0)`
    ),
    foreignKey({
      columns: [table.tenantId],
      foreignColumns: [tenants.tenantId],
      name: "fk_sales_journal_entries_tenant",
    })
      .onDelete("restrict")
      .onUpdate("cascade"),
    foreignKey({
      columns: [table.truthBindingId],
      foreignColumns: [documentTruthBindings.id],
      name: "fk_sales_journal_entries_truth_binding",
    })
      .onDelete("restrict")
      .onUpdate("cascade"),
    foreignKey({
      columns: [table.accountingDecisionId],
      foreignColumns: [accountingDecisions.id],
      name: "fk_sales_journal_entries_accounting_decision",
    })
      .onDelete("restrict")
      .onUpdate("cascade"),
    foreignKey({
      columns: [table.reversalJournalEntryId],
      foreignColumns: [table.id],
      name: "fk_sales_journal_entries_reversal",
    })
      .onDelete("set null")
      .onUpdate("cascade"),
    foreignKey({
      columns: [table.createdBy],
      foreignColumns: [users.userId],
      name: "fk_sales_journal_entries_created_by",
    })
      .onDelete("restrict")
      .onUpdate("cascade"),
    foreignKey({
      columns: [table.updatedBy],
      foreignColumns: [users.userId],
      name: "fk_sales_journal_entries_updated_by",
    })
      .onDelete("restrict")
      .onUpdate("cascade"),
    ...tenantIsolationPolicies("sales_journal_entries"),
    serviceBypassPolicy("sales_journal_entries"),
  ]
);

export const journalLines = salesSchema.table(
  "journal_lines",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: integer("tenant_id").notNull(),
    journalEntryId: uuid("journal_entry_id").notNull(),
    lineNo: integer("line_no").notNull(),
    glAccountId: uuid("gl_account_id").notNull(),
    /** Denormalized from `gl_accounts.account_code` for exports / search; must stay in sync in application code. */
    accountCode: varchar("account_code", { length: 64 }).notNull(),
    debitAmount: numeric("debit_amount", { precision: 14, scale: 2 }).notNull().default("0"),
    creditAmount: numeric("credit_amount", { precision: 14, scale: 2 }).notNull().default("0"),
    /** When null, line amounts are in the header `currency_code`. */
    lineCurrencyCode: varchar("line_currency_code", { length: 3 }),
    /** FX from `line_currencyCode` (or header currency) → entry `base_currency_code` when needed. */
    lineExchangeRateToBook: numeric("line_exchange_rate_to_book", { precision: 18, scale: 8 }),
    memo: text("memo"),
    costCenterId: uuid("cost_center_id"),
    projectId: uuid("project_id"),
    dimensions: jsonb("dimensions").$type<Record<string, unknown>>(),
    ...timestampColumns,
    ...auditColumns(() => users.userId),
  },
  (table) => [
    uniqueIndex("uq_sales_journal_lines_entry_line").on(table.tenantId, table.journalEntryId, table.lineNo),
    index("idx_sales_journal_lines_tenant").on(table.tenantId),
    index("idx_sales_journal_lines_entry").on(table.tenantId, table.journalEntryId),
    index("idx_sales_journal_lines_gl_account").on(table.tenantId, table.glAccountId),
    index("idx_sales_journal_lines_account").on(table.tenantId, table.accountCode),
    check("chk_sales_journal_lines_debit_non_negative", sql`${table.debitAmount} >= 0`),
    check("chk_sales_journal_lines_credit_non_negative", sql`${table.creditAmount} >= 0`),
    check(
      "chk_sales_journal_lines_one_sided",
      sql`(${table.debitAmount} > 0 AND ${table.creditAmount} = 0) OR (${table.creditAmount} > 0 AND ${table.debitAmount} = 0)`
    ),
    check(
      "chk_sales_journal_lines_line_fx_pair",
      sql`(${table.lineExchangeRateToBook} IS NULL) OR (${table.lineExchangeRateToBook} IS NOT NULL AND ${table.lineExchangeRateToBook} > 0)`
    ),
    foreignKey({
      columns: [table.tenantId],
      foreignColumns: [tenants.tenantId],
      name: "fk_sales_journal_lines_tenant",
    })
      .onDelete("restrict")
      .onUpdate("cascade"),
    foreignKey({
      columns: [table.journalEntryId],
      foreignColumns: [journalEntries.id],
      name: "fk_sales_journal_lines_journal_entry",
    })
      .onDelete("cascade")
      .onUpdate("cascade"),
    foreignKey({
      columns: [table.glAccountId],
      foreignColumns: [glAccounts.id],
      name: "fk_sales_journal_lines_gl_account",
    })
      .onDelete("restrict")
      .onUpdate("cascade"),
    foreignKey({
      columns: [table.createdBy],
      foreignColumns: [users.userId],
      name: "fk_sales_journal_lines_created_by",
    })
      .onDelete("restrict")
      .onUpdate("cascade"),
    foreignKey({
      columns: [table.updatedBy],
      foreignColumns: [users.userId],
      name: "fk_sales_journal_lines_updated_by",
    })
      .onDelete("restrict")
      .onUpdate("cascade"),
    ...tenantIsolationPolicies("sales_journal_lines"),
    serviceBypassPolicy("sales_journal_lines"),
  ]
);

export const journalEntrySelectSchema = createSelectSchema(journalEntries);
export const journalLineSelectSchema = createSelectSchema(journalLines);

export const journalEntryInsertSchema = createInsertSchema(journalEntries, {
  id: JournalEntryIdSchema.optional(),
  tenantId: z.number().int().positive(),
  entryDate: instantWire,
  postedAt: instantWire.optional().nullable(),
  description: z.string().max(4000).optional().nullable(),
  reference: z.string().max(120).optional().nullable(),
  currencyCode: z.string().length(3),
  baseCurrencyCode: z.string().length(3),
  bookExchangeRate: z.string().regex(/^\d+(\.\d+)?$/).optional().nullable(),
  bookExchangeRateSource: z.string().max(120).optional().nullable(),
  truthBindingId: DocumentTruthBindingIdSchema,
  accountingDecisionId: AccountingDecisionIdSchema,
  status: JournalEntryStatusSchema.optional(),
  reversalJournalEntryId: JournalEntryIdSchema.optional().nullable(),
  createdBy: z.number().int().positive(),
  updatedBy: z.number().int().positive(),
});

export const journalLineInsertSchema = createInsertSchema(journalLines, {
  id: JournalLineIdSchema.optional(),
  tenantId: z.number().int().positive(),
  journalEntryId: JournalEntryIdSchema,
  lineNo: z.number().int().min(1),
  glAccountId: GlAccountIdSchema,
  accountCode: z.string().min(1).max(64),
  debitAmount: nonNegativeMoneyStringSchema.optional(),
  creditAmount: nonNegativeMoneyStringSchema.optional(),
  lineCurrencyCode: z.string().length(3).optional().nullable(),
  lineExchangeRateToBook: z.string().regex(/^\d+(\.\d+)?$/).optional().nullable(),
  memo: z.string().max(2000).optional().nullable(),
  costCenterId: z.uuid().optional().nullable(),
  projectId: z.uuid().optional().nullable(),
  dimensions: z.record(z.string(), z.unknown()).optional().nullable(),
  createdBy: z.number().int().positive(),
  updatedBy: z.number().int().positive(),
}).superRefine((row, ctx) => {
  const d = Number(row.debitAmount ?? "0");
  const c = Number(row.creditAmount ?? "0");
  if (!((d > 0 && c === 0) || (c > 0 && d === 0))) {
    ctx.addIssue({
      code: "custom",
      message: "Exactly one of debitAmount or creditAmount must be positive",
      path: ["creditAmount"],
    });
  }
});

export const journalEntryUpdateSchema = createUpdateSchema(journalEntries);
export const journalLineUpdateSchema = createUpdateSchema(journalLines);

export type JournalEntry = typeof journalEntries.$inferSelect;
export type NewJournalEntry = typeof journalEntries.$inferInsert;
export type JournalLine = typeof journalLines.$inferSelect;
export type NewJournalLine = typeof journalLines.$inferInsert;
