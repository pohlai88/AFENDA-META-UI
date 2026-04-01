#!/usr/bin/env node
/**
 * Column-kit governance scoped to the Postgres `sales` schema (Drizzle local TS introspection).
 *
 * Delegates to `column-kit-shared-columns/introspect-local-schema.mts` with `--schema=sales`.
 *
 * Usage:
 *   node tools/ci-gate/column-kit-sales-domain/index.mjs
 *   pnpm ci:gate:column-kit:local-ts:sales
 *   pnpm ci:gate --gate=column-kit-sales-domain
 *
 * Pass-through args (e.g. `--format=json`, `--severity-threshold=warn`):
 *   node tools/ci-gate/column-kit-sales-domain/index.mjs --format=json
 */

import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, "..", "..", "..");
const passthrough = process.argv.slice(2);

const result = spawnSync(
  "pnpm",
  [
    "--filter",
    "@afenda/db",
    "exec",
    "tsx",
    "../../tools/ci-gate/column-kit-shared-columns/introspect-local-schema.mts",
    "--schema=sales",
    ...passthrough,
  ],
  {
    cwd: repoRoot,
    stdio: "inherit",
    env: process.env,
    shell: process.platform === "win32",
  }
);

if (result.error) {
  console.error("column-kit-sales-domain:", result.error);
  process.exit(1);
}

process.exit(result.status ?? 1);
