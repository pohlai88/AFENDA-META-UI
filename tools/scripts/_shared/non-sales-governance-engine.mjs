import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import {
  LOCAL_REHEARSAL_CONTEXT,
  PRODUCTION_CANDIDATE_CONTEXT,
  getOrganizationPromotionEvidencePaths,
  getWorkflowPromotionEvidencePaths,
  getWorkflowInstancePromotionEvidencePaths,
  getTenantPromotionEvidencePaths,
  resolvePromotionContext,
} from "./promotion-context.mjs";

export function resolveNonSalesGovernanceContext(input = {}) {
  const root = input.root ?? process.cwd();
  const args = input.args ?? process.argv.slice(2);
  const env = input.env ?? process.env;
  const aggregate = input.aggregate ?? "organization"; // Default to organization for backward compat
  
  let evidencePaths;
  switch (aggregate) {
    case "workflow":
      evidencePaths = getWorkflowPromotionEvidencePaths(root);
      break;
    case "workflow_instance":
      evidencePaths = getWorkflowInstancePromotionEvidencePaths(root);
      break;
    case "tenant":
      evidencePaths = getTenantPromotionEvidencePaths(root);
      break;
    case "organization":
    default:
      evidencePaths = getOrganizationPromotionEvidencePaths(root);
      break;
  }

  const mode = resolvePromotionContext({
    args,
    env,
    parityChecklistPath: evidencePaths.parityChecklistPath,
  });

  return {
    root,
    aggregate,
    mode,
    localRehearsal: mode === LOCAL_REHEARSAL_CONTEXT,
    productionCandidate: mode === PRODUCTION_CANDIDATE_CONTEXT,
    evidencePaths,
  };
}

export function executeCheckStep(step, options = {}) {
  const root = options.root ?? process.cwd();
  const captureOutput = options.captureOutput === true;
  const skipRun = options.skipRun === true;
  const command = `${step.command} ${(step.args ?? []).join(" ")}`.trim();

  if (skipRun) {
    return {
      status: 0,
      stdout: "(skipped)",
      stderr: "",
      command,
    };
  }

  const result = spawnSync(step.command, step.args ?? [], {
    cwd: root,
    shell: process.platform === "win32",
    encoding: "utf8",
    stdio: captureOutput ? ["ignore", "pipe", "pipe"] : "inherit",
  });

  return {
    status: result.status ?? 1,
    stdout: captureOutput ? (result.stdout ?? "").trim() : "",
    stderr: captureOutput ? (result.stderr ?? "").trim() : "",
    command,
  };
}

export function runCheckSuite(steps, options = {}) {
  const report = [];
  const mode = options.mode ?? "unknown";

  for (const step of steps) {
    console.log(`\n▶ ${step.label} (${mode})`);
    const output = executeCheckStep(step, options);
    report.push({ step, output });

    if (output.status !== 0) {
      console.error(`\n❌ Failed: ${step.label}`);
      if (options.captureOutput) {
        if (output.stdout) {
          console.log(output.stdout);
        }
        if (output.stderr) {
          console.error(output.stderr);
        }
      }

      if (options.failFast !== false) {
        const error = new Error(`non-sales-governance: check failed: ${step.label}`);
        error.report = report;
        throw error;
      }
    } else {
      console.log(`✅ Passed: ${step.label}`);
    }
  }

  return report;
}

export function validateRunbookGate(config) {
  const runbookPath = config.runbookPath;

  if (!fs.existsSync(runbookPath)) {
    throw new Error(`Missing required runbook: ${path.relative(config.root, runbookPath)}`);
  }

  const runbook = fs.readFileSync(runbookPath, "utf8");

  for (const row of config.requiredAggregateRows ?? []) {
    if (!runbook.includes(row)) {
      throw new Error(`Missing aggregate inventory row for ${row}`);
    }
  }

  for (const section of config.requiredChecklistSections ?? []) {
    if (!runbook.includes(section)) {
      throw new Error(`Missing non-sales promotion checklist requirement: ${section}`);
    }
  }

  for (const marker of config.requiredGateMarkers ?? []) {
    if (!runbook.includes(marker)) {
      throw new Error(`Missing promotion gate marker in runbook: ${marker}`);
    }
  }
}
