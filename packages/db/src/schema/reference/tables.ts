import { sql } from "drizzle-orm";
import { createInsertSchema, createSelectSchema, createUpdateSchema } from "drizzle-orm/zod";
import {
  bigint,
  boolean,
  check,
  foreignKey,
  index,
  integer,
  jsonb,
  numeric,
  pgSchema,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { z } from "zod/v4";

import { tenantIsolationPolicies, serviceBypassPolicy } from "../../rls-policies/index.js";
import {
  appendOnlyTimestampColumns,
  auditColumns,
  softDeleteColumns,
  timestampColumns,
} from "../../column-kit/index.js";
import { dateOnlyWire } from "../../wire/temporal.js";
import { applicationStorageKeySchema } from "../../r2/objectKey.js";
import { tenants } from "../core/tenants.js";
import { users } from "../security/index.js";

export const referenceSchema = pgSchema("reference");

export const sequenceResetPeriods = ["yearly", "monthly", "never"] as const;
export const uomTypes = ["reference", "bigger", "smaller"] as const;
export const attachmentEntityTypes = [
  "sale_order",
  "return_order",
  "consignment_agreement",
  "subscription",
  "partner",
  /** Unscoped platform uploads (e.g. generic `/uploads` until linked to a domain entity). */
  "generic_upload",
] as const;
export const approvalActions = ["submit", "approve", "reject", "escalate"] as const;
export const approvalEntityTypes = [
  "sale_order",
  "return_order",
  "consignment_agreement",
  "subscription",
  "commission_batch",
] as const;

/** Generic blob lifecycle (not vendor-specific). */
export const storageStatuses = [
  "pending_upload",
  "uploaded",
  "verified",
  "failed",
  "tombstone",
] as const;

export const tenantStorageClasses = ["STANDARD", "STANDARD_IA"] as const;

export const tenantStorageQuotaRequestStatuses = [
  "submitted",
  "under_review",
  "approved",
  "rejected",
  "applied",
  "cancelled",
] as const;

/** Business Truth Storage Engine — document reconciliation with ERP truth. */
export const truthResolutionStates = ["RESOLVED", "AMBIGUOUS", "REJECTED"] as const;
export const truthRecommendedActions = ["ALLOW", "ESCALATE", "BLOCK"] as const;
export const truthDuplicateRisks = ["NONE", "LOW", "MEDIUM", "HIGH"] as const;
export const truthResolutionTaskStatuses = ["OPEN", "IN_REVIEW", "RESOLVED", "REJECTED"] as const;
export const preDecisionBlockTypes = [
  "PAYMENT",
  "CONTRACT_EXECUTION",
  "DELETE",
  "WORKFLOW_ADVANCE",
] as const;
export const malwareScanStatuses = ["not_required", "pending", "clean", "quarantined", "failed"] as const;
export const signatureWorkflowStatuses = [
  "NOT_REQUIRED",
  "PENDING",
  "IN_PROGRESS",
  "COMPLETED",
  "REJECTED",
] as const;
export const signatureAttestationStatuses = ["REQUESTED", "SIGNED", "DECLINED", "EXPIRED"] as const;
export const truthOverrideOutcomes = ["CONFIRMED_BLOCK", "FALSE_BLOCK", "WAIVED"] as const;
export const guardrailActionTypes = ["PAYMENT", "CONTRACT_EXECUTION", "DELETE", "WORKFLOW_ADVANCE"] as const;

export const sequenceResetPeriodEnum = referenceSchema.enum("sequence_reset_period", [
  ...sequenceResetPeriods,
]);
export const uomTypeEnum = referenceSchema.enum("uom_type", [...uomTypes]);
export const attachmentEntityTypeEnum = referenceSchema.enum("attachment_entity_type", [
  ...attachmentEntityTypes,
]);
export const approvalActionEnum = referenceSchema.enum("approval_action", [...approvalActions]);
export const approvalEntityTypeEnum = referenceSchema.enum("approval_entity_type", [
  ...approvalEntityTypes,
]);
export const storageStatusEnum = referenceSchema.enum("storage_status", [...storageStatuses]);
export const tenantStorageClassEnum = referenceSchema.enum("tenant_storage_class", [
  ...tenantStorageClasses,
]);
export const tenantStorageQuotaRequestStatusEnum = referenceSchema.enum(
  "tenant_storage_quota_request_status",
  [...tenantStorageQuotaRequestStatuses]
);
export const truthResolutionStateEnum = referenceSchema.enum("truth_resolution_state", [
  ...truthResolutionStates,
]);
export const truthRecommendedActionEnum = referenceSchema.enum("truth_recommended_action", [
  ...truthRecommendedActions,
]);
export const truthDuplicateRiskEnum = referenceSchema.enum("truth_duplicate_risk", [
  ...truthDuplicateRisks,
]);
export const truthResolutionTaskStatusEnum = referenceSchema.enum(
  "truth_resolution_task_status",
  [...truthResolutionTaskStatuses]
);
export const preDecisionBlockTypeEnum = referenceSchema.enum("pre_decision_block_type", [
  ...preDecisionBlockTypes,
]);
export const malwareScanStatusEnum = referenceSchema.enum("malware_scan_status", [
  ...malwareScanStatuses,
]);
export const signatureWorkflowStatusEnum = referenceSchema.enum("signature_workflow_status", [
  ...signatureWorkflowStatuses,
]);
export const signatureAttestationStatusEnum = referenceSchema.enum("signature_attestation_status", [
  ...signatureAttestationStatuses,
]);
export const truthOverrideOutcomeEnum = referenceSchema.enum("truth_override_outcome", [
  ...truthOverrideOutcomes,
]);
export const guardrailActionTypeEnum = referenceSchema.enum("guardrail_action_type", [
  ...guardrailActionTypes,
]);

export const SequenceResetPeriodSchema = z.enum(sequenceResetPeriods);
export const UomTypeSchema = z.enum(uomTypes);
export const AttachmentEntityTypeSchema = z.enum(attachmentEntityTypes);
export const ApprovalActionSchema = z.enum(approvalActions);
export const ApprovalEntityTypeSchema = z.enum(approvalEntityTypes);
export const StorageStatusSchema = z.enum(storageStatuses);
export const TenantStorageClassSchema = z.enum(tenantStorageClasses);
export const TenantStorageQuotaRequestStatusSchema = z.enum(tenantStorageQuotaRequestStatuses);
export const TruthResolutionStateSchema = z.enum(truthResolutionStates);
export const TruthRecommendedActionSchema = z.enum(truthRecommendedActions);
export const TruthDuplicateRiskSchema = z.enum(truthDuplicateRisks);
export const TruthResolutionTaskStatusSchema = z.enum(truthResolutionTaskStatuses);
export const PreDecisionBlockTypeSchema = z.enum(preDecisionBlockTypes);
export const MalwareScanStatusSchema = z.enum(malwareScanStatuses);
export const SignatureWorkflowStatusSchema = z.enum(signatureWorkflowStatuses);
export const SignatureAttestationStatusSchema = z.enum(signatureAttestationStatuses);
export const TruthOverrideOutcomeSchema = z.enum(truthOverrideOutcomes);
export const GuardrailActionTypeSchema = z.enum(guardrailActionTypes);

export const countries = referenceSchema.table(
  "countries",
  {
    countryId: integer("country_id").primaryKey().generatedAlwaysAsIdentity(),
    code: text("code").notNull(),
    name: text("name").notNull(),
    phoneCode: text("phone_code"),
    vatLabel: text("vat_label"),
    ...timestampColumns,
    ...softDeleteColumns,
    ...auditColumns(() => users.userId),
  },
  (table) => [
    index("idx_reference_countries_name").on(table.name),
    uniqueIndex("uq_reference_countries_code")
      .on(sql`lower(${table.code})`)
      .where(sql`${table.deletedAt} IS NULL`),
  ]
);

export const states = referenceSchema.table(
  "states",
  {
    stateId: integer("state_id").primaryKey().generatedAlwaysAsIdentity(),
    countryId: integer("country_id").notNull(),
    code: text("code").notNull(),
    name: text("name").notNull(),
    ...timestampColumns,
    ...softDeleteColumns,
    ...auditColumns(() => users.userId),
  },
  (table) => [
    index("idx_reference_states_country").on(table.countryId, table.name),
    uniqueIndex("uq_reference_states_country_code")
      .on(table.countryId, sql`lower(${table.code})`)
      .where(sql`${table.deletedAt} IS NULL`),
    foreignKey({
      columns: [table.countryId],
      foreignColumns: [countries.countryId],
      name: "fk_reference_states_country",
    })
      .onDelete("restrict")
      .onUpdate("cascade"),
  ]
);

export const currencies = referenceSchema.table(
  "currencies",
  {
    currencyId: integer("currency_id").primaryKey().generatedAlwaysAsIdentity(),
    code: text("code").notNull(),
    name: text("name").notNull(),
    symbol: text("symbol"),
    decimalPlaces: integer("decimal_places").notNull().default(2),
    rounding: numeric("rounding", { precision: 12, scale: 6 }).notNull().default("0.01"),
    isActive: boolean("is_active").notNull().default(true),
    ...timestampColumns,
    ...softDeleteColumns,
    ...auditColumns(() => users.userId),
  },
  (table) => [
    index("idx_reference_currencies_active").on(table.isActive, table.code),
    uniqueIndex("uq_reference_currencies_code")
      .on(sql`upper(${table.code})`)
      .where(sql`${table.deletedAt} IS NULL`),
    check(
      "chk_reference_currencies_decimal_places",
      sql`${table.decimalPlaces} >= 0 AND ${table.decimalPlaces} <= 6`
    ),
    check("chk_reference_currencies_rounding_positive", sql`${table.rounding} > 0`),
  ]
);

export const currencyRates = referenceSchema.table(
  "currency_rates",
  {
    currencyRateId: integer("currency_rate_id").primaryKey().generatedAlwaysAsIdentity(),
    currencyId: integer("currency_id").notNull(),
    rate: numeric("rate", { precision: 12, scale: 6 }).notNull(),
    inverseRate: numeric("inverse_rate", { precision: 12, scale: 6 }).notNull(),
    effectiveDate: text("effective_date").notNull(),
    source: text("source"),
    ...appendOnlyTimestampColumns,
    ...auditColumns(() => users.userId),
  },
  (table) => [
    index("idx_reference_currency_rates_date").on(table.currencyId, table.effectiveDate),
    uniqueIndex("uq_reference_currency_rates_currency_date").on(
      table.currencyId,
      table.effectiveDate
    ),
    check("chk_reference_currency_rates_rate_positive", sql`${table.rate} > 0`),
    check("chk_reference_currency_rates_inverse_rate_positive", sql`${table.inverseRate} > 0`),
    foreignKey({
      columns: [table.currencyId],
      foreignColumns: [currencies.currencyId],
      name: "fk_reference_currency_rates_currency",
    })
      .onDelete("restrict")
      .onUpdate("cascade"),
  ]
);

export const banks = referenceSchema.table(
  "banks",
  {
    bankId: integer("bank_id").primaryKey().generatedAlwaysAsIdentity(),
    name: text("name").notNull(),
    bic: text("bic"),
    countryId: integer("country_id"),
    ...timestampColumns,
    ...softDeleteColumns,
    ...auditColumns(() => users.userId),
  },
  (table) => [
    index("idx_reference_banks_country").on(table.countryId, table.name),
    uniqueIndex("uq_reference_banks_name_country")
      .on(sql`lower(${table.name})`, table.countryId)
      .where(sql`${table.deletedAt} IS NULL`),
    foreignKey({
      columns: [table.countryId],
      foreignColumns: [countries.countryId],
      name: "fk_reference_banks_country",
    })
      .onDelete("set null")
      .onUpdate("cascade"),
  ]
);

export const sequences = referenceSchema.table(
  "sequences",
  {
    sequenceId: integer("sequence_id").primaryKey().generatedAlwaysAsIdentity(),
    tenantId: integer("tenant_id").notNull(),
    code: text("code").notNull(),
    prefix: text("prefix"),
    suffix: text("suffix"),
    padding: integer("padding").notNull().default(4),
    step: integer("step").notNull().default(1),
    nextNumber: integer("next_number").notNull().default(1),
    resetPeriod: sequenceResetPeriodEnum("reset_period").notNull().default("never"),
    ...timestampColumns,
    ...softDeleteColumns,
    ...auditColumns(() => users.userId),
  },
  (table) => [
    index("idx_reference_sequences_tenant").on(table.tenantId, table.code),
    uniqueIndex("uq_reference_sequences_tenant_code")
      .on(table.tenantId, sql`lower(${table.code})`)
      .where(sql`${table.deletedAt} IS NULL`),
    check("chk_reference_sequences_padding_non_negative", sql`${table.padding} >= 0`),
    check("chk_reference_sequences_step_positive", sql`${table.step} > 0`),
    check("chk_reference_sequences_next_number_positive", sql`${table.nextNumber} > 0`),
    foreignKey({
      columns: [table.tenantId],
      foreignColumns: [tenants.tenantId],
      name: "fk_reference_sequences_tenant",
    })
      .onDelete("restrict")
      .onUpdate("cascade"),
    ...tenantIsolationPolicies("reference_sequences"),
    serviceBypassPolicy("reference_sequences"),
  ]
);

export const uomCategories = referenceSchema.table(
  "uom_categories",
  {
    uomCategoryId: integer("uom_category_id").primaryKey().generatedAlwaysAsIdentity(),
    name: text("name").notNull(),
    ...timestampColumns,
    ...softDeleteColumns,
    ...auditColumns(() => users.userId),
  },
  (table) => [
    uniqueIndex("uq_reference_uom_categories_name")
      .on(sql`lower(${table.name})`)
      .where(sql`${table.deletedAt} IS NULL`),
  ]
);

export const unitsOfMeasure = referenceSchema.table(
  "units_of_measure",
  {
    uomId: integer("uom_id").primaryKey().generatedAlwaysAsIdentity(),
    categoryId: integer("category_id").notNull(),
    name: text("name").notNull(),
    factor: numeric("factor", { precision: 14, scale: 6 }).notNull(),
    uomType: uomTypeEnum("uom_type").notNull(),
    rounding: numeric("rounding", { precision: 14, scale: 6 }).notNull().default("0.0001"),
    ...timestampColumns,
    ...softDeleteColumns,
    ...auditColumns(() => users.userId),
  },
  (table) => [
    index("idx_reference_uoms_category").on(table.categoryId, table.name),
    uniqueIndex("uq_reference_uoms_category_name")
      .on(table.categoryId, sql`lower(${table.name})`)
      .where(sql`${table.deletedAt} IS NULL`),
    uniqueIndex("uq_reference_uoms_reference_per_category")
      .on(table.categoryId)
      .where(sql`${table.deletedAt} IS NULL AND ${table.uomType} = 'reference'`),
    check("chk_reference_uoms_factor_positive", sql`${table.factor} > 0`),
    check("chk_reference_uoms_rounding_positive", sql`${table.rounding} > 0`),
    foreignKey({
      columns: [table.categoryId],
      foreignColumns: [uomCategories.uomCategoryId],
      name: "fk_reference_uoms_category",
    })
      .onDelete("restrict")
      .onUpdate("cascade"),
  ]
);

export const tenantStoragePolicies = referenceSchema.table(
  "tenant_storage_policies",
  {
    tenantId: integer("tenant_id").primaryKey(),
    hardQuotaBytes: bigint("hard_quota_bytes", { mode: "bigint" }).notNull(),
    graceQuotaBytes: bigint("grace_quota_bytes", { mode: "bigint" }).notNull().default(0n),
    defaultStorageClass: tenantStorageClassEnum("default_storage_class")
      .notNull()
      .default("STANDARD"),
    isUploadBlocked: boolean("is_upload_blocked").notNull().default(false),
    ...timestampColumns,
  },
  (table) => [
    check("chk_reference_tenant_storage_policies_hard_quota_nonneg", sql`${table.hardQuotaBytes} >= 0`),
    check("chk_reference_tenant_storage_policies_grace_nonneg", sql`${table.graceQuotaBytes} >= 0`),
    foreignKey({
      columns: [table.tenantId],
      foreignColumns: [tenants.tenantId],
      name: "fk_reference_tenant_storage_policies_tenant",
    })
      .onDelete("restrict")
      .onUpdate("cascade"),
    ...tenantIsolationPolicies("reference_tenant_storage_policies"),
    serviceBypassPolicy("reference_tenant_storage_policies"),
  ]
);

export const tenantStorageUsage = referenceSchema.table(
  "tenant_storage_usage",
  {
    tenantId: integer("tenant_id").primaryKey(),
    reservedBytes: bigint("reserved_bytes", { mode: "bigint" }).notNull().default(0n),
    committedBytes: bigint("committed_bytes", { mode: "bigint" }).notNull().default(0n),
    lastReconciledAt: timestamp("last_reconciled_at", { withTimezone: true }),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    check("chk_reference_tenant_storage_usage_reserved_nonneg", sql`${table.reservedBytes} >= 0`),
    check("chk_reference_tenant_storage_usage_committed_nonneg", sql`${table.committedBytes} >= 0`),
    foreignKey({
      columns: [table.tenantId],
      foreignColumns: [tenants.tenantId],
      name: "fk_reference_tenant_storage_usage_tenant",
    })
      .onDelete("restrict")
      .onUpdate("cascade"),
    ...tenantIsolationPolicies("reference_tenant_storage_usage"),
    serviceBypassPolicy("reference_tenant_storage_usage"),
  ]
);

export const tenantStorageQuotaRequests = referenceSchema.table(
  "tenant_storage_quota_requests",
  {
    requestId: uuid("request_id").primaryKey().defaultRandom(),
    tenantId: integer("tenant_id").notNull(),
    requestedHardQuotaBytes: bigint("requested_hard_quota_bytes", { mode: "bigint" }).notNull(),
    reason: text("reason"),
    status: tenantStorageQuotaRequestStatusEnum("status").notNull().default("submitted"),
    reviewedBy: integer("reviewed_by"),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
    decisionNote: text("decision_note"),
    appliedAt: timestamp("applied_at", { withTimezone: true }),
    ...appendOnlyTimestampColumns,
  },
  (table) => [
    index("idx_reference_tenant_storage_quota_requests_tenant_status").on(
      table.tenantId,
      table.status
    ),
    check(
      "chk_reference_tenant_storage_quota_requests_requested_nonneg",
      sql`${table.requestedHardQuotaBytes} >= 0`
    ),
    uniqueIndex("uq_reference_tenant_storage_quota_requests_active_per_tenant")
      .on(table.tenantId)
      .where(
        sql`${table.status} IN ('submitted'::reference.tenant_storage_quota_request_status, 'under_review'::reference.tenant_storage_quota_request_status)`
      ),
    foreignKey({
      columns: [table.tenantId],
      foreignColumns: [tenants.tenantId],
      name: "fk_reference_tenant_storage_quota_requests_tenant",
    })
      .onDelete("restrict")
      .onUpdate("cascade"),
    foreignKey({
      columns: [table.reviewedBy],
      foreignColumns: [users.userId],
      name: "fk_reference_tenant_storage_quota_requests_reviewer",
    })
      .onDelete("set null")
      .onUpdate("cascade"),
    ...tenantIsolationPolicies("reference_tenant_storage_quota_requests"),
    serviceBypassPolicy("reference_tenant_storage_quota_requests"),
  ]
);

export const documentAttachments = referenceSchema.table(
  "document_attachments",
  {
    attachmentId: uuid("attachment_id").primaryKey().defaultRandom(),
    tenantId: integer("tenant_id").notNull(),
    entityType: attachmentEntityTypeEnum("entity_type").notNull(),
    entityId: uuid("entity_id").notNull(),
    filename: text("filename").notNull(),
    contentType: text("content_type").notNull(),
    byteSize: integer("byte_size").notNull(),
    storageKey: text("storage_key").notNull(),
    uploadedBy: integer("uploaded_by"),
    idempotencyKey: text("idempotency_key"),
    checksum: text("checksum"),
    storageStatus: storageStatusEnum("storage_status").notNull().default("uploaded"),
    /** Truth Binding Engine — reconciliation state (default RESOLVED for backward compatibility). */
    truthResolutionState: truthResolutionStateEnum("truth_resolution_state")
      .notNull()
      .default("RESOLVED"),
    truthPolicyVersion: text("truth_policy_version"),
    truthDecisionAt: timestamp("truth_decision_at", { withTimezone: true }),
    truthDecisionSummary: jsonb("truth_decision_summary").$type<Record<string, unknown>>(),
    truthRequiresReview: boolean("truth_requires_review").notNull().default(false),
    /** Optional binding to a business event for lineage (nullable until bound). */
    businessEventType: text("business_event_type"),
    businessEventId: uuid("business_event_id"),
    malwareScanStatus: malwareScanStatusEnum("malware_scan_status").notNull().default("not_required"),
    signatureWorkflowStatus: signatureWorkflowStatusEnum("signature_workflow_status")
      .notNull()
      .default("NOT_REQUIRED"),
    signatureWorkflowUpdatedAt: timestamp("signature_workflow_updated_at", { withTimezone: true }),
    legalHoldActive: boolean("legal_hold_active").notNull().default(false),
    retentionExpiresAt: timestamp("retention_expires_at", { withTimezone: true }),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    ...appendOnlyTimestampColumns,
  },
  (table) => [
    index("idx_reference_document_attachments_entity").on(
      table.tenantId,
      table.entityType,
      table.entityId
    ),
    index("idx_reference_document_attachments_uploaded_by").on(table.tenantId, table.uploadedBy),
    uniqueIndex("uq_reference_document_attachments_storage_key").on(
      table.tenantId,
      table.storageKey
    ),
    uniqueIndex("uq_reference_document_attachments_tenant_idempotency")
      .on(table.tenantId, table.idempotencyKey)
      .where(sql`${table.idempotencyKey} IS NOT NULL`),
    uniqueIndex("uq_reference_document_attachments_tenant_checksum")
      .on(table.tenantId, table.checksum)
      .where(
        sql`${table.checksum} IS NOT NULL AND ${table.storageStatus} <> 'tombstone'::reference.storage_status`
      ),
    check("chk_reference_document_attachments_byte_size_non_negative", sql`${table.byteSize} >= 0`),
    foreignKey({
      columns: [table.tenantId],
      foreignColumns: [tenants.tenantId],
      name: "fk_reference_document_attachments_tenant",
    })
      .onDelete("restrict")
      .onUpdate("cascade"),
    foreignKey({
      columns: [table.uploadedBy],
      foreignColumns: [users.userId],
      name: "fk_reference_document_attachments_uploaded_by",
    })
      .onDelete("set null")
      .onUpdate("cascade"),
    ...tenantIsolationPolicies("reference_document_attachments"),
    serviceBypassPolicy("reference_document_attachments"),
  ]
);

/** Append-only log of Document Truth Compiler outputs. */
export const documentTruthDecisions = referenceSchema.table(
  "document_truth_decisions",
  {
    decisionId: uuid("decision_id").primaryKey().defaultRandom(),
    tenantId: integer("tenant_id").notNull(),
    attachmentId: uuid("attachment_id").notNull(),
    resolutionState: truthResolutionStateEnum("resolution_state").notNull(),
    recommendedAction: truthRecommendedActionEnum("recommended_action").notNull(),
    duplicateRisk: truthDuplicateRiskEnum("duplicate_risk").notNull(),
    financialImpactAmount: numeric("financial_impact_amount", { precision: 18, scale: 4 }),
    requiresHumanReview: boolean("requires_human_review").notNull(),
    decisionReasons: text("decision_reasons").array().notNull(),
    evidenceRefs: jsonb("evidence_refs").$type<Record<string, unknown>>().notNull(),
    policyVersion: text("policy_version").notNull(),
    compiledAt: timestamp("compiled_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_reference_document_truth_decisions_tenant_attachment_time").on(
      table.tenantId,
      table.attachmentId,
      table.compiledAt
    ),
    index("idx_reference_document_truth_decisions_tenant_resolution").on(
      table.tenantId,
      table.resolutionState
    ),
    index("idx_reference_document_truth_decisions_reasons_gin").using("gin", table.decisionReasons),
    foreignKey({
      columns: [table.tenantId],
      foreignColumns: [tenants.tenantId],
      name: "fk_reference_document_truth_decisions_tenant",
    })
      .onDelete("restrict")
      .onUpdate("cascade"),
    foreignKey({
      columns: [table.attachmentId],
      foreignColumns: [documentAttachments.attachmentId],
      name: "fk_reference_document_truth_decisions_attachment",
    })
      .onDelete("cascade")
      .onUpdate("cascade"),
    ...tenantIsolationPolicies("reference_document_truth_decisions"),
    serviceBypassPolicy("reference_document_truth_decisions"),
  ]
);

/** Human resolution workflow for ambiguous truth states. */
export const documentTruthResolutionTasks = referenceSchema.table(
  "document_truth_resolution_tasks",
  {
    taskId: uuid("task_id").primaryKey().defaultRandom(),
    tenantId: integer("tenant_id").notNull(),
    attachmentId: uuid("attachment_id").notNull(),
    taskStatus: truthResolutionTaskStatusEnum("task_status").notNull().default("OPEN"),
    assignedTo: integer("assigned_to"),
    openedReasonCodes: text("opened_reason_codes").array().notNull(),
    blockedEffects: text("blocked_effects").array().notNull(),
    openedAt: timestamp("opened_at", { withTimezone: true }).notNull().defaultNow(),
    resolvedAt: timestamp("resolved_at", { withTimezone: true }),
  },
  (table) => [
    uniqueIndex("uq_reference_truth_resolution_tasks_open_per_attachment")
      .on(table.tenantId, table.attachmentId)
      .where(
        sql`${table.taskStatus} IN ('OPEN'::reference.truth_resolution_task_status, 'IN_REVIEW'::reference.truth_resolution_task_status)`
      ),
    index("idx_reference_truth_resolution_tasks_tenant_status").on(table.tenantId, table.taskStatus),
    foreignKey({
      columns: [table.tenantId],
      foreignColumns: [tenants.tenantId],
      name: "fk_reference_truth_resolution_tasks_tenant",
    })
      .onDelete("restrict")
      .onUpdate("cascade"),
    foreignKey({
      columns: [table.attachmentId],
      foreignColumns: [documentAttachments.attachmentId],
      name: "fk_reference_truth_resolution_tasks_attachment",
    })
      .onDelete("cascade")
      .onUpdate("cascade"),
    foreignKey({
      columns: [table.assignedTo],
      foreignColumns: [users.userId],
      name: "fk_reference_truth_resolution_tasks_assigned",
    })
      .onDelete("set null")
      .onUpdate("cascade"),
    ...tenantIsolationPolicies("reference_document_truth_resolution_tasks"),
    serviceBypassPolicy("reference_document_truth_resolution_tasks"),
  ]
);

/** Pre-decision guardrails — active blocks on downstream effects. */
export const documentPreDecisionBlocks = referenceSchema.table(
  "document_pre_decision_blocks",
  {
    blockId: uuid("block_id").primaryKey().defaultRandom(),
    tenantId: integer("tenant_id").notNull(),
    attachmentId: uuid("attachment_id").notNull(),
    blockType: preDecisionBlockTypeEnum("block_type").notNull(),
    blockReasonCode: text("block_reason_code").notNull(),
    active: boolean("active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    clearedAt: timestamp("cleared_at", { withTimezone: true }),
  },
  (table) => [
    index("idx_reference_pre_decision_blocks_tenant_attachment_active").on(
      table.tenantId,
      table.attachmentId,
      table.active
    ),
    foreignKey({
      columns: [table.tenantId],
      foreignColumns: [tenants.tenantId],
      name: "fk_reference_pre_decision_blocks_tenant",
    })
      .onDelete("restrict")
      .onUpdate("cascade"),
    foreignKey({
      columns: [table.attachmentId],
      foreignColumns: [documentAttachments.attachmentId],
      name: "fk_reference_pre_decision_blocks_attachment",
    })
      .onDelete("cascade")
      .onUpdate("cascade"),
    ...tenantIsolationPolicies("reference_document_pre_decision_blocks"),
    serviceBypassPolicy("reference_document_pre_decision_blocks"),
  ]
);

/** Signature workflow primitives for legal/commercial documents. */
export const documentSignatureAttestations = referenceSchema.table(
  "document_signature_attestations",
  {
    attestationId: uuid("attestation_id").primaryKey().defaultRandom(),
    tenantId: integer("tenant_id").notNull(),
    attachmentId: uuid("attachment_id").notNull(),
    signerUserId: integer("signer_user_id"),
    signerEmail: text("signer_email").notNull(),
    signerName: text("signer_name"),
    attestationStatus: signatureAttestationStatusEnum("attestation_status")
      .notNull()
      .default("REQUESTED"),
    attestedAt: timestamp("attested_at", { withTimezone: true }),
    evidenceRefs: jsonb("evidence_refs").$type<Record<string, unknown>>().notNull().default({}),
    notes: text("notes"),
    ...timestampColumns,
  },
  (table) => [
    index("idx_reference_document_signature_attestations_attachment").on(
      table.tenantId,
      table.attachmentId,
      table.attestationStatus
    ),
    index("idx_reference_document_signature_attestations_signer").on(
      table.tenantId,
      table.signerEmail,
      table.attestationStatus
    ),
    foreignKey({
      columns: [table.tenantId],
      foreignColumns: [tenants.tenantId],
      name: "fk_reference_document_signature_attestations_tenant",
    })
      .onDelete("restrict")
      .onUpdate("cascade"),
    foreignKey({
      columns: [table.attachmentId],
      foreignColumns: [documentAttachments.attachmentId],
      name: "fk_reference_document_signature_attestations_attachment",
    })
      .onDelete("cascade")
      .onUpdate("cascade"),
    foreignKey({
      columns: [table.signerUserId],
      foreignColumns: [users.userId],
      name: "fk_reference_document_signature_attestations_signer_user",
    })
      .onDelete("set null")
      .onUpdate("cascade"),
    ...tenantIsolationPolicies("reference_document_signature_attestations"),
    serviceBypassPolicy("reference_document_signature_attestations"),
  ]
);

/** Human adjudication events for truth compiler outputs (false-block tracking). */
export const documentTruthOverrides = referenceSchema.table(
  "document_truth_overrides",
  {
    overrideId: uuid("override_id").primaryKey().defaultRandom(),
    tenantId: integer("tenant_id").notNull(),
    attachmentId: uuid("attachment_id").notNull(),
    taskId: uuid("task_id"),
    actorUserId: integer("actor_user_id"),
    overrideOutcome: truthOverrideOutcomeEnum("override_outcome").notNull(),
    previousRecommendedAction: truthRecommendedActionEnum("previous_recommended_action").notNull(),
    overrideRecommendedAction: truthRecommendedActionEnum("override_recommended_action").notNull(),
    reason: text("reason").notNull(),
    evidenceRefs: jsonb("evidence_refs").$type<Record<string, unknown>>().notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_reference_document_truth_overrides_attachment").on(
      table.tenantId,
      table.attachmentId,
      table.createdAt
    ),
    index("idx_reference_document_truth_overrides_outcome").on(table.tenantId, table.overrideOutcome),
    foreignKey({
      columns: [table.tenantId],
      foreignColumns: [tenants.tenantId],
      name: "fk_reference_document_truth_overrides_tenant",
    })
      .onDelete("restrict")
      .onUpdate("cascade"),
    foreignKey({
      columns: [table.attachmentId],
      foreignColumns: [documentAttachments.attachmentId],
      name: "fk_reference_document_truth_overrides_attachment",
    })
      .onDelete("cascade")
      .onUpdate("cascade"),
    foreignKey({
      columns: [table.taskId],
      foreignColumns: [documentTruthResolutionTasks.taskId],
      name: "fk_reference_document_truth_overrides_task",
    })
      .onDelete("set null")
      .onUpdate("cascade"),
    foreignKey({
      columns: [table.actorUserId],
      foreignColumns: [users.userId],
      name: "fk_reference_document_truth_overrides_actor",
    })
      .onDelete("set null")
      .onUpdate("cascade"),
    ...tenantIsolationPolicies("reference_document_truth_overrides"),
    serviceBypassPolicy("reference_document_truth_overrides"),
  ]
);

/** Guardrail evaluation events (attempted action -> blocked/allowed with reasons). */
export const documentGuardrailEvents = referenceSchema.table(
  "document_guardrail_events",
  {
    eventId: uuid("event_id").primaryKey().defaultRandom(),
    tenantId: integer("tenant_id").notNull(),
    attachmentId: uuid("attachment_id").notNull(),
    attemptedAction: guardrailActionTypeEnum("attempted_action").notNull(),
    blocked: boolean("blocked").notNull(),
    reasonCodes: text("reason_codes").array().notNull(),
    actorUserId: integer("actor_user_id"),
    context: jsonb("context").$type<Record<string, unknown>>().notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_reference_document_guardrail_events_attachment").on(
      table.tenantId,
      table.attachmentId,
      table.createdAt
    ),
    index("idx_reference_document_guardrail_events_action").on(
      table.tenantId,
      table.attemptedAction,
      table.blocked
    ),
    foreignKey({
      columns: [table.tenantId],
      foreignColumns: [tenants.tenantId],
      name: "fk_reference_document_guardrail_events_tenant",
    })
      .onDelete("restrict")
      .onUpdate("cascade"),
    foreignKey({
      columns: [table.attachmentId],
      foreignColumns: [documentAttachments.attachmentId],
      name: "fk_reference_document_guardrail_events_attachment",
    })
      .onDelete("cascade")
      .onUpdate("cascade"),
    foreignKey({
      columns: [table.actorUserId],
      foreignColumns: [users.userId],
      name: "fk_reference_document_guardrail_events_actor",
    })
      .onDelete("set null")
      .onUpdate("cascade"),
    ...tenantIsolationPolicies("reference_document_guardrail_events"),
    serviceBypassPolicy("reference_document_guardrail_events"),
  ]
);

