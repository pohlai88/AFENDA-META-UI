#!/usr/bin/env node
/**
 * Drizzle schema quality CI gate — glob-driven convention checks on packages/db/src/schema.
 *
 * Usage:
 *   node tools/ci-gate/drizzle-schema-quality/index.mjs
 *   pnpm ci:gate --gate=drizzle-schema-quality
 *
 * Options:
 *   --format=json          Machine-readable findings on stdout
 *   --baseline=<path>      JSON: { "baseline": { "file::table::ruleId": { ruleId, severity, reason } } } (+ optional legacy suppress[])
 *   --verbose              After baseline: log each suppressed finding key and reason (console mode only)
 *   --severity-threshold=error|warn   error (default): fail only on errors; warn: fail on warnings too
 *   --mode=fast|full       full (default): run extractor TABLE_PARSE_ERROR; fast: skip extractor
 *   --glob=<pattern>       Override glob (cwd = repo root), e.g. packages/db/src/schema/hr/**\/\*.ts
 */

import { readFileSync } from "node:fs";
import { isAbsolute, resolve } from "node:path";

import { REPO_ROOT } from "./config.mjs";
import { discoverSchemaFiles } from "./discover.mjs";
import { applyBaseline, loadBaseline } from "./baseline.mjs";
import { finalizeFindings } from "./severity.mjs";
import { run as runRls } from "./rules/rls-bypass-count.mjs";
import { run as runFk } from "./rules/fk-tenant-order.mjs";
import { run as runAnonIndex } from "./rules/anonymous-index.mjs";
import { run as runTableParse } from "./rules/table-parse.mjs";
import { run as runZodParity } from "./rules/zod-parity.mjs";
import { runProject as runRelationsDriftProject } from "./rules/relations-drift.mjs";

/** File-level rules (regex / line-based). */
const FILE_RULES = [runRls, runFk, runAnonIndex, runZodParity];

function parseArgs(argv) {
  let format = "console";
  let baselinePath = "";
  let verbose = false;
  let severityThreshold = "error";
  let mode = "full";
  let glob = "";

  for (const arg of argv) {
    if (arg === "--format=json") format = "json";
    else if (arg === "--verbose") verbose = true;
    else if (arg.startsWith("--baseline=")) baselinePath = arg.slice("--baseline=".length);
    else if (arg.startsWith("--severity-threshold=")) {
      const v = arg.slice("--severity-threshold=".length);
      if (v === "error" || v === "warn") severityThreshold = v;
    } else if (arg.startsWith("--mode=")) {
      const v = arg.slice("--mode=".length);
      if (v === "fast" || v === "full") mode = v;
    } else if (arg.startsWith("--glob=")) glob = arg.slice("--glob=".length);
  }

  return { format, baselinePath, verbose, severityThreshold, mode, glob };
}

/**
 * @param {import('./rule-ids.mjs').Finding[]} findings
 */
function countSeverities(findings) {
  let errors = 0;
  let warnings = 0;
  for (const f of findings) {
    if (f.severity === "error") errors += 1;
    else if (f.severity === "warn") warnings += 1;
  }
  return { errors, warnings };
}

/**
 * @param {import('./rule-ids.mjs').Finding[]} findings
 * @param {{ suppressedCount: number }} meta
 */
function reportConsole(findings, meta) {
  const { errors, warnings } = countSeverities(findings);
  const sup =
    meta.suppressedCount > 0 ? `; ${meta.suppressedCount} suppressed by baseline` : "";
  console.log(
    `drizzle-schema-quality: Findings: ${errors} error(s), ${warnings} warning(s)${sup}\n`
  );

  if (findings.length === 0) {
    if (meta.suppressedCount > 0) {
      console.log("  (no remaining findings after baseline — use --verbose for per-key reasons)\n");
    } else {
      console.log("  No issues.\n");
    }
    return;
  }

  const byFile = new Map();
  for (const f of findings) {
    if (!byFile.has(f.file)) byFile.set(f.file, []);
    byFile.get(f.file).push(f);
  }

  for (const [file, list] of [...byFile.entries()].sort()) {
    console.log(`${file}`);
    for (const f of list) {
      const loc = f.line != null ? `:${f.line}` : "";
      console.log(`  [${f.severity}] ${f.ruleId}${loc} — ${f.message}`);
      console.log(`      key: ${f.key}`);
    }
    console.log("");
  }
}

/**
 * @param {import('./rule-ids.mjs').Finding[]} findings
 * @param {{ suppressedCount: number }} meta
 */
function reportJson(findings, meta) {
  const { errors, warnings } = countSeverities(findings);
  console.log(
    JSON.stringify(
      {
        summary: {
          errorCount: errors,
          warnCount: warnings,
          suppressedByBaseline: meta.suppressedCount,
        },
        findings,
      },
      null,
      2
    )
  );
}

/**
 * @param {import('./rule-ids.mjs').Finding[]} findings
 * @param {"error"|"warn"} threshold
 */
function shouldFail(findings, threshold) {
  const errors = findings.filter((f) => f.severity === "error");
  if (errors.length > 0) return true;
  if (threshold === "warn" && findings.some((f) => f.severity === "warn")) return true;
  return false;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const baselineAbs = args.baselinePath
    ? isAbsolute(args.baselinePath)
      ? args.baselinePath
      : resolve(REPO_ROOT, args.baselinePath)
    : "";
  const { entries: baselineEntries, loadErrors } = baselineAbs
    ? loadBaseline(baselineAbs)
    : { entries: [], loadErrors: [] };

  if (loadErrors.length > 0) {
    for (const msg of loadErrors) {
      console.error(`drizzle-schema-quality: ${msg}`);
    }
    process.exit(1);
  }

  const files = discoverSchemaFiles(args.glob || undefined);

  /** @type {import('./rule-ids.mjs').Finding[]} */
  let findings = [];

  for (const abs of files) {
    const content = readFileSync(abs, "utf8");
    for (const rule of FILE_RULES) {
      findings.push(...rule(content, abs));
    }
    if (args.mode !== "fast") {
      findings.push(...runTableParse(content, abs));
    }
  }

  findings.push(
    ...runRelationsDriftProject({
      files,
      readFileSync,
    })
  );

  findings = finalizeFindings(findings);
  const { findings: afterBaseline, suppressed } = applyBaseline(findings, baselineEntries, {
    verbose: args.verbose && args.format === "console",
  });
  findings = afterBaseline;
  const suppressedCount = suppressed.length;

  if (args.format === "json") {
    reportJson(findings, { suppressedCount });
  } else {
    reportConsole(findings, { suppressedCount });
  }

  const fail = shouldFail(findings, args.severityThreshold);
  if (fail) {
    if (args.format !== "json") {
      console.error(
        `drizzle-schema-quality: FAILED (threshold=${args.severityThreshold}, mode=${args.mode})`
      );
    }
    process.exit(1);
  }

  if (args.format !== "json") {
    const { errors, warnings } = countSeverities(findings);
    const sup =
      suppressedCount > 0 ? `; ${suppressedCount} suppressed by baseline` : "";
    console.log(
      `drizzle-schema-quality: OK (${files.length} file(s), mode=${args.mode}; ${errors} errors, ${warnings} warnings${sup})\n`
    );
  }
  process.exit(0);
}

try {
  main();
} catch (err) {
  console.error(err);
  process.exit(1);
}
