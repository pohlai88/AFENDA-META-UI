import { sql } from "drizzle-orm";
import { createInsertSchema, createSelectSchema, createUpdateSchema } from "drizzle-zod";
import {
  boolean,
  check,
  foreignKey,
  index,
  integer,
  numeric,
  timestamp,
  text,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { z } from "zod/v4";

import { tenantIsolationPolicies, serviceBypassPolicy } from "../../_rls/index.js";
import {
  auditColumns,
  nameColumn,
  softDeleteColumns,
  timestampColumns,
} from "../../_shared/index.js";
import { tenants } from "../../schema-platform/core/tenants.js";
import {
  banks,
  countries,
  currencies,
  states,
  unitsOfMeasure,
} from "../../schema-platform/reference/index.js";
import { users } from "../../schema-platform/security/index.js";
import {
  AddressTypeSchema,
  addressTypeEnum,
  AttributeDisplayTypeSchema,
  attributeDisplayTypeEnum,
  CommissionBaseSchema,
  commissionBaseEnum,
  CommissionEntryStatusSchema,
  commissionEntryStatusEnum,
  CommissionTypeSchema,
  commissionTypeEnum,
  CreateVariantPolicySchema,
  createVariantPolicyEnum,
  InvoicePolicySchema,
  invoicePolicyEnum,
  ProductTrackingSchema,
  productTrackingEnum,
  ProductTypeSchema,
  productTypeEnum,
  ConsignmentReportPeriodSchema,
  consignmentReportPeriodEnum,
  ConsignmentReportStatusSchema,
  consignmentReportStatusEnum,
  ConsignmentStatusSchema,
  consignmentStatusEnum,
  DeliveryStatusSchema,
  deliveryStatusEnum,
  DiscountSourceSchema,
  discountSourceEnum,
  DiscountPolicySchema,
  discountPolicyEnum,
  DisplayLineTypeSchema,
  displayLineTypeEnum,
  InvoiceStatusSchema,
  invoiceStatusEnum,
  OrderStatusSchema,
  orderStatusEnum,
  PaymentTermValueTypeSchema,
  paymentTermValueTypeEnum,
  PartnerTypeSchema,
  partnerTypeEnum,
  TaxAmountTypeSchema,
  taxAmountTypeEnum,
  PricelistAppliedOnSchema,
  pricelistAppliedOnEnum,
  PricelistBaseTypeSchema,
  pricelistBaseTypeEnum,
  PricelistComputeTypeSchema,
  pricelistComputeTypeEnum,
  PriceSourceSchema,
  priceSourceEnum,
  RestockPolicySchema,
  restockPolicyEnum,
  ReturnConditionSchema,
  returnConditionEnum,
  SubscriptionBillingPeriodSchema,
  subscriptionBillingPeriodEnum,
  SubscriptionLogEventTypeSchema,
  subscriptionLogEventTypeEnum,
  SubscriptionStatusSchema,
  subscriptionStatusEnum,
  ReturnStatusSchema,
  returnStatusEnum,
  TaxTypeUseSchema,
  taxTypeUseEnum,
  InvariantStatusSchema,
  invariantStatusEnum,
  InvariantSeveritySchema,
  invariantSeverityEnum,
  DomainEventTypeSchema,
  domainEventTypeEnum,
} from "./_enums.js";
import {
  CommissionEntryIdSchema,
  CommissionPlanIdSchema,
  CommissionPlanTierIdSchema,
  ConsignmentAgreementIdSchema,
  ConsignmentAgreementLineIdSchema,
  ConsignmentStockReportIdSchema,
  ConsignmentStockReportLineIdSchema,
  DomainInvariantLogIdSchema,
  DomainEventLogIdSchema,
  FiscalPositionAccountMapIdSchema,
  FiscalPositionIdSchema,
  FiscalPositionTaxMapIdSchema,
  discountStringSchema,
  ProductAttributeIdSchema,
  ProductAttributeValueIdSchema,
  ProductPackagingIdSchema,
  ProductTemplateAttributeLineIdSchema,
  ProductTemplateAttributeValueIdSchema,
  ProductTemplateIdSchema,
  ProductVariantIdSchema,
  PaymentTermIdSchema,
  PaymentTermLineIdSchema,
  PricelistIdSchema,
  PricelistItemIdSchema,
  PartnerAddressIdSchema,
  PartnerBankAccountIdSchema,
  PartnerIdSchema,
  PartnerTagIdSchema,
  percentageStringSchema,
  positiveMoneyStringSchema,
  ProductCategoryIdSchema,
  ProductIdSchema,
  quantityStringSchema,
  ReturnOrderIdSchema,
  ReturnOrderLineIdSchema,
  ReturnReasonCodeIdSchema,
  SalesTeamIdSchema,
  SalesTeamMemberIdSchema,
  SubscriptionCloseReasonIdSchema,
  SubscriptionIdSchema,
  SubscriptionLineIdSchema,
  SubscriptionLogIdSchema,
  SubscriptionTemplateIdSchema,
  TerritoryIdSchema,
  TerritoryRuleIdSchema,
  SalesOrderIdSchema,
  SalesOrderLineIdSchema,
  SaleOrderLineTaxIdSchema,
  SaleOrderStatusHistoryIdSchema,
  SaleOrderTaxSummaryIdSchema,
  TaxGroupIdSchema,
  TaxRateChildIdSchema,
  TaxRateIdSchema,
} from "./_zodShared.js";
import { salesSchema } from "./_schema.js";

export const partners = salesSchema.table(
  "partners",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: integer("tenant_id").notNull(),
    ...nameColumn,
    email: text("email"),
    phone: text("phone"),
    isCompany: boolean("is_company").notNull().default(false),
    parentId: uuid("parent_id"),
    vat: text("vat"),
    website: text("website"),
    industry: text("industry"),
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
    ...auditColumns,
  },
  (table) => [
    index("idx_sales_partners_tenant").on(table.tenantId),
    index("idx_sales_partners_type").on(table.tenantId, table.type),
    index("idx_sales_partners_parent").on(table.tenantId, table.parentId),
    index("idx_sales_partners_country_state").on(table.tenantId, table.countryId, table.stateId),
    uniqueIndex("uq_sales_partners_email")
      .on(table.tenantId, sql`lower(${table.email})`)
      .where(sql`${table.deletedAt} IS NULL AND ${table.email} IS NOT NULL`),
    check("chk_sales_partners_credit_limit_non_negative", sql`${table.creditLimit} >= 0`),
    check("chk_sales_partners_total_invoiced_non_negative", sql`${table.totalInvoiced} >= 0`),
    check("chk_sales_partners_total_due_non_negative", sql`${table.totalDue} >= 0`),
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
    ...auditColumns,
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
    bankId: integer("bank_id"),
    accNumber: text("acc_number").notNull(),
    accHolderName: text("acc_holder_name"),
    isDefault: boolean("is_default").notNull().default(false),
    ...timestampColumns,
    ...softDeleteColumns,
    ...auditColumns,
  },
  (table) => [
    index("idx_sales_partner_bank_accounts_tenant").on(table.tenantId),
    index("idx_sales_partner_bank_accounts_partner").on(table.tenantId, table.partnerId),
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
    ...auditColumns,
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
    ...auditColumns,
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

export const productCategories = salesSchema.table(
  "product_categories",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: integer("tenant_id").notNull(),
    ...nameColumn,
    parentId: uuid("parent_id"),
    ...timestampColumns,
    ...softDeleteColumns,
    ...auditColumns,
  },
  (table) => [
    index("idx_sales_product_categories_tenant").on(table.tenantId),
    index("idx_sales_product_categories_parent").on(table.tenantId, table.parentId),
    uniqueIndex("uq_sales_product_categories_name")
      .on(table.tenantId, sql`lower(${table.name})`)
      .where(sql`${table.deletedAt} IS NULL`),
    foreignKey({
      columns: [table.tenantId],
      foreignColumns: [tenants.tenantId],
      name: "fk_sales_product_categories_tenant",
    })
      .onDelete("restrict")
      .onUpdate("cascade"),
    foreignKey({
      columns: [table.parentId],
      foreignColumns: [table.id],
      name: "fk_sales_product_categories_parent",
    })
      .onDelete("set null")
      .onUpdate("cascade"),
    ...tenantIsolationPolicies("sales_product_categories"),
    serviceBypassPolicy("sales_product_categories"),
  ]
);

export const products = salesSchema.table(
  "products",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: integer("tenant_id").notNull(),
    ...nameColumn,
    sku: text("sku"),
    categoryId: uuid("category_id"),
    unitPrice: numeric("unit_price", { precision: 12, scale: 2 }).notNull(),
    description: text("description"),
    isActive: boolean("is_active").notNull().default(true),
    ...timestampColumns,
    ...softDeleteColumns,
    ...auditColumns,
  },
  (table) => [
    index("idx_sales_products_tenant").on(table.tenantId),
    index("idx_sales_products_category").on(table.tenantId, table.categoryId),
    index("idx_sales_products_active").on(table.tenantId, table.isActive),
    uniqueIndex("uq_sales_products_sku")
      .on(table.tenantId, sql`lower(${table.sku})`)
      .where(sql`${table.deletedAt} IS NULL AND ${table.sku} IS NOT NULL`),
    check("chk_sales_products_unit_price_non_negative", sql`${table.unitPrice} >= 0`),
    foreignKey({
      columns: [table.tenantId],
      foreignColumns: [tenants.tenantId],
      name: "fk_sales_products_tenant",
    })
      .onDelete("restrict")
      .onUpdate("cascade"),
    foreignKey({
      columns: [table.categoryId],
      foreignColumns: [productCategories.id],
      name: "fk_sales_products_category",
    })
      .onDelete("set null")
      .onUpdate("cascade"),
    ...tenantIsolationPolicies("sales_products"),
    serviceBypassPolicy("sales_products"),
  ]
);

// ── Phase 5: Product Configuration ────────────────────────────────────────────

export const productTemplates = salesSchema.table(
  "product_templates",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: integer("tenant_id").notNull(),
    ...nameColumn,
    internalReference: text("internal_reference"),
    barcode: text("barcode"),
    categoryId: uuid("category_id"),
    uomId: integer("uom_id"),
    uomPoId: integer("uom_po_id"),
    type: productTypeEnum("type").notNull().default("consumable"),
    tracking: productTrackingEnum("tracking").notNull().default("none"),
    invoicePolicy: invoicePolicyEnum("invoice_policy").notNull().default("ordered"),
    canBeSold: boolean("can_be_sold").notNull().default(true),
    canBePurchased: boolean("can_be_purchased").notNull().default(true),
    listPrice: numeric("list_price", { precision: 12, scale: 2 }).notNull().default("0"),
    standardPrice: numeric("standard_price", { precision: 12, scale: 2 }).notNull().default("0"),
    weight: numeric("weight", { precision: 10, scale: 4 }),
    volume: numeric("volume", { precision: 10, scale: 4 }),
    description: text("description"),
    salesDescription: text("sales_description"),
    purchaseDescription: text("purchase_description"),
    sequence: integer("sequence").notNull().default(1),
    isActive: boolean("is_active").notNull().default(true),
    ...timestampColumns,
    ...softDeleteColumns,
    ...auditColumns,
  },
  (table) => [
    index("idx_sales_product_templates_tenant").on(table.tenantId),
    index("idx_sales_product_templates_category").on(table.tenantId, table.categoryId),
    index("idx_sales_product_templates_active").on(table.tenantId, table.isActive),
    uniqueIndex("uq_sales_product_templates_barcode")
      .on(table.tenantId, sql`lower(${table.barcode})`)
      .where(sql`${table.deletedAt} IS NULL AND ${table.barcode} IS NOT NULL`),
    check("chk_sales_product_templates_list_price", sql`${table.listPrice} >= 0`),
    check("chk_sales_product_templates_std_price", sql`${table.standardPrice} >= 0`),
    foreignKey({
      columns: [table.tenantId],
      foreignColumns: [tenants.tenantId],
      name: "fk_sales_product_templates_tenant",
    })
      .onDelete("restrict")
      .onUpdate("cascade"),
    foreignKey({
      columns: [table.categoryId],
      foreignColumns: [productCategories.id],
      name: "fk_sales_product_templates_category",
    })
      .onDelete("set null")
      .onUpdate("cascade"),
    foreignKey({
      columns: [table.uomId],
      foreignColumns: [unitsOfMeasure.uomId],
      name: "fk_sales_product_templates_uom",
    })
      .onDelete("restrict")
      .onUpdate("cascade"),
    foreignKey({
      columns: [table.uomPoId],
      foreignColumns: [unitsOfMeasure.uomId],
      name: "fk_sales_product_templates_uom_po",
    })
      .onDelete("restrict")
      .onUpdate("cascade"),
    ...tenantIsolationPolicies("sales_product_templates"),
    serviceBypassPolicy("sales_product_templates"),
  ]
);

export const productAttributes = salesSchema.table(
  "product_attributes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: integer("tenant_id").notNull(),
    ...nameColumn,
    displayType: attributeDisplayTypeEnum("display_type").notNull().default("radio"),
    createVariantPolicy: createVariantPolicyEnum("create_variant_policy")
      .notNull()
      .default("always"),
    sequence: integer("sequence").notNull().default(1),
    isActive: boolean("is_active").notNull().default(true),
    ...timestampColumns,
    ...softDeleteColumns,
    ...auditColumns,
  },
  (table) => [
    index("idx_sales_product_attributes_tenant").on(table.tenantId),
    uniqueIndex("uq_sales_product_attributes_name")
      .on(table.tenantId, sql`lower(${table.name})`)
      .where(sql`${table.deletedAt} IS NULL`),
    foreignKey({
      columns: [table.tenantId],
      foreignColumns: [tenants.tenantId],
      name: "fk_sales_product_attributes_tenant",
    })
      .onDelete("restrict")
      .onUpdate("cascade"),
    ...tenantIsolationPolicies("sales_product_attributes"),
    serviceBypassPolicy("sales_product_attributes"),
  ]
);

export const productAttributeValues = salesSchema.table(
  "product_attribute_values",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: integer("tenant_id").notNull(),
    attributeId: uuid("attribute_id").notNull(),
    ...nameColumn,
    htmlColor: text("html_color"),
    sequence: integer("sequence").notNull().default(1),
    isActive: boolean("is_active").notNull().default(true),
    ...timestampColumns,
    ...softDeleteColumns,
    ...auditColumns,
  },
  (table) => [
    index("idx_sales_product_attribute_values_tenant").on(table.tenantId),
    index("idx_sales_product_attribute_values_attribute").on(table.tenantId, table.attributeId),
    uniqueIndex("uq_sales_product_attribute_values_name")
      .on(table.tenantId, table.attributeId, sql`lower(${table.name})`)
      .where(sql`${table.deletedAt} IS NULL`),
    foreignKey({
      columns: [table.tenantId],
      foreignColumns: [tenants.tenantId],
      name: "fk_sales_product_attribute_values_tenant",
    })
      .onDelete("restrict")
      .onUpdate("cascade"),
    foreignKey({
      columns: [table.attributeId],
      foreignColumns: [productAttributes.id],
      name: "fk_sales_product_attribute_values_attribute",
    })
      .onDelete("cascade")
      .onUpdate("cascade"),
    ...tenantIsolationPolicies("sales_product_attribute_values"),
    serviceBypassPolicy("sales_product_attribute_values"),
  ]
);

export const productTemplateAttributeLines = salesSchema.table(
  "product_template_attribute_lines",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: integer("tenant_id").notNull(),
    templateId: uuid("template_id").notNull(),
    attributeId: uuid("attribute_id").notNull(),
    sequence: integer("sequence").notNull().default(1),
    ...timestampColumns,
    ...auditColumns,
  },
  (table) => [
    index("idx_sales_ptmpl_attr_lines_tenant").on(table.tenantId),
    index("idx_sales_ptmpl_attr_lines_template").on(table.tenantId, table.templateId),
    uniqueIndex("uq_sales_ptmpl_attr_lines_tmpl_attr").on(
      table.tenantId,
      table.templateId,
      table.attributeId
    ),
    foreignKey({
      columns: [table.tenantId],
      foreignColumns: [tenants.tenantId],
      name: "fk_sales_ptmpl_attr_lines_tenant",
    })
      .onDelete("restrict")
      .onUpdate("cascade"),
    foreignKey({
      columns: [table.templateId],
      foreignColumns: [productTemplates.id],
      name: "fk_sales_ptmpl_attr_lines_template",
    })
      .onDelete("cascade")
      .onUpdate("cascade"),
    foreignKey({
      columns: [table.attributeId],
      foreignColumns: [productAttributes.id],
      name: "fk_sales_ptmpl_attr_lines_attribute",
    })
      .onDelete("restrict")
      .onUpdate("cascade"),
    ...tenantIsolationPolicies("sales_product_template_attribute_lines"),
    serviceBypassPolicy("sales_product_template_attribute_lines"),
  ]
);

export const productTemplateAttributeValues = salesSchema.table(
  "product_template_attribute_values",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: integer("tenant_id").notNull(),
    templateAttributeLineId: uuid("template_attribute_line_id").notNull(),
    attributeValueId: uuid("attribute_value_id").notNull(),
    priceExtra: numeric("price_extra", { precision: 12, scale: 2 }).notNull().default("0"),
    isActive: boolean("is_active").notNull().default(true),
    ...timestampColumns,
    ...auditColumns,
  },
  (table) => [
    index("idx_sales_ptmpl_attr_vals_tenant").on(table.tenantId),
    index("idx_sales_ptmpl_attr_vals_line").on(table.tenantId, table.templateAttributeLineId),
    uniqueIndex("uq_sales_ptmpl_attr_vals_line_val").on(
      table.tenantId,
      table.templateAttributeLineId,
      table.attributeValueId
    ),
    check("chk_sales_ptmpl_attr_vals_price_extra", sql`${table.priceExtra} >= 0`),
    foreignKey({
      columns: [table.tenantId],
      foreignColumns: [tenants.tenantId],
      name: "fk_sales_ptmpl_attr_vals_tenant",
    })
      .onDelete("restrict")
      .onUpdate("cascade"),
    foreignKey({
      columns: [table.templateAttributeLineId],
      foreignColumns: [productTemplateAttributeLines.id],
      name: "fk_sales_ptmpl_attr_vals_line",
    })
      .onDelete("cascade")
      .onUpdate("cascade"),
    foreignKey({
      columns: [table.attributeValueId],
      foreignColumns: [productAttributeValues.id],
      name: "fk_sales_ptmpl_attr_vals_attr_val",
    })
      .onDelete("restrict")
      .onUpdate("cascade"),
    ...tenantIsolationPolicies("sales_product_template_attribute_values"),
    serviceBypassPolicy("sales_product_template_attribute_values"),
  ]
);

