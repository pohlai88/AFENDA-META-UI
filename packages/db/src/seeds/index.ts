/**
 * Seed Orchestrator — Truth Initialization Engine entrypoint.
 *
 * Adding a new domain: see README.md / ARCHITECTURE.md (`clear-tables.ts` + `clear.ts` + domains + seed-ids).
 */

import { pathToFileURL } from "node:url";

import { db } from "../drizzle/db.js";
import { assertSeedContract } from "./assert-seed-contract.js";
import { clearExistingData } from "./clear.js";
import { seedCommercialPolicies } from "./domains/commercial-policy/index.js";
import { seedCommissionsAndTeamsPhase10, validateCommissionsPhase10Invariants } from "./domains/commissions/index.js";
import { seedConsignmentPhase7, validateConsignmentPhase7Invariants } from "./domains/consignment/index.js";
import { ensureDefaultTenant, ensureSystemUser, seedReferenceData } from "./domains/foundation/index.js";
import { seedHrDomain } from "./domains/hr/index.js";
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
import type { SeedPhase } from "./seed.contract.js";
import { runSeedEngine, type SeedEngineContext, type SeedPhaseHandler } from "./seed.engine.js";
import { type SeedAuditScope, type SeedScenario, type Tx, createSeedAuditScope } from "./seed-types.js";

export { SEED_IDS } from "./seed-ids.js";
export type { SeedIds } from "./seed-ids.js";
export { assertSeedContract, SeedContractError } from "./assert-seed-contract.js";
export { seedContract, type SeedContract, type SeedPhase } from "./seed.contract.js";
export { runSeedEngine, type SeedScenarioPlugin } from "./seed.engine.js";
export { getSeedClearTableFqns, generateClearPlanReport } from "./clear-plan.js";

const VALID_SCENARIOS: SeedScenario[] = ["baseline", "demo", "stress", "load-test-1M"];

const DEFAULT_SCENARIO: SeedScenario = "baseline";

function isSeedCliMain(): boolean {
  try {
    return !!(process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href);
  } catch {
    return false;
  }
}

function parseArg(argv: string[], prefix: string): string | undefined {
  return argv.find((a) => a.startsWith(prefix))?.slice(prefix.length);
}

function parsePhasesFromArgv(scen: SeedScenario, phasesArg: string | undefined): SeedPhase[] {
  if (phasesArg) {
    const list = phasesArg.split(",").map((s) => s.trim()) as SeedPhase[];
    const valid: SeedPhase[] = ["foundation", "business", "scenario", "synthetic"];
    for (const p of list) {
      if (!valid.includes(p)) {
        console.error(`Unknown phase "${p}". Valid: ${valid.join(", ")}`);
        process.exit(1);
      }
    }
    return list;
  }
  return defaultPhasesForScenario(scen);
}

/** Scenario from argv when running as CLI; default when imported as a library. */
let cliScenario: SeedScenario = DEFAULT_SCENARIO;
let cliPhasesArg: string | undefined;
let cliSkipContract = false;
let cliSkipSnapshot = false;

if (isSeedCliMain()) {
  const argv = process.argv;
  if (argv.includes("--help") || argv.includes("-h")) {
    console.log(`
@afenda/db seed — Truth Initialization Engine

  --scenario=baseline|demo|stress|load-test-1M   (default: baseline)
  --phases=foundation,business,scenario[,synthetic]   subset for faster slices
  --skip-contract     skip assertSeedContract after commit
  --skip-snapshot     skip seed.snapshot verification

Connection (Neon / Postgres):
  Canonical seed: prefer DATABASE_URL_MIGRATIONS or direct URL (see README).
  App runtime: pooled DATABASE_URL is normal; avoid using pooler for huge seed transactions if you see timeouts.

Examples:
  pnpm --filter @afenda/db db:seed
  pnpm --filter @afenda/db db:seed -- --phases=foundation,business --skip-contract
`);
    process.exit(0);
  }

  cliScenario = (parseArg(argv, "--scenario=") ?? DEFAULT_SCENARIO) as SeedScenario;
  cliPhasesArg = parseArg(argv, "--phases=");
  cliSkipContract = argv.includes("--skip-contract");
  cliSkipSnapshot = argv.includes("--skip-snapshot");

  if (!VALID_SCENARIOS.includes(cliScenario)) {
    console.error(`Unknown scenario "${cliScenario}". Valid: ${VALID_SCENARIOS.join(", ")}`);
    process.exit(1);
  }
}

