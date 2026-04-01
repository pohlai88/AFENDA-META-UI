import { sql } from "drizzle-orm";
import { createInsertSchema, createSelectSchema, createUpdateSchema } from "drizzle-orm/zod";
import {
  boolean,
  check,
  foreignKey,
  index,
  integer,
  jsonb,
  numeric,
  timestamp,
  text,
  varchar,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { z } from "zod/v4";

import { tenantIsolationPolicies, serviceBypassPolicy } from "../../rls-policies/index.js";
import { auditColumns, softDeleteColumns, timestampColumns } from "../../column-kit/index.js";
import { instantWire } from "../../wire/temporal.js";
import { tenants } from "../core/tenants.js";
import { users } from "../security/index.js";
import {
  DomainEventTypeSchema,
  domainEventTypeEnum,
  InvariantSeveritySchema,
  invariantSeverityEnum,
  InvariantStatusSchema,
  invariantStatusEnum,
  SalesTruthDocumentTypeSchema,
  salesTruthDocumentTypeEnum,
  TruthDecisionTypeSchema,
  truthDecisionTypeEnum,
} from "./_enums.js";
import {
  AccountingPostingIdSchema,
  DocumentApprovalIdSchema,
  DocumentStatusHistoryIdSchema,
  DocumentTruthBindingIdSchema,
  DomainEventLogIdSchema,
  DomainInvariantLogIdSchema,
  JournalEntryIdSchema,
  positiveMoneyStringSchema,
  SalesDocumentAttachmentIdSchema,
  TruthDecisionLockIdSchema,
} from "./_zodShared.js";
import { journalEntries } from "./journal.js";
import { salesSchema } from "./_schema.js";
import { documentTruthBindings } from "./truthBindings.js";


export const documentStatusHistory = salesSchema.table(
  "document_status_history",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: integer("tenant_id").notNull(),
    documentType: salesTruthDocumentTypeEnum("document_type").notNull(),
    documentId: uuid("document_id").notNull(),
    fromStatus: text("from_status"),
    toStatus: text("to_status").notNull(),
    transitionedAt: timestamp("transitioned_at", { withTimezone: true }).notNull().defaultNow(),
    transitionedBy: integer("transitioned_by").notNull(),
    reason: text("reason"),
    notes: text("notes"),
    ...timestampColumns,
    ...auditColumns(() => users.userId),
  },
  (table) => [
    index("idx_sales_document_status_history_tenant").on(table.tenantId),
    index("idx_sales_document_status_history_lookup").on(
      table.tenantId,
      table.documentType,
      table.documentId,
      table.transitionedAt
    ),
    index("idx_sales_document_status_history_actor").on(
      table.tenantId,
      table.transitionedBy,
      table.transitionedAt
    ),
    foreignKey({
      columns: [table.tenantId],
      foreignColumns: [tenants.tenantId],
      name: "fk_sales_document_status_history_tenant",
    })
      .onDelete("restrict")
      .onUpdate("cascade"),
    foreignKey({
      columns: [table.transitionedBy],
      foreignColumns: [users.userId],
      name: "fk_sales_document_status_history_transitioned_by",
    })
      .onDelete("restrict")
      .onUpdate("cascade"),
    ...tenantIsolationPolicies("sales_document_status_history"),
    serviceBypassPolicy("sales_document_status_history"),
  ]
);

