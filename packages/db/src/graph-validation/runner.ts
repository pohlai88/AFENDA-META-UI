#!/usr/bin/env tsx
/**
 * Graph Validation CLI Runner
 * ============================
 * Command-line tool for validating FK relationships, detecting orphans,
 * checking tenant isolation, and generating health reports.
 *
 * Usage:
 *   pnpm --filter @afenda/db graph-validation health
 *   pnpm --filter @afenda/db graph-validation report --format=json
 *   pnpm --filter @afenda/db graph-validation validate --tier=P0
 *   pnpm --filter @afenda/db graph-validation tenants
 */

import { sql as drizzleSql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { buildFkCatalog, exportCatalogToJson } from "./fk-catalog.js";
import { detectAllOrphans, generateCleanupSQL, generateDeleteSQL } from "./orphan-detection.js";
import {
  detectMissingFkIndexes,
  generateCreateIndexSQL,
  generateRemediationScript,
} from "./index-remediation.js";
import { detectTenantLeaks, generateSecurityIncidentReport } from "./tenant-isolation.js";
import { calculateHealthScore, formatHealthReport } from "./health-scoring.js";
import * as schema from "../schema/index.js";

// Environment validation
function validateEnvironment(): void {
  if (!process.env.DATABASE_URL) {
    console.error("❌ Error: DATABASE_URL environment variable is required");
    console.error("   Set it in .env file or export DATABASE_URL=postgresql://...");
    process.exit(1);
  }
}

// Database connection
let db: ReturnType<typeof drizzle>;
let pool: Pool;

function connectDatabase(): void {
  pool = new Pool({ connectionString: process.env.DATABASE_URL! });
  db = drizzle({ client: pool, schema, casing: "camelCase" });
  console.log("✅ Connected to database");
}

async function disconnectDatabase(): Promise<void> {
  await pool.end();
  console.log("✅ Disconnected from database");
}

// Command: health
async function commandHealth(): Promise<void> {
  console.log("🏥 Starting graph validation health check...\n");

  const catalog = await buildFkCatalog(db, "sales");
  console.log("");

  const orphans = await detectAllOrphans(db, catalog.relationships);
  console.log("");

  const tenantLeaks = await detectTenantLeaks(db, catalog.relationships);
  console.log("");

  const healthScore = calculateHealthScore({
    orphans,
    tenantLeaks,
    catalog,
  });

  console.log(formatHealthReport(healthScore));

  if (healthScore.status === "CRITICAL") {
    process.exit(1); // Exit with error code for CI/CD
  }
}

// Command: report
async function commandReport(format: "json" | "text" = "text"): Promise<void> {
  console.log("📊 Generating detailed validation report...\n");

  const catalog = await buildFkCatalog(db, "sales");
  console.log("");

  const orphans = await detectAllOrphans(db, catalog.relationships);
  console.log("");

  const tenantLeaks = await detectTenantLeaks(db, catalog.relationships);
  console.log("");

  const healthScore = calculateHealthScore({
    orphans,
    tenantLeaks,
    catalog,
  });

  if (format === "json") {
    const report = {
      timestamp: new Date().toISOString(),
      healthScore,
      orphans: {
        total: orphans.total,
        byPriority: {
          P0: orphans.byPriority.P0.length,
          P1: orphans.byPriority.P1.length,
          P2: orphans.byPriority.P2.length,
          P3: orphans.byPriority.P3.length,
        },
        details: Array.from(orphans.byTable.entries()).map(([table, results]) => ({
          table,
          violations: results,
        })),
      },
      tenantLeaks: {
        total: tenantLeaks.totalLeaks,
        isSecure: tenantLeaks.isSecure,
        details: tenantLeaks.allViolations,
      },
      catalog: {
        totalRelationships: catalog.relationships.length,
        byPriority: {
          P0: catalog.byPriority.P0.length,
          P1: catalog.byPriority.P1.length,
          P2: catalog.byPriority.P2.length,
          P3: catalog.byPriority.P3.length,
        },
      },
    };

    console.log(JSON.stringify(report, null, 2));
  } else {
    console.log(formatHealthReport(healthScore));
    console.log("\n");

    if (orphans.total > 0) {
      console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
      console.log("  Orphan Details");
      console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

      for (const [table, results] of orphans.byTable.entries()) {
        console.log(`\n● ${table}`);
        for (const result of results) {
          console.log(
            `  - ${result.fkColumn} → ${result.parentTable}: ${result.orphanCount} orphans`
          );
          console.log(`    Sample IDs: ${result.sampleIds.slice(0, 5).join(", ")}`);
        }
      }
    }

    if (!tenantLeaks.isSecure) {
      console.log("\n");
      console.log(generateSecurityIncidentReport(tenantLeaks));
    }
  }
}

// Command: validate (specific tier)
async function commandValidate(tier?: "P0" | "P1" | "P2" | "P3"): Promise<void> {
  console.log(`🔍 Validating ${tier || "all"} FK relationships...\n`);

  const catalog = await buildFkCatalog(db, "sales");
  console.log("");

  const orphans = await detectAllOrphans(db, catalog.relationships, tier);
  console.log("");

  console.log("Results:");
  console.log(`  Total orphans: ${orphans.total}`);
  console.log(`  Tables affected: ${orphans.byTable.size}`);

  if (tier) {
    console.log(`  ${tier} violations: ${orphans.byPriority[tier].length}`);
  } else {
    console.log(`  P0 violations: ${orphans.byPriority.P0.length}`);
    console.log(`  P1 violations: ${orphans.byPriority.P1.length}`);
    console.log(`  P2 violations: ${orphans.byPriority.P2.length}`);
    console.log(`  P3 violations: ${orphans.byPriority.P3.length}`);
  }

  if (orphans.criticalViolations.length > 0) {
    console.log("\n🚨 Critical violations detected:");
    for (const violation of orphans.criticalViolations) {
      console.log(
        `   - ${violation.childTable}.${violation.fkColumn}: ${violation.orphanCount} orphans`
      );
    }
    process.exit(1);
  }
}

// Command: tenants (tenant isolation check)
async function commandTenants(): Promise<void> {
  console.log("🔒 Checking tenant isolation...\n");

  const catalog = await buildFkCatalog(db, "sales");
  console.log("");

  const tenantLeaks = await detectTenantLeaks(db, catalog.relationships);
  console.log("");

  if (tenantLeaks.isSecure) {
    console.log("✅ Tenant isolation is SECURE. No cross-tenant violations detected.");
  } else {
    console.log(generateSecurityIncidentReport(tenantLeaks));
    process.exit(1); // CRITICAL security issue
  }
}

// Command: cleanup
async function commandCleanup(options: {
  tier?: "P0" | "P1" | "P2" | "P3";
  table?: string;
  apply: boolean;
  confirm?: string;
  limit?: number;
}): Promise<void> {
  if (options.apply && options.confirm !== "DELETE") {
    console.error("❌ Refusing to run destructive cleanup without --confirm=DELETE");
    process.exit(1);
  }

  const mode = options.apply ? "APPLY" : "DRY-RUN";
  const target = options.table ? `table=${options.table}` : "all tables";
  console.log(`🧹 Starting orphan cleanup (${mode}; ${target})...\n`);

  const catalog = await buildFkCatalog(db, "sales");
  console.log("");

  const orphans = await detectAllOrphans(db, catalog.relationships, options.tier);
  console.log("");

  const allResults = Array.from(orphans.byTable.values()).flat();
  const tableFiltered = options.table
    ? allResults.filter((result) => result.childTable === options.table)
    : allResults;
  const sorted = tableFiltered.sort((a, b) => b.orphanCount - a.orphanCount);
  const limited = options.limit ? sorted.slice(0, options.limit) : sorted;

  if (limited.length === 0) {
    console.log("✅ No orphaned rows matched current cleanup filter.");
    return;
  }

  console.log(`Found ${limited.length} cleanup candidate(s).`);

  if (!options.apply) {
    for (const candidate of limited) {
      console.log("\n" + generateCleanupSQL(candidate, true));
    }

    console.log("\nℹ️  Dry-run only. Re-run with --apply --confirm=DELETE to execute cleanup.");
    return;
  }

  for (const candidate of limited) {
    const deleteSql = generateDeleteSQL(candidate);
    await db.execute(drizzleSql.raw(deleteSql));
    console.log(
      `✅ Cleanup executed for ${candidate.childTable}.${candidate.fkColumn} (expected ~${candidate.orphanCount} rows)`
    );
  }

  console.log("\n✅ Cleanup execution complete.");
}

// Command: export-catalog
async function commandExportCatalog(outputPath = "./fk-catalog.json"): Promise<void> {
  console.log("📁 Exporting FK relationship catalog...\n");

  const catalog = await buildFkCatalog(db, "sales");
  await exportCatalogToJson(catalog, outputPath);

  console.log(`\n✅ Catalog exported successfully: ${outputPath}`);
}

// Command: add-indexes
async function commandAddIndexes(options: {
  tier?: "P0" | "P1" | "P2" | "P3";
  apply: boolean;
  confirm?: string;
  limit?: number;
}): Promise<void> {
  if (options.apply && options.confirm !== "APPLY") {
    console.error("❌ Refusing to apply index creation without --confirm=APPLY");
    process.exit(1);
  }

  const mode = options.apply ? "APPLY" : "DRY-RUN";
  console.log(`📈 Starting FK column index remediation (${mode})...\n`);

  const catalog = await buildFkCatalog(db, "sales");
  console.log("");

  const indexDetection = await detectMissingFkIndexes(db, catalog.relationships, options.tier);
  console.log("");

  const missingIndexes = indexDetection.allResults.filter((r) => !r.hasIndex);
  const sorted = missingIndexes.sort((a, b) => {
    // Sort by priority (P0 first) then by table name
    const priorityOrder: Record<string, number> = { P0: 0, P1: 1, P2: 2, P3: 3 };
    const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
    if (priorityDiff !== 0) return priorityDiff;
    return a.childTable.localeCompare(b.childTable);
  });
  const limited = options.limit ? sorted.slice(0, options.limit) : sorted;

  if (limited.length === 0) {
    console.log("✅ All FK columns already have indexes. No remediation needed.");
    return;
  }

  console.log(`Found ${limited.length} missing FK column index(es).`);
  console.log(`  P0 (Critical):  ${indexDetection.byPriority.P0.length}`);
  console.log(`  P1 (High):      ${indexDetection.byPriority.P1.length}`);
  console.log(`  P2 (Medium):    ${indexDetection.byPriority.P2.length}`);
  console.log(`  P3 (Low):       ${indexDetection.byPriority.P3.length}`);

  if (!options.apply) {
    console.log(`\n📋 Index Creation Statements:\n`);
    for (const result of limited) {
      console.log(generateCreateIndexSQL(result));
    }

    console.log("\nℹ️  Dry-run only. Re-run with --apply --confirm=APPLY to create indexes.");
    return;
  }

  console.log(`\n⏳ Creating indexes...\n`);
  for (const result of limited) {
    const createIndexSql = generateCreateIndexSQL(result);
    try {
      await db.execute(drizzleSql.raw(createIndexSql));
      console.log(
        `✅ Index created: ${result.indexName} on ${result.childTable}.${result.childColumn}`
      );
    } catch (error: any) {
      console.error(`❌ Failed to create index ${result.indexName}: ${error.message}`);
    }
  }

  console.log("\n✅ Index creation complete.");
}

// CLI argument parsing
async function main(): Promise<void> {
  validateEnvironment();
  connectDatabase();

  const command = process.argv[2];
  const args = process.argv.slice(3);

  try {
    switch (command) {
      case "health":
        await commandHealth();
        break;

      case "report": {
        const format = args.find((a) => a.startsWith("--format="))?.split("=")[1] as
          | "json"
          | "text";
        await commandReport(format);
        break;
      }

      case "validate": {
        const tier = args.find((a) => a.startsWith("--tier="))?.split("=")[1] as
          | "P0"
          | "P1"
          | "P2"
          | "P3";
        await commandValidate(tier);
        break;
      }

      case "tenants":
        await commandTenants();
        break;

      case "clean":
      case "cleanup": {
        const tier = args.find((a) => a.startsWith("--tier="))?.split("=")[1] as
          | "P0"
          | "P1"
          | "P2"
          | "P3"
          | undefined;
        const table = args.find((a) => a.startsWith("--table="))?.split("=")[1];
        const confirm = args.find((a) => a.startsWith("--confirm="))?.split("=")[1];
        const limitValue = args.find((a) => a.startsWith("--limit="))?.split("=")[1];
        const parsedLimit = limitValue ? Number(limitValue) : undefined;
        const limit =
          parsedLimit && Number.isFinite(parsedLimit) && parsedLimit > 0 ? parsedLimit : undefined;

        await commandCleanup({
          tier,
          table,
          apply: args.includes("--apply"),
          confirm,
          limit,
        });
        break;
      }

      case "export-catalog": {
        const output = args.find((a) => a.startsWith("--output="))?.split("=")[1];
        await commandExportCatalog(output);
        break;
      }

      case "add-indexes": {
        const tier = args.find((a) => a.startsWith("--tier="))?.split("=")[1] as
          | "P0"
          | "P1"
          | "P2"
          | "P3"
          | undefined;
        const confirm = args.find((a) => a.startsWith("--confirm="))?.split("=")[1];
        const limitValue = args.find((a) => a.startsWith("--limit="))?.split("=")[1];
        const parsedLimit = limitValue ? Number(limitValue) : undefined;
        const limit =
          parsedLimit && Number.isFinite(parsedLimit) && parsedLimit > 0 ? parsedLimit : undefined;

        await commandAddIndexes({
          tier,
          apply: args.includes("--apply"),
          confirm,
          limit,
        });
        break;
      }

      default:
        console.log(`
Graph Validation CLI
====================

Usage:
  pnpm --filter @afenda/db graph-validation <command> [options]

Commands:
  health                 Quick health check (orphans + tenant leaks + score)
  report [--format=json] Detailed validation report (default: text)
  validate [--tier=P0]   Validate specific priority tier (P0, P1, P2, P3)
  tenants                Check tenant isolation (security audit)
  clean                  Generate or execute orphan cleanup SQL
  add-indexes            Generate or create missing FK column indexes
  export-catalog         Export FK relationship catalog to JSON

Examples:
  pnpm --filter @afenda/db graph-validation health
  pnpm --filter @afenda/db graph-validation report --format=json > report.json
  pnpm --filter @afenda/db graph-validation validate --tier=P0
  pnpm --filter @afenda/db graph-validation tenants
  pnpm --filter @afenda/db graph-validation clean --tier=P0 --table=sales_order_lines
  pnpm --filter @afenda/db graph-validation clean --apply --confirm=DELETE --limit=5
  pnpm --filter @afenda/db graph-validation add-indexes --tier=P0
  pnpm --filter @afenda/db graph-validation add-indexes --apply --confirm=APPLY --limit=10
  pnpm --filter @afenda/db graph-validation export-catalog --output=./fk-catalog.json

Environment Variables:
  DATABASE_URL          PostgreSQL connection string (required)

Exit Codes:
  0  Success (health score >= 70, no critical violations)
  1  Failure (health score < 70 or critical violations detected)
        `);
        process.exit(command ? 1 : 0);
    }
  } catch (error) {
    console.error("\n❌ Error:", error);
    process.exit(1);
  } finally {
    await disconnectDatabase();
  }
}

main();
