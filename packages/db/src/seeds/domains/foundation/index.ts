import { eq, isNull, sql } from "drizzle-orm";

import {
  banks,
  countries,
  currencies,
  currencyRates,
  sequences,
  states,
  tenants,
  uomCategories,
  unitsOfMeasure,
  users,
} from "../../../schema/index.js";
import {
  type SeedAuditScope,
  type Tx,
  DEFAULT_SYSTEM_USER_EMAIL,
  DEFAULT_SYSTEM_USER_NAME,
  DEFAULT_TENANT_CODE,
  DEFAULT_TENANT_ID,
  DEFAULT_TENANT_NAME,
  SYSTEM_ACTOR_ID,
} from "../../seed-types.js";

export async function seedReferenceData(tx: Tx, seedAuditScope: SeedAuditScope): Promise<void> {
  const insertedCountries = await tx
    .insert(countries)
    .values([
      {
        code: "US",
        name: "United States",
        phoneCode: "+1",
        vatLabel: "Tax ID",
        createdBy: seedAuditScope.createdBy,
        updatedBy: seedAuditScope.updatedBy,
      },
      {
        code: "GB",
        name: "United Kingdom",
        phoneCode: "+44",
        vatLabel: "VAT",
        createdBy: seedAuditScope.createdBy,
        updatedBy: seedAuditScope.updatedBy,
      },
      {
        code: "MY",
        name: "Malaysia",
        phoneCode: "+60",
        vatLabel: "SST",
        createdBy: seedAuditScope.createdBy,
        updatedBy: seedAuditScope.updatedBy,
      },
    ])
    .returning({ countryId: countries.countryId, code: countries.code });

  const countryByCode = new Map(
    insertedCountries.map((row) => [row.code.toUpperCase(), row.countryId])
  );

  await tx
    .insert(states)
    .values([
      {
        countryId: countryByCode.get("US")!,
        code: "CA",
        name: "California",
        createdBy: seedAuditScope.createdBy,
        updatedBy: seedAuditScope.updatedBy,
      },
      {
        countryId: countryByCode.get("US")!,
        code: "NY",
        name: "New York",
        createdBy: seedAuditScope.createdBy,
        updatedBy: seedAuditScope.updatedBy,
      },
      {
        countryId: countryByCode.get("MY")!,
        code: "KUL",
        name: "Kuala Lumpur",
        createdBy: seedAuditScope.createdBy,
        updatedBy: seedAuditScope.updatedBy,
      },
    ])
    .execute();

  const insertedCurrencies = await tx
    .insert(currencies)
    .values([
      {
        code: "USD",
        name: "US Dollar",
        symbol: "$",
        decimalPlaces: 2,
        rounding: "0.01",
        isActive: true,
        createdBy: seedAuditScope.createdBy,
        updatedBy: seedAuditScope.updatedBy,
      },
      {
        code: "EUR",
        name: "Euro",
        symbol: "EUR",
        decimalPlaces: 2,
        rounding: "0.01",
        isActive: true,
        createdBy: seedAuditScope.createdBy,
        updatedBy: seedAuditScope.updatedBy,
      },
      {
        code: "MYR",
        name: "Malaysian Ringgit",
        symbol: "RM",
        decimalPlaces: 2,
        rounding: "0.01",
        isActive: true,
        createdBy: seedAuditScope.createdBy,
        updatedBy: seedAuditScope.updatedBy,
      },
    ])
    .returning({ currencyId: currencies.currencyId, code: currencies.code });

  const currencyByCode = new Map(
    insertedCurrencies.map((row) => [row.code.toUpperCase(), row.currencyId])
  );

  await tx
    .insert(currencyRates)
    .values([
      {
        currencyId: currencyByCode.get("USD")!,
        rate: "1.000000",
        inverseRate: "1.000000",
        effectiveDate: "2026-01-01",
        source: "seed-baseline",
        createdBy: seedAuditScope.createdBy,
        updatedBy: seedAuditScope.updatedBy,
      },
      {
        currencyId: currencyByCode.get("EUR")!,
        rate: "1.090000",
        inverseRate: "0.917431",
        effectiveDate: "2026-01-01",
        source: "seed-baseline",
        createdBy: seedAuditScope.createdBy,
        updatedBy: seedAuditScope.updatedBy,
      },
      {
        currencyId: currencyByCode.get("MYR")!,
        rate: "0.215000",
        inverseRate: "4.651163",
        effectiveDate: "2026-01-01",
        source: "seed-baseline",
        createdBy: seedAuditScope.createdBy,
        updatedBy: seedAuditScope.updatedBy,
      },
    ])
    .execute();

  await tx
    .insert(banks)
    .values([
      {
        name: "Demo National Bank",
        bic: "DNBKUS33",
        countryId: countryByCode.get("US") ?? null,
        createdBy: seedAuditScope.createdBy,
        updatedBy: seedAuditScope.updatedBy,
      },
      {
        name: "City Commercial Bank",
        bic: "CCBKMYKL",
        countryId: countryByCode.get("MY") ?? null,
        createdBy: seedAuditScope.createdBy,
        updatedBy: seedAuditScope.updatedBy,
      },
    ])
    .execute();

  const insertedUomCategories = await tx
    .insert(uomCategories)
    .values([
      { name: "Unit", createdBy: seedAuditScope.createdBy, updatedBy: seedAuditScope.updatedBy },
      { name: "Weight", createdBy: seedAuditScope.createdBy, updatedBy: seedAuditScope.updatedBy },
      { name: "Time", createdBy: seedAuditScope.createdBy, updatedBy: seedAuditScope.updatedBy },
    ])
    .returning({ uomCategoryId: uomCategories.uomCategoryId, name: uomCategories.name });

  const uomCategoryByName = new Map(
    insertedUomCategories.map((row) => [row.name, row.uomCategoryId])
  );

  await tx
    .insert(unitsOfMeasure)
    .values([
      {
        categoryId: uomCategoryByName.get("Unit")!,
        name: "Unit(s)",
        factor: "1.000000",
        uomType: "reference",
        rounding: "1.000000",
        createdBy: seedAuditScope.createdBy,
        updatedBy: seedAuditScope.updatedBy,
      },
      {
        categoryId: uomCategoryByName.get("Weight")!,
        name: "Kilogram",
        factor: "1.000000",
        uomType: "reference",
        rounding: "0.001000",
        createdBy: seedAuditScope.createdBy,
        updatedBy: seedAuditScope.updatedBy,
      },
      {
        categoryId: uomCategoryByName.get("Weight")!,
        name: "Gram",
        factor: "0.001000",
        uomType: "smaller",
        rounding: "1.000000",
        createdBy: seedAuditScope.createdBy,
        updatedBy: seedAuditScope.updatedBy,
      },
      {
        categoryId: uomCategoryByName.get("Time")!,
        name: "Hour",
        factor: "1.000000",
        uomType: "reference",
        rounding: "0.010000",
        createdBy: seedAuditScope.createdBy,
        updatedBy: seedAuditScope.updatedBy,
      },
    ])
    .execute();

  await tx
    .insert(sequences)
    .values([
      {
        tenantId: seedAuditScope.tenantId,
        code: "sale.order",
        prefix: "SO-",
        suffix: null,
        padding: 6,
        step: 1,
        nextNumber: 1,
        resetPeriod: "yearly",
        createdBy: seedAuditScope.createdBy,
        updatedBy: seedAuditScope.updatedBy,
      },
      {
        tenantId: seedAuditScope.tenantId,
        code: "sale.return",
        prefix: "RMA-",
        suffix: null,
        padding: 6,
        step: 1,
        nextNumber: 1,
        resetPeriod: "yearly",
        createdBy: seedAuditScope.createdBy,
        updatedBy: seedAuditScope.updatedBy,
      },
      {
        tenantId: seedAuditScope.tenantId,
        code: "subscription",
        prefix: "SUB-",
        suffix: null,
        padding: 6,
        step: 1,
        nextNumber: 1,
        resetPeriod: "monthly",
        createdBy: seedAuditScope.createdBy,
        updatedBy: seedAuditScope.updatedBy,
      },
    ])
    .execute();

  console.log("✓ Seeded Phase 0 reference data (countries, currencies, rates, UoM, sequences)");
}

