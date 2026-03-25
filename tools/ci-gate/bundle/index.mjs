#!/usr/bin/env node
/**
 * Bundle CI Gate
 * ==============
 * Validates bundle size and performance budgets to prevent regressions.
 * 
 * Features:
 *  • Total bundle size budget enforcement
 *  • Per-chunk size limits (vendor chunks, main entry)
 *  • Chunk count monitoring (prevents over-fragmentation)
 *  • Asset size tracking (CSS, images, fonts)
 *  • Baseline comparison for PRs
 *  • Auto-update baseline on merge to main
 * 
 * Industry best practice: Vite build performance monitoring
 * Reference: https://vite.dev/guide/build
 *
 * Usage:
 *   node tools/ci-gate/bundle/index.mjs                 # Validate against baseline
 *   node tools/ci-gate/bundle/index.mjs --update        # Update baseline
 *   node tools/ci-gate/bundle/index.mjs --report        # Generate report only
 *   pnpm ci:gate:bundle                                 # Via package.json script
 *
 * Exit codes:
 *   0 - all checks passed
 *   1 - validation errors found (budget exceeded)
 *   2 - build failed or manifest missing
 */

import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { existsSync, readFileSync, writeFileSync, statSync } from "node:fs";
import { execSync } from "node:child_process";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const WORKSPACE_ROOT = join(__dirname, "../../..");
const WEB_APP_ROOT = join(WORKSPACE_ROOT, "apps/web");
const DIST_DIR = join(WEB_APP_ROOT, "dist");
const BASELINE_FILE = join(__dirname, "baseline.json");

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
  magenta: "\x1b[35m",
};

// Performance budgets (in KB)
const BUDGETS = {
  totalJS: 1300, // Total JS bundle size (compressed)
  totalCSS: 100, // Total CSS size (compressed)
  mainEntry: 300, // Main entry chunk
  vendorChunk: 550, // Any single vendor chunk
  asyncChunk: 150, // Any async chunk
  maxChunks: 40, // Maximum number of chunks (prevents over-fragmentation)
  assets: 500, // Total assets (images, fonts, etc.)
};

// Regression thresholds (percentage increase allowed)
const THRESHOLDS = {
  totalJS: 10, // 10% increase in total JS
  totalCSS: 15, // 15% increase in CSS
  chunkCount: 20, // 20% increase in chunk count
};

/**
 * Build the web app if dist doesn't exist
 */
function ensureBuild() {
  if (!existsSync(DIST_DIR)) {
    console.log(`${colors.blue}ℹ${colors.reset} Building web app...`);
    try {
      execSync("pnpm --filter web build", {
        cwd: WORKSPACE_ROOT,
        stdio: "inherit",
      });
    } catch (error) {
      console.error(`${colors.red}✖${colors.reset} Build failed`);
      process.exit(2);
    }
  }
}

/**
 * Parse manifest.json and calculate bundle metrics
 */
function analyzeBundleStats() {
  const manifestPath = join(DIST_DIR, ".vite/manifest.json");
  
  if (!existsSync(manifestPath)) {
    console.error(`${colors.red}✖${colors.reset} Manifest not found: ${manifestPath}`);
    console.error(`  Ensure vite.config.ts has: build.manifest: true`);
    process.exit(2);
  }

  const manifest = JSON.parse(readFileSync(manifestPath, "utf-8"));
  
  const stats = {
    totalJS: 0,
    totalCSS: 0,
    totalAssets: 0,
    chunks: [],
    cssFiles: [],
    assets: [],
    chunkCount: 0,
    timestamp: new Date().toISOString(),
  };

  // Analyze each entry in manifest
  for (const [key, entry] of Object.entries(manifest)) {
    const filePath = join(DIST_DIR, entry.file);
    
    if (!existsSync(filePath)) {
      console.warn(`${colors.yellow}⚠${colors.reset} File not found: ${filePath}`);
      continue;
    }

    const fileSize = statSync(filePath).size;
    const fileSizeKB = (fileSize / 1024).toFixed(2);

    if (entry.file.endsWith(".js")) {
      stats.totalJS += fileSize;
      stats.chunkCount++;
      stats.chunks.push({
        name: entry.file,
        size: fileSize,
        sizeKB: parseFloat(fileSizeKB),
        isEntry: entry.isEntry || false,
        isDynamic: entry.isDynamicEntry || false,
      });
    } else if (entry.file.endsWith(".css")) {
      stats.totalCSS += fileSize;
      stats.cssFiles.push({
        name: entry.file,
        size: fileSize,
        sizeKB: parseFloat(fileSizeKB),
      });
    } else {
      stats.totalAssets += fileSize;
      stats.assets.push({
        name: entry.file,
        size: fileSize,
        sizeKB: parseFloat(fileSizeKB),
      });
    }
  }

  // Convert totals to KB
  stats.totalJS = (stats.totalJS / 1024).toFixed(2);
  stats.totalCSS = (stats.totalCSS / 1024).toFixed(2);
  stats.totalAssets = (stats.totalAssets / 1024).toFixed(2);

  return stats;
}

