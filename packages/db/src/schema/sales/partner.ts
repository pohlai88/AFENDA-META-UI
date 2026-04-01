import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  foreignKey,
  index,
  integer,
  jsonb,
  numeric,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema, createUpdateSchema } from "drizzle-orm/zod";
import { z } from "zod/v4";

import {
  auditColumns,
  nameColumn,
  softDeleteColumns,
  timestampColumns,
} from "../../column-kit/index.js";
import { serviceBypassPolicy, tenantIsolationPolicies } from "../../rls-policies/index.js";
import { instantWire } from "../../wire/temporal.js";
import { tenants } from "../core/tenants.js";
import { banks, countries, currencies, states } from "../reference/index.js";
import { users } from "../security/index.js";
import {
  AddressTypeSchema,
  PartnerEntityTypeSchema,
  PartnerEventAccountingImpactSchema,
  PartnerEventTypeSchema,
  PartnerReconciliationStatusSchema,
  PartnerTypeSchema,
  addressTypeEnum,
  partnerEntityTypeEnum,
  partnerEventAccountingImpactEnum,
  partnerEventTypeEnum,
  partnerReconciliationStatusEnum,
  partnerTypeEnum,
} from "./_enums.js";
import { salesSchema } from "./_schema.js";
import {
  DocumentTruthBindingIdSchema,
  PartnerAddressIdSchema,
  PartnerAddressSnapshotIdSchema,
  PartnerBankAccountIdSchema,
  PartnerContactSnapshotIdSchema,
  PartnerEventIdSchema,
  PartnerIdSchema,
  PartnerReconciliationLinkIdSchema,
  PartnerTagIdSchema,
  positiveMoneyStringSchema,
} from "./_zodShared.js";
import { documentTruthBindings } from "./truthBindings.js";


export const partners = salesSchema.table(
  "partners",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: integer("tenant_id").notNull(),
    ...nameColumn,
    /** Legal / registered identity; canonical for contracts and tax. */
    legalName: text("legal_name").notNull(),
    displayName: text("display_name"),
    entityType: partnerEntityTypeEnum("entity_type").notNull().default("company"),
    registrationNumber: text("registration_number"),
    externalRef: text("external_ref"),
    email: text("email"),
    phone: text("phone"),
    isCompany: boolean("is_company").notNull().default(false),
    parentId: uuid("parent_id"),
    vat: text("vat"),
    website: text("website"),
    industry: text("industry"),
    relationshipStart: timestamp("relationship_start", { withTimezone: true })
      .notNull()
      .defaultNow(),
    relationshipEnd: timestamp("relationship_end", { withTimezone: true }),
    countryId: integer("country_id"),
    stateId: integer("state_id"),
    lang: text("lang"),
    creditLimit: numeric("credit_limit", { precision: 14, scale: 2 }).notNull().default("0"),
    defaultPaymentTermId: uuid("default_payment_term_id"),
    defaultPricelistId: uuid("default_pricelist_id"),
    defaultFiscalPositionId: uuid("default_fiscal_position_id"),
    propertyAccountReceivableId: text("property_account_receivable_id"),
    propertyAccountPayableId: text("property_account_payable_id"),
    totalInvoiced: numeric("total_invoiced", { precision: 14, scale: 2 }).notNull().default("0"),
    totalDue: numeric("total_due", { precision: 14, scale: 2 }).notNull().default("0"),
    type: partnerTypeEnum("type").notNull().default("customer"),
    isActive: boolean("is_active").notNull().default(true),
    ...timestampColumns,
    ...softDeleteColumns,
    ...auditColumns(() => users.userId),
  },
  (table) => [
    index("idx_sales_partners_tenant").on(table.tenantId),
    index("idx_sales_partners_type").on(table.tenantId, table.type),
    index("idx_sales_partners_parent").on(table.tenantId, table.parentId),
    index("idx_sales_partners_country_state").on(table.tenantId, table.countryId, table.stateId),
    index("idx_sales_partners_legal_name").on(table.tenantId, table.legalName),
    uniqueIndex("uq_sales_partners_tenant_id").on(table.tenantId, table.id),
    uniqueIndex("uq_sales_partners_email")
      .on(table.tenantId, sql`lower(${table.email})`)
      .where(sql`${table.deletedAt} IS NULL AND ${table.email} IS NOT NULL`),
    uniqueIndex("uq_sales_partners_vat_tenant")
      .on(table.tenantId, table.vat)
      .where(sql`${table.vat} IS NOT NULL AND ${table.deletedAt} IS NULL`),
    check("chk_sales_partners_credit_limit_non_negative", sql`${table.creditLimit} >= 0`),
    check("chk_sales_partners_total_invoiced_non_negative", sql`${table.totalInvoiced} >= 0`),
    check("chk_sales_partners_total_due_non_negative", sql`${table.totalDue} >= 0`),
    check(
      "chk_sales_partners_relationship_dates",
      sql`${table.relationshipEnd} IS NULL OR ${table.relationshipEnd} >= ${table.relationshipStart}`
    ),
    foreignKey({
      columns: [table.tenantId],
      foreignColumns: [tenants.tenantId],
      name: "fk_sales_partners_tenant",
    })
      .onDelete("restrict")
      .onUpdate("cascade"),
    foreignKey({
      columns: [table.parentId],
      foreignColumns: [table.id],
      name: "fk_sales_partners_parent",
    })
      .onDelete("set null")
      .onUpdate("cascade"),
    foreignKey({
      columns: [table.countryId],
      foreignColumns: [countries.countryId],
      name: "fk_sales_partners_country",
    })
      .onDelete("set null")
      .onUpdate("cascade"),
    foreignKey({
      columns: [table.stateId],
      foreignColumns: [states.stateId],
      name: "fk_sales_partners_state",
    })
      .onDelete("set null")
      .onUpdate("cascade"),
    ...tenantIsolationPolicies("sales_partners"),
    serviceBypassPolicy("sales_partners"),
  ]
);

