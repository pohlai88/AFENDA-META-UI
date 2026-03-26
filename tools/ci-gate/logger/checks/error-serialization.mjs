/**
 * Error Serialization Check
 * ==========================
 * Validates that errors are logged with proper serializer to capture stack traces.
 *
 * Official Pino Guidance:
 * - Use pino.stdSerializers.err to capture full error objects with stack traces
 * - Log errors as { err } not { message: err.message }
 *
 * Examples:
 * ❌ logger.error({ message: err.message }, 'Operation failed')
 * ❌ logger.error({ error: err.toString() }, 'Operation failed')
 * ✅ logger.error({ err }, 'Operation failed')
 * ✅ logger.error({ err: error }, 'Operation failed')
 */

import { glob } from "glob";
import { readFile, stat } from "node:fs/promises";

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

/**
 * Detect improper error logging patterns
 * @param {string} line - Line of code to check
 * @returns {Object|null} - Match info or null
 */
function detectImproperErrorLogging(line) {
  // Match logger.error() calls
  const errorCallPattern = /logger\.error\s*\(/;
  if (!errorCallPattern.test(line)) return null;

  // Anti-pattern 1: { message: err.message }
  if (/\{\s*message\s*:\s*\w+\.message\s*\}/.test(line)) {
    return {
      type: "error-message-only",
      pattern: "{ message: err.message }",
    };
  }

  // Anti-pattern 2: { error: err.toString() }
  if (/\{\s*error\s*:\s*\w+\.toString\(\)\s*\}/.test(line)) {
    return {
      type: "error-tostring",
      pattern: "{ error: err.toString() }",
    };
  }

  // Anti-pattern 3: String concatenation of error
  if (/['"`]\s*\+\s*\w+(\.message|\.toString)/.test(line)) {
    return {
      type: "error-concatenation",
      pattern: "string + err.message",
    };
  }

  // Note: We can't reliably detect all good patterns (false negatives OK)
  // We focus on catching obvious anti-patterns

  return null;
}

export async function errorSerialization({ fix }) {
  const errors = [];

  // Check both backend and frontend
  const files = await glob("{apps/api,apps/web,packages}/**/*.{js,ts,jsx,tsx}", {
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
      const match = detectImproperErrorLogging(trimmed);

      if (match) {
        errors.push({
          file,
          line: idx + 1,
          column: line.indexOf("logger.error") + 1,
          message: `Found ${match.type} - log full error object to capture stack trace`,
          explanation:
            "Logging only err.message or err.toString() loses the stack trace, making debugging difficult. " +
            "Pino's error serializer (stdSerializers.err) automatically extracts type, message, and stack.",
          suggestions: [
            "Replace: logger.error({ message: err.message }, 'text') with logger.error({ err }, 'text')",
            "Replace: logger.error({ error: err.toString() }, 'text') with logger.error({ err: error }, 'text')",
            "The 'err' key is automatically serialized by Pino to include stack trace",
          ],
          code: match.pattern,
        });
      }
    });
  }

  return {
    passed: errors.length === 0,
    errors,
    warnings: [],
  };
}