export const documentApprovals = salesSchema.table(
  "document_approvals",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: integer("tenant_id").notNull(),
    documentType: salesTruthDocumentTypeEnum("document_type").notNull(),
    documentId: uuid("document_id").notNull(),
    approvalLevel: integer("approval_level").notNull().default(1),
    approverUserId: integer("approver_user_id").notNull(),
    approverRole: text("approver_role"),
    status: text("status").notNull().default("pending"),
    approvedAt: timestamp("approved_at", { withTimezone: true }),
    rejectedAt: timestamp("rejected_at", { withTimezone: true }),
    comments: text("comments"),
    documentAmount: numeric("document_amount", { precision: 14, scale: 2 }),
    ...timestampColumns,
    ...auditColumns(() => users.userId),
  },
  (table) => [
    index("idx_sales_document_approvals_tenant").on(table.tenantId),
    index("idx_sales_document_approvals_pending").on(
      table.tenantId,
      table.approverUserId,
      table.status
    ),
    index("idx_sales_document_approvals_history").on(
      table.tenantId,
      table.documentType,
      table.documentId,
      table.approvalLevel
    ),
    check("chk_sales_document_approvals_level_positive", sql`${table.approvalLevel} > 0`),
    check(
      "chk_sales_document_approvals_status",
      sql`${table.status} IN ('pending', 'approved', 'rejected')`
    ),
    check(
      "chk_sales_document_approvals_approved_consistency",
      sql`${table.status} <> 'approved' OR ${table.approvedAt} IS NOT NULL`
    ),
    check(
      "chk_sales_document_approvals_rejected_consistency",
      sql`${table.status} <> 'rejected' OR ${table.rejectedAt} IS NOT NULL`
    ),
    check(
      "chk_sales_document_approvals_amount_non_negative",
      sql`${table.documentAmount} IS NULL OR ${table.documentAmount} >= 0`
    ),
    uniqueIndex("uq_sales_document_approvals_document_level").on(
      table.tenantId,
      table.documentType,
      table.documentId,
      table.approvalLevel
    ),
    foreignKey({
      columns: [table.tenantId],
      foreignColumns: [tenants.tenantId],
      name: "fk_sales_document_approvals_tenant",
    })
      .onDelete("restrict")
      .onUpdate("cascade"),
    foreignKey({
      columns: [table.approverUserId],
      foreignColumns: [users.userId],
      name: "fk_sales_document_approvals_approver",
    })
      .onDelete("restrict")
      .onUpdate("cascade"),
    ...tenantIsolationPolicies("sales_document_approvals"),
    serviceBypassPolicy("sales_document_approvals"),
  ]
);

export const salesDocumentAttachments = salesSchema.table(
  "document_attachments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: integer("tenant_id").notNull(),
    documentType: salesTruthDocumentTypeEnum("document_type").notNull(),
    documentId: uuid("document_id").notNull(),
    /** When set, attachment is scoped to an immutable truth boundary (not only the live document). */
    truthBindingId: uuid("truth_binding_id"),
    fileName: text("file_name").notNull(),
    fileSize: integer("file_size").notNull(),
    mimeType: text("mime_type").notNull(),
    storageProvider: text("storage_provider").notNull(),
    storagePath: text("storage_path").notNull(),
    storageUrl: text("storage_url"),
    attachmentType: text("attachment_type"),
    description: text("description"),
    isPublic: boolean("is_public").notNull().default(false),
    ...timestampColumns,
    ...softDeleteColumns,
    ...auditColumns(() => users.userId),
  },
  (table) => [
    index("idx_sales_document_attachments_tenant").on(table.tenantId),
    index("idx_sales_document_attachments_lookup").on(
      table.tenantId,
      table.documentType,
      table.documentId,
      table.createdAt
    ),
    index("idx_sales_document_attachments_truth_binding").on(table.tenantId, table.truthBindingId),
    index("idx_sales_document_attachments_type").on(
      table.tenantId,
      table.attachmentType,
      table.createdAt
    ),
    uniqueIndex("uq_sales_document_attachments_storage_path")
      .on(table.tenantId, table.storagePath)
      .where(sql`${table.deletedAt} IS NULL`),
    uniqueIndex("uq_sales_document_attachments_document_file")
      .on(table.tenantId, table.documentType, table.documentId, table.fileName)
      .where(sql`${table.deletedAt} IS NULL`),
    check("chk_sales_document_attachments_size_non_negative", sql`${table.fileSize} >= 0`),
    foreignKey({
      columns: [table.tenantId],
      foreignColumns: [tenants.tenantId],
      name: "fk_sales_document_attachments_tenant",
    })
      .onDelete("restrict")
      .onUpdate("cascade"),
    foreignKey({
      columns: [table.truthBindingId],
      foreignColumns: [documentTruthBindings.id],
      name: "fk_sales_document_attachments_truth_binding",
    })
      .onDelete("set null")
      .onUpdate("cascade"),
    ...tenantIsolationPolicies("sales_document_attachments"),
    serviceBypassPolicy("sales_document_attachments"),
  ]
);

