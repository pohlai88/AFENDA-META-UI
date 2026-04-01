import "../../env/load-repo-root-dotenv.js";
import { drizzle as drizzlePg } from "drizzle-orm/node-postgres";
import { drizzle as drizzleNeon } from "drizzle-orm/neon-http";
import { drizzle as drizzleNeonServerless } from "drizzle-orm/neon-serverless";
import { neon, Pool as NeonServerlessPool } from "@neondatabase/serverless";
import { Pool, type PoolConfig } from "pg";

import * as schema from "../../schema/index.js";
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
  /** Pool configuration overrides (merged after env-based defaults). */
  poolConfig?: Partial<PoolConfig>;
  /**
   * Called when the pg pool emits an idle-client error. Prefer this over the
   * default `console.error` in production (e.g. pass a Pino logger) so you do
   * not register a second `pool.on("error")` listener.
   */
  onPoolError?: (err: Error) => void;
}

export type Database = ReturnType<typeof drizzlePg>;

export interface DatabaseInstance {
  db: Database;
  pool: Pool;
  getPoolStats: () => PoolStats;
  checkDatabaseConnection: () => Promise<void>;
  /** Drain and end the pool (graceful shutdown). */
  close: () => Promise<void>;
}

export interface PoolStats {
  totalCount: number;
  idleCount: number;
  waitingCount: number;
}

/** Options for {@link createServerlessDatabase} (HTTP driver + Drizzle). */
export interface ServerlessDatabaseOptions {
  connectionString?: string;
  logger?: DrizzleLogger | boolean;
}

/** Options for {@link createServerlessWebSocketDatabase} (Neon Pool + WebSocket + Drizzle). */
export interface ServerlessWebSocketDatabaseOptions {
  connectionString?: string;
  logger?: DrizzleLogger | boolean;
  /** Extra Neon serverless `Pool` options (merged with `connectionString`). */
  poolConfig?: Omit<PoolConfig, "connectionString">;
  /** Idle pool errors — prefer structured logging in production. */
  onPoolError?: (err: Error) => void;
}

// ---------------------------------------------------------------------------
// Defaults & env resolution
// ---------------------------------------------------------------------------

const DEFAULT_LOCAL_TEST_DATABASE_URL =
  "postgresql://postgres:postgres@localhost:5433/afenda_test";

/** Base pool defaults; overridden by DB_POOL_* env vars when set. */
const DEFAULT_POOL_CONFIG: Partial<PoolConfig> = {
  max: 10,
  idleTimeoutMillis: 10_000,
  connectionTimeoutMillis: 5_000,
  // Valid `pg` ClientConfig keys (ms). On Neon, verify with `SHOW statement_timeout`
  // after connect if behavior seems ignored (see node-postgres#3604 / Neon pooler).
  statement_timeout: 30_000,
  idle_in_transaction_session_timeout: 60_000,
};

function parsePositiveInt(raw: string | undefined, fallback: number): number {
  if (raw === undefined || raw === "") return fallback;
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

/**
 * Merge DEFAULT_POOL_CONFIG with optional DB_POOL_* environment variables.
 * Tune per process count vs Neon compute `default_pool_size` (see Neon pooling docs).
 */
function parseNonNegativeInt(raw: string | undefined): number | undefined {
  if (raw === undefined || raw === "") return undefined;
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) && n >= 0 ? n : undefined;
}

