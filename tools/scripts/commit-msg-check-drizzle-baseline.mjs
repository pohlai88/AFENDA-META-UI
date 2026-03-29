#!/usr/bin/env node
/**
 * Husky commit-msg helper: if staged files include drizzle-schema-quality baseline.json,
 * require an explicit marker in the commit message so suppressions stay intentional.
 *
 * Allowed markers (anywhere in subject or body, case-insensitive where noted):
 *   [baseline]   Baseline:   BASELINE:   schema-quality baseline
 */
import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, "../..");
const baselineRel = "tools/ci-gate/drizzle-schema-quality/baseline.json";

const msgPath = process.argv[2];
if (!msgPath) process.exit(0);

const markers = [/\[baseline\]/i, /\bBaseline:/i, /\bBASELINE:/i, /schema-quality baseline/i];

function pathMatchesBaseline(p) {
  const n = p.replace(/\\/g, "/");
  return n === baselineRel || n.endsWith("/" + baselineRel);
}

const staged = spawnSync("git", ["diff", "--cached", "--name-only"], {
  cwd: repoRoot,
  encoding: "utf8",
});
if (staged.status !== 0) process.exit(0);

const touchesBaseline = staged.stdout
  .split("\n")
  .map((s) => s.trim())
  .filter(Boolean)
  .some(pathMatchesBaseline);

if (!touchesBaseline) process.exit(0);

let msg = "";
try {
  msg = readFileSync(msgPath, "utf8");
} catch {
  process.exit(0);
}

if (markers.some((re) => re.test(msg))) process.exit(0);

console.error("");
console.error("This commit modifies tools/ci-gate/drizzle-schema-quality/baseline.json.");
console.error("Add a baseline justification to the commit message, e.g. one of:");
console.error('  [baseline] …');
console.error("  Baseline: <short reason>");
console.error("  BASELINE: <short reason>");
console.error("  … schema-quality baseline …");
console.error("");
process.exit(1);