export const accountingPostings = salesSchema.table(
  "accounting_postings",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: integer("tenant_id").notNull(),
    /** Preferred anchor: immutable truth boundary (falls back to source document when migrating legacy rows). */
    truthBindingId: uuid("truth_binding_id"),
    /**
     * Idempotency key with `truth_binding_id`: at most one draft/posted row per (tenant, binding, type)
     * — see partial unique index in migrations.
     */
    postingEntryType: varchar("posting_entry_type", { length: 64 }).notNull().default("general"),
    sourceDocumentType: salesTruthDocumentTypeEnum("source_document_type").notNull(),
    sourceDocumentId: uuid("source_document_id").notNull(),
    journalEntryId: uuid("journal_entry_id"),
    postingDate: timestamp("posting_date", { withTimezone: true }).notNull(),
    debitAccountCode: text("debit_account_code"),
    creditAccountCode: text("credit_account_code"),
    amount: numeric("amount", { precision: 14, scale: 2 }).notNull().default("0"),
    currencyCode: text("currency_code").notNull(),
    postingStatus: text("posting_status").notNull().default("draft"),
    postedBy: integer("posted_by"),
    postedAt: timestamp("posted_at", { withTimezone: true }),
    reversedAt: timestamp("reversed_at", { withTimezone: true }),
    reversedBy: integer("reversed_by"),
    reversalReason: text("reversal_reason"),
    reversalEntryId: uuid("reversal_entry_id"),
    ...timestampColumns,
    ...auditColumns(() => users.userId),
  },
  (table) => [
    index("idx_sales_accounting_postings_tenant").on(table.tenantId),
    index("idx_sales_accounting_postings_date").on(
      table.tenantId,
      table.postingDate,
      table.postingStatus
    ),
    index("idx_sales_accounting_postings_source").on(
      table.tenantId,
      table.sourceDocumentType,
      table.sourceDocumentId
    ),
    index("idx_sales_accounting_postings_truth_binding").on(table.tenantId, table.truthBindingId),
    uniqueIndex("uq_sales_accounting_postings_truth_entry_active")
      .on(table.tenantId, table.truthBindingId, table.postingEntryType)
      .where(
        sql`${table.truthBindingId} IS NOT NULL AND ${table.postingStatus} IN ('draft','posted')`
      ),
    index("idx_sales_accounting_postings_currency_date").on(
      table.tenantId,
      table.currencyCode,
      table.postingDate
    ),
    check("chk_sales_accounting_postings_amount_non_negative", sql`${table.amount} >= 0`),
    check(
      "chk_sales_accounting_postings_debit_credit_distinct",
      sql`${table.debitAccountCode} IS NULL OR ${table.creditAccountCode} IS NULL OR ${table.debitAccountCode} <> ${table.creditAccountCode}`
    ),
    check(
      "chk_sales_accounting_postings_reversal_not_self",
      sql`${table.reversalEntryId} IS NULL OR ${table.reversalEntryId} <> ${table.id}`
    ),
    check(
      "chk_sales_accounting_postings_status",
      sql`${table.postingStatus} IN ('draft', 'posted', 'reversed')`
    ),
    check(
      "chk_sales_accounting_postings_posted_consistency",
      sql`${table.postingStatus} <> 'posted' OR (${table.postedBy} IS NOT NULL AND ${table.postedAt} IS NOT NULL)`
    ),
    check(
      "chk_sales_accounting_postings_reversed_consistency",
      sql`${table.postingStatus} <> 'reversed' OR (${table.reversedBy} IS NOT NULL AND ${table.reversedAt} IS NOT NULL)`
    ),
    check(
      "chk_sales_accounting_postings_posted_double_entry",
      sql`${table.postingStatus} <> 'posted' OR (${table.debitAccountCode} IS NOT NULL AND ${table.creditAccountCode} IS NOT NULL)`
    ),
    check(
      "chk_sales_accounting_postings_posted_truth_anchor",
      sql`${table.postingStatus} <> 'posted' OR ${table.truthBindingId} IS NOT NULL`
    ),
    foreignKey({
      columns: [table.tenantId],
      foreignColumns: [tenants.tenantId],
      name: "fk_sales_accounting_postings_tenant",
    })
      .onDelete("restrict")
      .onUpdate("cascade"),
    foreignKey({
      columns: [table.truthBindingId],
      foreignColumns: [documentTruthBindings.id],
      name: "fk_sales_accounting_postings_truth_binding",
    })
      .onDelete("restrict")
      .onUpdate("cascade"),
    foreignKey({
      columns: [table.journalEntryId],
      foreignColumns: [journalEntries.id],
      name: "fk_sales_accounting_postings_journal_entry",
    })
      .onDelete("set null")
      .onUpdate("cascade"),
    foreignKey({
      columns: [table.postedBy],
      foreignColumns: [users.userId],
      name: "fk_sales_accounting_postings_posted_by",
    })
      .onDelete("set null")
      .onUpdate("cascade"),
    foreignKey({
      columns: [table.reversedBy],
      foreignColumns: [users.userId],
      name: "fk_sales_accounting_postings_reversed_by",
    })
      .onDelete("set null")
      .onUpdate("cascade"),
    foreignKey({
      columns: [table.reversalEntryId],
      foreignColumns: [table.id],
      name: "fk_sales_accounting_postings_reversal_entry",
    })
      .onDelete("set null")
      .onUpdate("cascade"),
    ...tenantIsolationPolicies("sales_accounting_postings"),
    serviceBypassPolicy("sales_accounting_postings"),
  ]
);

