#!/usr/bin/env tsx
/**
 * CI helper: validate a graph-validation JSON report file (strict v1 contract).
 * Usage: pnpm --filter @afenda/db exec tsx src/graph-validation/validate-artifact.ts path/to/report.json
 */

import { readFileSync } from "node:fs";
import { parseGraphValidationReportJson } from "./policy-from-report.js";

const path = process.argv[2];
if (!path) {
  console.error("Usage: validate-artifact.ts <report.json>");
  process.exit(1);
}

try {
  const raw = JSON.parse(readFileSync(path, "utf-8")) as unknown;
  parseGraphValidationReportJson(raw);
  console.log("OK: report matches graph-validation v1 contract");
  process.exit(0);
} catch (e) {
  console.error("Invalid report:", e);
  process.exit(1);
}
