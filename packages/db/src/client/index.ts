import { drizzle as drizzlePg } from "drizzle-orm/node-postgres";
import { drizzle as drizzleNeon } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import { Pool, type PoolConfig } from "pg";

import * as schema from "../schema/index.js";
import { relations } from "../relations.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface DrizzleLogger {
  logQuery(query: string, params: unknown[]): void;
}

export interface DatabaseOptions {
  /** PostgreSQL connection string. Defaults to DATABASE_URL env var. */
  connectionString?: string;
  /** Custom query logger. Defaults to console logger. */
  logger?: DrizzleLogger | boolean;
  /** Pool configuration overrides. */
  poolConfig?: Partial<PoolConfig>;
}

export type Database = ReturnType<typeof drizzlePg>;

export interface DatabaseInstance {
  db: Database;
  pool: Pool;
  getPoolStats: () => PoolStats;
  checkDatabaseConnection: () => Promise<void>;
}

export interface PoolStats {
  totalCount: number;
  idleCount: number;
  waitingCount: number;
}

// ---------------------------------------------------------------------------
// Defaults
// ---------------------------------------------------------------------------

const DEFAULT_LOCAL_TEST_DATABASE_URL =
  "postgresql://postgres:postgres@localhost:5433/afenda_test";

const DEFAULT_POOL_CONFIG: Partial<PoolConfig> = {
  max: 10,
  idleTimeoutMillis: 10_000,
  connectionTimeoutMillis: 5_000,
  statement_timeout: 30_000,
  idle_in_transaction_session_timeout: 60_000,
};

function resolveDatabaseUrl(connectionString?: string): string {
  if (connectionString) return connectionString;
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  if (process.env.VITEST) return DEFAULT_LOCAL_TEST_DATABASE_URL;
  throw new Error("DATABASE_URL is required for @afenda/db");
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

/**
 * Create a configured database instance with pool and health utilities.
 *
 * @example
 * ```ts
 * // Default — console logging, env-based connection
 * const { db, pool } = createDatabase();
 *
 * // Custom — Pino logger, tuned pool
 * const { db, pool } = createDatabase({
 *   logger: new PinoDrizzleLogger(500),
 *   poolConfig: { max: 20 },
 * });
 * ```
 */
export function createDatabase(options: DatabaseOptions = {}): DatabaseInstance {
  const connectionString = resolveDatabaseUrl(options.connectionString);

  const pool = new Pool({
    connectionString,
    ...DEFAULT_POOL_CONFIG,
    ...options.poolConfig,
  });

  pool.on("error", (err) => {
    console.error("[DB Pool Error]", err);
  });

  if (process.env.DB_POOL_DEBUG === "true") {
    pool.on("connect", () => {
      console.debug("[DB Pool]", {
        total: pool.totalCount,
        idle: pool.idleCount,
        waiting: pool.waitingCount,
      });
    });
  }

  const db = drizzlePg({
    client: pool,
    schema,
    relations,
    casing: "camelCase",
    logger: options.logger,
  });

  function getPoolStats(): PoolStats {
    return {
      totalCount: pool.totalCount,
      idleCount: pool.idleCount,
      waitingCount: pool.waitingCount,
    };
  }

  async function checkDatabaseConnection(): Promise<void> {
    await pool.query("SELECT 1");
  }

  return { db, pool, getPoolStats, checkDatabaseConnection };
}

// ---------------------------------------------------------------------------
// Serverless factory (for edge/serverless environments)
// ---------------------------------------------------------------------------

export function createServerlessDatabase(connectionString?: string) {
  const url = resolveDatabaseUrl(connectionString);
  const sql = neon(url);
  return drizzleNeon({ client: sql, schema, relations, casing: "camelCase" });
}

export type ServerlessDatabase = ReturnType<typeof createServerlessDatabase>;