export const domainInvariantLogs = salesSchema.table(
  "domain_invariant_logs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: integer("tenant_id").notNull(),
    invariantCode: text("invariant_code").notNull(),
    entityType: text("entity_type").notNull(),
    entityId: uuid("entity_id").notNull(),
    status: invariantStatusEnum("status").notNull(),
    severity: invariantSeverityEnum("severity").notNull(),
    expectedValue: text("expected_value"),
    actualValue: text("actual_value"),
    context: text("context"),
    /** When true and status/severity indicate failure, the truth pipeline must hard-stop (not advisory-only). */
    blocking: boolean("blocking").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    evaluatedAt: timestamp("evaluated_at", { withTimezone: true }).notNull().defaultNow(),
    ...auditColumns(() => users.userId),
  },
  (table) => [
    index("idx_sales_domain_invariant_logs_tenant").on(table.tenantId),
    index("idx_sales_domain_invariant_logs_entity").on(
      table.tenantId,
      table.entityType,
      table.entityId,
      table.evaluatedAt
    ),
    index("idx_sales_domain_invariant_logs_code").on(
      table.tenantId,
      table.invariantCode,
      table.evaluatedAt
    ),
    index("idx_sales_domain_invariant_logs_status").on(
      table.tenantId,
      table.status,
      table.severity,
      table.evaluatedAt
    ),
    foreignKey({
      columns: [table.tenantId],
      foreignColumns: [tenants.tenantId],
      name: "fk_sales_domain_invariant_logs_tenant",
    })
      .onDelete("restrict")
      .onUpdate("cascade"),
    ...tenantIsolationPolicies("sales_domain_invariant_logs"),
    serviceBypassPolicy("sales_domain_invariant_logs"),
  ]
);

