/**
 * Message Format Check
 * ====================
 * Validates Pino logger API usage follows the correct signature:
 *   logger.info({ data }, "message")  ✅
 *   logger.info("message", { data })  ❌
 *
 * Pino requires: (mergingObject, message, ...interpolationValues)
 * Not: (message, mergingObject) like Winston
 */

import { glob } from "glob";
import fs from "fs/promises";
import path from "path";

const EXCLUSIONS = [
  "**/node_modules/**",
  "**/dist/**",
  "**/build/**",
  "**/*.test.ts",
  "**/*.test.tsx",
  "**/*.spec.ts",
  "**/*.spec.tsx",
];

// Pattern: logger.METHOD("string", { object })
// This is the WRONG Winston pattern (message first)
const WRONG_SIGNATURE_PATTERN = /\b(?:logger|log)\.(error|warn|info|debug|trace|fatal)\s*\(\s*["'`][^"'`]*["'`]\s*,\s*{/g;

export async function messageFormat({ fix }) {
  const errors = [];

  // Scan all TypeScript files in apps/api
  const files = await glob("apps/api/src/**/*.{ts,tsx}", {
    ignore: EXCLUSIONS,
    absolute: true,
  });

  for (const file of files) {
    const relativePath = path.relative(process.cwd(), file);
    const content = await fs.readFile(file, "utf-8");
    const lines = content.split("\n");

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Skip comments
      const trimmed = line.trim();
      if (trimmed.startsWith("//") || trimmed.startsWith("*")) {
        continue;
      }

      WRONG_SIGNATURE_PATTERN.lastIndex = 0; // Reset regex state
      const matches = [...line.matchAll(new RegExp(WRONG_SIGNATURE_PATTERN.source, "g"))];

      for (const match of matches) {
        errors.push({
          file: relativePath,
          line: i + 1,
          column: match.index + 1,
          message: `Wrong Pino signature - use logger.${match[1]}({ object }, "message") not logger.${match[1]}("message", { object })`,
          severity: "error",
        });
      }
    }
  }

  return { errors, fixed: fix ? 0 : undefined };
}
