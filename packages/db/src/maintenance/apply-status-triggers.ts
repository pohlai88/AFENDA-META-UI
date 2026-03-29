/**
 * Apply Status-Transition Triggers
 * =================================
 * Reads the SQL trigger definitions and executes them against the database.
 *
 * Usage:
 *   pnpm --filter @afenda/db db:trigger:apply           # apply triggers
 *   pnpm --filter @afenda/db db:trigger:apply --dry-run  # print SQL only
 */

import { sql } from "drizzle-orm";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const CURRENT_DIR = dirname(fileURLToPath(import.meta.url));
const SQL_PATH = resolve(CURRENT_DIR, "../triggers/status-transitions.sql");

async function run(): Promise<void> {
  const rawSql = readFileSync(SQL_PATH, "utf-8");

  if (process.argv.includes("--dry-run")) {
    console.log("-- Dry-run: SQL that would be executed:\n");
    console.log(rawSql);
    return;
  }

  const { db } = await import("../db.js");
  console.log("Applying status-transition triggers...");
  await db.execute(sql.raw(rawSql));
  console.log("Status-transition triggers applied successfully.");
}

run().catch((error) => {
  console.error("Trigger apply failed:", error);
  process.exitCode = 1;
});
