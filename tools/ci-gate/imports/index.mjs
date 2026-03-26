#!/usr/bin/env node
/**
 * Imports CI Gate
 * ===============
 * Validates import consistency patterns across the codebase to ensure:
 *  • Consistent Decimal.js imports (named import pattern)
 *  • No mixing of default/named imports for same library
 *
 * Usage:
 *   node tools/ci-gate/imports/index.mjs [--fix]
 *   pnpm ci:imports
 *
 * Exit codes:
 *   0 - all checks passed
 *   1 - validation errors found
 */

import { decimalConsistency } from "./checks/decimal-consistency.mjs";
import { reportResults } from "../logger/utils/error-reporter.mjs";

const CHECKS = [
  { name: "Decimal.js Import Consistency", fn: decimalConsistency },
];

async function main() {
  const fix = process.argv.includes("--fix");
  const verbose = process.argv.includes("--verbose") || process.argv.includes("-v");
  const results = [];

  console.log("🔍 Running imports CI gate checks...\n");

  for (const check of CHECKS) {
    console.log(`Running: ${check.name}`);
    const result = await check.fn({ fix });
    if (verbose) {
      console.log(`  ↳ ${check.name} completed: ${result.errors?.length || 0} error(s), ${result.warnings?.length || 0} warning(s)`);
    }
    results.push({ name: check.name, ...result });
  }

  console.log("\n" + "=".repeat(60) + "\n");

  const totalErrors = reportResults(results);

  if (totalErrors > 0) {
    console.log(`\n❌ CI gate failed with ${totalErrors} error(s)`);
    console.log("\nNext steps:");
    console.log("  1. Fix the locations listed above");
    console.log("  2. Re-run: pnpm ci:imports");
    console.log("  3. Re-run full gate: pnpm ci:gate");
    process.exit(1);
  } else {
    console.log("\n✅ All imports CI gate checks passed!");
    process.exit(0);
  }
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
