import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const ROOT = process.cwd();
const nowIso = new Date().toISOString();
const args = new Set(process.argv.slice(2));
const dryRun = args.has("--dry-run");
const devMode = args.has("--dev-mode");

const evidenceDir = path.join(ROOT, "docs", "promotion-evidence", "cutover");
const rollbackPointsPath = path.join(evidenceDir, "phase-rollback-points.md");
const stabilizationReportPath = path.join(evidenceDir, "stabilization-cycle-report.md");

// Core promotion-specific gates (always run)
const corePromotionGates = [
  "pnpm ci:policy:contract-consistency",
  "pnpm ci:api:command-bounded-context",
  "pnpm ci:api:projection-replay",
  "pnpm ci:promotion:non-sales",
  "pnpm ci:parity:non-sales",
  "pnpm ci:promotion:organization:checklist",
  "pnpm --filter @afenda/db truth:check",
  "pnpm --filter @afenda/db truth:schema:compare",
];

// Pre-existing infrastructure gates (skipped in dev-mode)
const infrastructureGates = [
  "pnpm ci:gate",
  "pnpm ci:gate:exports",
  "pnpm ci:gate:truth-schema-drift",
  "pnpm ci:release:governance",
  "pnpm run build",
  "pnpm --filter @afenda/api test",
];

const preCutoverGateCommands = devMode 
  ? corePromotionGates 
  : [...corePromotionGates, ...infrastructureGates];

const stabilizationCommands = [
  "pnpm --filter @afenda/api exec vitest run src/policy/__test__/mutation-command-gateway.test.ts",
  "pnpm --filter @afenda/api exec vitest run src/routes/__test__/tenant.route.test.ts src/routes/__test__/organization.route.test.ts src/routes/__test__/workflow.route.test.ts",
  "pnpm --filter @afenda/api exec vitest run src/events/__test__/projectionRuntime.test.ts src/events/__test__/cross-context-drift-fixture.test.ts src/events/__test__/workflow-replay-concurrency-fixture.test.ts",
  "pnpm ci:parity:non-sales",
];

const phaseRollbackPoints = [
  {
    phase: "Phase 1",
    rollbackPoint:
      "Revert mutation policy registry changes in packages/db/src/truth-compiler/truth-config.ts and rerun pnpm ci:policy:contract-consistency.",
  },
  {
    phase: "Phase 2",
    rollbackPoint:
      "Revert command-runtime spine extraction in apps/api command-service modules and rerun pnpm ci:api:command-bounded-context.",
  },
  {
    phase: "Phase 3",
    rollbackPoint:
      "Revert shared actor-resolution helper usage in tenant/organization/workflow routes and rerun route tests for tenant/organization/workflow.",
  },
  {
    phase: "Phase 4",
    rollbackPoint:
      "Revert shared non-sales governance engine integration and rerun pnpm ci:promotion:non-sales plus pnpm ci:parity:non-sales.",
  },
  {
    phase: "Phase 5",
    rollbackPoint:
      "Revert rollout and evidence docs to prior reviewed baseline and rerun pnpm ci:promotion:non-sales to confirm required runbook markers.",
  },
  {
    phase: "Phase 6",
    rollbackPoint:
      "Revert Phase 6 edge-case tests only if they fail legitimately and rerun targeted gateway/route/command-service suites before merging.",
  },
  {
    phase: "Phase 7",
    rollbackPoint:
      "Revert CI hard-gate additions only with explicit approval and rerun pnpm ci:release:governance to verify required marker checks.",
  },
  {
    phase: "Phase 8",
    rollbackPoint:
      "If any full-run gate or stabilization check fails, stop cutover, keep current production policy states, remediate failures, and rerun this cutover pass from the beginning.",
  },
];

function ensureEvidenceDir() {
  fs.mkdirSync(evidenceDir, { recursive: true });
}

function writeRollbackPoints() {
  const lines = [];
  lines.push("# Phase Rollback Points");
  lines.push("");
  lines.push(`- Last updated (UTC): ${nowIso}`);
  lines.push("");

  for (const entry of phaseRollbackPoints) {
    lines.push(`## ${entry.phase}`);
    lines.push("");
    lines.push(`- Rollback point: ${entry.rollbackPoint}`);
    lines.push("");
  }

  fs.writeFileSync(rollbackPointsPath, `${lines.join("\n")}\n`, "utf8");
  console.log(`✅ Phase rollback points refreshed: ${path.relative(ROOT, rollbackPointsPath)}`);
}

function runCommand(command) {
  const result = spawnSync(command, {
    cwd: ROOT,
    shell: true,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });

  return {
    command,
    status: result.status ?? 1,
    stdout: (result.stdout ?? "").trim(),
    stderr: (result.stderr ?? "").trim(),
  };
}

function runPhase(label, commands) {
  const report = [];
  console.log(`\n=== ${label} ===`);

  for (const command of commands) {
    console.log(`\n▶ ${command}`);

    if (dryRun) {
      report.push({ command, status: 0, stdout: "(dry-run)", stderr: "" });
      console.log("✅ (dry-run)");
      continue;
    }

    const output = runCommand(command);
    report.push(output);

    if (output.status !== 0) {
      console.error(`❌ Failed: ${command}`);
      if (output.stdout) console.log(output.stdout);
      if (output.stderr) console.error(output.stderr);
      throw new Error(`cutover-stabilization: command failed: ${command}`);
    }

    console.log("✅ Passed");
  }

  return report;
}

function writeStabilizationReport(preCutoverReport, stabilizationReport) {
  const lines = [];
  lines.push("# Cutover Stabilization Cycle Report");
  lines.push("");
  lines.push(`- Generated at (UTC): ${nowIso}`);
  lines.push(`- Mode: ${dryRun ? "dry-run" : devMode ? "dev-mode (core gates only)" : "full-execution"}`);
  if (devMode) {
    lines.push(`- Note: Infrastructure gates skipped (ci:gate, contracts, build, full test suite)`);
    lines.push(`- Focus: Promotion-specific validation only (policy, parity, projection replay)`);
  }
  lines.push("");
  lines.push("## Cutover Gate Pass (full run prerequisite)");
  lines.push("");

  for (const row of preCutoverReport) {
    lines.push(`- [${row.status === 0 ? "x" : " "}] ${row.command}`);
  }

  lines.push("");
  lines.push("## Stabilization Cycle (policy violations and projection drift)");
  lines.push("");

  for (const row of stabilizationReport) {
    lines.push(`- [${row.status === 0 ? "x" : " "}] ${row.command}`);
  }

  lines.push("");
  lines.push("## Enforcement Summary");
  lines.push("");
  lines.push("- Cutover pass proceeds only when every full-run gate command is green.");
  lines.push("- Rollback points are tracked in docs/promotion-evidence/cutover/phase-rollback-points.md.");
  lines.push("- Stabilization cycle explicitly checks mutation-policy guardrails and projection-drift diagnostics.");

  fs.writeFileSync(stabilizationReportPath, `${lines.join("\n")}\n`, "utf8");
  console.log(`✅ Stabilization report written: ${path.relative(ROOT, stabilizationReportPath)}`);
}

function main() {
  ensureEvidenceDir();
  writeRollbackPoints();

  const preCutoverReport = runPhase("Pre-cutover full gate run", preCutoverGateCommands);
  const stabilizationReport = runPhase(
    "Post-cutover stabilization cycle",
    stabilizationCommands
  );

  writeStabilizationReport(preCutoverReport, stabilizationReport);

  console.log("\n✅ Phase 8 cutover and stabilization pass completed.");
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : "cutover-stabilization: failed");
  process.exit(1);
}
