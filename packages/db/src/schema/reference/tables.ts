import { sql } from "drizzle-orm";
import { createInsertSchema, createSelectSchema, createUpdateSchema } from "drizzle-orm/zod";
import {
  boolean,
  check,
  foreignKey,
  index,
  integer,
  numeric,
  pgSchema,
  text,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { z } from "zod/v4";

import { tenantIsolationPolicies, serviceBypassPolicy } from "../../rls/index.js";
import {
  appendOnlyTimestampColumns,
  auditColumns,
  softDeleteColumns,
  timestampColumns,
} from "../../columns/index.js";
import { tenants } from "../core/tenants.js";
import { users } from "../security/users.js";

export const referenceSchema = pgSchema("reference");

export const sequenceResetPeriods = ["yearly", "monthly", "never"] as const;
export const uomTypes = ["reference", "bigger", "smaller"] as const;
export const attachmentEntityTypes = [
  "sale_order",
  "return_order",
  "consignment_agreement",
  "subscription",
  "partner",
] as const;
export const approvalActions = ["submit", "approve", "reject", "escalate"] as const;
export const approvalEntityTypes = [
  "sale_order",
  "return_order",
  "consignment_agreement",
  "subscription",
  "commission_batch",
] as const;

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

export const SequenceResetPeriodSchema = z.enum(sequenceResetPeriods);
export const UomTypeSchema = z.enum(uomTypes);
export const AttachmentEntityTypeSchema = z.enum(attachmentEntityTypes);
export const ApprovalActionSchema = z.enum(approvalActions);
export const ApprovalEntityTypeSchema = z.enum(approvalEntityTypes);

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
    ...auditColumns,
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
    ...auditColumns,
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
    ...auditColumns,
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
    ...auditColumns,
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
    ...auditColumns,
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
    ...auditColumns,
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
    ...auditColumns,
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
    ...auditColumns,
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
    checksum: text("checksum"),
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
  effectiveDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
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
  storageKey: z.string().min(1).max(500),
  uploadedBy: z.number().int().positive().optional().nullable(),
  checksum: z.string().max(128).optional().nullable(),
});

export const approvalLogInsertSchema = createInsertSchema(approvalLogs, {
  tenantId: z.number().int().positive(),
  entityType: ApprovalEntityTypeSchema,
  entityId: z.uuid(),
  action: ApprovalActionSchema,
  actorId: z.number().int().positive().optional().nullable(),
  actorRoleSnapshot: z.string().max(120).optional().nullable(),
  reason: z.string().max(2000).optional().nullable(),
  decidedAt: z.string().datetime({ offset: true }),
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
export type ApprovalLog = typeof approvalLogs.$inferSelect;
export type NewApprovalLog = typeof approvalLogs.$inferInsert;
