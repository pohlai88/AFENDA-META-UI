// @generated
// Full access scaffold — tools/ci-gate/db-access-layer (emit-full).
// Human-owned reporting: use separate modules (not *.access.ts).

import { and, eq, isNull } from "drizzle-orm";
import type { Database } from "../../drizzle/db.js";
import { assertGraphGuardrailAllowsRead } from "../_shared/graph-guardrail.js";
import {
  accountingPostings,
  commissionEntries,
  commissionPlanTiers,
  commissionPlans,
  consignmentAgreementLines,
  consignmentAgreements,
  consignmentStockReportLines,
  consignmentStockReports,
  documentApprovals,
  documentStatusHistory,
  domainEventLogs,
  domainInvariantLogs,
  fiscalPositionAccountMaps,
  fiscalPositionTaxMaps,
  fiscalPositions,
  lineItemDiscounts,
  partnerAddresses,
  partnerBankAccounts,
  partnerTagAssignments,
  partnerTags,
  partners,
  paymentTermLines,
  paymentTerms,
  pricelistItems,
  pricelists,
  productAttributeValues,
  productAttributes,
  productCategories,
  productPackaging,
  productTemplateAttributeLines,
  productTemplateAttributeValues,
  productTemplates,
  productVariants,
  products,
  returnOrderLines,
  returnOrders,
  returnReasonCodes,
  roundingPolicies,
  saleOrderLineTaxes,
  saleOrderOptionLines,
  saleOrderStatusHistory,
  saleOrderTaxSummary,
  salesDocumentAttachments,
  salesOrderLines,
  salesOrders,
  salesTeamMembers,
  salesTeams,
  subscriptionCloseReasons,
  subscriptionLines,
  subscriptionLogs,
  subscriptionTemplates,
  subscriptions,
  taxGroups,
  taxRateChildren,
  taxRates,
  territories,
  territoryRules,
} from "../../schema/sales/index.js";

/** Safe by ID: tenant + not soft-deleted. */
export async function getPartnersByIdSafe(
  db: Database,
  tenantId: (typeof partners.$inferSelect)["tenantId"],
  id: (typeof partners.$inferSelect)["id"],
) {
  const rows = await db
    .select()
    .from(partners)
    .where(
      and(
        eq(partners.tenantId, tenantId),
        eq(partners.id, id),
        isNull(partners.deletedAt),
      ),
    )
    .limit(1);
  return rows[0] ?? null;
}

/** Same as getPartnersByIdSafe; asserts graph-validation policy when GRAPH_VALIDATION_POLICY_JSON is set. */
export async function getPartnersByIdSafeGuarded(
  db: Database,
  tenantId: (typeof partners.$inferSelect)["tenantId"],
  id: (typeof partners.$inferSelect)["id"],
) {
  await assertGraphGuardrailAllowsRead();
  return getPartnersByIdSafe(db, tenantId, id);
}

/** List rows for tenant excluding soft-deleted. */
export async function listPartnersActive(
  db: Database,
  tenantId: (typeof partners.$inferSelect)["tenantId"],
) {
  return await db
    .select()
    .from(partners)
    .where(and(eq(partners.tenantId, tenantId), isNull(partners.deletedAt)));
}

export async function listPartnersActiveGuarded(
  db: Database,
  tenantId: (typeof partners.$inferSelect)["tenantId"],
) {
  await assertGraphGuardrailAllowsRead();
  return listPartnersActive(db, tenantId);
}

/** List all rows for tenant including soft-deleted. */
export async function listPartnersAll(
  db: Database,
  tenantId: (typeof partners.$inferSelect)["tenantId"],
) {
  return await db.select().from(partners).where(eq(partners.tenantId, tenantId));
}

export async function listPartnersAllGuarded(
  db: Database,
  tenantId: (typeof partners.$inferSelect)["tenantId"],
) {
  await assertGraphGuardrailAllowsRead();
  return listPartnersAll(db, tenantId);
}

/** Soft-archive (mechanical delete flag). */
export async function archivePartners(
  db: Database,
  tenantId: (typeof partners.$inferSelect)["tenantId"],
  id: (typeof partners.$inferSelect)["id"],
) {
  return await db
    .update(partners)
    .set({ deletedAt: new Date() })
    .where(and(eq(partners.tenantId, tenantId), eq(partners.id, id)));
}

export async function archivePartnersGuarded(
  db: Database,
  tenantId: (typeof partners.$inferSelect)["tenantId"],
  id: (typeof partners.$inferSelect)["id"],
) {
  await assertGraphGuardrailAllowsRead();
  return archivePartners(db, tenantId, id);
}


/** Safe by ID: tenant + not soft-deleted. */
export async function getPartnerAddressesByIdSafe(
  db: Database,
  tenantId: (typeof partnerAddresses.$inferSelect)["tenantId"],
  id: (typeof partnerAddresses.$inferSelect)["id"],
) {
  const rows = await db
    .select()
    .from(partnerAddresses)
    .where(
      and(
        eq(partnerAddresses.tenantId, tenantId),
        eq(partnerAddresses.id, id),
        isNull(partnerAddresses.deletedAt),
      ),
    )
    .limit(1);
  return rows[0] ?? null;
}

/** Same as getPartnerAddressesByIdSafe; asserts graph-validation policy when GRAPH_VALIDATION_POLICY_JSON is set. */
export async function getPartnerAddressesByIdSafeGuarded(
  db: Database,
  tenantId: (typeof partnerAddresses.$inferSelect)["tenantId"],
  id: (typeof partnerAddresses.$inferSelect)["id"],
) {
  await assertGraphGuardrailAllowsRead();
  return getPartnerAddressesByIdSafe(db, tenantId, id);
}

/** List rows for tenant excluding soft-deleted. */
export async function listPartnerAddressesActive(
  db: Database,
  tenantId: (typeof partnerAddresses.$inferSelect)["tenantId"],
) {
  return await db
    .select()
    .from(partnerAddresses)
    .where(and(eq(partnerAddresses.tenantId, tenantId), isNull(partnerAddresses.deletedAt)));
}

export async function listPartnerAddressesActiveGuarded(
  db: Database,
  tenantId: (typeof partnerAddresses.$inferSelect)["tenantId"],
) {
  await assertGraphGuardrailAllowsRead();
  return listPartnerAddressesActive(db, tenantId);
}

/** List all rows for tenant including soft-deleted. */
export async function listPartnerAddressesAll(
  db: Database,
  tenantId: (typeof partnerAddresses.$inferSelect)["tenantId"],
) {
  return await db.select().from(partnerAddresses).where(eq(partnerAddresses.tenantId, tenantId));
}

export async function listPartnerAddressesAllGuarded(
  db: Database,
  tenantId: (typeof partnerAddresses.$inferSelect)["tenantId"],
) {
  await assertGraphGuardrailAllowsRead();
  return listPartnerAddressesAll(db, tenantId);
}

/** Soft-archive (mechanical delete flag). */
export async function archivePartnerAddresses(
  db: Database,
  tenantId: (typeof partnerAddresses.$inferSelect)["tenantId"],
  id: (typeof partnerAddresses.$inferSelect)["id"],
) {
  return await db
    .update(partnerAddresses)
    .set({ deletedAt: new Date() })
    .where(and(eq(partnerAddresses.tenantId, tenantId), eq(partnerAddresses.id, id)));
}

export async function archivePartnerAddressesGuarded(
  db: Database,
  tenantId: (typeof partnerAddresses.$inferSelect)["tenantId"],
  id: (typeof partnerAddresses.$inferSelect)["id"],
) {
  await assertGraphGuardrailAllowsRead();
  return archivePartnerAddresses(db, tenantId, id);
}


/** Safe by ID: tenant + not soft-deleted. */
export async function getPartnerBankAccountsByIdSafe(
  db: Database,
  tenantId: (typeof partnerBankAccounts.$inferSelect)["tenantId"],
  id: (typeof partnerBankAccounts.$inferSelect)["id"],
) {
  const rows = await db
    .select()
    .from(partnerBankAccounts)
    .where(
      and(
        eq(partnerBankAccounts.tenantId, tenantId),
        eq(partnerBankAccounts.id, id),
        isNull(partnerBankAccounts.deletedAt),
      ),
    )
    .limit(1);
  return rows[0] ?? null;
}

/** Same as getPartnerBankAccountsByIdSafe; asserts graph-validation policy when GRAPH_VALIDATION_POLICY_JSON is set. */
export async function getPartnerBankAccountsByIdSafeGuarded(
  db: Database,
  tenantId: (typeof partnerBankAccounts.$inferSelect)["tenantId"],
  id: (typeof partnerBankAccounts.$inferSelect)["id"],
) {
  await assertGraphGuardrailAllowsRead();
  return getPartnerBankAccountsByIdSafe(db, tenantId, id);
}

/** List rows for tenant excluding soft-deleted. */
export async function listPartnerBankAccountsActive(
  db: Database,
  tenantId: (typeof partnerBankAccounts.$inferSelect)["tenantId"],
) {
  return await db
    .select()
    .from(partnerBankAccounts)
    .where(and(eq(partnerBankAccounts.tenantId, tenantId), isNull(partnerBankAccounts.deletedAt)));
}

export async function listPartnerBankAccountsActiveGuarded(
  db: Database,
  tenantId: (typeof partnerBankAccounts.$inferSelect)["tenantId"],
) {
  await assertGraphGuardrailAllowsRead();
  return listPartnerBankAccountsActive(db, tenantId);
}

/** List all rows for tenant including soft-deleted. */
export async function listPartnerBankAccountsAll(
  db: Database,
  tenantId: (typeof partnerBankAccounts.$inferSelect)["tenantId"],
) {
  return await db.select().from(partnerBankAccounts).where(eq(partnerBankAccounts.tenantId, tenantId));
}

export async function listPartnerBankAccountsAllGuarded(
  db: Database,
  tenantId: (typeof partnerBankAccounts.$inferSelect)["tenantId"],
) {
  await assertGraphGuardrailAllowsRead();
  return listPartnerBankAccountsAll(db, tenantId);
}

/** Soft-archive (mechanical delete flag). */
export async function archivePartnerBankAccounts(
  db: Database,
  tenantId: (typeof partnerBankAccounts.$inferSelect)["tenantId"],
  id: (typeof partnerBankAccounts.$inferSelect)["id"],
) {
  return await db
    .update(partnerBankAccounts)
    .set({ deletedAt: new Date() })
    .where(and(eq(partnerBankAccounts.tenantId, tenantId), eq(partnerBankAccounts.id, id)));
}

export async function archivePartnerBankAccountsGuarded(
  db: Database,
  tenantId: (typeof partnerBankAccounts.$inferSelect)["tenantId"],
  id: (typeof partnerBankAccounts.$inferSelect)["id"],
) {
  await assertGraphGuardrailAllowsRead();
  return archivePartnerBankAccounts(db, tenantId, id);
}


/** Safe by ID: tenant + not soft-deleted. */
export async function getPartnerTagsByIdSafe(
  db: Database,
  tenantId: (typeof partnerTags.$inferSelect)["tenantId"],
  id: (typeof partnerTags.$inferSelect)["id"],
) {
  const rows = await db
    .select()
    .from(partnerTags)
    .where(
      and(
        eq(partnerTags.tenantId, tenantId),
        eq(partnerTags.id, id),
        isNull(partnerTags.deletedAt),
      ),
    )
    .limit(1);
  return rows[0] ?? null;
}

/** Same as getPartnerTagsByIdSafe; asserts graph-validation policy when GRAPH_VALIDATION_POLICY_JSON is set. */
export async function getPartnerTagsByIdSafeGuarded(
  db: Database,
  tenantId: (typeof partnerTags.$inferSelect)["tenantId"],
  id: (typeof partnerTags.$inferSelect)["id"],
) {
  await assertGraphGuardrailAllowsRead();
  return getPartnerTagsByIdSafe(db, tenantId, id);
}

/** List rows for tenant excluding soft-deleted. */
export async function listPartnerTagsActive(
  db: Database,
  tenantId: (typeof partnerTags.$inferSelect)["tenantId"],
) {
  return await db
    .select()
    .from(partnerTags)
    .where(and(eq(partnerTags.tenantId, tenantId), isNull(partnerTags.deletedAt)));
}

export async function listPartnerTagsActiveGuarded(
  db: Database,
  tenantId: (typeof partnerTags.$inferSelect)["tenantId"],
) {
  await assertGraphGuardrailAllowsRead();
  return listPartnerTagsActive(db, tenantId);
}

/** List all rows for tenant including soft-deleted. */
export async function listPartnerTagsAll(
  db: Database,
  tenantId: (typeof partnerTags.$inferSelect)["tenantId"],
) {
  return await db.select().from(partnerTags).where(eq(partnerTags.tenantId, tenantId));
}

export async function listPartnerTagsAllGuarded(
  db: Database,
  tenantId: (typeof partnerTags.$inferSelect)["tenantId"],
) {
  await assertGraphGuardrailAllowsRead();
  return listPartnerTagsAll(db, tenantId);
}

/** Soft-archive (mechanical delete flag). */
export async function archivePartnerTags(
  db: Database,
  tenantId: (typeof partnerTags.$inferSelect)["tenantId"],
  id: (typeof partnerTags.$inferSelect)["id"],
) {
  return await db
    .update(partnerTags)
    .set({ deletedAt: new Date() })
    .where(and(eq(partnerTags.tenantId, tenantId), eq(partnerTags.id, id)));
}

export async function archivePartnerTagsGuarded(
  db: Database,
  tenantId: (typeof partnerTags.$inferSelect)["tenantId"],
  id: (typeof partnerTags.$inferSelect)["id"],
) {
  await assertGraphGuardrailAllowsRead();
  return archivePartnerTags(db, tenantId, id);
}


/** By ID for tenant (no soft-delete column on table). */
export async function getPartnerTagAssignmentsById(
  db: Database,
  tenantId: (typeof partnerTagAssignments.$inferSelect)["tenantId"],
  id: (typeof partnerTagAssignments.$inferSelect)["id"],
) {
  const rows = await db
    .select()
    .from(partnerTagAssignments)
    .where(and(eq(partnerTagAssignments.tenantId, tenantId), eq(partnerTagAssignments.id, id)))
    .limit(1);
  return rows[0] ?? null;
}

export async function getPartnerTagAssignmentsByIdGuarded(
  db: Database,
  tenantId: (typeof partnerTagAssignments.$inferSelect)["tenantId"],
  id: (typeof partnerTagAssignments.$inferSelect)["id"],
) {
  await assertGraphGuardrailAllowsRead();
  return getPartnerTagAssignmentsById(db, tenantId, id);
}

/** List rows for tenant. */
export async function listPartnerTagAssignments(
  db: Database,
  tenantId: (typeof partnerTagAssignments.$inferSelect)["tenantId"],
) {
  return await db.select().from(partnerTagAssignments).where(eq(partnerTagAssignments.tenantId, tenantId));
}

export async function listPartnerTagAssignmentsGuarded(
  db: Database,
  tenantId: (typeof partnerTagAssignments.$inferSelect)["tenantId"],
) {
  await assertGraphGuardrailAllowsRead();
  return listPartnerTagAssignments(db, tenantId);
}


/** Safe by ID: tenant + not soft-deleted. */
export async function getProductCategoriesByIdSafe(
  db: Database,
  tenantId: (typeof productCategories.$inferSelect)["tenantId"],
  id: (typeof productCategories.$inferSelect)["id"],
) {
  const rows = await db
    .select()
    .from(productCategories)
    .where(
      and(
        eq(productCategories.tenantId, tenantId),
        eq(productCategories.id, id),
        isNull(productCategories.deletedAt),
      ),
    )
    .limit(1);
  return rows[0] ?? null;
}

/** Same as getProductCategoriesByIdSafe; asserts graph-validation policy when GRAPH_VALIDATION_POLICY_JSON is set. */
export async function getProductCategoriesByIdSafeGuarded(
  db: Database,
  tenantId: (typeof productCategories.$inferSelect)["tenantId"],
  id: (typeof productCategories.$inferSelect)["id"],
) {
  await assertGraphGuardrailAllowsRead();
  return getProductCategoriesByIdSafe(db, tenantId, id);
}

/** List rows for tenant excluding soft-deleted. */
export async function listProductCategoriesActive(
  db: Database,
  tenantId: (typeof productCategories.$inferSelect)["tenantId"],
) {
  return await db
    .select()
    .from(productCategories)
    .where(and(eq(productCategories.tenantId, tenantId), isNull(productCategories.deletedAt)));
}

export async function listProductCategoriesActiveGuarded(
  db: Database,
  tenantId: (typeof productCategories.$inferSelect)["tenantId"],
) {
  await assertGraphGuardrailAllowsRead();
  return listProductCategoriesActive(db, tenantId);
}

/** List all rows for tenant including soft-deleted. */
export async function listProductCategoriesAll(
  db: Database,
  tenantId: (typeof productCategories.$inferSelect)["tenantId"],
) {
  return await db.select().from(productCategories).where(eq(productCategories.tenantId, tenantId));
}

export async function listProductCategoriesAllGuarded(
  db: Database,
  tenantId: (typeof productCategories.$inferSelect)["tenantId"],
) {
  await assertGraphGuardrailAllowsRead();
  return listProductCategoriesAll(db, tenantId);
}

