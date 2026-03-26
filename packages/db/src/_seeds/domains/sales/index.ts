import { eq, inArray, sql } from "drizzle-orm";

import {
  currencies,
  saleOrderLineTaxes,
  saleOrderStatusHistory,
  saleOrderTaxSummary,
  salesOrderLines,
  salesOrders,
  unitsOfMeasure,
} from "../../../schema/index.js";
import { calcLineSubtotal, calcOrderTotals, money } from "../../money.js";
import { SEED_IDS } from "../../seed-ids.js";
import { type SeedAuditScope, type Tx } from "../../seed-types.js";

export async function seedSalesOrdersAndLines(
  tx: Tx,
  seedAuditScope: SeedAuditScope
): Promise<void> {
  const usdCurrency = await tx
    .select({ currencyId: currencies.currencyId })
    .from(currencies)
    .where(sql`upper(${currencies.code}) = 'USD'`)
    .limit(1);

  const unitUom = await tx
    .select({ uomId: unitsOfMeasure.uomId })
    .from(unitsOfMeasure)
    .where(eq(unitsOfMeasure.name, "Unit(s)"))
    .limit(1);

  if (!usdCurrency[0]?.currencyId) {
    throw new Error("USD currency not found; cannot seed sales orders");
  }
  if (!unitUom[0]?.uomId) {
    throw new Error("Unit(s) UoM not found; cannot seed sales order lines");
  }

  const taxRateId = SEED_IDS.taxRateSalesStandard10;

  const l1 = calcLineSubtotal(2, 599.99, 10.0);
  const l2 = calcLineSubtotal(2, 29.99, 0);
  const l3 = calcLineSubtotal(1, 149.99, 0);
  const l4 = calcLineSubtotal(1, 1299.99, 0);
  const l5 = calcLineSubtotal(2, 1899.99, 50.0);
  const l6 = calcLineSubtotal(1, 4999.99, 0);

  const lineTaxes = [
    money(Number(l1) * 0.1),
    money(Number(l2) * 0.1),
    money(Number(l3) * 0.1),
    money(Number(l4) * 0.1),
    money(Number(l5) * 0.1),
    money(Number(l6) * 0.1),
  ] as const;

  const o1 = calcOrderTotals([l1, l2, l3]);
  const o2 = calcOrderTotals([l4]);
  const o3 = calcOrderTotals([l5, l6]);

  console.log(`   Order 1: ${o1.amountUntaxed} untaxed → ${o1.amountTotal} total`);
  console.log(`   Order 2: ${o2.amountUntaxed} untaxed → ${o2.amountTotal} total`);
  console.log(`   Order 3: ${o3.amountUntaxed} untaxed → ${o3.amountTotal} total`);

  await tx
    .insert(salesOrders)
    .values([
      {
        ...seedAuditScope,
        id: SEED_IDS.orderOne,
        name: "SO-2024-001",
        partnerId: SEED_IDS.partnerAccentCorp,
        status: "confirmed" as const,
        sequenceNumber: "SO-2024-000001",
        quotationDate: new Date("2024-01-10T09:00:00Z"),
        confirmationDate: new Date("2024-01-15T10:15:00Z"),
        currencyId: usdCurrency[0].currencyId,
        pricelistId: SEED_IDS.pricelistUsdStandard,
        paymentTermId: SEED_IDS.paymentTermNet30,
        invoiceStatus: "to_invoice" as const,
        deliveryStatus: "partial" as const,
        orderDate: new Date("2024-01-15T10:00:00Z"),
        deliveryDate: new Date("2024-01-20T00:00:00Z"),
        assignedToId: null,
        notes: "Urgent delivery requested",
        amountUntaxed: o1.amountUntaxed,
        amountTax: o1.amountTax,
        amountTotal: o1.amountTotal,
      },
      {
        ...seedAuditScope,
        id: SEED_IDS.orderTwo,
        name: "SO-2024-002",
        partnerId: SEED_IDS.partnerGammaServices,
        status: "draft" as const,
        sequenceNumber: "SO-2024-000002",
        quotationDate: new Date("2024-02-01T10:00:00Z"),
        currencyId: usdCurrency[0].currencyId,
        pricelistId: SEED_IDS.pricelistUsdVip,
        paymentTermId: SEED_IDS.paymentTermSplit,
        invoiceStatus: "no" as const,
        deliveryStatus: "no" as const,
        orderDate: new Date("2024-02-01T14:30:00Z"),
        deliveryDate: null,
        assignedToId: null,
        notes: "Pending approval from stakeholders",
        amountUntaxed: o2.amountUntaxed,
        amountTax: o2.amountTax,
        amountTotal: o2.amountTotal,
      },
      {
        ...seedAuditScope,
        id: SEED_IDS.orderThree,
        name: "SO-2024-003",
        partnerId: SEED_IDS.partnerDeltaInc,
        status: "shipped" as const,
        sequenceNumber: "SO-2024-000003",
        quotationDate: new Date("2024-01-03T12:00:00Z"),
        confirmationDate: new Date("2024-01-05T09:05:00Z"),
        currencyId: usdCurrency[0].currencyId,
        pricelistId: SEED_IDS.pricelistUsdStandard,
        paymentTermId: SEED_IDS.paymentTermNet30,
        invoiceStatus: "invoiced" as const,
        deliveryStatus: "full" as const,
        orderDate: new Date("2024-01-05T09:00:00Z"),
        deliveryDate: new Date("2024-01-12T00:00:00Z"),
        assignedToId: null,
        notes: "Shipped via standard delivery",
        amountUntaxed: o3.amountUntaxed,
        amountTax: o3.amountTax,
        amountTotal: o3.amountTotal,
      },
    ])
    .execute();
  console.log("✓ Seeded 3 sales orders");

  await tx
    .insert(salesOrderLines)
    .values([
      {
        ...seedAuditScope,
        id: SEED_IDS.lineOne,
        orderId: SEED_IDS.orderOne,
        productId: SEED_IDS.productMonitor,
        taxId: taxRateId,
        productUomId: unitUom[0].uomId,
        description: '4K Monitor 27" (qty 2)',
        quantity: "2",
        priceUnit: "599.99",
        discount: "10.00",
        subtotal: money(l1),
        priceSubtotal: money(l1),
        priceTax: lineTaxes[0],
        priceTotal: money(Number(l1) + Number(lineTaxes[0])),
        qtyDelivered: "1",
        qtyToInvoice: "1",
        qtyInvoiced: "1",
        invoiceStatus: "to_invoice" as const,
        customerLead: 2,
        displayType: "product" as const,
        priceSource: "pricelist" as const,
        discountSource: "manual" as const,
        appliedPricelistId: SEED_IDS.pricelistUsdStandard,
        sequence: 10,
      },
      {
        ...seedAuditScope,
        id: SEED_IDS.lineTwo,
        orderId: SEED_IDS.orderOne,
        productId: SEED_IDS.productMouse,
        taxId: taxRateId,
        productUomId: unitUom[0].uomId,
        description: "Wireless Mouse (qty 2)",
        quantity: "2",
        priceUnit: "29.99",
        discount: "0.00",
        subtotal: money(l2),
        priceSubtotal: money(l2),
        priceTax: lineTaxes[1],
        priceTotal: money(Number(l2) + Number(lineTaxes[1])),
        qtyDelivered: "2",
        qtyToInvoice: "1",
        qtyInvoiced: "1",
        invoiceStatus: "to_invoice" as const,
        customerLead: 1,
        displayType: "product" as const,
        priceSource: "pricelist" as const,
        discountSource: "manual" as const,
        appliedPricelistId: SEED_IDS.pricelistUsdStandard,
        sequence: 20,
      },
      {
        ...seedAuditScope,
        id: SEED_IDS.lineThree,
        orderId: SEED_IDS.orderOne,
        productId: SEED_IDS.productKeyboard,
        taxId: taxRateId,
        productUomId: unitUom[0].uomId,
        description: "Mechanical Keyboard (qty 1)",
        quantity: "1",
        priceUnit: "149.99",
        discount: "0.00",
        subtotal: money(l3),
        priceSubtotal: money(l3),
        priceTax: lineTaxes[2],
        priceTotal: money(Number(l3) + Number(lineTaxes[2])),
        qtyDelivered: "0",
        qtyToInvoice: "1",
        qtyInvoiced: "0",
        invoiceStatus: "to_invoice" as const,
        customerLead: 3,
        displayType: "product" as const,
        priceSource: "pricelist" as const,
        discountSource: "manual" as const,
        appliedPricelistId: SEED_IDS.pricelistUsdStandard,
        sequence: 30,
      },
      {
        ...seedAuditScope,
        id: SEED_IDS.lineFour,
        orderId: SEED_IDS.orderTwo,
        productId: SEED_IDS.productLaptop,
        taxId: taxRateId,
        productUomId: unitUom[0].uomId,
        description: "Professional Laptop Pro (qty 1)",
        quantity: "1",
        priceUnit: "1299.99",
        discount: "0.00",
        subtotal: money(l4),
        priceSubtotal: money(l4),
        priceTax: lineTaxes[3],
        priceTotal: money(Number(l4) + Number(lineTaxes[3])),
        qtyDelivered: "0",
        qtyToInvoice: "0",
        qtyInvoiced: "0",
        invoiceStatus: "no" as const,
        customerLead: 7,
        displayType: "product" as const,
        priceSource: "pricelist" as const,
        discountSource: "campaign" as const,
        appliedPricelistId: SEED_IDS.pricelistUsdVip,
        sequence: 10,
      },
      {
        ...seedAuditScope,
        id: SEED_IDS.lineFive,
        orderId: SEED_IDS.orderThree,
        productId: SEED_IDS.productDesktop,
        taxId: taxRateId,
        productUomId: unitUom[0].uomId,
        description: "Workstation Desktop (qty 2)",
        quantity: "2",
        priceUnit: "1899.99",
        discount: "50.00",
        subtotal: money(l5),
        priceSubtotal: money(l5),
        priceTax: lineTaxes[4],
        priceTotal: money(Number(l5) + Number(lineTaxes[4])),
        qtyDelivered: "2",
        qtyToInvoice: "0",
        qtyInvoiced: "2",
        invoiceStatus: "invoiced" as const,
        customerLead: 4,
        displayType: "product" as const,
        priceSource: "pricelist" as const,
        discountSource: "volume" as const,
        appliedPricelistId: SEED_IDS.pricelistUsdStandard,
        sequence: 10,
      },
      {
        ...seedAuditScope,
        id: SEED_IDS.lineSix,
        orderId: SEED_IDS.orderThree,
        productId: SEED_IDS.productLicense,
        taxId: taxRateId,
        productUomId: unitUom[0].uomId,
        description: "Enterprise Software License (qty 1)",
        quantity: "1",
        priceUnit: "4999.99",
        discount: "0.00",
        subtotal: money(l6),
        priceSubtotal: money(l6),
        priceTax: lineTaxes[5],
        priceTotal: money(Number(l6) + Number(lineTaxes[5])),
        qtyDelivered: "1",
        qtyToInvoice: "0",
        qtyInvoiced: "1",
        invoiceStatus: "invoiced" as const,
        customerLead: 0,
        displayType: "product" as const,
        priceSource: "manual" as const,
        discountSource: "manual" as const,
        appliedPricelistId: SEED_IDS.pricelistUsdStandard,
        sequence: 20,
      },
    ])
    .execute();
  console.log("✓ Seeded 6 sales order lines");

  await tx
    .insert(saleOrderLineTaxes)
    .values([
      { ...seedAuditScope, id: SEED_IDS.saleOrderLineTaxOne, orderLineId: SEED_IDS.lineOne, taxId: taxRateId, sequence: 10 },
      { ...seedAuditScope, id: SEED_IDS.saleOrderLineTaxTwo, orderLineId: SEED_IDS.lineTwo, taxId: taxRateId, sequence: 10 },
      { ...seedAuditScope, id: SEED_IDS.saleOrderLineTaxThree, orderLineId: SEED_IDS.lineThree, taxId: taxRateId, sequence: 10 },
      { ...seedAuditScope, id: SEED_IDS.saleOrderLineTaxFour, orderLineId: SEED_IDS.lineFour, taxId: taxRateId, sequence: 10 },
      { ...seedAuditScope, id: SEED_IDS.saleOrderLineTaxFive, orderLineId: SEED_IDS.lineFive, taxId: taxRateId, sequence: 10 },
      { ...seedAuditScope, id: SEED_IDS.saleOrderLineTaxSix, orderLineId: SEED_IDS.lineSix, taxId: taxRateId, sequence: 10 },
    ])
    .execute();
  console.log("✓ Seeded 6 sale order line taxes");

  await tx
    .insert(saleOrderStatusHistory)
    .values([
      {
        ...seedAuditScope,
        id: SEED_IDS.saleOrderStatusHistoryOne,
        orderId: SEED_IDS.orderOne,
        oldStatus: "draft",
        newStatus: "confirmed",
        changedAt: new Date("2024-01-15T10:15:00Z"),
        reason: "Customer approved quotation",
      },
      {
        ...seedAuditScope,
        id: SEED_IDS.saleOrderStatusHistoryTwo,
        orderId: SEED_IDS.orderThree,
        oldStatus: "confirmed",
        newStatus: "shipped",
        changedAt: new Date("2024-01-12T08:30:00Z"),
        reason: "Warehouse packed and dispatched",
      },
    ])
    .execute();
  console.log("✓ Seeded sale order status history");

  await tx
    .insert(saleOrderTaxSummary)
    .values([
      {
        ...seedAuditScope,
        id: SEED_IDS.saleOrderTaxSummaryOne,
        orderId: SEED_IDS.orderOne,
        taxId: taxRateId,
        taxGroupId: SEED_IDS.taxGroupSalesStandard,
        baseAmount: o1.amountUntaxed,
        taxAmount: o1.amountTax,
        isTaxIncluded: false,
      },
      {
        ...seedAuditScope,
        id: SEED_IDS.saleOrderTaxSummaryTwo,
        orderId: SEED_IDS.orderTwo,
        taxId: taxRateId,
        taxGroupId: SEED_IDS.taxGroupSalesStandard,
        baseAmount: o2.amountUntaxed,
        taxAmount: o2.amountTax,
        isTaxIncluded: false,
      },
      {
        ...seedAuditScope,
        id: SEED_IDS.saleOrderTaxSummaryThree,
        orderId: SEED_IDS.orderThree,
        taxId: taxRateId,
        taxGroupId: SEED_IDS.taxGroupSalesStandard,
        baseAmount: o3.amountUntaxed,
        taxAmount: o3.amountTax,
        isTaxIncluded: false,
      },
    ])
    .execute();
  console.log("✓ Seeded sale order tax summary");
}

