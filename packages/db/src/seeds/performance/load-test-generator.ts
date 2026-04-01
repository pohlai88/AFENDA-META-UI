/**
 * Performance Load Test Data Generator
 *
 * Generates realistic test data at scale for performance benchmarking:
 * - 1M+ sales orders distributed across 24 months
 * - Realistic partner distribution (Pareto: 80/20 rule)
 * - Varied order statuses and amounts
 * - Realistic timestamps for partition testing
 *
 * Usage:
 *   pnpm --filter @afenda/db seed --scenario=load-test-1M
 */

import { performance } from "node:perf_hooks";
import { sql } from "drizzle-orm";
import type { Tx, SeedAuditScope } from "../seed-types.js";
import { salesOrders, salesOrderLines, currencies, unitsOfMeasure } from "../../schema/index.js";
import { money } from "../money.js";
import { SEED_IDS } from "../seed-ids.js";

// ============================================================================
// Configuration
// ============================================================================

interface LoadTestConfig {
  totalOrders: number;
  batchSize: number;
  startDate: Date;
  endDate: Date;
  partners: string[]; // Partner IDs for distribution
  products: string[]; // Product IDs for order lines
  linesPerOrder: { min: number; max: number };
  priceRange: { min: number; max: number };
}

const DEFAULT_CONFIG: LoadTestConfig = {
  totalOrders: 1_000_000,
  batchSize: 10_000, // Batch inserts for performance
  startDate: new Date("2022-01-01T00:00:00Z"), // 2 years of data
  endDate: new Date("2023-12-31T23:59:59Z"),
  partners: [
    SEED_IDS.partnerAccentCorp,
    SEED_IDS.partnerBetaTech,
    SEED_IDS.partnerGammaServices,
    SEED_IDS.partnerDeltaInc,
  ],
  products: [
    SEED_IDS.productLaptop,
    SEED_IDS.productMonitor,
    SEED_IDS.productKeyboard,
    SEED_IDS.productMouse,
  ],
  linesPerOrder: { min: 1, max: 5 },
  priceRange: { min: 29.99, max: 4999.99 },
};

// ============================================================================
// Utilities
// ============================================================================

/**
 * Generate random date within range with realistic distribution
 * Uses linear distribution across the range
 */
function randomDateInRange(start: Date, end: Date): Date {
  const startMs = start.getTime();
  const endMs = end.getTime();
  const randomMs = startMs + Math.random() * (endMs - startMs);
  return new Date(randomMs);
}

/**
 * Pareto distribution (80/20 rule) for partner selection
 * 80% of orders go to 20% of partners
 */
function selectPartnerPareto(partners: string[]): string {
  const paretoThreshold = 0.8;
  const topPartners = Math.ceil(partners.length * 0.2);

  if (Math.random() < paretoThreshold) {
    // 80% of the time, select from top 20% of partners
    return partners[Math.floor(Math.random() * topPartners)];
  }
  // 20% of the time, select from remaining partners
  return partners[topPartners + Math.floor(Math.random() * (partners.length - topPartners))];
}

/**
 * Generate realistic order status based on order date and current date
 */
function selectOrderStatus(orderDate: Date): "draft" | "sent" | "sale" | "done" | "cancel" {
  const now = new Date();
  const daysAgo = Math.floor((now.getTime() - orderDate.getTime()) / (1000 * 60 * 60 * 24));

  if (daysAgo < 7) {
    // Recent orders: more likely to be draft or sent
    const rand = Math.random();
    if (rand < 0.3) return "draft";
    if (rand < 0.6) return "sent";
    if (rand < 0.9) return "sale";
    return "done";
  } else if (daysAgo < 30) {
    // Last month: mostly sale or done
    const rand = Math.random();
    if (rand < 0.05) return "draft";
    if (rand < 0.15) return "sent";
    if (rand < 0.7) return "sale";
    if (rand < 0.95) return "done";
    return "cancel";
  } else {
    // Older orders: mostly done, some cancelled
    const rand = Math.random();
    if (rand < 0.92) return "done";
    if (rand < 0.96) return "sale";
    return "cancel";
  }
}

/**
 * Generate random price within range with realistic distribution
 * Uses log-normal distribution (more low-value orders)
 */
function randomPrice(min: number, max: number): string {
  const logMin = Math.log(min);
  const logMax = Math.log(max);
  const logRandom = logMin + Math.random() * (logMax - logMin);
  const price = Math.exp(logRandom);
  return money(price);
}

/**
 * Generate random integer within range (inclusive)
 */
function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Simple UUID v4 generator (deterministic based on index)
 */
function generateOrderId(index: number): string {
  const hex = index.toString(16).padStart(8, "0");
  return `10000000-${hex.slice(0, 4)}-4000-8000-${hex.slice(4)}00000000`.slice(0, 36);
}

