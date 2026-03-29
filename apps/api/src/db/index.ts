import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createDatabase } from "@afenda/db/client";
import { createChildLogger } from "../logging/index.js";
import { PinoDrizzleLogger } from "./drizzleLogger.js";

const CURRENT_FILE = fileURLToPath(import.meta.url);
const CURRENT_DIR = path.dirname(CURRENT_FILE);
const ROOT_ENV_PATH = path.resolve(CURRENT_DIR, "../../../../.env");

// Prefer repository root .env values for local tooling, even when the shell already defines DATABASE_URL.
dotenv.config({ path: ROOT_ENV_PATH, override: true });

const log = createChildLogger("database");

// ---------------------------------------------------------------------------
// Create database via @afenda/db factory — single source of pool config
// ---------------------------------------------------------------------------

const drizzleLogger = new PinoDrizzleLogger(500); // 500ms slow query threshold

const instance = createDatabase({
  connectionString: process.env.DATABASE_URL,
  logger: drizzleLogger,
});

export const db = instance.db;
export const pool = instance.pool;
export type Db = typeof db;

// ---------------------------------------------------------------------------
// Pool event monitoring (api-specific Pino logging)
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
// Slow query detection via pool query wrapper
// ---------------------------------------------------------------------------

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

export const checkDatabaseConnection = instance.checkDatabaseConnection;
export const getPoolStats = instance.getPoolStats;
