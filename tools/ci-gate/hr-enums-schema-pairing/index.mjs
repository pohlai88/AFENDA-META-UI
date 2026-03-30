#!/usr/bin/env node
/**
 * HR `_enums.ts`: each `hrSchema.enum("…", [ ...spread ])` should have a matching Zod surface.
 *
 * - Pass if `z.enum(spreadId)` appears, OR
 * - `export const spreadId = standardApprovalWorkflowStatuses` and
 *   `z.enum(standardApprovalWorkflowStatuses)` exists (shared workflow tuple).
 *
 * Scope: `packages/db/src/schema/hr/_enums.ts` only (not `_zodShared.ts`).
 *
 * Usage:
 *   node tools/ci-gate/hr-enums-schema-pairing/index.mjs
 *   HR_ENUMS_GATE=warn  → print issues, exit 0
 */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, "..", "..", "..");
const ENUMS = join(repoRoot, "packages", "db", "src", "schema", "hr", "_enums.ts");

const warnOnly = process.env.HR_ENUMS_GATE === "warn";

const src = readFileSync(ENUMS, "utf8");

const hasStandardWorkflowZod = /z\.enum\s*\(\s*standardApprovalWorkflowStatuses\b/.test(src);

/**
 * @param {string} spreadId
 */
function hasZodPairing(spreadId) {
  if (new RegExp(`z\\.enum\\s*\\(\\s*${spreadId}\\b`).test(src)) return true;
  if (new RegExp(`export\\s+const\\s+${spreadId}\\s*=\\s*standardApprovalWorkflowStatuses\\b`).test(src)) {
    return hasStandardWorkflowZod;
  }
  return false;
}

const hrEnumRe = /hrSchema\.enum\(\s*["']([^"']+)["']\s*,\s*\[([\s\S]*?)\]\s*\)/g;

const failures = [];
for (const m of src.matchAll(hrEnumRe)) {
  const dbName = m[1];
  const inner = m[2].trim();
  const spreadMatches = [...inner.matchAll(/\.\.\.\s*([a-zA-Z0-9_]+)/g)].map((x) => x[1]);
  if (spreadMatches.length === 0) {
    failures.push(`${dbName}: no spread identifier (inline values?) — review manually`);
    continue;
  }
  if (spreadMatches.length > 1) {
    continue;
  }
  const spread = spreadMatches[0];
  if (!hasZodPairing(spread)) {
    failures.push(`${dbName}: [...${spread}] has no matching z.enum / workflow pairing`);
  }
}

if (failures.length > 0) {
  const msg = `hr-enums-schema-pairing: ${failures.length} issue(s)\n${failures.map((f) => `  - ${f}`).join("\n")}`;
  if (warnOnly) {
    console.warn(msg);
    process.exit(0);
  }
  console.error(msg);
  process.exit(1);
}

console.log("hr-enums-schema-pairing: OK");
