/**
 * Seed Orchestrator
 *
 * This file is intentionally thin — it contains ONLY:
 *   - Scenario registry (which domains to run per scenario)
 *   - seedCore() shared baseline composer
 *   - seed() entry point + CLI arg parsing
 *
 * Adding a new domain (HRM, CRM, Manufacturing, …):
 *   1. Create  packages/db/src/_seeds/domains/<domain>/index.ts
 *   2. Append  IDs to seed-ids.ts
 *   3. Append  table deletes to clear.ts (FK-reverse order)
 *   4. Import  seed<Domain> + validate<Domain> below and call them in the scenario(s)
 *
 * Zero other files change.
 */

import { pathToFileURL } from "node:url";

import { db } from "../db.js";
import { clearExistingData } from "./clear.js";
import { seedCommercialPolicies } from "./domains/commercial-policy/index.js";
import { seedCommissionsAndTeamsPhase10, validateCommissionsPhase10Invariants } from "./domains/commissions/index.js";
import { seedConsignmentPhase7, validateConsignmentPhase7Invariants } from "./domains/consignment/index.js";
import { ensureDefaultTenant, seedReferenceData } from "./domains/foundation/index.js";
import { seedPartners } from "./domains/partner/index.js";
import { seedProductCategories, seedProducts } from "./domains/product/index.js";
import { seedReturnsPhase8, validateReturnsPhase8Invariants } from "./domains/returns/index.js";
import { seedSalesOrdersAndLines, validateSalesPhase6Invariants } from "./domains/sales/index.js";
import { seedSubscriptionsPhase9, validateSubscriptionsPhase9Invariants } from "./domains/subscriptions/index.js";
import { seedTaxPolicies } from "./domains/tax/index.js";
import { generateSeedHash, verifySnapshot } from "./snapshot.js";
import { type SeedAuditScope, type SeedScenario, type Tx, createSeedAuditScope } from "./seed-types.js";

// Re-export for consumers that previously imported from this file
export { SEED_IDS } from "./seed-ids.js";
export type { SeedIds } from "./seed-ids.js";

// ── CLI ──────────────────────────────────────────────────────────────────────
const VALID_SCENARIOS: SeedScenario[] = ["baseline", "demo", "stress"];
const scenario = (process.argv.find((a) => a.startsWith("--scenario="))?.split("=")[1] ??
  "baseline") as SeedScenario;

if (!VALID_SCENARIOS.includes(scenario)) {
  console.error(`Unknown scenario "${scenario}". Valid: ${VALID_SCENARIOS.join(", ")}`);
  process.exit(1);
}

// ── Core Composer (shared by all scenarios) ──────────────────────────────────
async function seedCore(tx: Tx, seedAuditScope: SeedAuditScope): Promise<void> {
  await seedReferenceData(tx, seedAuditScope);
  await seedPartners(tx, seedAuditScope);
  await seedProductCategories(tx, seedAuditScope);
  await seedProducts(tx, seedAuditScope);
  await seedCommercialPolicies(tx, seedAuditScope);
  await seedTaxPolicies(tx, seedAuditScope);
}

// ── Scenario Registry ────────────────────────────────────────────────────────
const scenarioSeeds: Record<SeedScenario, (tx: Tx, seedAuditScope: SeedAuditScope) => Promise<void>> = {
  baseline: async (tx, seedAuditScope) => {
    await seedCore(tx, seedAuditScope);
    await seedSalesOrdersAndLines(tx, seedAuditScope);
    await validateSalesPhase6Invariants(tx);
    await seedConsignmentPhase7(tx, seedAuditScope);
    await validateConsignmentPhase7Invariants(tx);
    await seedReturnsPhase8(tx, seedAuditScope);
    await validateReturnsPhase8Invariants(tx);
    await seedSubscriptionsPhase9(tx, seedAuditScope);
    await validateSubscriptionsPhase9Invariants(tx);
    await seedCommissionsAndTeamsPhase10(tx, seedAuditScope);
    await validateCommissionsPhase10Invariants(tx);
  },
  demo: async (tx, seedAuditScope) => {
    await seedCore(tx, seedAuditScope);
    await seedSalesOrdersAndLines(tx, seedAuditScope);
    await validateSalesPhase6Invariants(tx);
    await seedConsignmentPhase7(tx, seedAuditScope);
    await validateConsignmentPhase7Invariants(tx);
    await seedReturnsPhase8(tx, seedAuditScope);
    await validateReturnsPhase8Invariants(tx);
    await seedSubscriptionsPhase9(tx, seedAuditScope);
    await validateSubscriptionsPhase9Invariants(tx);
    await seedCommissionsAndTeamsPhase10(tx, seedAuditScope);
    await validateCommissionsPhase10Invariants(tx);
    console.log("   (demo extensions: add demo-specific data here)");
  },
  stress: async (tx, seedAuditScope) => {
    await seedCore(tx, seedAuditScope);
    await seedSalesOrdersAndLines(tx, seedAuditScope);
    await validateSalesPhase6Invariants(tx);
    await seedConsignmentPhase7(tx, seedAuditScope);
    await validateConsignmentPhase7Invariants(tx);
    await seedReturnsPhase8(tx, seedAuditScope);
    await validateReturnsPhase8Invariants(tx);
    await seedSubscriptionsPhase9(tx, seedAuditScope);
    await validateSubscriptionsPhase9Invariants(tx);
    await seedCommissionsAndTeamsPhase10(tx, seedAuditScope);
    await validateCommissionsPhase10Invariants(tx);
    console.log("   (stress extensions: add bulk data generator here)");
  },
};

// ── Entry Point ──────────────────────────────────────────────────────────────
async function seed(): Promise<void> {
  console.log("\n╔═══════════════════════════════════════════════════════════╗");
  console.log(`║  Database Seeding — Scenario: ${scenario.padEnd(28)}║`);
  console.log("╚═══════════════════════════════════════════════════════════╝\n");
  try {
    await db.transaction(async (tx) => {
      console.log("━━━ PHASE 1: Data Cleanup ━━━");
      await clearExistingData(tx);
      console.log();
      const tenantId = await ensureDefaultTenant(tx);
      const seedAuditScope = createSeedAuditScope(tenantId);
      console.log(`✓ Using tenant scope: ${tenantId}\n`);
      console.log(`━━━ PHASE 2: Seed Scenario [${scenario}] ━━━`);
      await scenarioSeeds[scenario](tx, seedAuditScope);
      console.log("\n✅ Transaction committed atomically\n");
    });
    console.log("━━━ PHASE 3: Snapshot Verification ━━━");
    const hash = generateSeedHash();
    await verifySnapshot(hash);
    console.log(`\n🔬 Snapshot: hash=${hash.slice(0, 12)}...\n`);
  } catch (error) {
    console.error("Seeding failed:", error);
    throw error;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  seed().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}