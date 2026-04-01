#!/usr/bin/env node
/**
 * Non-blocking truth health signals for CI or local runs.
 * Always exits 0; prints GitHub Actions ::warning:: lines on failure.
 */
import { spawnSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, "..", "..");

function run(label, args) {
  console.log(`\n--- ${label} ---\n`);
  const r = spawnSync("pnpm", args, {
    cwd: REPO_ROOT,
    stdio: "inherit",
    shell: true,
  });
  const code = r.status ?? 1;
  if (code !== 0) {
    const msg = `${label} failed (exit ${code}). Regenerate with truth:generate or fix schema drift.`;
    if (process.env.GITHUB_ACTIONS === "true") {
      console.log(`::warning::${msg}`);
    } else {
      console.warn(`ADVISORY: ${msg}`);
    }
  }
  return code;
}

run("truth:check (artifact vs compiler)", ["--filter", "@afenda/db", "truth:check"]);
run("truth:schema:compare (warn-only)", ["--filter", "@afenda/db", "truth:schema:compare:warn"]);

console.log("\nTruth advisory gates finished (non-blocking).\n");
process.exit(0);
