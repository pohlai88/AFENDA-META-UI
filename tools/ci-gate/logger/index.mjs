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
import { reportResults } from "./utils/error-reporter.mjs";

const CHECKS = [
  { name: "No Console Usage", fn: noConsoleUsage },
  { name: "Proper Imports", fn: properImports },
  { name: "req.log Usage", fn: reqLogUsage },
  { name: "Message Format", fn: messageFormat },
];

async function main() {
  const fix = process.argv.includes("--fix");
  const results = [];

  console.log("🔍 Running logger CI gate checks...\n");

  for (const check of CHECKS) {
    console.log(`Running: ${check.name}`);
    const result = await check.fn({ fix });
    results.push({ name: check.name, ...result });
  }

  console.log("\n" + "=".repeat(60) + "\n");

  const totalErrors = reportResults(results);

  if (totalErrors > 0) {
    console.log(`\n❌ CI gate failed with ${totalErrors} error(s)`);
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