export const productVariants = salesSchema.table(
  "product_variants",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: integer("tenant_id").notNull(),
    templateId: uuid("template_id").notNull(),
    combinationIndices: text("combination_indices").notNull().default(""),
    internalReference: text("internal_reference"),
    barcode: text("barcode"),
    lstPrice: numeric("lst_price", { precision: 12, scale: 2 }),
    standardPrice: numeric("standard_price", { precision: 12, scale: 2 }),
    isActive: boolean("is_active").notNull().default(true),
    ...timestampColumns,
    ...softDeleteColumns,
    ...auditColumns,
  },
  (table) => [
    index("idx_sales_product_variants_tenant").on(table.tenantId),
    index("idx_sales_product_variants_template").on(table.tenantId, table.templateId),
    index("idx_sales_product_variants_active").on(table.tenantId, table.isActive),
    uniqueIndex("uq_sales_product_variants_barcode")
      .on(table.tenantId, sql`lower(${table.barcode})`)
      .where(sql`${table.deletedAt} IS NULL AND ${table.barcode} IS NOT NULL`),
    uniqueIndex("uq_sales_product_variants_combination")
      .on(table.tenantId, table.templateId, table.combinationIndices)
      .where(sql`${table.deletedAt} IS NULL`),
    foreignKey({
      columns: [table.tenantId],
      foreignColumns: [tenants.tenantId],
      name: "fk_sales_product_variants_tenant",
    })
      .onDelete("restrict")
      .onUpdate("cascade"),
    foreignKey({
      columns: [table.templateId],
      foreignColumns: [productTemplates.id],
      name: "fk_sales_product_variants_template",
    })
      .onDelete("restrict")
      .onUpdate("cascade"),
    ...tenantIsolationPolicies("sales_product_variants"),
    serviceBypassPolicy("sales_product_variants"),
  ]
);

export const productPackaging = salesSchema.table(
  "product_packaging",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: integer("tenant_id").notNull(),
    variantId: uuid("variant_id").notNull(),
    ...nameColumn,
    qty: numeric("qty", { precision: 12, scale: 4 }).notNull().default("0"),
    barcode: text("barcode"),
    sequence: integer("sequence").notNull().default(1),
    isActive: boolean("is_active").notNull().default(true),
    ...timestampColumns,
    ...softDeleteColumns,
    ...auditColumns,
  },
  (table) => [
    index("idx_sales_product_packaging_tenant").on(table.tenantId),
    index("idx_sales_product_packaging_variant").on(table.tenantId, table.variantId),
    check("chk_sales_product_packaging_qty_positive", sql`${table.qty} > 0`),
    foreignKey({
      columns: [table.tenantId],
      foreignColumns: [tenants.tenantId],
      name: "fk_sales_product_packaging_tenant",
    })
      .onDelete("restrict")
      .onUpdate("cascade"),
    foreignKey({
      columns: [table.variantId],
      foreignColumns: [productVariants.id],
      name: "fk_sales_product_packaging_variant",
    })
      .onDelete("cascade")
      .onUpdate("cascade"),
    ...tenantIsolationPolicies("sales_product_packaging"),
    serviceBypassPolicy("sales_product_packaging"),
  ]
);

export const salesOrders = salesSchema.table(
  "sales_orders",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: integer("tenant_id").notNull(),
    ...nameColumn,
    partnerId: uuid("partner_id").notNull(),
    status: orderStatusEnum("status").notNull().default("draft"),
    sequenceNumber: text("sequence_number"),
    quotationDate: timestamp("quotation_date", { withTimezone: true }),
    validityDate: timestamp("validity_date", { withTimezone: true }),
    confirmationDate: timestamp("confirmation_date", { withTimezone: true }),
    confirmedBy: integer("confirmed_by"),
    currencyId: integer("currency_id"),
    pricelistId: uuid("pricelist_id"),
    paymentTermId: uuid("payment_term_id"),
    fiscalPositionId: uuid("fiscal_position_id"),
    invoiceAddressId: uuid("invoice_address_id"),
    deliveryAddressId: uuid("delivery_address_id"),
    warehouseId: text("warehouse_id"),
    companyCurrencyRate: numeric("company_currency_rate", { precision: 14, scale: 6 }),
    invoiceStatus: invoiceStatusEnum("invoice_status").notNull().default("no"),
    deliveryStatus: deliveryStatusEnum("delivery_status").notNull().default("no"),
    signedBy: text("signed_by"),
    signedOn: timestamp("signed_on", { withTimezone: true }),
    clientOrderRef: text("client_order_ref"),
    origin: text("origin"),
    teamId: text("team_id"),
    userId: integer("user_id"),
    cancelReason: text("cancel_reason"),
    orderDate: timestamp("order_date", { withTimezone: true }).defaultNow().notNull(),
    deliveryDate: timestamp("delivery_date", { withTimezone: true }),
    assignedToId: text("assigned_to_id"),
    notes: text("notes"),
    amountUntaxed: numeric("amount_untaxed", { precision: 14, scale: 2 }).notNull().default("0"),
    amountCost: numeric("amount_cost", { precision: 14, scale: 2 }).notNull().default("0"),
    amountProfit: numeric("amount_profit", { precision: 14, scale: 2 }).notNull().default("0"),
    marginPercent: numeric("margin_percent", { precision: 9, scale: 4 }).notNull().default("0"),
    amountTax: numeric("amount_tax", { precision: 14, scale: 2 }).notNull().default("0"),
    amountTotal: numeric("amount_total", { precision: 14, scale: 2 }).notNull().default("0"),
    ...timestampColumns,
    ...softDeleteColumns,
    ...auditColumns,
  },
  (table) => [
    index("idx_sales_orders_tenant").on(table.tenantId),
    index("idx_sales_orders_partner").on(table.tenantId, table.partnerId),
    index("idx_sales_orders_status").on(table.tenantId, table.status, table.orderDate),
    index("idx_sales_orders_currency").on(table.tenantId, table.currencyId),
    index("idx_sales_orders_pricelist").on(table.tenantId, table.pricelistId),
    index("idx_sales_orders_payment_term").on(table.tenantId, table.paymentTermId),
    index("idx_sales_orders_fiscal_position").on(table.tenantId, table.fiscalPositionId),
    index("idx_sales_orders_invoice_status").on(
      table.tenantId,
      table.invoiceStatus,
      table.orderDate
    ),
    index("idx_sales_orders_delivery_status").on(
      table.tenantId,
      table.deliveryStatus,
      table.orderDate
    ),
    uniqueIndex("uq_sales_orders_sequence_number")
      .on(table.tenantId, table.sequenceNumber)
      .where(sql`${table.deletedAt} IS NULL AND ${table.sequenceNumber} IS NOT NULL`),
    check("chk_sales_orders_amount_untaxed_non_negative", sql`${table.amountUntaxed} >= 0`),
    check("chk_sales_orders_amount_cost_non_negative", sql`${table.amountCost} >= 0`),
    check("chk_sales_orders_amount_profit_non_negative", sql`${table.amountProfit} >= 0`),
    check("chk_sales_orders_amount_tax_non_negative", sql`${table.amountTax} >= 0`),
    check("chk_sales_orders_amount_total_non_negative", sql`${table.amountTotal} >= 0`),
    check(
      "chk_sales_orders_amount_profit_formula",
      sql`${table.amountProfit} = round(${table.amountUntaxed} - ${table.amountCost}, 2)`
    ),
    check(
      "chk_sales_orders_margin_percent_formula",
      sql`${table.marginPercent} = CASE
        WHEN ${table.amountUntaxed} = 0 THEN 0
        ELSE round((${table.amountProfit} / ${table.amountUntaxed}) * 100, 4)
      END`
    ),
    check(
      "chk_sales_orders_validity_date_after_quotation",
      sql`${table.validityDate} IS NULL OR ${table.quotationDate} IS NULL OR ${table.validityDate} >= ${table.quotationDate}`
    ),
    check(
      "chk_sales_orders_company_currency_rate_positive",
      sql`${table.companyCurrencyRate} IS NULL OR ${table.companyCurrencyRate} > 0`
    ),
    foreignKey({
      columns: [table.tenantId],
      foreignColumns: [tenants.tenantId],
      name: "fk_sales_orders_tenant",
    })
      .onDelete("restrict")
      .onUpdate("cascade"),
    foreignKey({
      columns: [table.partnerId],
      foreignColumns: [partners.id],
      name: "fk_sales_orders_partner",
    })
      .onDelete("restrict")
      .onUpdate("cascade"),
    foreignKey({
      columns: [table.confirmedBy],
      foreignColumns: [users.userId],
      name: "fk_sales_orders_confirmed_by",
    })
      .onDelete("set null")
      .onUpdate("cascade"),
    foreignKey({
      columns: [table.userId],
      foreignColumns: [users.userId],
      name: "fk_sales_orders_user",
    })
      .onDelete("set null")
      .onUpdate("cascade"),
    foreignKey({
      columns: [table.currencyId],
      foreignColumns: [currencies.currencyId],
      name: "fk_sales_orders_currency",
    })
      .onDelete("set null")
      .onUpdate("cascade"),
    foreignKey({
      columns: [table.invoiceAddressId],
      foreignColumns: [partnerAddresses.id],
      name: "fk_sales_orders_invoice_address",
    })
      .onDelete("set null")
      .onUpdate("cascade"),
    foreignKey({
      columns: [table.deliveryAddressId],
      foreignColumns: [partnerAddresses.id],
      name: "fk_sales_orders_delivery_address",
    })
      .onDelete("set null")
      .onUpdate("cascade"),
    ...tenantIsolationPolicies("sales_orders"),
    serviceBypassPolicy("sales_orders"),
  ]
);

export const salesOrderLines = salesSchema.table(
  "sales_order_lines",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: integer("tenant_id").notNull(),
    orderId: uuid("order_id").notNull(),
    productId: uuid("product_id").notNull(),
    productTemplateId: uuid("product_template_id"),
    taxId: uuid("tax_id"),
    productUomId: integer("product_uom_id"),
    description: text("description"),
    quantity: numeric("quantity", { precision: 12, scale: 4 }).notNull().default("1"),
    priceUnit: numeric("price_unit", { precision: 12, scale: 2 }).notNull(),
    discount: numeric("discount", { precision: 5, scale: 2 }).notNull().default("0"),
    costUnit: numeric("cost_unit", { precision: 12, scale: 2 }).notNull().default("0"),
    subtotal: numeric("subtotal", { precision: 14, scale: 2 }).notNull(),
    priceSubtotal: numeric("price_subtotal", { precision: 14, scale: 2 }).notNull().default("0"),
    priceTax: numeric("price_tax", { precision: 14, scale: 2 }).notNull().default("0"),
    priceTotal: numeric("price_total", { precision: 14, scale: 2 }).notNull().default("0"),
    costSubtotal: numeric("cost_subtotal", { precision: 14, scale: 2 }).notNull().default("0"),
    profitAmount: numeric("profit_amount", { precision: 14, scale: 2 }).notNull().default("0"),
    marginPercent: numeric("margin_percent", { precision: 9, scale: 4 }).notNull().default("0"),
    qtyDelivered: numeric("qty_delivered", { precision: 12, scale: 4 }).notNull().default("0"),
    qtyToInvoice: numeric("qty_to_invoice", { precision: 12, scale: 4 }).notNull().default("0"),
    qtyInvoiced: numeric("qty_invoiced", { precision: 12, scale: 4 }).notNull().default("0"),
    invoiceStatus: invoiceStatusEnum("invoice_status").notNull().default("no"),
    customerLead: integer("customer_lead").notNull().default(0),
    displayType: displayLineTypeEnum("display_type").notNull().default("product"),
    priceSource: priceSourceEnum("price_source").notNull().default("manual"),
    discountSource: discountSourceEnum("discount_source").notNull().default("manual"),
    appliedPricelistId: uuid("applied_pricelist_id"),
    appliedFiscalPositionId: uuid("applied_fiscal_position_id"),
    discountAuthorityUserId: integer("discount_authority_user_id"),
    sequence: integer("sequence").notNull().default(10),
    ...timestampColumns,
    ...softDeleteColumns,
    ...auditColumns,
  },
  (table) => [
    index("idx_sales_order_lines_tenant").on(table.tenantId),
    index("idx_sales_order_lines_order").on(table.tenantId, table.orderId, table.sequence),
    index("idx_sales_order_lines_product").on(table.tenantId, table.productId),
    index("idx_sales_order_lines_uom").on(table.tenantId, table.productUomId),
    index("idx_sales_order_lines_invoice_status").on(table.tenantId, table.invoiceStatus),
    index("idx_sales_order_lines_price_source").on(table.tenantId, table.priceSource),
    index("idx_sales_order_lines_tax").on(table.tenantId, table.taxId),
    check("chk_sales_order_lines_quantity_positive", sql`${table.quantity} > 0`),
    check("chk_sales_order_lines_price_unit_non_negative", sql`${table.priceUnit} >= 0`),
    check(
      "chk_sales_order_lines_discount_range",
      sql`${table.discount} >= 0 AND ${table.discount} <= 100`
    ),
    check("chk_sales_order_lines_cost_unit_non_negative", sql`${table.costUnit} >= 0`),
    check("chk_sales_order_lines_subtotal_non_negative", sql`${table.subtotal} >= 0`),
    check("chk_sales_order_lines_price_subtotal_non_negative", sql`${table.priceSubtotal} >= 0`),
    check("chk_sales_order_lines_price_tax_non_negative", sql`${table.priceTax} >= 0`),
    check("chk_sales_order_lines_price_total_non_negative", sql`${table.priceTotal} >= 0`),
    check("chk_sales_order_lines_cost_subtotal_non_negative", sql`${table.costSubtotal} >= 0`),
    check("chk_sales_order_lines_profit_amount_non_negative", sql`${table.profitAmount} >= 0`),
    check(
      "chk_sales_order_lines_cost_subtotal_formula",
      sql`${table.costSubtotal} = round(${table.quantity} * ${table.costUnit}, 2)`
    ),
    check(
      "chk_sales_order_lines_profit_formula",
      sql`${table.profitAmount} = round(${table.priceSubtotal} - ${table.costSubtotal}, 2)`
    ),
    check(
      "chk_sales_order_lines_margin_percent_formula",
      sql`${table.marginPercent} = CASE
        WHEN ${table.priceSubtotal} = 0 THEN 0
        ELSE round((${table.profitAmount} / ${table.priceSubtotal}) * 100, 4)
      END`
    ),
    check("chk_sales_order_lines_qty_delivered_non_negative", sql`${table.qtyDelivered} >= 0`),
    check("chk_sales_order_lines_qty_to_invoice_non_negative", sql`${table.qtyToInvoice} >= 0`),
    check("chk_sales_order_lines_qty_invoiced_non_negative", sql`${table.qtyInvoiced} >= 0`),
    check("chk_sales_order_lines_customer_lead_non_negative", sql`${table.customerLead} >= 0`),
    foreignKey({
      columns: [table.tenantId],
      foreignColumns: [tenants.tenantId],
      name: "fk_sales_order_lines_tenant",
    })
      .onDelete("restrict")
      .onUpdate("cascade"),
    foreignKey({
      columns: [table.orderId],
      foreignColumns: [salesOrders.id],
      name: "fk_sales_order_lines_order",
    })
      .onDelete("cascade")
      .onUpdate("cascade"),
    foreignKey({
      columns: [table.productId],
      foreignColumns: [products.id],
      name: "fk_sales_order_lines_product",
    })
      .onDelete("restrict")
      .onUpdate("cascade"),
    foreignKey({
      columns: [table.productTemplateId],
      foreignColumns: [productTemplates.id],
      name: "fk_sales_order_lines_product_template",
    })
      .onDelete("set null")
      .onUpdate("cascade"),
    foreignKey({
      columns: [table.productUomId],
      foreignColumns: [unitsOfMeasure.uomId],
      name: "fk_sales_order_lines_product_uom",
    })
      .onDelete("set null")
      .onUpdate("cascade"),
    foreignKey({
      columns: [table.discountAuthorityUserId],
      foreignColumns: [users.userId],
      name: "fk_sales_order_lines_discount_authority_user",
    })
      .onDelete("set null")
      .onUpdate("cascade"),
    ...tenantIsolationPolicies("sales_order_lines"),
    serviceBypassPolicy("sales_order_lines"),
  ]
);

export const paymentTerms = salesSchema.table(
  "payment_terms",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: integer("tenant_id").notNull(),
    ...nameColumn,
    note: text("note"),
    isActive: boolean("is_active").notNull().default(true),
    ...timestampColumns,
    ...softDeleteColumns,
    ...auditColumns,
  },
  (table) => [
    index("idx_sales_payment_terms_tenant").on(table.tenantId),
    index("idx_sales_payment_terms_active").on(table.tenantId, table.isActive),
    uniqueIndex("uq_sales_payment_terms_name")
      .on(table.tenantId, sql`lower(${table.name})`)
      .where(sql`${table.deletedAt} IS NULL`),
    foreignKey({
      columns: [table.tenantId],
      foreignColumns: [tenants.tenantId],
      name: "fk_sales_payment_terms_tenant",
    })
      .onDelete("restrict")
      .onUpdate("cascade"),
    ...tenantIsolationPolicies("sales_payment_terms"),
    serviceBypassPolicy("sales_payment_terms"),
  ]
);

export const paymentTermLines = salesSchema.table(
  "payment_term_lines",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: integer("tenant_id").notNull(),
    paymentTermId: uuid("payment_term_id").notNull(),
    valueType: paymentTermValueTypeEnum("value_type").notNull().default("balance"),
    value: numeric("value", { precision: 10, scale: 4 }).notNull().default("0"),
    days: integer("days").notNull().default(0),
    dayOfMonth: integer("day_of_month"),
    endOfMonth: boolean("end_of_month").notNull().default(false),
    sequence: integer("sequence").notNull().default(10),
    ...timestampColumns,
    ...auditColumns,
  },
  (table) => [
    index("idx_sales_payment_term_lines_tenant").on(table.tenantId),
    index("idx_sales_payment_term_lines_term").on(
      table.tenantId,
      table.paymentTermId,
      table.sequence
    ),
    uniqueIndex("uq_sales_payment_term_lines_sequence").on(
      table.tenantId,
      table.paymentTermId,
      table.sequence
    ),
    check("chk_sales_payment_term_lines_value_non_negative", sql`${table.value} >= 0`),
    check(
      "chk_sales_payment_term_lines_percent_range",
      sql`${table.valueType} <> 'percent' OR ${table.value} <= 100`
    ),
    check("chk_sales_payment_term_lines_days_non_negative", sql`${table.days} >= 0`),
    check(
      "chk_sales_payment_term_lines_day_of_month_range",
      sql`${table.dayOfMonth} IS NULL OR (${table.dayOfMonth} >= 1 AND ${table.dayOfMonth} <= 31)`
    ),
    check("chk_sales_payment_term_lines_sequence_non_negative", sql`${table.sequence} >= 0`),
    foreignKey({
      columns: [table.tenantId],
      foreignColumns: [tenants.tenantId],
      name: "fk_sales_payment_term_lines_tenant",
    })
      .onDelete("restrict")
      .onUpdate("cascade"),
    foreignKey({
      columns: [table.paymentTermId],
      foreignColumns: [paymentTerms.id],
      name: "fk_sales_payment_term_lines_term",
    })
      .onDelete("cascade")
      .onUpdate("cascade"),
    ...tenantIsolationPolicies("sales_payment_term_lines"),
    serviceBypassPolicy("sales_payment_term_lines"),
  ]
);

