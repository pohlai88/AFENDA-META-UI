#!/usr/bin/env tsx
import { readFile, writeFile } from "node:fs/promises";
import { parseArgs } from "node:util";
import { sql } from "drizzle-orm";

import { db } from "../drizzle/db.js";
import { createR2ObjectRepo } from "../r2/createR2ObjectRepo.js";
import { loadR2RepoCredentialsFromEnv } from "../r2/credentials.js";
import type { R2ObjectRepo } from "../r2/objectRepo.types.js";
import { buildPartitionPlan } from "./partition/partitionPlan.js";
import { listLifecyclePolicyIds, resolveLifecyclePolicy } from "./policies/defaultPolicy.js";
import {
  applyLifecyclePolicyPatch,
  resolveLifecyclePolicyWithOverrides,
} from "./policies/overrideResolver.js";
import { assertSafeDottedReference } from "./policies/schema.js";
import { buildRetentionPlan } from "./retention/retentionPlan.js";
import {
  batchArchiveToR2,
  restorePartitionFromR2,
  type ArchivalResult,
} from "./adapters/r2ColdStorageAdapter.js";
import { buildGovernanceAuditReport } from "./governance/auditReport.js";
import {
  buildGovernanceAuditArtifact,
  computeStablePolicyHash,
  normalizeGovernanceAuditArtifact,
  verifyGovernanceAuditArtifact,
} from "./governance/artifactContract.js";
import { persistGovernanceAuditReport } from "./governance/persistence.js";

function validateEnvironment(): void {
  if (!process.env.DATABASE_URL) {
    throw new Error("Missing DATABASE_URL environment variable.");
  }
  loadR2RepoCredentialsFromEnv(process.env);
}

function getR2ObjectRepo(): R2ObjectRepo {
  return createR2ObjectRepo(loadR2RepoCredentialsFromEnv(process.env));
}

function parseInteger(value: string, fallback: number): number {
  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed)) {
    return fallback;
  }
  return parsed;
}

function parsePositiveIntegerArg(args: string[], key: string, fallback: number): number {
  const prefixed = `--${key}=`;
  const hit = args.find((entry) => entry.startsWith(prefixed));
  if (!hit) {
    return fallback;
  }
  const parsed = Number.parseInt(hit.slice(prefixed.length), 10);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`--${key} must be a positive integer`);
  }
  return parsed;
}

function printResolutionSteps(steps: Array<{ scope: string; sourceId: string }>): void {
  if (steps.length === 0) {
    return;
  }
  console.log("policyResolution:");
  for (const step of steps) {
    console.log(`- ${step.scope}: ${step.sourceId}`);
  }
}

function flattenObject(input: unknown, prefix = ""): Record<string, string> {
  if (input === null || input === undefined) {
    return {};
  }
  if (typeof input !== "object") {
    return prefix ? { [prefix]: JSON.stringify(input) } : {};
  }
  if (Array.isArray(input)) {
    const out: Record<string, string> = {};
    input.forEach((value, index) => {
      const nextPrefix = prefix ? `${prefix}.${index}` : String(index);
      Object.assign(out, flattenObject(value, nextPrefix));
    });
    return out;
  }

  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(input as Record<string, unknown>)) {
    const nextPrefix = prefix ? `${prefix}.${key}` : key;
    if (value !== null && typeof value === "object") {
      Object.assign(out, flattenObject(value, nextPrefix));
      continue;
    }
    out[nextPrefix] = JSON.stringify(value);
  }
  return out;
}

function printDiff(previous: unknown, next: unknown): void {
  const prevFlat = flattenObject(previous);
  const nextFlat = flattenObject(next);
  const keys = new Set([...Object.keys(prevFlat), ...Object.keys(nextFlat)]);
  const changed = [...keys].filter((key) => prevFlat[key] !== nextFlat[key]).sort();

  if (changed.length === 0) {
    console.log("  no material changes");
    return;
  }

  for (const key of changed) {
    const before = prevFlat[key] ?? "<unset>";
    const after = nextFlat[key] ?? "<unset>";
    console.log(`  ${key}: ${before} -> ${after}`);
  }
}

function enforceSloGate(
  gateName: string,
  passed: boolean,
  details: string,
  disableSloGates: boolean
): void {
  if (passed || disableSloGates) {
    return;
  }
  throw new Error(`SLO gate failed (${gateName}): ${details}`);
}

async function maybeGetAuditMirrorRepo(): Promise<R2ObjectRepo | undefined> {
  try {
    return createR2ObjectRepo(loadR2RepoCredentialsFromEnv(process.env));
  } catch {
    return undefined;
  }
}

