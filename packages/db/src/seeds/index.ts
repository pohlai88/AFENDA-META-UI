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
import { ensureDefaultTenant, ensureSystemUser, seedReferenceData } from "./domains/foundation/index.js";
import {
  seedDecisionAuditSamples,
  seedMetadata,
  seedTenantOverrides,
  validateMetadataInvariants,
} from "./domains/metadata/index.js";
import { seedPartners } from "./domains/partner/index.js";
import {
  seedProductCategories,
  seedProductConfiguration,
  seedProducts,
  validateProductConfigurationInvariants,
} from "./domains/product/index.js";
import { seedReturnsPhase8, validateReturnsPhase8Invariants } from "./domains/returns/index.js";
import { seedSalesOrdersAndLines, validateSalesPhase6Invariants } from "./domains/sales/index.js";
import { seedSubscriptionsPhase9, validateSubscriptionsPhase9Invariants } from "./domains/subscriptions/index.js";
import { seedTaxPolicies } from "./domains/tax/index.js";
import { seedLoadTest } from "./performance/load-test-generator.js";
import { generateSeedHash, verifySnapshot } from "./snapshot.js";
import { type SeedAuditScope, type SeedScenario, type Tx, createSeedAuditScope } from "./seed-types.js";

// Re-export for consumers that previously imported from this file
export { SEED_IDS } from "./seed-ids.js";
export type { SeedIds } from "./seed-ids.js";

// ── CLI ──────────────────────────────────────────────────────────────────────
const VALID_SCENARIOS: SeedScenario[] = ["baseline", "demo", "stress", "load-test-1M"];
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
  await seedProductConfiguration(tx, seedAuditScope);
  await validateProductConfigurationInvariants(tx, seedAuditScope.tenantId);
  await seedCommercialPolicies(tx, seedAuditScope);
  await seedTaxPolicies(tx, seedAuditScope);
  await seedMetadata(tx, seedAuditScope);
  await seedTenantOverrides(tx, seedAuditScope);
  await seedDecisionAuditSamples(tx, seedAuditScope);
  await validateMetadataInvariants(tx);
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
  "load-test-1M": async (tx, seedAuditScope) => {
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("   LOAD TEST SCENARIO: 1M+ ORDERS");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
    await seedReferenceData(tx, seedAuditScope);
    await seedPartners(tx, seedAuditScope);
    await seedProductCategories(tx, seedAuditScope);
    await seedProducts(tx, seedAuditScope);
    await seedProductConfiguration(tx, seedAuditScope);
    await seedCommercialPolicies(tx, seedAuditScope);
    await seedTaxPolicies(tx, seedAuditScope);
    console.log("\n━━━ Generating 1M+ Orders (this will take 10-20 minutes) ━━━\n");
    const result = await seedLoadTest(tx, seedAuditScope);
    console.log(`\n✅ Load test complete: ${result.ordersCreated.toLocaleString()} orders, ${result.linesCreated.toLocaleString()} lines`);
    console.log(`   Duration: ${(result.durationMs / 1000 / 60).toFixed(1)} minutes\n`);
  },
};

// ── Entry Point ──────────────────────────────────────────────────────────────
export async function seed(
  customDb?: typeof db,
  customScenario?: SeedScenario
): Promise<void> {
  const targetScenario = customScenario ?? scenario;
  const targetDb = customDb ?? db;

  console.log("\n╔═══════════════════════════════════════════════════════════╗");
  console.log(`║  Database Seeding — Scenario: ${targetScenario.padEnd(28)}║`);
  console.log("╚═══════════════════════════════════════════════════════════╝\n");
  try {
    await targetDb.transaction(async (tx) => {
      console.log("━━━ PHASE 1: Data Cleanup ━━━");
      await clearExistingData(tx);
      console.log();
      const tenantId = await ensureDefaultTenant(tx);
      const systemUserId = await ensureSystemUser(tx, tenantId);
      const seedAuditScope = createSeedAuditScope(tenantId, systemUserId);
      console.log(`✓ Using tenant scope: ${tenantId}\n`);
      console.log(`━━━ PHASE 2: Seed Scenario [${targetScenario}] ━━━`);
      await scenarioSeeds[targetScenario](tx, seedAuditScope);
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