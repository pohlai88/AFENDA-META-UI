#!/usr/bin/env node

/**
 * Zod 4 ISO string formats CI gate
 * =================================
 * Fails on deprecated `z.string().<iso>()` chains. Zod 4 documents top-level `z.iso.*` instead
 * (see `node_modules/zod/v4/classic/schemas.d.ts` — `ZodString#date`, `#datetime`, `#time`, `#duration`).
 *
 * | Deprecated              | Use                |
 * |-------------------------|--------------------|
 * | z.string().date(        | z.iso.date(        |
 * | z.string().datetime(    | z.iso.datetime(    |
 * | z.string().time(       | z.iso.time(        |
 * | z.string().duration(   | z.iso.duration(    |
 *
 * Scans tracked `*.ts` / `*.tsx` via `git ls-files` (repo root), with a filesystem fallback
 * if Git is unavailable.
 *
 * Usage:
 *   node tools/ci-gate/zod4-iso-dates/index.mjs
 *   pnpm ci:gate:zod4-iso-dates
 *   pnpm ci:gate --gate=zod4-iso-dates
 */

import { readFileSync, readdirSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const repoRoot = join(__dirname, "..", "..", "..");

/** Zod 4: `z.string().<method>(` → `z.iso.<method>(` — keep in sync with ZodString deprecations. */
const ISO_CHAIN_METHODS = /** @type {const} */ (["date", "datetime", "time", "duration"]);

/** @type {{ re: RegExp; use: string; label: string }[]} */
const RULES = ISO_CHAIN_METHODS.map((method) => {
  const re = new RegExp(
    `z\\.string\\s*\\(\\s*\\)\\s*\\.\\s*${method}\\s*\\(`,
    "g"
  );
  return {
    re,
    use: `z.iso.${method}(`,
    label: `z.string().${method}()`,
  };
});

/**
 * Strip line comments and block comments from a line for matching (best-effort).
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
 * @returns {{ line: number; rule: string; fix: string }[]}
 */
function findViolations(content) {
  /** @type {{ line: number; rule: string; fix: string }[]} */
  const out = [];
  const lines = content.split(/\r?\n/);

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const codeSlice = codeSliceForMatch(line);
    if (shouldIgnoreLine(line, codeSlice)) continue;

    for (const { re, use, label } of RULES) {
      re.lastIndex = 0;
      if (re.test(codeSlice)) {
        out.push({
          line: i + 1,
          rule: label,
          fix: `Replace with ${use}… (Zod 4 — https://v4.zod.dev/api )`,
        });
      }
    }
  }

  return out;
}

/**
 * @param {string} dir
 * @param {string} root
 * @param {string[]} acc
 */
function walkTsFallback(dir, root, acc) {
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const ent of entries) {
    if (ent.name === "node_modules" || ent.name === "dist" || ent.name === ".git") continue;
    const p = join(dir, ent.name);
    if (ent.isDirectory()) walkTsFallback(p, root, acc);
    else if (ent.name.endsWith(".ts") || ent.name.endsWith(".tsx")) {
      acc.push(relative(root, p).replace(/\\/g, "/"));
    }
  }
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
    const acc = [];
    for (const top of ["apps", "packages", "tools"]) {
      walkTsFallback(join(repoRoot, top), repoRoot, acc);
    }
    return [...new Set(acc)].sort();
  }
}

function main() {
  console.log(
    "🔍 Zod 4 ISO formats gate (no deprecated z.string().date|datetime|time|duration)\n"
  );

  const files = listTrackedSources();
  /** @type {{ file: string; line: number; rule: string; fix: string }[]} */
  const violations = [];

  for (const rel of files) {
    const abs = join(repoRoot, rel);
    let content;
    try {
      content = readFileSync(abs, "utf8");
    } catch {
      continue;
    }
    const found = findViolations(content);
    for (const v of found) {
      violations.push({ file: rel, ...v });
    }
  }

  if (violations.length === 0) {
    console.log(
      `✓ Scanned ${files.length} files — no deprecated Zod ISO chains on z.string()\n`
    );
    console.log("✅ zod4-iso-dates gate passed");
    process.exit(0);
  }

  console.log(`✗ Found ${violations.length} deprecated Zod chain(s):\n`);
  for (const v of violations) {
    console.log(`  ${v.file}:${v.line}  ${v.rule}`);
    console.log(`    → ${v.fix}\n`);
  }

  console.log("❌ zod4-iso-dates gate failed");
  process.exit(1);
}

main();
