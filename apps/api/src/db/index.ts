import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";
import * as schema from "./schema/index.js";
import { relations } from "@afenda/db";
import { createChildLogger } from "../logging/index.js";
import { PinoDrizzleLogger } from "./drizzleLogger.js";

const CURRENT_FILE = fileURLToPath(import.meta.url);
const CURRENT_DIR = path.dirname(CURRENT_FILE);
const ROOT_ENV_PATH = path.resolve(CURRENT_DIR, "../../../../.env");

// Prefer repository root .env values for local tooling, even when the shell already defines DATABASE_URL.
dotenv.config({ path: ROOT_ENV_PATH, override: true });

const log = createChildLogger("database");

// ---------------------------------------------------------------------------
// Pool configuration — tuned for production safety
// ---------------------------------------------------------------------------

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
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
  log.error({ err }, "Unexpected pool client error");
});

pool.on("connect", () => {
  log.debug(
    { total: pool.totalCount, idle: pool.idleCount, waiting: pool.waitingCount },
    "New pool client connected"
  );
});

// ---------------------------------------------------------------------------
// Drizzle ORM with custom logger and relations
// ---------------------------------------------------------------------------

const drizzleLogger = new PinoDrizzleLogger(500); // 500ms slow query threshold

export const db = drizzle({
  client: pool,
  schema,
  relations,
  casing: "camelCase",
  logger: drizzleLogger,
});
export type Db = typeof db;

/**
 * Wrapped pool query with slow query detection.
 * Tracks execution time and logs queries exceeding threshold via PinoDrizzleLogger.
 */
const originalPoolQuery = pool.query.bind(pool);
pool.query = async function queryWithTiming(
  ...args: Parameters<typeof originalPoolQuery>
): Promise<ReturnType<typeof originalPoolQuery>> {
  const start = performance.now();
  const result = await originalPoolQuery(...args);
  const duration = performance.now() - start;

  // Extract query text from args (first arg can be string or QueryConfig)
  const firstArg = args[0] as string | { text?: string; values?: unknown[] } | undefined;
  const queryText = typeof firstArg === "string" ? firstArg : (firstArg?.text ?? "unknown");
  const params = typeof firstArg === "string" ? args[1] : firstArg?.values;

  drizzleLogger.logSlowQuery(queryText, params ?? [], duration);
  return result;
} as typeof originalPoolQuery;

export async function checkDatabaseConnection(): Promise<void> {
  await pool.query("SELECT 1");
}

/**
 * Pool health stats — consumed by `/health` endpoint.
 */
export function getPoolStats() {
  return {
    totalCount: pool.totalCount,
    idleCount: pool.idleCount,
    waitingCount: pool.waitingCount,
  };
}

export { pool };