/** Soft-archive (mechanical delete flag). */
export async function archiveProductCategories(
  db: Database,
  tenantId: (typeof productCategories.$inferSelect)["tenantId"],
  id: (typeof productCategories.$inferSelect)["id"],
) {
  return await db
    .update(productCategories)
    .set({ deletedAt: new Date() })
    .where(and(eq(productCategories.tenantId, tenantId), eq(productCategories.id, id)));
}

export async function archiveProductCategoriesGuarded(
  db: Database,
  tenantId: (typeof productCategories.$inferSelect)["tenantId"],
  id: (typeof productCategories.$inferSelect)["id"],
) {
  await assertGraphGuardrailAllowsRead();
  return archiveProductCategories(db, tenantId, id);
}


/** Safe by ID: tenant + not soft-deleted. */
export async function getProductsByIdSafe(
  db: Database,
  tenantId: (typeof products.$inferSelect)["tenantId"],
  id: (typeof products.$inferSelect)["id"],
) {
  const rows = await db
    .select()
    .from(products)
    .where(
      and(
        eq(products.tenantId, tenantId),
        eq(products.id, id),
        isNull(products.deletedAt),
      ),
    )
    .limit(1);
  return rows[0] ?? null;
}

/** Same as getProductsByIdSafe; asserts graph-validation policy when GRAPH_VALIDATION_POLICY_JSON is set. */
export async function getProductsByIdSafeGuarded(
  db: Database,
  tenantId: (typeof products.$inferSelect)["tenantId"],
  id: (typeof products.$inferSelect)["id"],
) {
  await assertGraphGuardrailAllowsRead();
  return getProductsByIdSafe(db, tenantId, id);
}

/** List rows for tenant excluding soft-deleted. */
export async function listProductsActive(
  db: Database,
  tenantId: (typeof products.$inferSelect)["tenantId"],
) {
  return await db
    .select()
    .from(products)
    .where(and(eq(products.tenantId, tenantId), isNull(products.deletedAt)));
}

export async function listProductsActiveGuarded(
  db: Database,
  tenantId: (typeof products.$inferSelect)["tenantId"],
) {
  await assertGraphGuardrailAllowsRead();
  return listProductsActive(db, tenantId);
}

/** List all rows for tenant including soft-deleted. */
export async function listProductsAll(
  db: Database,
  tenantId: (typeof products.$inferSelect)["tenantId"],
) {
  return await db.select().from(products).where(eq(products.tenantId, tenantId));
}

export async function listProductsAllGuarded(
  db: Database,
  tenantId: (typeof products.$inferSelect)["tenantId"],
) {
  await assertGraphGuardrailAllowsRead();
  return listProductsAll(db, tenantId);
}

/** Soft-archive (mechanical delete flag). */
export async function archiveProducts(
  db: Database,
  tenantId: (typeof products.$inferSelect)["tenantId"],
  id: (typeof products.$inferSelect)["id"],
) {
  return await db
    .update(products)
    .set({ deletedAt: new Date() })
    .where(and(eq(products.tenantId, tenantId), eq(products.id, id)));
}

export async function archiveProductsGuarded(
  db: Database,
  tenantId: (typeof products.$inferSelect)["tenantId"],
  id: (typeof products.$inferSelect)["id"],
) {
  await assertGraphGuardrailAllowsRead();
  return archiveProducts(db, tenantId, id);
}


/** Safe by ID: tenant + not soft-deleted. */
export async function getProductTemplatesByIdSafe(
  db: Database,
  tenantId: (typeof productTemplates.$inferSelect)["tenantId"],
  id: (typeof productTemplates.$inferSelect)["id"],
) {
  const rows = await db
    .select()
    .from(productTemplates)
    .where(
      and(
        eq(productTemplates.tenantId, tenantId),
        eq(productTemplates.id, id),
        isNull(productTemplates.deletedAt),
      ),
    )
    .limit(1);
  return rows[0] ?? null;
}

/** Same as getProductTemplatesByIdSafe; asserts graph-validation policy when GRAPH_VALIDATION_POLICY_JSON is set. */
export async function getProductTemplatesByIdSafeGuarded(
  db: Database,
  tenantId: (typeof productTemplates.$inferSelect)["tenantId"],
  id: (typeof productTemplates.$inferSelect)["id"],
) {
  await assertGraphGuardrailAllowsRead();
  return getProductTemplatesByIdSafe(db, tenantId, id);
}

/** List rows for tenant excluding soft-deleted. */
export async function listProductTemplatesActive(
  db: Database,
  tenantId: (typeof productTemplates.$inferSelect)["tenantId"],
) {
  return await db
    .select()
    .from(productTemplates)
    .where(and(eq(productTemplates.tenantId, tenantId), isNull(productTemplates.deletedAt)));
}

export async function listProductTemplatesActiveGuarded(
  db: Database,
  tenantId: (typeof productTemplates.$inferSelect)["tenantId"],
) {
  await assertGraphGuardrailAllowsRead();
  return listProductTemplatesActive(db, tenantId);
}

/** List all rows for tenant including soft-deleted. */
export async function listProductTemplatesAll(
  db: Database,
  tenantId: (typeof productTemplates.$inferSelect)["tenantId"],
) {
  return await db.select().from(productTemplates).where(eq(productTemplates.tenantId, tenantId));
}

export async function listProductTemplatesAllGuarded(
  db: Database,
  tenantId: (typeof productTemplates.$inferSelect)["tenantId"],
) {
  await assertGraphGuardrailAllowsRead();
  return listProductTemplatesAll(db, tenantId);
}

/** Soft-archive (mechanical delete flag). */
export async function archiveProductTemplates(
  db: Database,
  tenantId: (typeof productTemplates.$inferSelect)["tenantId"],
  id: (typeof productTemplates.$inferSelect)["id"],
) {
  return await db
    .update(productTemplates)
    .set({ deletedAt: new Date() })
    .where(and(eq(productTemplates.tenantId, tenantId), eq(productTemplates.id, id)));
}

export async function archiveProductTemplatesGuarded(
  db: Database,
  tenantId: (typeof productTemplates.$inferSelect)["tenantId"],
  id: (typeof productTemplates.$inferSelect)["id"],
) {
  await assertGraphGuardrailAllowsRead();
  return archiveProductTemplates(db, tenantId, id);
}


/** Safe by ID: tenant + not soft-deleted. */
export async function getProductAttributesByIdSafe(
  db: Database,
  tenantId: (typeof productAttributes.$inferSelect)["tenantId"],
  id: (typeof productAttributes.$inferSelect)["id"],
) {
  const rows = await db
    .select()
    .from(productAttributes)
    .where(
      and(
        eq(productAttributes.tenantId, tenantId),
        eq(productAttributes.id, id),
        isNull(productAttributes.deletedAt),
      ),
    )
    .limit(1);
  return rows[0] ?? null;
}

/** Same as getProductAttributesByIdSafe; asserts graph-validation policy when GRAPH_VALIDATION_POLICY_JSON is set. */
export async function getProductAttributesByIdSafeGuarded(
  db: Database,
  tenantId: (typeof productAttributes.$inferSelect)["tenantId"],
  id: (typeof productAttributes.$inferSelect)["id"],
) {
  await assertGraphGuardrailAllowsRead();
  return getProductAttributesByIdSafe(db, tenantId, id);
}

/** List rows for tenant excluding soft-deleted. */
export async function listProductAttributesActive(
  db: Database,
  tenantId: (typeof productAttributes.$inferSelect)["tenantId"],
) {
  return await db
    .select()
    .from(productAttributes)
    .where(and(eq(productAttributes.tenantId, tenantId), isNull(productAttributes.deletedAt)));
}

export async function listProductAttributesActiveGuarded(
  db: Database,
  tenantId: (typeof productAttributes.$inferSelect)["tenantId"],
) {
  await assertGraphGuardrailAllowsRead();
  return listProductAttributesActive(db, tenantId);
}

/** List all rows for tenant including soft-deleted. */
export async function listProductAttributesAll(
  db: Database,
  tenantId: (typeof productAttributes.$inferSelect)["tenantId"],
) {
  return await db.select().from(productAttributes).where(eq(productAttributes.tenantId, tenantId));
}

export async function listProductAttributesAllGuarded(
  db: Database,
  tenantId: (typeof productAttributes.$inferSelect)["tenantId"],
) {
  await assertGraphGuardrailAllowsRead();
  return listProductAttributesAll(db, tenantId);
}

/** Soft-archive (mechanical delete flag). */
export async function archiveProductAttributes(
  db: Database,
  tenantId: (typeof productAttributes.$inferSelect)["tenantId"],
  id: (typeof productAttributes.$inferSelect)["id"],
) {
  return await db
    .update(productAttributes)
    .set({ deletedAt: new Date() })
    .where(and(eq(productAttributes.tenantId, tenantId), eq(productAttributes.id, id)));
}

export async function archiveProductAttributesGuarded(
  db: Database,
  tenantId: (typeof productAttributes.$inferSelect)["tenantId"],
  id: (typeof productAttributes.$inferSelect)["id"],
) {
  await assertGraphGuardrailAllowsRead();
  return archiveProductAttributes(db, tenantId, id);
}


/** Safe by ID: tenant + not soft-deleted. */
export async function getProductAttributeValuesByIdSafe(
  db: Database,
  tenantId: (typeof productAttributeValues.$inferSelect)["tenantId"],
  id: (typeof productAttributeValues.$inferSelect)["id"],
) {
  const rows = await db
    .select()
    .from(productAttributeValues)
    .where(
      and(
        eq(productAttributeValues.tenantId, tenantId),
        eq(productAttributeValues.id, id),
        isNull(productAttributeValues.deletedAt),
      ),
    )
    .limit(1);
  return rows[0] ?? null;
}

/** Same as getProductAttributeValuesByIdSafe; asserts graph-validation policy when GRAPH_VALIDATION_POLICY_JSON is set. */
export async function getProductAttributeValuesByIdSafeGuarded(
  db: Database,
  tenantId: (typeof productAttributeValues.$inferSelect)["tenantId"],
  id: (typeof productAttributeValues.$inferSelect)["id"],
) {
  await assertGraphGuardrailAllowsRead();
  return getProductAttributeValuesByIdSafe(db, tenantId, id);
}

/** List rows for tenant excluding soft-deleted. */
export async function listProductAttributeValuesActive(
  db: Database,
  tenantId: (typeof productAttributeValues.$inferSelect)["tenantId"],
) {
  return await db
    .select()
    .from(productAttributeValues)
    .where(and(eq(productAttributeValues.tenantId, tenantId), isNull(productAttributeValues.deletedAt)));
}

export async function listProductAttributeValuesActiveGuarded(
  db: Database,
  tenantId: (typeof productAttributeValues.$inferSelect)["tenantId"],
) {
  await assertGraphGuardrailAllowsRead();
  return listProductAttributeValuesActive(db, tenantId);
}

/** List all rows for tenant including soft-deleted. */
export async function listProductAttributeValuesAll(
  db: Database,
  tenantId: (typeof productAttributeValues.$inferSelect)["tenantId"],
) {
  return await db.select().from(productAttributeValues).where(eq(productAttributeValues.tenantId, tenantId));
}

export async function listProductAttributeValuesAllGuarded(
  db: Database,
  tenantId: (typeof productAttributeValues.$inferSelect)["tenantId"],
) {
  await assertGraphGuardrailAllowsRead();
  return listProductAttributeValuesAll(db, tenantId);
}

/** Soft-archive (mechanical delete flag). */
export async function archiveProductAttributeValues(
  db: Database,
  tenantId: (typeof productAttributeValues.$inferSelect)["tenantId"],
  id: (typeof productAttributeValues.$inferSelect)["id"],
) {
  return await db
    .update(productAttributeValues)
    .set({ deletedAt: new Date() })
    .where(and(eq(productAttributeValues.tenantId, tenantId), eq(productAttributeValues.id, id)));
}

export async function archiveProductAttributeValuesGuarded(
  db: Database,
  tenantId: (typeof productAttributeValues.$inferSelect)["tenantId"],
  id: (typeof productAttributeValues.$inferSelect)["id"],
) {
  await assertGraphGuardrailAllowsRead();
  return archiveProductAttributeValues(db, tenantId, id);
}


/** By ID for tenant (no soft-delete column on table). */
export async function getProductTemplateAttributeLinesById(
  db: Database,
  tenantId: (typeof productTemplateAttributeLines.$inferSelect)["tenantId"],
  id: (typeof productTemplateAttributeLines.$inferSelect)["id"],
) {
  const rows = await db
    .select()
    .from(productTemplateAttributeLines)
    .where(and(eq(productTemplateAttributeLines.tenantId, tenantId), eq(productTemplateAttributeLines.id, id)))
    .limit(1);
  return rows[0] ?? null;
}

export async function getProductTemplateAttributeLinesByIdGuarded(
  db: Database,
  tenantId: (typeof productTemplateAttributeLines.$inferSelect)["tenantId"],
  id: (typeof productTemplateAttributeLines.$inferSelect)["id"],
) {
  await assertGraphGuardrailAllowsRead();
  return getProductTemplateAttributeLinesById(db, tenantId, id);
}

/** List rows for tenant. */
export async function listProductTemplateAttributeLines(
  db: Database,
  tenantId: (typeof productTemplateAttributeLines.$inferSelect)["tenantId"],
) {
  return await db.select().from(productTemplateAttributeLines).where(eq(productTemplateAttributeLines.tenantId, tenantId));
}

export async function listProductTemplateAttributeLinesGuarded(
  db: Database,
  tenantId: (typeof productTemplateAttributeLines.$inferSelect)["tenantId"],
) {
  await assertGraphGuardrailAllowsRead();
  return listProductTemplateAttributeLines(db, tenantId);
}


/** By ID for tenant (no soft-delete column on table). */
export async function getProductTemplateAttributeValuesById(
  db: Database,
  tenantId: (typeof productTemplateAttributeValues.$inferSelect)["tenantId"],
  id: (typeof productTemplateAttributeValues.$inferSelect)["id"],
) {
  const rows = await db
    .select()
    .from(productTemplateAttributeValues)
    .where(and(eq(productTemplateAttributeValues.tenantId, tenantId), eq(productTemplateAttributeValues.id, id)))
    .limit(1);
  return rows[0] ?? null;
}

export async function getProductTemplateAttributeValuesByIdGuarded(
  db: Database,
  tenantId: (typeof productTemplateAttributeValues.$inferSelect)["tenantId"],
  id: (typeof productTemplateAttributeValues.$inferSelect)["id"],
) {
  await assertGraphGuardrailAllowsRead();
  return getProductTemplateAttributeValuesById(db, tenantId, id);
}

/** List rows for tenant. */
export async function listProductTemplateAttributeValues(
  db: Database,
  tenantId: (typeof productTemplateAttributeValues.$inferSelect)["tenantId"],
) {
  return await db.select().from(productTemplateAttributeValues).where(eq(productTemplateAttributeValues.tenantId, tenantId));
}

export async function listProductTemplateAttributeValuesGuarded(
  db: Database,
  tenantId: (typeof productTemplateAttributeValues.$inferSelect)["tenantId"],
) {
  await assertGraphGuardrailAllowsRead();
  return listProductTemplateAttributeValues(db, tenantId);
}


/** Safe by ID: tenant + not soft-deleted. */
export async function getProductVariantsByIdSafe(
  db: Database,
  tenantId: (typeof productVariants.$inferSelect)["tenantId"],
  id: (typeof productVariants.$inferSelect)["id"],
) {
  const rows = await db
    .select()
    .from(productVariants)
    .where(
      and(
        eq(productVariants.tenantId, tenantId),
        eq(productVariants.id, id),
        isNull(productVariants.deletedAt),
      ),
    )
    .limit(1);
  return rows[0] ?? null;
}

/** Same as getProductVariantsByIdSafe; asserts graph-validation policy when GRAPH_VALIDATION_POLICY_JSON is set. */
export async function getProductVariantsByIdSafeGuarded(
  db: Database,
  tenantId: (typeof productVariants.$inferSelect)["tenantId"],
  id: (typeof productVariants.$inferSelect)["id"],
) {
  await assertGraphGuardrailAllowsRead();
  return getProductVariantsByIdSafe(db, tenantId, id);
}

/** List rows for tenant excluding soft-deleted. */
export async function listProductVariantsActive(
  db: Database,
  tenantId: (typeof productVariants.$inferSelect)["tenantId"],
) {
  return await db
    .select()
    .from(productVariants)
    .where(and(eq(productVariants.tenantId, tenantId), isNull(productVariants.deletedAt)));
}

export async function listProductVariantsActiveGuarded(
  db: Database,
  tenantId: (typeof productVariants.$inferSelect)["tenantId"],
) {
  await assertGraphGuardrailAllowsRead();
  return listProductVariantsActive(db, tenantId);
}

/** List all rows for tenant including soft-deleted. */
export async function listProductVariantsAll(
  db: Database,
  tenantId: (typeof productVariants.$inferSelect)["tenantId"],
) {
  return await db.select().from(productVariants).where(eq(productVariants.tenantId, tenantId));
}

export async function listProductVariantsAllGuarded(
  db: Database,
  tenantId: (typeof productVariants.$inferSelect)["tenantId"],
) {
  await assertGraphGuardrailAllowsRead();
  return listProductVariantsAll(db, tenantId);
}

