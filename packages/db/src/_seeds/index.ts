/**
 * Deterministic Database Seeding Script
 *
 * Purpose: Populate database with reproducible sample data for:
 * - Development and testing
 * - E2E test runs
 * - Demo environments
 *
 * Architecture:
 *   - Transaction-safe: All-or-nothing atomic execution
 *   - Scenario-based: baseline | demo | stress via --scenario= flag
 *   - Invariant-safe: Monetary values computed, never hardcoded
 *   - Snapshot-locked: SHA-256 hash written to seed.snapshot for CI drift detection
 *
 * Usage:
 *   pnpm --filter @afenda/db seed
 *   pnpm --filter @afenda/db seed --scenario=demo
 *   pnpm --filter @afenda/db seed --scenario=stress
 *
 * Environment:
 *   - Expects DATABASE_URL or defaults to local test DB
 *   - Uses drizzle ORM for type safety
 */

import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { db } from "../db.js";
import {
  partners,
  productCategories,
  products,
  salesOrders,
  salesOrderLines,
} from "../schema/index.js";
import { calcLineSubtotal, calcOrderTotals, money } from "./money.js";

// ────────────────────────────────────────────────────────────────────────────
// Transaction Type
// ────────────────────────────────────────────────────────────────────────────

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

// ────────────────────────────────────────────────────────────────────────────
// Scenario System
// ────────────────────────────────────────────────────────────────────────────

type SeedScenario = "baseline" | "demo" | "stress";

const scenario = (process.argv
  .find((a) => a.startsWith("--scenario="))
  ?.split("=")[1] ?? "baseline") as SeedScenario;

const VALID_SCENARIOS: SeedScenario[] = ["baseline", "demo", "stress"];
if (!VALID_SCENARIOS.includes(scenario)) {
  console.error(`❌ Unknown scenario "${scenario}". Valid: ${VALID_SCENARIOS.join(", ")}`);
  process.exit(1);
}

// ────────────────────────────────────────────────────────────────────────────
// Deterministic Seed Data (Fixed UUIDs for replay consistency)
// ────────────────────────────────────────────────────────────────────────────

/**
 * Fixed UUID pool for deterministic seeding.
 * Format: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx (v4 compliant)
 *
 * IMPORTANT: Changing these values will alter seed.snapshot hash
 * and intentionally break CI snapshot verification.
 */
export const SEED_IDS = {
  // Partners (Customers + Vendors)
  partnerAccentCorp: "00000001-0000-4000-8000-000000000001",
  partnerBetaTech: "00000002-0000-4000-8000-000000000002",
  partnerGammaServices: "00000003-0000-4000-8000-000000000003",
  partnerDeltaInc: "00000004-0000-4000-8000-000000000004",

  // Product Categories
  categoryHardware: "00000101-0000-4000-8000-000000000101",
  categorySoftware: "00000102-0000-4000-8000-000000000102",
  categoryServices: "00000103-0000-4000-8000-000000000103",
  categoryComputers: "00000104-0000-4000-8000-000000000104",
  categoryPeripherals: "00000105-0000-4000-8000-000000000105",

  // Products
  productLaptop: "00000201-0000-4000-8000-000000000201",
  productDesktop: "00000202-0000-4000-8000-000000000202",
  productMonitor: "00000203-0000-4000-8000-000000000203",
  productMouse: "00000204-0000-4000-8000-000000000204",
  productKeyboard: "00000205-0000-4000-8000-000000000205",
  productLicense: "00000206-0000-4000-8000-000000000206",

  // Sales Orders
  orderOne: "00000301-0000-4000-8000-000000000301",
  orderTwo: "00000302-0000-4000-8000-000000000302",
  orderThree: "00000303-0000-4000-8000-000000000303",

  // Sales Order Lines
  lineOne: "00000401-0000-4000-8000-000000000401",
  lineTwo: "00000402-0000-4000-8000-000000000402",
  lineThree: "00000403-0000-4000-8000-000000000403",
  lineFour: "00000404-0000-4000-8000-000000000404",
  lineFive: "00000405-0000-4000-8000-000000000405",
  lineSix: "00000406-0000-4000-8000-000000000406",
} as const;

export type SeedIds = typeof SEED_IDS;

// ────────────────────────────────────────────────────────────────────────────
// Core Seed Functions (each accepts Tx for atomic composition)
// ────────────────────────────────────────────────────────────────────────────

async function clearExistingData(tx: Tx): Promise<void> {
  // Delete in reverse FK order to maintain referential integrity
  await tx.delete(salesOrderLines).execute();
  await tx.delete(salesOrders).execute();
  await tx.delete(products).execute();
  await tx.delete(productCategories).execute();
  await tx.delete(partners).execute();
  console.log("✓ Cleared existing data");
}

