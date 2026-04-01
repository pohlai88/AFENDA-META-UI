/**
 * Orphan Detection Queries
 * =========================
 * Generates and executes LEFT JOIN queries to detect orphaned child records
 * (records with FK pointing to non-existent parent).
 *
 * Queries avoid assuming `id` / `created_at` on child tables; samples use the FK
 * column values. DELETE helpers use NOT EXISTS against the actual referenced key.
 */

import { sql } from "drizzle-orm";
import type { GraphValidationDb } from "./db-types.js";
import type { FkRelationship } from "./fk-catalog.js";

export interface OrphanQueryResult {
  /** Child table schema (Postgres). */
  childTableSchema: string;
  /** Child table name without schema. */
  childTableName: string;
  /** Parent table schema. */
  parentTableSchema: string;
  /** Parent table name without schema. */
  parentTableName: string;
  /**
   * Qualified child table for grouping / display (`schema.table`).
   * @deprecated Prefer childTableSchema + childTableName; kept for CLI compatibility.
   */
  childTable: string;
  /**
   * Qualified parent reference for display (`schema.table`).
   * @deprecated Prefer parentTableSchema + parentTableName.
   */
  parentTable: string;
  fkColumn: string;
  /** Referenced parent column (PK or unique target). */
  parentColumn: string;
  orphanCount: number;
  /** Sample orphan FK values (as text), not assumed to be surrogate `id`. */
  sampleIds: string[];
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

function qualifiedTable(schema: string, table: string): string {
  return `${schema}.${table}`;
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

  return `
    SELECT
      '${childTableSchema}' AS child_table_schema,
      '${childTableName}' AS child_table,
      '${parentTableSchema}' AS parent_table_schema,
      '${parentTableName}' AS parent_table,
      '${childColumnName}' AS fk_column,
      '${parentColumnName}' AS parent_column,
      COALESCE((
        SELECT COUNT(*)::bigint
        FROM ${childTableSchema}.${childTableName} c
        LEFT JOIN ${parentTableSchema}.${parentTableName} p
          ON c.${childColumnName} = p.${parentColumnName}
        WHERE c.${childColumnName} IS NOT NULL
          AND p.${parentColumnName} IS NULL
      ), 0) AS orphan_count,
      COALESCE((
        SELECT array_agg(x.k)
        FROM (
          SELECT c2.${childColumnName}::text AS k
          FROM ${childTableSchema}.${childTableName} c2
          LEFT JOIN ${parentTableSchema}.${parentTableName} p2
            ON c2.${childColumnName} = p2.${parentColumnName}
          WHERE c2.${childColumnName} IS NOT NULL
            AND p2.${parentColumnName} IS NULL
          ORDER BY c2.ctid DESC
          LIMIT 10
        ) x
      ), ARRAY[]::text[]) AS sample_ids
  `.trim();
}

/**
 * Execute orphan detection for a single FK relationship
 */
async function detectOrphansForFK(
  db: GraphValidationDb,
  relationship: FkRelationship
): Promise<OrphanQueryResult | null> {
  const query = generateOrphanQuery(relationship);

  try {
    const result = await db.execute(sql.raw(query));

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0] as Record<string, unknown>;
    const orphanCount = Number(row.orphan_count ?? 0);
    if (!Number.isFinite(orphanCount) || orphanCount <= 0) {
      return null;
    }

    const childSchema = String(row.child_table_schema ?? relationship.childTableSchema);
    const childName = String(row.child_table ?? relationship.childTableName);
    const parentSchema = String(row.parent_table_schema ?? relationship.parentTableSchema);
    const parentName = String(row.parent_table ?? relationship.parentTableName);
    const fkCol = String(row.fk_column ?? relationship.childColumnName);
    const parentCol = String(row.parent_column ?? relationship.parentColumnName);
    const rawSamples = row.sample_ids;
    const sampleIds = Array.isArray(rawSamples)
      ? rawSamples.map((s) => String(s))
      : rawSamples == null
        ? []
        : [];

    return {
      childTableSchema: childSchema,
      childTableName: childName,
      parentTableSchema: parentSchema,
      parentTableName: parentName,
      childTable: qualifiedTable(childSchema, childName),
      parentTable: qualifiedTable(parentSchema, parentName),
      fkColumn: fkCol,
      parentColumn: parentCol,
      orphanCount,
      sampleIds,
    };
  } catch (error) {
    const ctx = `${relationship.childTableSchema}.${relationship.childTableName}.${relationship.childColumnName} → ${relationship.parentTableSchema}.${relationship.parentTableName}`;
    const msg = error instanceof Error ? error.message : String(error);
    throw new Error(`Orphan detection failed (FK ${ctx}): ${msg}`, { cause: error });
  }
}

/**
 * Execute orphan detection for all FK relationships
 */
export async function detectAllOrphans(
  db: GraphValidationDb,
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

  const batchSize = 10;
  for (let i = 0; i < filteredRelationships.length; i += batchSize) {
    const batch = filteredRelationships.slice(i, i + batchSize);

    const batchResults = await Promise.all(batch.map((rel) => detectOrphansForFK(db, rel)));

    for (const result of batchResults) {
      if (result) {
        results.push(result);

        const tableKey = result.childTable;
        const tableResults = byTable.get(tableKey) || [];
        tableResults.push(result);
        byTable.set(tableKey, tableResults);
      }
    }

    console.log(
      `   Progress: ${Math.min(i + batchSize, filteredRelationships.length)}/${filteredRelationships.length}`
    );
  }

  const byPriority = {
    P0: [] as OrphanQueryResult[],
    P1: [] as OrphanQueryResult[],
    P2: [] as OrphanQueryResult[],
    P3: [] as OrphanQueryResult[],
  };

  for (const result of results) {
    const relationship = filteredRelationships.find(
      (r) =>
        r.childTableSchema === result.childTableSchema &&
        r.childTableName === result.childTableName &&
        r.parentTableSchema === result.parentTableSchema &&
        r.parentTableName === result.parentTableName &&
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
 * Generate DELETE SQL for orphan cleanup execution (uses actual FK + parent key columns).
 */
export function generateDeleteSQL(result: OrphanQueryResult): string {
  const childQ = qualifiedTable(result.childTableSchema, result.childTableName);
  const parentQ = qualifiedTable(result.parentTableSchema, result.parentTableName);
  return `
DELETE FROM ${childQ} c
WHERE c.${result.fkColumn} IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM ${parentQ} p
    WHERE p.${result.parentColumn} = c.${result.fkColumn}
  );
  `.trim();
}

/**
 * Generate cleanup SQL for orphaned records
 */
export function generateCleanupSQL(result: OrphanQueryResult, dryRun = true): string {
  const deleteSql = generateDeleteSQL(result);
  const label = result.childTable;

  if (dryRun) {
    return `
-- DRY RUN: Orphaned records in ${label} (${result.orphanCount} total)
-- Sample FK values: ${result.sampleIds.join(", ")}
--
-- To delete these records, run:
-- ${deleteSql.replace(/\n/g, "\n-- ")}
    `.trim();
  }

  return `
-- CLEANUP: Delete orphaned records from ${label}
${deleteSql}
-- Expected to delete: ${result.orphanCount} records
  `.trim();
}
