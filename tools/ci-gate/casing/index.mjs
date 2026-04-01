#!/usr/bin/env node

/**
 * Shared Column Casing CI Gate
 * ============================
 * Prevents drift between TypeScript keys and physical DB column names by enforcing
 * explicit snake_case mapping in shared column helpers and disallowing raw SQL
 * references to camelCase physical columns.
 *
 * Usage:
 *   node tools/ci-gate/casing/index.mjs
 */

import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const repoRoot = resolve(__dirname, "..", "..", "..");

const files = {
  auditColumns: resolve(repoRoot, "packages/db/src/column-kit/drizzle-mixins/audit.ts"),
  timestamps: resolve(repoRoot, "packages/db/src/column-kit/drizzle-mixins/timestamps.ts"),
  triggers: resolve(repoRoot, "packages/db/migrations/generated/truth-v1.sql"),
};

function fail(message, fixes = []) {
  return { pass: false, message, fixes };
}

function pass(message) {
  return { pass: true, message };
}

function checkAuditColumns(source) {
  const hasCreatedByMapping = /createdBy\s*:\s*integer\(\s*"created_by"\s*\)\s*\.notNull\(\)/m.test(source);
  const hasUpdatedByMapping = /updatedBy\s*:\s*integer\(\s*"updated_by"\s*\)\s*\.notNull\(\)/m.test(source);

  if (!hasCreatedByMapping || !hasUpdatedByMapping) {
    return fail(
      "packages/db/src/column-kit/drizzle-mixins/audit.ts must explicitly map createdBy/updatedBy to created_by/updated_by",
      [
        "Use createdBy: integer(\"created_by\").notNull()",
        "Use updatedBy: integer(\"updated_by\").notNull()",
      ]
    );
  }

  return pass("auditColumns explicit snake_case mappings are present");
}

function checkTimestamps(source) {
  const requiredPatterns = [
    /createdAt\s*:\s*timestamp\(\s*"created_at"\s*,\s*\{\s*withTimezone:\s*true\s*\}\)\s*\.notNull\(\)\s*\.defaultNow\(\)/m,
    /updatedAt\s*:\s*timestamp\(\s*"updated_at"\s*,\s*\{\s*withTimezone:\s*true\s*\}\)\s*\.notNull\(\)\s*\.defaultNow\(\)/m,
    /deletedAt\s*:\s*timestamp\(\s*"deleted_at"\s*,\s*\{\s*withTimezone:\s*true\s*\}\)/m,
    /appendOnlyTimestampColumns\s*=\s*\{[\s\S]*createdAt\s*:\s*timestamp\(\s*"created_at"\s*,\s*\{\s*withTimezone:\s*true\s*\}\)\s*\.notNull\(\)\s*\.defaultNow\(\)/m,
  ];

  const missing = requiredPatterns.some((pattern) => !pattern.test(source));
  if (missing) {
    return fail(
      "packages/db/src/column-kit/drizzle-mixins/timestamps.ts must explicitly map createdAt/updatedAt/deletedAt to created_at/updated_at/deleted_at",
      [
        "Use timestamp(\"created_at\", { withTimezone: true }) for createdAt",
        "Use timestamp(\"updated_at\", { withTimezone: true }) for updatedAt",
        "Use timestamp(\"deleted_at\", { withTimezone: true }) for deletedAt",
      ]
    );
  }

  return pass("timestamp helpers explicit snake_case mappings are present");
}

function checkTriggerSql(source) {
  const forbidden = ["\"createdBy\"", "\"updatedBy\"", "\"deletedAt\"", "createdBy", "updatedBy", "deletedAt"];
  const found = forbidden.filter((token) => source.includes(token));

  if (found.length > 0) {
    return fail(
      `packages/db/migrations/generated/truth-v1.sql contains camelCase physical column tokens: ${found.join(", ")}`,
      [
        "Replace createdBy/updatedBy with created_by/updated_by in raw SQL",
        "Replace deletedAt with deleted_at in raw SQL",
      ]
    );
  }

  return pass("trigger SQL does not reference camelCase physical columns");
}

function runChecks() {
  const auditColumns = readFileSync(files.auditColumns, "utf-8");
  const timestamps = readFileSync(files.timestamps, "utf-8");
  const triggers = readFileSync(files.triggers, "utf-8");

  return [
    {
      name: "audit-columns-explicit-snake-case",
      ...checkAuditColumns(auditColumns),
    },
    {
      name: "timestamp-columns-explicit-snake-case",
      ...checkTimestamps(timestamps),
    },
    {
      name: "trigger-sql-no-camel-physical-columns",
      ...checkTriggerSql(triggers),
    },
  ];
}

function main() {
  console.log("🔍 Running casing CI gate checks...\n");

  const results = runChecks();
  const failed = results.filter((result) => !result.pass);

  for (const result of results) {
    const icon = result.pass ? "✓" : "✗";
    console.log(`${icon} ${result.name} — ${result.message}`);
    if (!result.pass && result.fixes?.length) {
      for (const fix of result.fixes) {
        console.log(`  - ${fix}`);
      }
    }
  }

  if (failed.length > 0) {
    console.log(`\n❌ Casing CI gate failed with ${failed.length} issue(s)`);
    process.exit(1);
  }

  console.log("\n✅ Casing CI gate passed");
}

main();