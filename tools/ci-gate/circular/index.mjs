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
  cyan: "\x1b[36m",
};

function log(message, color = "reset") {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function checkCircularDeps(directory, label) {
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
      log(`⚠️  ${label}: Circular dependencies detected`, "yellow");
      log("\nCircular dependency chains:", "yellow");
      log(output, "dim");
      return { ok: !STRICT, hasCycles: true };
    }
  } catch (error) {
    const details = `${error.stdout || ""}\n${error.stderr || ""}`.trim();

    if (/circular dependenc/i.test(details)) {
      log(`⚠️  ${label}: Circular dependencies detected`, "yellow");
      if (VERBOSE && details) {
        log("\nCircular dependency chains:", "yellow");
        log(details, "dim");
      }
      return { ok: !STRICT, hasCycles: true };
    }

    log(`❌ ${label}: Error running madge`, "red");
    if (VERBOSE) {
      log(details || error.message, "dim");
    }
    return { ok: false, hasCycles: false };
  }
}

async function runWithConcurrency(targets, concurrency) {
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
      results[index] = checkCircularDeps(target.directory, target.label);
    }
  }

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
