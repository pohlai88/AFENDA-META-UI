import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const args = new Set(process.argv.slice(2));
const sopOnly = args.has("--sop-only");

function fail(message) {
  console.error(`❌ ${message}`);
  process.exit(1);
}

function readUtf8(relPath) {
  const filePath = path.join(ROOT, relPath);
  if (!fs.existsSync(filePath)) {
    fail(`Missing required file: ${relPath}`);
  }

  return fs.readFileSync(filePath, "utf8");
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
  const headRef = process.env.GITHUB_HEAD_REF;

  if (baseRef && headRef) {
    tryExec(`git fetch --no-tags --prune --depth=1 origin ${baseRef}`);
    const rangeOutput = tryExec(`git diff --name-only origin/${baseRef}...HEAD`);
    if (rangeOutput) {
      return rangeOutput.split(/\r?\n/).filter(Boolean);
    }
  }

  const fallback = tryExec("git diff --name-only HEAD~1..HEAD");
  return fallback ? fallback.split(/\r?\n/).filter(Boolean) : [];
}

function hasSkipReleaseFlag() {
  const baseRef = process.env.GITHUB_BASE_REF;
  if (baseRef) {
    tryExec(`git fetch --no-tags --prune --depth=1 origin ${baseRef}`);
    const rangeLog = tryExec(`git log --format=%s origin/${baseRef}..HEAD`);
    if (rangeLog.includes("[skip-release]")) {
      return true;
    }
  }

  const lastSubject = tryExec("git log -1 --format=%s");
  return lastSubject.includes("[skip-release]");
}

function isReleaseImpacting(filePath) {
  const infraOrDocs =
    filePath.startsWith("docs/") ||
    filePath.startsWith(".github/") ||
    filePath.startsWith("tools/") ||
    filePath.startsWith(".ideas/") ||
    filePath.endsWith(".md");
  if (infraOrDocs) {
    return false;
  }

  const testOnly =
    filePath.includes("/__test__/") ||
    filePath.endsWith(".test.ts") ||
    filePath.endsWith(".test.tsx") ||
    filePath.endsWith(".spec.ts") ||
    filePath.endsWith(".spec.tsx");
  if (testOnly) {
    return false;
  }

  return (
    filePath.startsWith("apps/") ||
    filePath.startsWith("packages/") ||
    filePath.startsWith("meta-types/") ||
    filePath.startsWith("ui/")
  );
}

function validateChangesetConfig() {
  const raw = readUtf8(".changeset/config.json");
  let config;

  try {
    config = JSON.parse(raw);
  } catch {
    fail(".changeset/config.json must be valid JSON.");
  }

  if (config.baseBranch !== "master") {
    fail('Expected .changeset/config.json to set "baseBranch" to "master".');
  }

  if (config.commit !== true) {
    fail('Expected .changeset/config.json to set "commit" to true for automated version promotion.');
  }
}

function validateReleaseWorkflow() {
  const workflow = readUtf8(".github/workflows/changesets-release.yml");

  const requiredMarkers = [
    "name: Changesets Release",
    "branches: [master, main]",
    "pnpm changeset version",
    "pnpm changeset publish",
  ];

  for (const marker of requiredMarkers) {
    if (!workflow.includes(marker)) {
      fail(`changesets-release workflow is missing required marker: ${marker}`);
    }
  }
}

function validateCiGovernanceHardGates() {
  const ciWorkflow = readUtf8(".github/workflows/ci.yml");
  const releaseGovernanceWorkflow = readUtf8(".github/workflows/release-governance.yml");

  const requiredCiMarkers = [
    "name: CI Pipeline",
    "AFENDA_PROMOTION_CONTEXT: production-candidate",
    "Policy contract consistency gate",
    "pnpm ci:policy:contract-consistency",
    "pnpm ci:promotion:non-sales",
    "pnpm ci:parity:non-sales",
    "pnpm ci:promotion:organization:checklist",
  ];

  for (const marker of requiredCiMarkers) {
    if (!ciWorkflow.includes(marker)) {
      fail(`CI workflow is missing required governance marker: ${marker}`);
    }
  }

  const requiredReleaseGovernanceMarkers = [
    "name: Release Governance",
    "AFENDA_PROMOTION_CONTEXT: production-candidate",
    "Policy contract consistency gate",
    "pnpm ci:policy:contract-consistency",
    "node tools/scripts/ci-non-sales-promotion-gates-check.mjs",
  ];

  for (const marker of requiredReleaseGovernanceMarkers) {
    if (!releaseGovernanceWorkflow.includes(marker)) {
      fail(`Release governance workflow is missing required marker: ${marker}`);
    }
  }
}

function validateSopCoverage() {
  const sop = readUtf8("docs/CHANGESET-SOP.md");

  const requiredSections = [
    "## Release Workflow",
    "### Automated Release (GitHub Actions)",
    "## PR Review Checklist",
    "## Required Governance Status Checks",
    "## Release Promotion Execution Checks",
    "## Rollback & Amendment",
  ];

  for (const section of requiredSections) {
    if (!sop.includes(section)) {
      fail(`CHANGESET SOP is missing required section: ${section}`);
    }
  }

  const requiredCommands = [
    "pnpm ci:release:governance",
    "pnpm ci:release:sop",
    "pnpm changeset status",
    "pnpm changeset version",
  ];

  for (const command of requiredCommands) {
    if (!sop.includes(command)) {
      fail(`CHANGESET SOP is missing required command reference: ${command}`);
    }
  }
}

function validatePrChangesetRequirement() {
  const eventName = process.env.GITHUB_EVENT_NAME ?? "";
  if (eventName !== "pull_request") {
    return;
  }

  const changedFiles = getChangedFiles();
  if (changedFiles.length === 0) {
    return;
  }

  const hasReleaseImpactingChanges = changedFiles.some(isReleaseImpacting);
  if (!hasReleaseImpactingChanges) {
    return;
  }

  const hasChangeset = changedFiles.some(
    (filePath) => filePath.startsWith(".changeset/") && filePath.endsWith(".md") && !filePath.endsWith("README.md")
  );

  if (hasChangeset || hasSkipReleaseFlag()) {
    return;
  }

  fail(
    "Release-impacting PR changes require a .changeset/*.md entry (or use [skip-release] commit flag for infrastructure-only work)."
  );
}

function main() {
  validateChangesetConfig();
  validateReleaseWorkflow();
  validateCiGovernanceHardGates();
  validateSopCoverage();

  if (!sopOnly) {
    validatePrChangesetRequirement();
  }

  const scope = sopOnly ? "SOP checks" : "release governance checks";
  console.log(`✅ ${scope} passed.`);
}

main();
