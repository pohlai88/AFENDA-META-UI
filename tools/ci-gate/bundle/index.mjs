#!/usr/bin/env node
/**
 * Bundle CI Gate
 *
 * Validates bundle size and regression budgets.
 */

import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { existsSync, readFileSync, writeFileSync, statSync } from "node:fs";
import { execSync } from "node:child_process";
import {
  convertBudgetErrors,
  convertBudgetWarnings,
  convertBaselineErrors,
  formatBundleIssues,
  summarizeBundleIssues,
} from "./utils/diagnostics.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const WORKSPACE_ROOT = join(__dirname, "../../..");
const WEB_APP_ROOT = join(WORKSPACE_ROOT, "apps/web");
const DIST_DIR = join(WEB_APP_ROOT, "dist");
const BASELINE_FILE = join(__dirname, "baseline.json");

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

const BUDGETS = {
  totalJS: 1300,
  totalCSS: 100,
  mainEntry: 300,
  vendorChunk: 550,
  asyncChunk: 150,
  maxChunks: 40,
  assets: 500,
};

const THRESHOLDS = {
  totalJS: 10,
  totalCSS: 15,
  chunkCount: 20,
};

function ensureBuild(skipBuild) {
  if (existsSync(DIST_DIR)) {
    return;
  }
  if (skipBuild) {
    console.log(
      `${colors.yellow}i${colors.reset} ${colors.dim}No ${DIST_DIR} — skipping bundle analysis (--skip-build / --mode=fast). Run \`pnpm --filter web build\` for a full bundle gate.${colors.reset}`
    );
    process.exit(0);
  }
  console.log(`${colors.blue}i${colors.reset} Building web app (this can take several minutes)...`);
  try {
    execSync("pnpm --filter web build", {
      cwd: WORKSPACE_ROOT,
      stdio: "inherit",
    });
  } catch {
    console.error(`${colors.red}x${colors.reset} Build failed`);
    process.exit(2);
  }
}

function analyzeBundleStats() {
  const manifestPath = join(DIST_DIR, ".vite/manifest.json");

  if (!existsSync(manifestPath)) {
    console.error(`${colors.red}x${colors.reset} Manifest not found: ${manifestPath}`);
    process.exit(2);
  }

  const manifest = JSON.parse(readFileSync(manifestPath, "utf-8"));

  const stats = {
    totalJS: 0,
    totalCSS: 0,
    totalAssets: 0,
    chunks: [],
    chunkCount: 0,
    timestamp: new Date().toISOString(),
  };

  for (const entry of Object.values(manifest)) {
    if (!entry?.file) {
      continue;
    }

    const filePath = join(DIST_DIR, entry.file);
    if (!existsSync(filePath)) {
      continue;
    }

    const fileSizeKB = statSync(filePath).size / 1024;

    if (entry.file.endsWith(".js")) {
      stats.totalJS += fileSizeKB;
      stats.chunkCount += 1;
      stats.chunks.push({
        name: entry.file,
        sizeKB: fileSizeKB,
        isEntry: Boolean(entry.isEntry),
        isDynamic: Boolean(entry.isDynamicEntry),
      });
    } else if (entry.file.endsWith(".css")) {
      stats.totalCSS += fileSizeKB;
    } else {
      stats.totalAssets += fileSizeKB;
    }
  }

  stats.totalJS = Number(stats.totalJS.toFixed(2));
  stats.totalCSS = Number(stats.totalCSS.toFixed(2));
  stats.totalAssets = Number(stats.totalAssets.toFixed(2));

  return stats;
}

function loadBaseline() {
  if (!existsSync(BASELINE_FILE)) {
    return null;
  }

  try {
    return JSON.parse(readFileSync(BASELINE_FILE, "utf-8"));
  } catch {
    return null;
  }
}

function saveBaseline(stats) {
  writeFileSync(BASELINE_FILE, JSON.stringify(stats, null, 2), "utf-8");
}