function defaultPhasesForScenario(scen: SeedScenario): SeedPhase[] {
  if (scen === "load-test-1M") {
    return ["foundation", "business", "scenario"];
  }
  return ["foundation", "business", "scenario"];
}

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
  await seedHrDomain(tx, seedAuditScope);
  await validateMetadataInvariants(tx);
}

async function businessPhaseLoadTest(tx: Tx, seedAuditScope: SeedAuditScope): Promise<void> {
  await seedReferenceData(tx, seedAuditScope);
  await seedPartners(tx, seedAuditScope);
  await seedProductCategories(tx, seedAuditScope);
  await seedProducts(tx, seedAuditScope);
  await seedProductConfiguration(tx, seedAuditScope);
  await seedCommercialPolicies(tx, seedAuditScope);
  await seedTaxPolicies(tx, seedAuditScope);
}

const scenarioTail: Record<
  SeedScenario,
  (tx: Tx, seedAuditScope: SeedAuditScope) => Promise<void>
> = {
  baseline: async (tx, seedAuditScope) => {
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
    await scenarioTail.baseline(tx, seedAuditScope);
    console.log("   (demo extensions: add demo-specific data here)");
  },
  stress: async (tx, seedAuditScope) => {
    await scenarioTail.baseline(tx, seedAuditScope);
    console.log("   (stress extensions: add bulk data generator here)");
  },
  "load-test-1M": async (tx, seedAuditScope) => {
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("   LOAD TEST SCENARIO: 1M+ ORDERS");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
    console.log("\n━━━ Generating 1M+ Orders (this will take 10-20 minutes) ━━━\n");
    const result = await seedLoadTest(tx, seedAuditScope);
    console.log(
      `\n✅ Load test complete: ${result.ordersCreated.toLocaleString()} orders, ${result.linesCreated.toLocaleString()} lines`
    );
    console.log(`   Duration: ${(result.durationMs / 1000 / 60).toFixed(1)} minutes\n`);
  },
};

export type SeedRunOptions = {
  db?: typeof db;
  scenario?: SeedScenario;
  /** Subset of phases; default full pipeline for scenario */
  phases?: readonly SeedPhase[];
  /** Validate seed contract against DB after transaction (default: true for baseline/demo/stress full runs) */
  validateContract?: boolean;
  /** Run seed.snapshot check (default: true except when disabled) */
  runSnapshotCheck?: boolean;
};

function defaultValidateContract(
  scen: SeedScenario,
  phases: readonly SeedPhase[],
  explicit?: boolean
): boolean {
  if (explicit !== undefined) {
    return explicit;
  }
  if (scen === "load-test-1M") {
    return false;
  }
  if (!phases.includes("scenario")) {
    return false;
  }
  return true;
}

function defaultSnapshotCheck(scen: SeedScenario, explicit?: boolean): boolean {
  if (explicit !== undefined) {
    return explicit;
  }
  return scen !== "load-test-1M";
}

/**
 * Programmatic seed entry. Legacy: `seed(db, "baseline")`.
 * Options: `seed({ db, scenario: "baseline", phases: [...] })`.
 */