export const pricelists = salesSchema.table(
  "pricelists",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: integer("tenant_id").notNull(),
    ...nameColumn,
    currencyId: integer("currency_id").notNull(),
    discountPolicy: discountPolicyEnum("discount_policy").notNull().default("with_discount"),
    isActive: boolean("is_active").notNull().default(true),
    sequence: integer("sequence").notNull().default(10),
    ...timestampColumns,
    ...softDeleteColumns,
    ...auditColumns,
  },
  (table) => [
    index("idx_sales_pricelists_tenant").on(table.tenantId),
    index("idx_sales_pricelists_currency").on(table.tenantId, table.currencyId),
    index("idx_sales_pricelists_active").on(table.tenantId, table.isActive, table.sequence),
    uniqueIndex("uq_sales_pricelists_name")
      .on(table.tenantId, sql`lower(${table.name})`)
      .where(sql`${table.deletedAt} IS NULL`),
    check("chk_sales_pricelists_sequence_non_negative", sql`${table.sequence} >= 0`),
    foreignKey({
      columns: [table.tenantId],
      foreignColumns: [tenants.tenantId],
      name: "fk_sales_pricelists_tenant",
    })
      .onDelete("restrict")
      .onUpdate("cascade"),
    foreignKey({
      columns: [table.currencyId],
      foreignColumns: [currencies.currencyId],
      name: "fk_sales_pricelists_currency",
    })
      .onDelete("restrict")
      .onUpdate("cascade"),
    ...tenantIsolationPolicies("sales_pricelists"),
    serviceBypassPolicy("sales_pricelists"),
  ]
);

export const pricelistItems = salesSchema.table(
  "pricelist_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: integer("tenant_id").notNull(),
    pricelistId: uuid("pricelist_id").notNull(),
    appliedOn: pricelistAppliedOnEnum("applied_on").notNull().default("global"),
    productTmplId: uuid("product_tmpl_id"),
    productId: uuid("product_id"),
    categId: uuid("categ_id"),
    minQuantity: numeric("min_quantity", { precision: 12, scale: 4 }).notNull().default("1"),
    dateStart: timestamp("date_start", { withTimezone: true }),
    dateEnd: timestamp("date_end", { withTimezone: true }),
    computePrice: pricelistComputeTypeEnum("compute_price").notNull().default("fixed"),
    fixedPrice: numeric("fixed_price", { precision: 14, scale: 4 }),
    percentPrice: numeric("percent_price", { precision: 9, scale: 4 }),
    base: pricelistBaseTypeEnum("base").notNull().default("list_price"),
    basePricelistId: uuid("base_pricelist_id"),
    priceSurcharge: numeric("price_surcharge", { precision: 14, scale: 4 }).notNull().default("0"),
    priceDiscount: numeric("price_discount", { precision: 9, scale: 4 }).notNull().default("0"),
    priceRound: numeric("price_round", { precision: 14, scale: 6 }),
    priceMinMargin: numeric("price_min_margin", { precision: 14, scale: 4 }).notNull().default("0"),
    priceMaxMargin: numeric("price_max_margin", { precision: 14, scale: 4 }).notNull().default("0"),
    sequence: integer("sequence").notNull().default(10),
    isActive: boolean("is_active").notNull().default(true),
    ...timestampColumns,
    ...softDeleteColumns,
    ...auditColumns,
  },
  (table) => [
    index("idx_sales_pricelist_items_tenant").on(table.tenantId),
    index("idx_sales_pricelist_items_pricelist").on(
      table.tenantId,
      table.pricelistId,
      table.sequence
    ),
    index("idx_sales_pricelist_items_scope").on(table.tenantId, table.appliedOn, table.isActive),
    index("idx_sales_pricelist_items_product").on(table.tenantId, table.productId),
    index("idx_sales_pricelist_items_category").on(table.tenantId, table.categId),
    check("chk_sales_pricelist_items_min_quantity_positive", sql`${table.minQuantity} > 0`),
    check(
      "chk_sales_pricelist_items_percent_price_range",
      sql`${table.percentPrice} IS NULL OR (${table.percentPrice} >= 0 AND ${table.percentPrice} <= 100)`
    ),
    check(
      "chk_sales_pricelist_items_price_discount_range",
      sql`${table.priceDiscount} >= -100 AND ${table.priceDiscount} <= 100`
    ),
    check(
      "chk_sales_pricelist_items_date_range",
      sql`${table.dateEnd} IS NULL OR ${table.dateStart} IS NULL OR ${table.dateEnd} >= ${table.dateStart}`
    ),
    check(
      "chk_sales_pricelist_items_margins_non_negative",
      sql`${table.priceMinMargin} >= 0 AND ${table.priceMaxMargin} >= 0`
    ),
    check("chk_sales_pricelist_items_sequence_non_negative", sql`${table.sequence} >= 0`),
    foreignKey({
      columns: [table.tenantId],
      foreignColumns: [tenants.tenantId],
      name: "fk_sales_pricelist_items_tenant",
    })
      .onDelete("restrict")
      .onUpdate("cascade"),
    foreignKey({
      columns: [table.pricelistId],
      foreignColumns: [pricelists.id],
      name: "fk_sales_pricelist_items_pricelist",
    })
      .onDelete("cascade")
      .onUpdate("cascade"),
    foreignKey({
      columns: [table.productId],
      foreignColumns: [products.id],
      name: "fk_sales_pricelist_items_product",
    })
      .onDelete("set null")
      .onUpdate("cascade"),
    foreignKey({
      columns: [table.categId],
      foreignColumns: [productCategories.id],
      name: "fk_sales_pricelist_items_category",
    })
      .onDelete("set null")
      .onUpdate("cascade"),
    foreignKey({
      columns: [table.basePricelistId],
      foreignColumns: [pricelists.id],
      name: "fk_sales_pricelist_items_base_pricelist",
    })
      .onDelete("set null")
      .onUpdate("cascade"),
    ...tenantIsolationPolicies("sales_pricelist_items"),
    serviceBypassPolicy("sales_pricelist_items"),
  ]
);

export const taxGroups = salesSchema.table(
  "tax_groups",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: integer("tenant_id").notNull(),
    ...nameColumn,
    sequence: integer("sequence").notNull().default(10),
    countryId: integer("country_id"),
    ...timestampColumns,
    ...softDeleteColumns,
    ...auditColumns,
  },
  (table) => [
    index("idx_sales_tax_groups_tenant").on(table.tenantId),
    index("idx_sales_tax_groups_country").on(table.tenantId, table.countryId),
    uniqueIndex("uq_sales_tax_groups_name")
      .on(table.tenantId, sql`lower(${table.name})`)
      .where(sql`${table.deletedAt} IS NULL`),
    check("chk_sales_tax_groups_sequence_non_negative", sql`${table.sequence} >= 0`),
    foreignKey({
      columns: [table.tenantId],
      foreignColumns: [tenants.tenantId],
      name: "fk_sales_tax_groups_tenant",
    })
      .onDelete("restrict")
      .onUpdate("cascade"),
    foreignKey({
      columns: [table.countryId],
      foreignColumns: [countries.countryId],
      name: "fk_sales_tax_groups_country",
    })
      .onDelete("set null")
      .onUpdate("cascade"),
    ...tenantIsolationPolicies("sales_tax_groups"),
    serviceBypassPolicy("sales_tax_groups"),
  ]
);

export const taxRates = salesSchema.table(
  "tax_rates",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: integer("tenant_id").notNull(),
    ...nameColumn,
    typeTaxUse: taxTypeUseEnum("type_tax_use").notNull().default("sale"),
    amountType: taxAmountTypeEnum("amount_type").notNull().default("percent"),
    amount: numeric("amount", { precision: 9, scale: 4 }).notNull().default("0"),
    taxGroupId: uuid("tax_group_id"),
    priceInclude: boolean("price_include").notNull().default(false),
    isActive: boolean("is_active").notNull().default(true),
    sequence: integer("sequence").notNull().default(10),
    countryId: integer("country_id"),
    ...timestampColumns,
    ...softDeleteColumns,
    ...auditColumns,
  },
  (table) => [
    index("idx_sales_tax_rates_tenant").on(table.tenantId),
    index("idx_sales_tax_rates_type").on(table.tenantId, table.typeTaxUse, table.amountType),
    index("idx_sales_tax_rates_group").on(table.tenantId, table.taxGroupId),
    uniqueIndex("uq_sales_tax_rates_name")
      .on(table.tenantId, sql`lower(${table.name})`)
      .where(sql`${table.deletedAt} IS NULL`),
    check("chk_sales_tax_rates_amount_non_negative", sql`${table.amount} >= 0`),
    check(
      "chk_sales_tax_rates_percent_range",
      sql`${table.amountType} <> 'percent' OR ${table.amount} <= 100`
    ),
    check("chk_sales_tax_rates_sequence_non_negative", sql`${table.sequence} >= 0`),
    foreignKey({
      columns: [table.tenantId],
      foreignColumns: [tenants.tenantId],
      name: "fk_sales_tax_rates_tenant",
    })
      .onDelete("restrict")
      .onUpdate("cascade"),
    foreignKey({
      columns: [table.taxGroupId],
      foreignColumns: [taxGroups.id],
      name: "fk_sales_tax_rates_group",
    })
      .onDelete("set null")
      .onUpdate("cascade"),
    foreignKey({
      columns: [table.countryId],
      foreignColumns: [countries.countryId],
      name: "fk_sales_tax_rates_country",
    })
      .onDelete("set null")
      .onUpdate("cascade"),
    ...tenantIsolationPolicies("sales_tax_rates"),
    serviceBypassPolicy("sales_tax_rates"),
  ]
);

export const taxRateChildren = salesSchema.table(
  "tax_rate_children",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: integer("tenant_id").notNull(),
    parentTaxId: uuid("parent_tax_id").notNull(),
    childTaxId: uuid("child_tax_id").notNull(),
    sequence: integer("sequence").notNull().default(10),
    ...timestampColumns,
    ...auditColumns,
  },
  (table) => [
    index("idx_sales_tax_rate_children_tenant").on(table.tenantId),
    index("idx_sales_tax_rate_children_parent").on(
      table.tenantId,
      table.parentTaxId,
      table.sequence
    ),
    uniqueIndex("uq_sales_tax_rate_children_unique").on(
      table.tenantId,
      table.parentTaxId,
      table.childTaxId
    ),
    check("chk_sales_tax_rate_children_sequence_non_negative", sql`${table.sequence} >= 0`),
    check("chk_sales_tax_rate_children_distinct", sql`${table.parentTaxId} <> ${table.childTaxId}`),
    foreignKey({
      columns: [table.tenantId],
      foreignColumns: [tenants.tenantId],
      name: "fk_sales_tax_rate_children_tenant",
    })
      .onDelete("restrict")
      .onUpdate("cascade"),
    foreignKey({
      columns: [table.parentTaxId],
      foreignColumns: [taxRates.id],
      name: "fk_sales_tax_rate_children_parent",
    })
      .onDelete("cascade")
      .onUpdate("cascade"),
    foreignKey({
      columns: [table.childTaxId],
      foreignColumns: [taxRates.id],
      name: "fk_sales_tax_rate_children_child",
    })
      .onDelete("restrict")
      .onUpdate("cascade"),
    ...tenantIsolationPolicies("sales_tax_rate_children"),
    serviceBypassPolicy("sales_tax_rate_children"),
  ]
);

export const fiscalPositions = salesSchema.table(
  "fiscal_positions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: integer("tenant_id").notNull(),
    ...nameColumn,
    countryId: integer("country_id"),
    stateIds: text("state_ids"),
    zipFrom: text("zip_from"),
    zipTo: text("zip_to"),
    autoApply: boolean("auto_apply").notNull().default(false),
    vatRequired: boolean("vat_required").notNull().default(false),
    sequence: integer("sequence").notNull().default(10),
    isActive: boolean("is_active").notNull().default(true),
    ...timestampColumns,
    ...softDeleteColumns,
    ...auditColumns,
  },
  (table) => [
    index("idx_sales_fiscal_positions_tenant").on(table.tenantId),
    index("idx_sales_fiscal_positions_country").on(
      table.tenantId,
      table.countryId,
      table.autoApply
    ),
    uniqueIndex("uq_sales_fiscal_positions_name")
      .on(table.tenantId, sql`lower(${table.name})`)
      .where(sql`${table.deletedAt} IS NULL`),
    foreignKey({
      columns: [table.tenantId],
      foreignColumns: [tenants.tenantId],
      name: "fk_sales_fiscal_positions_tenant",
    })
      .onDelete("restrict")
      .onUpdate("cascade"),
    foreignKey({
      columns: [table.countryId],
      foreignColumns: [countries.countryId],
      name: "fk_sales_fiscal_positions_country",
    })
      .onDelete("set null")
      .onUpdate("cascade"),
    ...tenantIsolationPolicies("sales_fiscal_positions"),
    serviceBypassPolicy("sales_fiscal_positions"),
  ]
);

export const fiscalPositionTaxMaps = salesSchema.table(
  "fiscal_position_tax_maps",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: integer("tenant_id").notNull(),
    fiscalPositionId: uuid("fiscal_position_id").notNull(),
    taxSrcId: uuid("tax_src_id").notNull(),
    taxDestId: uuid("tax_dest_id"),
    sequence: integer("sequence").notNull().default(10),
    ...timestampColumns,
    ...auditColumns,
  },
  (table) => [
    index("idx_sales_fiscal_position_tax_maps_tenant").on(table.tenantId),
    index("idx_sales_fiscal_position_tax_maps_position").on(table.tenantId, table.fiscalPositionId),
    uniqueIndex("uq_sales_fiscal_position_tax_maps_unique").on(
      table.tenantId,
      table.fiscalPositionId,
      table.taxSrcId
    ),
    foreignKey({
      columns: [table.tenantId],
      foreignColumns: [tenants.tenantId],
      name: "fk_sales_fiscal_position_tax_maps_tenant",
    })
      .onDelete("restrict")
      .onUpdate("cascade"),
    foreignKey({
      columns: [table.fiscalPositionId],
      foreignColumns: [fiscalPositions.id],
      name: "fk_sales_fiscal_position_tax_maps_position",
    })
      .onDelete("cascade")
      .onUpdate("cascade"),
    foreignKey({
      columns: [table.taxSrcId],
      foreignColumns: [taxRates.id],
      name: "fk_sales_fiscal_position_tax_maps_src",
    })
      .onDelete("restrict")
      .onUpdate("cascade"),
    foreignKey({
      columns: [table.taxDestId],
      foreignColumns: [taxRates.id],
      name: "fk_sales_fiscal_position_tax_maps_dest",
    })
      .onDelete("set null")
      .onUpdate("cascade"),
    ...tenantIsolationPolicies("sales_fiscal_position_tax_maps"),
    serviceBypassPolicy("sales_fiscal_position_tax_maps"),
  ]
);

export const fiscalPositionAccountMaps = salesSchema.table(
  "fiscal_position_account_maps",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: integer("tenant_id").notNull(),
    fiscalPositionId: uuid("fiscal_position_id").notNull(),
    accountSrcId: text("account_src_id").notNull(),
    accountDestId: text("account_dest_id").notNull(),
    ...timestampColumns,
    ...auditColumns,
  },
  (table) => [
    index("idx_sales_fiscal_position_account_maps_tenant").on(table.tenantId),
    index("idx_sales_fiscal_position_account_maps_position").on(
      table.tenantId,
      table.fiscalPositionId
    ),
    uniqueIndex("uq_sales_fiscal_position_account_maps_unique").on(
      table.tenantId,
      table.fiscalPositionId,
      table.accountSrcId
    ),
    foreignKey({
      columns: [table.tenantId],
      foreignColumns: [tenants.tenantId],
      name: "fk_sales_fiscal_position_account_maps_tenant",
    })
      .onDelete("restrict")
      .onUpdate("cascade"),
    foreignKey({
      columns: [table.fiscalPositionId],
      foreignColumns: [fiscalPositions.id],
      name: "fk_sales_fiscal_position_account_maps_position",
    })
      .onDelete("cascade")
      .onUpdate("cascade"),
    ...tenantIsolationPolicies("sales_fiscal_position_account_maps"),
    serviceBypassPolicy("sales_fiscal_position_account_maps"),
  ]
);

export const saleOrderLineTaxes = salesSchema.table(
  "sale_order_line_taxes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: integer("tenant_id").notNull(),
    orderLineId: uuid("order_line_id").notNull(),
    taxId: uuid("tax_id").notNull(),
    sequence: integer("sequence").notNull().default(10),
    ...timestampColumns,
    ...auditColumns,
  },
  (table) => [
    index("idx_sales_sale_order_line_taxes_tenant").on(table.tenantId),
    index("idx_sales_sale_order_line_taxes_line").on(
      table.tenantId,
      table.orderLineId,
      table.sequence
    ),
    index("idx_sales_sale_order_line_taxes_tax").on(table.tenantId, table.taxId),
    uniqueIndex("uq_sales_sale_order_line_taxes_unique").on(
      table.tenantId,
      table.orderLineId,
      table.taxId
    ),
    check("chk_sales_sale_order_line_taxes_sequence_non_negative", sql`${table.sequence} >= 0`),
    foreignKey({
      columns: [table.tenantId],
      foreignColumns: [tenants.tenantId],
      name: "fk_sales_sale_order_line_taxes_tenant",
    })
      .onDelete("restrict")
      .onUpdate("cascade"),
    foreignKey({
      columns: [table.orderLineId],
      foreignColumns: [salesOrderLines.id],
      name: "fk_sales_sale_order_line_taxes_line",
    })
      .onDelete("cascade")
      .onUpdate("cascade"),
    foreignKey({
      columns: [table.taxId],
      foreignColumns: [taxRates.id],
      name: "fk_sales_sale_order_line_taxes_tax",
    })
      .onDelete("restrict")
      .onUpdate("cascade"),
    ...tenantIsolationPolicies("sales_sale_order_line_taxes"),
    serviceBypassPolicy("sales_sale_order_line_taxes"),
  ]
);

