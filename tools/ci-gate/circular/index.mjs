#!/usr/bin/env node

/**
 * Circular Dependency CI Gate
 *
 * Detects circular dependencies across core workspace targets.
 */

import { execSync } from "node:child_process";
import { join, resolve } from "node:path";
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
  cyan: "\x1b[36m",
};

function log(message, color = "reset") {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function checkCircularDeps(directory, label, errors, warnings) {
  log(`\nChecking ${label} for circular dependencies...`, "cyan");

  const absoluteDirectory = resolve(repoRoot, directory);

  try {
    const output = execSync(
      `pnpm exec madge --circular --extensions ts,tsx "${absoluteDirectory}" 2>&1`,
      {
        cwd: repoRoot,
        encoding: "utf-8",
        stdio: "pipe",
      }
    );

    if (VERBOSE && output.trim()) {
      log(output, "dim");
    }

    if (output.includes("No circular dependency found") || output.includes("No circular dependencies found")) {
      log(`PASS: ${label}`, "green");
      return { ok: true, hasCycles: false };
    }

    const parsed = parseCircularDependencyErrors(output, label);
    if (parsed.length > 0) {
      if (STRICT) {
        errors.push(...parsed);
      } else {
        warnings.push(...parsed.map((issue) => ({ ...issue, level: "warning" })));
      }

      log(`Detected circular dependencies in ${label}`, STRICT ? "red" : "yellow");
      return { ok: !STRICT, hasCycles: true };
    }

    log(`PASS: ${label}`, "green");
    return { ok: true, hasCycles: false };
  } catch (error) {
    const details = `${error.stdout || ""}\n${error.stderr || ""}`.trim() || String(error.message || error);

    if (details.includes("No circular dependency found") || details.includes("No circular dependencies found")) {
      log(`PASS: ${label}`, "green");
      return { ok: true, hasCycles: false };
    }

    if (/circular dependenc/i.test(details)) {
      const parsed = parseCircularDependencyErrors(details, label);
      if (parsed.length > 0) {
        if (STRICT) {
          errors.push(...parsed);
        } else {
          warnings.push(...parsed.map((issue) => ({ ...issue, level: "warning" })));
        }
      } else {
        warnings.push(createCircularWarning(label, details));
      }

      log(`Detected circular dependencies in ${label}`, STRICT ? "red" : "yellow");
      return { ok: !STRICT, hasCycles: true };
    }

    errors.push(
      createIssue({
        level: "error",
        category: "MADGE_ERROR",
        message: `Failed to analyze circular dependencies for ${label}`,
        explanation: "Madge failed before returning dependency-cycle results.",
        relatedFiles: [directory],
        fixes: [
          "Ensure madge is installed and executable",
          "Verify the target directory exists",
          "Re-run with --verbose for raw output",
        ],
        details: details.split("\n").map((line) => line.trim()).filter(Boolean).slice(0, 20),
      })
    );

    log(`FAIL: ${label}`, "red");
    return { ok: false, hasCycles: false };
  }
}

async function runWithConcurrency(targets, concurrency, errors, warnings) {
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
      results[index] = checkCircularDeps(target.directory, target.label, errors, warnings);
    }
  }

  const workerCount = Math.min(Math.max(concurrency, 1), targets.length);
  await Promise.all(Array.from({ length: workerCount }, () => worker()));
  return results;
}

async function main() {
  log(`\n${colors.bright}${colors.blue}Circular Dependency CI Gate${colors.reset}`);
  log(`${colors.dim}Checking circular dependencies (concurrency: ${CONCURRENCY})...${colors.reset}`);

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

  if (errors.length > 0) {
    console.log(formatCircularIssues(errors));
  }
  if (warnings.length > 0) {
    console.log(formatCircularIssues(warnings));
  }

  console.log(summarizeCircularIssues(errors, warnings));

  const hasCycles = results.some((result) => result?.hasCycles);
  const failed = errors.length > 0 || (STRICT && warnings.length > 0);

  if (failed) {
    log(`\n${colors.red}Circular dependency gate failed.${colors.reset}`);
    process.exit(1);
  }

  if (hasCycles && !STRICT) {
    log(`\n${colors.yellow}Circular dependencies detected (non-blocking mode).${colors.reset}`);
    log("Run with --strict to fail on cycles.", "dim");
  }

  log(`\n${colors.green}Circular dependency gate passed${colors.reset}\n`);
  process.exit(0);
}

main().catch((error) => {
  log(`Fatal error: ${error.message || String(error)}`, "red");
  process.exit(1);
});
