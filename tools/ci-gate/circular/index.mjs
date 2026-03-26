#!/usr/bin/env node

/**
 * Circular Dependency CI Gate
 * 
 * Detects circular dependencies across the monorepo that indicate
 * architectural boundary violations or design issues.
 * 
 * Circular dependencies can cause:
 * - Build order problems
 * - Runtime initialization issues
 * - Difficulty maintaining and understanding code
 * - Hidden coupling between modules
 */

import { execSync } from "node:child_process";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";
import {
  parseCircularDependencyErrors,
  createCircularWarning,
  formatCircularIssues,
  summarizeCircularIssues,
  createIssue,
} from "./utils/diagnostics.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const repoRoot = join(__dirname, "..", "..", "..");

const VERBOSE = process.argv.includes("--verbose") || process.argv.includes("-v");
const STRICT = process.argv.includes("--strict");

function readConcurrencyArg() {
  const arg = process.argv.find((item) => item.startsWith("--concurrency="));
  if (!arg) {
    return 3;
  }

  const value = Number.parseInt(arg.split("=")[1] || "", 10);
  if (Number.isNaN(value) || value < 1) {
    return 3;
  }

  return value;
}

const CONCURRENCY = readConcurrencyArg();

const colors = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  dim: "\x1b[2m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  cyan: "\x1b[36m",, errors, warnings) {
  log(`\n🔍 Checking ${label} for circular dependencies...`, "cyan");
  
  try {
    const output = execSync(
      `pnpm exec madge --circular --extensions ts,tsx ${directory} 2>&1`,
      {
        cwd: repoRoot,
        encoding: "utf-8",
        stdio: "pipe",
      }
    );
    
    if (output.includes("No circular dependency found")) {
      log(`✅ ${label}: No circular dependencies`, "green");
      return { ok: true, hasCycles: false };
    } else {
      // Parse circular dependencies
      const parsedErrors = parseCircularDependencyErrors(output, label);
      
      if (STRICT) {
        errors.push(...parsedErrors);
      } else {
        // In non-strict mode, treat as warnings
        if (parsedErrors.length > 0) {
          warnings.push(...parsedErrors.map(e => ({ ...e, level: "warning" })));
        } else {
          warnings.push(createCircularWarning(label, output));
        }
      }
      
      log(`⚠️  ${label}: Circular dependencies detected`, "yellow");
      return { ok: !STRICT, hasCycles: true };
    }
  } catch (error) {
    const details = `${error.stdout || ""}\n${error.stderr || ""}`.trim();

    if (/circular dependenc/i.test(details)) {
      const parsedErrors = parseCircularDependencyErrors(details, label);
      
      if (STRICT) {
        errors.push(...parsedErrors);
      } else {
        if (parsedErrors.length > 0) {
          warnings.push(...parsedErrors.map(e => ({ ...e, level: "warning" })));
        } else {
          warnings.push(createCircularWarning(label, details));
        }
      }
      , errors, warnings) {
  const results = new Array(targets.length);
  let nextIndex = 0;

  async function worker() {
    while (true) {
      const index = nextIndex;
      nextIndex += 1;
      if (index >= targets.length) {
        return;
      }

      const target = targets[index];
      results[index] = checkCircularDeps(target.directory, target.label, errors, warnings
          "Ensure madge is installed: pnpm add -D madge",
          "Check that the directory path exists",
          "Review madge error output below",
        ],
        details: details ? details.split("\n").slice(0, 10) : [error.message],
      })
    );
    
    log(`❌ ${label}: Error running madge`, "red"); }
      `${colors.bright}${colors.blue}Circular Dependency CI Gate${colors.reset}`);
  log(`${colors.dim}Checking for circular dependencies (concurrency: ${CONCURRENCY})...${colors.reset}`);
  
  const errors = [];
  const warnings = [];
  
  const targets = [
    { directory: "packages/meta-types/src", label: "meta-types" },
    { directory: "packages/db/src", label: "db" },
    { directory: "packages/ui/src", label: "ui" },
    { directory: "apps/api/src", label: "api" },
    { directory: "apps/web/src", label: "web" },
  ];

  const results = await runWithConcurrency(targets, CONCURRENCY, errors, warnings);
  
  // Display errors
  if (errors.length > 0) {
    console.log(formatCircularIssues(errors));
  }
  
  // Display warnings
  if (warnings.length > 0) {
    console.log(formatCircularIssues(warnings));
  }
  
  // Display summary
  console.log(summarizeCircularIssues(errors, warnings));
  
  const hasCycles = results.some((r) => r.hasCycles);
  const hasErrors = results.some((r) => !r.ok && !r.hasCycles);
  const failed = errors.length > 0 || (STRICT && warnings.length > 0);

  log("\n" + `${colors.bright}${colors.blue}${"=".repeat(64)}${colors.reset}`);
  log(`${colors.bright}Summary${colors.reset}`);
  log(` - Errors: ${errors.length}`);
  log(` - Warnings: ${warnings.length}`);
  log(` - Strict mode: ${STRICT ? "enabled" : "disabled"}`);

  if (failed) {
    log(`\n${colors.red}Circular dependency gate failed.${colors.reset}`);
    log(`\n${colors.cyan}Next steps:${colors.reset}`);
    log(`  1. Apply the fix suggestions above`, "dim");
    log(`  2. Re-run ${colors.bright}node tools/ci-gate/circular/index.mjs${colors.reset}`, "dim");
    log(`  3. Re-run ${colors.bright}pnpm ci:gate${colors.reset}\n`, "dim");
    process.exit(1);
  } else if (hasCycles && !STRICT) {
    log(`\n${colors.yellow}⚠️  Circular dependencies detected (non-blocking mode)${colors.reset}`);
    log(`Run with --strict to fail on cycles.`, "dim");
    log(`${colors.green}✅ Gate passed (warnings only)${colors.reset}\n`);
    process.exit(0);
  } else {
    log(`\n${colors.green}✅ Circular dependency gate passed${colors.reset}\n`);
    process.exit(0);
  }
}