export const approvalLogs = referenceSchema.table(
  "approval_logs",
  {
    approvalLogId: uuid("approval_log_id").primaryKey().defaultRandom(),
    tenantId: integer("tenant_id").notNull(),
    entityType: approvalEntityTypeEnum("entity_type").notNull(),
    entityId: uuid("entity_id").notNull(),
    action: approvalActionEnum("action").notNull(),
    actorId: integer("actor_id"),
    actorRoleSnapshot: text("actor_role_snapshot"),
    reason: text("reason"),
    decidedAt: text("decided_at").notNull(),
    ...appendOnlyTimestampColumns,
  },
  (table) => [
    index("idx_reference_approval_logs_entity").on(
      table.tenantId,
      table.entityType,
      table.entityId
    ),
    index("idx_reference_approval_logs_actor").on(table.tenantId, table.actorId, table.decidedAt),
    foreignKey({
      columns: [table.tenantId],
      foreignColumns: [tenants.tenantId],
      name: "fk_reference_approval_logs_tenant",
    })
      .onDelete("restrict")
      .onUpdate("cascade"),
    foreignKey({
      columns: [table.actorId],
      foreignColumns: [users.userId],
      name: "fk_reference_approval_logs_actor",
    })
      .onDelete("set null")
      .onUpdate("cascade"),
    ...tenantIsolationPolicies("reference_approval_logs"),
    serviceBypassPolicy("reference_approval_logs"),
  ]
);