export const partnerAddresses = salesSchema.table(
  "partner_addresses",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: integer("tenant_id").notNull(),
    partnerId: uuid("partner_id").notNull(),
    type: addressTypeEnum("type").notNull().default("contact"),
    street: text("street"),
    street2: text("street2"),
    city: text("city"),
    stateId: integer("state_id"),
    countryId: integer("country_id"),
    zip: text("zip"),
    phone: text("phone"),
    email: text("email"),
    contactName: text("contact_name"),
    isDefault: boolean("is_default").notNull().default(false),
    ...timestampColumns,
    ...softDeleteColumns,
    ...auditColumns(() => users.userId),
  },
  (table) => [
    index("idx_sales_partner_addresses_tenant").on(table.tenantId),
    index("idx_sales_partner_addresses_partner").on(table.tenantId, table.partnerId, table.type),
    uniqueIndex("uq_sales_partner_addresses_default_type")
      .on(table.tenantId, table.partnerId, table.type)
      .where(sql`${table.deletedAt} IS NULL AND ${table.isDefault} = true`),
    foreignKey({
      columns: [table.tenantId],
      foreignColumns: [tenants.tenantId],
      name: "fk_sales_partner_addresses_tenant",
    })
      .onDelete("restrict")
      .onUpdate("cascade"),
    foreignKey({
      columns: [table.partnerId],
      foreignColumns: [partners.id],
      name: "fk_sales_partner_addresses_partner",
    })
      .onDelete("cascade")
      .onUpdate("cascade"),
    foreignKey({
      columns: [table.stateId],
      foreignColumns: [states.stateId],
      name: "fk_sales_partner_addresses_state",
    })
      .onDelete("set null")
      .onUpdate("cascade"),
    foreignKey({
      columns: [table.countryId],
      foreignColumns: [countries.countryId],
      name: "fk_sales_partner_addresses_country",
    })
      .onDelete("set null")
      .onUpdate("cascade"),
    ...tenantIsolationPolicies("sales_partner_addresses"),
    serviceBypassPolicy("sales_partner_addresses"),
  ]
);