/** Soft-archive (mechanical delete flag). */
export async function archiveProductVariants(
  db: Database,
  tenantId: (typeof productVariants.$inferSelect)["tenantId"],
  id: (typeof productVariants.$inferSelect)["id"],
) {
  return await db
    .update(productVariants)
    .set({ deletedAt: new Date() })
    .where(and(eq(productVariants.tenantId, tenantId), eq(productVariants.id, id)));
}

export async function archiveProductVariantsGuarded(
  db: Database,
  tenantId: (typeof productVariants.$inferSelect)["tenantId"],
  id: (typeof productVariants.$inferSelect)["id"],
) {
  await assertGraphGuardrailAllowsRead();
  return archiveProductVariants(db, tenantId, id);
}


/** Safe by ID: tenant + not soft-deleted. */
export async function getProductPackagingByIdSafe(
  db: Database,
  tenantId: (typeof productPackaging.$inferSelect)["tenantId"],
  id: (typeof productPackaging.$inferSelect)["id"],
) {
  const rows = await db
    .select()
    .from(productPackaging)
    .where(
      and(
        eq(productPackaging.tenantId, tenantId),
        eq(productPackaging.id, id),
        isNull(productPackaging.deletedAt),
      ),
    )
    .limit(1);
  return rows[0] ?? null;
}

/** Same as getProductPackagingByIdSafe; asserts graph-validation policy when GRAPH_VALIDATION_POLICY_JSON is set. */
export async function getProductPackagingByIdSafeGuarded(
  db: Database,
  tenantId: (typeof productPackaging.$inferSelect)["tenantId"],
  id: (typeof productPackaging.$inferSelect)["id"],
) {
  await assertGraphGuardrailAllowsRead();
  return getProductPackagingByIdSafe(db, tenantId, id);
}

/** List rows for tenant excluding soft-deleted. */
export async function listProductPackagingActive(
  db: Database,
  tenantId: (typeof productPackaging.$inferSelect)["tenantId"],
) {
  return await db
    .select()
    .from(productPackaging)
    .where(and(eq(productPackaging.tenantId, tenantId), isNull(productPackaging.deletedAt)));
}

export async function listProductPackagingActiveGuarded(
  db: Database,
  tenantId: (typeof productPackaging.$inferSelect)["tenantId"],
) {
  await assertGraphGuardrailAllowsRead();
  return listProductPackagingActive(db, tenantId);
}

/** List all rows for tenant including soft-deleted. */
export async function listProductPackagingAll(
  db: Database,
  tenantId: (typeof productPackaging.$inferSelect)["tenantId"],
) {
  return await db.select().from(productPackaging).where(eq(productPackaging.tenantId, tenantId));
}

export async function listProductPackagingAllGuarded(
  db: Database,
  tenantId: (typeof productPackaging.$inferSelect)["tenantId"],
) {
  await assertGraphGuardrailAllowsRead();
  return listProductPackagingAll(db, tenantId);
}

/** Soft-archive (mechanical delete flag). */
export async function archiveProductPackaging(
  db: Database,
  tenantId: (typeof productPackaging.$inferSelect)["tenantId"],
  id: (typeof productPackaging.$inferSelect)["id"],
) {
  return await db
    .update(productPackaging)
    .set({ deletedAt: new Date() })
    .where(and(eq(productPackaging.tenantId, tenantId), eq(productPackaging.id, id)));
}

export async function archiveProductPackagingGuarded(
  db: Database,
  tenantId: (typeof productPackaging.$inferSelect)["tenantId"],
  id: (typeof productPackaging.$inferSelect)["id"],
) {
  await assertGraphGuardrailAllowsRead();
  return archiveProductPackaging(db, tenantId, id);
}


/** Safe by ID: tenant + not soft-deleted. */
export async function getSalesOrdersByIdSafe(
  db: Database,
  tenantId: (typeof salesOrders.$inferSelect)["tenantId"],
  id: (typeof salesOrders.$inferSelect)["id"],
) {
  const rows = await db
    .select()
    .from(salesOrders)
    .where(
      and(
        eq(salesOrders.tenantId, tenantId),
        eq(salesOrders.id, id),
        isNull(salesOrders.deletedAt),
      ),
    )
    .limit(1);
  return rows[0] ?? null;
}

/** Same as getSalesOrdersByIdSafe; asserts graph-validation policy when GRAPH_VALIDATION_POLICY_JSON is set. */
export async function getSalesOrdersByIdSafeGuarded(
  db: Database,
  tenantId: (typeof salesOrders.$inferSelect)["tenantId"],
  id: (typeof salesOrders.$inferSelect)["id"],
) {
  await assertGraphGuardrailAllowsRead();
  return getSalesOrdersByIdSafe(db, tenantId, id);
}

/** List rows for tenant excluding soft-deleted. */
export async function listSalesOrdersActive(
  db: Database,
  tenantId: (typeof salesOrders.$inferSelect)["tenantId"],
) {
  return await db
    .select()
    .from(salesOrders)
    .where(and(eq(salesOrders.tenantId, tenantId), isNull(salesOrders.deletedAt)));
}

export async function listSalesOrdersActiveGuarded(
  db: Database,
  tenantId: (typeof salesOrders.$inferSelect)["tenantId"],
) {
  await assertGraphGuardrailAllowsRead();
  return listSalesOrdersActive(db, tenantId);
}

/** List all rows for tenant including soft-deleted. */
export async function listSalesOrdersAll(
  db: Database,
  tenantId: (typeof salesOrders.$inferSelect)["tenantId"],
) {
  return await db.select().from(salesOrders).where(eq(salesOrders.tenantId, tenantId));
}

export async function listSalesOrdersAllGuarded(
  db: Database,
  tenantId: (typeof salesOrders.$inferSelect)["tenantId"],
) {
  await assertGraphGuardrailAllowsRead();
  return listSalesOrdersAll(db, tenantId);
}

/** Soft-archive (mechanical delete flag). */
export async function archiveSalesOrders(
  db: Database,
  tenantId: (typeof salesOrders.$inferSelect)["tenantId"],
  id: (typeof salesOrders.$inferSelect)["id"],
) {
  return await db
    .update(salesOrders)
    .set({ deletedAt: new Date() })
    .where(and(eq(salesOrders.tenantId, tenantId), eq(salesOrders.id, id)));
}

export async function archiveSalesOrdersGuarded(
  db: Database,
  tenantId: (typeof salesOrders.$inferSelect)["tenantId"],
  id: (typeof salesOrders.$inferSelect)["id"],
) {
  await assertGraphGuardrailAllowsRead();
  return archiveSalesOrders(db, tenantId, id);
}


/** Safe by ID: tenant + not soft-deleted. */
export async function getSalesOrderLinesByIdSafe(
  db: Database,
  tenantId: (typeof salesOrderLines.$inferSelect)["tenantId"],
  id: (typeof salesOrderLines.$inferSelect)["id"],
) {
  const rows = await db
    .select()
    .from(salesOrderLines)
    .where(
      and(
        eq(salesOrderLines.tenantId, tenantId),
        eq(salesOrderLines.id, id),
        isNull(salesOrderLines.deletedAt),
      ),
    )
    .limit(1);
  return rows[0] ?? null;
}

/** Same as getSalesOrderLinesByIdSafe; asserts graph-validation policy when GRAPH_VALIDATION_POLICY_JSON is set. */
export async function getSalesOrderLinesByIdSafeGuarded(
  db: Database,
  tenantId: (typeof salesOrderLines.$inferSelect)["tenantId"],
  id: (typeof salesOrderLines.$inferSelect)["id"],
) {
  await assertGraphGuardrailAllowsRead();
  return getSalesOrderLinesByIdSafe(db, tenantId, id);
}

/** List rows for tenant excluding soft-deleted. */
export async function listSalesOrderLinesActive(
  db: Database,
  tenantId: (typeof salesOrderLines.$inferSelect)["tenantId"],
) {
  return await db
    .select()
    .from(salesOrderLines)
    .where(and(eq(salesOrderLines.tenantId, tenantId), isNull(salesOrderLines.deletedAt)));
}

export async function listSalesOrderLinesActiveGuarded(
  db: Database,
  tenantId: (typeof salesOrderLines.$inferSelect)["tenantId"],
) {
  await assertGraphGuardrailAllowsRead();
  return listSalesOrderLinesActive(db, tenantId);
}

/** List all rows for tenant including soft-deleted. */
export async function listSalesOrderLinesAll(
  db: Database,
  tenantId: (typeof salesOrderLines.$inferSelect)["tenantId"],
) {
  return await db.select().from(salesOrderLines).where(eq(salesOrderLines.tenantId, tenantId));
}

export async function listSalesOrderLinesAllGuarded(
  db: Database,
  tenantId: (typeof salesOrderLines.$inferSelect)["tenantId"],
) {
  await assertGraphGuardrailAllowsRead();
  return listSalesOrderLinesAll(db, tenantId);
}

/** Soft-archive (mechanical delete flag). */
export async function archiveSalesOrderLines(
  db: Database,
  tenantId: (typeof salesOrderLines.$inferSelect)["tenantId"],
  id: (typeof salesOrderLines.$inferSelect)["id"],
) {
  return await db
    .update(salesOrderLines)
    .set({ deletedAt: new Date() })
    .where(and(eq(salesOrderLines.tenantId, tenantId), eq(salesOrderLines.id, id)));
}

export async function archiveSalesOrderLinesGuarded(
  db: Database,
  tenantId: (typeof salesOrderLines.$inferSelect)["tenantId"],
  id: (typeof salesOrderLines.$inferSelect)["id"],
) {
  await assertGraphGuardrailAllowsRead();
  return archiveSalesOrderLines(db, tenantId, id);
}


/** Safe by ID: tenant + not soft-deleted. */
export async function getPaymentTermsByIdSafe(
  db: Database,
  tenantId: (typeof paymentTerms.$inferSelect)["tenantId"],
  id: (typeof paymentTerms.$inferSelect)["id"],
) {
  const rows = await db
    .select()
    .from(paymentTerms)
    .where(
      and(
        eq(paymentTerms.tenantId, tenantId),
        eq(paymentTerms.id, id),
        isNull(paymentTerms.deletedAt),
      ),
    )
    .limit(1);
  return rows[0] ?? null;
}

/** Same as getPaymentTermsByIdSafe; asserts graph-validation policy when GRAPH_VALIDATION_POLICY_JSON is set. */
export async function getPaymentTermsByIdSafeGuarded(
  db: Database,
  tenantId: (typeof paymentTerms.$inferSelect)["tenantId"],
  id: (typeof paymentTerms.$inferSelect)["id"],
) {
  await assertGraphGuardrailAllowsRead();
  return getPaymentTermsByIdSafe(db, tenantId, id);
}

/** List rows for tenant excluding soft-deleted. */
export async function listPaymentTermsActive(
  db: Database,
  tenantId: (typeof paymentTerms.$inferSelect)["tenantId"],
) {
  return await db
    .select()
    .from(paymentTerms)
    .where(and(eq(paymentTerms.tenantId, tenantId), isNull(paymentTerms.deletedAt)));
}

export async function listPaymentTermsActiveGuarded(
  db: Database,
  tenantId: (typeof paymentTerms.$inferSelect)["tenantId"],
) {
  await assertGraphGuardrailAllowsRead();
  return listPaymentTermsActive(db, tenantId);
}

/** List all rows for tenant including soft-deleted. */
export async function listPaymentTermsAll(
  db: Database,
  tenantId: (typeof paymentTerms.$inferSelect)["tenantId"],
) {
  return await db.select().from(paymentTerms).where(eq(paymentTerms.tenantId, tenantId));
}

export async function listPaymentTermsAllGuarded(
  db: Database,
  tenantId: (typeof paymentTerms.$inferSelect)["tenantId"],
) {
  await assertGraphGuardrailAllowsRead();
  return listPaymentTermsAll(db, tenantId);
}

/** Soft-archive (mechanical delete flag). */
export async function archivePaymentTerms(
  db: Database,
  tenantId: (typeof paymentTerms.$inferSelect)["tenantId"],
  id: (typeof paymentTerms.$inferSelect)["id"],
) {
  return await db
    .update(paymentTerms)
    .set({ deletedAt: new Date() })
    .where(and(eq(paymentTerms.tenantId, tenantId), eq(paymentTerms.id, id)));
}

export async function archivePaymentTermsGuarded(
  db: Database,
  tenantId: (typeof paymentTerms.$inferSelect)["tenantId"],
  id: (typeof paymentTerms.$inferSelect)["id"],
) {
  await assertGraphGuardrailAllowsRead();
  return archivePaymentTerms(db, tenantId, id);
}


/** By ID for tenant (no soft-delete column on table). */
export async function getPaymentTermLinesById(
  db: Database,
  tenantId: (typeof paymentTermLines.$inferSelect)["tenantId"],
  id: (typeof paymentTermLines.$inferSelect)["id"],
) {
  const rows = await db
    .select()
    .from(paymentTermLines)
    .where(and(eq(paymentTermLines.tenantId, tenantId), eq(paymentTermLines.id, id)))
    .limit(1);
  return rows[0] ?? null;
}

export async function getPaymentTermLinesByIdGuarded(
  db: Database,
  tenantId: (typeof paymentTermLines.$inferSelect)["tenantId"],
  id: (typeof paymentTermLines.$inferSelect)["id"],
) {
  await assertGraphGuardrailAllowsRead();
  return getPaymentTermLinesById(db, tenantId, id);
}

/** List rows for tenant. */
export async function listPaymentTermLines(
  db: Database,
  tenantId: (typeof paymentTermLines.$inferSelect)["tenantId"],
) {
  return await db.select().from(paymentTermLines).where(eq(paymentTermLines.tenantId, tenantId));
}

export async function listPaymentTermLinesGuarded(
  db: Database,
  tenantId: (typeof paymentTermLines.$inferSelect)["tenantId"],
) {
  await assertGraphGuardrailAllowsRead();
  return listPaymentTermLines(db, tenantId);
}


/** Safe by ID: tenant + not soft-deleted. */
export async function getPricelistsByIdSafe(
  db: Database,
  tenantId: (typeof pricelists.$inferSelect)["tenantId"],
  id: (typeof pricelists.$inferSelect)["id"],
) {
  const rows = await db
    .select()
    .from(pricelists)
    .where(
      and(
        eq(pricelists.tenantId, tenantId),
        eq(pricelists.id, id),
        isNull(pricelists.deletedAt),
      ),
    )
    .limit(1);
  return rows[0] ?? null;
}

/** Same as getPricelistsByIdSafe; asserts graph-validation policy when GRAPH_VALIDATION_POLICY_JSON is set. */
export async function getPricelistsByIdSafeGuarded(
  db: Database,
  tenantId: (typeof pricelists.$inferSelect)["tenantId"],
  id: (typeof pricelists.$inferSelect)["id"],
) {
  await assertGraphGuardrailAllowsRead();
  return getPricelistsByIdSafe(db, tenantId, id);
}

/** List rows for tenant excluding soft-deleted. */
export async function listPricelistsActive(
  db: Database,
  tenantId: (typeof pricelists.$inferSelect)["tenantId"],
) {
  return await db
    .select()
    .from(pricelists)
    .where(and(eq(pricelists.tenantId, tenantId), isNull(pricelists.deletedAt)));
}

export async function listPricelistsActiveGuarded(
  db: Database,
  tenantId: (typeof pricelists.$inferSelect)["tenantId"],
) {
  await assertGraphGuardrailAllowsRead();
  return listPricelistsActive(db, tenantId);
}

/** List all rows for tenant including soft-deleted. */
export async function listPricelistsAll(
  db: Database,
  tenantId: (typeof pricelists.$inferSelect)["tenantId"],
) {
  return await db.select().from(pricelists).where(eq(pricelists.tenantId, tenantId));
}

export async function listPricelistsAllGuarded(
  db: Database,
  tenantId: (typeof pricelists.$inferSelect)["tenantId"],
) {
  await assertGraphGuardrailAllowsRead();
  return listPricelistsAll(db, tenantId);
}

/** Soft-archive (mechanical delete flag). */
export async function archivePricelists(
  db: Database,
  tenantId: (typeof pricelists.$inferSelect)["tenantId"],
  id: (typeof pricelists.$inferSelect)["id"],
) {
  return await db
    .update(pricelists)
    .set({ deletedAt: new Date() })
    .where(and(eq(pricelists.tenantId, tenantId), eq(pricelists.id, id)));
}

export async function archivePricelistsGuarded(
  db: Database,
  tenantId: (typeof pricelists.$inferSelect)["tenantId"],
  id: (typeof pricelists.$inferSelect)["id"],
) {
  await assertGraphGuardrailAllowsRead();
  return archivePricelists(db, tenantId, id);
}


/** Safe by ID: tenant + not soft-deleted. */
export async function getPricelistItemsByIdSafe(
  db: Database,
  tenantId: (typeof pricelistItems.$inferSelect)["tenantId"],
  id: (typeof pricelistItems.$inferSelect)["id"],
) {
  const rows = await db
    .select()
    .from(pricelistItems)
    .where(
      and(
        eq(pricelistItems.tenantId, tenantId),
        eq(pricelistItems.id, id),
        isNull(pricelistItems.deletedAt),
      ),
    )
    .limit(1);
  return rows[0] ?? null;
}