async function commandAuditPolicy(
  policyId?: string,
  tenantKey?: string,
  industryKey?: string,
  jsonOutput = false,
  persistAudit = true
): Promise<void> {
  const basePolicy = resolveLifecyclePolicy(policyId);
  const resolved = await resolveLifecyclePolicyWithOverrides(db, basePolicy, {
    tenantKey,
    industryKey,
  });
  const report = buildGovernanceAuditReport({
    basePolicy,
    resolved,
    command: "audit-policy",
    actor: process.env.USERNAME || process.env.USER || "system",
  });
  const persisted = persistAudit
    ? await persistGovernanceAuditReport(db, report, {
        repo: await maybeGetAuditMirrorRepo(),
        bucketPrefix: "governance/data-lifecycle",
        signingKey: process.env.LIFECYCLE_AUDIT_SIGNING_KEY,
      })
    : undefined;
  const artifact = buildGovernanceAuditArtifact(report, persisted, {
    resolvedPolicy: resolved.policy,
    baselineId: `${report.policyId}:${report.effectivePolicyId}`,
    tier: "reference",
    minScore: 85,
    requireSignature: Boolean(process.env.LIFECYCLE_AUDIT_SIGNING_KEY),
  });

  if (jsonOutput) {
    console.log(JSON.stringify(artifact, null, 2));
    return;
  }

  console.log("Data lifecycle policy audit");
  console.log(`auditId=${report.auditId}`);
  console.log(`basePolicy=${report.policyId}`);
  console.log(`effectivePolicy=${report.effectivePolicyId}`);
  console.log(`governanceScore=${report.governanceScore}`);
  console.log(`governanceRating=${report.governanceRating}`);
  if (persisted) {
    console.log(`digestSha256=${persisted.digestSha256}`);
    if (persisted.digestSignature) {
      console.log(`digestSignature=${persisted.digestSignature}`);
    }
    if (persisted.storageMirrorKey) {
      console.log(`storageMirrorKey=${persisted.storageMirrorKey}`);
    }
  }
  printResolutionSteps(resolved.steps);
  console.log("");

  if (resolved.appliedPatches.length > 0) {
    let currentPolicy = basePolicy;
    for (const patchEntry of resolved.appliedPatches) {
      const nextPolicy = applyLifecyclePolicyPatch(currentPolicy, patchEntry.patch);
      console.log(`patch ${patchEntry.scope}:${patchEntry.sourceId}`);
      printDiff(currentPolicy, nextPolicy);
      currentPolicy = nextPolicy;
      console.log("");
    }
  } else {
    console.log("No override patches applied.\n");
  }

  console.log("7W1H:");
  console.log(`who=${report.sevenWOneH.who}`);
  console.log(`what=${report.sevenWOneH.what}`);
  console.log(`when=${report.sevenWOneH.when}`);
  console.log(`where=${report.sevenWOneH.where}`);
  console.log(`why=${report.sevenWOneH.why}`);
  console.log(`which=${report.sevenWOneH.which}`);
  console.log(`whom=${report.sevenWOneH.whom}`);
  console.log(`how=${report.sevenWOneH.how}`);
  console.log(`sevenWOneHComplete=${report.sevenWOneHComplete}`);
  if (report.missingSevenWOneHDimensions.length > 0) {
    console.log(`missingSevenWOneH=${report.missingSevenWOneHDimensions.join(",")}`);
  }
  console.log("");

  console.log("Governance checks:");
  for (const check of report.governanceChecks) {
    console.log(`- ${check.name}: ${check.passed ? "PASS" : "FAIL"} (${check.details})`);
  }
  console.log("");
  console.log("effectivePolicyJson:");
  console.log(JSON.stringify(resolved.policy, null, 2));
}

async function commandVerifyArtifact(
  artifactPath: string,
  minGovernanceScore: number,
  requireSignature = false,
  requirePolicySnapshot = false,
  maxArtifactAgeDays?: number,
  rejectLegacyContract = false,
  legacyContractSunsetDate?: string
): Promise<void> {
  const raw = await readFile(artifactPath, "utf-8");
  const parsed = JSON.parse(raw) as unknown;
  const result = verifyGovernanceAuditArtifact(parsed, {
    minGovernanceScore,
    signingKey: process.env.LIFECYCLE_AUDIT_SIGNING_KEY,
    requireSignature,
    requirePolicySnapshot,
    maxArtifactAgeDays,
    rejectLegacyContract,
    legacyContractSunsetDate,
  });
  const failed = result.checks.filter((check) => !check.passed);
  console.log("Governance artifact verification");
  console.log(`artifact=${artifactPath}`);
  console.log(`contractVersion=${result.artifact.contractVersion}`);
  console.log(`auditId=${result.artifact.report.auditId}`);
  for (const check of result.checks) {
    console.log(`- ${check.name}: ${check.passed ? "PASS" : "FAIL"} (${check.details})`);
  }
  if (failed.length > 0) {
    throw new Error(`Artifact verification failed: ${failed.map((entry) => entry.name).join(", ")}`);
  }
}

async function loadArtifactAndVerify(
  artifactPath: string,
  options: {
    minGovernanceScore: number;
    requireSignature: boolean;
    requirePolicySnapshot: boolean;
    maxArtifactAgeDays?: number;
    rejectLegacyContract: boolean;
    legacyContractSunsetDate?: string;
  }
) {
  const raw = await readFile(artifactPath, "utf-8");
  const parsed = JSON.parse(raw) as unknown;
  const result = verifyGovernanceAuditArtifact(parsed, {
    minGovernanceScore: options.minGovernanceScore,
    signingKey: process.env.LIFECYCLE_AUDIT_SIGNING_KEY,
    requireSignature: options.requireSignature,
    requirePolicySnapshot: options.requirePolicySnapshot,
    maxArtifactAgeDays: options.maxArtifactAgeDays,
    rejectLegacyContract: options.rejectLegacyContract,
    legacyContractSunsetDate: options.legacyContractSunsetDate,
  });
  const failed = result.checks.filter((check) => !check.passed);
  if (failed.length > 0) {
    throw new Error(
      `Approved artifact gate failed (${artifactPath}): ${failed
        .map((entry) => `${entry.name}:${entry.details}`)
        .join("; ")}`
    );
  }
  return result.artifact;
}