export const saleOrderOptionLines = salesSchema.table(
  "sale_order_option_lines",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: integer("tenant_id").notNull(),
    orderId: uuid("order_id").notNull(),
    productId: uuid("product_id").notNull(),
    name: text("name").notNull(),
    quantity: numeric("quantity", { precision: 12, scale: 3 }).notNull().default("1"),
    priceUnit: numeric("price_unit", { precision: 14, scale: 2 }).notNull(),
    discount: numeric("discount", { precision: 5, scale: 2 }).notNull().default("0"),
    uomId: integer("uom_id").notNull(),
    sequence: integer("sequence").notNull().default(10),
    ...timestampColumns,
    ...auditColumns,
  },
  (table) => [
    index("idx_sales_sale_order_option_lines_tenant").on(table.tenantId),
    index("idx_sales_sale_order_option_lines_order").on(
      table.tenantId,
      table.orderId,
      table.sequence
    ),
    index("idx_sales_sale_order_option_lines_product").on(table.tenantId, table.productId),
    check("chk_sales_sale_order_option_lines_quantity_positive", sql`${table.quantity} > 0`),
    check(
      "chk_sales_sale_order_option_lines_price_unit_non_negative",
      sql`${table.priceUnit} >= 0`
    ),
    check(
      "chk_sales_sale_order_option_lines_discount_range",
      sql`${table.discount} >= 0 AND ${table.discount} <= 100`
    ),
    foreignKey({
      columns: [table.tenantId],
      foreignColumns: [tenants.tenantId],
      name: "fk_sales_sale_order_option_lines_tenant",
    })
      .onDelete("restrict")
      .onUpdate("cascade"),
    foreignKey({
      columns: [table.orderId],
      foreignColumns: [salesOrders.id],
      name: "fk_sales_sale_order_option_lines_order",
    })
      .onDelete("cascade")
      .onUpdate("cascade"),
    foreignKey({
      columns: [table.productId],
      foreignColumns: [products.id],
      name: "fk_sales_sale_order_option_lines_product",
    })
      .onDelete("restrict")
      .onUpdate("cascade"),
    foreignKey({
      columns: [table.uomId],
      foreignColumns: [unitsOfMeasure.uomId],
      name: "fk_sales_sale_order_option_lines_uom",
    })
      .onDelete("restrict")
      .onUpdate("cascade"),
    ...tenantIsolationPolicies("sales_sale_order_option_lines"),
    serviceBypassPolicy("sales_sale_order_option_lines"),
  ]
);

export const saleOrderStatusHistory = salesSchema.table(
  "sale_order_status_history",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: integer("tenant_id").notNull(),
    orderId: uuid("order_id").notNull(),
    oldStatus: orderStatusEnum("old_status").notNull(),
    newStatus: orderStatusEnum("new_status").notNull(),
    changedBy: integer("changed_by"),
    changedAt: timestamp("changed_at", { withTimezone: true }).defaultNow().notNull(),
    reason: text("reason"),
    ...timestampColumns,
    ...auditColumns,
  },
  (table) => [
    index("idx_sales_sale_order_status_history_tenant").on(table.tenantId),
    index("idx_sales_sale_order_status_history_order").on(
      table.tenantId,
      table.orderId,
      table.changedAt
    ),
    index("idx_sales_sale_order_status_history_status").on(
      table.tenantId,
      table.newStatus,
      table.changedAt
    ),
    foreignKey({
      columns: [table.tenantId],
      foreignColumns: [tenants.tenantId],
      name: "fk_sales_sale_order_status_history_tenant",
    })
      .onDelete("restrict")
      .onUpdate("cascade"),
    foreignKey({
      columns: [table.orderId],
      foreignColumns: [salesOrders.id],
      name: "fk_sales_sale_order_status_history_order",
    })
      .onDelete("cascade")
      .onUpdate("cascade"),
    foreignKey({
      columns: [table.changedBy],
      foreignColumns: [users.userId],
      name: "fk_sales_sale_order_status_history_changed_by",
    })
      .onDelete("set null")
      .onUpdate("cascade"),
    ...tenantIsolationPolicies("sales_sale_order_status_history"),
    serviceBypassPolicy("sales_sale_order_status_history"),
  ]
);

export const saleOrderTaxSummary = salesSchema.table(
  "sale_order_tax_summary",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: integer("tenant_id").notNull(),
    orderId: uuid("order_id").notNull(),
    taxId: uuid("tax_id").notNull(),
    taxGroupId: uuid("tax_group_id"),
    baseAmount: numeric("base_amount", { precision: 14, scale: 2 }).notNull().default("0"),
    taxAmount: numeric("tax_amount", { precision: 14, scale: 2 }).notNull().default("0"),
    isTaxIncluded: boolean("is_tax_included").notNull().default(false),
    ...timestampColumns,
    ...auditColumns,
  },
  (table) => [
    index("idx_sales_sale_order_tax_summary_tenant").on(table.tenantId),
    index("idx_sales_sale_order_tax_summary_order").on(table.tenantId, table.orderId),
    index("idx_sales_sale_order_tax_summary_tax").on(table.tenantId, table.taxId),
    uniqueIndex("uq_sales_sale_order_tax_summary_unique").on(
      table.tenantId,
      table.orderId,
      table.taxId
    ),
    check("chk_sales_sale_order_tax_summary_base_non_negative", sql`${table.baseAmount} >= 0`),
    check("chk_sales_sale_order_tax_summary_tax_non_negative", sql`${table.taxAmount} >= 0`),
    foreignKey({
      columns: [table.tenantId],
      foreignColumns: [tenants.tenantId],
      name: "fk_sales_sale_order_tax_summary_tenant",
    })
      .onDelete("restrict")
      .onUpdate("cascade"),
    foreignKey({
      columns: [table.orderId],
      foreignColumns: [salesOrders.id],
      name: "fk_sales_sale_order_tax_summary_order",
    })
      .onDelete("cascade")
      .onUpdate("cascade"),
    foreignKey({
      columns: [table.taxId],
      foreignColumns: [taxRates.id],
      name: "fk_sales_sale_order_tax_summary_tax",
    })
      .onDelete("restrict")
      .onUpdate("cascade"),
    foreignKey({
      columns: [table.taxGroupId],
      foreignColumns: [taxGroups.id],
      name: "fk_sales_sale_order_tax_summary_tax_group",
    })
      .onDelete("set null")
      .onUpdate("cascade"),
    ...tenantIsolationPolicies("sales_sale_order_tax_summary"),
    serviceBypassPolicy("sales_sale_order_tax_summary"),
  ]
);

export const consignmentAgreements = salesSchema.table(
  "consignment_agreements",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: integer("tenant_id").notNull(),
    ...nameColumn,
    partnerId: uuid("partner_id").notNull(),
    startDate: timestamp("start_date", { withTimezone: true }).notNull(),
    endDate: timestamp("end_date", { withTimezone: true }),
    status: consignmentStatusEnum("status").notNull().default("draft"),
    paymentTermId: uuid("payment_term_id"),
    reviewPeriodDays: integer("review_period_days").notNull().default(30),
    notes: text("notes"),
    ...timestampColumns,
    ...softDeleteColumns,
    ...auditColumns,
  },
  (table) => [
    index("idx_sales_consignment_agreements_tenant").on(table.tenantId),
    index("idx_sales_consignment_agreements_partner").on(
      table.tenantId,
      table.partnerId,
      table.status
    ),
    index("idx_sales_consignment_agreements_dates").on(
      table.tenantId,
      table.startDate,
      table.endDate
    ),
    index("idx_sales_consignment_agreements_payment_term").on(table.tenantId, table.paymentTermId),
    uniqueIndex("uq_sales_consignment_agreements_name")
      .on(table.tenantId, sql`lower(${table.name})`)
      .where(sql`${table.deletedAt} IS NULL`),
    check(
      "chk_sales_consignment_agreements_end_after_start",
      sql`${table.endDate} IS NULL OR ${table.endDate} >= ${table.startDate}`
    ),
    check(
      "chk_sales_consignment_agreements_review_period_positive",
      sql`${table.reviewPeriodDays} > 0`
    ),
    foreignKey({
      columns: [table.tenantId],
      foreignColumns: [tenants.tenantId],
      name: "fk_sales_consignment_agreements_tenant",
    })
      .onDelete("restrict")
      .onUpdate("cascade"),
    foreignKey({
      columns: [table.partnerId],
      foreignColumns: [partners.id],
      name: "fk_sales_consignment_agreements_partner",
    })
      .onDelete("restrict")
      .onUpdate("cascade"),
    foreignKey({
      columns: [table.paymentTermId],
      foreignColumns: [paymentTerms.id],
      name: "fk_sales_consignment_agreements_payment_term",
    })
      .onDelete("set null")
      .onUpdate("cascade"),
    ...tenantIsolationPolicies("sales_consignment_agreements"),
    serviceBypassPolicy("sales_consignment_agreements"),
  ]
);

export const consignmentAgreementLines = salesSchema.table(
  "consignment_agreement_lines",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: integer("tenant_id").notNull(),
    agreementId: uuid("agreement_id").notNull(),
    productId: uuid("product_id").notNull(),
    maxQuantity: numeric("max_quantity", { precision: 12, scale: 4 }).notNull().default("0"),
    unitPrice: numeric("unit_price", { precision: 14, scale: 2 }).notNull().default("0"),
    minReportPeriod: consignmentReportPeriodEnum("min_report_period").notNull().default("monthly"),
    isActive: boolean("is_active").notNull().default(true),
    ...timestampColumns,
    ...softDeleteColumns,
    ...auditColumns,
  },
  (table) => [
    index("idx_sales_consignment_agreement_lines_tenant").on(table.tenantId),
    index("idx_sales_consignment_agreement_lines_agreement").on(table.tenantId, table.agreementId),
    index("idx_sales_consignment_agreement_lines_product").on(table.tenantId, table.productId),
    uniqueIndex("uq_sales_consignment_agreement_lines_unique")
      .on(table.tenantId, table.agreementId, table.productId)
      .where(sql`${table.deletedAt} IS NULL`),
    check(
      "chk_sales_consignment_agreement_lines_max_qty_non_negative",
      sql`${table.maxQuantity} >= 0`
    ),
    check(
      "chk_sales_consignment_agreement_lines_unit_price_non_negative",
      sql`${table.unitPrice} >= 0`
    ),
    foreignKey({
      columns: [table.tenantId],
      foreignColumns: [tenants.tenantId],
      name: "fk_sales_consignment_agreement_lines_tenant",
    })
      .onDelete("restrict")
      .onUpdate("cascade"),
    foreignKey({
      columns: [table.agreementId],
      foreignColumns: [consignmentAgreements.id],
      name: "fk_sales_consignment_agreement_lines_agreement",
    })
      .onDelete("cascade")
      .onUpdate("cascade"),
    foreignKey({
      columns: [table.productId],
      foreignColumns: [products.id],
      name: "fk_sales_consignment_agreement_lines_product",
    })
      .onDelete("restrict")
      .onUpdate("cascade"),
    ...tenantIsolationPolicies("sales_consignment_agreement_lines"),
    serviceBypassPolicy("sales_consignment_agreement_lines"),
  ]
);

export const consignmentStockReports = salesSchema.table(
  "consignment_stock_reports",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: integer("tenant_id").notNull(),
    agreementId: uuid("agreement_id").notNull(),
    reportDate: timestamp("report_date", { withTimezone: true }).notNull(),
    status: consignmentReportStatusEnum("status").notNull().default("draft"),
    submittedAt: timestamp("submitted_at", { withTimezone: true }),
    confirmedAt: timestamp("confirmed_at", { withTimezone: true }),
    invoicedAt: timestamp("invoiced_at", { withTimezone: true }),
    notes: text("notes"),
    ...timestampColumns,
    ...softDeleteColumns,
    ...auditColumns,
  },
  (table) => [
    index("idx_sales_consignment_stock_reports_tenant").on(table.tenantId),
    index("idx_sales_consignment_stock_reports_agreement").on(
      table.tenantId,
      table.agreementId,
      table.reportDate
    ),
    index("idx_sales_consignment_stock_reports_status").on(
      table.tenantId,
      table.status,
      table.reportDate
    ),
    uniqueIndex("uq_sales_consignment_stock_reports_date")
      .on(table.tenantId, table.agreementId, table.reportDate)
      .where(sql`${table.deletedAt} IS NULL`),
    foreignKey({
      columns: [table.tenantId],
      foreignColumns: [tenants.tenantId],
      name: "fk_sales_consignment_stock_reports_tenant",
    })
      .onDelete("restrict")
      .onUpdate("cascade"),
    foreignKey({
      columns: [table.agreementId],
      foreignColumns: [consignmentAgreements.id],
      name: "fk_sales_consignment_stock_reports_agreement",
    })
      .onDelete("cascade")
      .onUpdate("cascade"),
    ...tenantIsolationPolicies("sales_consignment_stock_reports"),
    serviceBypassPolicy("sales_consignment_stock_reports"),
  ]
);

export const consignmentStockReportLines = salesSchema.table(
  "consignment_stock_report_lines",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: integer("tenant_id").notNull(),
    reportId: uuid("report_id").notNull(),
    productId: uuid("product_id").notNull(),
    openingQty: numeric("opening_qty", { precision: 12, scale: 4 }).notNull().default("0"),
    receivedQty: numeric("received_qty", { precision: 12, scale: 4 }).notNull().default("0"),
    soldQty: numeric("sold_qty", { precision: 12, scale: 4 }).notNull().default("0"),
    returnedQty: numeric("returned_qty", { precision: 12, scale: 4 }).notNull().default("0"),
    closingQty: numeric("closing_qty", { precision: 12, scale: 4 }).notNull().default("0"),
    unitPrice: numeric("unit_price", { precision: 14, scale: 2 }).notNull().default("0"),
    lineTotal: numeric("line_total", { precision: 14, scale: 2 }).notNull().default("0"),
    ...timestampColumns,
    ...auditColumns,
  },
  (table) => [
    index("idx_sales_consignment_stock_report_lines_tenant").on(table.tenantId),
    index("idx_sales_consignment_stock_report_lines_report").on(table.tenantId, table.reportId),
    index("idx_sales_consignment_stock_report_lines_product").on(table.tenantId, table.productId),
    uniqueIndex("uq_sales_consignment_stock_report_lines_unique").on(
      table.tenantId,
      table.reportId,
      table.productId
    ),
    check(
      "chk_sales_consignment_stock_report_lines_opening_non_negative",
      sql`${table.openingQty} >= 0`
    ),
    check(
      "chk_sales_consignment_stock_report_lines_received_non_negative",
      sql`${table.receivedQty} >= 0`
    ),
    check("chk_sales_consignment_stock_report_lines_sold_non_negative", sql`${table.soldQty} >= 0`),
    check(
      "chk_sales_consignment_stock_report_lines_returned_non_negative",
      sql`${table.returnedQty} >= 0`
    ),
    check(
      "chk_sales_consignment_stock_report_lines_closing_non_negative",
      sql`${table.closingQty} >= 0`
    ),
    check(
      "chk_sales_consignment_stock_report_lines_unit_price_non_negative",
      sql`${table.unitPrice} >= 0`
    ),
    check(
      "chk_sales_consignment_stock_report_lines_total_non_negative",
      sql`${table.lineTotal} >= 0`
    ),
    check(
      "chk_sales_consignment_stock_report_lines_stock_balance",
      sql`${table.openingQty} + ${table.receivedQty} - ${table.soldQty} - ${table.returnedQty} = ${table.closingQty}`
    ),
    foreignKey({
      columns: [table.tenantId],
      foreignColumns: [tenants.tenantId],
      name: "fk_sales_consignment_stock_report_lines_tenant",
    })
      .onDelete("restrict")
      .onUpdate("cascade"),
    foreignKey({
      columns: [table.reportId],
      foreignColumns: [consignmentStockReports.id],
      name: "fk_sales_consignment_stock_report_lines_report",
    })
      .onDelete("cascade")
      .onUpdate("cascade"),
    foreignKey({
      columns: [table.productId],
      foreignColumns: [products.id],
      name: "fk_sales_consignment_stock_report_lines_product",
    })
      .onDelete("restrict")
      .onUpdate("cascade"),
    ...tenantIsolationPolicies("sales_consignment_stock_report_lines"),
    serviceBypassPolicy("sales_consignment_stock_report_lines"),
  ]
);

export const returnReasonCodes = salesSchema.table(
  "return_reason_codes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: integer("tenant_id").notNull(),
    code: text("code").notNull(),
    ...nameColumn,
    requiresInspection: boolean("requires_inspection").notNull().default(false),
    restockPolicy: restockPolicyEnum("restock_policy").notNull().default("restock"),
    isActive: boolean("is_active").notNull().default(true),
    ...timestampColumns,
    ...softDeleteColumns,
    ...auditColumns,
  },
  (table) => [
    index("idx_sales_return_reason_codes_tenant").on(table.tenantId),
    index("idx_sales_return_reason_codes_active").on(table.tenantId, table.isActive),
    uniqueIndex("uq_sales_return_reason_codes_code")
      .on(table.tenantId, sql`lower(${table.code})`)
      .where(sql`${table.deletedAt} IS NULL`),
    uniqueIndex("uq_sales_return_reason_codes_name")
      .on(table.tenantId, sql`lower(${table.name})`)
      .where(sql`${table.deletedAt} IS NULL`),
    foreignKey({
      columns: [table.tenantId],
      foreignColumns: [tenants.tenantId],
      name: "fk_sales_return_reason_codes_tenant",
    })
      .onDelete("restrict")
      .onUpdate("cascade"),
    ...tenantIsolationPolicies("sales_return_reason_codes"),
    serviceBypassPolicy("sales_return_reason_codes"),
  ]
);

export const returnOrders = salesSchema.table(
  "return_orders",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: integer("tenant_id").notNull(),
    ...nameColumn,
    sourceOrderId: uuid("source_order_id").notNull(),
    partnerId: uuid("partner_id").notNull(),
    status: returnStatusEnum("status").notNull().default("draft"),
    reasonCodeId: uuid("reason_code_id"),
    approvedBy: integer("approved_by"),
    approvedDate: timestamp("approved_date", { withTimezone: true }),
    notes: text("notes"),
    ...timestampColumns,
    ...softDeleteColumns,
    ...auditColumns,
  },
  (table) => [
    index("idx_sales_return_orders_tenant").on(table.tenantId),
    index("idx_sales_return_orders_source_order").on(table.tenantId, table.sourceOrderId),
    index("idx_sales_return_orders_partner").on(table.tenantId, table.partnerId),
    index("idx_sales_return_orders_status").on(table.tenantId, table.status, table.updatedAt),
    index("idx_sales_return_orders_reason").on(table.tenantId, table.reasonCodeId),
    check(
      "chk_sales_return_orders_approved_requires_actor",
      sql`${table.status} <> 'approved' OR (${table.approvedBy} IS NOT NULL AND ${table.approvedDate} IS NOT NULL)`
    ),
    foreignKey({
      columns: [table.tenantId],
      foreignColumns: [tenants.tenantId],
      name: "fk_sales_return_orders_tenant",
    })
      .onDelete("restrict")
      .onUpdate("cascade"),
    foreignKey({
      columns: [table.sourceOrderId],
      foreignColumns: [salesOrders.id],
      name: "fk_sales_return_orders_source_order",
    })
      .onDelete("restrict")
      .onUpdate("cascade"),
    foreignKey({
      columns: [table.partnerId],
      foreignColumns: [partners.id],
      name: "fk_sales_return_orders_partner",
    })
      .onDelete("restrict")
      .onUpdate("cascade"),
    foreignKey({
      columns: [table.reasonCodeId],
      foreignColumns: [returnReasonCodes.id],
      name: "fk_sales_return_orders_reason_code",
    })
      .onDelete("set null")
      .onUpdate("cascade"),
    foreignKey({
      columns: [table.approvedBy],
      foreignColumns: [users.userId],
      name: "fk_sales_return_orders_approved_by",
    })
      .onDelete("set null")
      .onUpdate("cascade"),
    ...tenantIsolationPolicies("sales_return_orders"),
    serviceBypassPolicy("sales_return_orders"),
  ]
);

