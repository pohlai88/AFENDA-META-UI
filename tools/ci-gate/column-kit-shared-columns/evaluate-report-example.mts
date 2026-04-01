#!/usr/bin/env node
/**
 * Example: consume `evaluateSharedColumnCoverage` in CI — exit 1 on policy failure,
 * print informational unexpecteds as warnings only.
 *
 * Run from repo root (relative import avoids package resolution when invoked via tsx):
 *   pnpm exec tsx tools/ci-gate/column-kit-shared-columns/evaluate-report-example.mts
 *
 * In app code, prefer: `import { evaluateSharedColumnCoverage } from "@afenda/db/columns"`.
 */
import { evaluateSharedColumnCoverage } from "../../../packages/db/src/column-kit/index.ts";

const sampleColumns = ["createdAt", "updatedAt", "approvedAt", "workflowStatus", "lineTotal"];

const report = evaluateSharedColumnCoverage(sampleColumns);

for (const column of report.unexpectedInformational) {
  console.warn(`[column-kit:governance:warn] informational unexpected column: ${column}`);
}

if (report.missingMandatory.length > 0) {
  console.error("[column-kit:governance:fail] missing mandatory:", report.missingMandatory.join(", "));
}

if (report.unexpectedCritical.length > 0) {
  console.error("[column-kit:governance:fail] critical unexpected:", report.unexpectedCritical.join(", "));
}

if (!report.isCompliant) {
  process.exitCode = 1;
}
