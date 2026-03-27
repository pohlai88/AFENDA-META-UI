import { getTableColumns } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import {
  commissionEntries,
  accountingPostings,
  commissionPlans,
  commissionPlanTiers,
  consignmentAgreementLines,
  consignmentAgreements,
  consignmentStockReportLines,
  consignmentStockReports,
  documentApprovals,
  documentStatusHistory,
  partners,
  fiscalPositionAccountMaps,
  fiscalPositionTaxMaps,
  fiscalPositions,
  partnerAddresses,
  partnerBankAccounts,
  partnerTagAssignments,
  partnerTags,
  paymentTermLines,
  paymentTerms,
  pricelistItems,
  pricelists,
  productAttributes,
  productAttributeValues,
  productCategories,
  productPackaging,
  products,
  productTemplateAttributeLines,
  productTemplateAttributeValues,
  productTemplates,
  productVariants,
  returnOrderLines,
  returnOrders,
  returnReasonCodes,
  subscriptionCloseReasons,
  subscriptionLines,
  subscriptionLogs,
  subscriptions,
  subscriptionTemplates,
  saleOrderLineTaxes,
  saleOrderOptionLines,
  saleOrderStatusHistory,
  saleOrderTaxSummary,
  lineItemDiscounts,
  roundingPolicies,
  salesDocumentAttachments,
  salesTeamMembers,
  salesTeams,
  salesOrders,
  salesOrderLines,
  territories,
  territoryRules,
  taxGroups,
  taxRateChildren,
  taxRates,
} from "../schema/index.js";

