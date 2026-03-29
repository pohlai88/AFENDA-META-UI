#!/usr/bin/env node
/**
 * Truth Coverage CLI
 * ==================
 * Run truth coverage analysis and optionally enforce thresholds.
 *
 * **Usage:**
 * ```bash
 * pnpm truth-coverage               # Report only
 * pnpm truth-coverage --enforce     # Enforce thresholds (fail if not met)
 * ```
 */

import { calculateTruthCoverage, formatCoverageReport, enforceCoverageThresholds } from "./index.js";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const rootDir = path.resolve(__dirname, "../..");
const shouldEnforce = process.argv.includes("--enforce");

try {
  console.log("Analyzing truth coverage...\n");

  const metrics = calculateTruthCoverage(rootDir);
  const report = formatCoverageReport(metrics);

  console.log(report);

  if (shouldEnforce) {
    console.log("\nEnforcing coverage thresholds...");

    enforceCoverageThresholds(metrics, {
      minInvariantCoverage: 50, // 50% of invariants must have tests
      minStateMachineCoverage: 40, // 40% of state machines must have tests
      maxDirectDbWrites: 100, // Allow up to 100 direct DB writes (legacy code)
    });

    console.log("✅ Truth coverage thresholds met!");
  }

  process.exit(0);
} catch (error) {
  console.error("\n❌ Truth coverage check failed:");

  if (error instanceof Error) {
    console.error(error.message);
  } else {
    console.error(String(error));
  }

  process.exit(1);
}
