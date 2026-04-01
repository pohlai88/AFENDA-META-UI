#!/usr/bin/env node
/**
 * Column-kit shared column governance gate.
 *
 * Validates internal consistency for:
 * - shared fingerprint catalogs
 * - mandatory/recommended shared column lists
 * - column-kit public barrel exports
 *
 * Usage:
 *   node tools/ci-gate/column-kit-shared-columns/index.mjs
 *   pnpm ci:gate:column-kit
 *   pnpm ci:gate --gate=column-kit-shared-columns
 *
 * Env:
 *   COLUMN_KIT_GATE=warn   -> print violations and exit 0
 */

import { readFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, "..", "..", "..");
const warnOnly = process.env.COLUMN_KIT_GATE === "warn";

const files = {
  shared: join(repoRoot, "packages", "db", "src", "column-kit", "fingerprints", "shared.ts"),
  index: join(repoRoot, "packages", "db", "src", "column-kit", "index.ts"),
};

/**
 * @param {string} source
 * @param {string} constName
 * @returns {string[]}
 */
function parseArrayConst(source, constName) {
  const re = new RegExp(`export const ${constName}\\s*=\\s*\\[([^\\]]*)\\] as const;`, "m");
  const match = source.match(re);
  if (!match) return [];
  return [...match[1].matchAll(/"([^"]+)"/g)].map((m) => m[1]);
}

/**
 * @param {string} source
 * @param {string} constName
 * @returns {string[]}
 */
function parseObjectKeys(source, constName) {
  const re = new RegExp(`export const ${constName}\\s*=\\s*\\{([\\s\\S]*?)\\}\\s*as const;`, "m");
  const match = source.match(re);
  if (!match) return [];
  return [...match[1].matchAll(/^\s*([A-Za-z0-9_]+)\s*:/gm)].map((m) => m[1]);
}

/**
 * @param {string[]} list
 * @returns {string[]}
 */
function duplicates(list) {
  const counts = new Map();
  for (const v of list) counts.set(v, (counts.get(v) ?? 0) + 1);
  return [...counts.entries()].filter(([, c]) => c > 1).map(([k]) => k).sort();
}

/**
 * @param {string[]} a
 * @param {string[]} b
 * @returns {string[]}
 */
function diff(a, b) {
  const bSet = new Set(b);
  return a.filter((v) => !bSet.has(v)).sort();
}

function main() {
  console.log("🔍 column-kit-shared-columns gate\n");

  const sharedSrc = readFileSync(files.shared, "utf8");
  const indexSrc = readFileSync(files.index, "utf8");

  const allShared = parseObjectKeys(sharedSrc, "ALL_SHARED_FINGERPRINTS");
  const mandatory = parseArrayConst(sharedSrc, "MANDATORY_SHARED_COLUMNS");
  const recommended = parseArrayConst(sharedSrc, "RECOMMENDED_SHARED_COLUMNS");

  /** @type {string[]} */
  const violations = [];

  if (allShared.length === 0) {
    violations.push("shared.ts: failed to parse ALL_SHARED_FINGERPRINTS");
  }
  if (mandatory.length === 0) {
    violations.push("shared.ts: failed to parse MANDATORY_SHARED_COLUMNS");
  }
  if (recommended.length === 0) {
    violations.push("shared.ts: failed to parse RECOMMENDED_SHARED_COLUMNS");
  }

  const dupMandatory = duplicates(mandatory);
  const dupRecommended = duplicates(recommended);
  const overlap = mandatory.filter((x) => recommended.includes(x)).sort();

  if (dupMandatory.length) violations.push(`MANDATORY_SHARED_COLUMNS has duplicates: ${dupMandatory.join(", ")}`);
  if (dupRecommended.length) violations.push(`RECOMMENDED_SHARED_COLUMNS has duplicates: ${dupRecommended.join(", ")}`);
  if (overlap.length) violations.push(`Mandatory/recommended overlap not allowed: ${overlap.join(", ")}`);

  const missingMandatory = diff(mandatory, allShared);
  const missingRecommended = diff(recommended, allShared);
  if (missingMandatory.length) {
    violations.push(`Mandatory keys missing from ALL_SHARED_FINGERPRINTS: ${missingMandatory.join(", ")}`);
  }
  if (missingRecommended.length) {
    violations.push(`Recommended keys missing from ALL_SHARED_FINGERPRINTS: ${missingRecommended.join(", ")}`);
  }

  const requiredBarrelSymbols = [
    "timestampColumns",
    "softDeleteColumns",
    "appendOnlyTimestampColumns",
    "auditColumns",
    "nameColumn",
    "ALL_SHARED_FINGERPRINTS",
    "COLUMN_KIT_FINGERPRINTS",
    "MANDATORY_SHARED_COLUMNS",
    "RECOMMENDED_SHARED_COLUMNS",
    "SHARED_COLUMN_PATTERNS",
    "SHARED_COLUMN_PATTERN_REGEXES",
    "SHARED_COLUMN_ALLOWLIST",
    "sharedColumnPatternSeverity",
    "columnNameMatchesSharedColumnPattern",
    "columnKitFingerprintNameFromColumnName",
    "columnKitSqlColumnNameFromFingerprintName",
    "evaluateSharedColumnCoverage",
    "evaluateSharedColumnCoverageWithShapes",
    "isColumnKitSqlColumnName",
    "sharedColumnShapeCandidateFromFingerprint",
    "sharedColumnShapeCandidatesFromColumnKitCatalog",
    "sharedColumnShapeMatches",
    "isColumnKitFingerprintName",
    "isSharedColumnName",
  ];

  for (const symbol of requiredBarrelSymbols) {
    if (!indexSrc.includes(symbol)) {
      violations.push(`index.ts does not export required symbol: ${symbol}`);
    }
  }

  if (violations.length === 0) {
    console.log(`✓ Verified ${relative(repoRoot, files.shared).replace(/\\/g, "/")}`);
    console.log(`✓ Verified ${relative(repoRoot, files.index).replace(/\\/g, "/")}`);
    console.log("✅ column-kit-shared-columns gate passed");
    process.exit(0);
  }

  const message = [
    `column-kit-shared-columns: ${violations.length} violation(s)`,
    ...violations.map((v) => `  - ${v}`),
    "",
    "Remediation: keep shared fingerprint keys, mandatory/recommended lists, and column-kit barrel exports in sync.",
  ].join("\n");

  if (warnOnly) {
    console.warn(message);
    process.exit(0);
  }

  console.error(message);
  process.exit(1);
}

main();
