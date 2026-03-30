#!/usr/bin/env node
/**
 * HR schema: forbid `z.any()` in all `packages/db/src/schema/hr` TypeScript modules.
 *
 * Insert/update Zod for jsonb and loose payloads must use `z.json()`, `metadataSchema`,
 * `jsonObjectNullishSchema`, or structured objects — see SCHEMA_LOCKDOWN.md §6.
 *
 * Usage:
 *   node tools/ci-gate/hr-schema-no-z-any/index.mjs
 *   pnpm ci:gate:hr-no-z-any
 *
 * Env:
 *   HR_NO_Z_ANY_GATE=warn  → print violations, exit 0
 */

import { readFileSync, readdirSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, "..", "..", "..");
const HR_ROOT = join(repoRoot, "packages", "db", "src", "schema", "hr");

const warnOnly = process.env.HR_NO_Z_ANY_GATE === "warn";

/** @type {RegExp} */
const Z_ANY_RE = /z\.\s*any\s*\(/g;

/**
 * @param {string} line
 */
function codeSliceForMatch(line) {
  let s = line.replace(/\/\*[\s\S]*?\*\//g, " ");
  const i = s.indexOf("//");
  if (i >= 0) s = s.slice(0, i);
  return s;
}

/**
 * @param {string} line
 * @param {string} codeSlice
 */
function shouldIgnoreLine(line, codeSlice) {
  const t = line.trim();
  if (t.startsWith("//")) return true;
  if (t.startsWith("*") || t.startsWith("/*")) return true;
  if (!codeSlice.trim()) return true;
  return false;
}

/**
 * @param {string} content
 * @returns {number[]}
 */
function violationLines(content) {
  /** @type {number[]} */
  const out = [];
  const lines = content.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const codeSlice = codeSliceForMatch(line);
    if (shouldIgnoreLine(line, codeSlice)) continue;
    Z_ANY_RE.lastIndex = 0;
    if (Z_ANY_RE.test(codeSlice)) out.push(i + 1);
  }
  return out;
}

/**
 * @param {string} dir
 * @param {string[]} acc
 */
function walkHrTs(dir, acc) {
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const ent of entries) {
    const p = join(dir, ent.name);
    if (ent.isDirectory()) {
      if (ent.name === "hr-docs") continue;
      walkHrTs(p, acc);
    } else if (ent.name.endsWith(".ts")) {
      acc.push(p);
    }
  }
}

function main() {
  console.log("🔍 HR schema gate: no z.any() under packages/db/src/schema/hr\n");

  /** @type {string[]} */
  const files = [];
  walkHrTs(HR_ROOT, files);
  files.sort();

  /** @type {{ file: string; line: number }[]} */
  const violations = [];

  for (const abs of files) {
    let content;
    try {
      content = readFileSync(abs, "utf8");
    } catch {
      continue;
    }
    const lines = violationLines(content);
    const rel = relative(repoRoot, abs).replace(/\\/g, "/");
    for (const line of lines) {
      violations.push({ file: rel, line });
    }
  }

  if (violations.length === 0) {
    console.log(`✓ Scanned ${files.length} file(s) — no z.any()\n`);
    console.log("✅ hr-schema-no-z-any gate passed");
    process.exit(0);
  }

  const msg = [
    `hr-schema-no-z-any: ${violations.length} violation(s)`,
    ...violations.map((v) => `  ${v.file}:${v.line}`),
    "",
    "Replace with z.json(), jsonObjectNullishSchema, metadataSchema, or explicit z.object / z.array.",
  ].join("\n");

  if (warnOnly) {
    console.warn(msg);
    process.exit(0);
  }

  console.error(msg);
  process.exit(1);
}

main();
