import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import {
  assertProductionCandidateContextInCi,
  LOCAL_REHEARSAL_CONTEXT,
} from "./_shared/promotion-context.mjs";
import { resolveNonSalesGovernanceContext } from "./_shared/non-sales-governance-engine.mjs";

const ROOT = process.cwd();
const context = resolveNonSalesGovernanceContext({ root: ROOT });
const { checklistPath, parityChecklistPath, rollbackEvidencePath } = context.evidencePaths;

function fail(message) {
  console.error(`❌ ${message}`);
  process.exit(1);
}

function tryExec(command) {
  try {
    return execSync(command, { cwd: ROOT, stdio: ["ignore", "pipe", "pipe"], encoding: "utf8" }).trim();
  } catch {
    return "";
  }
}

function getChangedFiles() {
  const baseRef = process.env.GITHUB_BASE_REF;

  if (baseRef) {
    tryExec(`git fetch --no-tags --prune --depth=1 origin ${baseRef}`);
    const rangeOutput = tryExec(`git diff --name-only origin/${baseRef}...HEAD`);
    if (rangeOutput) {
      return rangeOutput.split(/\r?\n/).filter(Boolean);
    }
  }

  const fallback = tryExec("git diff --name-only HEAD~1..HEAD");
  return fallback ? fallback.split(/\r?\n/).filter(Boolean) : [];
}

function isOrganizationPromotionChange() {
  const baseRef = process.env.GITHUB_BASE_REF;
  const diffCommand = baseRef
    ? `git diff origin/${baseRef}...HEAD -- packages/db/src/truth-compiler/truth-config.ts`
    : "git diff HEAD~1..HEAD -- packages/db/src/truth-compiler/truth-config.ts";
  const diffText = tryExec(diffCommand);

  if (!diffText) {
    return false;
  }

  return (
    (diffText.includes('"platform.organization.command_event_only"') ||
      diffText.includes('"platform.organization.command_dual_write"')) &&
    diffText.includes('+    mutationPolicy: "event-only"')
  );
}

function validateCheckedChecklist(filePath, label) {
  if (!fs.existsSync(filePath)) {
    fail(`Missing required ${label} artifact: ${path.relative(ROOT, filePath)}`);
  }

  const content = fs.readFileSync(filePath, "utf8");
  const unchecked = content.split(/\r?\n/).filter((line) => line.trim().startsWith("- [ ]"));
  if (unchecked.length > 0) {
    fail(
      `${label} contains unchecked items. Complete all checklist items before promotion. File: ${path.relative(ROOT, filePath)}`
    );
  }
}

function main() {
  try {
    assertProductionCandidateContextInCi({ parityChecklistPath });
  } catch (error) {
    fail(error instanceof Error ? error.message : "Invalid promotion execution context in CI.");
  }

  const changedFiles = getChangedFiles();
  if (changedFiles.length === 0) {
    console.log("✅ Organization promotion checklist check skipped (no changed files detected).");
    return;
  }

  const promotionChange = isOrganizationPromotionChange();
  if (!promotionChange) {
    console.log("✅ Organization promotion checklist check skipped (no organization event-only promotion detected).");
    return;
  }

  if (context.mode === LOCAL_REHEARSAL_CONTEXT) {
    console.log(
      "✅ Organization promotion checklist check skipped (local rehearsal context; production approval enforcement not required)."
    );
    return;
  }

  validateCheckedChecklist(checklistPath, "promotion PR checklist");
  validateCheckedChecklist(parityChecklistPath, "parity window checklist");

  if (!fs.existsSync(rollbackEvidencePath)) {
    fail(
      `Missing required rollback drill evidence artifact: ${path.relative(ROOT, rollbackEvidencePath)}`
    );
  }

  console.log("✅ Organization promotion checklist automation check passed.");
}

main();