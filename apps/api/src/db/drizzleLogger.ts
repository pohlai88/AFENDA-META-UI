import type { Logger as DrizzleLogger } from "drizzle-orm/logger";
import { createChildLogger } from "../logging/index.js";

const log = createChildLogger("drizzle");

/**
 * Custom Drizzle logger with slow query detection via pool events.
 * Logs all queries in development, only slow/error queries in production.
 *
 * Note: Drizzle's logQuery() is called synchronously before execution,
 * so actual timing must be done via node-postgres pool query events.
 * See db/index.ts for pool.query() wrapper implementation.
 */
export class PinoDrizzleLogger implements DrizzleLogger {
  private readonly slowQueryThresholdMs: number;

  constructor(slowQueryThresholdMs = 500) {
    this.slowQueryThresholdMs = slowQueryThresholdMs;
  }

  logQuery(query: string, params: unknown[]): void {
    // Log all queries in development for debugging
    if (process.env.NODE_ENV === "development") {
      log.debug({ query, params }, "SQL query");
    }
  }

  /**
   * Log slow queries in all environments (called from pool query wrapper).
   */
  logSlowQuery(query: string, params: unknown[], durationMs: number): void {
    if (durationMs >= this.slowQueryThresholdMs) {
      log.warn(
        { query, params, durationMs, thresholdMs: this.slowQueryThresholdMs },
        "Slow query detected"
      );
    }
  }
}
