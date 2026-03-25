/**
 * Logger Usage Examples
 * =====================
 * Correct patterns for using Pino logger in the AFENDA API.
 */

import { logger } from "../logging/index.js";

// ✅ CORRECT: Object first, message second
function correctUsage() {
  logger.info({ userId: "123", action: "login" }, "User logged in");
  logger.error({ err, model: "sales_order" }, "Failed to fetch records");
  logger.warn({ origin: "http://evil.com" }, "CORS blocked origin");
}

// ❌ WRONG: Message first, object second (Winston pattern)
function wrongUsage() {
  // This will NOT work correctly with Pino
  logger.info("User logged in", { userId: "123", action: "login" });
  logger.error("Failed to fetch records", { err, model: "sales_order" });
}

// ✅ CORRECT: Simple message without structured data
function simpleMessage() {
  logger.info("Server started");
  logger.debug("Cache cleared");
}

// ✅ CORRECT: Child logger with module context
function moduleLogger() {
  const log = logger.child({ module: "rbac" });
  log.info({ roles: ["admin", "viewer"] }, "RBAC rules loaded");
}

// ✅ CORRECT: Error serialization (Pino auto-serializes with stdSerializers.err)
function errorLogging() {
  try {
    throw new Error("Something went wrong");
  } catch (err) {
    logger.error({ err }, "Operation failed"); // Pino serializes err.stack, err.message
  }
}
