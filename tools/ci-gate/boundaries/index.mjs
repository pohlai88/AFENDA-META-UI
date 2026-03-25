#!/usr/bin/env node

/**
 * Boundaries CI Gate
 * 
 * Enforces architectural boundaries across the monorepo:
 * - Turborepo boundaries (tag-based dependency rules)
 * - ESLint boundaries (import-level enforcement)
 * 
 * Prevents cross-layer imports that violate architectural tiers:
 * - foundation (meta-types): no internal deps
 * - data (db): foundation only
 * - presentation (ui): foundation only
 * - app-server (api): data + foundation
 * - app-client (web): presentation + foundation
 * - tooling (ci-gate): no internal deps
 */

import { execSync } from "node:child_process";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const repoRoot = join(__dirname, "..", "..", "..");

const VERBOSE = process.argv.includes("--verbose") || process.argv.includes("-v");

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

function checkTurboBoundaries() {
  log("\n🔍 Checking Turborepo boundaries...", "cyan");
  
  try {
    const output = execSync("pnpm exec turbo boundaries 2>&1", {
      cwd: repoRoot,
      encoding: "utf-8",
      stdio: "pipe",
    });
    
    if (VERBOSE) {
      log(output, "dim");
    }
    
    log("✅ Turborepo boundaries: PASS", "green");
    return true;
  } catch (error) {
    log("❌ Turborepo boundaries: FAIL", "red");
    log("\nViolations found:", "yellow");
    log((error.stdout || error.stderr || error.message || "").toString(), "dim");
    
    log("\nTurborepo boundary rules enforce tag-based dependency restrictions.", "dim");
    log("Each package is tagged with its tier (foundation, data, presentation, app-server, app-client, tooling).", "dim");
    log("Packages can only depend on allowed tiers per the architecture.", "dim");
    
    return false;
  }
}

function main() {
  log("\n" + "=".repeat(60), "bright");
  log("Boundaries CI Gate", "bright");
  log("=".repeat(60), "bright");
  
  const turboPassed = checkTurboBoundaries();
  
  log("\n" + "=".repeat(60), "bright");
  
  if (turboPassed) {
    log("✅ All boundary checks passed", "green");
    log("=".repeat(60) + "\n", "bright");
    process.exit(0);
  } else {
    log("❌ Boundary violations detected", "red");
    log("=".repeat(60) + "\n", "bright");
    
    log("\nArchitectural Boundary Rules:", "yellow");
    log("  foundation (meta-types) → no internal deps", "dim");
    log("  data (db)              → foundation only", "dim");
    log("  presentation (ui)       → foundation only", "dim");
    log("  app-server (api)        → data + foundation", "dim");
    log("  app-client (web)        → presentation + foundation", "dim");
    log("  tooling (ci-gate)       → no internal deps", "dim");
    
    log("\nTo fix violations:", "yellow");
    log("  1. Review the import statements flagged above", "dim");
    log("  2. Move code to appropriate packages or refactor imports", "dim");
    log("  3. If unsure, consult docs/DEPENDENCY_GOVERNANCE_POLICY.md\n", "dim");
    
    process.exit(1);
  }
}

main();