/**
 * Load baseline for comparison
 */
function loadBaseline() {
  if (!existsSync(BASELINE_FILE)) {
    return null;
  }
  try {
    return JSON.parse(readFileSync(BASELINE_FILE, "utf-8"));
  } catch (error) {
    console.warn(`${colors.yellow}⚠${colors.reset} Failed to parse baseline: ${error.message}`);
    return null;
  }
}

/**
 * Save current stats as baseline
 */
function saveBaseline(stats) {
  writeFileSync(BASELINE_FILE, JSON.stringify(stats, null, 2), "utf-8");
  console.log(`${colors.green}✓${colors.reset} Baseline updated: ${BASELINE_FILE}`);
}

/**
 * Format bytes to human-readable size
 */
function formatSize(kb) {
  const num = parseFloat(kb);
  if (num < 1) return `${(num * 1024).toFixed(0)} B`;
  if (num < 1024) return `${num.toFixed(2)} KB`;
  return `${(num / 1024).toFixed(2)} MB`;
}

/**
 * Format percentage change
 */
function formatChange(current, baseline) {
  if (baseline === 0) {
    if (current === 0) {
      return `${colors.dim}0.0%${colors.reset}`;
    }
    return `${colors.yellow}n/a${colors.reset}`;
  }

  const change = ((current - baseline) / baseline) * 100;
  const sign = change > 0 ? "+" : "";
  const color = change > 0 ? colors.red : colors.green;
  return `${color}${sign}${change.toFixed(1)}%${colors.reset}`;
}

function getPercentChange(current, baseline) {
  if (baseline === 0) {
    return null;
  }

  return ((current - baseline) / baseline) * 100;
}

/**
 * Validate against budgets
 */
function validateBudgets(stats) {
  const errors = [];
  const warnings = [];

  // Check total JS budget
  if (parseFloat(stats.totalJS) > BUDGETS.totalJS) {
    errors.push({
      category: "TOTAL_JS_EXCEEDED",
      message: `Total JS size ${formatSize(stats.totalJS)} exceeds budget ${formatSize(BUDGETS.totalJS)}`,
      actual: stats.totalJS,
      budget: BUDGETS.totalJS,
    });
  }

  // Check total CSS budget
  if (parseFloat(stats.totalCSS) > BUDGETS.totalCSS) {
    errors.push({
      category: "TOTAL_CSS_EXCEEDED",
      message: `Total CSS size ${formatSize(stats.totalCSS)} exceeds budget ${formatSize(BUDGETS.totalCSS)}`,
      actual: stats.totalCSS,
      budget: BUDGETS.totalCSS,
    });
  }

  // Check chunk count
  if (stats.chunkCount > BUDGETS.maxChunks) {
    warnings.push({
      category: "CHUNK_COUNT_HIGH",
      message: `Chunk count ${stats.chunkCount} exceeds recommended limit ${BUDGETS.maxChunks}`,
      actual: stats.chunkCount,
      budget: BUDGETS.maxChunks,
    });
  }

  // Check individual chunks
  for (const chunk of stats.chunks) {
    if (chunk.isEntry && chunk.sizeKB > BUDGETS.mainEntry) {
      errors.push({
        category: "ENTRY_CHUNK_EXCEEDED",
        message: `Entry chunk ${chunk.name} (${formatSize(chunk.sizeKB)}) exceeds budget ${formatSize(BUDGETS.mainEntry)}`,
        file: chunk.name,
        actual: chunk.sizeKB,
        budget: BUDGETS.mainEntry,
      });
    } else if (!chunk.isEntry && chunk.name.includes("vendor") && chunk.sizeKB > BUDGETS.vendorChunk) {
      errors.push({
        category: "VENDOR_CHUNK_EXCEEDED",
        message: `Vendor chunk ${chunk.name} (${formatSize(chunk.sizeKB)}) exceeds budget ${formatSize(BUDGETS.vendorChunk)}`,
        file: chunk.name,
        actual: chunk.sizeKB,
        budget: BUDGETS.vendorChunk,
      });
    } else if (chunk.isDynamic && chunk.sizeKB > BUDGETS.asyncChunk) {
      warnings.push({
        category: "ASYNC_CHUNK_LARGE",
        message: `Async chunk ${chunk.name} (${formatSize(chunk.sizeKB)}) exceeds recommended size ${formatSize(BUDGETS.asyncChunk)}`,
        file: chunk.name,
        actual: chunk.sizeKB,
        budget: BUDGETS.asyncChunk,
      });
    }
  }

  return { errors, warnings };
}

