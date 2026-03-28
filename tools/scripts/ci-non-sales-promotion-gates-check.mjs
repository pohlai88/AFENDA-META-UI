import fs from "node:fs";
import path from "node:path";
import {
  resolveNonSalesGovernanceContext,
  validateRunbookGate,
} from "./_shared/non-sales-governance-engine.mjs";
import { assertProductionCandidateContextInCi } from "./_shared/promotion-context.mjs";

const ROOT = process.cwd();
const RUNBOOK_PATH = path.join(ROOT, "docs", "policy-transition-operations.md");

function fail(message) {
  console.error(`❌ ${message}`);
  process.exit(1);
}

if (!fs.existsSync(RUNBOOK_PATH)) {
  fail("Missing required runbook: docs/policy-transition-operations.md");
}

const context = resolveNonSalesGovernanceContext({ root: ROOT });

try {
  assertProductionCandidateContextInCi({
    parityChecklistPath: context.evidencePaths.parityChecklistPath,
  });

  validateRunbookGate({
    root: ROOT,
    runbookPath: RUNBOOK_PATH,
    requiredAggregateRows: ["| `organization` |", "| `workflow` |", "| `workflow_instance` |"],
    requiredChecklistSections: [
      "### `organization`",
      "### `workflow`",
      "### `workflow_instance`",
      "Rollback target remains explicitly documented as `event-only -> dual-write`.",
    ],
    requiredGateMarkers: [
      "numeric actor identity",
      "parity window",
      "pnpm ci:api:command-bounded-context",
      "pnpm ci:api:projection-replay",
    ],
  });
} catch (error) {
  fail(error instanceof Error ? error.message : "non-sales promotion gate validation failed.");
}

console.log(`✅ Non-sales promotion gate checks passed (${context.mode}).`);
