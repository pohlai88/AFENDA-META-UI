#!/usr/bin/env node
/**
 * Lists remaining temporal drift patterns for phased migration (Phase 3 helper).
 * Does not modify files.
 *
 *   node tools/scripts/temporal-wire-report.mjs
 */

import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, "..", "..");

function listTrackedSources() {
  const out = execSync("git ls-files", { cwd: repoRoot, encoding: "utf8" });
  return out
    .split("\n")
    .map((s) => s.trim())
    .filter((f) => f && (f.endsWith(".ts") || f.endsWith(".tsx")));
}

const patterns = [
  { name: "Date.parse(", re: /Date\.parse\s*\(/ },
  { name: "z.coerce.date(", re: /z\.coerce\.date\s*\(/ },
];

const skipTemporal = (rel) =>
  rel.replace(/\\/g, "/") === "packages/db/src/wire/temporal.ts";

for (const { name, re } of patterns) {
  console.log(`\n== ${name} ==\n`);
  for (const rel of listTrackedSources()) {
    if (skipTemporal(rel) && name === "Date.parse(") continue;
    const abs = join(repoRoot, rel);
    let content;
    try {
      content = readFileSync(abs, "utf8");
    } catch {
      continue;
    }
    const lines = content.split(/\r?\n/);
    for (let i = 0; i < lines.length; i++) {
      if (re.test(lines[i]) && !lines[i].trim().startsWith("//")) {
        console.log(`  ${rel}:${i + 1}`);
      }
    }
  }
}
