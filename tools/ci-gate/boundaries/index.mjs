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
  cyan: "\x1b[36m",
};

function log(message, color = "reset") {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function checkTurboBoundaries(errors) {
  log("\nChecking Turborepo boundaries...", "cyan");

  try {
    const output = execSync("pnpm exec turbo boundaries 2>&1", {
      cwd: repoRoot,
      encoding: "utf-8",
      stdio: "pipe",
    });

    if (VERBOSE && output.trim()) {
      log(output, "dim");
    }

    log("PASS: Turborepo boundaries", "green");
    return true;
  } catch (error) {
    const output = (error.stdout || error.stderr || error.message || "").toString();

    const issues = parseTurboBoundaryErrors(output);
    if (issues.length > 0) {
      errors.push(...issues);
    } else {
      errors.push(
        createIssue({
          level: "error",
          category: "TURBOREPO_BOUNDARY_VIOLATION",
          message: "Turborepo boundary check failed",
          explanation:
            "The boundaries check reported an error that could not be parsed into a structured violation.",
          relatedFiles: ["turbo.json", "eslint.config.boundaries.js"],
          fixes: [
            "Re-run with --verbose for detailed output",
            "Review package dependency tags and boundaries rules",
          ],
          details: output.split("\n").map((line) => line.trim()).filter(Boolean).slice(0, 20),
        })
      );
    }

    if (VERBOSE && output.trim()) {
      log(output, "dim");
    }

    log("FAIL: Turborepo boundaries", "red");
    return false;
  }
}

function main() {
  log(`\n${colors.bright}${colors.blue}Boundaries CI Gate${colors.reset}`);
  log(`${colors.dim}Checking architectural boundaries...${colors.reset}`);

  const errors = [];
  const warnings = [];

  checkTurboBoundaries(errors);

  if (errors.length > 0) {
    console.log(formatBoundariesIssues(errors));
  }
  if (warnings.length > 0) {
    console.log(formatBoundariesIssues(warnings));
  }

  console.log(summarizeBoundariesIssues(errors, warnings));

  const failed = errors.length > 0 || (STRICT && warnings.length > 0);

  log(`\n${colors.bright}${colors.blue}${"=".repeat(64)}${colors.reset}`);
  log(`${colors.bright}Summary${colors.reset}`);
  log(` - Errors: ${errors.length}`);
  log(` - Warnings: ${warnings.length}`);
  log(` - Strict mode: ${STRICT ? "enabled" : "disabled"}`);

  if (failed) {
    log(`\n${colors.red}Boundaries gate failed.${colors.reset}`);
    process.exit(1);
  }

  log(`\n${colors.green}Boundaries gate passed${colors.reset}\n`);
  process.exit(0);
}

main();