export const partnerBankAccounts = salesSchema.table(
  "partner_bank_accounts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: integer("tenant_id").notNull(),
    partnerId: uuid("partner_id").notNull(),
    iban: text("iban"),
    swift: varchar("swift", { length: 22 }),
    bankId: integer("bank_id"),
    currencyId: integer("currency_id"),
    accNumber: text("acc_number").notNull(),
    accHolderName: text("acc_holder_name"),
    isDefault: boolean("is_default").notNull().default(false),
    ...timestampColumns,
    ...softDeleteColumns,
    ...auditColumns(() => users.userId),
  },
  (table) => [
    index("idx_sales_partner_bank_accounts_tenant").on(table.tenantId),
    index("idx_sales_partner_bank_accounts_partner").on(table.tenantId, table.partnerId),
    index("idx_sales_partner_bank_accounts_currency").on(table.tenantId, table.currencyId),
    uniqueIndex("uq_sales_partner_bank_accounts_acc_number")
      .on(table.tenantId, sql`lower(${table.accNumber})`)
      .where(sql`${table.deletedAt} IS NULL`),
    uniqueIndex("uq_sales_partner_bank_accounts_default")
      .on(table.tenantId, table.partnerId)
      .where(sql`${table.deletedAt} IS NULL AND ${table.isDefault} = true`),
    foreignKey({
      columns: [table.tenantId],
      foreignColumns: [tenants.tenantId],
      name: "fk_sales_partner_bank_accounts_tenant",
    })
      .onDelete("restrict")
      .onUpdate("cascade"),
    foreignKey({
      columns: [table.partnerId],
      foreignColumns: [partners.id],
      name: "fk_sales_partner_bank_accounts_partner",
    })
      .onDelete("cascade")
      .onUpdate("cascade"),
    foreignKey({
      columns: [table.bankId],
      foreignColumns: [banks.bankId],
      name: "fk_sales_partner_bank_accounts_bank",
    })
      .onDelete("set null")
      .onUpdate("cascade"),
    foreignKey({
      columns: [table.currencyId],
      foreignColumns: [currencies.currencyId],
      name: "fk_sales_partner_bank_accounts_currency",
    })
      .onDelete("set null")
      .onUpdate("cascade"),
    ...tenantIsolationPolicies("sales_partner_bank_accounts"),
    serviceBypassPolicy("sales_partner_bank_accounts"),
  ]
);

export const partnerTags = salesSchema.table(
  "partner_tags",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: integer("tenant_id").notNull(),
    ...nameColumn,
    color: text("color"),
    ...timestampColumns,
    ...softDeleteColumns,
    ...auditColumns(() => users.userId),
  },
  (table) => [
    index("idx_sales_partner_tags_tenant").on(table.tenantId),
    uniqueIndex("uq_sales_partner_tags_name")
      .on(table.tenantId, sql`lower(${table.name})`)
      .where(sql`${table.deletedAt} IS NULL`),
    foreignKey({
      columns: [table.tenantId],
      foreignColumns: [tenants.tenantId],
      name: "fk_sales_partner_tags_tenant",
    })
      .onDelete("restrict")
      .onUpdate("cascade"),
    ...tenantIsolationPolicies("sales_partner_tags"),
    serviceBypassPolicy("sales_partner_tags"),
  ]
);

export const partnerTagAssignments = salesSchema.table(
  "partner_tag_assignments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: integer("tenant_id").notNull(),
    partnerId: uuid("partner_id").notNull(),
    tagId: uuid("tag_id").notNull(),
    ...timestampColumns,
    ...auditColumns(() => users.userId),
  },
  (table) => [
    index("idx_sales_partner_tag_assignments_tenant").on(table.tenantId),
    uniqueIndex("uq_sales_partner_tag_assignments_unique").on(
      table.tenantId,
      table.partnerId,
      table.tagId
    ),
    foreignKey({
      columns: [table.tenantId],
      foreignColumns: [tenants.tenantId],
      name: "fk_sales_partner_tag_assignments_tenant",
    })
      .onDelete("restrict")
      .onUpdate("cascade"),
    foreignKey({
      columns: [table.partnerId],
      foreignColumns: [partners.id],
      name: "fk_sales_partner_tag_assignments_partner",
    })
      .onDelete("cascade")
      .onUpdate("cascade"),
    foreignKey({
      columns: [table.tagId],
      foreignColumns: [partnerTags.id],
      name: "fk_sales_partner_tag_assignments_tag",
    })
      .onDelete("cascade")
      .onUpdate("cascade"),
    ...tenantIsolationPolicies("sales_partner_tag_assignments"),
    serviceBypassPolicy("sales_partner_tag_assignments"),
  ]
);

