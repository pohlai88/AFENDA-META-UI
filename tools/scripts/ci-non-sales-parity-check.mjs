import { createNonSalesParityChecks } from "./_shared/non-sales-checks.mjs";
import {
  resolveNonSalesGovernanceContext,
  runCheckSuite,
} from "./_shared/non-sales-governance-engine.mjs";
import { assertProductionCandidateContextInCi } from "./_shared/promotion-context.mjs";

const context = resolveNonSalesGovernanceContext();
const checks = createNonSalesParityChecks();

try {
  assertProductionCandidateContextInCi({
    parityChecklistPath: context.evidencePaths.parityChecklistPath,
  });

  runCheckSuite(checks, {
    root: context.root,
    mode: context.mode,
    failFast: true,
    captureOutput: false,
  });
} catch {
  process.exit(1);
}

console.log(`\n✅ Non-sales parity execution checks passed (${context.mode}).`);
