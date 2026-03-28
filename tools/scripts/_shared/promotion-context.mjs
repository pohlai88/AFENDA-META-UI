import fs from "node:fs";
import path from "node:path";

export const LOCAL_REHEARSAL_CONTEXT = "local-rehearsal";
export const PRODUCTION_CANDIDATE_CONTEXT = "production-candidate";
const LOCAL_REHEARSAL_MARKER = "- Execution context: `local-rehearsal`";

function isCiEnvironment(env = process.env) {
  return env.CI === "true" || env.GITHUB_ACTIONS === "true";
}

export function getOrganizationPromotionEvidencePaths(root) {
  const basePath = path.join(root, "docs", "promotion-evidence", "organization");
  return {
    evidenceDir: basePath,
    checklistPath: path.join(basePath, "promotion-pr-checklist.md"),
    parityChecklistPath: path.join(basePath, "parity-window-checklist.md"),
    rollbackEvidencePath: path.join(basePath, "rollback-drill-evidence.md"),
  };
}

export function getAggregatePromotionEvidencePaths(root, aggregate) {
  const basePath = path.join(root, "docs", "promotion-evidence", aggregate);
  return {
    aggregate,
    evidenceDir: basePath,
    checklistPath: path.join(basePath, "promotion-pr-checklist.md"),
    parityChecklistPath: path.join(basePath, "parity-window-checklist.md"),
    rollbackEvidencePath: path.join(basePath, "rollback-drill-evidence.md"),
  };
}

export function getWorkflowPromotionEvidencePaths(root) {
  return getAggregatePromotionEvidencePaths(root, "workflow");
}

export function getWorkflowInstancePromotionEvidencePaths(root) {
  return getAggregatePromotionEvidencePaths(root, "workflow_instance");
}

export function getTenantPromotionEvidencePaths(root) {
  return getAggregatePromotionEvidencePaths(root, "tenant");
}

export function resolvePromotionContext(input = {}) {
  const {
    args = process.argv.slice(2),
    env = process.env,
    parityChecklistPath,
  } = input;

  if (args.includes("--production-candidate")) {
    return PRODUCTION_CANDIDATE_CONTEXT;
  }

  if (args.includes("--local-rehearsal")) {
    return LOCAL_REHEARSAL_CONTEXT;
  }

  if (env.AFENDA_PROMOTION_CONTEXT === PRODUCTION_CANDIDATE_CONTEXT) {
    return PRODUCTION_CANDIDATE_CONTEXT;
  }

  if (env.AFENDA_PROMOTION_CONTEXT === LOCAL_REHEARSAL_CONTEXT) {
    return LOCAL_REHEARSAL_CONTEXT;
  }

  if (!parityChecklistPath || !fs.existsSync(parityChecklistPath)) {
    return PRODUCTION_CANDIDATE_CONTEXT;
  }

  const parityChecklist = fs.readFileSync(parityChecklistPath, "utf8");
  if (parityChecklist.includes(LOCAL_REHEARSAL_MARKER)) {
    return LOCAL_REHEARSAL_CONTEXT;
  }

  return PRODUCTION_CANDIDATE_CONTEXT;
}

export function isLocalRehearsalContext(input = {}) {
  return resolvePromotionContext(input) === LOCAL_REHEARSAL_CONTEXT;
}

export function assertProductionCandidateContextInCi(input = {}) {
  const env = input.env ?? process.env;
  if (!isCiEnvironment(env)) {
    return;
  }

  const context = resolvePromotionContext({
    ...input,
    env,
  });

  if (context === LOCAL_REHEARSAL_CONTEXT) {
    throw new Error(
      "promotion-context: CI must run in production-candidate mode; local-rehearsal is only allowed for local execution."
    );
  }
}