/** Latest contact channel snapshot per partner (not authoritative history). */
export const partnerContactSnapshots = salesSchema.table(
  "partner_contact_snapshots",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: integer("tenant_id").notNull(),
    partnerId: uuid("partner_id").notNull(),
    email: text("email"),
    phone: text("phone"),
    website: text("website"),
    lang: text("lang"),
    isPrimary: boolean("is_primary").notNull().default(true),
    ...timestampColumns,
    ...softDeleteColumns,
    ...auditColumns(() => users.userId),
  },
  (table) => [
    index("idx_sales_partner_contact_snapshots_tenant").on(table.tenantId),
    index("idx_sales_partner_contact_snapshots_partner").on(table.tenantId, table.partnerId),
    uniqueIndex("uq_sales_partner_contact_snapshots_primary")
      .on(table.tenantId, table.partnerId)
      .where(sql`${table.deletedAt} IS NULL AND ${table.isPrimary} = true`),
    foreignKey({
      columns: [table.tenantId],
      foreignColumns: [tenants.tenantId],
      name: "fk_sales_partner_contact_snapshots_tenant",
    })
      .onDelete("restrict")
      .onUpdate("cascade"),
    foreignKey({
      columns: [table.partnerId],
      foreignColumns: [partners.id],
      name: "fk_sales_partner_contact_snapshots_partner",
    })
      .onDelete("cascade")
      .onUpdate("cascade"),
    ...tenantIsolationPolicies("sales_partner_contact_snapshots"),
    serviceBypassPolicy("sales_partner_contact_snapshots"),
  ]
);

/** Latest structured address snapshot (orders should copy to JSONB at confirmation). */
export const partnerAddressSnapshots = salesSchema.table(
  "partner_address_snapshots",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: integer("tenant_id").notNull(),
    partnerId: uuid("partner_id").notNull(),
    type: addressTypeEnum("type").notNull().default("contact"),
    street: text("street"),
    street2: text("street2"),
    city: text("city"),
    stateId: integer("state_id"),
    countryId: integer("country_id"),
    zip: text("zip"),
    isPrimary: boolean("is_primary").notNull().default(true),
    ...timestampColumns,
    ...softDeleteColumns,
    ...auditColumns(() => users.userId),
  },
  (table) => [
    index("idx_sales_partner_address_snapshots_tenant").on(table.tenantId),
    index("idx_sales_partner_address_snapshots_partner").on(table.tenantId, table.partnerId, table.type),
    uniqueIndex("uq_sales_partner_address_snapshots_primary_type")
      .on(table.tenantId, table.partnerId, table.type)
      .where(sql`${table.deletedAt} IS NULL AND ${table.isPrimary} = true`),
    foreignKey({
      columns: [table.tenantId],
      foreignColumns: [tenants.tenantId],
      name: "fk_sales_partner_address_snapshots_tenant",
    })
      .onDelete("restrict")
      .onUpdate("cascade"),
    foreignKey({
      columns: [table.partnerId],
      foreignColumns: [partners.id],
      name: "fk_sales_partner_address_snapshots_partner",
    })
      .onDelete("cascade")
      .onUpdate("cascade"),
    foreignKey({
      columns: [table.stateId],
      foreignColumns: [states.stateId],
      name: "fk_sales_partner_address_snapshots_state",
    })
      .onDelete("set null")
      .onUpdate("cascade"),
    foreignKey({
      columns: [table.countryId],
      foreignColumns: [countries.countryId],
      name: "fk_sales_partner_address_snapshots_country",
    })
      .onDelete("set null")
      .onUpdate("cascade"),
    ...tenantIsolationPolicies("sales_partner_address_snapshots"),
    serviceBypassPolicy("sales_partner_address_snapshots"),
  ]
);

