#!/usr/bin/env node

/**
 * Temporal wire contract gate
 * ===========================
 * Prevents drift away from `@afenda/db/wire` for calendar dates and discourages
 * `z.coerce.date()` in Drizzle insert-schema overrides under `packages/db/src/schema`.
 *
 * Rules:
 * 1. `z.string().regex(/^\\d{4}-\\d{2}-\\d{2}$/)` — only allowed in
 *    `packages/db/src/wire/temporal.ts` (use `dateOnlyWire`).
 * 2. `z.coerce.date(` under `packages/db/src/schema/` — only allowed in paths listed in
 *    `temporal-wire/allowlist.json` (shrink over time).
 *
 * `Date.parse(` is not banned here (still used in refinements and policy helpers);
 * prefer AST-based lint later.
 *
 * Usage:
 *   node tools/ci-gate/temporal-wire/index.mjs
 *   pnpm ci:gate:temporal-wire
 */

import { readFileSync, existsSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const repoRoot = join(__dirname, "..", "..", "..");

const ALLOWLIST_PATH = join(__dirname, "allowlist.json");

const ISO_DATE_REGEX_SNIPPET = /regex\s*\(\s*\/\^\\d\{4\}-\\d\{2\}-\\d\{2\}\$\//;

function loadCoerceAllowlist() {
  if (!existsSync(ALLOWLIST_PATH)) return [];
  try {
    const raw = JSON.parse(readFileSync(ALLOWLIST_PATH, "utf8"));
    return Array.isArray(raw.zCoerceDateInSchema) ? raw.zCoerceDateInSchema : [];
  } catch {
    return [];
  }
}

function stripComments(line) {
  let s = line.replace(/\/\*[\s\S]*?\*\//g, " ");
  const i = s.indexOf("//");
  if (i >= 0) s = s.slice(0, i);
  return s;
}

function listTrackedSources() {
  try {
    const out = execSync("git ls-files", {
      cwd: repoRoot,
      encoding: "utf8",
      maxBuffer: 64 * 1024 * 1024,
    });
    return out
      .split("\n")
      .map((s) => s.trim())
      .filter((f) => f && (f.endsWith(".ts") || f.endsWith(".tsx")));
  } catch {
    return [];
  }
}

function isUnderSchema(rel) {
  const norm = rel.replace(/\\/g, "/");
  return norm.startsWith("packages/db/src/schema/") && norm.endsWith(".ts");
}

function main() {
  console.log("Temporal wire gate (regex date + schema z.coerce.date allowlist)\n");

  const coerceAllowlist = new Set(
    loadCoerceAllowlist().map((p) => p.replace(/\\/g, "/"))
  );

  const files = listTrackedSources();
  /** @type {{ file: string; line: number; rule: string }[]} */
  const violations = [];

  const coerceRe = /z\.coerce\.date\s*\(/;

  for (const rel of files) {
    const abs = join(repoRoot, rel);
    let content;
    try {
      content = readFileSync(abs, "utf8");
    } catch {
      continue;
    }

    const lines = content.split(/\r?\n/);
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const code = stripComments(line);
      if (!code.trim() || code.trim().startsWith("*")) continue;

      if (ISO_DATE_REGEX_SNIPPET.test(code)) {
        const norm = rel.replace(/\\/g, "/");
        if (!norm.endsWith("packages/db/src/wire/temporal.ts")) {
          violations.push({
            file: rel,
            line: i + 1,
            rule: "Use dateOnlyWire from @afenda/db/wire instead of YYYY-MM-DD z.string().regex",
          });
        }
      }

      if (isUnderSchema(rel) && coerceRe.test(code)) {
        const norm = rel.replace(/\\/g, "/");
        if (!coerceAllowlist.has(norm)) {
          violations.push({
            file: rel,
            line: i + 1,
            rule:
              "z.coerce.date() in schema — use dateOnlyWire / instantWire from @afenda/db/wire (or add path to tools/ci-gate/temporal-wire/allowlist.json temporarily)",
          });
        }
      }
    }
  }

  if (violations.length === 0) {
    console.log(`✓ Scanned ${files.length} files — temporal wire gate passed\n`);
    process.exit(0);
  }

  console.log(`✗ ${violations.length} violation(s):\n`);
  for (const v of violations) {
    console.log(`  ${v.file}:${v.line}  ${v.rule}`);
  }
  console.log("\n❌ temporal-wire gate failed");
  process.exit(1);
}

main();