async function enforceApprovedArtifactGateForPolicy(
  commandName: string,
  resolvedPolicy: unknown,
  effectivePolicyId: string,
  artifactPath: string,
  minGovernanceScore: number,
  requireSignature: boolean,
  maxArtifactAgeDays: number | undefined,
  rejectLegacyContract: boolean,
  legacyContractSunsetDate?: string
): Promise<void> {
  const artifact = await loadArtifactAndVerify(artifactPath, {
    minGovernanceScore,
    requireSignature,
    requirePolicySnapshot: true,
    maxArtifactAgeDays,
    rejectLegacyContract,
    legacyContractSunsetDate,
  });
  if (!artifact.policySnapshot) {
    throw new Error(`Artifact gate failed for ${commandName}: missing policy snapshot`);
  }
  const currentHash = computeStablePolicyHash(resolvedPolicy);
  if (currentHash !== artifact.policySnapshot.stablePolicyHash) {
    throw new Error(
      `Artifact gate failed for ${commandName}: policy hash mismatch (current=${currentHash}, approved=${artifact.policySnapshot.stablePolicyHash})`
    );
  }
  if (artifact.report.effectivePolicyId !== effectivePolicyId) {
    throw new Error(
      `Artifact gate failed for ${commandName}: effective policy mismatch (current=${effectivePolicyId}, approved=${artifact.report.effectivePolicyId})`
    );
  }
}

async function commandVerifyBaseline(
  artifactPath: string,
  policyId?: string,
  tenantKey?: string,
  industryKey?: string,
  tenantContext?: number,
  minGovernanceScore = 85,
  requireSignature = false,
  maxArtifactAgeDays?: number,
  rejectLegacyContract = false,
  legacyContractSunsetDate?: string
): Promise<void> {
  const artifact = await loadArtifactAndVerify(artifactPath, {
    minGovernanceScore,
    requireSignature,
    requirePolicySnapshot: true,
    maxArtifactAgeDays,
    rejectLegacyContract,
    legacyContractSunsetDate,
  });
  if (!artifact.policySnapshot) {
    throw new Error("Artifact does not include policySnapshot; regenerate with contract 1.1.0.");
  }
  const basePolicy = resolveLifecyclePolicy(policyId ?? artifact.report.policyId);
  const resolved = await resolveLifecyclePolicyWithOverrides(db, basePolicy, {
    tenantId: tenantContext,
    tenantKey,
    industryKey,
  });
  const currentPolicyHash = computeStablePolicyHash(resolved.policy);
  const baselineHash = artifact.policySnapshot.stablePolicyHash;
  const hashMatch = currentPolicyHash === baselineHash;
  const effectiveMatch = resolved.policy.id === artifact.report.effectivePolicyId;

  console.log("Governance baseline verification");
  console.log(`artifact=${artifactPath}`);
  console.log(`baselinePolicyHash=${baselineHash}`);
  console.log(`currentPolicyHash=${currentPolicyHash}`);
  console.log(`effectivePolicyExpected=${artifact.report.effectivePolicyId}`);
  console.log(`effectivePolicyCurrent=${resolved.policy.id}`);
  console.log(`policyHashMatch=${hashMatch}`);
  console.log(`effectivePolicyMatch=${effectiveMatch}`);

  if (!hashMatch || !effectiveMatch) {
    throw new Error("Baseline mismatch detected. Current policy differs from approved governance baseline.");
  }
}

function renderArtifactMarkdown(artifact: ReturnType<typeof normalizeGovernanceAuditArtifact>): string {
  const checks = artifact.report.governanceChecks
    .map((check) => `- ${check.name}: ${check.passed ? "PASS" : "FAIL"} (${check.details})`)
    .join("\n");
  const steps = artifact.report.resolutionSteps.map((step) => `- ${step.scope}: ${step.sourceId}`).join("\n");
  return `# Data Lifecycle Governance Artifact\n\n` +
    `- Contract version: ${artifact.contractVersion}\n` +
    `- Source version: ${artifact.sourceContractVersion ?? artifact.contractVersion}\n` +
    `- Generated at: ${artifact.generatedAt}\n` +
    `- Audit ID: ${artifact.report.auditId}\n` +
    `- Policy: ${artifact.report.policyId}\n` +
    `- Effective policy: ${artifact.report.effectivePolicyId}\n` +
    `- Governance score: ${artifact.report.governanceScore}\n` +
    `- Governance rating: ${artifact.report.governanceRating}\n` +
    `- Applied patches: ${artifact.report.appliedPatchCount}\n` +
    `- Skipped patches: ${artifact.report.skippedPatchCount}\n` +
    `\n## Resolution Steps\n${steps || "- none"}\n` +
    `\n## Governance Checks\n${checks}\n` +
    `\n## 7W1H\n` +
    `- who: ${artifact.report.sevenWOneH.who}\n` +
    `- what: ${artifact.report.sevenWOneH.what}\n` +
    `- when: ${artifact.report.sevenWOneH.when}\n` +
    `- where: ${artifact.report.sevenWOneH.where}\n` +
    `- why: ${artifact.report.sevenWOneH.why}\n` +
    `- which: ${artifact.report.sevenWOneH.which}\n` +
    `- whom: ${artifact.report.sevenWOneH.whom}\n` +
    `- how: ${artifact.report.sevenWOneH.how}\n`;
}