export async function seed(
  arg1?: typeof db | SeedRunOptions,
  arg2?: SeedScenario,
  arg3?: SeedRunOptions
): Promise<void> {
  let targetDb = db;
  let targetScenario: SeedScenario = cliScenario;
  let opts: SeedRunOptions = {};

  if (arg1 !== undefined && typeof arg1 === "object" && arg1 !== null && "transaction" in arg1) {
    targetDb = arg1;
    if (typeof arg2 === "string") {
      targetScenario = arg2;
    }
    opts = arg3 ?? {};
  } else if (
    arg1 !== undefined &&
    typeof arg1 === "object" &&
    arg1 !== null &&
    !("transaction" in arg1) &&
    ("scenario" in arg1 || "phases" in arg1 || "db" in arg1 || "validateContract" in arg1 || "runSnapshotCheck" in arg1)
  ) {
    opts = arg1 as SeedRunOptions;
    targetDb = opts.db ?? db;
    targetScenario = opts.scenario ?? cliScenario;
  }

  const phases = (opts.phases as SeedPhase[] | undefined) ?? defaultPhasesForScenario(targetScenario);
  const validateContract = defaultValidateContract(targetScenario, phases, opts.validateContract);
  const runSnap = defaultSnapshotCheck(targetScenario, opts.runSnapshotCheck);

  console.log("\n╔═══════════════════════════════════════════════════════════╗");
  console.log(`║  Database Seeding — Scenario: ${targetScenario.padEnd(28)}║`);
  console.log(`║  Phases: ${phases.join(", ").slice(0, 52).padEnd(52)}║`);
  console.log("╚═══════════════════════════════════════════════════════════╝\n");

  const seedState: {
    tenantId: number;
    systemUserId: number;
    seedAuditScope: SeedAuditScope;
  } = {
    tenantId: 0,
    systemUserId: 0,
    seedAuditScope: createSeedAuditScope(0, 0),
  };

  const basePhases: Record<SeedPhase, SeedPhaseHandler | undefined> = {
    foundation: async (ctx: SeedEngineContext) => {
      const tid = await ensureDefaultTenant(ctx.tx);
      const sid = await ensureSystemUser(ctx.tx, tid);
      seedState.tenantId = tid;
      seedState.systemUserId = sid;
      seedState.seedAuditScope = createSeedAuditScope(tid, sid);
      console.log(`✓ Using tenant scope: ${tid}\n`);
    },
    business: async (ctx: SeedEngineContext) => {
      const scope = seedState.seedAuditScope;
      if (targetScenario === "load-test-1M") {
        await businessPhaseLoadTest(ctx.tx, scope);
      } else {
        await seedCore(ctx.tx, scope);
      }
    },
    scenario: async (ctx: SeedEngineContext) => {
      console.log(`━━━ Phase: scenario [${targetScenario}] ━━━`);
      await scenarioTail[targetScenario](ctx.tx, seedState.seedAuditScope);
    },
    synthetic: async () => {
      console.log("   (synthetic phase: use pnpm --filter @afenda/db seed:synthetic)");
    },
  };

  try {
    await targetDb.transaction(async (tx) => {
      console.log("━━━ PHASE: clear ━━━");
      await clearExistingData(tx);
      console.log();

      const ctx: SeedEngineContext = { tx };

      console.log("━━━ PHASE: seed pipeline ━━━");
      await runSeedEngine({
        ctx,
        phases,
        basePhases,
      });
      console.log("\n✅ Transaction committed atomically\n");
    });

    if (runSnap) {
      console.log("━━━ Snapshot Verification ━━━");
      const hash = generateSeedHash();
      await verifySnapshot(hash);
      console.log(`\n🔬 Snapshot: hash=${hash.slice(0, 12)}...\n`);
    } else {
      console.log("━━━ Snapshot Verification (skipped) ━━━\n");
    }

    if (validateContract) {
      console.log("━━━ Seed contract ━━━");
      await assertSeedContract(targetDb, { tenantId: seedState.tenantId });
      console.log("✓ Seed contract validated\n");
    } else {
      console.log("━━━ Seed contract (skipped) ━━━\n");
    }
  } catch (error) {
    console.error("Seeding failed:", error);
    throw error;
  }
}

if (isSeedCliMain()) {
  const cliPhases = parsePhasesFromArgv(cliScenario, cliPhasesArg);
  seed(db, cliScenario, {
    phases: cliPhases,
    validateContract: cliSkipContract ? false : undefined,
    runSnapshotCheck: cliSkipSnapshot ? false : undefined,
  }).catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