async function seedPartners(tx: Tx): Promise<void> {
  await tx
    .insert(partners)
    .values([
      {
        id: SEED_IDS.partnerAccentCorp,
        name: "Accent Corporation",
        email: "contact@accent-corp.com",
        phone: "+1-555-0100",
        type: "customer" as const,
        isActive: true,
      },
      {
        id: SEED_IDS.partnerBetaTech,
        name: "Beta Tech Solutions",
        email: "sales@betatech.io",
        phone: "+1-555-0200",
        type: "vendor" as const,
        isActive: true,
      },
      {
        id: SEED_IDS.partnerGammaServices,
        name: "Gamma Services Ltd",
        email: "info@gamma-services.co.uk",
        phone: "+44-20-7946-0958",
        type: "both" as const,
        isActive: true,
      },
      {
        id: SEED_IDS.partnerDeltaInc,
        name: "Delta Incorporated",
        email: "team@delta-inc.us",
        phone: "+1-555-0400",
        type: "customer" as const,
        isActive: true,
      },
    ])
    .execute();
  console.log("✓ Seeded 4 partners");
}

async function seedProductCategories(tx: Tx): Promise<void> {
  await tx
    .insert(productCategories)
    .values([
      { id: SEED_IDS.categoryHardware, name: "Hardware", parentId: null },
      { id: SEED_IDS.categoryComputers, name: "Computers", parentId: SEED_IDS.categoryHardware },
      {
        id: SEED_IDS.categoryPeripherals,
        name: "Peripherals",
        parentId: SEED_IDS.categoryHardware,
      },
      { id: SEED_IDS.categorySoftware, name: "Software", parentId: null },
      { id: SEED_IDS.categoryServices, name: "Services", parentId: null },
    ])
    .execute();
  console.log("✓ Seeded 5 product categories (with hierarchy)");
}

async function seedProducts(tx: Tx): Promise<void> {
  await tx
    .insert(products)
    .values([
      {
        id: SEED_IDS.productLaptop,
        name: "Professional Laptop Pro",
        sku: "LAPTOP-PRO-2024",
        categoryId: SEED_IDS.categoryComputers,
        unitPrice: "1299.99",
        description: "High-performance laptop for professionals",
        isActive: true,
      },
      {
        id: SEED_IDS.productDesktop,
        name: "Workstation Desktop",
        sku: "DESKTOP-WS-2024",
        categoryId: SEED_IDS.categoryComputers,
        unitPrice: "1899.99",
        description: "Powerful desktop workstation",
        isActive: true,
      },
      {
        id: SEED_IDS.productMonitor,
        name: '4K Monitor 27"',
        sku: "MONITOR-4K-27",
        categoryId: SEED_IDS.categoryPeripherals,
        unitPrice: "599.99",
        description: "High-resolution 4K display",
        isActive: true,
      },
      {
        id: SEED_IDS.productMouse,
        name: "Wireless Mouse",
        sku: "MOUSE-WIRELESS",
        categoryId: SEED_IDS.categoryPeripherals,
        unitPrice: "29.99",
        description: "Ergonomic wireless mouse",
        isActive: true,
      },
      {
        id: SEED_IDS.productKeyboard,
        name: "Mechanical Keyboard",
        sku: "KEYBOARD-MECH",
        categoryId: SEED_IDS.categoryPeripherals,
        unitPrice: "149.99",
        description: "Professional mechanical keyboard",
        isActive: true,
      },
      {
        id: SEED_IDS.productLicense,
        name: "Enterprise Software License",
        sku: "SOFTWARE-ENTERPRISE",
        categoryId: SEED_IDS.categorySoftware,
        unitPrice: "4999.99",
        description: "Annual enterprise software license",
        isActive: true,
      },
    ])
    .execute();
  console.log("✓ Seeded 6 products");
}