main(

  const workerCount = Math.min(Math.max(concurrency, 1), targets.length);
  await Promise.all(Array.from({ length: workerCount }, () => worker()));
  return results;
}

async function main() {
  log("\n" + "=".repeat(60), "bright");
  log("Circular Dependency CI Gate", "bright");
  log("=".repeat(60), "bright");
  log(`Running with concurrency: ${CONCURRENCY}`, "dim");
  
  const targets = [
    { directory: "packages/meta-types/src", label: "meta-types" },
    { directory: "packages/db/src", label: "db" },
    { directory: "packages/ui/src", label: "ui" },
    { directory: "apps/api/src", label: "api" },
    { directory: "apps/web/src", label: "web" },
  ];

  const results = await runWithConcurrency(targets, CONCURRENCY);
  
  log("\n" + "=".repeat(60), "bright");
  
  const hasCycles = results.some((r) => r.hasCycles);
  const hasErrors = results.some((r) => !r.ok && !r.hasCycles);

  if (!hasCycles && !hasErrors) {
    log("✅ No circular dependencies detected", "green");
    log("=".repeat(60) + "\n", "bright");
    process.exit(0);
  } else if (hasCycles && !STRICT && !hasErrors) {
    log("⚠️  Circular dependencies detected (non-blocking mode)", "yellow");
    log("Run with --strict to fail on cycles.", "dim");
    log("=".repeat(60) + "\n", "bright");
    process.exit(0);
  } else {
    log("❌ Circular dependency gate failed", "red");
    log("=".repeat(60) + "\n", "bright");
    
    log("\nCircular dependencies indicate architectural issues:", "yellow");
    log("  • Modules that depend on each other create tight coupling", "dim");
    log("  • Can cause build order problems and initialization issues", "dim");
    log("  • Makes code harder to understand and maintain", "dim");
    
    log("\nTo resolve circular dependencies:", "yellow");
    log("  1. Extract shared code into a common module", "dim");
    log("  2. Use dependency inversion (interfaces/abstractions)", "dim");
    log("  3. Refactor to establish clear dependency direction", "dim");
    log("  4. Consider if files are in the wrong package\n", "dim");
    
    process.exit(1);
  }
}

main().catch((error) => {
  log(`Fatal error: ${error.message || String(error)}`, "red");
  process.exit(1);
});