export const countrySelectSchema = createSelectSchema(countries);
export const stateSelectSchema = createSelectSchema(states);
export const currencySelectSchema = createSelectSchema(currencies);
export const currencyRateSelectSchema = createSelectSchema(currencyRates);
export const bankSelectSchema = createSelectSchema(banks);
export const sequenceSelectSchema = createSelectSchema(sequences);
export const uomCategorySelectSchema = createSelectSchema(uomCategories);
export const unitOfMeasureSelectSchema = createSelectSchema(unitsOfMeasure);
export const documentAttachmentSelectSchema = createSelectSchema(documentAttachments);
export const documentTruthDecisionSelectSchema = createSelectSchema(documentTruthDecisions);
export const documentTruthResolutionTaskSelectSchema = createSelectSchema(documentTruthResolutionTasks);
export const documentPreDecisionBlockSelectSchema = createSelectSchema(documentPreDecisionBlocks);
export const documentSignatureAttestationSelectSchema = createSelectSchema(documentSignatureAttestations);
export const documentTruthOverrideSelectSchema = createSelectSchema(documentTruthOverrides);
export const documentGuardrailEventSelectSchema = createSelectSchema(documentGuardrailEvents);
export const tenantStoragePolicySelectSchema = createSelectSchema(tenantStoragePolicies);
export const tenantStorageUsageSelectSchema = createSelectSchema(tenantStorageUsage);
export const tenantStorageQuotaRequestSelectSchema = createSelectSchema(tenantStorageQuotaRequests);
export const approvalLogSelectSchema = createSelectSchema(approvalLogs);