export async function ensureDefaultTenant(tx: Tx): Promise<number> {
  const existing = await tx
    .select({ tenantId: tenants.tenantId })
    .from(tenants)
    .where(sql`${eq(tenants.tenantCode, DEFAULT_TENANT_CODE)} AND ${isNull(tenants.deletedAt)}`)
    .limit(1);

  if (existing.length > 0) {
    return existing[0].tenantId;
  }

  const inserted = await tx
    .insert(tenants)
    .values({
      tenantCode: DEFAULT_TENANT_CODE,
      name: DEFAULT_TENANT_NAME,
      status: "ACTIVE",
    })
    .returning({ tenantId: tenants.tenantId });

  return inserted[0]?.tenantId ?? DEFAULT_TENANT_ID;
}

export async function ensureSystemUser(tx: Tx, tenantId: number): Promise<number> {
  const existing = await tx
    .select({ userId: users.userId })
    .from(users)
    .where(
      sql`${eq(users.tenantId, tenantId)} AND ${eq(users.email, DEFAULT_SYSTEM_USER_EMAIL)} AND ${isNull(users.deletedAt)}`
    )
    .limit(1);

  if (existing.length > 0) {
    return existing[0].userId;
  }

  const inserted = await tx
    .insert(users)
    .values({
      tenantId,
      email: DEFAULT_SYSTEM_USER_EMAIL,
      displayName: DEFAULT_SYSTEM_USER_NAME,
      status: "ACTIVE",
      emailVerified: true,
      locale: "en_US",
      timezone: "UTC",
      createdBy: SYSTEM_ACTOR_ID,
      updatedBy: SYSTEM_ACTOR_ID,
    })
    .returning({ userId: users.userId });

  return inserted[0]?.userId ?? SYSTEM_ACTOR_ID;
}