/** Append-only financial / lifecycle facts for partner truth replay. */
export const partnerEvents = salesSchema.table(
  "partner_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: integer("tenant_id").notNull(),
    partnerId: uuid("partner_id").notNull(),
    eventType: partnerEventTypeEnum("event_type").notNull(),
    /** Payload schema version for deterministic replay / migrations. */
    eventSchemaVersion: integer("event_schema_version").notNull().default(1),
    /** Optional anchor to `document_truth_bindings` (invoice / credit path). */
    truthBindingId: uuid("truth_binding_id"),
    /** Sub-ledger direction for projections and GL reconciliation. */
    accountingImpact: partnerEventAccountingImpactEnum("accounting_impact").notNull().default("none"),
    refId: uuid("ref_id"),
    amount: numeric("amount", { precision: 14, scale: 2 }),
    currencyId: integer("currency_id"),
    occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull(),
    metadata: jsonb("metadata").$type<Record<string, unknown>>(),
    ...timestampColumns,
    ...auditColumns(() => users.userId),
  },
  (table) => [
    index("idx_sales_partner_events_tenant").on(table.tenantId),
    index("idx_sales_partner_events_partner_time").on(
      table.tenantId,
      table.partnerId,
      table.occurredAt
    ),
    index("idx_sales_partner_events_type").on(table.tenantId, table.eventType),
    index("idx_sales_partner_events_truth_binding").on(table.tenantId, table.truthBindingId),
    uniqueIndex("uq_sales_partner_events_tenant_type_ref")
      .on(table.tenantId, table.eventType, table.refId)
      .where(sql`${table.refId} IS NOT NULL`),
    check(
      "chk_sales_partner_events_schema_version_positive",
      sql`${table.eventSchemaVersion} >= 1`
    ),
    check(
      "chk_sales_partner_events_amount_non_negative",
      sql`${table.amount} IS NULL OR ${table.amount} >= 0`
    ),
    check(
      "chk_sales_partner_events_monetary_requires_amount",
      sql`${table.accountingImpact} = 'none'::sales.partner_event_accounting_impact OR (${table.amount} IS NOT NULL AND ${table.currencyId} IS NOT NULL)`
    ),
    check(
      "chk_sales_partner_events_lifecycle_impact_none",
      sql`(${table.eventType}::text NOT IN ('partner_created','partner_activated','partner_deactivated','partner_blocked','partner_unblocked','credit_limit_changed')) OR (${table.accountingImpact} = 'none'::sales.partner_event_accounting_impact)`
    ),
    check(
      "chk_sales_partner_events_core_financial_requires_impact",
      sql`(${table.eventType}::text NOT IN ('invoice_posted','invoice_voided','payment_received','payment_applied','credit_note_posted','refund_posted')) OR (${table.accountingImpact} <> 'none'::sales.partner_event_accounting_impact)`
    ),
    check(
      "chk_sales_partner_events_truth_document_types",
      sql`(${table.eventType}::text NOT IN ('invoice_posted','invoice_voided','credit_note_posted')) OR (${table.truthBindingId} IS NOT NULL)`
    ),
    foreignKey({
      columns: [table.tenantId],
      foreignColumns: [tenants.tenantId],
      name: "fk_sales_partner_events_tenant",
    })
      .onDelete("restrict")
      .onUpdate("cascade"),
    foreignKey({
      columns: [table.partnerId],
      foreignColumns: [partners.id],
      name: "fk_sales_partner_events_partner",
    })
      .onDelete("restrict")
      .onUpdate("cascade"),
    foreignKey({
      columns: [table.truthBindingId],
      foreignColumns: [documentTruthBindings.id],
      name: "fk_sales_partner_events_truth_binding",
    })
      .onDelete("restrict")
      .onUpdate("cascade"),
    foreignKey({
      columns: [table.currencyId],
      foreignColumns: [currencies.currencyId],
      name: "fk_sales_partner_events_currency",
    })
      .onDelete("set null")
      .onUpdate("cascade"),
    ...tenantIsolationPolicies("sales_partner_events"),
    serviceBypassPolicy("sales_partner_events"),
  ]
);