export const countryInsertSchema = createInsertSchema(countries, {
  code: z
    .string()
    .length(2)
    .regex(/^[A-Z]{2}$/i),
  name: z.string().min(1).max(120),
  phoneCode: z.string().max(10).optional().nullable(),
  vatLabel: z.string().max(80).optional().nullable(),
  createdBy: z.number().int().positive(),
  updatedBy: z.number().int().positive(),
});

export const stateInsertSchema = createInsertSchema(states, {
  countryId: z.number().int().positive(),
  code: z.string().min(1).max(20),
  name: z.string().min(1).max(120),
  createdBy: z.number().int().positive(),
  updatedBy: z.number().int().positive(),
});

export const currencyInsertSchema = createInsertSchema(currencies, {
  code: z
    .string()
    .length(3)
    .regex(/^[A-Z]{3}$/i),
  name: z.string().min(1).max(120),
  symbol: z.string().max(10).optional().nullable(),
  decimalPlaces: z.number().int().min(0).max(6).optional(),
  rounding: z.string().regex(/^\d+(\.\d+)?$/),
  isActive: z.boolean().optional(),
  createdBy: z.number().int().positive(),
  updatedBy: z.number().int().positive(),
});

export const currencyRateInsertSchema = createInsertSchema(currencyRates, {
  currencyId: z.number().int().positive(),
  rate: z.string().regex(/^\d+(\.\d+)?$/),
  inverseRate: z.string().regex(/^\d+(\.\d+)?$/),
  effectiveDate: dateOnlyWire,
  source: z.string().max(120).optional().nullable(),
  createdBy: z.number().int().positive(),
  updatedBy: z.number().int().positive(),
});