async function seedSalesOrdersAndLines(tx: Tx): Promise<void> {
  // Invariant: compute all monetary values from primitives
  const l1 = calcLineSubtotal(2, 599.99, 10.0);  // monitor ×2 − $10/unit
  const l2 = calcLineSubtotal(2, 29.99, 0);       // mouse ×2
  const l3 = calcLineSubtotal(1, 149.99, 0);      // keyboard ×1
  const l4 = calcLineSubtotal(1, 1299.99, 0);     // laptop ×1
  const l5 = calcLineSubtotal(2, 1899.99, 50.0); // desktop ×2 − $50/unit
  const l6 = calcLineSubtotal(1, 4999.99, 0);     // license ×1

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
        id: SEED_IDS.orderOne,
        name: "SO-2024-001",
        partnerId: SEED_IDS.partnerAccentCorp,
        status: "confirmed" as const,
        orderDate: new Date("2024-01-15T10:00:00Z"),
        deliveryDate: new Date("2024-01-20T00:00:00Z"),
        assignedToId: null,
        notes: "Urgent delivery requested",
        amountUntaxed: o1.amountUntaxed,
        amountTax: o1.amountTax,
        amountTotal: o1.amountTotal,
      },
      {
        id: SEED_IDS.orderTwo,
        name: "SO-2024-002",
        partnerId: SEED_IDS.partnerGammaServices,
        status: "draft" as const,
        orderDate: new Date("2024-02-01T14:30:00Z"),
        deliveryDate: null,
        assignedToId: null,
        notes: "Pending approval from stakeholders",
        amountUntaxed: o2.amountUntaxed,
        amountTax: o2.amountTax,
        amountTotal: o2.amountTotal,
      },
      {
        id: SEED_IDS.orderThree,
        name: "SO-2024-003",
        partnerId: SEED_IDS.partnerDeltaInc,
        status: "shipped" as const,
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
        id: SEED_IDS.lineOne,
        orderId: SEED_IDS.orderOne,
        productId: SEED_IDS.productMonitor,
        description: '4K Monitor 27" (qty 2)',
        quantity: "2",
        priceUnit: "599.99",
        discount: "10.00",
        subtotal: money(l1),
        sequence: 10,
      },
      {
        id: SEED_IDS.lineTwo,
        orderId: SEED_IDS.orderOne,
        productId: SEED_IDS.productMouse,
        description: "Wireless Mouse (qty 2)",
        quantity: "2",
        priceUnit: "29.99",
        discount: "0.00",
        subtotal: money(l2),
        sequence: 20,
      },
      {
        id: SEED_IDS.lineThree,
        orderId: SEED_IDS.orderOne,
        productId: SEED_IDS.productKeyboard,
        description: "Mechanical Keyboard (qty 1)",
        quantity: "1",
        priceUnit: "149.99",
        discount: "0.00",
        subtotal: money(l3),
        sequence: 30,
      },
      {
        id: SEED_IDS.lineFour,
        orderId: SEED_IDS.orderTwo,
        productId: SEED_IDS.productLaptop,
        description: "Professional Laptop Pro (qty 1)",
        quantity: "1",
        priceUnit: "1299.99",
        discount: "0.00",
        subtotal: money(l4),
        sequence: 10,
      },
      {
        id: SEED_IDS.lineFive,
        orderId: SEED_IDS.orderThree,
        productId: SEED_IDS.productDesktop,
        description: "Workstation Desktop (qty 2)",
        quantity: "2",
        priceUnit: "1899.99",
        discount: "50.00",
        subtotal: money(l5),
        sequence: 10,
      },
      {
        id: SEED_IDS.lineSix,
        orderId: SEED_IDS.orderThree,
        productId: SEED_IDS.productLicense,
        description: "Enterprise Software License (qty 1)",
        quantity: "1",
        priceUnit: "4999.99",
        discount: "0.00",
        subtotal: money(l6),
        sequence: 20,
      },
    ])
    .execute();
  console.log("✓ Seeded 6 sales order lines");
}

// ────────────────────────────────────────────────────────────────────────────
// Core Layer (shared baseline — used by all scenarios)
// ────────────────────────────────────────────────────────────────────────────

async function seedCore(tx: Tx): Promise<void> {
  await seedPartners(tx);
  await seedProductCategories(tx);
  await seedProducts(tx);
}

// ────────────────────────────────────────────────────────────────────────────
// Scenario Registry
// ────────────────────────────────────────────────────────────────────────────

const scenarioSeeds: Record<SeedScenario, (tx: Tx) => Promise<void>> = {
  /**
   * baseline — standard reference state for development & CI
   * Contains: 4 partners, 5 categories, 6 products, 3 orders, 6 order lines
   */
  baseline: async (tx) => {
    await seedCore(tx);
    await seedSalesOrdersAndLines(tx);
  },

  /**
   * demo — full baseline + extra showcase data for demonstrations
   * Extends baseline without modifying it
   */
  demo: async (tx) => {
    await seedCore(tx);
    await seedSalesOrdersAndLines(tx);
    // TODO: add demo-specific showcase orders and payment records
    console.log("   (demo extensions: add demo-specific data here)");
  },

  /**
   * stress — core entities only; extend with bulk data generators
   * Designed for performance testing
   */
  stress: async (tx) => {
    await seedCore(tx);
    await seedSalesOrdersAndLines(tx);
    // TODO: add bulk order generator (10_000+ records)
    console.log("   (stress extensions: add bulk data generator here)");
  },
};

// ────────────────────────────────────────────────────────────────────────────
// Snapshot Generation (CI Truth Lock)
// ────────────────────────────────────────────────────────────────────────────

/**
 * Generate a deterministic SHA-256 hash of the canonical seed definition.
 *
 * Hashes SEED_IDS + monetary computation results (no DB required).
 * Committed as seed.snapshot — CI re-computes and compares.
 * Any unintentional change to UUIDs, prices, or quantities will alter the hash.
 */