export const domainEventLogs = salesSchema.table(
  "domain_event_logs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: integer("tenant_id").notNull(),
    eventType: domainEventTypeEnum("event_type").notNull(),
    entityType: text("entity_type").notNull(),
    entityId: uuid("entity_id").notNull(),
    payload: jsonb("payload")
      .notNull()
      .default(sql`'{}'::jsonb`)
      .$type<Record<string, unknown>>(),
    triggeredBy: integer("triggered_by"),
    causedByEventId: uuid("caused_by_event_id"),
    correlationId: varchar("correlation_id", { length: 128 }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    ...auditColumns(() => users.userId),
  },
  (table) => [
    index("idx_sales_domain_event_logs_tenant").on(table.tenantId),
    index("idx_sales_domain_event_logs_entity").on(
      table.tenantId,
      table.entityType,
      table.entityId,
      table.createdAt
    ),
    index("idx_sales_domain_event_logs_type").on(table.tenantId, table.eventType, table.createdAt),
    index("idx_sales_domain_event_logs_triggered_by").on(table.tenantId, table.triggeredBy),
    index("idx_sales_domain_event_logs_correlation").on(table.tenantId, table.correlationId),
    foreignKey({
      columns: [table.tenantId],
      foreignColumns: [tenants.tenantId],
      name: "fk_sales_domain_event_logs_tenant",
    })
      .onDelete("restrict")
      .onUpdate("cascade"),
    foreignKey({
      columns: [table.triggeredBy],
      foreignColumns: [users.userId],
      name: "fk_sales_domain_event_logs_user",
    })
      .onDelete("set null")
      .onUpdate("cascade"),
    foreignKey({
      columns: [table.causedByEventId],
      foreignColumns: [table.id],
      name: "fk_sales_domain_event_logs_caused_by",
    })
      .onDelete("set null")
      .onUpdate("cascade"),
    ...tenantIsolationPolicies("sales_domain_event_logs"),
    serviceBypassPolicy("sales_domain_event_logs"),
  ]
);

/**
 * One row per decision facet locked on a truth binding — prevents silent re-evaluation / drift after commit.
 */
export const truthDecisionLocks = salesSchema.table(
  "truth_decision_locks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: integer("tenant_id").notNull(),
    truthBindingId: uuid("truth_binding_id").notNull(),
    decisionType: truthDecisionTypeEnum("decision_type").notNull(),
    decisionHash: varchar("decision_hash", { length: 128 }).notNull(),
    lockedAt: timestamp("locked_at", { withTimezone: true }).notNull().defaultNow(),
    lockedBy: integer("locked_by").notNull(),
    ...timestampColumns,
    ...auditColumns(() => users.userId),
  },
  (table) => [
    uniqueIndex("uq_sales_truth_decision_locks_binding_type").on(
      table.tenantId,
      table.truthBindingId,
      table.decisionType
    ),
    index("idx_sales_truth_decision_locks_tenant").on(table.tenantId),
    index("idx_sales_truth_decision_locks_binding").on(table.tenantId, table.truthBindingId),
    foreignKey({
      columns: [table.tenantId],
      foreignColumns: [tenants.tenantId],
      name: "fk_sales_truth_decision_locks_tenant",
    })
      .onDelete("restrict")
      .onUpdate("cascade"),
    foreignKey({
      columns: [table.truthBindingId],
      foreignColumns: [documentTruthBindings.id],
      name: "fk_sales_truth_decision_locks_truth_binding",
    })
      .onDelete("restrict")
      .onUpdate("cascade"),
    foreignKey({
      columns: [table.lockedBy],
      foreignColumns: [users.userId],
      name: "fk_sales_truth_decision_locks_locked_by",
    })
      .onDelete("restrict")
      .onUpdate("cascade"),
    ...tenantIsolationPolicies("sales_truth_decision_locks"),
    serviceBypassPolicy("sales_truth_decision_locks"),
  ]
);

export const documentStatusHistorySelectSchema = createSelectSchema(documentStatusHistory);
export const documentApprovalSelectSchema = createSelectSchema(documentApprovals);
export const salesDocumentAttachmentSelectSchema = createSelectSchema(salesDocumentAttachments);
export const accountingPostingSelectSchema = createSelectSchema(accountingPostings);
export const domainInvariantLogSelectSchema = createSelectSchema(domainInvariantLogs);
export const domainEventLogSelectSchema = createSelectSchema(domainEventLogs);
export const truthDecisionLockSelectSchema = createSelectSchema(truthDecisionLocks);