export const bankInsertSchema = createInsertSchema(banks, {
  name: z.string().min(1).max(200),
  bic: z.string().max(20).optional().nullable(),
  countryId: z.number().int().positive().optional().nullable(),
  createdBy: z.number().int().positive(),
  updatedBy: z.number().int().positive(),
});

export const sequenceInsertSchema = createInsertSchema(sequences, {
  tenantId: z.number().int().positive(),
  code: z.string().min(1).max(120),
  prefix: z.string().max(40).optional().nullable(),
  suffix: z.string().max(40).optional().nullable(),
  padding: z.number().int().min(0).optional(),
  step: z.number().int().positive().optional(),
  nextNumber: z.number().int().positive().optional(),
  resetPeriod: SequenceResetPeriodSchema.optional(),
  createdBy: z.number().int().positive(),
  updatedBy: z.number().int().positive(),
});

export const uomCategoryInsertSchema = createInsertSchema(uomCategories, {
  name: z.string().min(1).max(120),
  createdBy: z.number().int().positive(),
  updatedBy: z.number().int().positive(),
});

export const unitOfMeasureInsertSchema = createInsertSchema(unitsOfMeasure, {
  categoryId: z.number().int().positive(),
  name: z.string().min(1).max(120),
  factor: z.string().regex(/^\d+(\.\d+)?$/),
  uomType: UomTypeSchema,
  rounding: z
    .string()
    .regex(/^\d+(\.\d+)?$/)
    .optional(),
  createdBy: z.number().int().positive(),
  updatedBy: z.number().int().positive(),
});

