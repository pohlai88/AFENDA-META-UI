/**
 * String Interpolation Check
 * ===========================
 * Detects string concatenation and template literals in log messages.
 *
 * Official Pino Guidance:
 * - Avoid string interpolation for performance (costs CPU before log level check)
 * - Use structured fields instead: logger.info({ field }, 'message')
 *
 * Examples:
 * ❌ logger.info('User ' + userId + ' logged in')
 * ❌ logger.info(`User ${userId} logged in at ${timestamp}`)
 * ✅ logger.info({ userId, timestamp }, 'User logged in')
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
 * Detect string interpolation patterns in logger calls
 * @param {string} line - Line of code to check
 * @returns {Object|null} - Match info or null
 */
function detectInterpolation(line) {
  // Match logger.level(anything with template literal or concatenation)
  const loggerPattern = /logger\.(trace|debug|info|warn|error|fatal)\s*\(/;
  if (!loggerPattern.test(line)) return null;

  // Extract the full logger call (simplified - may have false positives with nested calls)
  const startIdx = line.indexOf("logger.");
  const remaining = line.slice(startIdx);

  // Check for template literal with interpolation: `text ${var}`
  const templateLiteralPattern = /`[^`]*\$\{[^}]+\}[^`]*`/;
  if (templateLiteralPattern.test(remaining)) {
    return {
      type: "template-literal",
      pattern: remaining.match(templateLiteralPattern)?.[0] || "",
    };
  }

  // Check for string concatenation with +
  // Pattern: 'text' + variable or variable + 'text'
  const concatenationPattern = /(['"`][^'"`]*['"`]\s*\+|(\+\s*['"`]))/;
  if (concatenationPattern.test(remaining)) {
    return {
      type: "concatenation",
      pattern: remaining.slice(0, 80), // Truncate for display
    };
  }

  return null;
}

export async function stringInterpolation({ fix }) {
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
      const match = detectInterpolation(trimmed);

      if (match) {
        errors.push({
          file,
          line: idx + 1,
          column: line.indexOf("logger.") + 1,
          message: `Found ${match.type} in log message - use structured fields`,
          explanation:
            "String interpolation (template literals or concatenation) costs CPU before log level check. " +
            "Pino recommends using structured fields for better performance and query-ability.",
          suggestions: [
            "Replace: logger.info(`User ${userId} action`) with logger.info({ userId }, 'User action')",
            "Replace: logger.warn('Error: ' + message) with logger.warn({ message }, 'Error')",
            "Move dynamic data into the first parameter object",
          ],
          code: match.pattern.slice(0, 60) + "...",
        });
      }
    });
  }

  return {
    passed: errors.length === 0,
    errors: [],
    warnings: errors, // All issues are warnings (performance optimization)
  };
}
