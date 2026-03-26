import {
  banks,
  countries,
  partners,
  partnerAddresses,
  partnerBankAccounts,
  partnerTagAssignments,
  partnerTags,
  states,
} from "../../../schema/index.js";
import { SEED_IDS } from "../../seed-ids.js";
import { type SeedAuditScope, type Tx } from "../../seed-types.js";

export async function seedPartners(tx: Tx, seedAuditScope: SeedAuditScope): Promise<void> {
  const countriesData = await tx.select().from(countries).execute();
  const statesData = await tx.select().from(states).execute();
  const banksData = await tx.select().from(banks).execute();

  const countryByCode = new Map(countriesData.map((c) => [c.code.toUpperCase(), c.countryId]));
  const usCountryId = countryByCode.get("US");
  const gbCountryId = countryByCode.get("GB");

  const stateCA = statesData.find((s) => s.code === "CA");
  const stateNY = statesData.find((s) => s.code === "NY");

  const demoBank = banksData[0];

  await tx
    .insert(partners)
    .values([
      {
        ...seedAuditScope,
        id: SEED_IDS.partnerAccentCorp,
        name: "Accent Corporation",
        email: "contact@accent-corp.com",
        phone: "+1-555-0100",
        type: "customer" as const,
        isCompany: true,
        vat: "US123456789",
        countryId: usCountryId ?? null,
        stateId: stateCA?.stateId ?? null,
        creditLimit: "50000.00",
        website: "https://accent-corp.com",
        industry: "Technology",
        totalInvoiced: "0",
        totalDue: "0",
        isActive: true,
      },
      {
        ...seedAuditScope,
        id: SEED_IDS.partnerBetaTech,
        name: "Beta Tech Solutions",
        email: "sales@betatech.io",
        phone: "+1-555-0200",
        type: "vendor" as const,
        isCompany: true,
        vat: "US987654321",
        countryId: usCountryId ?? null,
        stateId: stateNY?.stateId ?? null,
        creditLimit: "0",
        website: "https://betatech.io",
        industry: "Software",
        totalInvoiced: "0",
        totalDue: "0",
        isActive: true,
      },
      {
        ...seedAuditScope,
        id: SEED_IDS.partnerGammaServices,
        name: "Gamma Services Ltd",
        email: "info@gamma-services.co.uk",
        phone: "+44-20-7946-0958",
        type: "both" as const,
        isCompany: true,
        vat: "GB123456789",
        countryId: gbCountryId ?? null,
        creditLimit: "75000.00",
        website: "https://gamma-services.co.uk",
        industry: "Consulting",
        totalInvoiced: "0",
        totalDue: "0",
        isActive: true,
      },
      {
        ...seedAuditScope,
        id: SEED_IDS.partnerDeltaInc,
        name: "Delta Incorporated",
        email: "team@delta-inc.us",
        phone: "+1-555-0400",
        type: "customer" as const,
        isCompany: true,
        vat: "US456789123",
        countryId: usCountryId ?? null,
        creditLimit: "25000.00",
        website: "https://delta-inc.us",
        industry: "Retail",
        totalInvoiced: "0",
        totalDue: "0",
        isActive: true,
      },
    ])
    .execute();

  console.log("✓ Seeded 4 partners with Phase 1 enhancements");

  await tx
    .insert(partnerAddresses)
    .values([
      {
        ...seedAuditScope,
        id: "10000001-0000-4000-8000-000000000001",
        partnerId: SEED_IDS.partnerAccentCorp,
        type: "invoice",
        street: "123 Main Street",
        street2: "Suite 400",
        city: "San Francisco",
        stateId: stateCA?.stateId ?? null,
        countryId: usCountryId ?? null,
        zip: "94102",
        phone: "+1-555-0101",
        email: "billing@accent-corp.com",
        contactName: "John Smith",
        isDefault: true,
      },
      {
        ...seedAuditScope,
        id: "10000002-0000-4000-8000-000000000002",
        partnerId: SEED_IDS.partnerAccentCorp,
        type: "delivery",
        street: "456 Warehouse Road",
        city: "Oakland",
        stateId: stateCA?.stateId ?? null,
        countryId: usCountryId ?? null,
        zip: "94607",
        phone: "+1-555-0102",
        contactName: "Warehouse Manager",
        isDefault: true,
      },
      {
        ...seedAuditScope,
        id: "10000003-0000-4000-8000-000000000003",
        partnerId: SEED_IDS.partnerBetaTech,
        type: "invoice",
        street: "789 Broadway",
        street2: "Floor 12",
        city: "New York",
        stateId: stateNY?.stateId ?? null,
        countryId: usCountryId ?? null,
        zip: "10003",
        phone: "+1-555-0201",
        email: "accounts@betatech.io",
        contactName: "Jane Doe",
        isDefault: true,
      },
      {
        ...seedAuditScope,
        id: "10000004-0000-4000-8000-000000000004",
        partnerId: SEED_IDS.partnerGammaServices,
        type: "invoice",
        street: "10 Downing Street",
        city: "London",
        countryId: gbCountryId ?? null,
        zip: "SW1A 2AA",
        phone: "+44-20-7946-0959",
        email: "billing@gamma-services.co.uk",
        contactName: "Robert Johnson",
        isDefault: true,
      },
      {
        ...seedAuditScope,
        id: "10000005-0000-4000-8000-000000000005",
        partnerId: SEED_IDS.partnerDeltaInc,
        type: "invoice",
        street: "321 Commerce Ave",
        city: "Los Angeles",
        stateId: stateCA?.stateId ?? null,
        countryId: usCountryId ?? null,
        zip: "90012",
        phone: "+1-555-0401",
        email: "ap@delta-inc.us",
        contactName: "Sarah Williams",
        isDefault: true,
      },
    ])
    .execute();

  console.log("✓ Seeded 5 partner addresses");

  if (demoBank) {
    await tx
      .insert(partnerBankAccounts)
      .values([
        {
          ...seedAuditScope,
          id: "20000001-0000-4000-8000-000000000001",
          partnerId: SEED_IDS.partnerAccentCorp,
          bankId: demoBank.bankId,
          accNumber: "1234567890",
          accHolderName: "Accent Corporation",
          isDefault: true,
        },
        {
          ...seedAuditScope,
          id: "20000002-0000-4000-8000-000000000002",
          partnerId: SEED_IDS.partnerBetaTech,
          bankId: demoBank.bankId,
          accNumber: "9876543210",
          accHolderName: "Beta Tech Solutions Inc",
          isDefault: true,
        },
        {
          ...seedAuditScope,
          id: "20000003-0000-4000-8000-000000000003",
          partnerId: SEED_IDS.partnerGammaServices,
          bankId: demoBank.bankId,
          accNumber: "4567123890",
          accHolderName: "Gamma Services Ltd",
          isDefault: true,
        },
      ])
      .execute();

    console.log("✓ Seeded 3 partner bank accounts");
  }

  await tx
    .insert(partnerTags)
    .values([
      { ...seedAuditScope, id: "30000001-0000-4000-8000-000000000001", name: "VIP", color: "#FFD700" },
      { ...seedAuditScope, id: "30000002-0000-4000-8000-000000000002", name: "Wholesale", color: "#4169E1" },
      { ...seedAuditScope, id: "30000003-0000-4000-8000-000000000003", name: "Retail", color: "#32CD32" },
      { ...seedAuditScope, id: "30000004-0000-4000-8000-000000000004", name: "Enterprise", color: "#800080" },
    ])
    .execute();

  console.log("✓ Seeded 4 partner tags");

  await tx
    .insert(partnerTagAssignments)
    .values([
      { ...seedAuditScope, id: "40000001-0000-4000-8000-000000000001", partnerId: SEED_IDS.partnerAccentCorp, tagId: "30000001-0000-4000-8000-000000000001" },
      { ...seedAuditScope, id: "40000002-0000-4000-8000-000000000002", partnerId: SEED_IDS.partnerAccentCorp, tagId: "30000004-0000-4000-8000-000000000004" },
      { ...seedAuditScope, id: "40000003-0000-4000-8000-000000000003", partnerId: SEED_IDS.partnerBetaTech, tagId: "30000002-0000-4000-8000-000000000002" },
      { ...seedAuditScope, id: "40000004-0000-4000-8000-000000000004", partnerId: SEED_IDS.partnerDeltaInc, tagId: "30000003-0000-4000-8000-000000000003" },
    ])
    .execute();

  console.log("✓ Seeded 4 partner tag assignments");
  console.log("✓ Phase 1 partner enhancement complete");
}
