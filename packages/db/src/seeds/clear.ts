/**
 * clearExistingData — wipes all seeded rows in FK-reverse dependency order.
 *
 * Protocol for new domains:
 *   - `hr`: entire schema truncated first via `truncateAllHrTables` (all tables, no omissions).
 *   - Other schemas: append to `SEED_CLEAR_TABLES_IN_DELETE_ORDER` (children before parents).
 *
 * Human-facing overview: ./README.md and ./ARCHITECTURE.md
 */

import { sql } from "drizzle-orm";

import { qualifiedTableName } from "./clear-plan.js";
import { truncateAllHrTables } from "./clear-hr-schema.js";
import { SEED_CLEAR_TABLES_IN_DELETE_ORDER } from "./clear-tables.js";
import { type Tx } from "./seed-types.js";

export { SEED_CLEAR_TABLES_IN_DELETE_ORDER } from "./clear-tables.js";

export async function clearExistingData(tx: Tx): Promise<void> {
  await truncateAllHrTables(tx);
  for (const table of SEED_CLEAR_TABLES_IN_DELETE_ORDER) {
    const fqn = qualifiedTableName(table);
    const regclassCheck = await tx.execute<{ rel: string | null }>(
      sql`select to_regclass(${fqn}) as rel`
    );
    const rel = (regclassCheck.rows[0] as { rel?: string | null } | undefined)?.rel ?? null;
    if (rel === null) {
      console.warn(`⚠ Skipping clear for missing relation in current DB: ${fqn}`);
      continue;
    }
    await tx.delete(table).execute();
  }
  console.log("✓ Cleared existing data (non–truncate-managed tables)");
}