export const documentAttachmentInsertSchema = createInsertSchema(documentAttachments, {
  tenantId: z.number().int().positive(),
  entityType: AttachmentEntityTypeSchema,
  entityId: z.uuid(),
  filename: z.string().min(1).max(255),
  contentType: z.string().min(1).max(255),
  byteSize: z.number().int().min(0),
  storageKey: applicationStorageKeySchema.max(1024),
  uploadedBy: z.number().int().positive().optional().nullable(),
  idempotencyKey: z.string().min(8).max(200).optional().nullable(),
  checksum: z.string().max(128).optional().nullable(),
  storageStatus: StorageStatusSchema.optional(),
  truthResolutionState: TruthResolutionStateSchema.optional(),
  truthPolicyVersion: z.string().max(128).optional().nullable(),
  truthDecisionAt: z.date().optional().nullable(),
  truthDecisionSummary: z.record(z.string(), z.unknown()).optional().nullable(),
  truthRequiresReview: z.boolean().optional(),
  businessEventType: z.string().max(120).optional().nullable(),
  businessEventId: z.uuid().optional().nullable(),
  malwareScanStatus: MalwareScanStatusSchema.optional(),
  signatureWorkflowStatus: SignatureWorkflowStatusSchema.optional(),
  signatureWorkflowUpdatedAt: z.date().optional().nullable(),
  legalHoldActive: z.boolean().optional(),
  retentionExpiresAt: z.date().optional().nullable(),
  updatedAt: z.date().optional(),
});

