/**
 * Default database singleton — backward-compatible with pre-factory API.
 *
 * For custom logging or pool config, use createDatabase() from "@afenda/db/client".
 */
import { createDatabase, createServerlessDatabase } from "./client/index.js";

const _default = createDatabase();

export const db = _default.db;
export const pool = _default.pool;
export const getPoolStats = _default.getPoolStats;
export const checkDatabaseConnection = _default.checkDatabaseConnection;
/** Drain the default pool; call on process shutdown in long-running servers. */
export const closeDatabase = _default.close;
export const dbServerless = createServerlessDatabase();

export type {
  Database,
  DatabaseOptions,
  DrizzleLogger,
  PoolStats,
  ServerlessDatabaseOptions,
} from "./client/index.js";
