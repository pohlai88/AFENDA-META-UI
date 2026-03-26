#!/usr/bin/env node
/**
 * Logger CI Gate
 * ==============
 * Validates logger usage patterns across the codebase to ensure:
 *  • No console.log/error/warn usage (should use Pino logger)
 *  • No Winston imports (deprecated)
 *  • Proper req.log usage in request handlers
 *  • Correct Pino API signature (object first, message second)
 *  • PII redaction patterns are followed
 *
 * Usage:
 *   node tools/ci-gate/logger/index.mjs [--fix]
 *   pnpm ci:logger
 *
 * Exit codes:
 *   0 - all checks passed
 *   1 - validation errors found
 */

import { noConsoleUsage } from "./checks/no-console-usage.mjs";
import { properImports } from "./checks/proper-imports.mjs";
import { reqLogUsage } from "./checks/req-log-usage.mjs";
import { messageFormat } from "./checks/message-format.mjs";
import { childLoggerBindings } from "./checks/child-logger-bindings.mjs";
import { stringInterpolation } from "./checks/string-interpolation.mjs";
import { errorSerialization } from "./checks/error-serialization.mjs";
import { serializerUsage } from "./checks/serializer-usage.mjs";
import { reportResults } from "./utils/error-reporter.mjs";

const CHECKS = [
  { name: "No Console Usage", fn: noConsoleUsage },
  { name: "Proper Imports", fn: properImports },
  { name: "req.log Usage", fn: reqLogUsage },
  { name: "Message Format", fn: messageFormat },
  { name: "Child Logger Bindings", fn: childLoggerBindings },
  { name: "String Interpolation", fn: stringInterpolation },
  { name: "Error Serialization", fn: errorSerialization },
  { name: "Serializer Usage", fn: serializerUsage },
];

async function main() {
  const fix = process.argv.includes("--fix");
  const verbose = process.argv.includes("--verbose") || process.argv.includes("-v");
  const results = [];

  console.log("🔍 Running logger CI gate checks...\n");

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
    console.log("  2. Re-run: pnpm ci:logger");
    console.log("  3. Re-run full gate: pnpm ci:gate");
    process.exit(1);
  } else {
    console.log("\n✅ All logger CI gate checks passed!");
    process.exit(0);
  }
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