export async function validateSalesPhase6Invariants(tx: Tx): Promise<void> {
  const seededOrderIds = [SEED_IDS.orderOne, SEED_IDS.orderTwo, SEED_IDS.orderThree] as const;
  const seededLineIds = [
    SEED_IDS.lineOne,
    SEED_IDS.lineTwo,
    SEED_IDS.lineThree,
    SEED_IDS.lineFour,
    SEED_IDS.lineFive,
    SEED_IDS.lineSix,
  ] as const;

  const toCents = (amount: string): number => Math.round(Number(amount) * 100);

  const orderTaxes = await tx
    .select({ orderId: salesOrders.id, amountTax: salesOrders.amountTax })
    .from(salesOrders)
    .where(inArray(salesOrders.id, seededOrderIds));

  const summaryRows = await tx
    .select({ orderId: saleOrderTaxSummary.orderId, taxAmount: saleOrderTaxSummary.taxAmount })
    .from(saleOrderTaxSummary)
    .where(inArray(saleOrderTaxSummary.orderId, seededOrderIds));

  const summaryByOrder = new Map<string, number>();
  for (const row of summaryRows) {
    const current = summaryByOrder.get(row.orderId) ?? 0;
    summaryByOrder.set(row.orderId, current + toCents(row.taxAmount));
  }

  for (const order of orderTaxes) {
    const expected = toCents(order.amountTax);
    const actual = summaryByOrder.get(order.orderId) ?? 0;
    if (actual !== expected) {
      throw new Error(
        `Tax summary mismatch for order ${order.orderId}: expected ${order.amountTax}, got ${(actual / 100).toFixed(2)}`
      );
    }
  }

  const lineTaxRows = await tx
    .select({ orderLineId: saleOrderLineTaxes.orderLineId })
    .from(saleOrderLineTaxes)
    .where(inArray(saleOrderLineTaxes.orderLineId, seededLineIds));

  if (lineTaxRows.length !== seededLineIds.length) {
    throw new Error(
      `Line tax coverage mismatch: expected ${seededLineIds.length}, got ${lineTaxRows.length}`
    );
  }

  const statusHistoryRows = await tx
    .select({ id: saleOrderStatusHistory.id })
    .from(saleOrderStatusHistory)
    .where(inArray(saleOrderStatusHistory.orderId, seededOrderIds));

  if (statusHistoryRows.length < 2) {
    throw new Error(
      `Status history coverage mismatch: expected at least 2 rows, got ${statusHistoryRows.length}`
    );
  }

  console.log("✓ Verified Phase 6 tax and status invariants");
}
