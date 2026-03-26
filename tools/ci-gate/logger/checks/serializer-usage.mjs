/**
 * Serializer Usage Check
 * =======================
 * Validates that sensitive objects (user, request) use serializers or explicit fields.
 *
 * Official Pino Guidance:
 * - Use serializers to mask PII (passwords, tokens, credit cards)
 * - Log only necessary fields explicitly: { userId: user.id, role: user.role }
 * - Configure serializers with redact.paths for sensitive keys
 *
 * Examples:
 * ❌ logger.info({ user: userData }, 'User logged in') // may contain password
 * ❌ logger.info({ request: req }, 'Request received') // may contain auth headers
 * ✅ logger.info({ userId: user.id, role: user.role }, 'User logged in')
 * ✅ logger.info({ req }, 'Request received') // if 'req' serializer configured
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

// Objects that commonly contain PII and need serialization
const SENSITIVE_OBJECTS = ["user", "request", "req", "response", "res", "session", "auth"];

// Safe field access patterns (explicit field selection)
const SAFE_PATTERNS = [
  "user.id",
  "user.username",
  "user.email",
  "user.role",
  "req.method",
  "req.url",
  "req.ip",
  "res.statusCode",
];

/**
 * Check if a line logs sensitive objects without proper serialization
 * @param {string} line - Line of code to check
 * @returns {Object|null} - Match info or null
 */
function detectUnsafeSensitiveLogging(line) {
  // Match logger.level() calls
  const loggerPattern = /logger\.(trace|debug|info|warn|error|fatal)\s*\(/;
  if (!loggerPattern.test(line)) return null;

  // Extract the object parameter (first parameter in logger call)
  const objectMatch = line.match(/logger\.\w+\s*\(\s*\{([^}]+)\}/);
  if (!objectMatch) return null;

  const objectContent = objectMatch[1];

  // Check each sensitive object
  for (const obj of SENSITIVE_OBJECTS) {
    // Pattern: { user: variable } or { user } (shorthand)
    const shorthandPattern = new RegExp(`\\b${obj}\\b(?!\\.)(?:\\s*:|\\s*,|\\s*\\})`);

    if (shorthandPattern.test(objectContent)) {
      // Check if it's using safe field access
      const hasSafeAccess = SAFE_PATTERNS.some((pattern) =>
        new RegExp(pattern.replace(".", "\\.")).test(objectContent)
      );

      // If logging whole object without safe field access
      if (!hasSafeAccess) {
        // Check if it's the 'req' or 'res' keys (which have standard Pino serializers)
        const isStandardSerialized = ["req", "res", "err"].includes(obj);

        if (!isStandardSerialized && obj !== "request" && obj !== "response") {
          return {
            type: "unsafe-object-logging",
            object: obj,
            context: objectContent.slice(0, 60),
          };
        }
      }
    }
  }

  return null;
}

export async function serializerUsage({ fix }) {
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
      const match = detectUnsafeSensitiveLogging(trimmed);

      if (match) {
        errors.push({
          file,
          line: idx + 1,
          column: line.indexOf("logger.") + 1,
          message: `Logging '${match.object}' object may expose PII - use serializer or explicit fields`,
          explanation:
            `The '${match.object}' object may contain sensitive data (passwords, tokens, personal info). ` +
            "Use a serializer to redact sensitive fields, or log only necessary fields explicitly.",
          suggestions: [
            `Log explicit fields: { userId: user.id, role: user.role } instead of { ${match.object} }`,
            `Configure a serializer: pino({ serializers: { ${match.object}: customSerializer } })`,
            `Use redact.paths: pino({ redact: { paths: ['${match.object}.password', '${match.object}.token'] } })`,
          ],
          code: match.context,
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