/** Derived AR/AP-style read model; rebuild from `partner_events` (legacy partner totals remain until cutover). */
export const partnerFinancialProjections = salesSchema.table(
  "partner_financial_projections",
  {
    tenantId: integer("tenant_id").notNull(),
    partnerId: uuid("partner_id").notNull(),
    totalInvoiced: numeric("total_invoiced", { precision: 14, scale: 2 }).notNull().default("0"),
    totalPaid: numeric("total_paid", { precision: 14, scale: 2 }).notNull().default("0"),
    totalOutstanding: numeric("total_outstanding", { precision: 14, scale: 2 }).notNull().default("0"),
    creditLimit: numeric("credit_limit", { precision: 14, scale: 2 }).notNull().default("0"),
    /** Cursor for incremental projection rebuilds (no FK — events are immutable). */
    lastProcessedEventId: uuid("last_processed_event_id"),
    lastRebuildAt: timestamp("last_rebuild_at", { withTimezone: true }),
    lastUpdatedAt: timestamp("last_updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.tenantId, table.partnerId] }),
    index("idx_sales_partner_financial_projections_tenant").on(table.tenantId),
    check(
      "chk_sales_partner_financial_projections_totals_non_negative",
      sql`${table.totalInvoiced} >= 0 AND ${table.totalPaid} >= 0 AND ${table.totalOutstanding} >= 0 AND ${table.creditLimit} >= 0`
    ),
    foreignKey({
      columns: [table.tenantId, table.partnerId],
      foreignColumns: [partners.tenantId, partners.id],
      name: "fk_sales_partner_financial_projections_partner",
    })
      .onDelete("cascade")
      .onUpdate("cascade"),
    foreignKey({
      columns: [table.partnerId],
      foreignColumns: [partners.id],
      name: "fk_sales_partner_financial_projections_partner_id",
    })
      .onDelete("cascade")
      .onUpdate("cascade"),
    ...tenantIsolationPolicies("sales_partner_financial_projections"),
    serviceBypassPolicy("sales_partner_financial_projections"),
  ]
);

/** Cross-system reconciliation (e.g. farm ledger vs sales). */
export const partnerReconciliationLinks = salesSchema.table(
  "partner_reconciliation_links",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: integer("tenant_id").notNull(),
    partnerId: uuid("partner_id").notNull(),
    sourceType: varchar("source_type", { length: 64 }).notNull(),
    sourceId: uuid("source_id").notNull(),
    reconciliationGroupId: uuid("reconciliation_group_id"),
    status: partnerReconciliationStatusEnum("status").notNull().default("unmatched"),
    matchedAt: timestamp("matched_at", { withTimezone: true }),
    ...timestampColumns,
    ...auditColumns(() => users.userId),
  },
  (table) => [
    index("idx_sales_partner_reconciliation_links_tenant").on(table.tenantId),
    index("idx_sales_partner_reconciliation_links_partner").on(table.tenantId, table.partnerId),
    index("idx_sales_partner_reconciliation_links_group").on(table.tenantId, table.reconciliationGroupId),
    index("idx_sales_partner_reconciliation_links_source").on(
      table.tenantId,
      table.sourceType,
      table.sourceId
    ),
    foreignKey({
      columns: [table.tenantId],
      foreignColumns: [tenants.tenantId],
      name: "fk_sales_partner_reconciliation_links_tenant",
    })
      .onDelete("restrict")
      .onUpdate("cascade"),
    foreignKey({
      columns: [table.partnerId],
      foreignColumns: [partners.id],
      name: "fk_sales_partner_reconciliation_links_partner",
    })
      .onDelete("cascade")
      .onUpdate("cascade"),
    ...tenantIsolationPolicies("sales_partner_reconciliation_links"),
    serviceBypassPolicy("sales_partner_reconciliation_links"),
  ]
);

export const partnerSelectSchema = createSelectSchema(partners);
export const partnerAddressSelectSchema = createSelectSchema(partnerAddresses);
export const partnerBankAccountSelectSchema = createSelectSchema(partnerBankAccounts);
export const partnerTagSelectSchema = createSelectSchema(partnerTags);
export const partnerTagAssignmentSelectSchema = createSelectSchema(partnerTagAssignments);
export const partnerContactSnapshotSelectSchema = createSelectSchema(partnerContactSnapshots);
export const partnerAddressSnapshotSelectSchema = createSelectSchema(partnerAddressSnapshots);
export const partnerEventSelectSchema = createSelectSchema(partnerEvents);
export const partnerFinancialProjectionSelectSchema = createSelectSchema(partnerFinancialProjections);
export const partnerReconciliationLinkSelectSchema = createSelectSchema(partnerReconciliationLinks);

export const partnerInsertSchema = createInsertSchema(partners, {
  id: PartnerIdSchema.optional(),
  tenantId: z.number().int().positive(),
  name: z.string().min(1).max(255),
  legalName: z.string().min(1).max(512),
  displayName: z.string().max(255).optional().nullable(),
  entityType: PartnerEntityTypeSchema.optional(),
  registrationNumber: z.string().max(120).optional().nullable(),
  externalRef: z.string().max(200).optional().nullable(),
  email: z.email().optional().nullable(),
  phone: z.string().max(40).optional().nullable(),
  isCompany: z.boolean().optional(),
  parentId: PartnerIdSchema.optional().nullable(),
  vat: z.string().max(80).optional().nullable(),
  website: z.url().optional().nullable(),
  industry: z.string().max(120).optional().nullable(),
  countryId: z.number().int().positive().optional().nullable(),
  stateId: z.number().int().positive().optional().nullable(),
  lang: z.string().max(12).optional().nullable(),
  creditLimit: positiveMoneyStringSchema.optional(),
  totalInvoiced: positiveMoneyStringSchema.optional(),
  totalDue: positiveMoneyStringSchema.optional(),
  type: PartnerTypeSchema.optional(),
  createdBy: z.number().int().positive(),
  updatedBy: z.number().int().positive(),
});

