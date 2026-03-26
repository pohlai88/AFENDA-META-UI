/**
 * No Console Usage Check
 * ======================
 * Ensures console.log/error/warn/info/debug are not used in source code.
 * All logging should go through the Pino logger.
 *
 * Exceptions:
 *  • config/index.ts validateConfig() - startup validation messages
 *  • Test files (*.test.ts, *.spec.ts)
 */

import { glob } from "glob";
import fs from "fs/promises";
import path from "path";

const PATTERNS = [
  /console\.(log|error|warn|info|debug|trace)\(/g,
];

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

const ALLOWED_FILES = [
  "apps/api/src/config/index.ts", // validateConfig() uses console for startup
  "apps/api/src/utils/generateToken.ts", // CLI utility script
  "apps/api/src/meta/introspect-cli.ts", // CLI utility script
  "apps/api/src/meta/test-rbac-expressions.ts", // Test/debug script
  "apps/web/src/components/error-boundary.tsx", // UI error boundary (console for dev debugging)
  "apps/web/src/renderers/fields/SUGGESTIONS_DEMO.ts", // Demo/documentation file
  "apps/web/src/renderers/fields/INTEGRATION_EXAMPLES.tsx", // Example code file
  "apps/web/src/renderers/fields/EnhancedStringField.example.tsx", // Example code file
  "apps/web/src/renderers/registry.test.ts", // Test file
];

export async function noConsoleUsage({ fix }) {
  const errors = [];

  // Scan all TypeScript files in apps/
  const files = await glob("apps/**/*.{ts,tsx}", {
    ignore: EXCLUSIONS,
    absolute: true,
  });

  for (const file of files) {
    const relativePath = path.relative(process.cwd(), file);

    // Check if this file is in the allowed list
    if (ALLOWED_FILES.some((allowed) => relativePath.replace(/\\/g, "/").endsWith(allowed))) {
      continue;
    }

    const content = await fs.readFile(file, "utf-8");
    const lines = content.split("\n");

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      for (const pattern of PATTERNS) {
        pattern.lastIndex = 0; // Reset regex state
        const matches = [...line.matchAll(new RegExp(pattern.source, "g"))];

        for (const match of matches) {
          // Skip if commented out
          const trimmed = line.trim();
          if (trimmed.startsWith("//") || trimmed.startsWith("*")) {
            continue;
          }

          errors.push({
            file: relativePath,
            line: i + 1,
            column: match.index + 1,
            message: `Found ${match[0]} - use logger instead`,
            severity: "error",
          });
        }
      }
    }
  }

  return { errors, fixed: fix ? 0 : undefined };
}