function formatSize(kb) {
  const num = Number(kb);
  if (Number.isNaN(num)) {
    return "0 B";
  }
  if (num < 1) {
    return `${Math.round(num * 1024)} B`;
  }
  if (num < 1024) {
    return `${num.toFixed(2)} KB`;
  }
  return `${(num / 1024).toFixed(2)} MB`;
}

function getPercentChange(current, baseline) {
  if (!baseline) {
    return null;
  }
  return ((current - baseline) / baseline) * 100;
}

function validateBudgets(stats) {
  const errors = [];
  const warnings = [];

  if (stats.totalJS > BUDGETS.totalJS) {
    errors.push({
      category: "TOTAL_JS_EXCEEDED",
      message: `Total JS size ${formatSize(stats.totalJS)} exceeds budget ${formatSize(BUDGETS.totalJS)}`,
      actual: stats.totalJS,
      budget: BUDGETS.totalJS,
    });
  }

  if (stats.totalCSS > BUDGETS.totalCSS) {
    errors.push({
      category: "TOTAL_CSS_EXCEEDED",
      message: `Total CSS size ${formatSize(stats.totalCSS)} exceeds budget ${formatSize(BUDGETS.totalCSS)}`,
      actual: stats.totalCSS,
      budget: BUDGETS.totalCSS,
    });
  }

  if (stats.chunkCount > BUDGETS.maxChunks) {
    warnings.push({
      category: "CHUNK_COUNT_HIGH",
      message: `Chunk count ${stats.chunkCount} exceeds recommended limit ${BUDGETS.maxChunks}`,
      actual: stats.chunkCount,
      budget: BUDGETS.maxChunks,
    });
  }

  for (const chunk of stats.chunks) {
    if (chunk.isEntry && chunk.sizeKB > BUDGETS.mainEntry) {
      errors.push({
        category: "ENTRY_CHUNK_EXCEEDED",
        message: `Entry chunk ${chunk.name} (${formatSize(chunk.sizeKB)}) exceeds budget ${formatSize(BUDGETS.mainEntry)}`,
        file: chunk.name,
        actual: chunk.sizeKB,
        budget: BUDGETS.mainEntry,
      });
      continue;
    }

    if (!chunk.isEntry && chunk.name.includes("vendor") && chunk.sizeKB > BUDGETS.vendorChunk) {
      errors.push({
        category: "VENDOR_CHUNK_EXCEEDED",
        message: `Vendor chunk ${chunk.name} (${formatSize(chunk.sizeKB)}) exceeds budget ${formatSize(BUDGETS.vendorChunk)}`,
        file: chunk.name,
        actual: chunk.sizeKB,
        budget: BUDGETS.vendorChunk,
      });
      continue;
    }

    if (chunk.isDynamic && chunk.sizeKB > BUDGETS.asyncChunk) {
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

function compareBaseline(current, baseline) {
  if (!baseline) {
    return {
      errors: [],
      warnings: [],
      info: ["No baseline found. Run with --update to create one."],
    };
  }

  const errors = [];
  const warnings = [];
  const info = [];

  const jsChange = getPercentChange(current.totalJS, baseline.totalJS);
  if (jsChange !== null && jsChange > THRESHOLDS.totalJS) {
    errors.push({
      category: "JS_SIZE_REGRESSION",
      message: `Total JS increased by ${jsChange.toFixed(1)}% (threshold: ${THRESHOLDS.totalJS}%)`,
      baseline: baseline.totalJS,
      current: current.totalJS,
      change: jsChange,
    });
  } else if (jsChange !== null && jsChange > 0) {
    info.push(`Total JS increased by ${jsChange.toFixed(1)}%`);
  }

  const cssChange = getPercentChange(current.totalCSS, baseline.totalCSS);
  if (cssChange !== null && cssChange > THRESHOLDS.totalCSS) {
    warnings.push({
      category: "CSS_SIZE_REGRESSION",
      message: `Total CSS increased by ${cssChange.toFixed(1)}% (threshold: ${THRESHOLDS.totalCSS}%)`,
      baseline: baseline.totalCSS,
      current: current.totalCSS,
      change: cssChange,
    });
  }

  const chunkChange = getPercentChange(current.chunkCount, baseline.chunkCount);
  if (chunkChange !== null && chunkChange > THRESHOLDS.chunkCount) {
    warnings.push({
      category: "CHUNK_COUNT_REGRESSION",
      message: `Chunk count increased by ${chunkChange.toFixed(1)}% (threshold: ${THRESHOLDS.chunkCount}%)`,
      baseline: baseline.chunkCount,
      current: current.chunkCount,
      change: chunkChange,
    });
  }

  return { errors, warnings, info };
}

function printReport(stats, baseline) {
  console.log(`\n${colors.bright}Bundle Analysis Report${colors.reset}`);
  console.log("=".repeat(70));
  console.log(`\n${colors.cyan}Summary${colors.reset}`);
  console.log(`  Total JS:     ${formatSize(stats.totalJS)} / ${formatSize(BUDGETS.totalJS)}`);
  console.log(`  Total CSS:    ${formatSize(stats.totalCSS)} / ${formatSize(BUDGETS.totalCSS)}`);
  console.log(`  Total Assets: ${formatSize(stats.totalAssets)} / ${formatSize(BUDGETS.assets)}`);
  console.log(`  Chunks:       ${stats.chunkCount} / ${BUDGETS.maxChunks}`);

  if (baseline) {
    console.log(`\n${colors.cyan}Baseline${colors.reset}`);
    console.log(`  JS:     ${formatSize(baseline.totalJS)} -> ${formatSize(stats.totalJS)}`);
    console.log(`  CSS:    ${formatSize(baseline.totalCSS)} -> ${formatSize(stats.totalCSS)}`);
    console.log(`  Chunks: ${baseline.chunkCount} -> ${stats.chunkCount}`);
  }
}

function reportIssues(budgetResults, baselineResults) {
  const errors = [
    ...convertBudgetErrors(budgetResults.errors || []),
    ...convertBaselineErrors(baselineResults.errors || []),
  ];
  const warnings = [
    ...convertBudgetWarnings(budgetResults.warnings || []),
    ...convertBudgetWarnings(baselineResults.warnings || []),
  ];

  if (errors.length > 0) {
    console.log(formatBundleIssues(errors));
  }
  if (warnings.length > 0) {
    console.log(formatBundleIssues(warnings));
  }

  if (baselineResults.info && baselineResults.info.length > 0) {
    console.log(`\n${colors.blue}${colors.bright}Info${colors.reset}`);
    for (const line of baselineResults.info) {
      console.log(`  - ${line}`);
    }
  }

  console.log(summarizeBundleIssues(errors, warnings));
  return errors.length;
}

async function main() {
  const args = process.argv.slice(2);
  const isUpdate = args.includes("--update");
  const isReport = args.includes("--report");
  const skipBuild =
    args.includes("--skip-build") || args.includes("--mode=fast");

  console.log(`${colors.bright}Bundle CI Gate${colors.reset}`);
  console.log("=".repeat(70));

  ensureBuild(skipBuild);
  const currentStats = analyzeBundleStats();
  const baseline = loadBaseline();

  printReport(currentStats, baseline);

  if (isReport) {
    process.exit(0);
  }

  if (isUpdate) {
    saveBaseline(currentStats);
    console.log(`\n${colors.green}Baseline updated${colors.reset}`);
    process.exit(0);
  }

  const budgetResults = validateBudgets(currentStats);
  const baselineResults = compareBaseline(currentStats, baseline);
  const errorCount = reportIssues(budgetResults, baselineResults);

  if (errorCount > 0) {
    console.log(`\n${colors.red}Bundle CI gate failed with ${errorCount} error(s)${colors.reset}`);
    process.exit(1);
  }

  console.log(`\n${colors.green}Bundle gate passed${colors.reset}`);
  process.exit(0);
}

main().catch((err) => {
  console.error(`${colors.red}Fatal error:${colors.reset}`, err);
  process.exit(2);
});
