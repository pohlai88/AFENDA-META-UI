/**
 * @afenda/db public API
 *
 * Exports: Database (db, pool, Database type), shared types, session, RLS
 * Internal (_private/): Migration scripts, Drizzle adapters
 */

export { db, pool, getPoolStats, checkDatabaseConnection, type Database } from "./db.js";
export { relations } from "./relations.js";

export * from "./_shared/index.js";
export * from "./_session/index.js";
export * from "./_rls/index.js";
