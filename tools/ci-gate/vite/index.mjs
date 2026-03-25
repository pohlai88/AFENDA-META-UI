#!/usr/bin/env node
/**
 * Vite Performance & Configuration CI Gate
 * =========================================
 * Validates Vite build configuration and performance against industry best practices.
 * 
 * Based on:
 *  - https://vite.dev/guide/build
 *  - https://vite.dev/guide/performance
 *  - https://vite.dev/config/
 *  - .agents/skills/vite-industry-quality/SKILL.md
 *
 * Checks:
 *  • Build performance (time, plugin costs)
 *  • Environment variable security (no VITE_* secrets)
 *  • Configuration quality (manifest, base, target)
 *  • Asset optimization (sizes, formats)
 *  • Plugin health (filters, ordering)
 *  • Dev dependencies in production bundle
 *
 * Usage:
 *   node tools/ci-gate/vite/index.mjs [--fix] [--verbose]
 *   pnpm ci:gate:vite
 *
 * Exit codes:
 *   0 - all checks passed
 *   1 - validation errors found
 */

import { fileURLToPath, pathToFileURL } from "node:url";
import { dirname, join } from "node:path";
import { existsSync } from "node:fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ANSI color codes
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

// Check modules
const checkModules = [
  { name: "Build Performance", path: "./checks/build-performance.mjs" },
  { name: "Environment Security", path: "./checks/env-security.mjs" },
  { name: "Configuration Quality", path: "./checks/config-quality.mjs" },
  { name: "Asset Optimization", path: "./checks/asset-optimization.mjs" },
  { name: "Plugin Health", path: "./checks/plugin-health.mjs" },
];

/**
 * Load check modules dynamically
 */
async function loadChecks() {
  const checks = [];
  
  for (const module of checkModules) {
    try {
      const modulePath = join(__dirname, module.path);
      if (!existsSync(modulePath)) {
        console.warn(`${colors.yellow}⚠${colors.reset} Check module not found: ${module.name}`);
        continue;
      }
      
      const checkModule = await import(pathToFileURL(modulePath).href);
      checks.push({
        name: module.name,
        fn: checkModule.default || checkModule.check,
      });
    } catch (error) {
      console.error(`${colors.red}✖${colors.reset} Failed to load ${module.name}:`, error.message);
    }
  }
  
  return checks;
}

/**
 * Report results
 */
function reportResults(results) {
  const allErrors = [];
  const allWarnings = [];
  
  for (const result of results) {
    if (result.errors && result.errors.length > 0) {
      console.log(`\n${colors.red}${colors.bright}✖ ${result.name} (${result.errors.length} error(s))${colors.reset}`);
      for (const error of result.errors) {
        console.log(`  ${colors.red}✖${colors.reset} ${error.message}`);
        if (error.file) {
          console.log(`    ${colors.dim}${error.file}${colors.reset}`);
        }
        if (error.suggestion) {
          console.log(`    ${colors.cyan}→${colors.reset} ${error.suggestion}`);
        }
      }
      allErrors.push(...result.errors);
    }
    
    if (result.warnings && result.warnings.length > 0) {
      console.log(`\n${colors.yellow}${colors.bright}⚠ ${result.name} (${result.warnings.length} warning(s))${colors.reset}`);
      for (const warning of result.warnings) {
        console.log(`  ${colors.yellow}⚠${colors.reset} ${warning.message}`);
        if (warning.file) {
          console.log(`    ${colors.dim}${warning.file}${colors.reset}`);
        }
        if (warning.suggestion) {
          console.log(`    ${colors.cyan}→${colors.reset} ${warning.suggestion}`);
        }
      }
      allWarnings.push(...result.warnings);
    }
    
    if ((!result.errors || result.errors.length === 0) && 
        (!result.warnings || result.warnings.length === 0)) {
      console.log(`${colors.green}✓${colors.reset} ${result.name}`);
    }
  }
  
  return allErrors.length;
}

/**
 * Main execution
 */
async function main() {
  const args = process.argv.slice(2);
  const options = {
    fix: args.includes("--fix"),
    verbose: args.includes("--verbose") || args.includes("-v"),
  };
  
  console.log(`${colors.bright}Vite Performance & Configuration CI Gate${colors.reset}`);
  console.log("=".repeat(70));
  console.log();
  
  // Load check modules
  const checks = await loadChecks();
  
  if (checks.length === 0) {
    console.error(`${colors.red}✖ No check modules loaded${colors.reset}`);
    process.exit(1);
  }
  
  // Run checks
  const results = [];
  for (const check of checks) {
    if (options.verbose) {
      console.log(`${colors.blue}ℹ${colors.reset} Running: ${check.name}...`);
    }
    
    try {
      const result = await check.fn(options);
      results.push({
        name: check.name,
        ...result,
      });
    } catch (error) {
      console.error(`${colors.red}✖${colors.reset} ${check.name} failed:`, error.message);
      results.push({
        name: check.name,
        errors: [{
          message: `Check crashed: ${error.message}`,
          file: error.stack,
        }],
        warnings: [],
      });
    }
  }
  
  console.log("\n" + "=".repeat(70));
  
  // Report results
  const errorCount = reportResults(results);
  
  if (errorCount > 0) {
    console.log(`\n${colors.red}✖ Vite CI gate failed with ${errorCount} error(s)${colors.reset}`);
    console.log("\nNext steps:");
    console.log("  1. Review the errors above");
    console.log("  2. Fix the issues in vite.config.ts or related files");
    console.log("  3. Re-run: pnpm ci:gate:vite");
    console.log("  4. See docs: docs/QUICK_REFERENCE_BUNDLE.md");
    process.exit(1);
  } else {
    console.log(`\n${colors.green}✓ All Vite CI gate checks passed!${colors.reset}`);
    process.exit(0);
  }
}

main().catch((err) => {
  console.error(`${colors.red}Fatal error:${colors.reset}`, err);
  process.exit(1);
});