export function resolvePoolConfigFromEnv(): Partial<PoolConfig> {
  const base: Partial<PoolConfig> = {
    ...DEFAULT_POOL_CONFIG,
    max: parsePositiveInt(process.env.DB_POOL_MAX, DEFAULT_POOL_CONFIG.max ?? 10),
    idleTimeoutMillis: parsePositiveInt(
      process.env.DB_POOL_IDLE_TIMEOUT_MS,
      DEFAULT_POOL_CONFIG.idleTimeoutMillis ?? 10_000
    ),
    connectionTimeoutMillis: parsePositiveInt(
      process.env.DB_POOL_CONNECTION_TIMEOUT_MS,
      DEFAULT_POOL_CONFIG.connectionTimeoutMillis ?? 5_000
    ),
    statement_timeout: parsePositiveInt(
      process.env.DB_POOL_STATEMENT_TIMEOUT_MS,
      typeof DEFAULT_POOL_CONFIG.statement_timeout === "number" ? DEFAULT_POOL_CONFIG.statement_timeout : 30_000
    ),
    idle_in_transaction_session_timeout: parsePositiveInt(
      process.env.DB_POOL_IDLE_IN_TX_TIMEOUT_MS,
      typeof DEFAULT_POOL_CONFIG.idle_in_transaction_session_timeout === "number"
        ? DEFAULT_POOL_CONFIG.idle_in_transaction_session_timeout
        : 60_000
    ),
  };
  const lockMs = parseNonNegativeInt(process.env.DB_POOL_LOCK_TIMEOUT_MS);
  if (lockMs !== undefined) {
    base.lock_timeout = lockMs;
  }
  return base;
}

/**
 * Pool defaults for read replicas: same as {@link resolvePoolConfigFromEnv}, with optional
 * `DB_READ_POOL_MAX` overriding `max` only (Neon [read replicas](https://neon.com/docs/introduction/read-replicas)).
 */
export function resolveReadReplicaPoolConfigFromEnv(): Partial<PoolConfig> {
  const base = resolvePoolConfigFromEnv();
  if (process.env.DB_READ_POOL_MAX === undefined || process.env.DB_READ_POOL_MAX === "") {
    return base;
  }
  return {
    ...base,
    max: parsePositiveInt(process.env.DB_READ_POOL_MAX, base.max ?? 10),
  };
}

/** Effective session timeouts as seen by PostgreSQL (useful on Neon / pooler; see node-postgres#3604). */
export interface SessionTimeoutDiagnostics {
  statement_timeout: string;
  lock_timeout: string;
  idle_in_transaction_session_timeout: string;
}

export async function getEffectiveSessionTimeouts(pool: Pool): Promise<SessionTimeoutDiagnostics> {
  const [st, lt, idle] = await Promise.all([
    pool.query<{ statement_timeout: string }>("SHOW statement_timeout"),
    pool.query<{ lock_timeout: string }>("SHOW lock_timeout"),
    pool.query<{ idle_in_transaction_session_timeout: string }>("SHOW idle_in_transaction_session_timeout"),
  ]);
  return {
    statement_timeout: String(st.rows[0]?.statement_timeout ?? ""),
    lock_timeout: String(lt.rows[0]?.lock_timeout ?? ""),
    idle_in_transaction_session_timeout: String(idle.rows[0]?.idle_in_transaction_session_timeout ?? ""),
  };
}

function resolveDatabaseUrl(connectionString?: string): string {
  if (connectionString) return connectionString;
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  if (process.env.VITEST) return DEFAULT_LOCAL_TEST_DATABASE_URL;
  throw new Error("DATABASE_URL is required for @afenda/db");
}

function resolveReadReplicaUrl(connectionString?: string): string {
  if (connectionString) return connectionString;
  if (process.env.DATABASE_READ_URL) return process.env.DATABASE_READ_URL;
  throw new Error("DATABASE_READ_URL or connectionString is required for read replica client");
}

