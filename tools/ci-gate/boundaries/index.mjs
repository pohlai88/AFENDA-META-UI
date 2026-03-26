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
import {
  parseTurboBoundaryErrors,
  formatBoundariesIssues,
  summarizeBoundariesIssues,
  createIssue,
} from "./utils/diagnostics.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const repoRoot = join(__dirname, "..", "..", "..");

const VERBOSE = process.argv.includes("--verbose") || process.argv.includes("-v");
const STRICT = process.argv.includes("--strict");

const colors = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  dim: "\x1b[2m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  cyan: "\x1b[36m",errors, warnings) {
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
    const output = (error.stdout || error.stderr || error.message || "").toString();
    
    // Parse the error output into structured diagnostics
    const issues = parseTurboBoundaryErrors(output);
    
    if (issues.length > 0) {
      errors.push(...issues);
    } else {
      // Fallback for unparseable errors
      errors.push(
        createIssue({
          level: "error",
          category: "TURBOREPO_BOUNDARY_VIOLATION",
      `${colors.bright}${colors.blue}Boundaries CI Gate${colors.reset}`);
  log(`${colors.dim}Checking architectural boundaries...${colors.reset}`);
  
  const errors = [];
  const warnings = [];
  
  const turboPassed = checkTurboBoundaries(errors, warnings);
  
  // Display errors
  if (errors.length > 0) {
    console.log(formatBoundariesIssues(errors));
  }
  
  // Display warnings
  if (warnings.length > 0) {
    console.log(formatBoundariesIssues(warnings));
  }
  
  // Display summary
  console.log(summarizeBoundariesIssues(errors, warnings));
  
  const failed = errors.length > 0 || (STRICT && warnings.length > 0);
  
  log("\n" + `${colors.bright}${colors.blue}${"=".repeat(64)}${colors.reset}`);
  log(`${colors.bright}Summary${colors.reset}`);
  log(` - Errors: ${errors.length}`);
  log(` - Warnings: ${warnings.length}`);
  log(` - Strict mode: ${STRICT ? "enabled" : "disabled"}`);
  
  if (failed) {
    log(`\n${colors.red}Boundaries gate failed.${colors.reset}`);
    log(`\n${colors.cyan}Architectural Boundary Rules:${colors.reset}`);
    log(`  foundation (meta-types) → no internal deps`, "dim");
    log(`  data (db)              → foundation only`, "dim");
    log(`  presentation (ui)       → foundation only`, "dim");
    log(`  app-server (api)        → data + foundation`, "dim");
    log(`  app-client (web)        → presentation + foundation`, "dim");
    log(`  tooling (ci-gate)       → no internal deps`, "dim");
    log(`\n${colors.cyan}Next steps:${colors.reset}`);
    log(`  1. Apply the fix suggestions above`, "dim");
    log(`  2. Re-run ${colors.bright}node tools/ci-gate/boundaries/index.mjs${colors.reset}`, "dim");
    log(`  3. Re-run ${colors.bright}pnpm ci:gate${colors.reset}\n`, "dim");
    process.exit(1);
  }
  
  log(`\n${colors.green}✅ Boundaries gate passed${colors.reset}\n`);
  process.exit(0);onst turboPassed = checkTurboBoundaries();
  
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
