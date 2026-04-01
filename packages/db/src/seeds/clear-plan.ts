/**
 * Clear plan utilities: map Drizzle clear list to qualified names and validate
 * ordering against live FK metadata (child must appear before parent in delete list).
 * Also detects tenant-scoped tables in selected schemas that are absent from the clear manifest (P3 drift).
 */

import { sql } from "drizzle-orm";
import { getTableConfig, type AnyPgTable } from "drizzle-orm/pg-core";

import {
  type FkConstraint,
  extractFkConstraints,
  DEFAULT_ERP_SCHEMAS,
} from "../graph-validation/fk-catalog.js";
import type { GraphValidationDb } from "../graph-validation/db-types.js";
import { TRUNCATE_MANAGED_SCHEMAS } from "./clear-hr-schema.js";
import { SEED_CLEAR_TABLES_IN_DELETE_ORDER } from "./clear-tables.js";

/**
 * Schemas where every `tenant_id` base table must be wiped by the seed clear path:
 * - listed in `SEED_CLEAR_TABLES_IN_DELETE_ORDER`, or
 * - schema in {@link TRUNCATE_MANAGED_SCHEMAS} (full `TRUNCATE` in `clearExistingData`).
 */
export const CLEAR_COVERAGE_SCHEMAS = ["sales", "hr"] as const;

const DEFAULT_NAMESPACE = "public";

export function qualifiedTableName(table: AnyPgTable): string {
  const cfg = getTableConfig(table);
  const schema = cfg.schema ?? DEFAULT_NAMESPACE;
  return `${schema}.${cfg.name}`;
}

/** FQNs in seed clear delete order (same order as `clearExistingData`). */
export function getSeedClearTableFqns(): string[] {
  return SEED_CLEAR_TABLES_IN_DELETE_ORDER.map((t) => qualifiedTableName(t));
}

function fqnKey(schema: string, name: string): string {
  return `${schema}.${name}`;
}

/**
 * For each FK where both child and parent are in `clearFqns`, the child must appear
 * earlier in the list than the parent (so deletes run child-first).
 */
export function validateClearOrderAgainstFkConstraints(
  clearFqns: readonly string[],
  constraints: readonly FkConstraint[]
): { ok: true } | { ok: false; violations: string[] } {
  const index = new Map<string, number>();
  clearFqns.forEach((fqn, i) => index.set(fqn, i));

  const violations: string[] = [];
  for (const fk of constraints) {
    const childFqn = fqnKey(fk.childTableSchema, fk.childTableName);
    const parentFqn = fqnKey(fk.parentTableSchema, fk.parentTableName);
    const ci = index.get(childFqn);
    const pi = index.get(parentFqn);
    if (ci === undefined || pi === undefined) {
      continue;
    }
    if (ci >= pi) {
      violations.push(
        `FK ${fk.constraintName}: child ${childFqn} (index ${ci}) must delete before parent ${parentFqn} (index ${pi})`
      );
    }
  }

  if (violations.length > 0) {
    return { ok: false, violations };
  }
  return { ok: true };
}

/** Pure helper for tests: FQNs present in DB but not in the clear manifest. */
export function fqnsMissingFromClearList(
  presentInDb: readonly string[],
  clearFqns: readonly string[]
): string[] {
  const lowerClear = new Set(clearFqns.map((f) => f.toLowerCase()));
  return presentInDb.filter((f) => !lowerClear.has(f.toLowerCase())).sort();
}

/**
 * Lists `schema.table` for base tables that have a `tenant_id` column (live DB).
 */
export async function queryTenantScopedTablesInSchemas(
  db: GraphValidationDb,
  schemas: readonly string[] = CLEAR_COVERAGE_SCHEMAS
): Promise<string[]> {
  if (schemas.length === 0) {
    return [];
  }
  const schemaTuple = sql.join(schemas.map((s) => sql`${s}`), sql`, `);
  const q = sql`
    SELECT DISTINCT t.table_schema AS "tableSchema", t.table_name AS "tableName"
    FROM information_schema.tables t
    WHERE t.table_schema IN (${schemaTuple})
      AND t.table_type = 'BASE TABLE'
      AND EXISTS (
        SELECT 1
        FROM information_schema.columns c
        WHERE c.table_schema = t.table_schema
          AND c.table_name = t.table_name
          AND c.column_name = 'tenant_id'
      )
    ORDER BY t.table_schema, t.table_name
  `;
  const r = await db.execute(q);
  const rows = r.rows as { tableSchema: string; tableName: string }[];
  return rows.map((row) => `${row.tableSchema}.${row.tableName}`);
}

export type ClearPlanReport = {
  clearTableCount: number;
  fkCheck: { ok: true } | { ok: false; violations: string[] };
  coverageCheck:
    | { ok: true }
    | { ok: false; missingFromClear: string[] };
};

/**
 * Loads FK constraints from the database and verifies seed clear order + sales tenant-table coverage.
 */
export async function generateClearPlanReport(db: GraphValidationDb): Promise<ClearPlanReport> {
  const clearFqns = getSeedClearTableFqns();
  const constraints = await extractFkConstraints(db, DEFAULT_ERP_SCHEMAS);
  const fkCheck = validateClearOrderAgainstFkConstraints(clearFqns, constraints);

  const tenantScoped = await queryTenantScopedTablesInSchemas(db, CLEAR_COVERAGE_SCHEMAS);
  const truncateSchemas = new Set<string>(TRUNCATE_MANAGED_SCHEMAS);
  const mustAppearInClearManifest = tenantScoped.filter((fqn) => {
    const schema = fqn.split(".")[0] ?? "";
    return !truncateSchemas.has(schema);
  });
  const missingFromClear = fqnsMissingFromClearList(mustAppearInClearManifest, clearFqns);
  const coverageCheck =
    missingFromClear.length === 0 ? { ok: true as const } : { ok: false as const, missingFromClear };

  return {
    clearTableCount: clearFqns.length,
    fkCheck,
    coverageCheck,
  };
}
