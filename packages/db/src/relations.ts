import { defineRelations } from "drizzle-orm";

import * as schema from "./schema/index.js";

/**
 * Drizzle Relations v2 - Comprehensive Coverage
 * ==============================================
 * Defines FK-based relations for relational query ergonomics.
 *
 * Design notes:
 * - Incremental adoption: start with high-value sales/partner relations
 * - Relations enable db.query.table.findMany({ with: { ... } }) API
 * - All relations follow FK constraints defined in schema
 * - optional: false when FK is NOT NULL
 *
 * Coverage:
 * - Sales domain: orders, lines, partners, products, pricelists, taxes
 * - Core platform: tenants, users
 * - Reference: payment terms, fiscal positions, sequences
 */
export const relations = defineRelations(schema, (r) => ({
  // ─── Sales Orders ────────────────────────────────────────────────────
  salesOrders: {
    tenant: r.one.tenants({
      from: r.salesOrders.tenantId,
      to: r.tenants.tenantId,
      optional: false,
    }),
    partner: r.one.partners({
      from: r.salesOrders.partnerId,
      to: r.partners.id,
      optional: false,
    }),
    lines: r.many.salesOrderLines({
      from: r.salesOrders.id,
      to: r.salesOrderLines.orderId,
    }),
    pricelist: r.one.pricelists({
      from: r.salesOrders.pricelistId,
      to: r.pricelists.id,
      optional: true,
    }),
    paymentTerm: r.one.paymentTerms({
      from: r.salesOrders.paymentTermId,
      to: r.paymentTerms.id,
      optional: true,
    }),
    fiscalPosition: r.one.fiscalPositions({
      from: r.salesOrders.fiscalPositionId,
      to: r.fiscalPositions.id,
      optional: true,
    }),
  },

  salesOrderLines: {
    order: r.one.salesOrders({
      from: r.salesOrderLines.orderId,
      to: r.salesOrders.id,
      optional: false,
    }),
    product: r.one.products({
      from: r.salesOrderLines.productId,
      to: r.products.id,
      optional: false,
    }),
  },

  // ─── Partners ───────────────────────────────────────────────────────
  partners: {
    tenant: r.one.tenants({
      from: r.partners.tenantId,
      to: r.tenants.tenantId,
      optional: false,
    }),
    salesOrders: r.many.salesOrders({
      from: r.partners.id,
      to: r.salesOrders.partnerId,
    }),
    addresses: r.many.partnerAddresses({
      from: r.partners.id,
      to: r.partnerAddresses.partnerId,
    }),
    bankAccounts: r.many.partnerBankAccounts({
      from: r.partners.id,
      to: r.partnerBankAccounts.partnerId,
    }),
    tagAssignments: r.many.partnerTagAssignments({
      from: r.partners.id,
      to: r.partnerTagAssignments.partnerId,
    }),
  },

  partnerAddresses: {
    partner: r.one.partners({
      from: r.partnerAddresses.partnerId,
      to: r.partners.id,
      optional: false,
    }),
  },

  partnerBankAccounts: {
    partner: r.one.partners({
      from: r.partnerBankAccounts.partnerId,
      to: r.partners.id,
      optional: false,
    }),
  },

  partnerTagAssignments: {
    partner: r.one.partners({
      from: r.partnerTagAssignments.partnerId,
      to: r.partners.id,
      optional: false,
    }),
    tag: r.one.partnerTags({
      from: r.partnerTagAssignments.tagId,
      to: r.partnerTags.id,
      optional: false,
    }),
  },

  partnerTags: {
    assignments: r.many.partnerTagAssignments({
      from: r.partnerTags.id,
      to: r.partnerTagAssignments.tagId,
    }),
  },

  // ─── Products ───────────────────────────────────────────────────────
  products: {
    tenant: r.one.tenants({
      from: r.products.tenantId,
      to: r.tenants.tenantId,
      optional: false,
    }),
    category: r.one.productCategories({
      from: r.products.categoryId,
      to: r.productCategories.id,
      optional: true,
    }),
    salesOrderLines: r.many.salesOrderLines({
      from: r.products.id,
      to: r.salesOrderLines.productId,
    }),
  },

  productTemplates: {
    tenant: r.one.tenants({
      from: r.productTemplates.tenantId,
      to: r.tenants.tenantId,
      optional: false,
    }),
    category: r.one.productCategories({
      from: r.productTemplates.categoryId,
      to: r.productCategories.id,
      optional: true,
    }),
    attributeLines: r.many.productTemplateAttributeLines({
      from: r.productTemplates.id,
      to: r.productTemplateAttributeLines.templateId,
    }),
  },

  productCategories: {
    tenant: r.one.tenants({
      from: r.productCategories.tenantId,
      to: r.tenants.tenantId,
      optional: false,
    }),
    parent: r.one.productCategories({
      from: r.productCategories.parentId,
      to: r.productCategories.id,
      optional: true,
    }),
    children: r.many.productCategories({
      from: r.productCategories.id,
      to: r.productCategories.parentId,
    }),
    templates: r.many.productTemplates({
      from: r.productCategories.id,
      to: r.productTemplates.categoryId,
    }),
    products: r.many.products({
      from: r.productCategories.id,
      to: r.products.categoryId,
    }),
  },

  // ─── Pricelists ─────────────────────────────────────────────────────
  pricelists: {
    tenant: r.one.tenants({
      from: r.pricelists.tenantId,
      to: r.tenants.tenantId,
      optional: false,
    }),
    items: r.many.pricelistItems({
      from: r.pricelists.id,
      to: r.pricelistItems.pricelistId,
    }),
    salesOrders: r.many.salesOrders({
      from: r.pricelists.id,
      to: r.salesOrders.pricelistId,
    }),
  },

  pricelistItems: {
    pricelist: r.one.pricelists({
      from: r.pricelistItems.pricelistId,
      to: r.pricelists.id,
      optional: false,
    }),
    product: r.one.products({
      from: r.pricelistItems.productId,
      to: r.products.id,
      optional: true,
    }),
  },

  // ─── Payment Terms ──────────────────────────────────────────────────
  paymentTerms: {
    tenant: r.one.tenants({
      from: r.paymentTerms.tenantId,
      to: r.tenants.tenantId,
      optional: false,
    }),
    lines: r.many.paymentTermLines({
      from: r.paymentTerms.id,
      to: r.paymentTermLines.paymentTermId,
    }),
    salesOrders: r.many.salesOrders({
      from: r.paymentTerms.id,
      to: r.salesOrders.paymentTermId,
    }),
  },

  paymentTermLines: {
    paymentTerm: r.one.paymentTerms({
      from: r.paymentTermLines.paymentTermId,
      to: r.paymentTerms.id,
      optional: false,
    }),
  },

  // ─── Taxes & Fiscal ─────────────────────────────────────────────────
  taxRates: {
    tenant: r.one.tenants({
      from: r.taxRates.tenantId,
      to: r.tenants.tenantId,
      optional: false,
    }),
    taxGroup: r.one.taxGroups({
      from: r.taxRates.taxGroupId,
      to: r.taxGroups.id,
      optional: true,
    }),
  },

  taxGroups: {
    tenant: r.one.tenants({
      from: r.taxGroups.tenantId,
      to: r.tenants.tenantId,
      optional: false,
    }),
    taxRates: r.many.taxRates({
      from: r.taxGroups.id,
      to: r.taxRates.taxGroupId,
    }),
  },

  fiscalPositions: {
    tenant: r.one.tenants({
      from: r.fiscalPositions.tenantId,
      to: r.tenants.tenantId,
      optional: false,
    }),
    salesOrders: r.many.salesOrders({
      from: r.fiscalPositions.id,
      to: r.salesOrders.fiscalPositionId,
    }),
  },

  // ─── Core Platform ──────────────────────────────────────────────────
  tenants: {
    users: r.many.users({
      from: r.tenants.tenantId,
      to: r.users.tenantId,
    }),
    partners: r.many.partners({
      from: r.tenants.tenantId,
      to: r.partners.tenantId,
    }),
    products: r.many.products({
      from: r.tenants.tenantId,
      to: r.products.tenantId,
    }),
    salesOrders: r.many.salesOrders({
      from: r.tenants.tenantId,
      to: r.salesOrders.tenantId,
    }),
  },

  users: {
    tenant: r.one.tenants({
      from: r.users.tenantId,
      to: r.tenants.tenantId,
      optional: false,
    }),
  },
}));