function generateSeedHash(): string {
  // Compute all monetary values (same as seeding pipeline)
  const l1 = calcLineSubtotal(2, 599.99, 10.0);
  const l2 = calcLineSubtotal(2, 29.99, 0);
  const l3 = calcLineSubtotal(1, 149.99, 0);
  const l4 = calcLineSubtotal(1, 1299.99, 0);
  const l5 = calcLineSubtotal(2, 1899.99, 50.0);
  const l6 = calcLineSubtotal(1, 4999.99, 0);

  const o1 = calcOrderTotals([l1, l2, l3]);
  const o2 = calcOrderTotals([l4]);
  const o3 = calcOrderTotals([l5, l6]);

  const manifest = {
    version: 1,
    ids: SEED_IDS,
    computedTotals: {
      lines: [money(l1), money(l2), money(l3), money(l4), money(l5), money(l6)],
      orders: [
        { amountUntaxed: o1.amountUntaxed, amountTax: o1.amountTax, amountTotal: o1.amountTotal },
        { amountUntaxed: o2.amountUntaxed, amountTax: o2.amountTax, amountTotal: o2.amountTotal },
        { amountUntaxed: o3.amountUntaxed, amountTax: o3.amountTax, amountTotal: o3.amountTotal },
      ],
    },
  };

  return crypto.createHash("sha256").update(JSON.stringify(manifest)).digest("hex");
}

async function saveSnapshot(hash: string): Promise<void> {
  const dir = path.dirname(fileURLToPath(import.meta.url));
  // Write to packages/db/ root so it can be committed alongside the script
  const snapshotPath = path.resolve(dir, "../../..", "seed.snapshot");
  await fs.writeFile(snapshotPath, hash + "\n", "utf8");
  console.log(`✓ Snapshot saved: ${hash.slice(0, 12)}... → seed.snapshot`);
}

async function verifySnapshot(hash: string): Promise<void> {
  const dir = path.dirname(fileURLToPath(import.meta.url));
  const snapshotPath = path.resolve(dir, "../../..", "seed.snapshot");

  try {
    const committed = (await fs.readFile(snapshotPath, "utf8")).trim();
    if (committed !== hash) {
      console.error("❌ Snapshot mismatch — seed definition has drifted from committed snapshot");
      console.error(`   Committed: ${committed.slice(0, 12)}...`);
      console.error(`   Computed:  ${hash.slice(0, 12)}...`);
      console.error("   Run 'pnpm seed' to regenerate seed.snapshot, then commit it.");
      process.exitCode = 1;
    } else {
      console.log(`✓ Snapshot verified: hash matches committed snapshot`);
    }
  } catch {
    // No snapshot file yet — create it on first run
    await saveSnapshot(hash);
  }
}

// ────────────────────────────────────────────────────────────────────────────
// Main Orchestration
// ────────────────────────────────────────────────────────────────────────────

async function seed(): Promise<void> {
  console.log("\n╔═══════════════════════════════════════════════════════════╗");
  console.log(`║  Database Seeding — Scenario: ${scenario.padEnd(28)}║`);
  console.log("╚═══════════════════════════════════════════════════════════╝\n");

  try {
    await db.transaction(async (tx) => {
      console.log("━━━ PHASE 1: Data Cleanup ━━━");
      await clearExistingData(tx);
      console.log();

      console.log(`━━━ PHASE 2: Seed Scenario [${scenario}] ━━━`);
      await scenarioSeeds[scenario](tx);
      console.log();

      console.log("✅ Transaction committed atomically\n");
    });

    // Generate + verify snapshot AFTER successful transaction
    console.log("━━━ PHASE 3: Snapshot Verification ━━━");
    const hash = generateSeedHash();
    await verifySnapshot(hash);
    console.log();

    console.log("📊 Summary:");
    console.log("   • 4 Partners (customers & vendors)");
    console.log("   • 5 Product Categories (with hierarchy)");
    console.log("   • 6 Products");
    console.log("   • 3 Sales Orders");
    console.log("   • 6 Sales Order Lines");
    console.log("\n🔄 Determinism:  Fixed UUIDs ensure replay consistency");
    console.log("🔒 Atomic Safety: Wrapped in transaction (all-or-nothing)");
    console.log("📐 Invariants:   Monetary values derived, never hardcoded");
    console.log(`🔬 Snapshot:     hash=${generateSeedHash().slice(0, 12)}...\n`);
  } catch (error) {
    console.error("❌ Seeding failed:", error);
    throw error;
  }
}

// ────────────────────────────────────────────────────────────────────────────
// Entry Point
// ────────────────────────────────────────────────────────────────────────────

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  seed().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
