#!/usr/bin/env node
/**
 * Forwards to the Drizzle schema quality gate with an HR-only glob.
 * Same baseline as CI (`baseline.json`). Prefer `pnpm ci:gate:schema-quality:hr` or pass `--glob=` to the gate.
 *
 * Run: node tools/scripts/hr-schema-audit-scan.mjs [--format=json] [--mode=fast|full]
 */
import { spawnSync } from "node:child_process";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, "../..");
const gate = resolve(repoRoot, "tools/ci-gate/drizzle-schema-quality/index.mjs");

const extra = process.argv.slice(2);
const args = [
  gate,
  "--baseline=tools/ci-gate/drizzle-schema-quality/baseline.json",
  "--glob=packages/db/src/schema/hr/**/*.ts",
  ...extra.filter((a) => !a.startsWith("--glob=") && !a.startsWith("--baseline=")),
];

const r = spawnSync(process.execPath, args, {
  cwd: repoRoot,
  encoding: "utf8",
  stdio: ["inherit", "pipe", "inherit"],
});

if (r.stdout) process.stdout.write(r.stdout);
process.exit(r.status === null ? 1 : r.status);