function createPooledDatabaseInstance(
  connectionString: string,
  options: DatabaseOptions,
  resolveEnvPoolConfig: () => Partial<PoolConfig>
): DatabaseInstance {
  const pool = new Pool({
    connectionString,
    ...resolveEnvPoolConfig(),
    ...options.poolConfig,
  });

  const onPoolError = options.onPoolError;
  pool.on("error", (err: Error) => {
    if (onPoolError) {
      onPoolError(err);
      return;
    }
    console.error("[DB Pool Error]", err);
  });

  if (process.env.DB_POOL_DEBUG === "true") {
    pool.on("connect", () => {
      console.warn("[DB Pool]", {
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

  async function close(): Promise<void> {
    await pool.end();
  }

  return { db, pool, getPoolStats, checkDatabaseConnection, close };
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

/**
 * Create a configured database instance with pool and health utilities.
 *
 * **Neon:** Use a pooled connection string (`-pooler` in hostname) for the API;
 * use a direct URL for migrations / long sessions when required (see Neon pooling docs).
 *
 * **Pool sizing:** Override with `DB_POOL_MAX` or `poolConfig.max`. Size against
 * replica count and Neon compute limits, not a fixed default alone.
 *
 * @example
 * ```ts
 * const { db, pool, close } = createDatabase();
 *
 * const { db, pool } = createDatabase({
 *   logger: new PinoDrizzleLogger(500),
 *   onPoolError: (err) => log.error({ err }, "pool error"),
 *   poolConfig: { max: 20 },
 * });
 * ```
 */
export function createDatabase(options: DatabaseOptions = {}): DatabaseInstance {
  return createPooledDatabaseInstance(
    resolveDatabaseUrl(options.connectionString),
    options,
    resolvePoolConfigFromEnv
  );
}

/**
 * Read-replica pool + Drizzle (TCP `pg` `Pool`). Use Neon’s read-replica connection string
 * (`DATABASE_READ_URL` or pass `connectionString`). RLS still applies — use `withTenantContext`
 * the same way as on the primary.
 */
export function createReadReplicaDatabase(options: DatabaseOptions = {}): DatabaseInstance {
  return createPooledDatabaseInstance(
    resolveReadReplicaUrl(options.connectionString),
    options,
    resolveReadReplicaPoolConfigFromEnv
  );
}

// ---------------------------------------------------------------------------
// Serverless factory (for edge/serverless environments)
// ---------------------------------------------------------------------------

/**
 * Neon serverless driver over HTTP + Drizzle. For interactive transactions or
 * WebSocket semantics, see Neon docs (`drizzle-orm/neon-serverless`).
 * Requires Node.js 19+ for `@neondatabase/serverless` v1+.
 */
export function createServerlessDatabase(
  options?: ServerlessDatabaseOptions | string
): ReturnType<typeof drizzleNeon> {
  const opts: ServerlessDatabaseOptions =
    typeof options === "string" ? { connectionString: options } : options ?? {};
  const url = resolveDatabaseUrl(opts.connectionString);
  const sql = neon(url);
  return drizzleNeon({
    client: sql,
    schema,
    relations,
    casing: "camelCase",
    logger: opts.logger,
  });
}

export type ServerlessDatabase = ReturnType<typeof createServerlessDatabase>;

// ---------------------------------------------------------------------------
// Serverless WebSocket (interactive transactions; Neon Pool in serverless package)
// ---------------------------------------------------------------------------

export interface ServerlessWebSocketDatabaseInstance {
  db: ReturnType<typeof drizzleNeonServerless>;
  pool: NeonServerlessPool;
  close: () => Promise<void>;
}

/**
 * Neon serverless **WebSocket** driver + Drizzle (`drizzle-orm/neon-serverless`). Prefer this over
 * {@link createServerlessDatabase} when you need interactive `db.transaction()` semantics from
 * serverless/edge-style runtimes (see Neon serverless driver docs).
 */
export function createServerlessWebSocketDatabase(
  options?: ServerlessWebSocketDatabaseOptions | string
): ServerlessWebSocketDatabaseInstance {
  const opts: ServerlessWebSocketDatabaseOptions =
    typeof options === "string" ? { connectionString: options } : options ?? {};
  const url = resolveDatabaseUrl(opts.connectionString);
  const pool = new NeonServerlessPool({
    connectionString: url,
    ...(opts.poolConfig ?? {}),
  });

  pool.on("error", (err: Error) => {
    if (opts.onPoolError) {
      opts.onPoolError(err);
      return;
    }
    console.error("[DB Neon serverless pool error]", err);
  });

  const db = drizzleNeonServerless({
    client: pool,
    schema,
    relations,
    casing: "camelCase",
    logger: opts.logger,
  });

  return {
    db,
    pool,
    close: () => pool.end(),
  };
}