/** Same as getPricelistItemsByIdSafe; asserts graph-validation policy when GRAPH_VALIDATION_POLICY_JSON is set. */
export async function getPricelistItemsByIdSafeGuarded(
  db: Database,
  tenantId: (typeof pricelistItems.$inferSelect)["tenantId"],
  id: (typeof pricelistItems.$inferSelect)["id"],
) {
  await assertGraphGuardrailAllowsRead();
  return getPricelistItemsByIdSafe(db, tenantId, id);
}

/** List rows for tenant excluding soft-deleted. */
export async function listPricelistItemsActive(
  db: Database,
  tenantId: (typeof pricelistItems.$inferSelect)["tenantId"],
) {
  return await db
    .select()
    .from(pricelistItems)
    .where(and(eq(pricelistItems.tenantId, tenantId), isNull(pricelistItems.deletedAt)));
}

export async function listPricelistItemsActiveGuarded(
  db: Database,
  tenantId: (typeof pricelistItems.$inferSelect)["tenantId"],
) {
  await assertGraphGuardrailAllowsRead();
  return listPricelistItemsActive(db, tenantId);
}

/** List all rows for tenant including soft-deleted. */
export async function listPricelistItemsAll(
  db: Database,
  tenantId: (typeof pricelistItems.$inferSelect)["tenantId"],
) {
  return await db.select().from(pricelistItems).where(eq(pricelistItems.tenantId, tenantId));
}

export async function listPricelistItemsAllGuarded(
  db: Database,
  tenantId: (typeof pricelistItems.$inferSelect)["tenantId"],
) {
  await assertGraphGuardrailAllowsRead();
  return listPricelistItemsAll(db, tenantId);
}

/** Soft-archive (mechanical delete flag). */
export async function archivePricelistItems(
  db: Database,
  tenantId: (typeof pricelistItems.$inferSelect)["tenantId"],
  id: (typeof pricelistItems.$inferSelect)["id"],
) {
  return await db
    .update(pricelistItems)
    .set({ deletedAt: new Date() })
    .where(and(eq(pricelistItems.tenantId, tenantId), eq(pricelistItems.id, id)));
}

export async function archivePricelistItemsGuarded(
  db: Database,
  tenantId: (typeof pricelistItems.$inferSelect)["tenantId"],
  id: (typeof pricelistItems.$inferSelect)["id"],
) {
  await assertGraphGuardrailAllowsRead();
  return archivePricelistItems(db, tenantId, id);
}


/** Safe by ID: tenant + not soft-deleted. */
export async function getTaxGroupsByIdSafe(
  db: Database,
  tenantId: (typeof taxGroups.$inferSelect)["tenantId"],
  id: (typeof taxGroups.$inferSelect)["id"],
) {
  const rows = await db
    .select()
    .from(taxGroups)
    .where(
      and(
        eq(taxGroups.tenantId, tenantId),
        eq(taxGroups.id, id),
        isNull(taxGroups.deletedAt),
      ),
    )
    .limit(1);
  return rows[0] ?? null;
}

/** Same as getTaxGroupsByIdSafe; asserts graph-validation policy when GRAPH_VALIDATION_POLICY_JSON is set. */
export async function getTaxGroupsByIdSafeGuarded(
  db: Database,
  tenantId: (typeof taxGroups.$inferSelect)["tenantId"],
  id: (typeof taxGroups.$inferSelect)["id"],
) {
  await assertGraphGuardrailAllowsRead();
  return getTaxGroupsByIdSafe(db, tenantId, id);
}

/** List rows for tenant excluding soft-deleted. */
export async function listTaxGroupsActive(
  db: Database,
  tenantId: (typeof taxGroups.$inferSelect)["tenantId"],
) {
  return await db
    .select()
    .from(taxGroups)
    .where(and(eq(taxGroups.tenantId, tenantId), isNull(taxGroups.deletedAt)));
}

export async function listTaxGroupsActiveGuarded(
  db: Database,
  tenantId: (typeof taxGroups.$inferSelect)["tenantId"],
) {
  await assertGraphGuardrailAllowsRead();
  return listTaxGroupsActive(db, tenantId);
}

/** List all rows for tenant including soft-deleted. */
export async function listTaxGroupsAll(
  db: Database,
  tenantId: (typeof taxGroups.$inferSelect)["tenantId"],
) {
  return await db.select().from(taxGroups).where(eq(taxGroups.tenantId, tenantId));
}

export async function listTaxGroupsAllGuarded(
  db: Database,
  tenantId: (typeof taxGroups.$inferSelect)["tenantId"],
) {
  await assertGraphGuardrailAllowsRead();
  return listTaxGroupsAll(db, tenantId);
}

/** Soft-archive (mechanical delete flag). */
export async function archiveTaxGroups(
  db: Database,
  tenantId: (typeof taxGroups.$inferSelect)["tenantId"],
  id: (typeof taxGroups.$inferSelect)["id"],
) {
  return await db
    .update(taxGroups)
    .set({ deletedAt: new Date() })
    .where(and(eq(taxGroups.tenantId, tenantId), eq(taxGroups.id, id)));
}

export async function archiveTaxGroupsGuarded(
  db: Database,
  tenantId: (typeof taxGroups.$inferSelect)["tenantId"],
  id: (typeof taxGroups.$inferSelect)["id"],
) {
  await assertGraphGuardrailAllowsRead();
  return archiveTaxGroups(db, tenantId, id);
}


/** Safe by ID: tenant + not soft-deleted. */
export async function getTaxRatesByIdSafe(
  db: Database,
  tenantId: (typeof taxRates.$inferSelect)["tenantId"],
  id: (typeof taxRates.$inferSelect)["id"],
) {
  const rows = await db
    .select()
    .from(taxRates)
    .where(
      and(
        eq(taxRates.tenantId, tenantId),
        eq(taxRates.id, id),
        isNull(taxRates.deletedAt),
      ),
    )
    .limit(1);
  return rows[0] ?? null;
}

/** Same as getTaxRatesByIdSafe; asserts graph-validation policy when GRAPH_VALIDATION_POLICY_JSON is set. */
export async function getTaxRatesByIdSafeGuarded(
  db: Database,
  tenantId: (typeof taxRates.$inferSelect)["tenantId"],
  id: (typeof taxRates.$inferSelect)["id"],
) {
  await assertGraphGuardrailAllowsRead();
  return getTaxRatesByIdSafe(db, tenantId, id);
}

/** List rows for tenant excluding soft-deleted. */
export async function listTaxRatesActive(
  db: Database,
  tenantId: (typeof taxRates.$inferSelect)["tenantId"],
) {
  return await db
    .select()
    .from(taxRates)
    .where(and(eq(taxRates.tenantId, tenantId), isNull(taxRates.deletedAt)));
}

export async function listTaxRatesActiveGuarded(
  db: Database,
  tenantId: (typeof taxRates.$inferSelect)["tenantId"],
) {
  await assertGraphGuardrailAllowsRead();
  return listTaxRatesActive(db, tenantId);
}

/** List all rows for tenant including soft-deleted. */
export async function listTaxRatesAll(
  db: Database,
  tenantId: (typeof taxRates.$inferSelect)["tenantId"],
) {
  return await db.select().from(taxRates).where(eq(taxRates.tenantId, tenantId));
}

export async function listTaxRatesAllGuarded(
  db: Database,
  tenantId: (typeof taxRates.$inferSelect)["tenantId"],
) {
  await assertGraphGuardrailAllowsRead();
  return listTaxRatesAll(db, tenantId);
}

/** Soft-archive (mechanical delete flag). */
export async function archiveTaxRates(
  db: Database,
  tenantId: (typeof taxRates.$inferSelect)["tenantId"],
  id: (typeof taxRates.$inferSelect)["id"],
) {
  return await db
    .update(taxRates)
    .set({ deletedAt: new Date() })
    .where(and(eq(taxRates.tenantId, tenantId), eq(taxRates.id, id)));
}

export async function archiveTaxRatesGuarded(
  db: Database,
  tenantId: (typeof taxRates.$inferSelect)["tenantId"],
  id: (typeof taxRates.$inferSelect)["id"],
) {
  await assertGraphGuardrailAllowsRead();
  return archiveTaxRates(db, tenantId, id);
}


/** By ID for tenant (no soft-delete column on table). */
export async function getTaxRateChildrenById(
  db: Database,
  tenantId: (typeof taxRateChildren.$inferSelect)["tenantId"],
  id: (typeof taxRateChildren.$inferSelect)["id"],
) {
  const rows = await db
    .select()
    .from(taxRateChildren)
    .where(and(eq(taxRateChildren.tenantId, tenantId), eq(taxRateChildren.id, id)))
    .limit(1);
  return rows[0] ?? null;
}

export async function getTaxRateChildrenByIdGuarded(
  db: Database,
  tenantId: (typeof taxRateChildren.$inferSelect)["tenantId"],
  id: (typeof taxRateChildren.$inferSelect)["id"],
) {
  await assertGraphGuardrailAllowsRead();
  return getTaxRateChildrenById(db, tenantId, id);
}

/** List rows for tenant. */
export async function listTaxRateChildren(
  db: Database,
  tenantId: (typeof taxRateChildren.$inferSelect)["tenantId"],
) {
  return await db.select().from(taxRateChildren).where(eq(taxRateChildren.tenantId, tenantId));
}

export async function listTaxRateChildrenGuarded(
  db: Database,
  tenantId: (typeof taxRateChildren.$inferSelect)["tenantId"],
) {
  await assertGraphGuardrailAllowsRead();
  return listTaxRateChildren(db, tenantId);
}


/** Safe by ID: tenant + not soft-deleted. */
export async function getFiscalPositionsByIdSafe(
  db: Database,
  tenantId: (typeof fiscalPositions.$inferSelect)["tenantId"],
  id: (typeof fiscalPositions.$inferSelect)["id"],
) {
  const rows = await db
    .select()
    .from(fiscalPositions)
    .where(
      and(
        eq(fiscalPositions.tenantId, tenantId),
        eq(fiscalPositions.id, id),
        isNull(fiscalPositions.deletedAt),
      ),
    )
    .limit(1);
  return rows[0] ?? null;
}

/** Same as getFiscalPositionsByIdSafe; asserts graph-validation policy when GRAPH_VALIDATION_POLICY_JSON is set. */
export async function getFiscalPositionsByIdSafeGuarded(
  db: Database,
  tenantId: (typeof fiscalPositions.$inferSelect)["tenantId"],
  id: (typeof fiscalPositions.$inferSelect)["id"],
) {
  await assertGraphGuardrailAllowsRead();
  return getFiscalPositionsByIdSafe(db, tenantId, id);
}

/** List rows for tenant excluding soft-deleted. */
export async function listFiscalPositionsActive(
  db: Database,
  tenantId: (typeof fiscalPositions.$inferSelect)["tenantId"],
) {
  return await db
    .select()
    .from(fiscalPositions)
    .where(and(eq(fiscalPositions.tenantId, tenantId), isNull(fiscalPositions.deletedAt)));
}

export async function listFiscalPositionsActiveGuarded(
  db: Database,
  tenantId: (typeof fiscalPositions.$inferSelect)["tenantId"],
) {
  await assertGraphGuardrailAllowsRead();
  return listFiscalPositionsActive(db, tenantId);
}

/** List all rows for tenant including soft-deleted. */
export async function listFiscalPositionsAll(
  db: Database,
  tenantId: (typeof fiscalPositions.$inferSelect)["tenantId"],
) {
  return await db.select().from(fiscalPositions).where(eq(fiscalPositions.tenantId, tenantId));
}

export async function listFiscalPositionsAllGuarded(
  db: Database,
  tenantId: (typeof fiscalPositions.$inferSelect)["tenantId"],
) {
  await assertGraphGuardrailAllowsRead();
  return listFiscalPositionsAll(db, tenantId);
}

/** Soft-archive (mechanical delete flag). */
export async function archiveFiscalPositions(
  db: Database,
  tenantId: (typeof fiscalPositions.$inferSelect)["tenantId"],
  id: (typeof fiscalPositions.$inferSelect)["id"],
) {
  return await db
    .update(fiscalPositions)
    .set({ deletedAt: new Date() })
    .where(and(eq(fiscalPositions.tenantId, tenantId), eq(fiscalPositions.id, id)));
}

export async function archiveFiscalPositionsGuarded(
  db: Database,
  tenantId: (typeof fiscalPositions.$inferSelect)["tenantId"],
  id: (typeof fiscalPositions.$inferSelect)["id"],
) {
  await assertGraphGuardrailAllowsRead();
  return archiveFiscalPositions(db, tenantId, id);
}


/** By ID for tenant (no soft-delete column on table). */
export async function getFiscalPositionTaxMapsById(
  db: Database,
  tenantId: (typeof fiscalPositionTaxMaps.$inferSelect)["tenantId"],
  id: (typeof fiscalPositionTaxMaps.$inferSelect)["id"],
) {
  const rows = await db
    .select()
    .from(fiscalPositionTaxMaps)
    .where(and(eq(fiscalPositionTaxMaps.tenantId, tenantId), eq(fiscalPositionTaxMaps.id, id)))
    .limit(1);
  return rows[0] ?? null;
}

export async function getFiscalPositionTaxMapsByIdGuarded(
  db: Database,
  tenantId: (typeof fiscalPositionTaxMaps.$inferSelect)["tenantId"],
  id: (typeof fiscalPositionTaxMaps.$inferSelect)["id"],
) {
  await assertGraphGuardrailAllowsRead();
  return getFiscalPositionTaxMapsById(db, tenantId, id);
}

/** List rows for tenant. */
export async function listFiscalPositionTaxMaps(
  db: Database,
  tenantId: (typeof fiscalPositionTaxMaps.$inferSelect)["tenantId"],
) {
  return await db.select().from(fiscalPositionTaxMaps).where(eq(fiscalPositionTaxMaps.tenantId, tenantId));
}

export async function listFiscalPositionTaxMapsGuarded(
  db: Database,
  tenantId: (typeof fiscalPositionTaxMaps.$inferSelect)["tenantId"],
) {
  await assertGraphGuardrailAllowsRead();
  return listFiscalPositionTaxMaps(db, tenantId);
}


/** By ID for tenant (no soft-delete column on table). */
export async function getFiscalPositionAccountMapsById(
  db: Database,
  tenantId: (typeof fiscalPositionAccountMaps.$inferSelect)["tenantId"],
  id: (typeof fiscalPositionAccountMaps.$inferSelect)["id"],
) {
  const rows = await db
    .select()
    .from(fiscalPositionAccountMaps)
    .where(and(eq(fiscalPositionAccountMaps.tenantId, tenantId), eq(fiscalPositionAccountMaps.id, id)))
    .limit(1);
  return rows[0] ?? null;
}

export async function getFiscalPositionAccountMapsByIdGuarded(
  db: Database,
  tenantId: (typeof fiscalPositionAccountMaps.$inferSelect)["tenantId"],
  id: (typeof fiscalPositionAccountMaps.$inferSelect)["id"],
) {
  await assertGraphGuardrailAllowsRead();
  return getFiscalPositionAccountMapsById(db, tenantId, id);
}

/** List rows for tenant. */
export async function listFiscalPositionAccountMaps(
  db: Database,
  tenantId: (typeof fiscalPositionAccountMaps.$inferSelect)["tenantId"],
) {
  return await db.select().from(fiscalPositionAccountMaps).where(eq(fiscalPositionAccountMaps.tenantId, tenantId));
}

export async function listFiscalPositionAccountMapsGuarded(
  db: Database,
  tenantId: (typeof fiscalPositionAccountMaps.$inferSelect)["tenantId"],
) {
  await assertGraphGuardrailAllowsRead();
  return listFiscalPositionAccountMaps(db, tenantId);
}


/** By ID for tenant (no soft-delete column on table). */
export async function getSaleOrderLineTaxesById(
  db: Database,
  tenantId: (typeof saleOrderLineTaxes.$inferSelect)["tenantId"],
  id: (typeof saleOrderLineTaxes.$inferSelect)["id"],
) {
  const rows = await db
    .select()
    .from(saleOrderLineTaxes)
    .where(and(eq(saleOrderLineTaxes.tenantId, tenantId), eq(saleOrderLineTaxes.id, id)))
    .limit(1);
  return rows[0] ?? null;
}

export async function getSaleOrderLineTaxesByIdGuarded(
  db: Database,
  tenantId: (typeof saleOrderLineTaxes.$inferSelect)["tenantId"],
  id: (typeof saleOrderLineTaxes.$inferSelect)["id"],
) {
  await assertGraphGuardrailAllowsRead();
  return getSaleOrderLineTaxesById(db, tenantId, id);
}

/** List rows for tenant. */
export async function listSaleOrderLineTaxes(
  db: Database,
  tenantId: (typeof saleOrderLineTaxes.$inferSelect)["tenantId"],
) {
  return await db.select().from(saleOrderLineTaxes).where(eq(saleOrderLineTaxes.tenantId, tenantId));
}

export async function listSaleOrderLineTaxesGuarded(
  db: Database,
  tenantId: (typeof saleOrderLineTaxes.$inferSelect)["tenantId"],
) {
  await assertGraphGuardrailAllowsRead();
  return listSaleOrderLineTaxes(db, tenantId);
}