async function commandRenderArtifact(artifactPath: string, outputPath?: string): Promise<void> {
  const raw = await readFile(artifactPath, "utf-8");
  const parsed = JSON.parse(raw) as unknown;
  const normalized = normalizeGovernanceAuditArtifact(parsed);
  const markdown = renderArtifactMarkdown(normalized);
  if (outputPath) {
    await writeFile(outputPath, markdown, "utf-8");
    console.log(`Rendered governance markdown report: ${outputPath}`);
    return;
  }
  console.log(markdown);
}

async function commandPartitionPlan(
  apply: boolean,
  yearsAhead: number,
  allowParentConversion: boolean,
  policyId?: string,
  tenantContext?: number,
  tenantKey?: string,
  industryKey?: string,
  explain = false,
  disableSloGates = false,
  enforceApprovedArtifact = false,
  approvedArtifactPath?: string,
  artifactMinScore = 85,
  artifactRequireSignature = false,
  artifactMaxAgeDays?: number,
  artifactRejectLegacyContract = false,
  artifactLegacyContractSunsetDate?: string
): Promise<void> {
  const basePolicy = resolveLifecyclePolicy(policyId);
  const resolved = await resolveLifecyclePolicyWithOverrides(db, basePolicy, {
    tenantId: tenantContext,
    tenantKey,
    industryKey,
  });
  const policy = resolved.policy;
  if (explain) {
    printResolutionSteps(resolved.steps);
  }
  if (policy.partitionTargets.length === 0) {
    throw new Error(`No partition targets configured for policy: ${policy.id}`);
  }
  const plans = policy.partitionTargets.map((target) =>
    buildPartitionPlan({
      schemaName: target.schemaName,
      parentTable: target.parentTable,
      partitionColumn: target.partitionColumn,
      yearsAhead: yearsAhead ?? target.yearsAhead ?? 2,
      allowParentConversion,
    })
  );
  const totalActions = plans.reduce((sum, plan) => sum + plan.actions.length, 0);
  enforceSloGate(
    "maxPartitionActionsPerRun",
    !policy.sloGates?.maxPartitionActionsPerRun ||
      totalActions <= policy.sloGates.maxPartitionActionsPerRun,
    `actions=${totalActions} max=${policy.sloGates?.maxPartitionActionsPerRun}`,
    disableSloGates
  );

  console.log("Data lifecycle partition plan");
  console.log(`policy=${policy.id}`);
  console.log(`targets=${plans.length}`);
  for (const plan of plans) {
    console.log("");
    console.log(`generatedAt=${plan.generatedAt}`);
    console.log(`parent=${plan.schemaName}.${plan.parentTable}`);
    console.log(`partitionColumn=${plan.partitionColumn}`);
    console.log(`years=${plan.years.join(",")}`);
    console.log(`allowParentConversion=${allowParentConversion}`);
    for (const action of plan.actions) {
      console.log(`- ${action.id}: ${action.description}`);
    }
  }

  if (!apply) {
    console.log("\nDry run mode: SQL actions were planned but not executed.");
    return;
  }

  if (enforceApprovedArtifact) {
    if (!approvedArtifactPath) {
      throw new Error("--approved-artifact-path is required when --enforce-approved-artifact=true");
    }
    await enforceApprovedArtifactGateForPolicy(
      "partition-plan",
      policy,
      policy.id,
      approvedArtifactPath,
      artifactMinScore,
      artifactRequireSignature,
      artifactMaxAgeDays,
      artifactRejectLegacyContract,
      artifactLegacyContractSunsetDate
    );
  }

  await db.transaction(async (tx) => {
    for (const plan of plans) {
      for (const action of plan.actions) {
        await tx.execute(sql.raw(action.statement));
      }
    }
  });

  console.log("Partition actions executed successfully.");
}

async function commandRetentionPlan(
  apply: boolean,
  tenantId: number,
  actorId: number,
  policyId?: string,
  tenantKey?: string,
  industryKey?: string,
  explain = false,
  disableSloGates = false,
  enforceApprovedArtifact = false,
  approvedArtifactPath?: string,
  artifactMinScore = 85,
  artifactRequireSignature = false,
  artifactMaxAgeDays?: number,
  artifactRejectLegacyContract = false,
  artifactLegacyContractSunsetDate?: string
): Promise<void> {
  const basePolicy = resolveLifecyclePolicy(policyId);
  const resolved = await resolveLifecyclePolicyWithOverrides(db, basePolicy, {
    tenantId,
    tenantKey,
    industryKey,
  });
  const policy = resolved.policy;
  if (explain) {
    printResolutionSteps(resolved.steps);
  }
  const plan = buildRetentionPlan({
    tenantId,
    actorId,
    rules: policy.retentionRules,
  });
  enforceSloGate(
    "maxRetentionActionsPerRun",
    !policy.sloGates?.maxRetentionActionsPerRun ||
      plan.actions.length <= policy.sloGates.maxRetentionActionsPerRun,
    `actions=${plan.actions.length} max=${policy.sloGates?.maxRetentionActionsPerRun}`,
    disableSloGates
  );

  console.log("Data lifecycle retention plan");
  console.log(`policy=${policy.id}`);
  console.log(`generatedAt=${plan.generatedAt}`);
  console.log(`tenantId=${plan.tenantId} actorId=${plan.actorId}`);
  for (const [id, cutoff] of Object.entries(plan.cutoffs)) {
    console.log(`${id}Before=${cutoff}`);
  }
  console.log("");

  for (const action of plan.actions) {
    console.log(`- ${action.id}: ${action.description}`);
  }

  if (!apply) {
    console.log("\nDry run mode: SQL actions were planned but not executed.");
    return;
  }

  if (enforceApprovedArtifact) {
    if (!approvedArtifactPath) {
      throw new Error("--approved-artifact-path is required when --enforce-approved-artifact=true");
    }
    await enforceApprovedArtifactGateForPolicy(
      "retention-plan",
      policy,
      policy.id,
      approvedArtifactPath,
      artifactMinScore,
      artifactRequireSignature,
      artifactMaxAgeDays,
      artifactRejectLegacyContract,
      artifactLegacyContractSunsetDate
    );
  }

  await db.transaction(async (tx) => {
    for (const action of plan.actions) {
      await tx.execute(sql.raw(action.statement));
    }
  });

  console.log("Retention actions executed successfully.");
}