export const returnOrderLines = salesSchema.table(
  "return_order_lines",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: integer("tenant_id").notNull(),
    returnOrderId: uuid("return_order_id").notNull(),
    sourceLineId: uuid("source_line_id"),
    productId: uuid("product_id").notNull(),
    quantity: numeric("quantity", { precision: 12, scale: 4 }).notNull().default("0"),
    condition: returnConditionEnum("condition").notNull().default("used"),
    unitPrice: numeric("unit_price", { precision: 14, scale: 2 }).notNull().default("0"),
    creditAmount: numeric("credit_amount", { precision: 14, scale: 2 }).notNull().default("0"),
    notes: text("notes"),
    ...timestampColumns,
    ...auditColumns,
  },
  (table) => [
    index("idx_sales_return_order_lines_tenant").on(table.tenantId),
    index("idx_sales_return_order_lines_return_order").on(table.tenantId, table.returnOrderId),
    index("idx_sales_return_order_lines_source_line").on(table.tenantId, table.sourceLineId),
    index("idx_sales_return_order_lines_product").on(table.tenantId, table.productId),
    check("chk_sales_return_order_lines_quantity_positive", sql`${table.quantity} > 0`),
    check("chk_sales_return_order_lines_unit_price_non_negative", sql`${table.unitPrice} >= 0`),
    check("chk_sales_return_order_lines_credit_non_negative", sql`${table.creditAmount} >= 0`),
    foreignKey({
      columns: [table.tenantId],
      foreignColumns: [tenants.tenantId],
      name: "fk_sales_return_order_lines_tenant",
    })
      .onDelete("restrict")
      .onUpdate("cascade"),
    foreignKey({
      columns: [table.returnOrderId],
      foreignColumns: [returnOrders.id],
      name: "fk_sales_return_order_lines_return_order",
    })
      .onDelete("cascade")
      .onUpdate("cascade"),
    foreignKey({
      columns: [table.sourceLineId],
      foreignColumns: [salesOrderLines.id],
      name: "fk_sales_return_order_lines_source_line",
    })
      .onDelete("set null")
      .onUpdate("cascade"),
    foreignKey({
      columns: [table.productId],
      foreignColumns: [products.id],
      name: "fk_sales_return_order_lines_product",
    })
      .onDelete("restrict")
      .onUpdate("cascade"),
    ...tenantIsolationPolicies("sales_return_order_lines"),
    serviceBypassPolicy("sales_return_order_lines"),
  ]
);

export const subscriptionCloseReasons = salesSchema.table(
  "subscription_close_reasons",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: integer("tenant_id").notNull(),
    code: text("code").notNull(),
    ...nameColumn,
    isChurn: boolean("is_churn").notNull().default(true),
    isActive: boolean("is_active").notNull().default(true),
    ...timestampColumns,
    ...softDeleteColumns,
    ...auditColumns,
  },
  (table) => [
    index("idx_sales_subscription_close_reasons_tenant").on(table.tenantId),
    index("idx_sales_subscription_close_reasons_churn").on(table.tenantId, table.isChurn),
    uniqueIndex("uq_sales_subscription_close_reasons_code")
      .on(table.tenantId, sql`lower(${table.code})`)
      .where(sql`${table.deletedAt} IS NULL`),
    uniqueIndex("uq_sales_subscription_close_reasons_name")
      .on(table.tenantId, sql`lower(${table.name})`)
      .where(sql`${table.deletedAt} IS NULL`),
    foreignKey({
      columns: [table.tenantId],
      foreignColumns: [tenants.tenantId],
      name: "fk_sales_subscription_close_reasons_tenant",
    })
      .onDelete("restrict")
      .onUpdate("cascade"),
    ...tenantIsolationPolicies("sales_subscription_close_reasons"),
    serviceBypassPolicy("sales_subscription_close_reasons"),
  ]
);

export const subscriptionTemplates = salesSchema.table(
  "subscription_templates",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: integer("tenant_id").notNull(),
    ...nameColumn,
    billingPeriod: subscriptionBillingPeriodEnum("billing_period").notNull().default("monthly"),
    billingDay: integer("billing_day").notNull().default(1),
    autoRenew: boolean("auto_renew").notNull().default(true),
    renewalPeriod: integer("renewal_period").notNull().default(1),
    paymentTermId: uuid("payment_term_id"),
    pricelistId: uuid("pricelist_id"),
    notes: text("notes"),
    isActive: boolean("is_active").notNull().default(true),
    ...timestampColumns,
    ...softDeleteColumns,
    ...auditColumns,
  },
  (table) => [
    index("idx_sales_subscription_templates_tenant").on(table.tenantId),
    index("idx_sales_subscription_templates_active").on(table.tenantId, table.isActive),
    index("idx_sales_subscription_templates_payment_term").on(table.tenantId, table.paymentTermId),
    index("idx_sales_subscription_templates_pricelist").on(table.tenantId, table.pricelistId),
    uniqueIndex("uq_sales_subscription_templates_name")
      .on(table.tenantId, sql`lower(${table.name})`)
      .where(sql`${table.deletedAt} IS NULL`),
    check(
      "chk_sales_subscription_templates_billing_day_range",
      sql`${table.billingDay} BETWEEN 1 AND 31`
    ),
    check(
      "chk_sales_subscription_templates_renewal_period_positive",
      sql`${table.renewalPeriod} > 0`
    ),
    foreignKey({
      columns: [table.tenantId],
      foreignColumns: [tenants.tenantId],
      name: "fk_sales_subscription_templates_tenant",
    })
      .onDelete("restrict")
      .onUpdate("cascade"),
    foreignKey({
      columns: [table.paymentTermId],
      foreignColumns: [paymentTerms.id],
      name: "fk_sales_subscription_templates_payment_term",
    })
      .onDelete("set null")
      .onUpdate("cascade"),
    foreignKey({
      columns: [table.pricelistId],
      foreignColumns: [pricelists.id],
      name: "fk_sales_subscription_templates_pricelist",
    })
      .onDelete("set null")
      .onUpdate("cascade"),
    ...tenantIsolationPolicies("sales_subscription_templates"),
    serviceBypassPolicy("sales_subscription_templates"),
  ]
);

export const subscriptions = salesSchema.table(
  "subscriptions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: integer("tenant_id").notNull(),
    ...nameColumn,
    partnerId: uuid("partner_id").notNull(),
    templateId: uuid("template_id").notNull(),
    status: subscriptionStatusEnum("status").notNull().default("draft"),
    dateStart: timestamp("date_start", { withTimezone: true }).notNull(),
    dateEnd: timestamp("date_end", { withTimezone: true }),
    nextInvoiceDate: timestamp("next_invoice_date", { withTimezone: true }).notNull(),
    recurringTotal: numeric("recurring_total", { precision: 14, scale: 2 }).notNull().default("0"),
    mrr: numeric("mrr", { precision: 14, scale: 2 }).notNull().default("0"),
    arr: numeric("arr", { precision: 14, scale: 2 }).notNull().default("0"),
    closeReasonId: uuid("close_reason_id"),
    lastInvoicedAt: timestamp("last_invoiced_at", { withTimezone: true }),
    notes: text("notes"),
    ...timestampColumns,
    ...softDeleteColumns,
    ...auditColumns,
  },
  (table) => [
    index("idx_sales_subscriptions_tenant").on(table.tenantId),
    index("idx_sales_subscriptions_partner").on(table.tenantId, table.partnerId),
    index("idx_sales_subscriptions_template").on(table.tenantId, table.templateId),
    index("idx_sales_subscriptions_status").on(table.tenantId, table.status, table.nextInvoiceDate),
    index("idx_sales_subscriptions_close_reason").on(table.tenantId, table.closeReasonId),
    uniqueIndex("uq_sales_subscriptions_name")
      .on(table.tenantId, sql`lower(${table.name})`)
      .where(sql`${table.deletedAt} IS NULL`),
    check(
      "chk_sales_subscriptions_end_after_start",
      sql`${table.dateEnd} IS NULL OR ${table.dateEnd} >= ${table.dateStart}`
    ),
    check(
      "chk_sales_subscriptions_recurring_total_non_negative",
      sql`${table.recurringTotal} >= 0`
    ),
    check("chk_sales_subscriptions_mrr_non_negative", sql`${table.mrr} >= 0`),
    check("chk_sales_subscriptions_arr_non_negative", sql`${table.arr} >= 0`),
    check("chk_sales_subscriptions_arr_consistency", sql`${table.arr} = ${table.mrr} * 12`),
    check(
      "chk_sales_subscriptions_closed_requires_end_date",
      sql`${table.status} NOT IN ('cancelled', 'expired') OR ${table.dateEnd} IS NOT NULL`
    ),
    foreignKey({
      columns: [table.tenantId],
      foreignColumns: [tenants.tenantId],
      name: "fk_sales_subscriptions_tenant",
    })
      .onDelete("restrict")
      .onUpdate("cascade"),
    foreignKey({
      columns: [table.partnerId],
      foreignColumns: [partners.id],
      name: "fk_sales_subscriptions_partner",
    })
      .onDelete("restrict")
      .onUpdate("cascade"),
    foreignKey({
      columns: [table.templateId],
      foreignColumns: [subscriptionTemplates.id],
      name: "fk_sales_subscriptions_template",
    })
      .onDelete("restrict")
      .onUpdate("cascade"),
    foreignKey({
      columns: [table.closeReasonId],
      foreignColumns: [subscriptionCloseReasons.id],
      name: "fk_sales_subscriptions_close_reason",
    })
      .onDelete("set null")
      .onUpdate("cascade"),
    ...tenantIsolationPolicies("sales_subscriptions"),
    serviceBypassPolicy("sales_subscriptions"),
  ]
);

export const subscriptionLines = salesSchema.table(
  "subscription_lines",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: integer("tenant_id").notNull(),
    subscriptionId: uuid("subscription_id").notNull(),
    productId: uuid("product_id").notNull(),
    uomId: integer("uom_id").notNull(),
    quantity: numeric("quantity", { precision: 12, scale: 4 }).notNull().default("1"),
    priceUnit: numeric("price_unit", { precision: 14, scale: 2 }).notNull().default("0"),
    discount: numeric("discount", { precision: 5, scale: 2 }).notNull().default("0"),
    subtotal: numeric("subtotal", { precision: 14, scale: 2 }).notNull().default("0"),
    sequence: integer("sequence").notNull().default(10),
    ...timestampColumns,
    ...auditColumns,
  },
  (table) => [
    index("idx_sales_subscription_lines_tenant").on(table.tenantId),
    index("idx_sales_subscription_lines_subscription").on(table.tenantId, table.subscriptionId),
    index("idx_sales_subscription_lines_product").on(table.tenantId, table.productId),
    index("idx_sales_subscription_lines_uom").on(table.tenantId, table.uomId),
    uniqueIndex("uq_sales_subscription_lines_sequence").on(
      table.tenantId,
      table.subscriptionId,
      table.sequence
    ),
    check("chk_sales_subscription_lines_quantity_positive", sql`${table.quantity} > 0`),
    check("chk_sales_subscription_lines_price_non_negative", sql`${table.priceUnit} >= 0`),
    check(
      "chk_sales_subscription_lines_discount_percentage",
      sql`${table.discount} >= 0 AND ${table.discount} <= 100`
    ),
    check("chk_sales_subscription_lines_subtotal_non_negative", sql`${table.subtotal} >= 0`),
    check("chk_sales_subscription_lines_sequence_non_negative", sql`${table.sequence} >= 0`),
    check(
      "chk_sales_subscription_lines_subtotal_formula",
      sql`${table.subtotal} = round(${table.quantity} * ${table.priceUnit} * (1 - ${table.discount} / 100.0), 2)`
    ),
    foreignKey({
      columns: [table.tenantId],
      foreignColumns: [tenants.tenantId],
      name: "fk_sales_subscription_lines_tenant",
    })
      .onDelete("restrict")
      .onUpdate("cascade"),
    foreignKey({
      columns: [table.subscriptionId],
      foreignColumns: [subscriptions.id],
      name: "fk_sales_subscription_lines_subscription",
    })
      .onDelete("cascade")
      .onUpdate("cascade"),
    foreignKey({
      columns: [table.productId],
      foreignColumns: [products.id],
      name: "fk_sales_subscription_lines_product",
    })
      .onDelete("restrict")
      .onUpdate("cascade"),
    foreignKey({
      columns: [table.uomId],
      foreignColumns: [unitsOfMeasure.uomId],
      name: "fk_sales_subscription_lines_uom",
    })
      .onDelete("restrict")
      .onUpdate("cascade"),
    ...tenantIsolationPolicies("sales_subscription_lines"),
    serviceBypassPolicy("sales_subscription_lines"),
  ]
);

export const subscriptionLogs = salesSchema.table(
  "subscription_logs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: integer("tenant_id").notNull(),
    subscriptionId: uuid("subscription_id").notNull(),
    eventType: subscriptionLogEventTypeEnum("event_type").notNull().default("created"),
    oldMrr: numeric("old_mrr", { precision: 14, scale: 2 }).notNull().default("0"),
    newMrr: numeric("new_mrr", { precision: 14, scale: 2 }).notNull().default("0"),
    changeReason: text("change_reason"),
    eventAt: timestamp("event_at", { withTimezone: true }).notNull().defaultNow(),
    actorId: integer("actor_id"),
    ...timestampColumns,
    ...auditColumns,
  },
  (table) => [
    index("idx_sales_subscription_logs_tenant").on(table.tenantId),
    index("idx_sales_subscription_logs_subscription").on(table.tenantId, table.subscriptionId),
    index("idx_sales_subscription_logs_event").on(table.tenantId, table.eventType, table.eventAt),
    check("chk_sales_subscription_logs_old_mrr_non_negative", sql`${table.oldMrr} >= 0`),
    check("chk_sales_subscription_logs_new_mrr_non_negative", sql`${table.newMrr} >= 0`),
    foreignKey({
      columns: [table.tenantId],
      foreignColumns: [tenants.tenantId],
      name: "fk_sales_subscription_logs_tenant",
    })
      .onDelete("restrict")
      .onUpdate("cascade"),
    foreignKey({
      columns: [table.subscriptionId],
      foreignColumns: [subscriptions.id],
      name: "fk_sales_subscription_logs_subscription",
    })
      .onDelete("cascade")
      .onUpdate("cascade"),
    foreignKey({
      columns: [table.actorId],
      foreignColumns: [users.userId],
      name: "fk_sales_subscription_logs_actor",
    })
      .onDelete("set null")
      .onUpdate("cascade"),
    ...tenantIsolationPolicies("sales_subscription_logs"),
    serviceBypassPolicy("sales_subscription_logs"),
  ]
);

export const salesTeams = salesSchema.table(
  "sales_teams",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: integer("tenant_id").notNull(),
    ...nameColumn,
    code: text("code").notNull(),
    managerId: integer("manager_id"),
    isActive: boolean("is_active").notNull().default(true),
    notes: text("notes"),
    ...timestampColumns,
    ...softDeleteColumns,
    ...auditColumns,
  },
  (table) => [
    index("idx_sales_sales_teams_tenant").on(table.tenantId),
    index("idx_sales_sales_teams_manager").on(table.tenantId, table.managerId),
    index("idx_sales_sales_teams_active").on(table.tenantId, table.isActive),
    uniqueIndex("uq_sales_sales_teams_code")
      .on(table.tenantId, sql`lower(${table.code})`)
      .where(sql`${table.deletedAt} IS NULL`),
    uniqueIndex("uq_sales_sales_teams_name")
      .on(table.tenantId, sql`lower(${table.name})`)
      .where(sql`${table.deletedAt} IS NULL`),
    foreignKey({
      columns: [table.tenantId],
      foreignColumns: [tenants.tenantId],
      name: "fk_sales_sales_teams_tenant",
    })
      .onDelete("restrict")
      .onUpdate("cascade"),
    foreignKey({
      columns: [table.managerId],
      foreignColumns: [users.userId],
      name: "fk_sales_sales_teams_manager",
    })
      .onDelete("set null")
      .onUpdate("cascade"),
    ...tenantIsolationPolicies("sales_sales_teams"),
    serviceBypassPolicy("sales_sales_teams"),
  ]
);

export const salesTeamMembers = salesSchema.table(
  "sales_team_members",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: integer("tenant_id").notNull(),
    teamId: uuid("team_id").notNull(),
    userId: integer("user_id").notNull(),
    role: text("role").notNull().default("member"),
    isLeader: boolean("is_leader").notNull().default(false),
    startDate: timestamp("start_date", { withTimezone: true }).defaultNow().notNull(),
    endDate: timestamp("end_date", { withTimezone: true }),
    isActive: boolean("is_active").notNull().default(true),
    ...timestampColumns,
    ...softDeleteColumns,
    ...auditColumns,
  },
  (table) => [
    index("idx_sales_sales_team_members_tenant").on(table.tenantId),
    index("idx_sales_sales_team_members_team").on(table.tenantId, table.teamId),
    index("idx_sales_sales_team_members_user").on(table.tenantId, table.userId),
    uniqueIndex("uq_sales_sales_team_members_unique")
      .on(table.tenantId, table.teamId, table.userId)
      .where(sql`${table.deletedAt} IS NULL`),
    check(
      "chk_sales_sales_team_members_end_after_start",
      sql`${table.endDate} IS NULL OR ${table.endDate} >= ${table.startDate}`
    ),
    foreignKey({
      columns: [table.tenantId],
      foreignColumns: [tenants.tenantId],
      name: "fk_sales_sales_team_members_tenant",
    })
      .onDelete("restrict")
      .onUpdate("cascade"),
    foreignKey({
      columns: [table.teamId],
      foreignColumns: [salesTeams.id],
      name: "fk_sales_sales_team_members_team",
    })
      .onDelete("cascade")
      .onUpdate("cascade"),
    foreignKey({
      columns: [table.userId],
      foreignColumns: [users.userId],
      name: "fk_sales_sales_team_members_user",
    })
      .onDelete("restrict")
      .onUpdate("cascade"),
    ...tenantIsolationPolicies("sales_sales_team_members"),
    serviceBypassPolicy("sales_sales_team_members"),
  ]
);