export const partnerAddressInsertSchema = createInsertSchema(partnerAddresses, {
  id: PartnerAddressIdSchema.optional(),
  tenantId: z.number().int().positive(),
  partnerId: PartnerIdSchema,
  type: AddressTypeSchema.optional(),
  street: z.string().max(255).optional().nullable(),
  street2: z.string().max(255).optional().nullable(),
  city: z.string().max(120).optional().nullable(),
  stateId: z.number().int().positive().optional().nullable(),
  countryId: z.number().int().positive().optional().nullable(),
  zip: z.string().max(20).optional().nullable(),
  phone: z.string().max(40).optional().nullable(),
  email: z.email().optional().nullable(),
  contactName: z.string().max(200).optional().nullable(),
  isDefault: z.boolean().optional(),
  createdBy: z.number().int().positive(),
  updatedBy: z.number().int().positive(),
});

export const partnerBankAccountInsertSchema = createInsertSchema(partnerBankAccounts, {
  id: PartnerBankAccountIdSchema.optional(),
  tenantId: z.number().int().positive(),
  partnerId: PartnerIdSchema,
  iban: z.string().max(64).optional().nullable(),
  swift: z.string().max(22).optional().nullable(),
  bankId: z.number().int().positive().optional().nullable(),
  currencyId: z.number().int().positive().optional().nullable(),
  accNumber: z.string().min(1).max(120),
  accHolderName: z.string().max(200).optional().nullable(),
  isDefault: z.boolean().optional(),
  createdBy: z.number().int().positive(),
  updatedBy: z.number().int().positive(),
});

export const partnerTagInsertSchema = createInsertSchema(partnerTags, {
  id: PartnerTagIdSchema.optional(),
  tenantId: z.number().int().positive(),
  name: z.string().min(1).max(200),
  color: z.string().max(50).optional().nullable(),
  createdBy: z.number().int().positive(),
  updatedBy: z.number().int().positive(),
});

export const partnerTagAssignmentInsertSchema = createInsertSchema(partnerTagAssignments, {
  tenantId: z.number().int().positive(),
  partnerId: PartnerIdSchema,
  tagId: PartnerTagIdSchema,
  createdBy: z.number().int().positive(),
  updatedBy: z.number().int().positive(),
});

export const partnerContactSnapshotInsertSchema = createInsertSchema(partnerContactSnapshots, {
  id: PartnerContactSnapshotIdSchema.optional(),
  tenantId: z.number().int().positive(),
  partnerId: PartnerIdSchema,
  email: z.email().optional().nullable(),
  phone: z.string().max(40).optional().nullable(),
  website: z.url().optional().nullable(),
  lang: z.string().max(12).optional().nullable(),
  isPrimary: z.boolean().optional(),
  createdBy: z.number().int().positive(),
  updatedBy: z.number().int().positive(),
});

export const partnerAddressSnapshotInsertSchema = createInsertSchema(partnerAddressSnapshots, {
  id: PartnerAddressSnapshotIdSchema.optional(),
  tenantId: z.number().int().positive(),
  partnerId: PartnerIdSchema,
  type: AddressTypeSchema.optional(),
  street: z.string().max(255).optional().nullable(),
  street2: z.string().max(255).optional().nullable(),
  city: z.string().max(120).optional().nullable(),
  stateId: z.number().int().positive().optional().nullable(),
  countryId: z.number().int().positive().optional().nullable(),
  zip: z.string().max(20).optional().nullable(),
  isPrimary: z.boolean().optional(),
  createdBy: z.number().int().positive(),
  updatedBy: z.number().int().positive(),
});

