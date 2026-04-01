/**
 * CI / local: verify seed clear table order respects FK direction (child before parent).
 * Requires DATABASE_URL (direct recommended — same as migrations).
 */

import { config } from "dotenv";
import path from "node:path";
import { pathToFileURL } from "node:url";
import pg from "pg";
import { drizzle } from "drizzle-orm/node-postgres";

import { CLEAR_COVERAGE_SCHEMAS, generateClearPlanReport } from "./clear-plan.js";

const rootEnv = path.resolve(import.meta.dirname, "../../../../.env");
config({ path: rootEnv });

async function main(): Promise<void> {
  const url = process.env.DATABASE_URL_MIGRATIONS ?? process.env.DATABASE_URL;
  if (!url) {
    console.error("DATABASE_URL or DATABASE_URL_MIGRATIONS is required");
    process.exitCode = 1;
    return;
  }
  const pool = new pg.Pool({ connectionString: url, max: 2 });
  const db = drizzle({ client: pool });
  try {
    const report = await generateClearPlanReport(db as never);
    console.log(`Clear plan: ${report.clearTableCount} tables in delete order`);
    if (!report.fkCheck.ok) {
      console.error("FK order violations:");
      for (const v of report.fkCheck.violations) {
        console.error(`  - ${v}`);
      }
      process.exitCode = 1;
      return;
    }
    console.log("✓ Clear delete order is FK-safe for catalogued constraints");
    if (!report.coverageCheck.ok) {
      console.error(
        `Tenant-scoped tables missing from seed clear path (clear-tables.ts, or hr must be wiped via truncateAllHrTables):`
      );
      for (const m of report.coverageCheck.missingFromClear) {
        console.error(`  - ${m}`);
      }
      process.exitCode = 1;
      return;
    }
    console.log(
      "✓ Clear manifest covers tenant-scoped tables (sales); hr is truncate-managed in clearExistingData"
    );
  } finally {
    await pool.end();
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((e) => {
    console.error(e);
    process.exitCode = 1;
  });
}