export const documentSignatureAttestationInsertSchema = createInsertSchema(
  documentSignatureAttestations,
  {
    tenantId: z.number().int().positive(),
    attachmentId: z.uuid(),
    signerUserId: z.number().int().positive().optional().nullable(),
    signerEmail: z.email(),
    signerName: z.string().min(1).max(255).optional().nullable(),
    attestationStatus: SignatureAttestationStatusSchema.optional(),
    attestedAt: z.date().optional().nullable(),
    evidenceRefs: z.record(z.string(), z.unknown()).optional(),
    notes: z.string().max(4000).optional().nullable(),
  }
);

export const documentTruthOverrideInsertSchema = createInsertSchema(documentTruthOverrides, {
  tenantId: z.number().int().positive(),
  attachmentId: z.uuid(),
  taskId: z.uuid().optional().nullable(),
  actorUserId: z.number().int().positive().optional().nullable(),
  overrideOutcome: TruthOverrideOutcomeSchema,
  previousRecommendedAction: TruthRecommendedActionSchema,
  overrideRecommendedAction: TruthRecommendedActionSchema,
  reason: z.string().min(1).max(4000),
  evidenceRefs: z.record(z.string(), z.unknown()).optional(),
});
export const documentGuardrailEventInsertSchema = createInsertSchema(documentGuardrailEvents, {
  tenantId: z.number().int().positive(),
  attachmentId: z.uuid(),
  attemptedAction: GuardrailActionTypeSchema,
  blocked: z.boolean(),
  reasonCodes: z.array(z.string().min(1)),
  actorUserId: z.number().int().positive().optional().nullable(),
  context: z.record(z.string(), z.unknown()).optional(),
});