export const territories = salesSchema.table(
  "territories",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: integer("tenant_id").notNull(),
    ...nameColumn,
    code: text("code").notNull(),
    parentId: uuid("parent_id"),
    defaultSalespersonId: integer("default_salesperson_id"),
    teamId: uuid("team_id"),
    isActive: boolean("is_active").notNull().default(true),
    notes: text("notes"),
    ...timestampColumns,
    ...softDeleteColumns,
    ...auditColumns,
  },
  (table) => [
    index("idx_sales_territories_tenant").on(table.tenantId),
    index("idx_sales_territories_parent").on(table.tenantId, table.parentId),
    index("idx_sales_territories_team").on(table.tenantId, table.teamId),
    index("idx_sales_territories_salesperson").on(table.tenantId, table.defaultSalespersonId),
    uniqueIndex("uq_sales_territories_code")
      .on(table.tenantId, sql`lower(${table.code})`)
      .where(sql`${table.deletedAt} IS NULL`),
    uniqueIndex("uq_sales_territories_name")
      .on(table.tenantId, sql`lower(${table.name})`)
      .where(sql`${table.deletedAt} IS NULL`),
    foreignKey({
      columns: [table.tenantId],
      foreignColumns: [tenants.tenantId],
      name: "fk_sales_territories_tenant",
    })
      .onDelete("restrict")
      .onUpdate("cascade"),
    foreignKey({
      columns: [table.parentId],
      foreignColumns: [table.id],
      name: "fk_sales_territories_parent",
    })
      .onDelete("set null")
      .onUpdate("cascade"),
    foreignKey({
      columns: [table.defaultSalespersonId],
      foreignColumns: [users.userId],
      name: "fk_sales_territories_default_salesperson",
    })
      .onDelete("set null")
      .onUpdate("cascade"),
    foreignKey({
      columns: [table.teamId],
      foreignColumns: [salesTeams.id],
      name: "fk_sales_territories_team",
    })
      .onDelete("set null")
      .onUpdate("cascade"),
    ...tenantIsolationPolicies("sales_territories"),
    serviceBypassPolicy("sales_territories"),
  ]
);

export const territoryRules = salesSchema.table(
  "territory_rules",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: integer("tenant_id").notNull(),
    territoryId: uuid("territory_id").notNull(),
    countryId: integer("country_id"),
    stateId: integer("state_id"),
    zipFrom: text("zip_from"),
    zipTo: text("zip_to"),
    priority: integer("priority").notNull().default(10),
    isActive: boolean("is_active").notNull().default(true),
    ...timestampColumns,
    ...softDeleteColumns,
    ...auditColumns,
  },
  (table) => [
    index("idx_sales_territory_rules_tenant").on(table.tenantId),
    index("idx_sales_territory_rules_territory").on(table.tenantId, table.territoryId),
    index("idx_sales_territory_rules_geo").on(table.tenantId, table.countryId, table.stateId),
    index("idx_sales_territory_rules_priority").on(table.tenantId, table.priority),
    check("chk_sales_territory_rules_priority_non_negative", sql`${table.priority} >= 0`),
    check(
      "chk_sales_territory_rules_zip_range",
      sql`${table.zipTo} IS NULL OR ${table.zipFrom} IS NULL OR ${table.zipTo} >= ${table.zipFrom}`
    ),
    foreignKey({
      columns: [table.tenantId],
      foreignColumns: [tenants.tenantId],
      name: "fk_sales_territory_rules_tenant",
    })
      .onDelete("restrict")
      .onUpdate("cascade"),
    foreignKey({
      columns: [table.territoryId],
      foreignColumns: [territories.id],
      name: "fk_sales_territory_rules_territory",
    })
      .onDelete("cascade")
      .onUpdate("cascade"),
    foreignKey({
      columns: [table.countryId],
      foreignColumns: [countries.countryId],
      name: "fk_sales_territory_rules_country",
    })
      .onDelete("set null")
      .onUpdate("cascade"),
    foreignKey({
      columns: [table.stateId],
      foreignColumns: [states.stateId],
      name: "fk_sales_territory_rules_state",
    })
      .onDelete("set null")
      .onUpdate("cascade"),
    ...tenantIsolationPolicies("sales_territory_rules"),
    serviceBypassPolicy("sales_territory_rules"),
  ]
);

export const commissionPlans = salesSchema.table(
  "commission_plans",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: integer("tenant_id").notNull(),
    ...nameColumn,
    type: commissionTypeEnum("type").notNull().default("percentage"),
    base: commissionBaseEnum("base").notNull().default("revenue"),
    isActive: boolean("is_active").notNull().default(true),
    notes: text("notes"),
    ...timestampColumns,
    ...softDeleteColumns,
    ...auditColumns,
  },
  (table) => [
    index("idx_sales_commission_plans_tenant").on(table.tenantId),
    index("idx_sales_commission_plans_active").on(table.tenantId, table.isActive),
    index("idx_sales_commission_plans_type_base").on(table.tenantId, table.type, table.base),
    uniqueIndex("uq_sales_commission_plans_name")
      .on(table.tenantId, sql`lower(${table.name})`)
      .where(sql`${table.deletedAt} IS NULL`),
    foreignKey({
      columns: [table.tenantId],
      foreignColumns: [tenants.tenantId],
      name: "fk_sales_commission_plans_tenant",
    })
      .onDelete("restrict")
      .onUpdate("cascade"),
    ...tenantIsolationPolicies("sales_commission_plans"),
    serviceBypassPolicy("sales_commission_plans"),
  ]
);

export const commissionPlanTiers = salesSchema.table(
  "commission_plan_tiers",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: integer("tenant_id").notNull(),
    planId: uuid("plan_id").notNull(),
    minAmount: numeric("min_amount", { precision: 14, scale: 2 }).notNull().default("0"),
    maxAmount: numeric("max_amount", { precision: 14, scale: 2 }),
    rate: numeric("rate", { precision: 9, scale: 4 }).notNull().default("0"),
    sequence: integer("sequence").notNull().default(10),
    ...timestampColumns,
    ...auditColumns,
  },
  (table) => [
    index("idx_sales_commission_plan_tiers_tenant").on(table.tenantId),
    index("idx_sales_commission_plan_tiers_plan").on(table.tenantId, table.planId, table.sequence),
    uniqueIndex("uq_sales_commission_plan_tiers_sequence").on(
      table.tenantId,
      table.planId,
      table.sequence
    ),
    check("chk_sales_commission_plan_tiers_min_non_negative", sql`${table.minAmount} >= 0`),
    check(
      "chk_sales_commission_plan_tiers_max_after_min",
      sql`${table.maxAmount} IS NULL OR ${table.maxAmount} >= ${table.minAmount}`
    ),
    check(
      "chk_sales_commission_plan_tiers_rate_percentage",
      sql`${table.rate} >= 0 AND ${table.rate} <= 100`
    ),
    check("chk_sales_commission_plan_tiers_sequence_non_negative", sql`${table.sequence} >= 0`),
    foreignKey({
      columns: [table.tenantId],
      foreignColumns: [tenants.tenantId],
      name: "fk_sales_commission_plan_tiers_tenant",
    })
      .onDelete("restrict")
      .onUpdate("cascade"),
    foreignKey({
      columns: [table.planId],
      foreignColumns: [commissionPlans.id],
      name: "fk_sales_commission_plan_tiers_plan",
    })
      .onDelete("cascade")
      .onUpdate("cascade"),
    ...tenantIsolationPolicies("sales_commission_plan_tiers"),
    serviceBypassPolicy("sales_commission_plan_tiers"),
  ]
);

export const commissionEntries = salesSchema.table(
  "commission_entries",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: integer("tenant_id").notNull(),
    orderId: uuid("order_id").notNull(),
    salespersonId: integer("salesperson_id").notNull(),
    planId: uuid("plan_id").notNull(),
    baseAmount: numeric("base_amount", { precision: 14, scale: 2 }).notNull().default("0"),
    commissionAmount: numeric("commission_amount", { precision: 14, scale: 2 })
      .notNull()
      .default("0"),
    status: commissionEntryStatusEnum("status").notNull().default("draft"),
    paidDate: timestamp("paid_date", { withTimezone: true }),
    periodStart: timestamp("period_start", { withTimezone: true }).notNull(),
    periodEnd: timestamp("period_end", { withTimezone: true }).notNull(),
    notes: text("notes"),
    ...timestampColumns,
    ...softDeleteColumns,
    ...auditColumns,
  },
  (table) => [
    index("idx_sales_commission_entries_tenant").on(table.tenantId),
    index("idx_sales_commission_entries_order").on(table.tenantId, table.orderId),
    index("idx_sales_commission_entries_salesperson").on(table.tenantId, table.salespersonId),
    index("idx_sales_commission_entries_plan").on(table.tenantId, table.planId),
    index("idx_sales_commission_entries_status_period").on(
      table.tenantId,
      table.status,
      table.periodStart
    ),
    check("chk_sales_commission_entries_base_non_negative", sql`${table.baseAmount} >= 0`),
    check("chk_sales_commission_entries_amount_non_negative", sql`${table.commissionAmount} >= 0`),
    check(
      "chk_sales_commission_entries_period_order",
      sql`${table.periodEnd} >= ${table.periodStart}`
    ),
    check(
      "chk_sales_commission_entries_paid_requires_date",
      sql`${table.status} <> 'paid' OR ${table.paidDate} IS NOT NULL`
    ),
    foreignKey({
      columns: [table.tenantId],
      foreignColumns: [tenants.tenantId],
      name: "fk_sales_commission_entries_tenant",
    })
      .onDelete("restrict")
      .onUpdate("cascade"),
    foreignKey({
      columns: [table.orderId],
      foreignColumns: [salesOrders.id],
      name: "fk_sales_commission_entries_order",
    })
      .onDelete("restrict")
      .onUpdate("cascade"),
    foreignKey({
      columns: [table.salespersonId],
      foreignColumns: [users.userId],
      name: "fk_sales_commission_entries_salesperson",
    })
      .onDelete("restrict")
      .onUpdate("cascade"),
    foreignKey({
      columns: [table.planId],
      foreignColumns: [commissionPlans.id],
      name: "fk_sales_commission_entries_plan",
    })
      .onDelete("restrict")
      .onUpdate("cascade"),
    ...tenantIsolationPolicies("sales_commission_entries"),
    serviceBypassPolicy("sales_commission_entries"),
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
    evaluatedAt: timestamp("evaluated_at", { withTimezone: true }).notNull().defaultNow(),
    ...auditColumns,
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
    payload: text("payload"),
    triggeredBy: integer("triggered_by"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    ...auditColumns,
  },
  (table) => [
    index("idx_sales_domain_event_logs_tenant").on(table.tenantId),
    index("idx_sales_domain_event_logs_entity").on(
      table.tenantId,
      table.entityType,
      table.entityId,
      table.createdAt
    ),
    index("idx_sales_domain_event_logs_type").on(
      table.tenantId,
      table.eventType,
      table.createdAt
    ),
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
    ...tenantIsolationPolicies("sales_domain_event_logs"),
    serviceBypassPolicy("sales_domain_event_logs"),
  ]
);

export const partnerSelectSchema = createSelectSchema(partners);
export const partnerAddressSelectSchema = createSelectSchema(partnerAddresses);
export const partnerBankAccountSelectSchema = createSelectSchema(partnerBankAccounts);
export const partnerTagSelectSchema = createSelectSchema(partnerTags);
export const partnerTagAssignmentSelectSchema = createSelectSchema(partnerTagAssignments);
export const productCategorySelectSchema = createSelectSchema(productCategories);
export const productSelectSchema = createSelectSchema(products);
export const productTemplateSelectSchema = createSelectSchema(productTemplates);
export const productAttributeSelectSchema = createSelectSchema(productAttributes);
export const productAttributeValueSelectSchema = createSelectSchema(productAttributeValues);
export const productTemplateAttributeLineSelectSchema = createSelectSchema(
  productTemplateAttributeLines
);
export const productTemplateAttributeValueSelectSchema = createSelectSchema(
  productTemplateAttributeValues
);
export const productVariantSelectSchema = createSelectSchema(productVariants);
export const productPackagingSelectSchema = createSelectSchema(productPackaging);
export const salesOrderSelectSchema = createSelectSchema(salesOrders);
export const salesOrderLineSelectSchema = createSelectSchema(salesOrderLines);
export const paymentTermSelectSchema = createSelectSchema(paymentTerms);
export const paymentTermLineSelectSchema = createSelectSchema(paymentTermLines);
export const pricelistSelectSchema = createSelectSchema(pricelists);
export const pricelistItemSelectSchema = createSelectSchema(pricelistItems);
export const taxGroupSelectSchema = createSelectSchema(taxGroups);
export const taxRateSelectSchema = createSelectSchema(taxRates);
export const taxRateChildSelectSchema = createSelectSchema(taxRateChildren);
export const fiscalPositionSelectSchema = createSelectSchema(fiscalPositions);
export const fiscalPositionTaxMapSelectSchema = createSelectSchema(fiscalPositionTaxMaps);
export const fiscalPositionAccountMapSelectSchema = createSelectSchema(fiscalPositionAccountMaps);
export const saleOrderLineTaxSelectSchema = createSelectSchema(saleOrderLineTaxes);
export const saleOrderOptionLineSelectSchema = createSelectSchema(saleOrderOptionLines);
export const saleOrderStatusHistorySelectSchema = createSelectSchema(saleOrderStatusHistory);
export const saleOrderTaxSummarySelectSchema = createSelectSchema(saleOrderTaxSummary);
export const consignmentAgreementSelectSchema = createSelectSchema(consignmentAgreements);
export const consignmentAgreementLineSelectSchema = createSelectSchema(consignmentAgreementLines);
export const consignmentStockReportSelectSchema = createSelectSchema(consignmentStockReports);
export const consignmentStockReportLineSelectSchema = createSelectSchema(
  consignmentStockReportLines
);
export const returnReasonCodeSelectSchema = createSelectSchema(returnReasonCodes);
export const returnOrderSelectSchema = createSelectSchema(returnOrders);
export const returnOrderLineSelectSchema = createSelectSchema(returnOrderLines);
export const subscriptionTemplateSelectSchema = createSelectSchema(subscriptionTemplates);
export const subscriptionSelectSchema = createSelectSchema(subscriptions);
export const subscriptionLineSelectSchema = createSelectSchema(subscriptionLines);
export const subscriptionLogSelectSchema = createSelectSchema(subscriptionLogs);
export const subscriptionCloseReasonSelectSchema = createSelectSchema(subscriptionCloseReasons);
export const salesTeamSelectSchema = createSelectSchema(salesTeams);
export const salesTeamMemberSelectSchema = createSelectSchema(salesTeamMembers);
export const territorySelectSchema = createSelectSchema(territories);
export const territoryRuleSelectSchema = createSelectSchema(territoryRules);
export const commissionPlanSelectSchema = createSelectSchema(commissionPlans);
export const commissionPlanTierSelectSchema = createSelectSchema(commissionPlanTiers);
export const commissionEntrySelectSchema = createSelectSchema(commissionEntries);
export const domainInvariantLogSelectSchema = createSelectSchema(domainInvariantLogs);
export const domainEventLogSelectSchema = createSelectSchema(domainEventLogs);

