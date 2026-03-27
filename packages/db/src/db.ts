import { drizzle as drizzlePg } from "drizzle-orm/node-postgres";
import { drizzle as drizzleNeon } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import { Pool } from "pg";

import * as schema from "./schema/index.js";
import { relations } from "./relations.js";

const DEFAULT_LOCAL_TEST_DATABASE_URL = "postgresql://postgres:postgres@localhost:5433/afenda_test";

function resolveDatabaseUrl(): string {
  if (process.env.DATABASE_URL) {
    return process.env.DATABASE_URL;
  }

  if (process.env.VITEST) {
    return DEFAULT_LOCAL_TEST_DATABASE_URL;
  }

  throw new Error("DATABASE_URL is required for @afenda/db");
}

// ---------------------------------------------------------------------------
// Pool configuration — production-hardened
// ---------------------------------------------------------------------------
export const pool = new Pool({
  connectionString: resolveDatabaseUrl(),
  max: Number(process.env.DB_POOL_MAX ?? 10),
  idleTimeoutMillis: Number(process.env.DB_IDLE_TIMEOUT_MS ?? 10_000),
  connectionTimeoutMillis: Number(process.env.DB_CONNECTION_TIMEOUT_MS ?? 5_000),
  statement_timeout: Number(process.env.DB_STATEMENT_TIMEOUT_MS ?? 30_000),
  idle_in_transaction_session_timeout: 60_000,
});

// ---------------------------------------------------------------------------
// Pool event monitoring
// ---------------------------------------------------------------------------
pool.on("error", (err) => {
  // Using console.error since we don't have logger in packages/db
  // Consumers (like apps/api) should monitor pool events at their level
  console.error("[DB Pool Error]", err);
});

pool.on("connect", () => {
  if (process.env.DB_POOL_DEBUG === "true") {
    console.debug("[DB Pool]", {
      total: pool.totalCount,
      idle: pool.idleCount,
      waiting: pool.waitingCount,
    });
  }
});

// ---------------------------------------------------------------------------
// Drizzle instances
// ---------------------------------------------------------------------------

// Pool-based connection (for traditional server environments)
const _dbPool = drizzlePg({ client: pool, schema, relations, casing: "camelCase" });

// Serverless connection (for edge/serverless environments and migrations)
// Uses HTTP-based Neon driver - no persistent connections
const sql = neon(resolveDatabaseUrl());
const _dbServerless = drizzleNeon({ client: sql, schema, relations, casing: "camelCase" });

// Default export uses pool for backward compatibility
export const db: typeof _dbPool = _dbPool;

// Serverless export for edge functions and migrations
export const dbServerless: typeof _dbServerless = _dbServerless;

export type Database = typeof db;

/**
 * Pool health stats — useful for health check endpoints
 */
export function getPoolStats() {
  return {
    totalCount: pool.totalCount,
    idleCount: pool.idleCount,
    waitingCount: pool.waitingCount,
  };
}

/**
 * Check database connectivity
 */
export async function checkDatabaseConnection(): Promise<void> {
  await pool.query("SELECT 1");
}