async function commandPromote(
  dryRun: boolean,
  vacuumFull: boolean,
  retentionMonths: number,
  policyId?: string,
  explain = false,
  tenantKey?: string,
  industryKey?: string,
  enforceApprovedArtifact = false,
  approvedArtifactPath?: string,
  artifactMinScore = 85,
  artifactRequireSignature = false,
  artifactMaxAgeDays?: number,
  artifactRejectLegacyContract = false,
  artifactLegacyContractSunsetDate?: string
): Promise<void> {
  const basePolicy = resolveLifecyclePolicy(policyId);
  const resolved = await resolveLifecyclePolicyWithOverrides(db, basePolicy, {
    tenantKey,
    industryKey,
  });
  const policy = resolved.policy;
  if (explain) {
    printResolutionSteps(resolved.steps);
  }
  const functionRef = policy.functions.promoteToWarm;
  if (!functionRef) {
    throw new Error(`Policy ${policy.id} does not define promoteToWarm function reference.`);
  }
  assertSafeDottedReference(functionRef, "promoteToWarm function reference");
  if (!dryRun && enforceApprovedArtifact) {
    if (!approvedArtifactPath) {
      throw new Error("--approved-artifact-path is required when --enforce-approved-artifact=true");
    }
    await enforceApprovedArtifactGateForPolicy(
      "promote",
      policy,
      policy.id,
      approvedArtifactPath,
      artifactMinScore,
      artifactRequireSignature,
      artifactMaxAgeDays,
      artifactRejectLegacyContract,
      artifactLegacyContractSunsetDate
    );
  }
  const result = await db.execute(sql`
    SELECT * FROM ${sql.raw(functionRef)}(
      ${retentionMonths},
      ${dryRun},
      ${vacuumFull},
      TRUE
    )
  `);

  console.log("Lifecycle promote result");
  console.table(result.rows);
}

async function commandArchive(
  dryRun: boolean,
  limit: number,
  policyId?: string,
  explain = false,
  tenantKey?: string,
  industryKey?: string,
  disableSloGates = false,
  enforceApprovedArtifact = false,
  approvedArtifactPath?: string,
  artifactMinScore = 85,
  artifactRequireSignature = false,
  artifactMaxAgeDays?: number,
  artifactRejectLegacyContract = false,
  artifactLegacyContractSunsetDate?: string
): Promise<void> {
  const basePolicy = resolveLifecyclePolicy(policyId);
  const resolved = await resolveLifecyclePolicyWithOverrides(db, basePolicy, {
    tenantKey,
    industryKey,
  });
  const policy = resolved.policy;
  if (explain) {
    printResolutionSteps(resolved.steps);
  }
  const identifyColdCandidatesFn = policy.functions.identifyColdCandidates;
  if (!identifyColdCandidatesFn) {
    throw new Error(
      `Policy ${policy.id} does not define identifyColdCandidates function reference.`
    );
  }
  assertSafeDottedReference(identifyColdCandidatesFn, "identifyColdCandidates function reference");
  const coldCatalogTable = policy.functions.coldCatalogTable ?? "cold_storage.r2_archive_catalog";
  assertSafeDottedReference(coldCatalogTable, "cold catalog table reference");
  const candidates = await db.execute(sql`
    SELECT * FROM ${sql.raw(identifyColdCandidatesFn)}(7, 10)
    LIMIT ${limit}
  `);

  if (candidates.rows.length === 0) {
    console.log("No partitions eligible for cold archival.");
    return;
  }

  console.table(candidates.rows);

  if (dryRun) {
    console.log("\nDry run mode: no partitions archived.");
    return;
  }

  if (enforceApprovedArtifact) {
    if (!approvedArtifactPath) {
      throw new Error("--approved-artifact-path is required when --enforce-approved-artifact=true");
    }
    await enforceApprovedArtifactGateForPolicy(
      "archive",
      policy,
      policy.id,
      approvedArtifactPath,
      artifactMinScore,
      artifactRequireSignature,
      artifactMaxAgeDays,
      artifactRejectLegacyContract,
      artifactLegacyContractSunsetDate
    );
  }

  validateEnvironment();
  const r2Repo = getR2ObjectRepo();
  const partitions = candidates.rows.map((row: any) => ({
    tableName: row.table_name,
    partitionName: row.partition_name,
  }));

  const results = await batchArchiveToR2(db, r2Repo, partitions, coldCatalogTable);
  const failedCount = results.filter((row) => !row.success).length;
  const failureRatePct = results.length === 0 ? 0 : (failedCount / results.length) * 100;
  enforceSloGate(
    "maxArchiveFailures",
    !policy.sloGates?.maxArchiveFailures || failedCount <= policy.sloGates.maxArchiveFailures,
    `failed=${failedCount} max=${policy.sloGates?.maxArchiveFailures}`,
    disableSloGates
  );
  enforceSloGate(
    "maxArchiveFailureRatePct",
    !policy.sloGates?.maxArchiveFailureRatePct ||
      failureRatePct <= policy.sloGates.maxArchiveFailureRatePct,
    `failureRatePct=${failureRatePct.toFixed(2)} max=${policy.sloGates?.maxArchiveFailureRatePct}`,
    disableSloGates
  );
  summarizeArchiveResults(results);
}

