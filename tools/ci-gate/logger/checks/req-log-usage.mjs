/**
 * req.log Usage Check
 * ===================
 * Ensures route handlers use req.log (request-scoped logger with requestId)
 * instead of the root logger for error logging within request context.
 *
 * Validates:
 *  • Route handlers with `(req: Request, res: Response)` signature use `req.log`
 *  • No `logger.error()` in route files (should be `req.log.error()`)
 *  • Proper pattern: `(req as any).log?.error()` for safety
 */

import { glob } from "glob";
import fs from "fs/promises";
import path from "path";

const ROUTE_FILE_PATTERNS = [
  "apps/api/src/routes/**/*.ts",
  "apps/api/src/middleware/errorHandler.ts",
];

const EXCLUSIONS = [
  "**/node_modules/**",
  "**/dist/**",
  "**/build/**",
  "**/*.test.ts",
  "**/*.spec.ts",
];

// Pattern: logger.error/warn/info used in route handler context
const ROOT_LOGGER_PATTERN = /\blogger\.(error|warn|info|debug)\(/g;

// Exception: middleware/logger.ts itself can use root logger
const ALLOWED_FILES = ["apps/api/src/middleware/logger.ts"];

export async function reqLogUsage({ fix }) {
  const errors = [];
  const warnings = [];

  // Scan route files
  const files = await glob(ROUTE_FILE_PATTERNS, {
    ignore: EXCLUSIONS,
    absolute: true,
  });

  for (const file of files) {
    const relativePath = path.relative(process.cwd(), file);

    // Skip allowed files
    if (ALLOWED_FILES.some((allowed) => relativePath.replace(/\\/g, "/").endsWith(allowed))) {
      continue;
    }

    const content = await fs.readFile(file, "utf-8");
    const lines = content.split("\n");

    // Check if this file has Request/Response imports (likely a route file)
    const hasRouteSignature = /\(req:\s*Request.*res:\s*Response\)/.test(content);

    if (!hasRouteSignature) {
      continue; // Skip files that don't look like route handlers
    }

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Skip comments
      const trimmed = line.trim();
      if (trimmed.startsWith("//") || trimmed.startsWith("*")) {
        continue;
      }

      ROOT_LOGGER_PATTERN.lastIndex = 0; // Reset regex state
      const matches = [...line.matchAll(new RegExp(ROOT_LOGGER_PATTERN.source, "g"))];

      for (const match of matches) {
        // Check if this is inside a route handler (heuristic: inside try/catch)
        const contextStart = Math.max(0, i - 10);
        const contextEnd = Math.min(lines.length, i + 10);
        const context = lines.slice(contextStart, contextEnd).join("\n");

        if (context.includes("try {") || context.includes("} catch")) {
          warnings.push({
            file: relativePath,
            line: i + 1,
            column: match.index + 1,
            message: `Found ${match[0]} in route handler - consider using req.log.${match[1]}() for automatic requestId tracing`,
            severity: "warning",
          });
        }
      }
    }
  }

  return { errors, warnings, fixed: fix ? 0 : undefined };
}
