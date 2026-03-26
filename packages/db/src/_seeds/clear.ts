/**
 * clearExistingData — wipes all seeded rows in FK-reverse dependency order.
 *
 * Protocol for new domains:
 *   Append domain table deletes at the TOP of this function (before tables
 *   that the new domain depends on). Maintain FK-reverse order so Postgres
 *   referential integrity is never violated.
 *
 * Example for HRM:
 *   await tx.delete(employeeContracts).execute();
 *   await tx.delete(employees).execute();
 *   // … then existing deletes follow
 */

import {
  approvalLogs,
  banks,
  commissionEntries,
  commissionPlanTiers,
  commissionPlans,
  consignmentAgreementLines,
  consignmentAgreements,
  consignmentStockReportLines,
  consignmentStockReports,
  countries,
  currencies,
  currencyRates,
  documentAttachments,
  fiscalPositionAccountMaps,
  fiscalPositionTaxMaps,
  fiscalPositions,
  partners,
  partnerAddresses,
  partnerBankAccounts,
  partnerTagAssignments,
  partnerTags,
  paymentTermLines,
  paymentTerms,
  pricelistItems,
  pricelists,
  productAttributeValues,
  productAttributes,
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
  saleOrderLineTaxes,
  saleOrderStatusHistory,
  saleOrderTaxSummary,
  salesOrderLines,
  salesOrders,
  salesTeamMembers,
  salesTeams,
  sequences,
  states,
  subscriptionCloseReasons,
  subscriptionLines,
  subscriptionLogs,
  subscriptions,
  subscriptionTemplates,
  taxGroups,
  taxRateChildren,
  taxRates,
  territories,
  territoryRules,
  uomCategories,
  unitsOfMeasure,
} from "../schema/index.js";
import { type Tx } from "./seed-types.js";

export async function clearExistingData(tx: Tx): Promise<void> {
  // Delete in reverse FK order to maintain referential integrity.
  // ── Phase 10: Commissions & Teams ─────────────────────────────────────────
  await tx.delete(approvalLogs).execute();
  await tx.delete(documentAttachments).execute();
  await tx.delete(commissionEntries).execute();
  await tx.delete(commissionPlanTiers).execute();
  await tx.delete(commissionPlans).execute();
  await tx.delete(territoryRules).execute();
  await tx.delete(territories).execute();
  await tx.delete(salesTeamMembers).execute();
  await tx.delete(salesTeams).execute();
  // ── Phase 9: Subscriptions ────────────────────────────────────────────────
  await tx.delete(subscriptionLogs).execute();
  await tx.delete(subscriptionLines).execute();
  await tx.delete(subscriptions).execute();
  await tx.delete(subscriptionTemplates).execute();
  await tx.delete(subscriptionCloseReasons).execute();
  // ── Phase 8: Returns / RMA ────────────────────────────────────────────────
  await tx.delete(returnOrderLines).execute();
  await tx.delete(returnOrders).execute();
  await tx.delete(returnReasonCodes).execute();
  // ── Phase 7: Consignment ──────────────────────────────────────────────────
  await tx.delete(consignmentStockReportLines).execute();
  await tx.delete(consignmentStockReports).execute();
  await tx.delete(consignmentAgreementLines).execute();
  await tx.delete(consignmentAgreements).execute();
  // ── Phase 6: Sales Auxiliary ──────────────────────────────────────────────
  await tx.delete(saleOrderLineTaxes).execute();
  await tx.delete(saleOrderTaxSummary).execute();
  await tx.delete(saleOrderStatusHistory).execute();
  // ── Commercial Policy ─────────────────────────────────────────────────────
  await tx.delete(pricelistItems).execute();
  await tx.delete(pricelists).execute();
  await tx.delete(paymentTermLines).execute();
  await tx.delete(paymentTerms).execute();
  // ── Tax ───────────────────────────────────────────────────────────────────
  await tx.delete(fiscalPositionTaxMaps).execute();
  await tx.delete(fiscalPositionAccountMaps).execute();
  await tx.delete(taxRateChildren).execute();
  await tx.delete(taxRates).execute();
  await tx.delete(taxGroups).execute();
  await tx.delete(fiscalPositions).execute();
  // ── Sales Core ────────────────────────────────────────────────────────────
  await tx.delete(salesOrderLines).execute();
  await tx.delete(salesOrders).execute();
  // ── Product ───────────────────────────────────────────────────────────────
  await tx.delete(productPackaging).execute();
  await tx.delete(productTemplateAttributeValues).execute();
  await tx.delete(productVariants).execute();
  await tx.delete(productTemplateAttributeLines).execute();
  await tx.delete(productAttributeValues).execute();
  await tx.delete(productAttributes).execute();
  await tx.delete(productTemplates).execute();
  await tx.delete(products).execute();
  await tx.delete(productCategories).execute();
  // ── Partner ───────────────────────────────────────────────────────────────
  await tx.delete(partnerTagAssignments).execute();
  await tx.delete(partnerTags).execute();
  await tx.delete(partnerBankAccounts).execute();
  await tx.delete(partnerAddresses).execute();
  await tx.delete(partners).execute();
  // ── Foundation ────────────────────────────────────────────────────────────
  await tx.delete(sequences).execute();
  await tx.delete(unitsOfMeasure).execute();
  await tx.delete(uomCategories).execute();
  await tx.delete(banks).execute();
  await tx.delete(currencyRates).execute();
  await tx.delete(currencies).execute();
  await tx.delete(states).execute();
  await tx.delete(countries).execute();
  console.log("✓ Cleared existing data");
}
