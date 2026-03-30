import { sql } from "drizzle-orm";

import {
  currencies,
  paymentTermLines,
  paymentTerms,
  pricelistItems,
  pricelists,
} from "../../../../schema/index.js";
import { SEED_IDS } from "../../seed-ids.js";
import { type SeedAuditScope, type Tx } from "../../seed-types.js";

export async function seedCommercialPolicies(
  tx: Tx,
  seedAuditScope: SeedAuditScope
): Promise<void> {
  const usdCurrency = await tx
    .select({ currencyId: currencies.currencyId })
    .from(currencies)
    .where(sql`upper(${currencies.code}) = 'USD'`)
    .limit(1);

  if (!usdCurrency[0]?.currencyId) {
    throw new Error("USD currency not found; cannot seed pricelists");
  }

  await tx
    .insert(paymentTerms)
    .values([
      {
        ...seedAuditScope,
        id: SEED_IDS.paymentTermNet30,
        name: "Net 30",
        note: "Full amount due in 30 days",
        isActive: true,
      },
      {
        ...seedAuditScope,
        id: SEED_IDS.paymentTermSplit,
        name: "50/50 Split",
        note: "50% now and 50% in 30 days",
        isActive: true,
      },
    ])
    .execute();

  await tx
    .insert(paymentTermLines)
    .values([
      {
        ...seedAuditScope,
        id: SEED_IDS.paymentTermLineNet30,
        paymentTermId: SEED_IDS.paymentTermNet30,
        valueType: "balance",
        value: "0",
        days: 30,
        dayOfMonth: null,
        endOfMonth: false,
        sequence: 10,
      },
      {
        ...seedAuditScope,
        id: SEED_IDS.paymentTermLineSplit1,
        paymentTermId: SEED_IDS.paymentTermSplit,
        valueType: "percent",
        value: "50",
        days: 0,
        dayOfMonth: null,
        endOfMonth: false,
        sequence: 10,
      },
      {
        ...seedAuditScope,
        id: SEED_IDS.paymentTermLineSplit2,
        paymentTermId: SEED_IDS.paymentTermSplit,
        valueType: "balance",
        value: "0",
        days: 30,
        dayOfMonth: null,
        endOfMonth: false,
        sequence: 20,
      },
    ])
    .execute();

  await tx
    .insert(pricelists)
    .values([
      {
        ...seedAuditScope,
        id: SEED_IDS.pricelistUsdStandard,
        name: "USD Standard",
        currencyId: usdCurrency[0].currencyId,
        discountPolicy: "with_discount",
        isActive: true,
        sequence: 10,
      },
      {
        ...seedAuditScope,
        id: SEED_IDS.pricelistUsdVip,
        name: "USD VIP",
        currencyId: usdCurrency[0].currencyId,
        discountPolicy: "without_discount",
        isActive: true,
        sequence: 20,
      },
    ])
    .execute();

  await tx
    .insert(pricelistItems)
    .values([
      {
        ...seedAuditScope,
        id: SEED_IDS.pricelistItemGlobalStandard,
        pricelistId: SEED_IDS.pricelistUsdStandard,
        appliedOn: "global",
        productTmplId: null,
        productId: null,
        categId: null,
        minQuantity: "1",
        dateStart: null,
        dateEnd: null,
        effectiveFrom: new Date("2024-01-01T00:00:00Z"),
        effectiveTo: null,
        supersededBy: null,
        computePrice: "formula",
        fixedPrice: null,
        percentPrice: null,
        base: "list_price",
        basePricelistId: null,
        priceSurcharge: "0",
        priceDiscount: "0",
        priceRound: null,
        priceMinMargin: "0",
        priceMaxMargin: "0",
        sequence: 10,
        isActive: true,
      },
      {
        ...seedAuditScope,
        id: SEED_IDS.pricelistItemLaptopDiscount,
        pricelistId: SEED_IDS.pricelistUsdVip,
        appliedOn: "product_variant",
        productTmplId: null,
        productId: SEED_IDS.productLaptop,
        categId: null,
        minQuantity: "1",
        dateStart: null,
        dateEnd: null,
        effectiveFrom: new Date("2024-02-01T00:00:00Z"),
        effectiveTo: null,
        supersededBy: null,
        computePrice: "percentage",
        fixedPrice: null,
        percentPrice: "15",
        base: "list_price",
        basePricelistId: null,
        priceSurcharge: "0",
        priceDiscount: "-15",
        priceRound: null,
        priceMinMargin: "0",
        priceMaxMargin: "0",
        sequence: 10,
        isActive: true,
      },
    ])
    .execute();

  console.log("✓ Seeded payment terms and pricelists");
}