/**
 * Compare against baseline for regressions
 */
function compareBaseline(current, baseline) {
  if (!baseline) {
    return { errors: [], warnings: [], info: ["No baseline found - run with --update to create one"] };
  }

  const errors = [];
  const warnings = [];
  const info = [];

  // Check total JS regression
  const baselineJS = parseFloat(baseline.totalJS);
  const currentJS = parseFloat(current.totalJS);
  const jsChange = getPercentChange(currentJS, baselineJS);

  if (jsChange !== null && jsChange > THRESHOLDS.totalJS) {
    errors.push({
      category: "JS_SIZE_REGRESSION",
      message: `Total JS increased by ${jsChange.toFixed(1)}% (threshold: ${THRESHOLDS.totalJS}%)`,
      current: current.totalJS,
      baseline: baseline.totalJS,
      change: jsChange,
    });
  } else if (jsChange !== null && jsChange > 0) {
    info.push(`Total JS: ${formatSize(baseline.totalJS)} → ${formatSize(current.totalJS)} ${formatChange(current.totalJS, baseline.totalJS)}`);
  } else if (jsChange === null && currentJS > 0) {
    info.push(`Total JS baseline is uninitialized (0). Run with --update to establish a baseline.`);
  }

  // Check CSS regression
  const baselineCSS = parseFloat(baseline.totalCSS);
  const currentCSS = parseFloat(current.totalCSS);
  const cssChange = getPercentChange(currentCSS, baselineCSS);

  if (cssChange !== null && cssChange > THRESHOLDS.totalCSS) {
    warnings.push({
      category: "CSS_SIZE_REGRESSION",
      message: `Total CSS increased by ${cssChange.toFixed(1)}% (threshold: ${THRESHOLDS.totalCSS}%)`,
      current: current.totalCSS,
      baseline: baseline.totalCSS,
      change: cssChange,
    });
  } else if (cssChange !== null && cssChange > 0) {
    info.push(`Total CSS: ${formatSize(baseline.totalCSS)} → ${formatSize(current.totalCSS)} ${formatChange(current.totalCSS, baseline.totalCSS)}`);
  } else if (cssChange === null && currentCSS > 0) {
    info.push(`Total CSS baseline is uninitialized (0). Run with --update to establish a baseline.`);
  }

  // Check chunk count regression
  const chunkChange = getPercentChange(current.chunkCount, baseline.chunkCount);
  if (chunkChange !== null && chunkChange > THRESHOLDS.chunkCount) {
    warnings.push({
      category: "CHUNK_COUNT_REGRESSION",
      message: `Chunk count increased by ${chunkChange.toFixed(1)}% (threshold: ${THRESHOLDS.chunkCount}%)`,
      current: current.chunkCount,
      baseline: baseline.chunkCount,
      change: chunkChange,
    });
  } else if (chunkChange === null && current.chunkCount > 0) {
    info.push(`Chunk-count baseline is uninitialized (0). Run with --update to establish a baseline.`);
  }

  return { errors, warnings, info };
}

/**
 * Print detailed report
 */