function summarizeArchiveResults(results: ArchivalResult[]): void {
  const successCount = results.filter((r) => r.success).length;
  const failedCount = results.length - successCount;
  console.log("Archival summary");
  console.log(`total=${results.length}`);
  console.log(`success=${successCount}`);
  console.log(`failed=${failedCount}`);
}

async function commandRestore(
  key: string,
  attach: boolean,
  policyId?: string,
  parentTableName?: string,
  explain = false,
  tenantKey?: string,
  industryKey?: string,
  enforceApprovedArtifact = false,
  approvedArtifactPath?: string,
  artifactMinScore = 85,
  artifactRequireSignature = false,
  artifactMaxAgeDays?: number,
  artifactRejectLegacyContract = false,
  artifactLegacyContractSunsetDate?: string
): Promise<void> {
  const basePolicy = resolveLifecyclePolicy(policyId);
  const resolved = await resolveLifecyclePolicyWithOverrides(db, basePolicy, {
    tenantKey,
    industryKey,
  });
  const policy = resolved.policy;
  if (explain) {
    printResolutionSteps(resolved.steps);
  }
  if (enforceApprovedArtifact) {
    if (!approvedArtifactPath) {
      throw new Error("--approved-artifact-path is required when --enforce-approved-artifact=true");
    }
    await enforceApprovedArtifactGateForPolicy(
      "restore",
      policy,
      policy.id,
      approvedArtifactPath,
      artifactMinScore,
      artifactRequireSignature,
      artifactMaxAgeDays,
      artifactRejectLegacyContract,
      artifactLegacyContractSunsetDate
    );
  }
  validateEnvironment();
  const r2Repo = getR2ObjectRepo();

  const coldCatalogTable = policy.functions.coldCatalogTable ?? "cold_storage.r2_archive_catalog";
  assertSafeDottedReference(coldCatalogTable, "cold catalog table reference");
  const result = await restorePartitionFromR2(db, r2Repo, {
    r2ObjectKey: key,
    targetSchema: "archive",
    attachAsPartition: attach,
    parentSchemaName: policy.partitionTargets[0]?.schemaName,
    parentTableName,
    coldCatalogTable,
  });

  if (!result.success) {
    throw new Error(result.error || "Restore failed");
  }

  console.log("Restore completed");
  console.log(`targetTable=${result.targetTable}`);
  console.log(`rowCount=${result.rowCount}`);
}

async function commandHealth(
  policyId?: string,
  explain = false,
  tenantKey?: string,
  industryKey?: string
): Promise<void> {
  const basePolicy = resolveLifecyclePolicy(policyId);
  const resolved = await resolveLifecyclePolicyWithOverrides(db, basePolicy, {
    tenantKey,
    industryKey,
  });
  const policy = resolved.policy;
  if (explain) {
    printResolutionSteps(resolved.steps);
  }
  const functionRef = policy.functions.checkLifecycleHealth;
  if (!functionRef) {
    throw new Error(`Policy ${policy.id} does not define checkLifecycleHealth function reference.`);
  }
  assertSafeDottedReference(functionRef, "checkLifecycleHealth function reference");
  const result = await db.execute(sql`
    SELECT * FROM ${sql.raw(functionRef)}()
  `);
  console.table(result.rows);
}

async function commandList(
  tier: "hot" | "warm" | "cold",
  policyId?: string,
  explain = false,
  tenantKey?: string,
  industryKey?: string
): Promise<void> {
  const basePolicy = resolveLifecyclePolicy(policyId);
  const resolved = await resolveLifecyclePolicyWithOverrides(db, basePolicy, {
    tenantKey,
    industryKey,
  });
  const policy = resolved.policy;
  if (explain) {
    printResolutionSteps(resolved.steps);
  }

  if (tier === "warm") {
    const functionRef = policy.functions.listWarmInventory;
    if (!functionRef) {
      throw new Error(`Policy ${policy.id} does not define listWarmInventory function reference.`);
    }
    assertSafeDottedReference(functionRef, "listWarmInventory function reference");
    const result = await db.execute(sql`
      SELECT * FROM ${sql.raw(functionRef)}()
    `);
    console.table(result.rows);
    return;
  }

  if (tier === "cold") {
    const coldCatalogTable = policy.functions.coldCatalogTable ?? "cold_storage.r2_archive_catalog";
    assertSafeDottedReference(coldCatalogTable, "cold catalog table reference");
    const result = await db.execute(sql`
      SELECT
        table_name,
        partition_name,
        r2_object_key,
        row_count,
        archived_at
      FROM ${sql.raw(coldCatalogTable)}
      ORDER BY archived_at DESC
    `);
    console.table(result.rows);
    return;
  }

  if (policy.partitionTargets.length === 0) {
    throw new Error(`No partition target configured for policy: ${policy.id}`);
  }
  for (const target of policy.partitionTargets) {
    const prefix = `${target.parentTable}_%`;
    const result = await db.execute(sql`
      SELECT
        tablename AS partition_name,
        pg_size_pretty(pg_total_relation_size(${target.schemaName} || '.' || tablename)) AS size
      FROM pg_tables
      WHERE schemaname = ${target.schemaName}
        AND tablename LIKE ${prefix}
        AND tablename NOT LIKE ${`${target.parentTable}_default`}
      ORDER BY tablename DESC
      LIMIT 100
    `);
    console.log(`hot inventory ${target.schemaName}.${target.parentTable}`);
    console.table(result.rows);
  }
}