function generateLineId(orderIndex: number, lineIndex: number): string {
  const orderHex = orderIndex.toString(16).padStart(8, "0");
  const lineHex = lineIndex.toString(16).padStart(4, "0");
  return `20000000-${orderHex.slice(0, 4)}-4000-${lineHex}-${orderHex.slice(4)}0000`.slice(0, 36);
}

// ============================================================================
// Data Generation
// ============================================================================

/**
 * Generate a single order with realistic data
 */
function generateOrder(
  index: number,
  config: LoadTestConfig,
  currencyId: number,
  seedAuditScope: SeedAuditScope
) {
  const orderDate = randomDateInRange(config.startDate, config.endDate);
  const status = selectOrderStatus(orderDate);
  const partnerId = selectPartnerPareto(config.partners);

  const quotationDate = new Date(orderDate.getTime() - 1000 * 60 * 60 * 24 * randomInt(0, 3)); // 0-3 days before order
  const confirmationDate = status === "draft" ? null : new Date(orderDate.getTime() + 1000 * 60 * 60 * randomInt(1, 48)); // 1-48 hours after order

  const numLines = randomInt(config.linesPerOrder.min, config.linesPerOrder.max);
  const lineData = Array.from({ length: numLines }, () => {
    const quantity = randomInt(1, 10);
    const priceUnit = randomPrice(config.priceRange.min, config.priceRange.max);
    const discount = Math.random() < 0.3 ? randomInt(5, 25) : 0; // 30% of lines have discount
    const subtotal = money(Number(priceUnit) * quantity * (1 - discount / 100));
    const tax = money(Number(subtotal) * 0.1); // 10% tax
    const total = money(Number(subtotal) + Number(tax));

    return {
      subtotal,
      tax,
      total,
      priceUnit,
      quantity,
      discount,
    };
  });

  const amountUntaxed = money(lineData.reduce((sum, line) => sum + Number(line.subtotal), 0));
  const amountTax = money(lineData.reduce((sum, line) => sum + Number(line.tax), 0));
  const amountTotal = money(Number(amountUntaxed) + Number(amountTax));

  const order = {
    ...seedAuditScope,
    id: generateOrderId(index),
    name: `LT-${index.toString().padStart(7, "0")}`,
    partnerId,
    status,
    sequenceNumber: `LT-2022-${index.toString().padStart(7, "0")}`,
    quotationDate,
    confirmationDate,
    currencyId,
    exchangeRateUsed: "1.000000",
    exchangeRateSource: "system_daily" as const,
    pricelistId: SEED_IDS.pricelistUsdStandard,
    pricelistSnapshotId: SEED_IDS.pricelistUsdStandard,
    paymentTermId: SEED_IDS.paymentTermNet30,
    creditCheckPassed: status !== "draft",
    creditCheckAt: status !== "draft" ? orderDate : null,
    creditCheckBy: status !== "draft" ? seedAuditScope.createdBy : null,
    creditLimitAtCheck: "50000.00",
    invoiceStatus: status === "done" ? "invoiced" as const : status === "sale" ? "to_invoice" as const : "no" as const,
    deliveryStatus: status === "done" ? "full" as const : status === "sale" ? "partial" as const : "no" as const,
    orderDate,
    deliveryDate: status === "done" || status === "sale" ? new Date(orderDate.getTime() + 1000 * 60 * 60 * 24 * randomInt(3, 14)) : null,
    assignedToId: null,
    notes: null,
    amountUntaxed,
    amountCost: "0.00",
    amountProfit: amountUntaxed,
    marginPercent: Number(amountUntaxed) === 0 ? "0.0000" : "100.0000",
    amountTax,
    amountTotal,
  };

  const lines = lineData.map((line, lineIndex) => ({
    ...seedAuditScope,
    id: generateLineId(index, lineIndex),
    orderId: order.id,
    productId: config.products[randomInt(0, config.products.length - 1)],
    taxId: SEED_IDS.taxRateSalesStandard10,
    productUomId: 1, // Will be replaced with actual UOM ID
    description: `Load test product line ${lineIndex + 1}`,
    quantity: line.quantity.toString(),
    priceUnit: line.priceUnit,
    discount: line.discount.toString(),
    priceListedAt: line.priceUnit,
    taxRuleSnapshot: '{"rule":"sales_standard_10","version":"2024-01"}',
    costUnit: "0.00",
    costSubtotal: "0.00",
    profitAmount: line.subtotal,
    marginPercent: Number(line.subtotal) === 0 ? "0.0000" : "100.0000",
    subtotal: line.subtotal,
    priceSubtotal: line.subtotal,
    priceTax: line.tax,
    priceTotal: line.total,
    qtyDelivered: status === "done" ? line.quantity.toString() : "0",
    qtyToInvoice: status === "sale" || status === "done" ? line.quantity.toString() : "0",
    qtyInvoiced: status === "done" ? line.quantity.toString() : "0",
    invoiceStatus: status === "done" ? "invoiced" as const : status === "sale" ? "to_invoice" as const : "no" as const,
    customerLead: randomInt(1, 7),
    displayType: "product" as const,
    priceSource: "pricelist" as const,
    discountSource: line.discount > 0 ? ("manual" as const) : ("volume" as const),
    appliedPricelistId: SEED_IDS.pricelistUsdStandard,
    sequence: (lineIndex + 1) * 10,
  }));

  return { order, lines };
}