export const approvalLogInsertSchema = createInsertSchema(approvalLogs, {
  tenantId: z.number().int().positive(),
  entityType: ApprovalEntityTypeSchema,
  entityId: z.uuid(),
  action: ApprovalActionSchema,
  actorId: z.number().int().positive().optional().nullable(),
  actorRoleSnapshot: z.string().max(120).optional().nullable(),
  reason: z.string().max(2000).optional().nullable(),
  decidedAt: z.iso.datetime({ offset: true }),
});

export const countryUpdateSchema = createUpdateSchema(countries);
export const stateUpdateSchema = createUpdateSchema(states);
export const currencyUpdateSchema = createUpdateSchema(currencies);
export const currencyRateUpdateSchema = createUpdateSchema(currencyRates);
export const bankUpdateSchema = createUpdateSchema(banks);
export const sequenceUpdateSchema = createUpdateSchema(sequences);
export const uomCategoryUpdateSchema = createUpdateSchema(uomCategories);
export const unitOfMeasureUpdateSchema = createUpdateSchema(unitsOfMeasure);
export const documentAttachmentUpdateSchema = createUpdateSchema(documentAttachments);
export const documentSignatureAttestationUpdateSchema = createUpdateSchema(
  documentSignatureAttestations
);
export const documentTruthOverrideUpdateSchema = createUpdateSchema(documentTruthOverrides);
export const documentGuardrailEventUpdateSchema = createUpdateSchema(documentGuardrailEvents);
export const approvalLogUpdateSchema = createUpdateSchema(approvalLogs);

export type Country = typeof countries.$inferSelect;
export type NewCountry = typeof countries.$inferInsert;
export type State = typeof states.$inferSelect;
export type NewState = typeof states.$inferInsert;
export type Currency = typeof currencies.$inferSelect;
export type NewCurrency = typeof currencies.$inferInsert;
export type CurrencyRate = typeof currencyRates.$inferSelect;
export type NewCurrencyRate = typeof currencyRates.$inferInsert;
export type Bank = typeof banks.$inferSelect;
export type NewBank = typeof banks.$inferInsert;
export type Sequence = typeof sequences.$inferSelect;
export type NewSequence = typeof sequences.$inferInsert;
export type UomCategory = typeof uomCategories.$inferSelect;
export type NewUomCategory = typeof uomCategories.$inferInsert;
export type UnitOfMeasure = typeof unitsOfMeasure.$inferSelect;
export type NewUnitOfMeasure = typeof unitsOfMeasure.$inferInsert;
export type DocumentAttachment = typeof documentAttachments.$inferSelect;
export type NewDocumentAttachment = typeof documentAttachments.$inferInsert;
export type DocumentTruthDecision = typeof documentTruthDecisions.$inferSelect;
export type NewDocumentTruthDecision = typeof documentTruthDecisions.$inferInsert;
export type DocumentTruthResolutionTask = typeof documentTruthResolutionTasks.$inferSelect;
export type NewDocumentTruthResolutionTask = typeof documentTruthResolutionTasks.$inferInsert;
export type DocumentPreDecisionBlock = typeof documentPreDecisionBlocks.$inferSelect;
export type NewDocumentPreDecisionBlock = typeof documentPreDecisionBlocks.$inferInsert;
export type DocumentSignatureAttestation = typeof documentSignatureAttestations.$inferSelect;
export type NewDocumentSignatureAttestation = typeof documentSignatureAttestations.$inferInsert;
export type DocumentTruthOverride = typeof documentTruthOverrides.$inferSelect;
export type NewDocumentTruthOverride = typeof documentTruthOverrides.$inferInsert;
export type DocumentGuardrailEvent = typeof documentGuardrailEvents.$inferSelect;
export type NewDocumentGuardrailEvent = typeof documentGuardrailEvents.$inferInsert;
export type TenantStoragePolicy = typeof tenantStoragePolicies.$inferSelect;
export type NewTenantStoragePolicy = typeof tenantStoragePolicies.$inferInsert;
export type TenantStorageUsage = typeof tenantStorageUsage.$inferSelect;
export type NewTenantStorageUsage = typeof tenantStorageUsage.$inferInsert;
export type TenantStorageQuotaRequest = typeof tenantStorageQuotaRequests.$inferSelect;
export type NewTenantStorageQuotaRequest = typeof tenantStorageQuotaRequests.$inferInsert;
export type ApprovalLog = typeof approvalLogs.$inferSelect;
export type NewApprovalLog = typeof approvalLogs.$inferInsert;