function printUsage(): void {
  console.log(`
Database Data Lifecycle Runner

USAGE:
  pnpm --filter @afenda/db data:lifecycle <command> [options]

COMMANDS:
  audit-policy    Show effective policy and override diffs
  verify-artifact Verify governance artifact contract/evidence
  verify-baseline Verify current policy against approved artifact baseline
  render-artifact Render governance artifact into Markdown
  partition-plan  Build/apply partition plan from lifecycle policy
  retention-plan  Build/apply retention plan from lifecycle policy
  promote         Promote warm candidates from policy SQL function
  archive         Archive warm partitions to cold storage
  restore         Restore cold partition from object storage
  health          Run lifecycle health check
  list            List tier inventory (hot, warm, cold)

COMMON OPTIONS:
  --policy-id=<id>        Select lifecycle policy
  --tenant-key=<key>      Tenant key for override resolution
  --industry-key=<key>    Industry key for override resolution
  --explain               Print policy resolution provenance
  --json                  Print machine-readable JSON report (audit-policy)
  --artifact-path=<path>  Path to governance artifact JSON (verify-artifact)
  --approved-artifact-path=<path> Approved governance artifact for mutation gate
  --min-score=<n>         Minimum governance score for artifact gate
  --max-artifact-age-days=<n> Maximum allowed artifact age (verify/baseline)
  --reject-legacy-contract Reject legacy (1.0.0) artifacts for verify/baseline
  --legacy-contract-sunset-date=<iso> Sunset date for legacy artifact acceptance
  --artifact-min-score=<n> Minimum score for approved artifact mutation gate
  --artifact-max-age-days=<n> Maximum allowed approved artifact age for mutation gate
  --require-signature     Require signed artifact evidence
  --artifact-require-signature Require signature for approved artifact mutation gate
  --artifact-reject-legacy-contract Reject legacy artifacts for mutation gate
  --artifact-legacy-contract-sunset-date=<iso> Sunset date for mutation artifact legacy acceptance
  --enforce-approved-artifact Require approved artifact baseline before mutating command
  --render-output=<path>  Output markdown path for render-artifact
  --persist-audit         Persist governance report to DB + mirror
  --disable-slo-gates     Bypass SLO auto-fail safety gates

POLICIES:
  ${listLifecyclePolicyIds().join(", ")}
`);
}

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  if (!command || command === "help") {
    printUsage();
    return;
  }

  const { values } = parseArgs({
    args,
    options: {
      "dry-run": { type: "boolean", default: true },
      apply: { type: "boolean", default: false },
      "vacuum-full": { type: "boolean", default: false },
      "retention-months": { type: "string", default: "24" },
      "years-ahead": { type: "string", default: "2" },
      "allow-parent-conversion": { type: "boolean", default: false },
      "policy-id": { type: "string" },
      "tenant-key": { type: "string" },
      "industry-key": { type: "string" },
      explain: { type: "boolean", default: false },
      json: { type: "boolean", default: false },
      "artifact-path": { type: "string" },
      "min-score": { type: "string", default: "80" },
      "max-artifact-age-days": { type: "string" },
      "reject-legacy-contract": { type: "boolean", default: false },
      "legacy-contract-sunset-date": { type: "string" },
      "require-signature": { type: "boolean", default: false },
      "approved-artifact-path": { type: "string" },
      "artifact-min-score": { type: "string", default: "85" },
      "artifact-max-age-days": { type: "string" },
      "artifact-require-signature": { type: "boolean", default: false },
      "artifact-reject-legacy-contract": { type: "boolean", default: false },
      "artifact-legacy-contract-sunset-date": { type: "string" },
      "enforce-approved-artifact": { type: "boolean", default: false },
      "render-output": { type: "string" },
      "persist-audit": { type: "boolean", default: true },
      "disable-slo-gates": { type: "boolean", default: false },
      limit: { type: "string", default: "10" },
      key: { type: "string" },
      attach: { type: "boolean", default: false },
      tier: { type: "string", default: "warm" },
      tenant: { type: "string", default: "1" },
      actor: { type: "string", default: "1" },
      parent: { type: "string" },
      "tenant-context": { type: "string" },
    },
    allowPositionals: true,
  });

  const policyId = values["policy-id"] as string | undefined;
  const tenantKey = values["tenant-key"] as string | undefined;
  const industryKey = values["industry-key"] as string | undefined;
  const explain = values.explain as boolean;
  const jsonOutput = values.json as boolean;
  const artifactPath = values["artifact-path"] as string | undefined;
  const minScore = parseInteger(values["min-score"] as string, 80);
  const maxArtifactAgeDays = values["max-artifact-age-days"]
    ? parseInteger(values["max-artifact-age-days"] as string, 0)
    : undefined;
  const rejectLegacyContract = values["reject-legacy-contract"] as boolean;
  const legacyContractSunsetDate =
    (values["legacy-contract-sunset-date"] as string | undefined) ??
    process.env.LIFECYCLE_LEGACY_CONTRACT_SUNSET_DATE;
  const requireSignature = values["require-signature"] as boolean;
  const approvedArtifactPath = values["approved-artifact-path"] as string | undefined;
  const artifactMinScore = parseInteger(values["artifact-min-score"] as string, 85);
  const artifactMaxAgeDays = values["artifact-max-age-days"]
    ? parseInteger(values["artifact-max-age-days"] as string, 0)
    : undefined;
  const artifactRequireSignature = values["artifact-require-signature"] as boolean;
  const artifactRejectLegacyContract = values["artifact-reject-legacy-contract"] as boolean;
  const artifactLegacyContractSunsetDate =
    (values["artifact-legacy-contract-sunset-date"] as string | undefined) ??
    process.env.LIFECYCLE_ARTIFACT_LEGACY_CONTRACT_SUNSET_DATE ??
    legacyContractSunsetDate;
  const enforceApprovedArtifact = values["enforce-approved-artifact"] as boolean;
  const renderOutput = values["render-output"] as string | undefined;
  const persistAudit = values["persist-audit"] as boolean;
  const disableSloGates = values["disable-slo-gates"] as boolean;
  const apply = (values.apply as boolean) || !((values["dry-run"] as boolean) ?? true);

  switch (command) {
    case "audit-policy":
      await commandAuditPolicy(policyId, tenantKey, industryKey, jsonOutput, persistAudit);
      break;
    case "verify-artifact":
      if (!artifactPath) {
        throw new Error("--artifact-path is required for verify-artifact command");
      }
      await commandVerifyArtifact(
        artifactPath,
        minScore,
        requireSignature,
        false,
        maxArtifactAgeDays,
        rejectLegacyContract,
        legacyContractSunsetDate
      );
      break;
    case "verify-baseline":
      if (!artifactPath) {
        throw new Error("--artifact-path is required for verify-baseline command");
      }
      await commandVerifyBaseline(
        artifactPath,
        policyId,
        tenantKey,
        industryKey,
        values["tenant-context"]
          ? Math.max(1, parseInteger(values["tenant-context"] as string, 1))
          : undefined,
        minScore,
        requireSignature,
        maxArtifactAgeDays,
        rejectLegacyContract,
        legacyContractSunsetDate
      );
      break;
    case "render-artifact":
      if (!artifactPath) {
        throw new Error("--artifact-path is required for render-artifact command");
      }
      await commandRenderArtifact(artifactPath, renderOutput);
      break;
    case "partition-plan":
      await commandPartitionPlan(
        apply,
        parseInteger(values["years-ahead"] as string, 2),
        values["allow-parent-conversion"] as boolean,
        policyId,
        values["tenant-context"]
          ? Math.max(1, parseInteger(values["tenant-context"] as string, 1))
          : undefined,
        tenantKey,
        industryKey,
        explain,
        disableSloGates,
        enforceApprovedArtifact,
        approvedArtifactPath,
        artifactMinScore,
        artifactRequireSignature,
        artifactMaxAgeDays,
        artifactRejectLegacyContract,
        artifactLegacyContractSunsetDate
      );
      break;
    case "retention-plan":
      await commandRetentionPlan(
        apply,
        parsePositiveIntegerArg(args, "tenant", parseInteger(values.tenant as string, 1)),
        parsePositiveIntegerArg(args, "actor", parseInteger(values.actor as string, 1)),
        policyId,
        tenantKey,
        industryKey,
        explain,
        disableSloGates,
        enforceApprovedArtifact,
        approvedArtifactPath,
        artifactMinScore,
        artifactRequireSignature,
        artifactMaxAgeDays,
        artifactRejectLegacyContract,
        artifactLegacyContractSunsetDate
      );
      break;
    case "promote":
      await commandPromote(
        values["dry-run"] as boolean,
        values["vacuum-full"] as boolean,
        parseInteger(values["retention-months"] as string, 24),
        policyId,
        explain,
        tenantKey,
        industryKey,
        enforceApprovedArtifact,
        approvedArtifactPath,
        artifactMinScore,
        artifactRequireSignature,
        artifactMaxAgeDays,
        artifactRejectLegacyContract,
        artifactLegacyContractSunsetDate
      );
      break;
    case "archive":
      await commandArchive(
        values["dry-run"] as boolean,
        parseInteger(values.limit as string, 10),
        policyId,
        explain,
        tenantKey,
        industryKey,
        disableSloGates,
        enforceApprovedArtifact,
        approvedArtifactPath,
        artifactMinScore,
        artifactRequireSignature,
        artifactMaxAgeDays,
        artifactRejectLegacyContract,
        artifactLegacyContractSunsetDate
      );
      break;
    case "restore":
      if (!values.key) {
        throw new Error("--key is required for restore command");
      }
      await commandRestore(
        values.key as string,
        values.attach as boolean,
        policyId,
        values.parent as string | undefined,
        explain,
        tenantKey,
        industryKey,
        enforceApprovedArtifact,
        approvedArtifactPath,
        artifactMinScore,
        artifactRequireSignature,
        artifactMaxAgeDays,
        artifactRejectLegacyContract,
        artifactLegacyContractSunsetDate
      );
      break;
    case "health":
      await commandHealth(policyId, explain, tenantKey, industryKey);
      break;
    case "list":
      await commandList(values.tier as "hot" | "warm" | "cold", policyId, explain, tenantKey, industryKey);
      break;
    default:
      throw new Error(`Unknown command: ${command}`);
  }
}

main().catch((error) => {
  console.error("Data lifecycle runner failed:", error);
  process.exitCode = 1;
});