describe("sales domain schema contracts", () => {
  it("partners table keeps identity and contact columns", () => {
    const cols = getTableColumns(partners);

    expect(cols.id).toBeDefined();
    expect(cols.name).toBeDefined();
    expect(cols.type).toBeDefined();
    expect(cols.email).toBeDefined();
    expect(cols.phone).toBeDefined();
    expect(cols.isCompany).toBeDefined();
    expect(cols.parentId).toBeDefined();
    expect(cols.creditLimit).toBeDefined();
    expect(cols.relationshipStart).toBeDefined();
    expect(cols.relationshipEnd).toBeDefined();
    expect(cols.isActive).toBeDefined();
  });

  it("partner addresses table keeps shipping and billing attributes", () => {
    const cols = getTableColumns(partnerAddresses);

    expect(cols.partnerId).toBeDefined();
    expect(cols.type).toBeDefined();
    expect(cols.street).toBeDefined();
    expect(cols.countryId).toBeDefined();
    expect(cols.isDefault).toBeDefined();
  });

  it("partner bank and tag tables expose account and assignment columns", () => {
    expect(getTableColumns(partnerBankAccounts).partnerId).toBeDefined();
    expect(getTableColumns(partnerBankAccounts).accNumber).toBeDefined();
    expect(getTableColumns(partnerTags).name).toBeDefined();
    expect(getTableColumns(partnerTagAssignments).partnerId).toBeDefined();
    expect(getTableColumns(partnerTagAssignments).tagId).toBeDefined();
  });

  it("products table keeps catalog and pricing columns", () => {
    const cols = getTableColumns(products);

    expect(cols.id).toBeDefined();
    expect(cols.name).toBeDefined();
    expect(cols.categoryId).toBeDefined();
    expect(cols.unitPrice).toBeDefined();
    expect(cols.isActive).toBeDefined();
  });

  it("sales orders track status, customer assignment, and totals", () => {
    const cols = getTableColumns(salesOrders);

    expect(cols.id).toBeDefined();
    expect(cols.partnerId).toBeDefined();
    expect(cols.assignedToId).toBeDefined();
    expect(cols.currencyId).toBeDefined();
    expect(cols.pricelistId).toBeDefined();
    expect(cols.paymentTermId).toBeDefined();
    expect(cols.fiscalPositionId).toBeDefined();
    expect(cols.exchangeRateUsed).toBeDefined();
    expect(cols.exchangeRateSource).toBeDefined();
    expect(cols.pricelistSnapshotId).toBeDefined();
    expect(cols.creditCheckPassed).toBeDefined();
    expect(cols.creditCheckAt).toBeDefined();
    expect(cols.creditCheckBy).toBeDefined();
    expect(cols.creditLimitAtCheck).toBeDefined();
    expect(cols.invoiceStatus).toBeDefined();
    expect(cols.deliveryStatus).toBeDefined();
    expect(cols.sequenceNumber).toBeDefined();
    expect(cols.status).toBeDefined();
    expect(cols.amountCost).toBeDefined();
    expect(cols.amountProfit).toBeDefined();
    expect(cols.marginPercent).toBeDefined();
    expect(cols.amountTotal).toBeDefined();
    expect(cols.orderDate).toBeDefined();
  });

  it("sales order lines reference order and product with quantity", () => {
    const cols = getTableColumns(salesOrderLines);

    expect(cols.id).toBeDefined();
    expect(cols.orderId).toBeDefined();
    expect(cols.productId).toBeDefined();
    expect(cols.taxId).toBeDefined();
    expect(cols.productUomId).toBeDefined();
    expect(cols.priceSource).toBeDefined();
    expect(cols.qtyDelivered).toBeDefined();
    expect(cols.qtyToInvoice).toBeDefined();
    expect(cols.qtyInvoiced).toBeDefined();
    expect(cols.quantity).toBeDefined();
    expect(cols.priceUnit).toBeDefined();
    expect(cols.priceListedAt).toBeDefined();
    expect(cols.priceOverrideReason).toBeDefined();
    expect(cols.priceApprovedBy).toBeDefined();
    expect(cols.costUnit).toBeDefined();
    expect(cols.taxRuleSnapshot).toBeDefined();
    expect(cols.discountApprovedAt).toBeDefined();
    expect(cols.subtotal).toBeDefined();
    expect(cols.costSubtotal).toBeDefined();
    expect(cols.profitAmount).toBeDefined();
    expect(cols.marginPercent).toBeDefined();
  });

  it("product categories have a name column", () => {
    const cols = getTableColumns(productCategories);

    expect(cols.id).toBeDefined();
    expect(cols.name).toBeDefined();
  });

  it("tax engine tables include policy and mapping columns", () => {
    expect(getTableColumns(taxGroups).name).toBeDefined();
    expect(getTableColumns(taxRates).typeTaxUse).toBeDefined();
    expect(getTableColumns(taxRates).amountType).toBeDefined();
    expect(getTableColumns(taxRates).effectiveFrom).toBeDefined();
    expect(getTableColumns(taxRates).effectiveTo).toBeDefined();
    expect(getTableColumns(taxRates).replacedBy).toBeDefined();
    expect(getTableColumns(taxRateChildren).parentTaxId).toBeDefined();
    expect(getTableColumns(taxRateChildren).childTaxId).toBeDefined();
    expect(getTableColumns(fiscalPositions).autoApply).toBeDefined();
    expect(getTableColumns(fiscalPositionTaxMaps).taxSrcId).toBeDefined();
    expect(getTableColumns(fiscalPositionTaxMaps).taxDestId).toBeDefined();
    expect(getTableColumns(fiscalPositionAccountMaps).accountSrcId).toBeDefined();
    expect(getTableColumns(fiscalPositionAccountMaps).accountDestId).toBeDefined();
  });

  it("payment term tables expose schedule and sequencing fields", () => {
    expect(getTableColumns(paymentTerms).name).toBeDefined();
    expect(getTableColumns(paymentTerms).isActive).toBeDefined();
    expect(getTableColumns(paymentTermLines).paymentTermId).toBeDefined();
    expect(getTableColumns(paymentTermLines).valueType).toBeDefined();
    expect(getTableColumns(paymentTermLines).days).toBeDefined();
    expect(getTableColumns(paymentTermLines).sequence).toBeDefined();
  });

  it("pricing tables expose policy and rule columns", () => {
    expect(getTableColumns(pricelists).currencyId).toBeDefined();
    expect(getTableColumns(pricelists).discountPolicy).toBeDefined();
    expect(getTableColumns(pricelistItems).pricelistId).toBeDefined();
    expect(getTableColumns(pricelistItems).appliedOn).toBeDefined();
    expect(getTableColumns(pricelistItems).computePrice).toBeDefined();
    expect(getTableColumns(pricelistItems).base).toBeDefined();
    expect(getTableColumns(pricelistItems).minQuantity).toBeDefined();
    expect(getTableColumns(pricelistItems).effectiveFrom).toBeDefined();
    expect(getTableColumns(pricelistItems).effectiveTo).toBeDefined();
    expect(getTableColumns(pricelistItems).supersededBy).toBeDefined();
  });

  it("sale order auxiliary tables capture taxes and status history", () => {
    expect(getTableColumns(saleOrderLineTaxes).orderLineId).toBeDefined();
    expect(getTableColumns(saleOrderLineTaxes).taxId).toBeDefined();
    expect(getTableColumns(saleOrderStatusHistory).orderId).toBeDefined();
    expect(getTableColumns(saleOrderStatusHistory).oldStatus).toBeDefined();
    expect(getTableColumns(saleOrderStatusHistory).newStatus).toBeDefined();
    expect(getTableColumns(saleOrderTaxSummary).orderId).toBeDefined();
    expect(getTableColumns(saleOrderTaxSummary).taxId).toBeDefined();
    expect(getTableColumns(saleOrderTaxSummary).taxGroupId).toBeDefined();
    expect(getTableColumns(saleOrderTaxSummary).baseAmount).toBeDefined();
    expect(getTableColumns(saleOrderTaxSummary).taxAmount).toBeDefined();
  });

  it("sale order option lines enable quotation optional items", () => {
    const cols = getTableColumns(saleOrderOptionLines);
    expect(cols.id).toBeDefined();
    expect(cols.tenantId).toBeDefined();
    expect(cols.orderId).toBeDefined();
    expect(cols.productId).toBeDefined();
    expect(cols.name).toBeDefined();
    expect(cols.quantity).toBeDefined();
    expect(cols.priceUnit).toBeDefined();
    expect(cols.discount).toBeDefined();
    expect(cols.uomId).toBeDefined();
    expect(cols.sequence).toBeDefined();
  });

  it("consignment tables capture agreement, reporting, and stock math columns", () => {
    expect(getTableColumns(consignmentAgreements).partnerId).toBeDefined();
    expect(getTableColumns(consignmentAgreements).status).toBeDefined();
    expect(getTableColumns(consignmentAgreements).reviewPeriodDays).toBeDefined();

    expect(getTableColumns(consignmentAgreementLines).agreementId).toBeDefined();
    expect(getTableColumns(consignmentAgreementLines).productId).toBeDefined();
    expect(getTableColumns(consignmentAgreementLines).maxQuantity).toBeDefined();
    expect(getTableColumns(consignmentAgreementLines).minReportPeriod).toBeDefined();

    expect(getTableColumns(consignmentStockReports).agreementId).toBeDefined();
    expect(getTableColumns(consignmentStockReports).reportDate).toBeDefined();
    expect(getTableColumns(consignmentStockReports).status).toBeDefined();

    expect(getTableColumns(consignmentStockReportLines).reportId).toBeDefined();
    expect(getTableColumns(consignmentStockReportLines).openingQty).toBeDefined();
    expect(getTableColumns(consignmentStockReportLines).soldQty).toBeDefined();
    expect(getTableColumns(consignmentStockReportLines).closingQty).toBeDefined();
    expect(getTableColumns(consignmentStockReportLines).lineTotal).toBeDefined();
  });

  it("return tables capture reasons, workflow state, and line economics", () => {
    expect(getTableColumns(returnReasonCodes).code).toBeDefined();
    expect(getTableColumns(returnReasonCodes).requiresInspection).toBeDefined();
    expect(getTableColumns(returnReasonCodes).restockPolicy).toBeDefined();

    expect(getTableColumns(returnOrders).sourceOrderId).toBeDefined();
    expect(getTableColumns(returnOrders).partnerId).toBeDefined();
    expect(getTableColumns(returnOrders).status).toBeDefined();
    expect(getTableColumns(returnOrders).reasonCodeId).toBeDefined();

    expect(getTableColumns(returnOrderLines).returnOrderId).toBeDefined();
    expect(getTableColumns(returnOrderLines).sourceLineId).toBeDefined();
    expect(getTableColumns(returnOrderLines).productId).toBeDefined();
    expect(getTableColumns(returnOrderLines).quantity).toBeDefined();
    expect(getTableColumns(returnOrderLines).condition).toBeDefined();
    expect(getTableColumns(returnOrderLines).creditAmount).toBeDefined();
  });

  it("subscription tables capture templates, contracts, recurring lines, and lifecycle logs", () => {
    expect(getTableColumns(subscriptionTemplates).billingPeriod).toBeDefined();
    expect(getTableColumns(subscriptionTemplates).billingDay).toBeDefined();
    expect(getTableColumns(subscriptionTemplates).renewalPeriod).toBeDefined();
    expect(getTableColumns(subscriptionTemplates).paymentTermId).toBeDefined();
    expect(getTableColumns(subscriptionTemplates).pricelistId).toBeDefined();

    expect(getTableColumns(subscriptions).partnerId).toBeDefined();
    expect(getTableColumns(subscriptions).templateId).toBeDefined();
    expect(getTableColumns(subscriptions).status).toBeDefined();
    expect(getTableColumns(subscriptions).nextInvoiceDate).toBeDefined();
    expect(getTableColumns(subscriptions).recurringTotal).toBeDefined();
    expect(getTableColumns(subscriptions).mrr).toBeDefined();
    expect(getTableColumns(subscriptions).arr).toBeDefined();
    expect(getTableColumns(subscriptions).closeReasonId).toBeDefined();

    expect(getTableColumns(subscriptionLines).subscriptionId).toBeDefined();
    expect(getTableColumns(subscriptionLines).productId).toBeDefined();
    expect(getTableColumns(subscriptionLines).uomId).toBeDefined();
    expect(getTableColumns(subscriptionLines).quantity).toBeDefined();
    expect(getTableColumns(subscriptionLines).priceUnit).toBeDefined();
    expect(getTableColumns(subscriptionLines).discount).toBeDefined();
    expect(getTableColumns(subscriptionLines).subtotal).toBeDefined();

    expect(getTableColumns(subscriptionLogs).subscriptionId).toBeDefined();
    expect(getTableColumns(subscriptionLogs).eventType).toBeDefined();
    expect(getTableColumns(subscriptionLogs).oldMrr).toBeDefined();
    expect(getTableColumns(subscriptionLogs).newMrr).toBeDefined();
    expect(getTableColumns(subscriptionLogs).eventAt).toBeDefined();

    expect(getTableColumns(subscriptionCloseReasons).code).toBeDefined();
    expect(getTableColumns(subscriptionCloseReasons).name).toBeDefined();
    expect(getTableColumns(subscriptionCloseReasons).isChurn).toBeDefined();
  });

  it("phase 10 tables capture sales org structure, territories, and commissions", () => {
    expect(getTableColumns(salesTeams).code).toBeDefined();
    expect(getTableColumns(salesTeams).managerId).toBeDefined();
    expect(getTableColumns(salesTeams).isActive).toBeDefined();

    expect(getTableColumns(salesTeamMembers).teamId).toBeDefined();
    expect(getTableColumns(salesTeamMembers).userId).toBeDefined();
    expect(getTableColumns(salesTeamMembers).role).toBeDefined();
    expect(getTableColumns(salesTeamMembers).isLeader).toBeDefined();

    expect(getTableColumns(territories).code).toBeDefined();
    expect(getTableColumns(territories).parentId).toBeDefined();
    expect(getTableColumns(territories).teamId).toBeDefined();
    expect(getTableColumns(territories).defaultSalespersonId).toBeDefined();

    expect(getTableColumns(territoryRules).territoryId).toBeDefined();
    expect(getTableColumns(territoryRules).countryId).toBeDefined();
    expect(getTableColumns(territoryRules).stateId).toBeDefined();
    expect(getTableColumns(territoryRules).zipFrom).toBeDefined();
    expect(getTableColumns(territoryRules).zipTo).toBeDefined();
    expect(getTableColumns(territoryRules).priority).toBeDefined();

    expect(getTableColumns(commissionPlans).type).toBeDefined();
    expect(getTableColumns(commissionPlans).base).toBeDefined();
    expect(getTableColumns(commissionPlans).isActive).toBeDefined();

    expect(getTableColumns(commissionPlanTiers).planId).toBeDefined();
    expect(getTableColumns(commissionPlanTiers).minAmount).toBeDefined();
    expect(getTableColumns(commissionPlanTiers).maxAmount).toBeDefined();
    expect(getTableColumns(commissionPlanTiers).rate).toBeDefined();
    expect(getTableColumns(commissionPlanTiers).sequence).toBeDefined();

    expect(getTableColumns(commissionEntries).orderId).toBeDefined();
    expect(getTableColumns(commissionEntries).salespersonId).toBeDefined();
    expect(getTableColumns(commissionEntries).planId).toBeDefined();
    expect(getTableColumns(commissionEntries).baseAmount).toBeDefined();
    expect(getTableColumns(commissionEntries).commissionAmount).toBeDefined();
    expect(getTableColumns(commissionEntries).status).toBeDefined();
    expect(getTableColumns(commissionEntries).periodStart).toBeDefined();
    expect(getTableColumns(commissionEntries).periodEnd).toBeDefined();
  });

  it("phase 11 tables capture document infrastructure and accounting bridge columns", () => {
    expect(getTableColumns(documentStatusHistory).documentType).toBeDefined();
    expect(getTableColumns(documentStatusHistory).documentId).toBeDefined();
    expect(getTableColumns(documentStatusHistory).fromStatus).toBeDefined();
    expect(getTableColumns(documentStatusHistory).toStatus).toBeDefined();
    expect(getTableColumns(documentStatusHistory).transitionedAt).toBeDefined();
    expect(getTableColumns(documentStatusHistory).transitionedBy).toBeDefined();

    expect(getTableColumns(documentApprovals).documentType).toBeDefined();
    expect(getTableColumns(documentApprovals).documentId).toBeDefined();
    expect(getTableColumns(documentApprovals).approvalLevel).toBeDefined();
    expect(getTableColumns(documentApprovals).approverUserId).toBeDefined();
    expect(getTableColumns(documentApprovals).status).toBeDefined();
    expect(getTableColumns(documentApprovals).documentAmount).toBeDefined();

    expect(getTableColumns(salesDocumentAttachments).documentType).toBeDefined();
    expect(getTableColumns(salesDocumentAttachments).documentId).toBeDefined();
    expect(getTableColumns(salesDocumentAttachments).fileName).toBeDefined();
    expect(getTableColumns(salesDocumentAttachments).fileSize).toBeDefined();
    expect(getTableColumns(salesDocumentAttachments).mimeType).toBeDefined();
    expect(getTableColumns(salesDocumentAttachments).storageProvider).toBeDefined();
    expect(getTableColumns(salesDocumentAttachments).storagePath).toBeDefined();
    expect(getTableColumns(salesDocumentAttachments).isPublic).toBeDefined();

    expect(getTableColumns(lineItemDiscounts).documentType).toBeDefined();
    expect(getTableColumns(lineItemDiscounts).lineId).toBeDefined();
    expect(getTableColumns(lineItemDiscounts).discountType).toBeDefined();
    expect(getTableColumns(lineItemDiscounts).discountPercent).toBeDefined();
    expect(getTableColumns(lineItemDiscounts).discountAmount).toBeDefined();
    expect(getTableColumns(lineItemDiscounts).authorizedBy).toBeDefined();
    expect(getTableColumns(lineItemDiscounts).sequence).toBeDefined();

    expect(getTableColumns(accountingPostings).sourceDocumentType).toBeDefined();
    expect(getTableColumns(accountingPostings).sourceDocumentId).toBeDefined();
    expect(getTableColumns(accountingPostings).journalEntryId).toBeDefined();
    expect(getTableColumns(accountingPostings).postingDate).toBeDefined();
    expect(getTableColumns(accountingPostings).amount).toBeDefined();
    expect(getTableColumns(accountingPostings).currencyCode).toBeDefined();
    expect(getTableColumns(accountingPostings).postingStatus).toBeDefined();
    expect(getTableColumns(accountingPostings).reversalEntryId).toBeDefined();

    expect(getTableColumns(roundingPolicies).policyName).toBeDefined();
    expect(getTableColumns(roundingPolicies).policyKey).toBeDefined();
    expect(getTableColumns(roundingPolicies).roundingMethod).toBeDefined();
    expect(getTableColumns(roundingPolicies).roundingPrecision).toBeDefined();
    expect(getTableColumns(roundingPolicies).roundingUnit).toBeDefined();
    expect(getTableColumns(roundingPolicies).appliesTo).toBeDefined();
    expect(getTableColumns(roundingPolicies).currencyCode).toBeDefined();
    expect(getTableColumns(roundingPolicies).effectiveFrom).toBeDefined();
    expect(getTableColumns(roundingPolicies).effectiveTo).toBeDefined();
  });

  it("phase 1 enhancement: partners table has all 11 new columns", () => {
    const cols = getTableColumns(partners);

    // Original columns
    expect(cols.id).toBeDefined();
    expect(cols.tenantId).toBeDefined();
    expect(cols.name).toBeDefined();
    expect(cols.email).toBeDefined();
    expect(cols.phone).toBeDefined();
    expect(cols.type).toBeDefined();
    expect(cols.isActive).toBeDefined();

    // Phase 1: Company Hierarchy (2 columns)
    expect(cols.isCompany).toBeDefined();
    expect(cols.parentId).toBeDefined();

    // Phase 1: Localization (3 columns)
    expect(cols.vat).toBeDefined();
    expect(cols.countryId).toBeDefined();
    expect(cols.stateId).toBeDefined();

    // Phase 1: Credit Management (1 column)
    expect(cols.creditLimit).toBeDefined();

    // Phase 1: Default References (3 columns)
    expect(cols.defaultPaymentTermId).toBeDefined();
    expect(cols.defaultPricelistId).toBeDefined();
    expect(cols.defaultFiscalPositionId).toBeDefined();

    // Phase 1: Accounting Integration (2 columns)
    expect(cols.propertyAccountReceivableId).toBeDefined();
    expect(cols.propertyAccountPayableId).toBeDefined();

    // Financial tracking
    expect(cols.totalInvoiced).toBeDefined();
    expect(cols.totalDue).toBeDefined();
  });

  it("phase 1 enhancement: partner_addresses supports multi-address with type defaults", () => {
    const cols = getTableColumns(partnerAddresses);

    expect(cols.id).toBeDefined();
    expect(cols.tenantId).toBeDefined();
    expect(cols.partnerId).toBeDefined();

    // Address type system
    expect(cols.type).toBeDefined(); // 'invoice', 'delivery', 'contact'
    expect(cols.isDefault).toBeDefined();

    // Address fields
    expect(cols.street).toBeDefined();
    expect(cols.street2).toBeDefined();
    expect(cols.city).toBeDefined();
    expect(cols.stateId).toBeDefined();
    expect(cols.countryId).toBeDefined();
    expect(cols.zip).toBeDefined();
    expect(cols.phone).toBeDefined();
    expect(cols.email).toBeDefined();
    expect(cols.contactName).toBeDefined();

    // Audit columns
    expect(cols.createdAt).toBeDefined();
    expect(cols.updatedAt).toBeDefined();
    expect(cols.deletedAt).toBeDefined();
    expect(cols.createdBy).toBeDefined();
  });

  it("phase 1 enhancement: partner_bank_accounts links to reference.banks", () => {
    const cols = getTableColumns(partnerBankAccounts);

    expect(cols.id).toBeDefined();
    expect(cols.tenantId).toBeDefined();
    expect(cols.partnerId).toBeDefined();
    expect(cols.bankId).toBeDefined(); // FK to reference.banks
    expect(cols.accNumber).toBeDefined();
    expect(cols.accHolderName).toBeDefined();
    expect(cols.isDefault).toBeDefined();
  });

  it("phase 1 enhancement: partner_tags and assignments enable CRM tagging", () => {
    const tagCols = getTableColumns(partnerTags);
    expect(tagCols.id).toBeDefined();
    expect(tagCols.tenantId).toBeDefined();
    expect(tagCols.name).toBeDefined();
    expect(tagCols.color).toBeDefined();

    const assignCols = getTableColumns(partnerTagAssignments);
    expect(assignCols.id).toBeDefined();
    expect(assignCols.tenantId).toBeDefined();
    expect(assignCols.partnerId).toBeDefined();
    expect(assignCols.tagId).toBeDefined();
  });

  // ───────────────────────────────────────────────────────────────────────────
  // Phase 2: Tax Engine
  // ───────────────────────────────────────────────────────────────────────────

  it("phase 2: tax_groups organizes taxes by country/category", () => {
    const cols = getTableColumns(taxGroups);
    expect(cols.id).toBeDefined();
    expect(cols.tenantId).toBeDefined();
    expect(cols.name).toBeDefined();
    expect(cols.sequence).toBeDefined();
    expect(cols.countryId).toBeDefined();
    expect(cols.createdAt).toBeDefined();
    expect(cols.updatedAt).toBeDefined();
    expect(cols.deletedAt).toBeDefined();
  });

  it("phase 2: tax_rates defines individual taxes with percent/fixed amounts", () => {
    const cols = getTableColumns(taxRates);
    expect(cols.id).toBeDefined();
    expect(cols.tenantId).toBeDefined();
    expect(cols.name).toBeDefined();
    expect(cols.typeTaxUse).toBeDefined(); // sale/purchase/none
    expect(cols.amountType).toBeDefined(); // percent/fixed/group/code
    expect(cols.amount).toBeDefined();
    expect(cols.taxGroupId).toBeDefined();
    expect(cols.priceInclude).toBeDefined(); // tax-included vs tax-excluded
    expect(cols.isActive).toBeDefined();
    expect(cols.sequence).toBeDefined();
    expect(cols.countryId).toBeDefined();
  });

  it("phase 2: tax_rate_children enables compound taxes (e.g., GST = CGST + SGST)", () => {
    const cols = getTableColumns(taxRateChildren);
    expect(cols.id).toBeDefined();
    expect(cols.tenantId).toBeDefined();
    expect(cols.parentTaxId).toBeDefined(); // FK to parent tax (compound)
    expect(cols.childTaxId).toBeDefined(); // FK to child tax (component)
    expect(cols.sequence).toBeDefined();
  });

  it("phase 2: fiscal_positions define tax mapping rules by location", () => {
    const cols = getTableColumns(fiscalPositions);
    expect(cols.id).toBeDefined();
    expect(cols.tenantId).toBeDefined();
    expect(cols.name).toBeDefined();
    expect(cols.countryId).toBeDefined();
    expect(cols.stateIds).toBeDefined(); // CSV of state IDs
    expect(cols.zipFrom).toBeDefined();
    expect(cols.zipTo).toBeDefined();
    expect(cols.autoApply).toBeDefined(); // Auto-detection flag
    expect(cols.vatRequired).toBeDefined(); // VAT validation flag
  });

  it("phase 2: fiscal_position_tax_maps enable tax substitution and exemptions", () => {
    const cols = getTableColumns(fiscalPositionTaxMaps);
    expect(cols.id).toBeDefined();
    expect(cols.tenantId).toBeDefined();
    expect(cols.fiscalPositionId).toBeDefined();
    expect(cols.taxSrcId).toBeDefined(); // Original tax
    expect(cols.taxDestId).toBeDefined(); // Replacement tax (nullable = exempt)
  });

  it("phase 2: fiscal_position_account_maps enable account remapping", () => {
    const cols = getTableColumns(fiscalPositionAccountMaps);
    expect(cols.id).toBeDefined();
    expect(cols.tenantId).toBeDefined();
    expect(cols.fiscalPositionId).toBeDefined();
    expect(cols.accountSrcId).toBeDefined();
    expect(cols.accountDestId).toBeDefined();
  });

  // Phase 3: Payment Terms
  it("phase 3: payment_terms defines payment schedules with name and active status", () => {
    const cols = getTableColumns(paymentTerms);
    expect(cols.id).toBeDefined();
    expect(cols.tenantId).toBeDefined();
    expect(cols.name).toBeDefined();
    expect(cols.note).toBeDefined(); // Optional human-readable payment instructions
    expect(cols.isActive).toBeDefined(); // Enable/disable term
    expect(cols.deletedAt).toBeDefined(); // Soft delete
    expect(cols.createdAt).toBeDefined();
    expect(cols.updatedAt).toBeDefined();
  });

  it("phase 3: payment_term_lines breaks terms into installment rules", () => {
    const cols = getTableColumns(paymentTermLines);
    expect(cols.id).toBeDefined();
    expect(cols.tenantId).toBeDefined();
    expect(cols.paymentTermId).toBeDefined(); // FK to payment_terms
    expect(cols.valueType).toBeDefined(); // balance | percent | fixed
    expect(cols.value).toBeDefined(); // Percent or fixed amount
    expect(cols.days).toBeDefined(); // Days from invoice date
    expect(cols.dayOfMonth).toBeDefined(); // Optional: specific day of month
    expect(cols.endOfMonth).toBeDefined(); // Optional: last day of month
    expect(cols.sequence).toBeDefined(); // Order of installments
  });

  it("phase 3: payment_term_lines has financial precision constraints", () => {
    const cols = getTableColumns(paymentTermLines);
    // value is numeric with precision 10, scale 4
    expect(cols.value).toBeDefined();
    expect(cols.value.columnType).toBe("PgNumeric");
  });

  // Phase 4: Pricing Engine
  it("phase 4: pricelists defines price catalog with currency and discount policy", () => {
    const cols = getTableColumns(pricelists);
    expect(cols.id).toBeDefined();
    expect(cols.tenantId).toBeDefined();
    expect(cols.name).toBeDefined();
    expect(cols.currencyId).toBeDefined(); // Multi-currency pricing
    expect(cols.discountPolicy).toBeDefined(); // with_discount | without_discount
    expect(cols.isActive).toBeDefined();
    expect(cols.sequence).toBeDefined(); // Display order
    expect(cols.deletedAt).toBeDefined(); // Soft delete
    expect(cols.createdAt).toBeDefined();
    expect(cols.updatedAt).toBeDefined();
  });

  it("phase 4: pricelist_items defines price rules with computed price type and scope", () => {
    const cols = getTableColumns(pricelistItems);
    expect(cols.id).toBeDefined();
    expect(cols.tenantId).toBeDefined();
    expect(cols.pricelistId).toBeDefined(); // FK to pricelists
    expect(cols.appliedOn).toBeDefined(); // global | product_template | product_variant | product_category
    expect(cols.computePrice).toBeDefined(); // fixed | percentage | formula
    expect(cols.base).toBeDefined(); // list_price | standard_price | pricelist
    expect(cols.minQuantity).toBeDefined(); // Quantity break threshold
    expect(cols.dateStart).toBeDefined(); // Optional date range start
    expect(cols.dateEnd).toBeDefined(); // Optional date range end
    expect(cols.effectiveFrom).toBeDefined(); // Lineage effectivity start
    expect(cols.effectiveTo).toBeDefined(); // Lineage effectivity end
    expect(cols.supersededBy).toBeDefined(); // Self-FK to next rule revision
    expect(cols.sequence).toBeDefined(); // Rule priority within pricelist
    expect(cols.isActive).toBeDefined();
  });

  it("phase 4: pricelist_items has financial precision for price fields", () => {
    const cols = getTableColumns(pricelistItems);
    // All money columns should be PgNumeric (not float)
    expect(cols.fixedPrice.columnType).toBe("PgNumeric");
    expect(cols.priceSurcharge.columnType).toBe("PgNumeric");
    expect(cols.priceDiscount.columnType).toBe("PgNumeric");
    expect(cols.priceMinMargin.columnType).toBe("PgNumeric");
    expect(cols.priceMaxMargin.columnType).toBe("PgNumeric");
    expect(cols.minQuantity.columnType).toBe("PgNumeric");
  });

  // Phase 5: Product Configuration
  it("phase 5: product_templates defines archetype with pricing, UoM and lifecycle fields", () => {
    const cols = getTableColumns(productTemplates);
    expect(cols.id).toBeDefined();
    expect(cols.tenantId).toBeDefined();
    expect(cols.name).toBeDefined();
    expect(cols.listPrice).toBeDefined();
    expect(cols.listPrice.columnType).toBe("PgNumeric");
    expect(cols.standardPrice).toBeDefined();
    expect(cols.standardPrice.columnType).toBe("PgNumeric");
    expect(cols.type).toBeDefined();
    expect(cols.tracking).toBeDefined();
    expect(cols.invoicePolicy).toBeDefined();
    expect(cols.uomId).toBeDefined();
    expect(cols.deletedAt).toBeDefined();
    expect(cols.createdAt).toBeDefined();
  });

  it("phase 5: product_variants links to template with deterministic combination_indices", () => {
    const cols = getTableColumns(productVariants);
    expect(cols.id).toBeDefined();
    expect(cols.tenantId).toBeDefined();
    expect(cols.templateId).toBeDefined();
    expect(cols.combinationIndices).toBeDefined();
    expect(cols.lstPrice).toBeDefined();
    expect(cols.isActive).toBeDefined();
    expect(cols.deletedAt).toBeDefined();
  });

  it("phase 5: product_attributes and attribute_values define the variant dimension matrix", () => {
    const attrCols = getTableColumns(productAttributes);
    expect(attrCols.id).toBeDefined();
    expect(attrCols.displayType).toBeDefined();
    expect(attrCols.createVariantPolicy).toBeDefined();

    const valCols = getTableColumns(productAttributeValues);
    expect(valCols.attributeId).toBeDefined();
    expect(valCols.htmlColor).toBeDefined();

    const lineCols = getTableColumns(productTemplateAttributeLines);
    expect(lineCols.templateId).toBeDefined();
    expect(lineCols.attributeId).toBeDefined();

    const tmplValCols = getTableColumns(productTemplateAttributeValues);
    expect(tmplValCols.templateAttributeLineId).toBeDefined();
    expect(tmplValCols.priceExtra).toBeDefined();
    expect(tmplValCols.priceExtra.columnType).toBe("PgNumeric");
  });

  // Phase 8: Returns/RMA Process
  it("phase 8: return_reason_codes defines standard return reasons with active status", () => {
    const cols = getTableColumns(returnReasonCodes);
    expect(cols.id).toBeDefined();
    expect(cols.tenantId).toBeDefined();
    expect(cols.code).toBeDefined(); // Unique code (e.g., "DAMAGED", "DEFECTIVE")
    expect(cols.name).toBeDefined(); // Human-readable name
    expect(cols.requiresInspection).toBeDefined(); // Inspection required?
    expect(cols.restockPolicy).toBeDefined(); // restock | scrap | refurbish
    expect(cols.isActive).toBeDefined(); // Can deactivate reasons
    expect(cols.deletedAt).toBeDefined(); // Soft delete
    expect(cols.createdAt).toBeDefined();
    expect(cols.updatedAt).toBeDefined();
  });

  it("phase 8: return_orders has state machine and approval workflow", () => {
    const cols = getTableColumns(returnOrders);
    expect(cols.id).toBeDefined();
    expect(cols.tenantId).toBeDefined();
    expect(cols.name).toBeDefined(); // RMA number (e.g., "RMA-2024-0001")
    expect(cols.sourceOrderId).toBeDefined(); // FK to original sales order
    expect(cols.partnerId).toBeDefined(); // FK to partner
    expect(cols.reasonCodeId).toBeDefined(); // FK to return_reason_codes

    // State machine (draft → approved → received → inspected → credited)
    expect(cols.status).toBeDefined();

    // Approval workflow
    expect(cols.approvedBy).toBeDefined(); // Actor ID who approved
    expect(cols.approvedDate).toBeDefined(); // Approval timestamp

    // Additional fields
    expect(cols.notes).toBeDefined(); // Return notes

    // Audit trail
    expect(cols.deletedAt).toBeDefined();
    expect(cols.createdAt).toBeDefined();
    expect(cols.updatedAt).toBeDefined();
    expect(cols.createdBy).toBeDefined();
    expect(cols.updatedBy).toBeDefined();
  });

  it("phase 8: return_order_lines has financial precision for quantity and credit calculations", () => {
    const cols = getTableColumns(returnOrderLines);
    expect(cols.id).toBeDefined();
    expect(cols.tenantId).toBeDefined();
    expect(cols.returnOrderId).toBeDefined(); // FK to return_orders
    expect(cols.sourceLineId).toBeDefined(); // FK to original sales order line
    expect(cols.productId).toBeDefined(); // FK to product

    // Quantity tracking with precision
    expect(cols.quantity).toBeDefined();
    expect(cols.quantity.columnType).toBe("PgNumeric");

    // Financial fields with PgNumeric precision
    expect(cols.unitPrice).toBeDefined();
    expect(cols.unitPrice.columnType).toBe("PgNumeric");
    expect(cols.creditAmount).toBeDefined();
    expect(cols.creditAmount.columnType).toBe("PgNumeric");

    // Inspection results
    expect(cols.condition).toBeDefined(); // good | damaged | defective | used
    expect(cols.notes).toBeDefined(); // Line notes

    // Audit columns
    expect(cols.createdAt).toBeDefined();
    expect(cols.updatedAt).toBeDefined();
  });
});
