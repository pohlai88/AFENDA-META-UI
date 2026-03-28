/**
 * Promotion Orchestrator
 * ======================
 * Single entry-point that runs all promotion validation checks in sequence:
 *   1. Promotion gate checks    (runbook + aggregate rows + rollback docs)
 *   2. Parity execution checks  (command-service + route + projection tests)
 *   3. Organization checklist    (PR checklist + parity window + rollback drill evidence)
 *
 * Modes
 * -----
 * --production-candidate   Strict CI enforcement (default in CI)
 * --local-rehearsal        Lenient local preview
 *
 * Usage
 * -----
 *   pnpm ci:promotion          # auto-detects mode
 *   pnpm ci:promotion -- --local-rehearsal
 *   pnpm ci:promotion -- --production-candidate
 */

import { spawnSync } from "node:child_process";
import {
  resolvePromotionContext,
  LOCAL_REHEARSAL_CONTEXT,
  PRODUCTION_CANDIDATE_CONTEXT,
} from "./_shared/promotion-context.mjs";
import { resolveNonSalesGovernanceContext } from "./_shared/non-sales-governance-engine.mjs";

const ROOT = process.cwd();

const context = resolveNonSalesGovernanceContext({ root: ROOT });
const mode = resolvePromotionContext({
  parityChecklistPath: context.evidencePaths.parityChecklistPath,
});

const steps = [
  { label: "Promotion gate checks", command: "pnpm ci:promotion:non-sales" },
  { label: "Parity execution checks", command: "pnpm ci:parity:non-sales" },
  { label: "Organization checklist", command: "pnpm ci:promotion:organization:checklist" },
];

console.log(`\n🔎 Promotion orchestrator — mode: ${mode}\n`);

let passed = 0;
let failed = 0;
const results = [];

for (const step of steps) {
  console.log(`▶ ${step.label}`);
  console.log(`  ${step.command}`);

  const result = spawnSync(step.command, {
    cwd: ROOT,
    shell: true,
    encoding: "utf8",
    stdio: "inherit",
    env: { ...process.env, AFENDA_PROMOTION_CONTEXT: mode },
  });

  const ok = result.status === 0;
  results.push({ ...step, ok });

  if (ok) {
    passed++;
  } else {
    failed++;
    console.error(`  ❌ ${step.label} failed\n`);
  }
}

// Summary
console.log("\n───────────────────────────────────────────");
console.log("Promotion Orchestrator Summary");
console.log("───────────────────────────────────────────");
console.log(`Mode:   ${mode}`);
for (const r of results) {
  console.log(`  ${r.ok ? "✅" : "❌"} ${r.label}`);
}
console.log(`\nTotal: ${passed} passed, ${failed} failed`);

if (failed > 0) {
  process.exit(1);
}

console.log(`\n✅ All promotion checks passed (${mode}).`);
