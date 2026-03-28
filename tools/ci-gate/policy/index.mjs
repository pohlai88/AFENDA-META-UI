#!/usr/bin/env node

/**
 * Policy Contract CI Gate
 *
 * Enforces mutation-policy contract consistency from truth-config.ts.
 */

import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const repoRoot = resolve(__dirname, "..", "..", "..");

const verbose = process.argv.includes("--verbose") || process.argv.includes("-v");

console.log("🔍 Running policy contract consistency gate...\n");

const result = spawnSync(
  "pnpm",
  ["exec", "tsx", "tools/scripts/ci-policy-contract-consistency-check.ts"],
  {
    cwd: repoRoot,
    stdio: verbose ? "inherit" : "pipe",
    shell: process.platform === "win32",
    encoding: "utf8",
  }
);

if (!verbose) {
  if (result.stdout?.trim()) {
    console.log(result.stdout.trim());
  }
  if (result.stderr?.trim()) {
    console.error(result.stderr.trim());
  }
}

if ((result.status ?? 1) !== 0) {
  console.error("\n❌ Policy contract consistency gate failed.");
  process.exit(result.status ?? 1);
}

console.log("✅ Policy contract consistency gate passed.");
