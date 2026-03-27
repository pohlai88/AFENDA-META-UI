/**
 * FK Metadata Extraction & Catalog
 * =================================
 * Extracts all Foreign Key constraints from the database schema
 * and builds a structured catalog for validation purposes.
 */

import { sql } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";

export interface FkConstraint {
  constraintName: string;
  childTableSchema: string;
  childTableName: string;
  childColumnName: string;
  parentTableSchema: string;
  parentTableName: string;
  parentColumnName: string;
  deleteRule: "CASCADE" | "RESTRICT" | "SET NULL" | "NO ACTION" | "SET DEFAULT";
  updateRule: "CASCADE" | "RESTRICT" | "SET NULL" | "NO ACTION" | "SET DEFAULT";
}

export interface FkRelationship extends FkConstraint {
  relationshipType: "one-to-many" | "many-to-one" | "many-to-many";
  isOptional: boolean; // Based on NULL constraint
  validationPriority: "P0" | "P1" | "P2" | "P3";
  tenantIsolated: boolean; // Both tables have tenant_id
}

export interface FkValidationCatalog {
  relationships: FkRelationship[];
  tables: {
    tableName: string;
    parentRelationships: FkRelationship[]; // This table is the parent
    childRelationships: FkRelationship[]; // This table is the child
  }[];
  byPriority: {
    P0: FkRelationship[];
    P1: FkRelationship[];
    P2: FkRelationship[];
    P3: FkRelationship[];
  };
}

/**
 * Extract all FK constraints from information_schema
 */
export async function extractFkConstraints(
  db: PostgresJsDatabase<any>,
  schemaFilter = "sales"
): Promise<FkConstraint[]> {
  const query = sql<FkConstraint>`
    SELECT
      tc.constraint_name AS "constraintName",
      tc.table_schema AS "childTableSchema",
      tc.table_name AS "childTableName",
      kcu.column_name AS "childColumnName",
      ccu.table_schema AS "parentTableSchema",
      ccu.table_name AS "parentTableName",
      ccu.column_name AS "parentColumnName",
      rc.delete_rule AS "deleteRule",
      rc.update_rule AS "updateRule"
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    JOIN information_schema.referential_constraints rc
      ON tc.constraint_name = rc.constraint_name
      AND tc.table_schema = rc.constraint_schema
    JOIN information_schema.constraint_column_usage ccu
      ON rc.unique_constraint_name = ccu.constraint_name
      AND rc.unique_constraint_schema = ccu.constraint_schema
    WHERE tc.constraint_type = 'FOREIGN KEY'
      AND tc.table_schema = ${schemaFilter}
    ORDER BY tc.table_name, kcu.column_name;
  `;

  const results = await db.execute(query);
  return results.rows as FkConstraint[];
}

/**
 * Check if column is nullable (determines if FK is optional)
 */
async function isColumnNullable(
  db: PostgresJsDatabase<any>,
  schema: string,
  table: string,
  column: string
): Promise<boolean> {
  const query = sql<{ isNullable: string }>`
    SELECT is_nullable AS "isNullable"
    FROM information_schema.columns
    WHERE table_schema = ${schema}
      AND table_name = ${table}
      AND column_name = ${column};
  `;

  const result = await db.execute(query);
  return result.rows[0]?.isNullable === "YES";
}

/**
 * Check if table has tenant_id column (for tenant isolation validation)
 */
async function hasTenantColumn(
  db: PostgresJsDatabase<any>,
  schema: string,
  table: string
): Promise<boolean> {
  const query = sql<{ count: number }>`
    SELECT COUNT(*) AS count
    FROM information_schema.columns
    WHERE table_schema = ${schema}
      AND table_name = ${table}
      AND column_name = 'tenant_id';
  `;

  const result = await db.execute(query);
  return Number(result.rows[0]?.count) > 0;
}

/**
 * Determine validation priority based on FK properties
 */