export const documentStatusHistoryInsertSchema = createInsertSchema(documentStatusHistory, {
  id: DocumentStatusHistoryIdSchema.optional(),
  tenantId: z.number().int().positive(),
  documentType: SalesTruthDocumentTypeSchema,
  documentId: z.uuid(),
  fromStatus: z.string().max(120).optional().nullable(),
  toStatus: z.string().min(1).max(120),
  transitionedAt: instantWire.optional(),
  transitionedBy: z.number().int().positive(),
  reason: z.string().max(2000).optional().nullable(),
  notes: z.string().max(4000).optional().nullable(),
  createdBy: z.number().int().positive(),
  updatedBy: z.number().int().positive(),
});

export const documentApprovalInsertSchema = createInsertSchema(documentApprovals, {
  id: DocumentApprovalIdSchema.optional(),
  tenantId: z.number().int().positive(),
  documentType: SalesTruthDocumentTypeSchema,
  documentId: z.uuid(),
  approvalLevel: z.number().int().positive().optional(),
  approverUserId: z.number().int().positive(),
  approverRole: z.string().max(120).optional().nullable(),
  status: z.enum(["pending", "approved", "rejected"]).optional().default("pending"),
  approvedAt: instantWire.optional().nullable(),
  rejectedAt: instantWire.optional().nullable(),
  comments: z.string().max(4000).optional().nullable(),
  documentAmount: positiveMoneyStringSchema.optional().nullable(),
  createdBy: z.number().int().positive(),
  updatedBy: z.number().int().positive(),
});

export const salesDocumentAttachmentInsertSchema = createInsertSchema(salesDocumentAttachments, {
  id: SalesDocumentAttachmentIdSchema.optional(),
  tenantId: z.number().int().positive(),
  documentType: SalesTruthDocumentTypeSchema,
  documentId: z.uuid(),
  truthBindingId: DocumentTruthBindingIdSchema.optional().nullable(),
  fileName: z.string().min(1).max(512),
  fileSize: z.number().int().min(0),
  mimeType: z.string().min(1).max(255),
  storageProvider: z.string().min(1).max(80),
  storagePath: z.string().min(1).max(1024),
  storageUrl: z.url().optional().nullable(),
  attachmentType: z.string().max(120).optional().nullable(),
  description: z.string().max(4000).optional().nullable(),
  isPublic: z.boolean().optional().default(false),
  createdBy: z.number().int().positive(),
  updatedBy: z.number().int().positive(),
});

export const accountingPostingInsertSchema = createInsertSchema(accountingPostings, {
  id: AccountingPostingIdSchema.optional(),
  tenantId: z.number().int().positive(),
  truthBindingId: DocumentTruthBindingIdSchema.optional().nullable(),
  postingEntryType: z.string().min(1).max(64).optional(),
  sourceDocumentType: SalesTruthDocumentTypeSchema,
  sourceDocumentId: z.uuid(),
  journalEntryId: JournalEntryIdSchema.optional().nullable(),
  postingDate: instantWire,
  debitAccountCode: z.string().max(64).optional().nullable(),
  creditAccountCode: z.string().max(64).optional().nullable(),
  amount: positiveMoneyStringSchema.optional(),
  currencyCode: z.string().min(3).max(3),
  postingStatus: z.enum(["draft", "posted", "reversed"]).optional().default("draft"),
  postedBy: z.number().int().positive().optional().nullable(),
  postedAt: instantWire.optional().nullable(),
  reversedAt: instantWire.optional().nullable(),
  reversedBy: z.number().int().positive().optional().nullable(),
  reversalReason: z.string().max(2000).optional().nullable(),
  reversalEntryId: AccountingPostingIdSchema.optional().nullable(),
  createdBy: z.number().int().positive(),
  updatedBy: z.number().int().positive(),
}).superRefine((data, ctx) => {
  if (
    data.debitAccountCode != null &&
    data.creditAccountCode != null &&
    data.debitAccountCode === data.creditAccountCode
  ) {
    ctx.addIssue({
      code: "custom",
      message: "debitAccountCode and creditAccountCode must differ when both are set",
      path: ["creditAccountCode"],
    });
  }
  if (data.postingStatus === "posted") {
    if (data.truthBindingId == null) {
      ctx.addIssue({
        code: "custom",
        message: "posted rows require truthBindingId",
        path: ["truthBindingId"],
      });
    }
    if (data.debitAccountCode == null || data.creditAccountCode == null) {
      ctx.addIssue({
        code: "custom",
        message: "posted rows require debitAccountCode and creditAccountCode",
        path: ["debitAccountCode"],
      });
    }
  }
});