export const partnerInsertSchema = createInsertSchema(partners, {
  id: PartnerIdSchema.optional(),
  tenantId: z.number().int().positive(),
  name: z.string().min(1).max(200),
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
export const returnReasonCodeInsertSchema = createInsertSchema(returnReasonCodes, {
  id: ReturnReasonCodeIdSchema.optional(),
  tenantId: z.number().int().positive(),
  code: z.string().min(1).max(80),
  name: z.string().min(1).max(200),
  requiresInspection: z.boolean().optional(),
  restockPolicy: RestockPolicySchema.optional(),
  isActive: z.boolean().optional(),
  createdBy: z.number().int().positive(),
  updatedBy: z.number().int().positive(),
});

export const returnOrderInsertSchema = createInsertSchema(returnOrders, {
  id: ReturnOrderIdSchema.optional(),
  tenantId: z.number().int().positive(),
  name: z.string().min(1).max(200),
  sourceOrderId: SalesOrderIdSchema,
  partnerId: PartnerIdSchema,
  status: ReturnStatusSchema.optional(),
  reasonCodeId: ReturnReasonCodeIdSchema.optional().nullable(),
  approvedBy: z.number().int().positive().optional().nullable(),
  approvedDate: z.coerce.date().optional().nullable(),
  notes: z.string().max(4000).optional().nullable(),
  createdBy: z.number().int().positive(),
  updatedBy: z.number().int().positive(),
});

export const returnOrderLineInsertSchema = createInsertSchema(returnOrderLines, {
  id: ReturnOrderLineIdSchema.optional(),
  tenantId: z.number().int().positive(),
  returnOrderId: ReturnOrderIdSchema,
  sourceLineId: SalesOrderLineIdSchema.optional().nullable(),
  productId: ProductIdSchema,
  quantity: quantityStringSchema,
  condition: ReturnConditionSchema.optional(),
  unitPrice: positiveMoneyStringSchema.optional(),
  creditAmount: positiveMoneyStringSchema.optional(),
  notes: z.string().max(2000).optional().nullable(),
  createdBy: z.number().int().positive(),
  updatedBy: z.number().int().positive(),
});

export const subscriptionTemplateInsertSchema = createInsertSchema(subscriptionTemplates, {
  id: SubscriptionTemplateIdSchema.optional(),
  tenantId: z.number().int().positive(),
  name: z.string().min(1).max(200),
  billingPeriod: SubscriptionBillingPeriodSchema.optional(),
  billingDay: z.number().int().min(1).max(31).optional(),
  autoRenew: z.boolean().optional(),
  renewalPeriod: z.number().int().positive().optional(),
  paymentTermId: PaymentTermIdSchema.optional().nullable(),
  pricelistId: PricelistIdSchema.optional().nullable(),
  notes: z.string().max(4000).optional().nullable(),
  isActive: z.boolean().optional(),
  createdBy: z.number().int().positive(),
  updatedBy: z.number().int().positive(),
});

export const subscriptionCloseReasonInsertSchema = createInsertSchema(subscriptionCloseReasons, {
  id: SubscriptionCloseReasonIdSchema.optional(),
  tenantId: z.number().int().positive(),
  code: z.string().min(1).max(80),
  name: z.string().min(1).max(200),
  isChurn: z.boolean().optional(),
  isActive: z.boolean().optional(),
  createdBy: z.number().int().positive(),
  updatedBy: z.number().int().positive(),
});

export const subscriptionInsertSchema = createInsertSchema(subscriptions, {
  id: SubscriptionIdSchema.optional(),
  tenantId: z.number().int().positive(),
  name: z.string().min(1).max(200),
  partnerId: PartnerIdSchema,
  templateId: SubscriptionTemplateIdSchema,
  status: SubscriptionStatusSchema.optional(),
  dateStart: z.coerce.date(),
  dateEnd: z.coerce.date().optional().nullable(),
  nextInvoiceDate: z.coerce.date(),
  recurringTotal: positiveMoneyStringSchema.optional(),
  mrr: positiveMoneyStringSchema.optional(),
  arr: positiveMoneyStringSchema.optional(),
  closeReasonId: SubscriptionCloseReasonIdSchema.optional().nullable(),
  lastInvoicedAt: z.coerce.date().optional().nullable(),
  notes: z.string().max(4000).optional().nullable(),
  createdBy: z.number().int().positive(),
  updatedBy: z.number().int().positive(),
});

export const subscriptionLineInsertSchema = createInsertSchema(subscriptionLines, {
  id: SubscriptionLineIdSchema.optional(),
  tenantId: z.number().int().positive(),
  subscriptionId: SubscriptionIdSchema,
  productId: ProductIdSchema,
  uomId: z.number().int().positive(),
  quantity: quantityStringSchema.optional(),
  priceUnit: positiveMoneyStringSchema.optional(),
  discount: discountStringSchema.optional(),
  subtotal: positiveMoneyStringSchema.optional(),
  sequence: z.number().int().min(0).optional(),
  createdBy: z.number().int().positive(),
  updatedBy: z.number().int().positive(),
});

export const subscriptionLogInsertSchema = createInsertSchema(subscriptionLogs, {
  id: SubscriptionLogIdSchema.optional(),
  tenantId: z.number().int().positive(),
  subscriptionId: SubscriptionIdSchema,
  eventType: SubscriptionLogEventTypeSchema.optional(),
  oldMrr: positiveMoneyStringSchema.optional(),
  newMrr: positiveMoneyStringSchema.optional(),
  changeReason: z.string().max(2000).optional().nullable(),
  eventAt: z.coerce.date().optional(),
  actorId: z.number().int().positive().optional().nullable(),
  createdBy: z.number().int().positive(),
  updatedBy: z.number().int().positive(),
});

export const salesTeamInsertSchema = createInsertSchema(salesTeams, {
  id: SalesTeamIdSchema.optional(),
  tenantId: z.number().int().positive(),
  name: z.string().min(1).max(200),
  code: z.string().min(1).max(80),
  managerId: z.number().int().positive().optional().nullable(),
  isActive: z.boolean().optional(),
  notes: z.string().max(4000).optional().nullable(),
  createdBy: z.number().int().positive(),
  updatedBy: z.number().int().positive(),
});

export const salesTeamMemberInsertSchema = createInsertSchema(salesTeamMembers, {
  id: SalesTeamMemberIdSchema.optional(),
  tenantId: z.number().int().positive(),
  teamId: SalesTeamIdSchema,
  userId: z.number().int().positive(),
  role: z.string().min(1).max(80).optional(),
  isLeader: z.boolean().optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional().nullable(),
  isActive: z.boolean().optional(),
  createdBy: z.number().int().positive(),
  updatedBy: z.number().int().positive(),
});

export const territoryInsertSchema = createInsertSchema(territories, {
  id: TerritoryIdSchema.optional(),
  tenantId: z.number().int().positive(),
  name: z.string().min(1).max(200),
  code: z.string().min(1).max(80),
  parentId: TerritoryIdSchema.optional().nullable(),
  defaultSalespersonId: z.number().int().positive().optional().nullable(),
  teamId: SalesTeamIdSchema.optional().nullable(),
  isActive: z.boolean().optional(),
  notes: z.string().max(4000).optional().nullable(),
  createdBy: z.number().int().positive(),
  updatedBy: z.number().int().positive(),
});

export const territoryRuleInsertSchema = createInsertSchema(territoryRules, {
  id: TerritoryRuleIdSchema.optional(),
  tenantId: z.number().int().positive(),
  territoryId: TerritoryIdSchema,
  countryId: z.number().int().positive().optional().nullable(),
  stateId: z.number().int().positive().optional().nullable(),
  zipFrom: z.string().max(20).optional().nullable(),
  zipTo: z.string().max(20).optional().nullable(),
  priority: z.number().int().min(0).optional(),
  isActive: z.boolean().optional(),
  createdBy: z.number().int().positive(),
  updatedBy: z.number().int().positive(),
});

export const commissionPlanInsertSchema = createInsertSchema(commissionPlans, {
  id: CommissionPlanIdSchema.optional(),
  tenantId: z.number().int().positive(),
  name: z.string().min(1).max(200),
  type: CommissionTypeSchema.optional(),
  base: CommissionBaseSchema.optional(),
  isActive: z.boolean().optional(),
  notes: z.string().max(4000).optional().nullable(),
  createdBy: z.number().int().positive(),
  updatedBy: z.number().int().positive(),
});

export const commissionPlanTierInsertSchema = createInsertSchema(commissionPlanTiers, {
  id: CommissionPlanTierIdSchema.optional(),
  tenantId: z.number().int().positive(),
  planId: CommissionPlanIdSchema,
  minAmount: positiveMoneyStringSchema.optional(),
  maxAmount: positiveMoneyStringSchema.optional().nullable(),
  rate: percentageStringSchema.optional(),
  sequence: z.number().int().min(0).optional(),
  createdBy: z.number().int().positive(),
  updatedBy: z.number().int().positive(),
});

export const commissionEntryInsertSchema = createInsertSchema(commissionEntries, {
  id: CommissionEntryIdSchema.optional(),
  tenantId: z.number().int().positive(),
  orderId: SalesOrderIdSchema,
  salespersonId: z.number().int().positive(),
  planId: CommissionPlanIdSchema,
  baseAmount: positiveMoneyStringSchema.optional(),
  commissionAmount: positiveMoneyStringSchema.optional(),
  status: CommissionEntryStatusSchema.optional(),
  paidDate: z.coerce.date().optional().nullable(),
  periodStart: z.coerce.date(),
  periodEnd: z.coerce.date(),
  notes: z.string().max(2000).optional().nullable(),
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
  bankId: z.number().int().positive().optional().nullable(),
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

export const productCategoryInsertSchema = createInsertSchema(productCategories, {
  id: ProductCategoryIdSchema.optional(),
  tenantId: z.number().int().positive(),
  name: z.string().min(1).max(200),
  parentId: ProductCategoryIdSchema.optional().nullable(),
  createdBy: z.number().int().positive(),
  updatedBy: z.number().int().positive(),
});

export const productInsertSchema = createInsertSchema(products, {
  id: ProductIdSchema.optional(),
  tenantId: z.number().int().positive(),
  name: z.string().min(1).max(200),
  sku: z.string().max(120).optional().nullable(),
  categoryId: ProductCategoryIdSchema.optional().nullable(),
  unitPrice: positiveMoneyStringSchema,
  description: z.string().max(2000).optional().nullable(),
  createdBy: z.number().int().positive(),
  updatedBy: z.number().int().positive(),
});

export const productTemplateInsertSchema = createInsertSchema(productTemplates, {
  id: ProductTemplateIdSchema.optional(),
  tenantId: z.number().int().positive(),
  name: z.string().min(1).max(200),
  internalReference: z.string().max(120).optional().nullable(),
  barcode: z.string().max(120).optional().nullable(),
  categoryId: ProductCategoryIdSchema.optional().nullable(),
  uomId: z.number().int().positive().optional().nullable(),
  uomPoId: z.number().int().positive().optional().nullable(),
  type: ProductTypeSchema.optional(),
  tracking: ProductTrackingSchema.optional(),
  invoicePolicy: InvoicePolicySchema.optional(),
  canBeSold: z.boolean().optional(),
  canBePurchased: z.boolean().optional(),
  listPrice: positiveMoneyStringSchema.optional(),
  standardPrice: positiveMoneyStringSchema.optional(),
  weight: z
    .string()
    .regex(/^\d+(\.\d{1,4})?$/, "Must be valid decimal")
    .optional()
    .nullable(),
  volume: z
    .string()
    .regex(/^\d+(\.\d{1,4})?$/, "Must be valid decimal")
    .optional()
    .nullable(),
  description: z.string().max(4000).optional().nullable(),
  salesDescription: z.string().max(4000).optional().nullable(),
  purchaseDescription: z.string().max(4000).optional().nullable(),
  sequence: z.number().int().min(1).optional(),
  createdBy: z.number().int().positive(),
  updatedBy: z.number().int().positive(),
});

export const productAttributeInsertSchema = createInsertSchema(productAttributes, {
  id: ProductAttributeIdSchema.optional(),
  tenantId: z.number().int().positive(),
  name: z.string().min(1).max(200),
  displayType: AttributeDisplayTypeSchema.optional(),
  createVariantPolicy: CreateVariantPolicySchema.optional(),
  sequence: z.number().int().min(1).optional(),
  createdBy: z.number().int().positive(),
  updatedBy: z.number().int().positive(),
});

export const productAttributeValueInsertSchema = createInsertSchema(productAttributeValues, {
  id: ProductAttributeValueIdSchema.optional(),
  tenantId: z.number().int().positive(),
  attributeId: ProductAttributeIdSchema,
  name: z.string().min(1).max(200),
  htmlColor: z.string().max(80).optional().nullable(),
  sequence: z.number().int().min(1).optional(),
  createdBy: z.number().int().positive(),
  updatedBy: z.number().int().positive(),
});

export const productTemplateAttributeLineInsertSchema = createInsertSchema(
  productTemplateAttributeLines,
  {
    id: ProductTemplateAttributeLineIdSchema.optional(),
    tenantId: z.number().int().positive(),
    templateId: ProductTemplateIdSchema,
    attributeId: ProductAttributeIdSchema,
    sequence: z.number().int().min(1).optional(),
    createdBy: z.number().int().positive(),
    updatedBy: z.number().int().positive(),
  }
);

export const productTemplateAttributeValueInsertSchema = createInsertSchema(
  productTemplateAttributeValues,
  {
    id: ProductTemplateAttributeValueIdSchema.optional(),
    tenantId: z.number().int().positive(),
    templateAttributeLineId: ProductTemplateAttributeLineIdSchema,
    attributeValueId: ProductAttributeValueIdSchema,
    priceExtra: positiveMoneyStringSchema.optional(),
    createdBy: z.number().int().positive(),
    updatedBy: z.number().int().positive(),
  }
);

export const productVariantInsertSchema = createInsertSchema(productVariants, {
  id: ProductVariantIdSchema.optional(),
  tenantId: z.number().int().positive(),
  templateId: ProductTemplateIdSchema,
  combinationIndices: z.string().max(2000).optional(),
  internalReference: z.string().max(120).optional().nullable(),
  barcode: z.string().max(120).optional().nullable(),
  lstPrice: positiveMoneyStringSchema.optional().nullable(),
  standardPrice: positiveMoneyStringSchema.optional().nullable(),
  createdBy: z.number().int().positive(),
  updatedBy: z.number().int().positive(),
});

export const productPackagingInsertSchema = createInsertSchema(productPackaging, {
  id: ProductPackagingIdSchema.optional(),
  tenantId: z.number().int().positive(),
  variantId: ProductVariantIdSchema,
  name: z.string().min(1).max(200),
  qty: z.string().regex(/^\d+(\.\d{1,4})?$/, "Must be valid positive decimal"),
  barcode: z.string().max(120).optional().nullable(),
  sequence: z.number().int().min(1).optional(),
  createdBy: z.number().int().positive(),
  updatedBy: z.number().int().positive(),
});

export const salesOrderInsertSchema = createInsertSchema(salesOrders, {
  id: SalesOrderIdSchema.optional(),
  tenantId: z.number().int().positive(),
  name: z.string().min(1).max(120),
  partnerId: PartnerIdSchema,
  status: OrderStatusSchema.optional(),
  sequenceNumber: z.string().max(120).optional().nullable(),
  quotationDate: z.coerce.date().optional().nullable(),
  validityDate: z.coerce.date().optional().nullable(),
  confirmationDate: z.coerce.date().optional().nullable(),
  confirmedBy: z.number().int().positive().optional().nullable(),
  currencyId: z.number().int().positive().optional().nullable(),
  pricelistId: PricelistIdSchema.optional().nullable(),
  paymentTermId: PaymentTermIdSchema.optional().nullable(),
  fiscalPositionId: FiscalPositionIdSchema.optional().nullable(),
  invoiceAddressId: PartnerAddressIdSchema.optional().nullable(),
  deliveryAddressId: PartnerAddressIdSchema.optional().nullable(),
  companyCurrencyRate: z
    .string()
    .regex(/^\d+(\.\d{1,6})?$/, "Must be a valid positive decimal string")
    .optional()
    .nullable(),
  invoiceStatus: InvoiceStatusSchema.optional(),
  deliveryStatus: DeliveryStatusSchema.optional(),
  signedBy: z.string().max(200).optional().nullable(),
  signedOn: z.coerce.date().optional().nullable(),
  clientOrderRef: z.string().max(200).optional().nullable(),
  origin: z.string().max(200).optional().nullable(),
  teamId: z.string().max(120).optional().nullable(),
  userId: z.number().int().positive().optional().nullable(),
  cancelReason: z.string().max(4000).optional().nullable(),
  orderDate: z.coerce.date().optional(),
  deliveryDate: z.coerce.date().optional().nullable(),
  assignedToId: z.string().max(120).optional().nullable(),
  notes: z.string().max(4000).optional().nullable(),
  amountUntaxed: positiveMoneyStringSchema.optional(),
  amountCost: positiveMoneyStringSchema.optional(),
  amountProfit: positiveMoneyStringSchema.optional(),
  marginPercent: percentageStringSchema.optional(),
  amountTax: positiveMoneyStringSchema.optional(),
  amountTotal: positiveMoneyStringSchema.optional(),
  createdBy: z.number().int().positive(),
  updatedBy: z.number().int().positive(),
});

export const salesOrderLineInsertSchema = createInsertSchema(salesOrderLines, {
  id: SalesOrderLineIdSchema.optional(),
  tenantId: z.number().int().positive(),
  orderId: SalesOrderIdSchema,
  productId: ProductIdSchema,
  taxId: TaxRateIdSchema.optional().nullable(),
  productUomId: z.number().int().positive().optional().nullable(),
  description: z.string().max(4000).optional().nullable(),
  quantity: quantityStringSchema,
  priceUnit: positiveMoneyStringSchema,
  discount: discountStringSchema.optional(),
  costUnit: positiveMoneyStringSchema.optional(),
  subtotal: positiveMoneyStringSchema,
  priceSubtotal: positiveMoneyStringSchema.optional(),
  priceTax: positiveMoneyStringSchema.optional(),
  priceTotal: positiveMoneyStringSchema.optional(),
  costSubtotal: positiveMoneyStringSchema.optional(),
  profitAmount: positiveMoneyStringSchema.optional(),
  marginPercent: percentageStringSchema.optional(),
  qtyDelivered: quantityStringSchema.optional(),
  qtyToInvoice: quantityStringSchema.optional(),
  qtyInvoiced: quantityStringSchema.optional(),
  invoiceStatus: InvoiceStatusSchema.optional(),
  customerLead: z.number().int().min(0).optional(),
  displayType: DisplayLineTypeSchema.optional(),
  priceSource: PriceSourceSchema.optional(),
  discountSource: DiscountSourceSchema.optional(),
  appliedPricelistId: PricelistIdSchema.optional().nullable(),
  appliedFiscalPositionId: FiscalPositionIdSchema.optional().nullable(),
  discountAuthorityUserId: z.number().int().positive().optional().nullable(),
  sequence: z.number().int().positive().optional(),
  createdBy: z.number().int().positive(),
  updatedBy: z.number().int().positive(),
});

export const paymentTermInsertSchema = createInsertSchema(paymentTerms, {
  id: PaymentTermIdSchema.optional(),
  tenantId: z.number().int().positive(),
  name: z.string().min(1).max(200),
  note: z.string().max(4000).optional().nullable(),
  isActive: z.boolean().optional(),
  createdBy: z.number().int().positive(),
  updatedBy: z.number().int().positive(),
});

export const paymentTermLineInsertSchema = createInsertSchema(paymentTermLines, {
  id: PaymentTermLineIdSchema.optional(),
  tenantId: z.number().int().positive(),
  paymentTermId: PaymentTermIdSchema,
  valueType: PaymentTermValueTypeSchema.optional(),
  value: z
    .string()
    .regex(/^\d+(\.\d{1,4})?$/, "Must be a valid non-negative decimal string")
    .optional(),
  days: z.number().int().min(0).optional(),
  dayOfMonth: z.number().int().min(1).max(31).optional().nullable(),
  endOfMonth: z.boolean().optional(),
  sequence: z.number().int().min(0).optional(),
  createdBy: z.number().int().positive(),
  updatedBy: z.number().int().positive(),
});

export const pricelistInsertSchema = createInsertSchema(pricelists, {
  id: PricelistIdSchema.optional(),
  tenantId: z.number().int().positive(),
  name: z.string().min(1).max(200),
  currencyId: z.number().int().positive(),
  discountPolicy: DiscountPolicySchema.optional(),
  isActive: z.boolean().optional(),
  sequence: z.number().int().min(0).optional(),
  createdBy: z.number().int().positive(),
  updatedBy: z.number().int().positive(),
});

export const pricelistItemInsertSchema = createInsertSchema(pricelistItems, {
  id: PricelistItemIdSchema.optional(),
  tenantId: z.number().int().positive(),
  pricelistId: PricelistIdSchema,
  appliedOn: PricelistAppliedOnSchema.optional(),
  productTmplId: z.uuid().optional().nullable(),
  productId: ProductIdSchema.optional().nullable(),
  categId: ProductCategoryIdSchema.optional().nullable(),
  minQuantity: z
    .string()
    .regex(/^\d+(\.\d{1,4})?$/, "Must be a valid quantity string")
    .optional(),
  dateStart: z.coerce.date().optional().nullable(),
  dateEnd: z.coerce.date().optional().nullable(),
  computePrice: PricelistComputeTypeSchema.optional(),
  fixedPrice: z
    .string()
    .regex(/^\d+(\.\d{1,4})?$/, "Must be a valid non-negative decimal string")
    .optional()
    .nullable(),
  percentPrice: percentageStringSchema.optional().nullable(),
  base: PricelistBaseTypeSchema.optional(),
  basePricelistId: PricelistIdSchema.optional().nullable(),
  priceSurcharge: z
    .string()
    .regex(/^\d+(\.\d{1,4})?$/, "Must be a valid non-negative decimal string")
    .optional(),
  priceDiscount: z
    .string()
    .regex(/^-?\d+(\.\d{1,4})?$/, "Must be a valid decimal string")
    .optional(),
  priceRound: z
    .string()
    .regex(/^\d+(\.\d{1,6})?$/, "Must be a valid non-negative decimal string")
    .optional()
    .nullable(),
  priceMinMargin: z
    .string()
    .regex(/^\d+(\.\d{1,4})?$/, "Must be a valid non-negative decimal string")
    .optional(),
  priceMaxMargin: z
    .string()
    .regex(/^\d+(\.\d{1,4})?$/, "Must be a valid non-negative decimal string")
    .optional(),
  sequence: z.number().int().min(0).optional(),
  isActive: z.boolean().optional(),
  createdBy: z.number().int().positive(),
  updatedBy: z.number().int().positive(),
});

export const taxGroupInsertSchema = createInsertSchema(taxGroups, {
  id: TaxGroupIdSchema.optional(),
  tenantId: z.number().int().positive(),
  name: z.string().min(1).max(200),
  sequence: z.number().int().min(0).optional(),
  countryId: z.number().int().positive().optional().nullable(),
  createdBy: z.number().int().positive(),
  updatedBy: z.number().int().positive(),
});

export const taxRateInsertSchema = createInsertSchema(taxRates, {
  id: TaxRateIdSchema.optional(),
  tenantId: z.number().int().positive(),
  name: z.string().min(1).max(200),
  typeTaxUse: TaxTypeUseSchema.optional(),
  amountType: TaxAmountTypeSchema.optional(),
  amount: percentageStringSchema.optional(),
  taxGroupId: TaxGroupIdSchema.optional().nullable(),
  priceInclude: z.boolean().optional(),
  isActive: z.boolean().optional(),
  sequence: z.number().int().min(0).optional(),
  countryId: z.number().int().positive().optional().nullable(),
  createdBy: z.number().int().positive(),
  updatedBy: z.number().int().positive(),
});

export const taxRateChildInsertSchema = createInsertSchema(taxRateChildren, {
  id: TaxRateChildIdSchema.optional(),
  tenantId: z.number().int().positive(),
  parentTaxId: TaxRateIdSchema,
  childTaxId: TaxRateIdSchema,
  sequence: z.number().int().min(0).optional(),
  createdBy: z.number().int().positive(),
  updatedBy: z.number().int().positive(),
});

export const fiscalPositionInsertSchema = createInsertSchema(fiscalPositions, {
  id: FiscalPositionIdSchema.optional(),
  tenantId: z.number().int().positive(),
  name: z.string().min(1).max(200),
  countryId: z.number().int().positive().optional().nullable(),
  stateIds: z.string().max(2000).optional().nullable(),
  zipFrom: z.string().max(20).optional().nullable(),
  zipTo: z.string().max(20).optional().nullable(),
  autoApply: z.boolean().optional(),
  vatRequired: z.boolean().optional(),
  createdBy: z.number().int().positive(),
  updatedBy: z.number().int().positive(),
});

export const fiscalPositionTaxMapInsertSchema = createInsertSchema(fiscalPositionTaxMaps, {
  id: FiscalPositionTaxMapIdSchema.optional(),
  tenantId: z.number().int().positive(),
  fiscalPositionId: FiscalPositionIdSchema,
  taxSrcId: TaxRateIdSchema,
  taxDestId: TaxRateIdSchema.optional().nullable(),
  createdBy: z.number().int().positive(),
  updatedBy: z.number().int().positive(),
});

export const fiscalPositionAccountMapInsertSchema = createInsertSchema(fiscalPositionAccountMaps, {
  id: FiscalPositionAccountMapIdSchema.optional(),
  tenantId: z.number().int().positive(),
  fiscalPositionId: FiscalPositionIdSchema,
  accountSrcId: z.string().min(1).max(120),
  accountDestId: z.string().min(1).max(120),
  createdBy: z.number().int().positive(),
  updatedBy: z.number().int().positive(),
});

export const saleOrderLineTaxInsertSchema = createInsertSchema(saleOrderLineTaxes, {
  id: SaleOrderLineTaxIdSchema.optional(),
  tenantId: z.number().int().positive(),
  orderLineId: SalesOrderLineIdSchema,
  taxId: TaxRateIdSchema,
  sequence: z.number().int().min(0).optional(),
  createdBy: z.number().int().positive(),
  updatedBy: z.number().int().positive(),
});

export const saleOrderStatusHistoryInsertSchema = createInsertSchema(saleOrderStatusHistory, {
  id: SaleOrderStatusHistoryIdSchema.optional(),
  tenantId: z.number().int().positive(),
  orderId: SalesOrderIdSchema,
  oldStatus: OrderStatusSchema,
  newStatus: OrderStatusSchema,
  changedBy: z.number().int().positive().optional().nullable(),
  changedAt: z.coerce.date().optional(),
  reason: z.string().max(2000).optional().nullable(),
  createdBy: z.number().int().positive(),
  updatedBy: z.number().int().positive(),
});

export const saleOrderTaxSummaryInsertSchema = createInsertSchema(saleOrderTaxSummary, {
  id: SaleOrderTaxSummaryIdSchema.optional(),
  tenantId: z.number().int().positive(),
  orderId: SalesOrderIdSchema,
  taxId: TaxRateIdSchema,
  taxGroupId: TaxGroupIdSchema.optional().nullable(),
  baseAmount: positiveMoneyStringSchema.optional(),
  taxAmount: positiveMoneyStringSchema.optional(),
  isTaxIncluded: z.boolean().optional(),
  createdBy: z.number().int().positive(),
  updatedBy: z.number().int().positive(),
});

export const consignmentAgreementInsertSchema = createInsertSchema(consignmentAgreements, {
  id: ConsignmentAgreementIdSchema.optional(),
  tenantId: z.number().int().positive(),
  name: z.string().min(1).max(200),
  partnerId: PartnerIdSchema,
  startDate: z.coerce.date(),
  endDate: z.coerce.date().optional().nullable(),
  status: ConsignmentStatusSchema.optional(),
  paymentTermId: PaymentTermIdSchema.optional().nullable(),
  reviewPeriodDays: z.number().int().positive().optional(),
  notes: z.string().max(4000).optional().nullable(),
  createdBy: z.number().int().positive(),
  updatedBy: z.number().int().positive(),
});

export const consignmentAgreementLineInsertSchema = createInsertSchema(consignmentAgreementLines, {
  id: ConsignmentAgreementLineIdSchema.optional(),
  tenantId: z.number().int().positive(),
  agreementId: ConsignmentAgreementIdSchema,
  productId: ProductIdSchema,
  maxQuantity: quantityStringSchema.optional(),
  unitPrice: positiveMoneyStringSchema.optional(),
  minReportPeriod: ConsignmentReportPeriodSchema.optional(),
  isActive: z.boolean().optional(),
  createdBy: z.number().int().positive(),
  updatedBy: z.number().int().positive(),
});

export const consignmentStockReportInsertSchema = createInsertSchema(consignmentStockReports, {
  id: ConsignmentStockReportIdSchema.optional(),
  tenantId: z.number().int().positive(),
  agreementId: ConsignmentAgreementIdSchema,
  reportDate: z.coerce.date(),
  status: ConsignmentReportStatusSchema.optional(),
  submittedAt: z.coerce.date().optional().nullable(),
  confirmedAt: z.coerce.date().optional().nullable(),
  invoicedAt: z.coerce.date().optional().nullable(),
  notes: z.string().max(4000).optional().nullable(),
  createdBy: z.number().int().positive(),
  updatedBy: z.number().int().positive(),
});

export const consignmentStockReportLineInsertSchema = createInsertSchema(
  consignmentStockReportLines,
  {
    id: ConsignmentStockReportLineIdSchema.optional(),
    tenantId: z.number().int().positive(),
    reportId: ConsignmentStockReportIdSchema,
    productId: ProductIdSchema,
    openingQty: quantityStringSchema.optional(),
    receivedQty: quantityStringSchema.optional(),
    soldQty: quantityStringSchema.optional(),
    returnedQty: quantityStringSchema.optional(),
    closingQty: quantityStringSchema.optional(),
    unitPrice: positiveMoneyStringSchema.optional(),
    lineTotal: positiveMoneyStringSchema.optional(),
    createdBy: z.number().int().positive(),
    updatedBy: z.number().int().positive(),
  }
);

export const partnerUpdateSchema = createUpdateSchema(partners);
export const partnerAddressUpdateSchema = createUpdateSchema(partnerAddresses);
export const partnerBankAccountUpdateSchema = createUpdateSchema(partnerBankAccounts);
export const partnerTagUpdateSchema = createUpdateSchema(partnerTags);
export const partnerTagAssignmentUpdateSchema = createUpdateSchema(partnerTagAssignments);
export const productCategoryUpdateSchema = createUpdateSchema(productCategories);
export const productUpdateSchema = createUpdateSchema(products);
export const productTemplateUpdateSchema = createUpdateSchema(productTemplates);
export const productAttributeUpdateSchema = createUpdateSchema(productAttributes);
export const productAttributeValueUpdateSchema = createUpdateSchema(productAttributeValues);
export const productTemplateAttributeLineUpdateSchema = createUpdateSchema(
  productTemplateAttributeLines
);
export const productTemplateAttributeValueUpdateSchema = createUpdateSchema(
  productTemplateAttributeValues
);
export const productVariantUpdateSchema = createUpdateSchema(productVariants);
export const productPackagingUpdateSchema = createUpdateSchema(productPackaging);
export const salesOrderUpdateSchema = createUpdateSchema(salesOrders);
export const salesOrderLineUpdateSchema = createUpdateSchema(salesOrderLines);
export const paymentTermUpdateSchema = createUpdateSchema(paymentTerms);
export const paymentTermLineUpdateSchema = createUpdateSchema(paymentTermLines);
export const pricelistUpdateSchema = createUpdateSchema(pricelists);
export const pricelistItemUpdateSchema = createUpdateSchema(pricelistItems);
export const taxGroupUpdateSchema = createUpdateSchema(taxGroups);
export const taxRateUpdateSchema = createUpdateSchema(taxRates);
export const taxRateChildUpdateSchema = createUpdateSchema(taxRateChildren);
export const fiscalPositionUpdateSchema = createUpdateSchema(fiscalPositions);
export const fiscalPositionTaxMapUpdateSchema = createUpdateSchema(fiscalPositionTaxMaps);
export const fiscalPositionAccountMapUpdateSchema = createUpdateSchema(fiscalPositionAccountMaps);
export const saleOrderLineTaxUpdateSchema = createUpdateSchema(saleOrderLineTaxes);
export const saleOrderStatusHistoryUpdateSchema = createUpdateSchema(saleOrderStatusHistory);
export const saleOrderTaxSummaryUpdateSchema = createUpdateSchema(saleOrderTaxSummary);
export const consignmentAgreementUpdateSchema = createUpdateSchema(consignmentAgreements);
export const consignmentAgreementLineUpdateSchema = createUpdateSchema(consignmentAgreementLines);
export const consignmentStockReportUpdateSchema = createUpdateSchema(consignmentStockReports);
export const consignmentStockReportLineUpdateSchema = createUpdateSchema(
  consignmentStockReportLines
);
export const returnReasonCodeUpdateSchema = createUpdateSchema(returnReasonCodes);
export const returnOrderUpdateSchema = createUpdateSchema(returnOrders);
export const returnOrderLineUpdateSchema = createUpdateSchema(returnOrderLines);
export const subscriptionTemplateUpdateSchema = createUpdateSchema(subscriptionTemplates);
export const subscriptionUpdateSchema = createUpdateSchema(subscriptions);
export const subscriptionLineUpdateSchema = createUpdateSchema(subscriptionLines);
export const subscriptionLogUpdateSchema = createUpdateSchema(subscriptionLogs);
export const subscriptionCloseReasonUpdateSchema = createUpdateSchema(subscriptionCloseReasons);
export const salesTeamUpdateSchema = createUpdateSchema(salesTeams);
export const salesTeamMemberUpdateSchema = createUpdateSchema(salesTeamMembers);
export const territoryUpdateSchema = createUpdateSchema(territories);
export const territoryRuleUpdateSchema = createUpdateSchema(territoryRules);
export const commissionPlanUpdateSchema = createUpdateSchema(commissionPlans);
export const commissionPlanTierUpdateSchema = createUpdateSchema(commissionPlanTiers);
export const commissionEntryUpdateSchema = createUpdateSchema(commissionEntries);

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
export type ProductCategory = typeof productCategories.$inferSelect;
export type NewProductCategory = typeof productCategories.$inferInsert;
export type Product = typeof products.$inferSelect;
export type NewProduct = typeof products.$inferInsert;
export type ProductTemplate = typeof productTemplates.$inferSelect;
export type NewProductTemplate = typeof productTemplates.$inferInsert;
export type ProductAttribute = typeof productAttributes.$inferSelect;
export type NewProductAttribute = typeof productAttributes.$inferInsert;
export type ProductAttributeValue = typeof productAttributeValues.$inferSelect;
export type NewProductAttributeValue = typeof productAttributeValues.$inferInsert;
export type ProductTemplateAttributeLine = typeof productTemplateAttributeLines.$inferSelect;
export type NewProductTemplateAttributeLine = typeof productTemplateAttributeLines.$inferInsert;
export type ProductTemplateAttributeValue = typeof productTemplateAttributeValues.$inferSelect;
export type NewProductTemplateAttributeValue = typeof productTemplateAttributeValues.$inferInsert;
export type ProductVariant = typeof productVariants.$inferSelect;
export type NewProductVariant = typeof productVariants.$inferInsert;
export type ProductPackaging = typeof productPackaging.$inferSelect;
export type NewProductPackaging = typeof productPackaging.$inferInsert;
export type SalesOrder = typeof salesOrders.$inferSelect;
export type NewSalesOrder = typeof salesOrders.$inferInsert;
export type SalesOrderLine = typeof salesOrderLines.$inferSelect;
export type NewSalesOrderLine = typeof salesOrderLines.$inferInsert;
export type PaymentTerm = typeof paymentTerms.$inferSelect;
export type NewPaymentTerm = typeof paymentTerms.$inferInsert;
export type PaymentTermLine = typeof paymentTermLines.$inferSelect;
export type NewPaymentTermLine = typeof paymentTermLines.$inferInsert;
export type Pricelist = typeof pricelists.$inferSelect;
export type NewPricelist = typeof pricelists.$inferInsert;
export type PricelistItem = typeof pricelistItems.$inferSelect;
export type NewPricelistItem = typeof pricelistItems.$inferInsert;
export type TaxGroup = typeof taxGroups.$inferSelect;
export type NewTaxGroup = typeof taxGroups.$inferInsert;
export type TaxRate = typeof taxRates.$inferSelect;
export type NewTaxRate = typeof taxRates.$inferInsert;
export type TaxRateChild = typeof taxRateChildren.$inferSelect;
export type NewTaxRateChild = typeof taxRateChildren.$inferInsert;
export type FiscalPosition = typeof fiscalPositions.$inferSelect;
export type NewFiscalPosition = typeof fiscalPositions.$inferInsert;
export type FiscalPositionTaxMap = typeof fiscalPositionTaxMaps.$inferSelect;
export type NewFiscalPositionTaxMap = typeof fiscalPositionTaxMaps.$inferInsert;
export type FiscalPositionAccountMap = typeof fiscalPositionAccountMaps.$inferSelect;
export type NewFiscalPositionAccountMap = typeof fiscalPositionAccountMaps.$inferInsert;
export type SaleOrderLineTax = typeof saleOrderLineTaxes.$inferSelect;
export type NewSaleOrderLineTax = typeof saleOrderLineTaxes.$inferInsert;
export type SaleOrderStatusHistory = typeof saleOrderStatusHistory.$inferSelect;
export type NewSaleOrderStatusHistory = typeof saleOrderStatusHistory.$inferInsert;
export type SaleOrderTaxSummary = typeof saleOrderTaxSummary.$inferSelect;
export type NewSaleOrderTaxSummary = typeof saleOrderTaxSummary.$inferInsert;
export type ConsignmentAgreement = typeof consignmentAgreements.$inferSelect;
export type NewConsignmentAgreement = typeof consignmentAgreements.$inferInsert;
export type ConsignmentAgreementLine = typeof consignmentAgreementLines.$inferSelect;
export type NewConsignmentAgreementLine = typeof consignmentAgreementLines.$inferInsert;
export type ConsignmentStockReport = typeof consignmentStockReports.$inferSelect;
export type NewConsignmentStockReport = typeof consignmentStockReports.$inferInsert;
export type ConsignmentStockReportLine = typeof consignmentStockReportLines.$inferSelect;
export type NewConsignmentStockReportLine = typeof consignmentStockReportLines.$inferInsert;
export type ReturnReasonCode = typeof returnReasonCodes.$inferSelect;
export type NewReturnReasonCode = typeof returnReasonCodes.$inferInsert;
export type ReturnOrder = typeof returnOrders.$inferSelect;
export type NewReturnOrder = typeof returnOrders.$inferInsert;
export type ReturnOrderLine = typeof returnOrderLines.$inferSelect;
export type NewReturnOrderLine = typeof returnOrderLines.$inferInsert;
export type SubscriptionTemplate = typeof subscriptionTemplates.$inferSelect;
export type NewSubscriptionTemplate = typeof subscriptionTemplates.$inferInsert;
export type Subscription = typeof subscriptions.$inferSelect;
export type NewSubscription = typeof subscriptions.$inferInsert;
export type SubscriptionLine = typeof subscriptionLines.$inferSelect;
export type NewSubscriptionLine = typeof subscriptionLines.$inferInsert;
export type SubscriptionLog = typeof subscriptionLogs.$inferSelect;
export type NewSubscriptionLog = typeof subscriptionLogs.$inferInsert;
export type SubscriptionCloseReason = typeof subscriptionCloseReasons.$inferSelect;
export type NewSubscriptionCloseReason = typeof subscriptionCloseReasons.$inferInsert;
export type SalesTeam = typeof salesTeams.$inferSelect;
export type NewSalesTeam = typeof salesTeams.$inferInsert;
export type SalesTeamMember = typeof salesTeamMembers.$inferSelect;
export type NewSalesTeamMember = typeof salesTeamMembers.$inferInsert;
export type Territory = typeof territories.$inferSelect;
export type NewTerritory = typeof territories.$inferInsert;
export type TerritoryRule = typeof territoryRules.$inferSelect;
export type NewTerritoryRule = typeof territoryRules.$inferInsert;
export type CommissionPlan = typeof commissionPlans.$inferSelect;
export type NewCommissionPlan = typeof commissionPlans.$inferInsert;
export type CommissionPlanTier = typeof commissionPlanTiers.$inferSelect;
export type NewCommissionPlanTier = typeof commissionPlanTiers.$inferInsert;
export type CommissionEntry = typeof commissionEntries.$inferSelect;
export type NewCommissionEntry = typeof commissionEntries.$inferInsert;
