#!/usr/bin/env node
/**
 * Postgres Schema CI Gate — Engine v2
 * =====================================
 * Business Truth Enforcement Framework
 *
 * Validates Drizzle schema source code against six dimensions of business truth:
 *   structural, semantic, workflow, tenant, audit, derived
 *
 * Usage:
 *   node tools/ci-gate/postgres-schema/index.mjs
 *   pnpm ci:gate:postgres
 *   pnpm ci:gate --gate=postgres-schema
 *
 * Exit codes:
 *   0 - all error-severity rules passed
 *   1 - one or more error-severity rules failed
 */

import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

import { extractSchema } from "./extractors/drizzle-schema.mjs";
import { composeDomainRules } from "./engine/rule-registry.mjs";
import { runRules } from "./engine/evaluator.mjs";
import { report } from "./engine/reporter.mjs";
import { salesRules } from "./config/sales.rules.mjs";
import { platformRules } from "./config/platform.rules.mjs";
import { metaRules } from "./config/meta.rules.mjs";
import { resolveSalesSchemaModulePaths } from "../_shared/sales-schema-modules.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Resolve to repo root (tools/ci-gate/postgres-schema → ../../..)
const repoRoot = resolve(__dirname, "..", "..", "..");

async function main() {
  console.log("🔍 Running postgres-schema CI gate (Engine v2)...\n");

  // Phase 1: Extract truth model from Drizzle source
  const schemaPaths = [
    ...resolveSalesSchemaModulePaths(repoRoot),
    resolve(repoRoot, "packages/db/src/schema/core/tenants.ts"),
    resolve(repoRoot, "packages/db/src/schema/core/appModules.ts"),
    resolve(repoRoot, "packages/db/src/schema/security/users.ts"),
    resolve(repoRoot, "packages/db/src/schema/security/roles.ts"),
    resolve(repoRoot, "packages/db/src/schema/security/permissions.ts"),
    resolve(repoRoot, "packages/db/src/schema/security/userRoles.ts"),
    resolve(repoRoot, "packages/db/src/schema/meta/platform.ts"),
    resolve(repoRoot, "packages/db/src/schema/meta/metadata.ts"),
    resolve(repoRoot, "packages/db/src/schema/meta/tenantOverrides.ts"),
    resolve(repoRoot, "packages/db/src/schema/meta/decisionAudit.ts"),
  ];

  console.log("📂 Extracting schema from domain/platform/meta files");

  const schema = { tables: {} };
  for (const schemaPath of schemaPaths) {
    const extracted = extractSchema(schemaPath);
    Object.assign(schema.tables, extracted.tables);
  }

  // Phase 2: Compose rules from domain packs
  const rules = composeDomainRules(salesRules, platformRules, metaRules);
  console.log(
    `📋 Loaded ${rules.length} rules across ${new Set(rules.map((r) => r.table)).size} tables\n`
  );

  // Phase 3: Evaluate rules
  const context = { schema };
  const results = runRules(rules, context);

  // Phase 4: Report results
  console.log("\n" + "=".repeat(60) + "\n");
  const errorCount = report(results);

  if (errorCount > 0) {
    console.log(`\n❌ Postgres schema gate failed with ${errorCount} error(s)`);
    console.log("\nNext steps:");
    console.log("  1. Fix the schema issues listed above");
    console.log("  2. Re-run: pnpm ci:gate:postgres");
    console.log("  3. Re-run full gate: pnpm ci:gate");
    process.exit(1);
  } else {
    console.log("\n✅ All postgres schema gate checks passed!");
    process.exit(0);
  }
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
