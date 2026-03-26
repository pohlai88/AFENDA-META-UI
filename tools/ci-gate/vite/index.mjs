#!/usr/bin/env node
/**
 * Vite Performance & Configuration CI Gate
 */

import { fileURLToPath, pathToFileURL } from "node:url";
import { dirname, join } from "node:path";
import { existsSync } from "node:fs";
import {
  convertCheckResult,
  formatViteIssues,
  summarizeViteIssues,
} from "./utils/diagnostics.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const colors = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  dim: "\x1b[2m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
};

const checkModules = [
  { name: "Build Performance", path: "./checks/build-performance.mjs" },
  { name: "Environment Security", path: "./checks/env-security.mjs" },
  { name: "Configuration Quality", path: "./checks/config-quality.mjs" },
  { name: "Asset Optimization", path: "./checks/asset-optimization.mjs" },
  { name: "Plugin Health", path: "./checks/plugin-health.mjs" },
];

async function loadChecks() {
  const checks = [];

  for (const module of checkModules) {
    const modulePath = join(__dirname, module.path);
    if (!existsSync(modulePath)) {
      console.warn(`${colors.yellow}!${colors.reset} Missing check module: ${module.name}`);
      continue;
    }

    try {
      const checkModule = await import(pathToFileURL(modulePath).href);
      const checkFn = checkModule.default || checkModule.check;
      if (typeof checkFn !== "function") {
        console.warn(`${colors.yellow}!${colors.reset} Invalid check export: ${module.name}`);
        continue;
      }

      checks.push({ name: module.name, fn: checkFn });
    } catch (error) {
      console.error(`${colors.red}x${colors.reset} Failed to load ${module.name}: ${error.message}`);
    }
  }

  return checks;
}

function reportResults(results) {
  const allErrors = [];
  const allWarnings = [];

  for (const result of results) {
    const { errors, warnings } = convertCheckResult(result.name, result);
    allErrors.push(...errors);
    allWarnings.push(...warnings);
  }

  if (allErrors.length > 0) {
    console.log(formatViteIssues(allErrors));
  }
  if (allWarnings.length > 0) {
    console.log(formatViteIssues(allWarnings));
  }

  console.log(summarizeViteIssues(allErrors, allWarnings));
  return allErrors.length;
}

async function main() {
  const args = process.argv.slice(2);
  const options = {
    fix: args.includes("--fix"),
    verbose: args.includes("--verbose") || args.includes("-v"),
  };

  console.log(`${colors.bright}Vite Performance & Configuration CI Gate${colors.reset}`);
  console.log("=".repeat(70));

  const checks = await loadChecks();
  if (checks.length === 0) {
    console.error(`${colors.red}x No check modules loaded${colors.reset}`);
    process.exit(1);
  }

  const results = [];
  for (const check of checks) {
    if (options.verbose) {
      console.log(`${colors.blue}i${colors.reset} Running: ${check.name}`);
    }

    try {
      const output = await check.fn(options);
      results.push({
        name: check.name,
        errors: output?.errors ?? [],
        warnings: output?.warnings ?? [],
      });
    } catch (error) {
      results.push({
        name: check.name,
        errors: [
          {
            message: `Check crashed: ${error.message}`,
            details: [String(error.stack || "")],
          },
        ],
        warnings: [],
      });
    }
  }

  console.log("\n" + "=".repeat(70));
  const errorCount = reportResults(results);

  if (errorCount > 0) {
    console.log(`\n${colors.red}x Vite CI gate failed with ${errorCount} error(s)${colors.reset}`);
    process.exit(1);
  }

  console.log(`\n${colors.green}Vite gate passed${colors.reset}`);
  process.exit(0);
}

main().catch((error) => {
  console.error(`${colors.red}Fatal error:${colors.reset}`, error);
  process.exit(1);
});
