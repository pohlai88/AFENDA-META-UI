/**
 * Index Remediation
 * =================
 * Detects missing indexes on FK columns and generates CREATE INDEX statements
 * to improve JOIN and lookup performance.
 */

import { sql } from "drizzle-orm";
import type { GraphValidationDb } from "./db-types.js";
import type { FkRelationship } from "./fk-catalog.js";

export interface MissingIndexResult {
  childTable: string;
  childColumn: string;
  priority: "P0" | "P1" | "P2" | "P3";
  indexName: string; // Suggested index name
  hasIndex: boolean;
}

export interface MissingIndexDetectionResults {
  total: number;
  missing: number;
  byTable: Map<string, MissingIndexResult[]>;
  byPriority: {
    P0: MissingIndexResult[];
    P1: MissingIndexResult[];
    P2: MissingIndexResult[];
    P3: MissingIndexResult[];
  };
  allResults: MissingIndexResult[];
}

function generateIndexName(tableName: string, columnName: string): string {
  // Convention: idx_{tablename}_{columnname}
  const baseTableName = tableName.includes(".") ? tableName.split(".")[1] : tableName;
  return `idx_${baseTableName}_${columnName}`;
}

/**
 * Check if a column already has an index
 */
async function columnHasIndex(
  db: GraphValidationDb,
  schema: string,
  table: string,
  column: string
): Promise<boolean> {
  const query = sql<{ hasIndex: number }>`
    SELECT COUNT(*) AS "hasIndex"
    FROM information_schema.statistics
    WHERE table_schema = ${schema}
      AND table_name = ${table}
      AND column_name = ${column}
      AND seq_in_index = 1
  `;

  const result = await db.execute(query);
  const count = Number(result.rows[0]?.hasIndex ?? 0);
  return count > 0;
}

/**
 * Detect missing indexes on FK columns
 */
export async function detectMissingFkIndexes(
  db: GraphValidationDb,
  relationships: FkRelationship[],
  tier?: "P0" | "P1" | "P2" | "P3"
): Promise<MissingIndexDetectionResults> {
  const filtered = tier
    ? relationships.filter((r) => r.validationPriority === tier)
    : relationships;

  const results: MissingIndexResult[] = [];

  for (const relationship of filtered) {
    const { childTableSchema, childTableName, childColumnName, validationPriority } = relationship;

    const hasIndex = await columnHasIndex(db, childTableSchema, childTableName, childColumnName);

    results.push({
      childTable: `${childTableSchema}.${childTableName}`,
      childColumn: childColumnName,
      priority: validationPriority,
      indexName: generateIndexName(childTableName, childColumnName),
      hasIndex,
    });
  }

  const missingIndexes = results.filter((r) => !r.hasIndex);

  // Group by table
  const byTable = new Map<string, MissingIndexResult[]>();
  for (const result of results) {
    if (!byTable.has(result.childTable)) {
      byTable.set(result.childTable, []);
    }
    byTable.get(result.childTable)!.push(result);
  }

  // Group by priority
  const byPriority = {
    P0: results.filter((r) => r.priority === "P0" && !r.hasIndex),
    P1: results.filter((r) => r.priority === "P1" && !r.hasIndex),
    P2: results.filter((r) => r.priority === "P2" && !r.hasIndex),
    P3: results.filter((r) => r.priority === "P3" && !r.hasIndex),
  };

  return {
    total: results.length,
    missing: missingIndexes.length,
    byTable,
    byPriority,
    allResults: results,
  };
}

/**
 * Generate CREATE INDEX statement for a missing FK column
 */
export function generateCreateIndexSQL(result: MissingIndexResult): string {
  const { childTable, childColumn, indexName } = result;
  return `CREATE INDEX CONCURRENTLY ${indexName} ON ${childTable} (${childColumn});`;
}

/**
 * Generate complete remediation SQL script with all suggested indexes
 */
export function generateRemediationScript(results: MissingIndexResult[], _dryRun = true): string {
  const missingIndexes = results.filter((r) => !r.hasIndex);

  if (missingIndexes.length === 0) {
    return "-- No missing indexes on FK columns";
  }

  const lines: string[] = [
    "-- Missing Index Remediation Script",
    "-- ===============================",
    `-- Generated: ${new Date().toISOString()}`,
    `-- Total FK columns: ${results.length}`,
    `-- Missing indexes: ${missingIndexes.length}`,
    "",
    "-- Summary by Priority:",
  ];

  const byPriority = {
    P0: missingIndexes.filter((r) => r.priority === "P0").length,
    P1: missingIndexes.filter((r) => r.priority === "P1").length,
    P2: missingIndexes.filter((r) => r.priority === "P2").length,
    P3: missingIndexes.filter((r) => r.priority === "P3").length,
  };

  lines.push(`--   P0 (Critical):  ${byPriority.P0} missing`);
  lines.push(`--   P1 (High):      ${byPriority.P1} missing`);
  lines.push(`--   P2 (Medium):    ${byPriority.P2} missing`);
  lines.push(`--   P3 (Low):       ${byPriority.P3} missing`);
  lines.push("");

  // Group by priority and add statements
  const stmt = (group: MissingIndexResult[], priority: string) => {
    if (group.length === 0) return;

    lines.push(`-- ${priority} Indexes`);
    for (const result of group) {
      lines.push(`-- ${result.childTable}.${result.childColumn}`);
      lines.push(generateCreateIndexSQL(result));
    }
    lines.push("");
  };

  stmt(
    missingIndexes.filter((r) => r.priority === "P0"),
    "P0 (Critical)"
  );
  stmt(
    missingIndexes.filter((r) => r.priority === "P1"),
    "P1 (High)"
  );
  stmt(
    missingIndexes.filter((r) => r.priority === "P2"),
    "P2 (Medium)"
  );
  stmt(
    missingIndexes.filter((r) => r.priority === "P3"),
    "P3 (Low)"
  );

  return lines.join("\n");
}