function printReport(stats, baseline) {
  console.log(`\n${colors.bright}Bundle Analysis Report${colors.reset}`);
  console.log("=".repeat(70));

  // Summary
  console.log(`\n${colors.cyan}Summary${colors.reset}`);
  console.log(`  Total JS:     ${formatSize(stats.totalJS)} / ${formatSize(BUDGETS.totalJS)}`);
  console.log(`  Total CSS:    ${formatSize(stats.totalCSS)} / ${formatSize(BUDGETS.totalCSS)}`);
  console.log(`  Total Assets: ${formatSize(stats.totalAssets)} / ${formatSize(BUDGETS.assets)}`);
  console.log(`  Chunks:       ${stats.chunkCount} / ${BUDGETS.maxChunks}`);

  if (baseline) {
    console.log(`\n${colors.cyan}Changes from Baseline${colors.reset}`);
    console.log(`  JS:     ${formatSize(baseline.totalJS)} → ${formatSize(stats.totalJS)} ${formatChange(stats.totalJS, baseline.totalJS)}`);
    console.log(`  CSS:    ${formatSize(baseline.totalCSS)} → ${formatSize(stats.totalCSS)} ${formatChange(stats.totalCSS, baseline.totalCSS)}`);
    console.log(`  Chunks: ${baseline.chunkCount} → ${stats.chunkCount} (${stats.chunkCount - baseline.chunkCount > 0 ? '+' : ''}${stats.chunkCount - baseline.chunkCount})`);
  }

  // Top 5 largest chunks
  console.log(`\n${colors.cyan}Largest Chunks${colors.reset}`);
  const topChunks = [...stats.chunks].sort((a, b) => b.sizeKB - a.sizeKB).slice(0, 5);
  for (const chunk of topChunks) {
    const tag = chunk.isEntry ? "[entry]" : chunk.isDynamic ? "[async]" : "[vendor]";
    console.log(`  ${formatSize(chunk.sizeKB).padEnd(12)} ${colors.dim}${tag.padEnd(8)}${colors.reset} ${chunk.name}`);
  }

  console.log("\n" + "=".repeat(70));
}

/**
 * Print validation results
 */
function printResults(budgetResults, baselineResults) {
  const allErrors = [...budgetResults.errors, ...baselineResults.errors];
  const allWarnings = [...budgetResults.warnings, ...baselineResults.warnings];

  if (allErrors.length > 0) {
    console.log(`\n${colors.red}${colors.bright}✖ Errors (${allErrors.length})${colors.reset}`);
    for (const error of allErrors) {
      console.log(`  ${colors.red}✖${colors.reset} ${error.message}`);
      if (error.file) {
        console.log(`    ${colors.dim}File: ${error.file}${colors.reset}`);
      }
    }
  }

  if (allWarnings.length > 0) {
    console.log(`\n${colors.yellow}${colors.bright}⚠ Warnings (${allWarnings.length})${colors.reset}`);
    for (const warning of allWarnings) {
      console.log(`  ${colors.yellow}⚠${colors.reset} ${warning.message}`);
      if (warning.file) {
        console.log(`    ${colors.dim}File: ${warning.file}${colors.reset}`);
      }
    }
  }

  if (baselineResults.info && baselineResults.info.length > 0) {
    console.log(`\n${colors.blue}${colors.bright}ℹ Info${colors.reset}`);
    for (const info of baselineResults.info) {
      console.log(`  ${colors.blue}ℹ${colors.reset} ${info}`);
    }
  }

  return allErrors.length;
}

/**
 * Main execution
 */
async function main() {
  const args = process.argv.slice(2);
  const isUpdate = args.includes("--update");
  const isReport = args.includes("--report");

  console.log(`${colors.bright}Bundle CI Gate${colors.reset}`);
  console.log("=".repeat(70));

  // Ensure build exists
  ensureBuild();

  // Analyze current bundle
  console.log(`${colors.blue}ℹ${colors.reset} Analyzing bundle...`);
  const currentStats = analyzeBundleStats();

  // Load baseline
  const baseline = loadBaseline();

  // Print report
  printReport(currentStats, baseline);

  if (isReport) {
    process.exit(0);
  }

  if (isUpdate) {
    saveBaseline(currentStats);
    console.log(`\n${colors.green}✓${colors.reset} Baseline updated successfully`);
    process.exit(0);
  }

  // Validate
  console.log(`\n${colors.blue}ℹ${colors.reset} Validating against budgets...`);
  const budgetResults = validateBudgets(currentStats);
  const baselineResults = compareBaseline(currentStats, baseline);

  const errorCount = printResults(budgetResults, baselineResults);

  if (errorCount > 0) {
    console.log(`\n${colors.red}✖ Bundle CI gate failed with ${errorCount} error(s)${colors.reset}`);
    console.log("\nNext steps:");
    console.log("  1. Review bundle composition: pnpm --filter web analyze");
    console.log("  2. Optimize imports and code splitting");
    console.log("  3. Update baseline if changes are intentional: pnpm ci:gate:bundle --update");
    process.exit(1);
  } else {
    console.log(`\n${colors.green}✓ All bundle CI gate checks passed!${colors.reset}`);
    process.exit(0);
  }
}

main().catch((err) => {
  console.error(`${colors.red}Fatal error:${colors.reset}`, err);
  process.exit(2);
});
