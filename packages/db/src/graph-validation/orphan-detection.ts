/**
 * Orphan Detection Queries
 * =========================
 * Generates and executes LEFT JOIN queries to detect orphaned child records
 * (records with FK pointing to non-existent parent).
 */

import { sql } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import type { FkRelationship } from "./fk-catalog.js";

export interface OrphanQueryResult {
  childTable: string;
  parentTable: string;
  fkColumn: string;
  orphanCount: number;
  sampleIds: string[]; // Up to 10 sample orphaned record IDs
}

export interface OrphanDetectionResults {
  total: number;
  byTable: Map<string, OrphanQueryResult[]>;
  byPriority: {
    P0: OrphanQueryResult[];
    P1: OrphanQueryResult[];
    P2: OrphanQueryResult[];
    P3: OrphanQueryResult[];
  };
  criticalViolations: OrphanQueryResult[]; // P0 + P1 with count > 0
}

function qualifyTableName(tableName: string): string {
  return tableName.includes(".") ? tableName : `sales.${tableName}`;
}

/**
 * Generate orphan detection query for a single FK relationship
 */
function generateOrphanQuery(relationship: FkRelationship): string {
  const {
    childTableSchema,
    childTableName,
    childColumnName,
    parentTableSchema,
    parentTableName,
    parentColumnName,
  } = relationship;

  // Template: Find child records where parent doesn't exist
  return `
    SELECT
      '${childTableName}' AS child_table,
      '${parentTableName}' AS parent_table,
      '${childColumnName}' AS fk_column,
      COUNT(*) AS orphan_count,
      ARRAY_AGG(c.id ORDER BY c.created_at DESC LIMIT 10) AS sample_ids
    FROM ${childTableSchema}.${childTableName} c
    LEFT JOIN ${parentTableSchema}.${parentTableName} p
      ON c.${childColumnName} = p.${parentColumnName}
    WHERE c.${childColumnName} IS NOT NULL  -- Exclude intentional NULLs
      AND p.${parentColumnName} IS NULL     -- Parent doesn't exist
    GROUP BY child_table, parent_table, fk_column
    HAVING COUNT(*) > 0
  `.trim();
}

/**
 * Execute orphan detection for a single FK relationship
 */
async function detectOrphansForFK(
  db: PostgresJsDatabase<any>,
  relationship: FkRelationship
): Promise<OrphanQueryResult | null> {
  const query = generateOrphanQuery(relationship);

  try {
    const result = await db.execute(sql.raw(query));

    if (result.rows.length === 0) {
      return null; // No orphans found
    }

    const row = result.rows[0] as any;
    return {
      childTable: row.child_table,
      parentTable: row.parent_table,
      fkColumn: row.fk_column,
      orphanCount: Number(row.orphan_count),
      sampleIds: row.sample_ids || [],
    };
  } catch (error) {
    console.error(
      `❌ Error detecting orphans for ${relationship.childTableName}.${relationship.childColumnName}:`,
      error
    );
    return null;
  }
}

/**
 * Execute orphan detection for all FK relationships
 */
export async function detectAllOrphans(
  db: PostgresJsDatabase<any>,
  relationships: FkRelationship[],
  priorityFilter?: "P0" | "P1" | "P2" | "P3"
): Promise<OrphanDetectionResults> {
  console.log(`🔍 Detecting orphaned records...`);

  const filteredRelationships = priorityFilter
    ? relationships.filter((r) => r.validationPriority === priorityFilter)
    : relationships;

  console.log(`   Checking ${filteredRelationships.length} FK relationships...`);

  const results: OrphanQueryResult[] = [];
  const byTable = new Map<string, OrphanQueryResult[]>();

  // Execute queries in batches to avoid overwhelming the database
  const batchSize = 10;
  for (let i = 0; i < filteredRelationships.length; i += batchSize) {
    const batch = filteredRelationships.slice(i, i + batchSize);

    const batchResults = await Promise.all(batch.map((rel) => detectOrphansForFK(db, rel)));

    for (const result of batchResults) {
      if (result) {
        results.push(result);

        // Group by child table
        const tableResults = byTable.get(result.childTable) || [];
        tableResults.push(result);
        byTable.set(result.childTable, tableResults);
      }
    }

    console.log(
      `   Progress: ${Math.min(i + batchSize, filteredRelationships.length)}/${filteredRelationships.length}`
    );
  }

  // Group by priority
  const byPriority = {
    P0: [] as OrphanQueryResult[],
    P1: [] as OrphanQueryResult[],
    P2: [] as OrphanQueryResult[],
    P3: [] as OrphanQueryResult[],
  };

  for (const result of results) {
    const relationship = filteredRelationships.find(
      (r) =>
        r.childTableName === result.childTable &&
        r.parentTableName === result.parentTable &&
        r.childColumnName === result.fkColumn
    );
    if (relationship) {
      byPriority[relationship.validationPriority].push(result);
    }
  }

  const criticalViolations = [...byPriority.P0, ...byPriority.P1];

  console.log(`✅ Orphan detection complete`);
  console.log(`   Total orphans found: ${results.reduce((sum, r) => sum + r.orphanCount, 0)}`);
  console.log(`   Tables affected: ${byTable.size}`);
  console.log(`   Critical violations (P0+P1): ${criticalViolations.length}`);

  return {
    total: results.reduce((sum, r) => sum + r.orphanCount, 0),
    byTable,
    byPriority,
    criticalViolations,
  };
}

/**
 * Generate DELETE SQL for orphan cleanup execution.
 */
export function generateDeleteSQL(result: OrphanQueryResult): string {
  return `
DELETE FROM ${qualifyTableName(result.childTable)}
WHERE ${result.fkColumn} NOT IN (
  SELECT id FROM ${qualifyTableName(result.parentTable)}
);
  `.trim();
}

/**
 * Generate cleanup SQL for orphaned records
 */
export function generateCleanupSQL(result: OrphanQueryResult, dryRun = true): string {
  const { childTable, sampleIds } = result;
  const deleteSql = generateDeleteSQL(result);

  if (dryRun) {
    return `
-- DRY RUN: Orphaned records in ${childTable} (${result.orphanCount} total)
-- Sample IDs: ${sampleIds.join(", ")}
--
-- To delete these records, run:
-- ${deleteSql.replace(/\n/g, "\n-- ")}
    `.trim();
  }

  return `
-- CLEANUP: Delete orphaned records from ${childTable}
${deleteSql}
-- Expected to delete: ${result.orphanCount} records
  `.trim();
}
