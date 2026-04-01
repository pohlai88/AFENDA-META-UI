#!/usr/bin/env node
/**
 * Enforce adjunct status on a graph-validation JSON report.
 * Usage: node check-adjuncts.mjs <validation-report.json>
 *
 * CI_GRAPH_ADJUNCTS_STRICT=true  → exit 1 if any adjunct check has status "failed"
 * CI_GRAPH_ADJUNCTS_STRICT=false → always exit 0 (default)
 */
import { readFileSync, existsSync } from "node:fs";

const path = process.argv[2];
const strict = process.env.CI_GRAPH_ADJUNCTS_STRICT === "true";

if (!path) {
  console.error("Usage: check-adjuncts.mjs <validation-report.json>");
  process.exit(2);
}

if (!existsSync(path)) {
  console.error(`Report not found: ${path}`);
  process.exit(strict ? 1 : 0);
}

const report = JSON.parse(readFileSync(path, "utf-8"));
const checks = report.adjuncts?.checks;
if (!Array.isArray(checks) || checks.length === 0) {
  console.log("No adjuncts in report; nothing to enforce.");
  process.exit(0);
}

const failed = checks.filter((c) => c.status === "failed");
const warnings = checks.filter((c) => c.status === "warning");

for (const c of checks) {
  console.log(`[adjunct] ${c.id}: ${c.status} — ${c.message}`);
}

if (!strict) {
  console.log("CI_GRAPH_ADJUNCTS_STRICT is not true; adjunct failures are advisory.");
  process.exit(0);
}

if (failed.length > 0) {
  console.error(`Strict mode: ${failed.length} adjunct check(s) failed.`);
  process.exit(1);
}

if (warnings.length > 0) {
  console.warn(`Note: ${warnings.length} adjunct check(s) in warning state (allowed in strict mode).`);
}

process.exit(0);