/** By ID for tenant (no soft-delete column on table). */
export async function getSaleOrderOptionLinesById(
  db: Database,
  tenantId: (typeof saleOrderOptionLines.$inferSelect)["tenantId"],
  id: (typeof saleOrderOptionLines.$inferSelect)["id"],
) {
  const rows = await db
    .select()
    .from(saleOrderOptionLines)
    .where(and(eq(saleOrderOptionLines.tenantId, tenantId), eq(saleOrderOptionLines.id, id)))
    .limit(1);
  return rows[0] ?? null;
}

export async function getSaleOrderOptionLinesByIdGuarded(
  db: Database,
  tenantId: (typeof saleOrderOptionLines.$inferSelect)["tenantId"],
  id: (typeof saleOrderOptionLines.$inferSelect)["id"],
) {
  await assertGraphGuardrailAllowsRead();
  return getSaleOrderOptionLinesById(db, tenantId, id);
}

/** List rows for tenant. */
export async function listSaleOrderOptionLines(
  db: Database,
  tenantId: (typeof saleOrderOptionLines.$inferSelect)["tenantId"],
) {
  return await db.select().from(saleOrderOptionLines).where(eq(saleOrderOptionLines.tenantId, tenantId));
}

export async function listSaleOrderOptionLinesGuarded(
  db: Database,
  tenantId: (typeof saleOrderOptionLines.$inferSelect)["tenantId"],
) {
  await assertGraphGuardrailAllowsRead();
  return listSaleOrderOptionLines(db, tenantId);
}


/** By ID for tenant (no soft-delete column on table). */
export async function getSaleOrderStatusHistoryById(
  db: Database,
  tenantId: (typeof saleOrderStatusHistory.$inferSelect)["tenantId"],
  id: (typeof saleOrderStatusHistory.$inferSelect)["id"],
) {
  const rows = await db
    .select()
    .from(saleOrderStatusHistory)
    .where(and(eq(saleOrderStatusHistory.tenantId, tenantId), eq(saleOrderStatusHistory.id, id)))
    .limit(1);
  return rows[0] ?? null;
}

export async function getSaleOrderStatusHistoryByIdGuarded(
  db: Database,
  tenantId: (typeof saleOrderStatusHistory.$inferSelect)["tenantId"],
  id: (typeof saleOrderStatusHistory.$inferSelect)["id"],
) {
  await assertGraphGuardrailAllowsRead();
  return getSaleOrderStatusHistoryById(db, tenantId, id);
}

/** List rows for tenant. */
export async function listSaleOrderStatusHistory(
  db: Database,
  tenantId: (typeof saleOrderStatusHistory.$inferSelect)["tenantId"],
) {
  return await db.select().from(saleOrderStatusHistory).where(eq(saleOrderStatusHistory.tenantId, tenantId));
}

export async function listSaleOrderStatusHistoryGuarded(
  db: Database,
  tenantId: (typeof saleOrderStatusHistory.$inferSelect)["tenantId"],
) {
  await assertGraphGuardrailAllowsRead();
  return listSaleOrderStatusHistory(db, tenantId);
}


/** By ID for tenant (no soft-delete column on table). */
export async function getSaleOrderTaxSummaryById(
  db: Database,
  tenantId: (typeof saleOrderTaxSummary.$inferSelect)["tenantId"],
  id: (typeof saleOrderTaxSummary.$inferSelect)["id"],
) {
  const rows = await db
    .select()
    .from(saleOrderTaxSummary)
    .where(and(eq(saleOrderTaxSummary.tenantId, tenantId), eq(saleOrderTaxSummary.id, id)))
    .limit(1);
  return rows[0] ?? null;
}

export async function getSaleOrderTaxSummaryByIdGuarded(
  db: Database,
  tenantId: (typeof saleOrderTaxSummary.$inferSelect)["tenantId"],
  id: (typeof saleOrderTaxSummary.$inferSelect)["id"],
) {
  await assertGraphGuardrailAllowsRead();
  return getSaleOrderTaxSummaryById(db, tenantId, id);
}

/** List rows for tenant. */
export async function listSaleOrderTaxSummary(
  db: Database,
  tenantId: (typeof saleOrderTaxSummary.$inferSelect)["tenantId"],
) {
  return await db.select().from(saleOrderTaxSummary).where(eq(saleOrderTaxSummary.tenantId, tenantId));
}

export async function listSaleOrderTaxSummaryGuarded(
  db: Database,
  tenantId: (typeof saleOrderTaxSummary.$inferSelect)["tenantId"],
) {
  await assertGraphGuardrailAllowsRead();
  return listSaleOrderTaxSummary(db, tenantId);
}


/** Safe by ID: tenant + not soft-deleted. */
export async function getConsignmentAgreementsByIdSafe(
  db: Database,
  tenantId: (typeof consignmentAgreements.$inferSelect)["tenantId"],
  id: (typeof consignmentAgreements.$inferSelect)["id"],
) {
  const rows = await db
    .select()
    .from(consignmentAgreements)
    .where(
      and(
        eq(consignmentAgreements.tenantId, tenantId),
        eq(consignmentAgreements.id, id),
        isNull(consignmentAgreements.deletedAt),
      ),
    )
    .limit(1);
  return rows[0] ?? null;
}

/** Same as getConsignmentAgreementsByIdSafe; asserts graph-validation policy when GRAPH_VALIDATION_POLICY_JSON is set. */
export async function getConsignmentAgreementsByIdSafeGuarded(
  db: Database,
  tenantId: (typeof consignmentAgreements.$inferSelect)["tenantId"],
  id: (typeof consignmentAgreements.$inferSelect)["id"],
) {
  await assertGraphGuardrailAllowsRead();
  return getConsignmentAgreementsByIdSafe(db, tenantId, id);
}

/** List rows for tenant excluding soft-deleted. */
export async function listConsignmentAgreementsActive(
  db: Database,
  tenantId: (typeof consignmentAgreements.$inferSelect)["tenantId"],
) {
  return await db
    .select()
    .from(consignmentAgreements)
    .where(and(eq(consignmentAgreements.tenantId, tenantId), isNull(consignmentAgreements.deletedAt)));
}

export async function listConsignmentAgreementsActiveGuarded(
  db: Database,
  tenantId: (typeof consignmentAgreements.$inferSelect)["tenantId"],
) {
  await assertGraphGuardrailAllowsRead();
  return listConsignmentAgreementsActive(db, tenantId);
}

/** List all rows for tenant including soft-deleted. */
export async function listConsignmentAgreementsAll(
  db: Database,
  tenantId: (typeof consignmentAgreements.$inferSelect)["tenantId"],
) {
  return await db.select().from(consignmentAgreements).where(eq(consignmentAgreements.tenantId, tenantId));
}

export async function listConsignmentAgreementsAllGuarded(
  db: Database,
  tenantId: (typeof consignmentAgreements.$inferSelect)["tenantId"],
) {
  await assertGraphGuardrailAllowsRead();
  return listConsignmentAgreementsAll(db, tenantId);
}

/** Soft-archive (mechanical delete flag). */
export async function archiveConsignmentAgreements(
  db: Database,
  tenantId: (typeof consignmentAgreements.$inferSelect)["tenantId"],
  id: (typeof consignmentAgreements.$inferSelect)["id"],
) {
  return await db
    .update(consignmentAgreements)
    .set({ deletedAt: new Date() })
    .where(and(eq(consignmentAgreements.tenantId, tenantId), eq(consignmentAgreements.id, id)));
}

export async function archiveConsignmentAgreementsGuarded(
  db: Database,
  tenantId: (typeof consignmentAgreements.$inferSelect)["tenantId"],
  id: (typeof consignmentAgreements.$inferSelect)["id"],
) {
  await assertGraphGuardrailAllowsRead();
  return archiveConsignmentAgreements(db, tenantId, id);
}


/** Safe by ID: tenant + not soft-deleted. */
export async function getConsignmentAgreementLinesByIdSafe(
  db: Database,
  tenantId: (typeof consignmentAgreementLines.$inferSelect)["tenantId"],
  id: (typeof consignmentAgreementLines.$inferSelect)["id"],
) {
  const rows = await db
    .select()
    .from(consignmentAgreementLines)
    .where(
      and(
        eq(consignmentAgreementLines.tenantId, tenantId),
        eq(consignmentAgreementLines.id, id),
        isNull(consignmentAgreementLines.deletedAt),
      ),
    )
    .limit(1);
  return rows[0] ?? null;
}

/** Same as getConsignmentAgreementLinesByIdSafe; asserts graph-validation policy when GRAPH_VALIDATION_POLICY_JSON is set. */
export async function getConsignmentAgreementLinesByIdSafeGuarded(
  db: Database,
  tenantId: (typeof consignmentAgreementLines.$inferSelect)["tenantId"],
  id: (typeof consignmentAgreementLines.$inferSelect)["id"],
) {
  await assertGraphGuardrailAllowsRead();
  return getConsignmentAgreementLinesByIdSafe(db, tenantId, id);
}

/** List rows for tenant excluding soft-deleted. */
export async function listConsignmentAgreementLinesActive(
  db: Database,
  tenantId: (typeof consignmentAgreementLines.$inferSelect)["tenantId"],
) {
  return await db
    .select()
    .from(consignmentAgreementLines)
    .where(and(eq(consignmentAgreementLines.tenantId, tenantId), isNull(consignmentAgreementLines.deletedAt)));
}

export async function listConsignmentAgreementLinesActiveGuarded(
  db: Database,
  tenantId: (typeof consignmentAgreementLines.$inferSelect)["tenantId"],
) {
  await assertGraphGuardrailAllowsRead();
  return listConsignmentAgreementLinesActive(db, tenantId);
}

/** List all rows for tenant including soft-deleted. */
export async function listConsignmentAgreementLinesAll(
  db: Database,
  tenantId: (typeof consignmentAgreementLines.$inferSelect)["tenantId"],
) {
  return await db.select().from(consignmentAgreementLines).where(eq(consignmentAgreementLines.tenantId, tenantId));
}

export async function listConsignmentAgreementLinesAllGuarded(
  db: Database,
  tenantId: (typeof consignmentAgreementLines.$inferSelect)["tenantId"],
) {
  await assertGraphGuardrailAllowsRead();
  return listConsignmentAgreementLinesAll(db, tenantId);
}

/** Soft-archive (mechanical delete flag). */
export async function archiveConsignmentAgreementLines(
  db: Database,
  tenantId: (typeof consignmentAgreementLines.$inferSelect)["tenantId"],
  id: (typeof consignmentAgreementLines.$inferSelect)["id"],
) {
  return await db
    .update(consignmentAgreementLines)
    .set({ deletedAt: new Date() })
    .where(and(eq(consignmentAgreementLines.tenantId, tenantId), eq(consignmentAgreementLines.id, id)));
}

export async function archiveConsignmentAgreementLinesGuarded(
  db: Database,
  tenantId: (typeof consignmentAgreementLines.$inferSelect)["tenantId"],
  id: (typeof consignmentAgreementLines.$inferSelect)["id"],
) {
  await assertGraphGuardrailAllowsRead();
  return archiveConsignmentAgreementLines(db, tenantId, id);
}


/** Safe by ID: tenant + not soft-deleted. */
export async function getConsignmentStockReportsByIdSafe(
  db: Database,
  tenantId: (typeof consignmentStockReports.$inferSelect)["tenantId"],
  id: (typeof consignmentStockReports.$inferSelect)["id"],
) {
  const rows = await db
    .select()
    .from(consignmentStockReports)
    .where(
      and(
        eq(consignmentStockReports.tenantId, tenantId),
        eq(consignmentStockReports.id, id),
        isNull(consignmentStockReports.deletedAt),
      ),
    )
    .limit(1);
  return rows[0] ?? null;
}

/** Same as getConsignmentStockReportsByIdSafe; asserts graph-validation policy when GRAPH_VALIDATION_POLICY_JSON is set. */
export async function getConsignmentStockReportsByIdSafeGuarded(
  db: Database,
  tenantId: (typeof consignmentStockReports.$inferSelect)["tenantId"],
  id: (typeof consignmentStockReports.$inferSelect)["id"],
) {
  await assertGraphGuardrailAllowsRead();
  return getConsignmentStockReportsByIdSafe(db, tenantId, id);
}

/** List rows for tenant excluding soft-deleted. */
export async function listConsignmentStockReportsActive(
  db: Database,
  tenantId: (typeof consignmentStockReports.$inferSelect)["tenantId"],
) {
  return await db
    .select()
    .from(consignmentStockReports)
    .where(and(eq(consignmentStockReports.tenantId, tenantId), isNull(consignmentStockReports.deletedAt)));
}

export async function listConsignmentStockReportsActiveGuarded(
  db: Database,
  tenantId: (typeof consignmentStockReports.$inferSelect)["tenantId"],
) {
  await assertGraphGuardrailAllowsRead();
  return listConsignmentStockReportsActive(db, tenantId);
}

/** List all rows for tenant including soft-deleted. */
export async function listConsignmentStockReportsAll(
  db: Database,
  tenantId: (typeof consignmentStockReports.$inferSelect)["tenantId"],
) {
  return await db.select().from(consignmentStockReports).where(eq(consignmentStockReports.tenantId, tenantId));
}

export async function listConsignmentStockReportsAllGuarded(
  db: Database,
  tenantId: (typeof consignmentStockReports.$inferSelect)["tenantId"],
) {
  await assertGraphGuardrailAllowsRead();
  return listConsignmentStockReportsAll(db, tenantId);
}

/** Soft-archive (mechanical delete flag). */
export async function archiveConsignmentStockReports(
  db: Database,
  tenantId: (typeof consignmentStockReports.$inferSelect)["tenantId"],
  id: (typeof consignmentStockReports.$inferSelect)["id"],
) {
  return await db
    .update(consignmentStockReports)
    .set({ deletedAt: new Date() })
    .where(and(eq(consignmentStockReports.tenantId, tenantId), eq(consignmentStockReports.id, id)));
}

export async function archiveConsignmentStockReportsGuarded(
  db: Database,
  tenantId: (typeof consignmentStockReports.$inferSelect)["tenantId"],
  id: (typeof consignmentStockReports.$inferSelect)["id"],
) {
  await assertGraphGuardrailAllowsRead();
  return archiveConsignmentStockReports(db, tenantId, id);
}


/** By ID for tenant (no soft-delete column on table). */
export async function getConsignmentStockReportLinesById(
  db: Database,
  tenantId: (typeof consignmentStockReportLines.$inferSelect)["tenantId"],
  id: (typeof consignmentStockReportLines.$inferSelect)["id"],
) {
  const rows = await db
    .select()
    .from(consignmentStockReportLines)
    .where(and(eq(consignmentStockReportLines.tenantId, tenantId), eq(consignmentStockReportLines.id, id)))
    .limit(1);
  return rows[0] ?? null;
}

export async function getConsignmentStockReportLinesByIdGuarded(
  db: Database,
  tenantId: (typeof consignmentStockReportLines.$inferSelect)["tenantId"],
  id: (typeof consignmentStockReportLines.$inferSelect)["id"],
) {
  await assertGraphGuardrailAllowsRead();
  return getConsignmentStockReportLinesById(db, tenantId, id);
}

/** List rows for tenant. */
export async function listConsignmentStockReportLines(
  db: Database,
  tenantId: (typeof consignmentStockReportLines.$inferSelect)["tenantId"],
) {
  return await db.select().from(consignmentStockReportLines).where(eq(consignmentStockReportLines.tenantId, tenantId));
}

export async function listConsignmentStockReportLinesGuarded(
  db: Database,
  tenantId: (typeof consignmentStockReportLines.$inferSelect)["tenantId"],
) {
  await assertGraphGuardrailAllowsRead();
  return listConsignmentStockReportLines(db, tenantId);
}


/** Safe by ID: tenant + not soft-deleted. */
export async function getReturnReasonCodesByIdSafe(
  db: Database,
  tenantId: (typeof returnReasonCodes.$inferSelect)["tenantId"],
  id: (typeof returnReasonCodes.$inferSelect)["id"],
) {
  const rows = await db
    .select()
    .from(returnReasonCodes)
    .where(
      and(
        eq(returnReasonCodes.tenantId, tenantId),
        eq(returnReasonCodes.id, id),
        isNull(returnReasonCodes.deletedAt),
      ),
    )
    .limit(1);
  return rows[0] ?? null;
}

/** Same as getReturnReasonCodesByIdSafe; asserts graph-validation policy when GRAPH_VALIDATION_POLICY_JSON is set. */
export async function getReturnReasonCodesByIdSafeGuarded(
  db: Database,
  tenantId: (typeof returnReasonCodes.$inferSelect)["tenantId"],
  id: (typeof returnReasonCodes.$inferSelect)["id"],
) {
  await assertGraphGuardrailAllowsRead();
  return getReturnReasonCodesByIdSafe(db, tenantId, id);
}

/** List rows for tenant excluding soft-deleted. */
export async function listReturnReasonCodesActive(
  db: Database,
  tenantId: (typeof returnReasonCodes.$inferSelect)["tenantId"],
) {
  return await db
    .select()
    .from(returnReasonCodes)
    .where(and(eq(returnReasonCodes.tenantId, tenantId), isNull(returnReasonCodes.deletedAt)));
}

export async function listReturnReasonCodesActiveGuarded(
  db: Database,
  tenantId: (typeof returnReasonCodes.$inferSelect)["tenantId"],
) {
  await assertGraphGuardrailAllowsRead();
  return listReturnReasonCodesActive(db, tenantId);
}

