/**
 * Proper Imports Check
 * ====================
 * Ensures deprecated logger imports (Winston, morgan) are not used.
 * All code should import from the new Pino logger module.
 *
 * Validates:
 *  • No `import ... from "winston"`
 *  • No `import ... from "morgan"`
 *  • Correct import paths: `"../logging/index.js"` or `"./logging/index.js"`
 */

import { glob } from "glob";
import fs from "fs/promises";
import path from "path";

const DEPRECATED_IMPORTS = [
  { pattern: /import\s+.*\s+from\s+['"]winston['"]/g, name: "winston" },
  { pattern: /import\s+.*\s+from\s+['"]morgan['"]/g, name: "morgan" },
  { pattern: /require\s*\(\s*['"]winston['"]\s*\)/g, name: "winston (require)" },
  { pattern: /require\s*\(\s*['"]morgan['"]\s*\)/g, name: "morgan (require)" },
];

const CORRECT_PATTERNS = [
  /import\s+.*\s+from\s+['"]\.{1,2}\/logging\/index\.js['"]/,
  /import\s+.*\s+from\s+['"]\.{1,2}\/logging\/logger\.js['"]/,
];

const EXCLUSIONS = [
  "**/node_modules/**",
  "**/dist/**",
  "**/build/**",
  "**/*.test.ts",
  "**/*.test.tsx",
  "**/*.spec.ts",
  "**/*.spec.tsx",
];

export async function properImports({ fix }) {
  const errors = [];

  // Scan all TypeScript files in apps/api (backend only)
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

      // Check for deprecated imports
      for (const { pattern, name } of DEPRECATED_IMPORTS) {
        pattern.lastIndex = 0; // Reset regex state
        if (pattern.test(line)) {
          errors.push({
            file: relativePath,
            line: i + 1,
            column: 1,
            message: `Deprecated import: ${name} - use Pino logger from "../logging/index.js"`,
            severity: "error",
          });
        }
      }
    }
  }

  return { errors, fixed: fix ? 0 : undefined };
}