// ============================================================================
// Batch Insert Functions
// ============================================================================

/**
 * Insert orders and lines in batches for optimal performance
 */
async function insertBatch(
  tx: Tx,
  orders: Array<typeof salesOrders.$inferInsert>,
  lines: Array<typeof salesOrderLines.$inferInsert>
): Promise<void> {
  if (orders.length === 0) return;

  // Insert orders
  await tx.insert(salesOrders).values(orders).execute();

  // Insert lines
  if (lines.length > 0) {
    await tx.insert(salesOrderLines).values(lines).execute();
  }
}

// ============================================================================
// Main Load Test Function
// ============================================================================

/**
 * Generate and insert load test data
 */
export async function seedLoadTest(
  tx: Tx,
  seedAuditScope: SeedAuditScope,
  config: Partial<LoadTestConfig> = {}
): Promise<{ ordersCreated: number; linesCreated: number; durationMs: number }> {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };

  console.log("\n========================================");
  console.log("PERFORMANCE LOAD TEST DATA GENERATION");
  console.log("========================================");
  console.log(`Target Orders: ${finalConfig.totalOrders.toLocaleString()}`);
  console.log(`Batch Size: ${finalConfig.batchSize.toLocaleString()}`);
  console.log(`Date Range: ${finalConfig.startDate.toISOString().split("T")[0]} to ${finalConfig.endDate.toISOString().split("T")[0]}`);
  console.log(`Partners: ${finalConfig.partners.length}`);
  console.log(`Products: ${finalConfig.products.length}`);
  console.log("========================================\n");

  // Get currency and UOM
  const usdCurrency = await tx
    .select({ currencyId: currencies.currencyId })
    .from(currencies)
    .where(sql`upper(${currencies.code}) = 'USD'`)
    .limit(1);

  const unitUom = await tx
    .select({ uomId: unitsOfMeasure.uomId })
    .from(unitsOfMeasure)
    .limit(1);

  if (!usdCurrency[0]?.currencyId || !unitUom[0]?.uomId) {
    throw new Error("Required currency or UOM not found");
  }

  const currencyId = usdCurrency[0].currencyId;
  const uomId = unitUom[0].uomId;

  let totalOrders = 0;
  let totalLines = 0;
  const startTime = performance.now();

  const numBatches = Math.ceil(finalConfig.totalOrders / finalConfig.batchSize);

  for (let batchIndex = 0; batchIndex < numBatches; batchIndex++) {
    const batchStartIndex = batchIndex * finalConfig.batchSize;
    const batchEndIndex = Math.min(batchStartIndex + finalConfig.batchSize, finalConfig.totalOrders);

    const ordersBatch: Array<typeof salesOrders.$inferInsert> = [];
    const linesBatch: Array<typeof salesOrderLines.$inferInsert> = [];

    for (let i = batchStartIndex; i < batchEndIndex; i++) {
      const { order, lines } = generateOrder(i, finalConfig, currencyId, seedAuditScope);

      // Replace UOM ID placeholder
      lines.forEach((line) => {
        line.productUomId = uomId;
      });

      ordersBatch.push(order);
      linesBatch.push(...lines);
    }

    await insertBatch(tx, ordersBatch, linesBatch);

    totalOrders += ordersBatch.length;
    totalLines += linesBatch.length;

    const elapsed = performance.now() - startTime;
    const rate = totalOrders / (elapsed / 1000);
    const eta = ((finalConfig.totalOrders - totalOrders) / rate) / 60;

    console.log(
      `Batch ${(batchIndex + 1).toString().padStart(3)}/${numBatches}: ` +
      `${totalOrders.toLocaleString().padStart(10)} orders, ` +
      `${totalLines.toLocaleString().padStart(10)} lines | ` +
      `Rate: ${Math.floor(rate).toLocaleString().padStart(6)} orders/sec | ` +
      `ETA: ${eta.toFixed(1)} min`
    );
  }

  const durationMs = performance.now() - startTime;

  console.log("\n========================================");
  console.log("LOAD TEST GENERATION COMPLETE");
  console.log("========================================");
  console.log(`Total Orders: ${totalOrders.toLocaleString()}`);
  console.log(`Total Lines: ${totalLines.toLocaleString()}`);
  console.log(`Duration: ${(durationMs / 1000).toFixed(2)}s`);
  console.log(`Rate: ${Math.floor(totalOrders / (durationMs / 1000)).toLocaleString()} orders/sec`);
  console.log("========================================\n");

  return { ordersCreated: totalOrders, linesCreated: totalLines, durationMs };
}