/** List all rows for tenant including soft-deleted. */
export async function listReturnReasonCodesAll(
  db: Database,
  tenantId: (typeof returnReasonCodes.$inferSelect)["tenantId"],
) {
  return await db.select().from(returnReasonCodes).where(eq(returnReasonCodes.tenantId, tenantId));
}

export async function listReturnReasonCodesAllGuarded(
  db: Database,
  tenantId: (typeof returnReasonCodes.$inferSelect)["tenantId"],
) {
  await assertGraphGuardrailAllowsRead();
  return listReturnReasonCodesAll(db, tenantId);
}

/** Soft-archive (mechanical delete flag). */
export async function archiveReturnReasonCodes(
  db: Database,
  tenantId: (typeof returnReasonCodes.$inferSelect)["tenantId"],
  id: (typeof returnReasonCodes.$inferSelect)["id"],
) {
  return await db
    .update(returnReasonCodes)
    .set({ deletedAt: new Date() })
    .where(and(eq(returnReasonCodes.tenantId, tenantId), eq(returnReasonCodes.id, id)));
}

export async function archiveReturnReasonCodesGuarded(
  db: Database,
  tenantId: (typeof returnReasonCodes.$inferSelect)["tenantId"],
  id: (typeof returnReasonCodes.$inferSelect)["id"],
) {
  await assertGraphGuardrailAllowsRead();
  return archiveReturnReasonCodes(db, tenantId, id);
}


/** Safe by ID: tenant + not soft-deleted. */
export async function getReturnOrdersByIdSafe(
  db: Database,
  tenantId: (typeof returnOrders.$inferSelect)["tenantId"],
  id: (typeof returnOrders.$inferSelect)["id"],
) {
  const rows = await db
    .select()
    .from(returnOrders)
    .where(
      and(
        eq(returnOrders.tenantId, tenantId),
        eq(returnOrders.id, id),
        isNull(returnOrders.deletedAt),
      ),
    )
    .limit(1);
  return rows[0] ?? null;
}

/** Same as getReturnOrdersByIdSafe; asserts graph-validation policy when GRAPH_VALIDATION_POLICY_JSON is set. */
export async function getReturnOrdersByIdSafeGuarded(
  db: Database,
  tenantId: (typeof returnOrders.$inferSelect)["tenantId"],
  id: (typeof returnOrders.$inferSelect)["id"],
) {
  await assertGraphGuardrailAllowsRead();
  return getReturnOrdersByIdSafe(db, tenantId, id);
}

/** List rows for tenant excluding soft-deleted. */
export async function listReturnOrdersActive(
  db: Database,
  tenantId: (typeof returnOrders.$inferSelect)["tenantId"],
) {
  return await db
    .select()
    .from(returnOrders)
    .where(and(eq(returnOrders.tenantId, tenantId), isNull(returnOrders.deletedAt)));
}

export async function listReturnOrdersActiveGuarded(
  db: Database,
  tenantId: (typeof returnOrders.$inferSelect)["tenantId"],
) {
  await assertGraphGuardrailAllowsRead();
  return listReturnOrdersActive(db, tenantId);
}

/** List all rows for tenant including soft-deleted. */
export async function listReturnOrdersAll(
  db: Database,
  tenantId: (typeof returnOrders.$inferSelect)["tenantId"],
) {
  return await db.select().from(returnOrders).where(eq(returnOrders.tenantId, tenantId));
}

export async function listReturnOrdersAllGuarded(
  db: Database,
  tenantId: (typeof returnOrders.$inferSelect)["tenantId"],
) {
  await assertGraphGuardrailAllowsRead();
  return listReturnOrdersAll(db, tenantId);
}

/** Soft-archive (mechanical delete flag). */
export async function archiveReturnOrders(
  db: Database,
  tenantId: (typeof returnOrders.$inferSelect)["tenantId"],
  id: (typeof returnOrders.$inferSelect)["id"],
) {
  return await db
    .update(returnOrders)
    .set({ deletedAt: new Date() })
    .where(and(eq(returnOrders.tenantId, tenantId), eq(returnOrders.id, id)));
}

export async function archiveReturnOrdersGuarded(
  db: Database,
  tenantId: (typeof returnOrders.$inferSelect)["tenantId"],
  id: (typeof returnOrders.$inferSelect)["id"],
) {
  await assertGraphGuardrailAllowsRead();
  return archiveReturnOrders(db, tenantId, id);
}


/** By ID for tenant (no soft-delete column on table). */
export async function getReturnOrderLinesById(
  db: Database,
  tenantId: (typeof returnOrderLines.$inferSelect)["tenantId"],
  id: (typeof returnOrderLines.$inferSelect)["id"],
) {
  const rows = await db
    .select()
    .from(returnOrderLines)
    .where(and(eq(returnOrderLines.tenantId, tenantId), eq(returnOrderLines.id, id)))
    .limit(1);
  return rows[0] ?? null;
}

export async function getReturnOrderLinesByIdGuarded(
  db: Database,
  tenantId: (typeof returnOrderLines.$inferSelect)["tenantId"],
  id: (typeof returnOrderLines.$inferSelect)["id"],
) {
  await assertGraphGuardrailAllowsRead();
  return getReturnOrderLinesById(db, tenantId, id);
}

/** List rows for tenant. */
export async function listReturnOrderLines(
  db: Database,
  tenantId: (typeof returnOrderLines.$inferSelect)["tenantId"],
) {
  return await db.select().from(returnOrderLines).where(eq(returnOrderLines.tenantId, tenantId));
}

export async function listReturnOrderLinesGuarded(
  db: Database,
  tenantId: (typeof returnOrderLines.$inferSelect)["tenantId"],
) {
  await assertGraphGuardrailAllowsRead();
  return listReturnOrderLines(db, tenantId);
}


/** Safe by ID: tenant + not soft-deleted. */
export async function getSubscriptionCloseReasonsByIdSafe(
  db: Database,
  tenantId: (typeof subscriptionCloseReasons.$inferSelect)["tenantId"],
  id: (typeof subscriptionCloseReasons.$inferSelect)["id"],
) {
  const rows = await db
    .select()
    .from(subscriptionCloseReasons)
    .where(
      and(
        eq(subscriptionCloseReasons.tenantId, tenantId),
        eq(subscriptionCloseReasons.id, id),
        isNull(subscriptionCloseReasons.deletedAt),
      ),
    )
    .limit(1);
  return rows[0] ?? null;
}

/** Same as getSubscriptionCloseReasonsByIdSafe; asserts graph-validation policy when GRAPH_VALIDATION_POLICY_JSON is set. */
export async function getSubscriptionCloseReasonsByIdSafeGuarded(
  db: Database,
  tenantId: (typeof subscriptionCloseReasons.$inferSelect)["tenantId"],
  id: (typeof subscriptionCloseReasons.$inferSelect)["id"],
) {
  await assertGraphGuardrailAllowsRead();
  return getSubscriptionCloseReasonsByIdSafe(db, tenantId, id);
}

/** List rows for tenant excluding soft-deleted. */
export async function listSubscriptionCloseReasonsActive(
  db: Database,
  tenantId: (typeof subscriptionCloseReasons.$inferSelect)["tenantId"],
) {
  return await db
    .select()
    .from(subscriptionCloseReasons)
    .where(and(eq(subscriptionCloseReasons.tenantId, tenantId), isNull(subscriptionCloseReasons.deletedAt)));
}

export async function listSubscriptionCloseReasonsActiveGuarded(
  db: Database,
  tenantId: (typeof subscriptionCloseReasons.$inferSelect)["tenantId"],
) {
  await assertGraphGuardrailAllowsRead();
  return listSubscriptionCloseReasonsActive(db, tenantId);
}

/** List all rows for tenant including soft-deleted. */
export async function listSubscriptionCloseReasonsAll(
  db: Database,
  tenantId: (typeof subscriptionCloseReasons.$inferSelect)["tenantId"],
) {
  return await db.select().from(subscriptionCloseReasons).where(eq(subscriptionCloseReasons.tenantId, tenantId));
}

export async function listSubscriptionCloseReasonsAllGuarded(
  db: Database,
  tenantId: (typeof subscriptionCloseReasons.$inferSelect)["tenantId"],
) {
  await assertGraphGuardrailAllowsRead();
  return listSubscriptionCloseReasonsAll(db, tenantId);
}

/** Soft-archive (mechanical delete flag). */
export async function archiveSubscriptionCloseReasons(
  db: Database,
  tenantId: (typeof subscriptionCloseReasons.$inferSelect)["tenantId"],
  id: (typeof subscriptionCloseReasons.$inferSelect)["id"],
) {
  return await db
    .update(subscriptionCloseReasons)
    .set({ deletedAt: new Date() })
    .where(and(eq(subscriptionCloseReasons.tenantId, tenantId), eq(subscriptionCloseReasons.id, id)));
}

export async function archiveSubscriptionCloseReasonsGuarded(
  db: Database,
  tenantId: (typeof subscriptionCloseReasons.$inferSelect)["tenantId"],
  id: (typeof subscriptionCloseReasons.$inferSelect)["id"],
) {
  await assertGraphGuardrailAllowsRead();
  return archiveSubscriptionCloseReasons(db, tenantId, id);
}


/** Safe by ID: tenant + not soft-deleted. */
export async function getSubscriptionTemplatesByIdSafe(
  db: Database,
  tenantId: (typeof subscriptionTemplates.$inferSelect)["tenantId"],
  id: (typeof subscriptionTemplates.$inferSelect)["id"],
) {
  const rows = await db
    .select()
    .from(subscriptionTemplates)
    .where(
      and(
        eq(subscriptionTemplates.tenantId, tenantId),
        eq(subscriptionTemplates.id, id),
        isNull(subscriptionTemplates.deletedAt),
      ),
    )
    .limit(1);
  return rows[0] ?? null;
}

/** Same as getSubscriptionTemplatesByIdSafe; asserts graph-validation policy when GRAPH_VALIDATION_POLICY_JSON is set. */
export async function getSubscriptionTemplatesByIdSafeGuarded(
  db: Database,
  tenantId: (typeof subscriptionTemplates.$inferSelect)["tenantId"],
  id: (typeof subscriptionTemplates.$inferSelect)["id"],
) {
  await assertGraphGuardrailAllowsRead();
  return getSubscriptionTemplatesByIdSafe(db, tenantId, id);
}

/** List rows for tenant excluding soft-deleted. */
export async function listSubscriptionTemplatesActive(
  db: Database,
  tenantId: (typeof subscriptionTemplates.$inferSelect)["tenantId"],
) {
  return await db
    .select()
    .from(subscriptionTemplates)
    .where(and(eq(subscriptionTemplates.tenantId, tenantId), isNull(subscriptionTemplates.deletedAt)));
}

export async function listSubscriptionTemplatesActiveGuarded(
  db: Database,
  tenantId: (typeof subscriptionTemplates.$inferSelect)["tenantId"],
) {
  await assertGraphGuardrailAllowsRead();
  return listSubscriptionTemplatesActive(db, tenantId);
}

/** List all rows for tenant including soft-deleted. */
export async function listSubscriptionTemplatesAll(
  db: Database,
  tenantId: (typeof subscriptionTemplates.$inferSelect)["tenantId"],
) {
  return await db.select().from(subscriptionTemplates).where(eq(subscriptionTemplates.tenantId, tenantId));
}

export async function listSubscriptionTemplatesAllGuarded(
  db: Database,
  tenantId: (typeof subscriptionTemplates.$inferSelect)["tenantId"],
) {
  await assertGraphGuardrailAllowsRead();
  return listSubscriptionTemplatesAll(db, tenantId);
}

/** Soft-archive (mechanical delete flag). */
export async function archiveSubscriptionTemplates(
  db: Database,
  tenantId: (typeof subscriptionTemplates.$inferSelect)["tenantId"],
  id: (typeof subscriptionTemplates.$inferSelect)["id"],
) {
  return await db
    .update(subscriptionTemplates)
    .set({ deletedAt: new Date() })
    .where(and(eq(subscriptionTemplates.tenantId, tenantId), eq(subscriptionTemplates.id, id)));
}

export async function archiveSubscriptionTemplatesGuarded(
  db: Database,
  tenantId: (typeof subscriptionTemplates.$inferSelect)["tenantId"],
  id: (typeof subscriptionTemplates.$inferSelect)["id"],
) {
  await assertGraphGuardrailAllowsRead();
  return archiveSubscriptionTemplates(db, tenantId, id);
}


/** Safe by ID: tenant + not soft-deleted. */
export async function getSubscriptionsByIdSafe(
  db: Database,
  tenantId: (typeof subscriptions.$inferSelect)["tenantId"],
  id: (typeof subscriptions.$inferSelect)["id"],
) {
  const rows = await db
    .select()
    .from(subscriptions)
    .where(
      and(
        eq(subscriptions.tenantId, tenantId),
        eq(subscriptions.id, id),
        isNull(subscriptions.deletedAt),
      ),
    )
    .limit(1);
  return rows[0] ?? null;
}

/** Same as getSubscriptionsByIdSafe; asserts graph-validation policy when GRAPH_VALIDATION_POLICY_JSON is set. */
export async function getSubscriptionsByIdSafeGuarded(
  db: Database,
  tenantId: (typeof subscriptions.$inferSelect)["tenantId"],
  id: (typeof subscriptions.$inferSelect)["id"],
) {
  await assertGraphGuardrailAllowsRead();
  return getSubscriptionsByIdSafe(db, tenantId, id);
}

/** List rows for tenant excluding soft-deleted. */
export async function listSubscriptionsActive(
  db: Database,
  tenantId: (typeof subscriptions.$inferSelect)["tenantId"],
) {
  return await db
    .select()
    .from(subscriptions)
    .where(and(eq(subscriptions.tenantId, tenantId), isNull(subscriptions.deletedAt)));
}

export async function listSubscriptionsActiveGuarded(
  db: Database,
  tenantId: (typeof subscriptions.$inferSelect)["tenantId"],
) {
  await assertGraphGuardrailAllowsRead();
  return listSubscriptionsActive(db, tenantId);
}

/** List all rows for tenant including soft-deleted. */
export async function listSubscriptionsAll(
  db: Database,
  tenantId: (typeof subscriptions.$inferSelect)["tenantId"],
) {
  return await db.select().from(subscriptions).where(eq(subscriptions.tenantId, tenantId));
}

export async function listSubscriptionsAllGuarded(
  db: Database,
  tenantId: (typeof subscriptions.$inferSelect)["tenantId"],
) {
  await assertGraphGuardrailAllowsRead();
  return listSubscriptionsAll(db, tenantId);
}

/** Soft-archive (mechanical delete flag). */
export async function archiveSubscriptions(
  db: Database,
  tenantId: (typeof subscriptions.$inferSelect)["tenantId"],
  id: (typeof subscriptions.$inferSelect)["id"],
) {
  return await db
    .update(subscriptions)
    .set({ deletedAt: new Date() })
    .where(and(eq(subscriptions.tenantId, tenantId), eq(subscriptions.id, id)));
}

export async function archiveSubscriptionsGuarded(
  db: Database,
  tenantId: (typeof subscriptions.$inferSelect)["tenantId"],
  id: (typeof subscriptions.$inferSelect)["id"],
) {
  await assertGraphGuardrailAllowsRead();
  return archiveSubscriptions(db, tenantId, id);
}


/** By ID for tenant (no soft-delete column on table). */
export async function getSubscriptionLinesById(
  db: Database,
  tenantId: (typeof subscriptionLines.$inferSelect)["tenantId"],
  id: (typeof subscriptionLines.$inferSelect)["id"],
) {
  const rows = await db
    .select()
    .from(subscriptionLines)
    .where(and(eq(subscriptionLines.tenantId, tenantId), eq(subscriptionLines.id, id)))
    .limit(1);
  return rows[0] ?? null;
}

export async function getSubscriptionLinesByIdGuarded(
  db: Database,
  tenantId: (typeof subscriptionLines.$inferSelect)["tenantId"],
  id: (typeof subscriptionLines.$inferSelect)["id"],
) {
  await assertGraphGuardrailAllowsRead();
  return getSubscriptionLinesById(db, tenantId, id);
}

/** List rows for tenant. */
export async function listSubscriptionLines(
  db: Database,
  tenantId: (typeof subscriptionLines.$inferSelect)["tenantId"],
) {
  return await db.select().from(subscriptionLines).where(eq(subscriptionLines.tenantId, tenantId));
}

export async function listSubscriptionLinesGuarded(
  db: Database,
  tenantId: (typeof subscriptionLines.$inferSelect)["tenantId"],
) {
  await assertGraphGuardrailAllowsRead();
  return listSubscriptionLines(db, tenantId);
}


/** By ID for tenant (no soft-delete column on table). */
export async function getSubscriptionLogsById(
  db: Database,
  tenantId: (typeof subscriptionLogs.$inferSelect)["tenantId"],
  id: (typeof subscriptionLogs.$inferSelect)["id"],
) {
  const rows = await db
    .select()
    .from(subscriptionLogs)
    .where(and(eq(subscriptionLogs.tenantId, tenantId), eq(subscriptionLogs.id, id)))
    .limit(1);
  return rows[0] ?? null;
}

