/**
 * FK Metadata Extraction & Catalog
 * =================================
 * Extracts all Foreign Key constraints from the database schema
 * and builds a structured catalog for validation purposes.
 */

import { sql } from "drizzle-orm";
import type { GraphValidationDb } from "./db-types.js";

/**
 * Default Postgres schemas included when the CLI does not pass `--schema=`.
 * Aligns with ERP `pgSchema(...)` modules (core, domains, reference, security).
 */
export const DEFAULT_ERP_SCHEMAS: readonly string[] = [
  "core",
  "hr",
  "sales",
  "inventory",
  "accounting",
  "purchasing",
  "reference",
  "security",
];

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
  /** Schemas whose FK constraints were loaded (sorted copy of the filter). */
  schemasCovered: string[];
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
function normalizeSchemaFilter(schemaFilter: string | readonly string[]): string[] {
  const list = typeof schemaFilter === "string" ? [schemaFilter] : [...schemaFilter];
  return list.map((s) => s.trim()).filter(Boolean);
}

export async function extractFkConstraints(
  db: GraphValidationDb,
  schemaFilter: string | readonly string[] = DEFAULT_ERP_SCHEMAS
): Promise<FkConstraint[]> {
  const schemas = normalizeSchemaFilter(schemaFilter);
  if (schemas.length === 0) {
    return [];
  }

  const schemaTuple = sql.join(schemas.map((s) => sql`${s}`), sql`, `);

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
      AND tc.table_schema IN (${schemaTuple})
    ORDER BY tc.table_schema, tc.table_name, kcu.column_name;
  `;

  const results = await db.execute(query);
  return results.rows as unknown as FkConstraint[];
}

/**
 * Check if column is nullable (determines if FK is optional)
 */
async function isColumnNullable(
  db: GraphValidationDb,
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
  db: GraphValidationDb,
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
 * Determine validation priority from FK shape (domain-agnostic heuristics).
 * Exported for unit tests; CLI/catalog use this internally.
 */
export function determineFkValidationPriority(constraint: FkConstraint): "P0" | "P1" | "P2" | "P3" {
  const { parentTableName, childTableName, childColumnName, deleteRule } = constraint;
  const parentLower = parentTableName.toLowerCase();
  const childLower = childTableName.toLowerCase();
  const colLower = childColumnName.toLowerCase();

  // P0: Tenant root references (any ERP schema)
  if (parentLower === "tenants" && colLower === "tenant_id") {
    return "P0";
  }
  if (parentLower === "tenants") {
    return "P0";
  }

  // P1: Cascading deletes, audit/history surfaces, user anchors
  if (deleteRule === "CASCADE") {
    return "P1";
  }
  if (
    childLower.includes("_history") ||
    childLower.includes("_log") ||
    childLower.includes("_audit")
  ) {
    return "P1";
  }
  if (parentLower === "users" || parentLower.endsWith("_users")) {
    return "P1";
  }

  // P2: Fiscal / pricing / tax configuration parents (name-based heuristic)
  if (
    parentLower.includes("tax") ||
    parentLower.includes("pricelist") ||
    parentLower.includes("payment_term") ||
    parentLower.includes("fiscal")
  ) {
    return "P2";
  }

  return "P3";
}

/**
 * Build comprehensive FK validation catalog
 */
export async function buildFkCatalog(
  db: GraphValidationDb,
  schemaFilter: string | readonly string[] = DEFAULT_ERP_SCHEMAS
): Promise<FkValidationCatalog> {
  const schemas = normalizeSchemaFilter(schemaFilter);
  const schemasLabel = schemas.join(", ");
  console.log(`📊 Extracting FK constraints from schema(s): ${schemasLabel}...`);
  const constraints = await extractFkConstraints(db, schemas);
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
      validationPriority: determineFkValidationPriority(constraint),
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
    schemasCovered: [...schemas].sort(),
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
