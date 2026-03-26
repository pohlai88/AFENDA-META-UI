/**
 * Child Logger Bindings Check
 * ============================
 * Validates that child loggers include persistent context bindings.
 *
 * Official Pino Guidance:
 * - Child loggers should have meaningful, persistent context (module, service, component)
 * - Avoid empty child() calls or transient data like requestId in bindings
 *
 * Examples:
 * ✅ logger.child({ module: 'payment', service: 'stripe' })
 * ✅ logger.child({ component: 'queryBuilder' })
 * ❌ logger.child({})
 * ❌ logger.child({ orderId: req.params.orderId }) // transient data
 */

import { glob } from "glob";
import { readFile, stat } from "node:fs/promises";
import { basename } from "node:path";

const EXCLUSIONS = [
  "**/node_modules/**",
  "**/dist/**",
  "**/build/**",
  "**/*.test.ts",
  "**/*.test.tsx",
  "**/*.spec.ts",
  "**/*.spec.tsx",
  "**/test/**",
  "**/e2e/**",
];

// Persistent context keys that are encouraged
const GOOD_BINDING_KEYS = [
  "module",
  "service",
  "component",
  "subsystem",
  "domain",
  "layer",
  "repo",
  "handler",
];

// Transient keys that should NOT be in child bindings
const BAD_BINDING_KEYS = [
  "requestId",
  "reqId",
  "traceId",
  "spanId",
  "orderId",
  "userId",
  "id",
  "sessionId",
];

/**
 * Check if a child logger call has proper bindings
 * @param {string} line - Line of code with logger.child() call
 * @returns {boolean} - True if bindings are acceptable
 */
function hasGoodBindings(line) {
  // Extract content inside logger.child({ ... })
  const match = line.match(/logger\.child\(\s*\{([^}]*)\}\s*\)/);
  if (!match) return true; // Not a child() call

  const bindings = match[1].trim();

  // Empty bindings are bad
  if (bindings === "") {
    return false;
  }

  // Check if any good binding keys are present
  const hasGoodKey = GOOD_BINDING_KEYS.some((key) => {
    const pattern = new RegExp(`\\b${key}\\s*:`);
    return pattern.test(bindings);
  });

  // Check if any bad binding keys are present
  const hasBadKey = BAD_BINDING_KEYS.some((key) => {
    const pattern = new RegExp(`\\b${key}\\s*:`);
    return pattern.test(bindings);
  });

  // Warn if only transient keys present
  if (hasBadKey && !hasGoodKey) {
    return false;
  }

  // Accept if has good keys or non-empty custom keys
  return hasGoodKey || bindings.length > 0;
}

export async function childLoggerBindings({ fix }) {
  const errors = [];

  // Check backend and packages (frontend uses different logger instance)
  const files = await glob("{apps/api,packages}/**/*.{js,ts}", { 
    ignore: EXCLUSIONS,
    nodir: true,
    absolute: true
  });

  for (const file of files) {
    // Skip if not a file (safety check)
    try {
      const stats = await stat(file);
      if (!stats.isFile()) continue;
    } catch {
      continue;
    }

    const content = await readFile(file, "utf-8");
    const lines = content.split("\n");

    lines.forEach((line, idx) => {
      const trimmed = line.trim();

      // Detect logger.child() calls
      if (trimmed.includes("logger.child(")) {
        // Check for empty bindings: logger.child({})
        if (/logger\.child\(\s*\{\s*\}\s*\)/.test(trimmed)) {
          errors.push({
            file,
            line: idx + 1,
            column: line.indexOf("logger.child(") + 1,
            message: "Found logger.child({}) - should include persistent context",
            explanation:
              "Child loggers should have meaningful bindings like { module, service, component }. " +
              "Empty child() calls don't provide context benefits.",
            suggestions: [
              "Add persistent context: logger.child({ module: 'moduleName' })",
              "Avoid transient data (requestId, orderId) in child bindings",
              "Use structured log fields for per-call data instead",
            ],
          });
        }
        // Check for transient data in bindings
        else if (!hasGoodBindings(trimmed)) {
          errors.push({
            file,
            line: idx + 1,
            column: line.indexOf("logger.child(") + 1,
            message: "Child logger bindings should include persistent context",
            explanation:
              "Child logger bindings should include persistent context keys like 'module', 'service', or 'component'. " +
              "Avoid transient data like requestId, orderId, or userId in child bindings.",
            suggestions: [
              `Good binding keys: ${GOOD_BINDING_KEYS.join(", ")}`,
              "Log transient data in individual log calls, not child bindings",
              "Example: const log = logger.child({ module: 'payment' }); log.info({ orderId }, 'Processing order')",
            ],
          });
        }
      }
    });
  }

  return {
    passed: errors.length === 0,
    errors,
    warnings: [], // All issues are warnings in this check
  };
}