export async function getSubscriptionLogsByIdGuarded(
  db: Database,
  tenantId: (typeof subscriptionLogs.$inferSelect)["tenantId"],
  id: (typeof subscriptionLogs.$inferSelect)["id"],
) {
  await assertGraphGuardrailAllowsRead();
  return getSubscriptionLogsById(db, tenantId, id);
}

/** List rows for tenant. */
export async function listSubscriptionLogs(
  db: Database,
  tenantId: (typeof subscriptionLogs.$inferSelect)["tenantId"],
) {
  return await db.select().from(subscriptionLogs).where(eq(subscriptionLogs.tenantId, tenantId));
}

export async function listSubscriptionLogsGuarded(
  db: Database,
  tenantId: (typeof subscriptionLogs.$inferSelect)["tenantId"],
) {
  await assertGraphGuardrailAllowsRead();
  return listSubscriptionLogs(db, tenantId);
}


/** Safe by ID: tenant + not soft-deleted. */
export async function getSalesTeamsByIdSafe(
  db: Database,
  tenantId: (typeof salesTeams.$inferSelect)["tenantId"],
  id: (typeof salesTeams.$inferSelect)["id"],
) {
  const rows = await db
    .select()
    .from(salesTeams)
    .where(
      and(
        eq(salesTeams.tenantId, tenantId),
        eq(salesTeams.id, id),
        isNull(salesTeams.deletedAt),
      ),
    )
    .limit(1);
  return rows[0] ?? null;
}

/** Same as getSalesTeamsByIdSafe; asserts graph-validation policy when GRAPH_VALIDATION_POLICY_JSON is set. */
export async function getSalesTeamsByIdSafeGuarded(
  db: Database,
  tenantId: (typeof salesTeams.$inferSelect)["tenantId"],
  id: (typeof salesTeams.$inferSelect)["id"],
) {
  await assertGraphGuardrailAllowsRead();
  return getSalesTeamsByIdSafe(db, tenantId, id);
}

/** List rows for tenant excluding soft-deleted. */
export async function listSalesTeamsActive(
  db: Database,
  tenantId: (typeof salesTeams.$inferSelect)["tenantId"],
) {
  return await db
    .select()
    .from(salesTeams)
    .where(and(eq(salesTeams.tenantId, tenantId), isNull(salesTeams.deletedAt)));
}

export async function listSalesTeamsActiveGuarded(
  db: Database,
  tenantId: (typeof salesTeams.$inferSelect)["tenantId"],
) {
  await assertGraphGuardrailAllowsRead();
  return listSalesTeamsActive(db, tenantId);
}

/** List all rows for tenant including soft-deleted. */
export async function listSalesTeamsAll(
  db: Database,
  tenantId: (typeof salesTeams.$inferSelect)["tenantId"],
) {
  return await db.select().from(salesTeams).where(eq(salesTeams.tenantId, tenantId));
}

export async function listSalesTeamsAllGuarded(
  db: Database,
  tenantId: (typeof salesTeams.$inferSelect)["tenantId"],
) {
  await assertGraphGuardrailAllowsRead();
  return listSalesTeamsAll(db, tenantId);
}

/** Soft-archive (mechanical delete flag). */
export async function archiveSalesTeams(
  db: Database,
  tenantId: (typeof salesTeams.$inferSelect)["tenantId"],
  id: (typeof salesTeams.$inferSelect)["id"],
) {
  return await db
    .update(salesTeams)
    .set({ deletedAt: new Date() })
    .where(and(eq(salesTeams.tenantId, tenantId), eq(salesTeams.id, id)));
}

export async function archiveSalesTeamsGuarded(
  db: Database,
  tenantId: (typeof salesTeams.$inferSelect)["tenantId"],
  id: (typeof salesTeams.$inferSelect)["id"],
) {
  await assertGraphGuardrailAllowsRead();
  return archiveSalesTeams(db, tenantId, id);
}


/** Safe by ID: tenant + not soft-deleted. */
export async function getSalesTeamMembersByIdSafe(
  db: Database,
  tenantId: (typeof salesTeamMembers.$inferSelect)["tenantId"],
  id: (typeof salesTeamMembers.$inferSelect)["id"],
) {
  const rows = await db
    .select()
    .from(salesTeamMembers)
    .where(
      and(
        eq(salesTeamMembers.tenantId, tenantId),
        eq(salesTeamMembers.id, id),
        isNull(salesTeamMembers.deletedAt),
      ),
    )
    .limit(1);
  return rows[0] ?? null;
}

/** Same as getSalesTeamMembersByIdSafe; asserts graph-validation policy when GRAPH_VALIDATION_POLICY_JSON is set. */
export async function getSalesTeamMembersByIdSafeGuarded(
  db: Database,
  tenantId: (typeof salesTeamMembers.$inferSelect)["tenantId"],
  id: (typeof salesTeamMembers.$inferSelect)["id"],
) {
  await assertGraphGuardrailAllowsRead();
  return getSalesTeamMembersByIdSafe(db, tenantId, id);
}

/** List rows for tenant excluding soft-deleted. */
export async function listSalesTeamMembersActive(
  db: Database,
  tenantId: (typeof salesTeamMembers.$inferSelect)["tenantId"],
) {
  return await db
    .select()
    .from(salesTeamMembers)
    .where(and(eq(salesTeamMembers.tenantId, tenantId), isNull(salesTeamMembers.deletedAt)));
}

export async function listSalesTeamMembersActiveGuarded(
  db: Database,
  tenantId: (typeof salesTeamMembers.$inferSelect)["tenantId"],
) {
  await assertGraphGuardrailAllowsRead();
  return listSalesTeamMembersActive(db, tenantId);
}

/** List all rows for tenant including soft-deleted. */
export async function listSalesTeamMembersAll(
  db: Database,
  tenantId: (typeof salesTeamMembers.$inferSelect)["tenantId"],
) {
  return await db.select().from(salesTeamMembers).where(eq(salesTeamMembers.tenantId, tenantId));
}

export async function listSalesTeamMembersAllGuarded(
  db: Database,
  tenantId: (typeof salesTeamMembers.$inferSelect)["tenantId"],
) {
  await assertGraphGuardrailAllowsRead();
  return listSalesTeamMembersAll(db, tenantId);
}

/** Soft-archive (mechanical delete flag). */
export async function archiveSalesTeamMembers(
  db: Database,
  tenantId: (typeof salesTeamMembers.$inferSelect)["tenantId"],
  id: (typeof salesTeamMembers.$inferSelect)["id"],
) {
  return await db
    .update(salesTeamMembers)
    .set({ deletedAt: new Date() })
    .where(and(eq(salesTeamMembers.tenantId, tenantId), eq(salesTeamMembers.id, id)));
}

export async function archiveSalesTeamMembersGuarded(
  db: Database,
  tenantId: (typeof salesTeamMembers.$inferSelect)["tenantId"],
  id: (typeof salesTeamMembers.$inferSelect)["id"],
) {
  await assertGraphGuardrailAllowsRead();
  return archiveSalesTeamMembers(db, tenantId, id);
}


/** Safe by ID: tenant + not soft-deleted. */
export async function getTerritoriesByIdSafe(
  db: Database,
  tenantId: (typeof territories.$inferSelect)["tenantId"],
  id: (typeof territories.$inferSelect)["id"],
) {
  const rows = await db
    .select()
    .from(territories)
    .where(
      and(
        eq(territories.tenantId, tenantId),
        eq(territories.id, id),
        isNull(territories.deletedAt),
      ),
    )
    .limit(1);
  return rows[0] ?? null;
}

/** Same as getTerritoriesByIdSafe; asserts graph-validation policy when GRAPH_VALIDATION_POLICY_JSON is set. */
export async function getTerritoriesByIdSafeGuarded(
  db: Database,
  tenantId: (typeof territories.$inferSelect)["tenantId"],
  id: (typeof territories.$inferSelect)["id"],
) {
  await assertGraphGuardrailAllowsRead();
  return getTerritoriesByIdSafe(db, tenantId, id);
}

/** List rows for tenant excluding soft-deleted. */
export async function listTerritoriesActive(
  db: Database,
  tenantId: (typeof territories.$inferSelect)["tenantId"],
) {
  return await db
    .select()
    .from(territories)
    .where(and(eq(territories.tenantId, tenantId), isNull(territories.deletedAt)));
}

export async function listTerritoriesActiveGuarded(
  db: Database,
  tenantId: (typeof territories.$inferSelect)["tenantId"],
) {
  await assertGraphGuardrailAllowsRead();
  return listTerritoriesActive(db, tenantId);
}

/** List all rows for tenant including soft-deleted. */
export async function listTerritoriesAll(
  db: Database,
  tenantId: (typeof territories.$inferSelect)["tenantId"],
) {
  return await db.select().from(territories).where(eq(territories.tenantId, tenantId));
}

export async function listTerritoriesAllGuarded(
  db: Database,
  tenantId: (typeof territories.$inferSelect)["tenantId"],
) {
  await assertGraphGuardrailAllowsRead();
  return listTerritoriesAll(db, tenantId);
}

/** Soft-archive (mechanical delete flag). */
export async function archiveTerritories(
  db: Database,
  tenantId: (typeof territories.$inferSelect)["tenantId"],
  id: (typeof territories.$inferSelect)["id"],
) {
  return await db
    .update(territories)
    .set({ deletedAt: new Date() })
    .where(and(eq(territories.tenantId, tenantId), eq(territories.id, id)));
}

export async function archiveTerritoriesGuarded(
  db: Database,
  tenantId: (typeof territories.$inferSelect)["tenantId"],
  id: (typeof territories.$inferSelect)["id"],
) {
  await assertGraphGuardrailAllowsRead();
  return archiveTerritories(db, tenantId, id);
}


/** Safe by ID: tenant + not soft-deleted. */
export async function getTerritoryRulesByIdSafe(
  db: Database,
  tenantId: (typeof territoryRules.$inferSelect)["tenantId"],
  id: (typeof territoryRules.$inferSelect)["id"],
) {
  const rows = await db
    .select()
    .from(territoryRules)
    .where(
      and(
        eq(territoryRules.tenantId, tenantId),
        eq(territoryRules.id, id),
        isNull(territoryRules.deletedAt),
      ),
    )
    .limit(1);
  return rows[0] ?? null;
}

/** Same as getTerritoryRulesByIdSafe; asserts graph-validation policy when GRAPH_VALIDATION_POLICY_JSON is set. */
export async function getTerritoryRulesByIdSafeGuarded(
  db: Database,
  tenantId: (typeof territoryRules.$inferSelect)["tenantId"],
  id: (typeof territoryRules.$inferSelect)["id"],
) {
  await assertGraphGuardrailAllowsRead();
  return getTerritoryRulesByIdSafe(db, tenantId, id);
}

/** List rows for tenant excluding soft-deleted. */
export async function listTerritoryRulesActive(
  db: Database,
  tenantId: (typeof territoryRules.$inferSelect)["tenantId"],
) {
  return await db
    .select()
    .from(territoryRules)
    .where(and(eq(territoryRules.tenantId, tenantId), isNull(territoryRules.deletedAt)));
}

export async function listTerritoryRulesActiveGuarded(
  db: Database,
  tenantId: (typeof territoryRules.$inferSelect)["tenantId"],
) {
  await assertGraphGuardrailAllowsRead();
  return listTerritoryRulesActive(db, tenantId);
}

/** List all rows for tenant including soft-deleted. */
export async function listTerritoryRulesAll(
  db: Database,
  tenantId: (typeof territoryRules.$inferSelect)["tenantId"],
) {
  return await db.select().from(territoryRules).where(eq(territoryRules.tenantId, tenantId));
}

export async function listTerritoryRulesAllGuarded(
  db: Database,
  tenantId: (typeof territoryRules.$inferSelect)["tenantId"],
) {
  await assertGraphGuardrailAllowsRead();
  return listTerritoryRulesAll(db, tenantId);
}

/** Soft-archive (mechanical delete flag). */
export async function archiveTerritoryRules(
  db: Database,
  tenantId: (typeof territoryRules.$inferSelect)["tenantId"],
  id: (typeof territoryRules.$inferSelect)["id"],
) {
  return await db
    .update(territoryRules)
    .set({ deletedAt: new Date() })
    .where(and(eq(territoryRules.tenantId, tenantId), eq(territoryRules.id, id)));
}

export async function archiveTerritoryRulesGuarded(
  db: Database,
  tenantId: (typeof territoryRules.$inferSelect)["tenantId"],
  id: (typeof territoryRules.$inferSelect)["id"],
) {
  await assertGraphGuardrailAllowsRead();
  return archiveTerritoryRules(db, tenantId, id);
}


/** Safe by ID: tenant + not soft-deleted. */
export async function getCommissionPlansByIdSafe(
  db: Database,
  tenantId: (typeof commissionPlans.$inferSelect)["tenantId"],
  id: (typeof commissionPlans.$inferSelect)["id"],
) {
  const rows = await db
    .select()
    .from(commissionPlans)
    .where(
      and(
        eq(commissionPlans.tenantId, tenantId),
        eq(commissionPlans.id, id),
        isNull(commissionPlans.deletedAt),
      ),
    )
    .limit(1);
  return rows[0] ?? null;
}

/** Same as getCommissionPlansByIdSafe; asserts graph-validation policy when GRAPH_VALIDATION_POLICY_JSON is set. */
export async function getCommissionPlansByIdSafeGuarded(
  db: Database,
  tenantId: (typeof commissionPlans.$inferSelect)["tenantId"],
  id: (typeof commissionPlans.$inferSelect)["id"],
) {
  await assertGraphGuardrailAllowsRead();
  return getCommissionPlansByIdSafe(db, tenantId, id);
}

/** List rows for tenant excluding soft-deleted. */
export async function listCommissionPlansActive(
  db: Database,
  tenantId: (typeof commissionPlans.$inferSelect)["tenantId"],
) {
  return await db
    .select()
    .from(commissionPlans)
    .where(and(eq(commissionPlans.tenantId, tenantId), isNull(commissionPlans.deletedAt)));
}

export async function listCommissionPlansActiveGuarded(
  db: Database,
  tenantId: (typeof commissionPlans.$inferSelect)["tenantId"],
) {
  await assertGraphGuardrailAllowsRead();
  return listCommissionPlansActive(db, tenantId);
}

/** List all rows for tenant including soft-deleted. */
export async function listCommissionPlansAll(
  db: Database,
  tenantId: (typeof commissionPlans.$inferSelect)["tenantId"],
) {
  return await db.select().from(commissionPlans).where(eq(commissionPlans.tenantId, tenantId));
}

export async function listCommissionPlansAllGuarded(
  db: Database,
  tenantId: (typeof commissionPlans.$inferSelect)["tenantId"],
) {
  await assertGraphGuardrailAllowsRead();
  return listCommissionPlansAll(db, tenantId);
}

/** Soft-archive (mechanical delete flag). */
export async function archiveCommissionPlans(
  db: Database,
  tenantId: (typeof commissionPlans.$inferSelect)["tenantId"],
  id: (typeof commissionPlans.$inferSelect)["id"],
) {
  return await db
    .update(commissionPlans)
    .set({ deletedAt: new Date() })
    .where(and(eq(commissionPlans.tenantId, tenantId), eq(commissionPlans.id, id)));
}

export async function archiveCommissionPlansGuarded(
  db: Database,
  tenantId: (typeof commissionPlans.$inferSelect)["tenantId"],
  id: (typeof commissionPlans.$inferSelect)["id"],
) {
  await assertGraphGuardrailAllowsRead();
  return archiveCommissionPlans(db, tenantId, id);
}


/** By ID for tenant (no soft-delete column on table). */
export async function getCommissionPlanTiersById(
  db: Database,
  tenantId: (typeof commissionPlanTiers.$inferSelect)["tenantId"],
  id: (typeof commissionPlanTiers.$inferSelect)["id"],
) {
  const rows = await db
    .select()
    .from(commissionPlanTiers)
    .where(and(eq(commissionPlanTiers.tenantId, tenantId), eq(commissionPlanTiers.id, id)))
    .limit(1);
  return rows[0] ?? null;
}

export async function getCommissionPlanTiersByIdGuarded(
  db: Database,
  tenantId: (typeof commissionPlanTiers.$inferSelect)["tenantId"],
  id: (typeof commissionPlanTiers.$inferSelect)["id"],
) {
  await assertGraphGuardrailAllowsRead();
  return getCommissionPlanTiersById(db, tenantId, id);
}

/** List rows for tenant. */
export async function listCommissionPlanTiers(
  db: Database,
  tenantId: (typeof commissionPlanTiers.$inferSelect)["tenantId"],
) {
  return await db.select().from(commissionPlanTiers).where(eq(commissionPlanTiers.tenantId, tenantId));
}

export async function listCommissionPlanTiersGuarded(
  db: Database,
  tenantId: (typeof commissionPlanTiers.$inferSelect)["tenantId"],
) {
  await assertGraphGuardrailAllowsRead();
  return listCommissionPlanTiers(db, tenantId);
}


/** Safe by ID: tenant + not soft-deleted. */
export async function getCommissionEntriesByIdSafe(
  db: Database,
  tenantId: (typeof commissionEntries.$inferSelect)["tenantId"],
  id: (typeof commissionEntries.$inferSelect)["id"],
) {
  const rows = await db
    .select()
    .from(commissionEntries)
    .where(
      and(
        eq(commissionEntries.tenantId, tenantId),
        eq(commissionEntries.id, id),
        isNull(commissionEntries.deletedAt),
      ),
    )
    .limit(1);
  return rows[0] ?? null;
}

