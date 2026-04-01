/**
 * Shared Drizzle DB type for graph-validation (`drizzle-orm/node-postgres`).
 * Uses `Record<string, unknown>` for the schema slot so it matches `drizzle({ client, schema })`
 * inference from the CLI without fighting ERP schema widening.
 */
import type { NodePgDatabase } from "drizzle-orm/node-postgres";

export type GraphValidationDb = NodePgDatabase<Record<string, unknown>>;