export const partnerEventInsertSchema = createInsertSchema(partnerEvents, {
  id: PartnerEventIdSchema.optional(),
  tenantId: z.number().int().positive(),
  partnerId: PartnerIdSchema,
  eventType: PartnerEventTypeSchema,
  eventSchemaVersion: z.number().int().min(1).optional(),
  truthBindingId: DocumentTruthBindingIdSchema.optional().nullable(),
  accountingImpact: PartnerEventAccountingImpactSchema.optional(),
  refId: z.uuid().optional().nullable(),
  amount: positiveMoneyStringSchema.optional().nullable(),
  currencyId: z.number().int().positive().optional().nullable(),
  occurredAt: instantWire,
  metadata: z.record(z.string(), z.unknown()).optional().nullable(),
  createdBy: z.number().int().positive(),
  updatedBy: z.number().int().positive(),
});

export const partnerFinancialProjectionInsertSchema = createInsertSchema(partnerFinancialProjections, {
  tenantId: z.number().int().positive(),
  partnerId: PartnerIdSchema,
  totalInvoiced: positiveMoneyStringSchema.optional(),
  totalPaid: positiveMoneyStringSchema.optional(),
  totalOutstanding: positiveMoneyStringSchema.optional(),
  creditLimit: positiveMoneyStringSchema.optional(),
  lastProcessedEventId: z.uuid().optional().nullable(),
  lastRebuildAt: instantWire.optional().nullable(),
});

export const partnerReconciliationLinkInsertSchema = createInsertSchema(partnerReconciliationLinks, {
  id: PartnerReconciliationLinkIdSchema.optional(),
  tenantId: z.number().int().positive(),
  partnerId: PartnerIdSchema,
  sourceType: z.string().min(1).max(64),
  sourceId: z.uuid(),
  reconciliationGroupId: z.uuid().optional().nullable(),
  status: PartnerReconciliationStatusSchema.optional(),
  matchedAt: instantWire.optional().nullable(),
  createdBy: z.number().int().positive(),
  updatedBy: z.number().int().positive(),
});

export const partnerUpdateSchema = createUpdateSchema(partners);
export const partnerAddressUpdateSchema = createUpdateSchema(partnerAddresses);
export const partnerBankAccountUpdateSchema = createUpdateSchema(partnerBankAccounts);
export const partnerTagUpdateSchema = createUpdateSchema(partnerTags);
export const partnerTagAssignmentUpdateSchema = createUpdateSchema(partnerTagAssignments);
export const partnerContactSnapshotUpdateSchema = createUpdateSchema(partnerContactSnapshots);
export const partnerAddressSnapshotUpdateSchema = createUpdateSchema(partnerAddressSnapshots);
export const partnerFinancialProjectionUpdateSchema = createUpdateSchema(partnerFinancialProjections);
export const partnerReconciliationLinkUpdateSchema = createUpdateSchema(partnerReconciliationLinks);

export type Partner = typeof partners.$inferSelect;
export type NewPartner = typeof partners.$inferInsert;
export type PartnerAddress = typeof partnerAddresses.$inferSelect;
export type NewPartnerAddress = typeof partnerAddresses.$inferInsert;
export type PartnerBankAccount = typeof partnerBankAccounts.$inferSelect;
export type NewPartnerBankAccount = typeof partnerBankAccounts.$inferInsert;
export type PartnerTag = typeof partnerTags.$inferSelect;
export type NewPartnerTag = typeof partnerTags.$inferInsert;
export type PartnerTagAssignment = typeof partnerTagAssignments.$inferSelect;
export type NewPartnerTagAssignment = typeof partnerTagAssignments.$inferInsert;
export type PartnerContactSnapshot = typeof partnerContactSnapshots.$inferSelect;
export type NewPartnerContactSnapshot = typeof partnerContactSnapshots.$inferInsert;
export type PartnerAddressSnapshot = typeof partnerAddressSnapshots.$inferSelect;
export type NewPartnerAddressSnapshot = typeof partnerAddressSnapshots.$inferInsert;
export type PartnerEvent = typeof partnerEvents.$inferSelect;
export type NewPartnerEvent = typeof partnerEvents.$inferInsert;
export type PartnerFinancialProjection = typeof partnerFinancialProjections.$inferSelect;
export type NewPartnerFinancialProjection = typeof partnerFinancialProjections.$inferInsert;
export type PartnerReconciliationLink = typeof partnerReconciliationLinks.$inferSelect;
export type NewPartnerReconciliationLink = typeof partnerReconciliationLinks.$inferInsert;
