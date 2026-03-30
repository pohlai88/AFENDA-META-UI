import { sql } from "drizzle-orm";

import {
  countries,
  fiscalPositionAccountMaps,
  fiscalPositionTaxMaps,
  fiscalPositions,
  states,
  taxGroups,
  taxRateChildren,
  taxRates,
} from "../../../../schema/index.js";
import { SEED_IDS } from "../../seed-ids.js";
import { type SeedAuditScope, type Tx } from "../../seed-types.js";

export async function seedTaxPolicies(tx: Tx, seedAuditScope: SeedAuditScope): Promise<void> {
  const usCountry = await tx
    .select({ countryId: countries.countryId })
    .from(countries)
    .where(sql`upper(${countries.code}) = 'US'`)
    .limit(1);

  const deCountry = await tx
    .select({ countryId: countries.countryId })
    .from(countries)
    .where(sql`upper(${countries.code}) = 'DE'`)
    .limit(1);

  const inCountry = await tx
    .select({ countryId: countries.countryId })
    .from(countries)
    .where(sql`upper(${countries.code}) = 'IN'`)
    .limit(1);

  const caState = await tx
    .select({ stateId: states.stateId })
    .from(states)
    .where(sql`upper(${states.code}) = 'CA'`)
    .limit(1);

  // Phase 0: Baseline tax group
  await tx
    .insert(taxGroups)
    .values([
      {
        ...seedAuditScope,
        id: SEED_IDS.taxGroupSalesStandard,
        name: "Sales Tax",
        sequence: 10,
        countryId: usCountry[0]?.countryId ?? null,
      },
    ])
    .execute();

  // Phase 2: Enhanced tax groups (VAT, GST)
  await tx
    .insert(taxGroups)
    .values([
      {
        ...seedAuditScope,
        id: SEED_IDS.taxGroupVat,
        name: "VAT",
        sequence: 20,
        countryId: deCountry[0]?.countryId ?? null,
      },
      {
        ...seedAuditScope,
        id: SEED_IDS.taxGroupGst,
        name: "GST",
        sequence: 30,
        countryId: inCountry[0]?.countryId ?? null,
      },
    ])
    .execute();

  // Phase 0: Baseline tax rate
  await tx
    .insert(taxRates)
    .values([
      {
        ...seedAuditScope,
        id: SEED_IDS.taxRateSalesStandard10,
        name: "Sales Tax 10%",
        typeTaxUse: "sale",
        amountType: "percent",
        amount: "10",
        effectiveFrom: new Date("2024-01-01T00:00:00Z"),
        taxGroupId: SEED_IDS.taxGroupSalesStandard,
        priceInclude: false,
        isActive: true,
        sequence: 10,
        countryId: usCountry[0]?.countryId ?? null,
      },
    ])
    .execute();

  // Phase 2: Enhanced tax rates (VAT, GST components, compound GST, city tax)
  await tx
    .insert(taxRates)
    .values([
      {
        ...seedAuditScope,
        id: SEED_IDS.taxRateVat20,
        name: "VAT 20%",
        typeTaxUse: "sale",
        amountType: "percent",
        amount: "20",
        effectiveFrom: new Date("2024-01-01T00:00:00Z"),
        taxGroupId: SEED_IDS.taxGroupVat,
        priceInclude: true,
        isActive: true,
        sequence: 10,
        countryId: deCountry[0]?.countryId ?? null,
      },
      {
        ...seedAuditScope,
        id: SEED_IDS.taxRateCgst9,
        name: "CGST 9%",
        typeTaxUse: "sale",
        amountType: "percent",
        amount: "9",
        effectiveFrom: new Date("2024-01-01T00:00:00Z"),
        taxGroupId: SEED_IDS.taxGroupGst,
        priceInclude: false,
        isActive: true,
        sequence: 10,
        countryId: inCountry[0]?.countryId ?? null,
      },
      {
        ...seedAuditScope,
        id: SEED_IDS.taxRateSgst9,
        name: "SGST 9%",
        typeTaxUse: "sale",
        amountType: "percent",
        amount: "9",
        effectiveFrom: new Date("2024-01-01T00:00:00Z"),
        taxGroupId: SEED_IDS.taxGroupGst,
        priceInclude: false,
        isActive: true,
        sequence: 20,
        countryId: inCountry[0]?.countryId ?? null,
      },
      {
        ...seedAuditScope,
        id: SEED_IDS.taxRateGst18,
        name: "GST 18% (Compound)",
        typeTaxUse: "sale",
        amountType: "group",
        amount: "0",
        effectiveFrom: new Date("2024-01-01T00:00:00Z"),
        taxGroupId: SEED_IDS.taxGroupGst,
        priceInclude: false,
        isActive: true,
        sequence: 30,
        countryId: inCountry[0]?.countryId ?? null,
      },
      {
        ...seedAuditScope,
        id: SEED_IDS.taxRateCityTax2,
        name: "City Sales Tax 2%",
        typeTaxUse: "sale",
        amountType: "percent",
        amount: "2",
        effectiveFrom: new Date("2023-01-01T00:00:00Z"),
        effectiveTo: new Date("2023-12-31T23:59:59Z"),
        replacedBy: SEED_IDS.taxRateSalesStandard10,
        taxGroupId: SEED_IDS.taxGroupSalesStandard,
        priceInclude: false,
        isActive: true,
        sequence: 20,
        countryId: usCountry[0]?.countryId ?? null,
      },
    ])
    .execute();

  // Phase 2: Compound tax definition (GST 18% = CGST 9% + SGST 9%)
  await tx
    .insert(taxRateChildren)
    .values([
      {
        ...seedAuditScope,
        parentTaxId: SEED_IDS.taxRateGst18,
        childTaxId: SEED_IDS.taxRateCgst9,
        sequence: 10,
      },
      {
        ...seedAuditScope,
        parentTaxId: SEED_IDS.taxRateGst18,
        childTaxId: SEED_IDS.taxRateSgst9,
        sequence: 20,
      },
    ])
    .execute();

  // Phase 2: Fiscal positions for tax jurisdiction mapping
  const fiscalPositionValues: (typeof fiscalPositions.$inferInsert)[] = [
    {
      ...seedAuditScope,
      id: SEED_IDS.fiscalPositionDomesticUs,
      name: "Domestic (US)",
      countryId: usCountry[0]?.countryId ?? null,
      stateIds: null,
      autoApply: true,
      vatRequired: false,
      zipFrom: null,
      zipTo: null,
      sequence: 10,
      isActive: true,
    },
    {
      ...seedAuditScope,
      id: SEED_IDS.fiscalPositionInternationalEu,
      name: "International (EU)",
      countryId: deCountry[0]?.countryId ?? null,
      stateIds: null,
      autoApply: true,
      vatRequired: true,
      zipFrom: null,
      zipTo: null,
      sequence: 20,
      isActive: true,
    },
    {
      ...seedAuditScope,
      id: SEED_IDS.fiscalPositionIndiaGst,
      name: "India GST",
      countryId: inCountry[0]?.countryId ?? null,
      stateIds: null,
      autoApply: true,
      vatRequired: false,
      zipFrom: null,
      zipTo: null,
      sequence: 30,
      isActive: true,
    },
    {
      ...seedAuditScope,
      id: SEED_IDS.fiscalPositionTaxExempt,
      name: "Tax Exempt",
      countryId: usCountry[0]?.countryId ?? null,
      stateIds: caState[0]?.stateId ? String(caState[0].stateId) : null,
      autoApply: false,
      vatRequired: false,
      zipFrom: null,
      zipTo: null,
      sequence: 40,
      isActive: true,
    },
  ];

  await tx.insert(fiscalPositions).values(fiscalPositionValues).execute();

  // Phase 2: Tax mapping rules
  const fiscalPositionTaxMapValues: (typeof fiscalPositionTaxMaps.$inferInsert)[] = [
    {
      ...seedAuditScope,
      id: SEED_IDS.fiscalPositionTaxMapUsToVat,
      fiscalPositionId: SEED_IDS.fiscalPositionInternationalEu,
      taxSrcId: SEED_IDS.taxRateSalesStandard10,
      taxDestId: SEED_IDS.taxRateVat20,
      sequence: 10,
    },
    {
      ...seedAuditScope,
      id: SEED_IDS.fiscalPositionTaxMapExemption,
      fiscalPositionId: SEED_IDS.fiscalPositionTaxExempt,
      taxSrcId: SEED_IDS.taxRateSalesStandard10,
      taxDestId: null,
      sequence: 10,
    },
  ];

  await tx.insert(fiscalPositionTaxMaps).values(fiscalPositionTaxMapValues).execute();

  // fiscalPositionAccountMaps — no baseline entries needed
  void fiscalPositionAccountMaps;

  console.log("✓ Seeded Phase 0 + Phase 2 tax policies");
  console.log("  - 3 tax groups (Sales, VAT, GST)");
  console.log("  - 6 tax rates (10% sales, 20% VAT, 9% CGST, 9% SGST, 18% GST compound, 2% city)");
  console.log("  - 1 compound tax (GST 18% = CGST + SGST)");
  console.log("  - 4 fiscal positions (Domestic, EU, India, Tax Exempt)");
  console.log("  - 2 tax maps (US→VAT substitution, exemption)");
}