function determineValidationPriority(constraint: FkConstraint): "P0" | "P1" | "P2" | "P3" {
  const { parentTableName, childTableName, deleteRule } = constraint;

  // P0 (Critical): Tenant isolation, core entities
  if (
    parentTableName === "tenants" ||
    (parentTableName === "partners" && childTableName === "sales_orders") ||
    (parentTableName === "sales_orders" && childTableName === "sales_order_lines") ||
    (parentTableName === "products" && childTableName === "sales_order_lines")
  ) {
    return "P0";
  }

  // P1 (High): Important business relationships
  if (
    deleteRule === "CASCADE" || // Cascade relationships are critical
    parentTableName === "users" || // Audit trail integrity
    childTableName.includes("_history") || // History tables
    childTableName.includes("_log") // Event logs
  ) {
    return "P1";
  }

  // P2 (Medium): Business configuration tables
  if (
    parentTableName.includes("tax") ||
    parentTableName.includes("pricelist") ||
    parentTableName.includes("payment_term") ||
    parentTableName.includes("fiscal")
  ) {
    return "P2";
  }

  // P3 (Low): Reference data
  return "P3";
}

/**
 * Build comprehensive FK validation catalog
 */
export async function buildFkCatalog(
  db: PostgresJsDatabase<any>,
  schemaFilter = "sales"
): Promise<FkValidationCatalog> {
  console.log(`📊 Extracting FK constraints from schema: ${schemaFilter}...`);
  const constraints = await extractFkConstraints(db, schemaFilter);
  console.log(`   Found ${constraints.length} FK constraints`);

  console.log(`🔍 Enriching FK metadata...`);
  const relationships: FkRelationship[] = [];

  for (const constraint of constraints) {
    const isOptional = await isColumnNullable(
      db,
      constraint.childTableSchema,
      constraint.childTableName,
      constraint.childColumnName
    );

    const childHasTenant = await hasTenantColumn(
      db,
      constraint.childTableSchema,
      constraint.childTableName
    );

    const parentHasTenant = await hasTenantColumn(
      db,
      constraint.parentTableSchema,
      constraint.parentTableName
    );

    const relationship: FkRelationship = {
      ...constraint,
      relationshipType: "one-to-many", // Most FKs are one-to-many
      isOptional,
      validationPriority: determineValidationPriority(constraint),
      tenantIsolated: childHasTenant && parentHasTenant,
    };

    relationships.push(relationship);
  }

  console.log(`📁 Building table-level catalog...`);
  // Group relationships by table
  const tableMap = new Map<
    string,
    { parentRelationships: FkRelationship[]; childRelationships: FkRelationship[] }
  >();

  for (const rel of relationships) {
    // Parent table entry
    const parentKey = `${rel.parentTableSchema}.${rel.parentTableName}`;
    if (!tableMap.has(parentKey)) {
      tableMap.set(parentKey, { parentRelationships: [], childRelationships: [] });
    }
    tableMap.get(parentKey)!.parentRelationships.push(rel);

    // Child table entry
    const childKey = `${rel.childTableSchema}.${rel.childTableName}`;
    if (!tableMap.has(childKey)) {
      tableMap.set(childKey, { parentRelationships: [], childRelationships: [] });
    }
    tableMap.get(childKey)!.childRelationships.push(rel);
  }

  const tables = Array.from(tableMap.entries()).map(([tableName, rels]) => ({
    tableName,
    ...rels,
  }));

  // Group by priority
  const byPriority = {
    P0: relationships.filter((r) => r.validationPriority === "P0"),
    P1: relationships.filter((r) => r.validationPriority === "P1"),
    P2: relationships.filter((r) => r.validationPriority === "P2"),
    P3: relationships.filter((r) => r.validationPriority === "P3"),
  };

  console.log(`✅ Catalog built successfully`);
  console.log(`   - Total relationships: ${relationships.length}`);
  console.log(`   - P0 (Critical): ${byPriority.P0.length}`);
  console.log(`   - P1 (High): ${byPriority.P1.length}`);
  console.log(`   - P2 (Medium): ${byPriority.P2.length}`);
  console.log(`   - P3 (Low): ${byPriority.P3.length}`);
  console.log(`   - Tenant-isolated: ${relationships.filter((r) => r.tenantIsolated).length}`);

  return {
    relationships,
    tables,
    byPriority,
  };
}

/**
 * Export catalog to JSON file for reference
 */
export async function exportCatalogToJson(
  catalog: FkValidationCatalog,
  outputPath: string
): Promise<void> {
  const fs = await import("fs/promises");
  await fs.writeFile(outputPath, JSON.stringify(catalog, null, 2), "utf-8");
  console.log(`📄 Catalog exported to: ${outputPath}`);
}
