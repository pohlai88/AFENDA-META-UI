/**
 * Decimal.js Import Consistency Check
 * ====================================
 * Ensures consistent import pattern for decimal.js across the codebase.
 *
 * Pattern to enforce:
 *   ✅ import { Decimal } from "decimal.js";  // Named import (correct)
 *   ❌ import Decimal from "decimal.js";      // Default import (incorrect)
 *
 * Rationale:
 *   - Named imports allow direct type usage: `amount: Decimal`
 *   - Default imports require namespace workarounds: `type DecimalInstance = Decimal.Instance`
 *   - Consistency with existing codebase (partner-engine.ts, reference-data.ts, money.ts)
 *   - Matches TypeScript type inference from decimal.js exports
 *
 * Auto-fix:
 *   Converts default imports to named imports automatically
 */

import { glob } from "glob";
import fs from "fs/promises";
import path from "path";

const INCORRECT_PATTERN = /^import\s+Decimal\s+from\s+['"]decimal\.js['"]/gm;
const CORRECT_PATTERN = /^import\s+\{\s*Decimal\s*\}\s+from\s+['"]decimal\.js['"]/gm;

const EXCLUSIONS = [
  "**/node_modules/**",
  "**/dist/**",
  "**/build/**",
  "**/.turbo/**",
];

export async function decimalConsistency({ fix }) {
  const errors = [];
  let fixCount = 0;

  // Scan all TypeScript files
  const files = await glob("{apps,packages}/**/*.{ts,tsx}", {
    ignore: EXCLUSIONS,
    absolute: true,
  });

  for (const file of files) {
    const relativePath = path.relative(process.cwd(), file);
    const content = await fs.readFile(file, "utf-8");
    const lines = content.split("\n");

    let modified = false;
    let newContent = content;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Reset regex state
      INCORRECT_PATTERN.lastIndex = 0;
      CORRECT_PATTERN.lastIndex = 0;

      // Check for incorrect default import
      if (INCORRECT_PATTERN.test(line)) {
        const hasCorrectImport = CORRECT_PATTERN.test(content);

        if (!hasCorrectImport) {
          if (fix) {
            // Replace default import with named import
            newContent = newContent.replace(
              /import\s+Decimal\s+from\s+(['"]decimal\.js['"])/g,
              'import { Decimal } from $1'
            );
            modified = true;
            fixCount++;
          } else {
            errors.push({
              file: relativePath,
              line: i + 1,
              column: 1,
              message: `Use named import: import { Decimal } from "decimal.js" (not default import)`,
              severity: "error",
              suggestion: `Change "import Decimal from" to "import { Decimal } from"`,
            });
          }
        }
      }
    }

    // Write fixed content back to file
    if (modified) {
      await fs.writeFile(file, newContent, "utf-8");
      console.log(`  ✓ Fixed: ${relativePath}`);
    }
  }

  return { 
    errors, 
    fixed: fix ? fixCount : undefined,
    patterns: {
      correct: 'import { Decimal } from "decimal.js"',
      incorrect: 'import Decimal from "decimal.js"',
    }
  };
}
