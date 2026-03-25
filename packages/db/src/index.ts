/**
 * @afenda/db public API
 *
 * Exports: Database (db, pool, Database type), shared types, session, RLS
 * Internal (_private/): Migration scripts, Drizzle adapters
 */

export { db, pool, type Database } from "./db.js";

export * from "./_shared/index.js";
export * from "./_session/index.js";
export * from "./_rls/index.js";