export const domainInvariantLogInsertSchema = createInsertSchema(domainInvariantLogs, {
  id: DomainInvariantLogIdSchema.optional(),
  tenantId: z.number().int().positive(),
  invariantCode: z.string().min(1).max(160),
  entityType: z.string().min(1).max(120),
  entityId: z.uuid(),
  status: InvariantStatusSchema,
  severity: InvariantSeveritySchema,
  expectedValue: z.string().max(4000).optional().nullable(),
  actualValue: z.string().max(4000).optional().nullable(),
  context: z.string().max(8000).optional().nullable(),
  blocking: z.boolean().optional(),
  evaluatedAt: instantWire.optional(),
  createdBy: z.number().int().positive(),
  updatedBy: z.number().int().positive(),
});

export const domainEventLogInsertSchema = createInsertSchema(domainEventLogs, {
  id: DomainEventLogIdSchema.optional(),
  tenantId: z.number().int().positive(),
  eventType: DomainEventTypeSchema,
  entityType: z.string().min(1).max(120),
  entityId: z.uuid(),
  payload: z.record(z.string(), z.unknown()).optional(),
  triggeredBy: z.number().int().positive().optional().nullable(),
  causedByEventId: DomainEventLogIdSchema.optional().nullable(),
  correlationId: z.string().max(128).optional().nullable(),
  createdBy: z.number().int().positive(),
  updatedBy: z.number().int().positive(),
});

export const truthDecisionLockInsertSchema = createInsertSchema(truthDecisionLocks, {
  id: TruthDecisionLockIdSchema.optional(),
  tenantId: z.number().int().positive(),
  truthBindingId: DocumentTruthBindingIdSchema,
  decisionType: TruthDecisionTypeSchema,
  decisionHash: z.string().min(32).max(128),
  lockedAt: instantWire.optional(),
  lockedBy: z.number().int().positive(),
  createdBy: z.number().int().positive(),
  updatedBy: z.number().int().positive(),
});

export const documentStatusHistoryUpdateSchema = createUpdateSchema(documentStatusHistory);
export const documentApprovalUpdateSchema = createUpdateSchema(documentApprovals);
export const salesDocumentAttachmentUpdateSchema = createUpdateSchema(salesDocumentAttachments);
export const accountingPostingUpdateSchema = createUpdateSchema(accountingPostings);
export const domainInvariantLogUpdateSchema = createUpdateSchema(domainInvariantLogs);
export const domainEventLogUpdateSchema = createUpdateSchema(domainEventLogs);
export const truthDecisionLockUpdateSchema = createUpdateSchema(truthDecisionLocks);

export type DocumentStatusHistory = typeof documentStatusHistory.$inferSelect;
export type NewDocumentStatusHistory = typeof documentStatusHistory.$inferInsert;
export type DocumentApproval = typeof documentApprovals.$inferSelect;
export type NewDocumentApproval = typeof documentApprovals.$inferInsert;
export type SalesDocumentAttachment = typeof salesDocumentAttachments.$inferSelect;
export type NewSalesDocumentAttachment = typeof salesDocumentAttachments.$inferInsert;
export type AccountingPosting = typeof accountingPostings.$inferSelect;
export type NewAccountingPosting = typeof accountingPostings.$inferInsert;
export type DomainInvariantLog = typeof domainInvariantLogs.$inferSelect;
export type NewDomainInvariantLog = typeof domainInvariantLogs.$inferInsert;
export type DomainEventLog = typeof domainEventLogs.$inferSelect;
export type NewDomainEventLog = typeof domainEventLogs.$inferInsert;
export type TruthDecisionLock = typeof truthDecisionLocks.$inferSelect;
export type NewTruthDecisionLock = typeof truthDecisionLocks.$inferInsert;