/** Same as getCommissionEntriesByIdSafe; asserts graph-validation policy when GRAPH_VALIDATION_POLICY_JSON is set. */
export async function getCommissionEntriesByIdSafeGuarded(
  db: Database,
  tenantId: (typeof commissionEntries.$inferSelect)["tenantId"],
  id: (typeof commissionEntries.$inferSelect)["id"],
) {
  await assertGraphGuardrailAllowsRead();
  return getCommissionEntriesByIdSafe(db, tenantId, id);
}

/** List rows for tenant excluding soft-deleted. */
export async function listCommissionEntriesActive(
  db: Database,
  tenantId: (typeof commissionEntries.$inferSelect)["tenantId"],
) {
  return await db
    .select()
    .from(commissionEntries)
    .where(and(eq(commissionEntries.tenantId, tenantId), isNull(commissionEntries.deletedAt)));
}

export async function listCommissionEntriesActiveGuarded(
  db: Database,
  tenantId: (typeof commissionEntries.$inferSelect)["tenantId"],
) {
  await assertGraphGuardrailAllowsRead();
  return listCommissionEntriesActive(db, tenantId);
}

/** List all rows for tenant including soft-deleted. */
export async function listCommissionEntriesAll(
  db: Database,
  tenantId: (typeof commissionEntries.$inferSelect)["tenantId"],
) {
  return await db.select().from(commissionEntries).where(eq(commissionEntries.tenantId, tenantId));
}

export async function listCommissionEntriesAllGuarded(
  db: Database,
  tenantId: (typeof commissionEntries.$inferSelect)["tenantId"],
) {
  await assertGraphGuardrailAllowsRead();
  return listCommissionEntriesAll(db, tenantId);
}

/** Soft-archive (mechanical delete flag). */
export async function archiveCommissionEntries(
  db: Database,
  tenantId: (typeof commissionEntries.$inferSelect)["tenantId"],
  id: (typeof commissionEntries.$inferSelect)["id"],
) {
  return await db
    .update(commissionEntries)
    .set({ deletedAt: new Date() })
    .where(and(eq(commissionEntries.tenantId, tenantId), eq(commissionEntries.id, id)));
}

export async function archiveCommissionEntriesGuarded(
  db: Database,
  tenantId: (typeof commissionEntries.$inferSelect)["tenantId"],
  id: (typeof commissionEntries.$inferSelect)["id"],
) {
  await assertGraphGuardrailAllowsRead();
  return archiveCommissionEntries(db, tenantId, id);
}


/** By ID for tenant (no soft-delete column on table). */
export async function getDocumentStatusHistoryById(
  db: Database,
  tenantId: (typeof documentStatusHistory.$inferSelect)["tenantId"],
  id: (typeof documentStatusHistory.$inferSelect)["id"],
) {
  const rows = await db
    .select()
    .from(documentStatusHistory)
    .where(and(eq(documentStatusHistory.tenantId, tenantId), eq(documentStatusHistory.id, id)))
    .limit(1);
  return rows[0] ?? null;
}

export async function getDocumentStatusHistoryByIdGuarded(
  db: Database,
  tenantId: (typeof documentStatusHistory.$inferSelect)["tenantId"],
  id: (typeof documentStatusHistory.$inferSelect)["id"],
) {
  await assertGraphGuardrailAllowsRead();
  return getDocumentStatusHistoryById(db, tenantId, id);
}

/** List rows for tenant. */
export async function listDocumentStatusHistory(
  db: Database,
  tenantId: (typeof documentStatusHistory.$inferSelect)["tenantId"],
) {
  return await db.select().from(documentStatusHistory).where(eq(documentStatusHistory.tenantId, tenantId));
}

export async function listDocumentStatusHistoryGuarded(
  db: Database,
  tenantId: (typeof documentStatusHistory.$inferSelect)["tenantId"],
) {
  await assertGraphGuardrailAllowsRead();
  return listDocumentStatusHistory(db, tenantId);
}


/** By ID for tenant (no soft-delete column on table). */
export async function getDocumentApprovalsById(
  db: Database,
  tenantId: (typeof documentApprovals.$inferSelect)["tenantId"],
  id: (typeof documentApprovals.$inferSelect)["id"],
) {
  const rows = await db
    .select()
    .from(documentApprovals)
    .where(and(eq(documentApprovals.tenantId, tenantId), eq(documentApprovals.id, id)))
    .limit(1);
  return rows[0] ?? null;
}

export async function getDocumentApprovalsByIdGuarded(
  db: Database,
  tenantId: (typeof documentApprovals.$inferSelect)["tenantId"],
  id: (typeof documentApprovals.$inferSelect)["id"],
) {
  await assertGraphGuardrailAllowsRead();
  return getDocumentApprovalsById(db, tenantId, id);
}

/** List rows for tenant. */
export async function listDocumentApprovals(
  db: Database,
  tenantId: (typeof documentApprovals.$inferSelect)["tenantId"],
) {
  return await db.select().from(documentApprovals).where(eq(documentApprovals.tenantId, tenantId));
}

export async function listDocumentApprovalsGuarded(
  db: Database,
  tenantId: (typeof documentApprovals.$inferSelect)["tenantId"],
) {
  await assertGraphGuardrailAllowsRead();
  return listDocumentApprovals(db, tenantId);
}


/** Safe by ID: tenant + not soft-deleted. */
export async function getSalesDocumentAttachmentsByIdSafe(
  db: Database,
  tenantId: (typeof salesDocumentAttachments.$inferSelect)["tenantId"],
  id: (typeof salesDocumentAttachments.$inferSelect)["id"],
) {
  const rows = await db
    .select()
    .from(salesDocumentAttachments)
    .where(
      and(
        eq(salesDocumentAttachments.tenantId, tenantId),
        eq(salesDocumentAttachments.id, id),
        isNull(salesDocumentAttachments.deletedAt),
      ),
    )
    .limit(1);
  return rows[0] ?? null;
}

/** Same as getSalesDocumentAttachmentsByIdSafe; asserts graph-validation policy when GRAPH_VALIDATION_POLICY_JSON is set. */
export async function getSalesDocumentAttachmentsByIdSafeGuarded(
  db: Database,
  tenantId: (typeof salesDocumentAttachments.$inferSelect)["tenantId"],
  id: (typeof salesDocumentAttachments.$inferSelect)["id"],
) {
  await assertGraphGuardrailAllowsRead();
  return getSalesDocumentAttachmentsByIdSafe(db, tenantId, id);
}

/** List rows for tenant excluding soft-deleted. */
export async function listSalesDocumentAttachmentsActive(
  db: Database,
  tenantId: (typeof salesDocumentAttachments.$inferSelect)["tenantId"],
) {
  return await db
    .select()
    .from(salesDocumentAttachments)
    .where(and(eq(salesDocumentAttachments.tenantId, tenantId), isNull(salesDocumentAttachments.deletedAt)));
}

export async function listSalesDocumentAttachmentsActiveGuarded(
  db: Database,
  tenantId: (typeof salesDocumentAttachments.$inferSelect)["tenantId"],
) {
  await assertGraphGuardrailAllowsRead();
  return listSalesDocumentAttachmentsActive(db, tenantId);
}

/** List all rows for tenant including soft-deleted. */
export async function listSalesDocumentAttachmentsAll(
  db: Database,
  tenantId: (typeof salesDocumentAttachments.$inferSelect)["tenantId"],
) {
  return await db.select().from(salesDocumentAttachments).where(eq(salesDocumentAttachments.tenantId, tenantId));
}

export async function listSalesDocumentAttachmentsAllGuarded(
  db: Database,
  tenantId: (typeof salesDocumentAttachments.$inferSelect)["tenantId"],
) {
  await assertGraphGuardrailAllowsRead();
  return listSalesDocumentAttachmentsAll(db, tenantId);
}

/** Soft-archive (mechanical delete flag). */
export async function archiveSalesDocumentAttachments(
  db: Database,
  tenantId: (typeof salesDocumentAttachments.$inferSelect)["tenantId"],
  id: (typeof salesDocumentAttachments.$inferSelect)["id"],
) {
  return await db
    .update(salesDocumentAttachments)
    .set({ deletedAt: new Date() })
    .where(and(eq(salesDocumentAttachments.tenantId, tenantId), eq(salesDocumentAttachments.id, id)));
}

export async function archiveSalesDocumentAttachmentsGuarded(
  db: Database,
  tenantId: (typeof salesDocumentAttachments.$inferSelect)["tenantId"],
  id: (typeof salesDocumentAttachments.$inferSelect)["id"],
) {
  await assertGraphGuardrailAllowsRead();
  return archiveSalesDocumentAttachments(db, tenantId, id);
}


/** By ID for tenant (no soft-delete column on table). */
export async function getLineItemDiscountsById(
  db: Database,
  tenantId: (typeof lineItemDiscounts.$inferSelect)["tenantId"],
  id: (typeof lineItemDiscounts.$inferSelect)["id"],
) {
  const rows = await db
    .select()
    .from(lineItemDiscounts)
    .where(and(eq(lineItemDiscounts.tenantId, tenantId), eq(lineItemDiscounts.id, id)))
    .limit(1);
  return rows[0] ?? null;
}

export async function getLineItemDiscountsByIdGuarded(
  db: Database,
  tenantId: (typeof lineItemDiscounts.$inferSelect)["tenantId"],
  id: (typeof lineItemDiscounts.$inferSelect)["id"],
) {
  await assertGraphGuardrailAllowsRead();
  return getLineItemDiscountsById(db, tenantId, id);
}

/** List rows for tenant. */
export async function listLineItemDiscounts(
  db: Database,
  tenantId: (typeof lineItemDiscounts.$inferSelect)["tenantId"],
) {
  return await db.select().from(lineItemDiscounts).where(eq(lineItemDiscounts.tenantId, tenantId));
}

export async function listLineItemDiscountsGuarded(
  db: Database,
  tenantId: (typeof lineItemDiscounts.$inferSelect)["tenantId"],
) {
  await assertGraphGuardrailAllowsRead();
  return listLineItemDiscounts(db, tenantId);
}


/** By ID for tenant (no soft-delete column on table). */
export async function getAccountingPostingsById(
  db: Database,
  tenantId: (typeof accountingPostings.$inferSelect)["tenantId"],
  id: (typeof accountingPostings.$inferSelect)["id"],
) {
  const rows = await db
    .select()
    .from(accountingPostings)
    .where(and(eq(accountingPostings.tenantId, tenantId), eq(accountingPostings.id, id)))
    .limit(1);
  return rows[0] ?? null;
}

export async function getAccountingPostingsByIdGuarded(
  db: Database,
  tenantId: (typeof accountingPostings.$inferSelect)["tenantId"],
  id: (typeof accountingPostings.$inferSelect)["id"],
) {
  await assertGraphGuardrailAllowsRead();
  return getAccountingPostingsById(db, tenantId, id);
}

/** List rows for tenant. */
export async function listAccountingPostings(
  db: Database,
  tenantId: (typeof accountingPostings.$inferSelect)["tenantId"],
) {
  return await db.select().from(accountingPostings).where(eq(accountingPostings.tenantId, tenantId));
}

export async function listAccountingPostingsGuarded(
  db: Database,
  tenantId: (typeof accountingPostings.$inferSelect)["tenantId"],
) {
  await assertGraphGuardrailAllowsRead();
  return listAccountingPostings(db, tenantId);
}


/** Safe by ID: tenant + not soft-deleted. */
export async function getRoundingPoliciesByIdSafe(
  db: Database,
  tenantId: (typeof roundingPolicies.$inferSelect)["tenantId"],
  id: (typeof roundingPolicies.$inferSelect)["id"],
) {
  const rows = await db
    .select()
    .from(roundingPolicies)
    .where(
      and(
        eq(roundingPolicies.tenantId, tenantId),
        eq(roundingPolicies.id, id),
        isNull(roundingPolicies.deletedAt),
      ),
    )
    .limit(1);
  return rows[0] ?? null;
}

/** Same as getRoundingPoliciesByIdSafe; asserts graph-validation policy when GRAPH_VALIDATION_POLICY_JSON is set. */
export async function getRoundingPoliciesByIdSafeGuarded(
  db: Database,
  tenantId: (typeof roundingPolicies.$inferSelect)["tenantId"],
  id: (typeof roundingPolicies.$inferSelect)["id"],
) {
  await assertGraphGuardrailAllowsRead();
  return getRoundingPoliciesByIdSafe(db, tenantId, id);
}

/** List rows for tenant excluding soft-deleted. */
export async function listRoundingPoliciesActive(
  db: Database,
  tenantId: (typeof roundingPolicies.$inferSelect)["tenantId"],
) {
  return await db
    .select()
    .from(roundingPolicies)
    .where(and(eq(roundingPolicies.tenantId, tenantId), isNull(roundingPolicies.deletedAt)));
}

export async function listRoundingPoliciesActiveGuarded(
  db: Database,
  tenantId: (typeof roundingPolicies.$inferSelect)["tenantId"],
) {
  await assertGraphGuardrailAllowsRead();
  return listRoundingPoliciesActive(db, tenantId);
}

/** List all rows for tenant including soft-deleted. */
export async function listRoundingPoliciesAll(
  db: Database,
  tenantId: (typeof roundingPolicies.$inferSelect)["tenantId"],
) {
  return await db.select().from(roundingPolicies).where(eq(roundingPolicies.tenantId, tenantId));
}

export async function listRoundingPoliciesAllGuarded(
  db: Database,
  tenantId: (typeof roundingPolicies.$inferSelect)["tenantId"],
) {
  await assertGraphGuardrailAllowsRead();
  return listRoundingPoliciesAll(db, tenantId);
}

/** Soft-archive (mechanical delete flag). */
export async function archiveRoundingPolicies(
  db: Database,
  tenantId: (typeof roundingPolicies.$inferSelect)["tenantId"],
  id: (typeof roundingPolicies.$inferSelect)["id"],
) {
  return await db
    .update(roundingPolicies)
    .set({ deletedAt: new Date() })
    .where(and(eq(roundingPolicies.tenantId, tenantId), eq(roundingPolicies.id, id)));
}

export async function archiveRoundingPoliciesGuarded(
  db: Database,
  tenantId: (typeof roundingPolicies.$inferSelect)["tenantId"],
  id: (typeof roundingPolicies.$inferSelect)["id"],
) {
  await assertGraphGuardrailAllowsRead();
  return archiveRoundingPolicies(db, tenantId, id);
}


/** By ID for tenant (no soft-delete column on table). */
export async function getDomainInvariantLogsById(
  db: Database,
  tenantId: (typeof domainInvariantLogs.$inferSelect)["tenantId"],
  id: (typeof domainInvariantLogs.$inferSelect)["id"],
) {
  const rows = await db
    .select()
    .from(domainInvariantLogs)
    .where(and(eq(domainInvariantLogs.tenantId, tenantId), eq(domainInvariantLogs.id, id)))
    .limit(1);
  return rows[0] ?? null;
}

export async function getDomainInvariantLogsByIdGuarded(
  db: Database,
  tenantId: (typeof domainInvariantLogs.$inferSelect)["tenantId"],
  id: (typeof domainInvariantLogs.$inferSelect)["id"],
) {
  await assertGraphGuardrailAllowsRead();
  return getDomainInvariantLogsById(db, tenantId, id);
}

/** List rows for tenant. */
export async function listDomainInvariantLogs(
  db: Database,
  tenantId: (typeof domainInvariantLogs.$inferSelect)["tenantId"],
) {
  return await db.select().from(domainInvariantLogs).where(eq(domainInvariantLogs.tenantId, tenantId));
}

export async function listDomainInvariantLogsGuarded(
  db: Database,
  tenantId: (typeof domainInvariantLogs.$inferSelect)["tenantId"],
) {
  await assertGraphGuardrailAllowsRead();
  return listDomainInvariantLogs(db, tenantId);
}


/** By ID for tenant (no soft-delete column on table). */
export async function getDomainEventLogsById(
  db: Database,
  tenantId: (typeof domainEventLogs.$inferSelect)["tenantId"],
  id: (typeof domainEventLogs.$inferSelect)["id"],
) {
  const rows = await db
    .select()
    .from(domainEventLogs)
    .where(and(eq(domainEventLogs.tenantId, tenantId), eq(domainEventLogs.id, id)))
    .limit(1);
  return rows[0] ?? null;
}

export async function getDomainEventLogsByIdGuarded(
  db: Database,
  tenantId: (typeof domainEventLogs.$inferSelect)["tenantId"],
  id: (typeof domainEventLogs.$inferSelect)["id"],
) {
  await assertGraphGuardrailAllowsRead();
  return getDomainEventLogsById(db, tenantId, id);
}

/** List rows for tenant. */
export async function listDomainEventLogs(
  db: Database,
  tenantId: (typeof domainEventLogs.$inferSelect)["tenantId"],
) {
  return await db.select().from(domainEventLogs).where(eq(domainEventLogs.tenantId, tenantId));
}

export async function listDomainEventLogsGuarded(
  db: Database,
  tenantId: (typeof domainEventLogs.$inferSelect)["tenantId"],
) {
  await assertGraphGuardrailAllowsRead();
  return listDomainEventLogs(db, tenantId);
}

