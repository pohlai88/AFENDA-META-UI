/**
 * Full HR schema wipe — no table omitted. Uses one TRUNCATE … CASCADE batch so FK order
 * is handled by Postgres (self-referential and cross-table FKs included).
 *
 * Must run inside the same transaction as the rest of `clearExistingData`.
 */
import { sql } from "drizzle-orm";

import type { Tx } from "./seed-types.js";

/** Schemas cleared with TRUNCATE (not listed in SEED_CLEAR_TABLES_IN_DELETE_ORDER). */
export const TRUNCATE_MANAGED_SCHEMAS = ["hr"] as const;

function quotePgIdent(schema: string, table: string): string {
  const q = (s: string) => `"${s.replace(/"/g, '""')}"`;
  return `${q(schema)}.${q(table)}`;
}

export async function truncateAllHrTables(tx: Tx): Promise<void> {
  const rows = await tx.execute(sql`
    SELECT tablename AS "tableName"
    FROM pg_tables
    WHERE schemaname = 'hr'
    ORDER BY tablename
  `);
  const list = (rows.rows as { tableName: string }[]).map((r) => r.tableName);
  if (list.length === 0) {
    console.log("   (hr schema: no tables — skip truncate)");
    return;
  }
  const tablesSql = list.map((t) => quotePgIdent("hr", t)).join(", ");
  await tx.execute(sql.raw(`TRUNCATE TABLE ${tablesSql} RESTART IDENTITY`));
  console.log(`✓ Truncated hr schema (${list.length} tables)`);
}
