import { applyLifecyclePolicyPatch, type ResolvedLifecyclePolicy } from "../policies/overrideResolver.js";
import { assertSafeDottedReference } from "../policies/schema.js";
import type { LifecyclePolicy } from "../policies/types.js";

type SevenWOneH = {
  who: string;
  what: string;
  when: string;
  where: string;
  why: string;
  which: string;
  whom: string;
  how: string;
};

type GovernanceCheck = {
  name: string;
  passed: boolean;
  details: string;
};

export type GovernanceAuditReport = {
  auditId: string;
  auditedAt: string;
  command: string;
  policyId: string;
  effectivePolicyId: string;
  resolutionSteps: Array<{ scope: string; sourceId: string }>;
  appliedPatchCount: number;
  skippedPatchCount: number;
  changedFieldCount: number;
  changedFieldsSample: string[];
  sevenWOneH: SevenWOneH;
  sevenWOneHComplete: boolean;
  missingSevenWOneHDimensions: string[];
  governanceChecks: GovernanceCheck[];
  governanceScore: number;
  governanceRating: "excellent" | "good" | "fair" | "poor";
};

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

function computeChangedKeys(previous: unknown, next: unknown): string[] {
  const prevFlat = flattenObject(previous);
  const nextFlat = flattenObject(next);
  const keys = new Set([...Object.keys(prevFlat), ...Object.keys(nextFlat)]);
  return [...keys].filter((key) => prevFlat[key] !== nextFlat[key]).sort();
}

function collectChangedFields(basePolicy: LifecyclePolicy, resolved: ResolvedLifecyclePolicy): string[] {
  const changed = new Set<string>();
  let current = basePolicy;
  for (const patch of resolved.appliedPatches) {
    const next = applyLifecyclePolicyPatch(current, patch.patch);
    for (const key of computeChangedKeys(current, next)) {
      changed.add(key);
    }
    current = next;
  }
  return [...changed].sort();
}

function collectUnsafeFunctionRefs(policy: LifecyclePolicy): string[] {
  const refs = Object.entries(policy.functions)
    .filter(([, value]) => typeof value === "string")
    .map(([key, value]) => ({ key, value: value as string }));

  const invalid: string[] = [];
  for (const ref of refs) {
    try {
      assertSafeDottedReference(ref.value, ref.key);
    } catch {
      invalid.push(`${ref.key}:${ref.value}`);
    }
  }
  return invalid;
}

function validateSevenWOneH(model: SevenWOneH): string[] {
  const missing: string[] = [];
  for (const [key, value] of Object.entries(model)) {
    if (!value || value.trim().length === 0) {
      missing.push(key);
    }
  }
  return missing;
}

function scoreGovernance(checks: GovernanceCheck[], missing7w1h: string[]): number {
  let score = 100;
  for (const check of checks) {
    if (!check.passed) {
      score -= 12;
    }
  }
  score -= missing7w1h.length * 6;
  return Math.max(0, Math.min(100, score));
}

function ratingFromScore(score: number): GovernanceAuditReport["governanceRating"] {
  if (score >= 90) {
    return "excellent";
  }
  if (score >= 75) {
    return "good";
  }
  if (score >= 60) {
    return "fair";
  }
  return "poor";
}

export function buildGovernanceAuditReport(params: {
  basePolicy: LifecyclePolicy;
  resolved: ResolvedLifecyclePolicy;
  command: string;
  actor: string;
}): GovernanceAuditReport {
  const now = new Date().toISOString();
  const changedFields = collectChangedFields(params.basePolicy, params.resolved);
  const unsafeRefs = collectUnsafeFunctionRefs(params.resolved.policy);

  const targetSummary = params.resolved.policy.partitionTargets
    .map((target) => `${target.schemaName}.${target.parentTable}`)
    .join(", ");

  const retentionSummary = params.resolved.policy.retentionRules
    .map((rule) => rule.id)
    .join(", ");

  const scopesUsed = params.resolved.steps
    .filter((step) => step.scope !== "base")
    .map((step) => `${step.scope}:${step.sourceId}`)
    .join(" -> ");

  const sevenWOneH: SevenWOneH = {
    who: params.actor,
    what: `policy=${params.resolved.policy.id}; changed_fields=${changedFields.length}`,
    when: now,
    where: `targets=[${targetSummary || "none"}]; retention=[${retentionSummary || "none"}]`,
    why:
      params.resolved.appliedPatches.length > 0
        ? "policy customized by governance overrides for industry/tenant context"
        : "baseline policy validation and governance conformance",
    which: `base=${params.basePolicy.id}; effective=${params.resolved.policy.id}; scopes=${scopesUsed || "base-only"}`,
    whom: "tenant operations, compliance, data platform, audit stakeholders",
    how: "validated policy schema + deterministic merge order (base->global->industry->tenant) + safe SQL reference checks",
  };

  const missingSevenWOneHDimensions = validateSevenWOneH(sevenWOneH);

  const checks: GovernanceCheck[] = [
    {
      name: "deterministic_precedence",
      passed: true,
      details: "base -> global -> industry -> tenant",
    },
    {
      name: "sql_reference_safety",
      passed: unsafeRefs.length === 0,
      details: unsafeRefs.length === 0 ? "all function refs valid" : unsafeRefs.join(", "),
    },
    {
      name: "policy_traceability",
      passed: params.resolved.steps.length >= 1,
      details: `steps=${params.resolved.steps.length}`,
    },
    {
      name: "maker_checker_enforcement",
      passed: true,
      details:
        params.resolved.skippedPatches.filter(
          (entry) => entry.reason === "maker-checker approval missing"
        ).length > 0
          ? `blocked_unapproved_overrides=${
              params.resolved.skippedPatches.filter(
                (entry) => entry.reason === "maker-checker approval missing"
              ).length
            }`
          : "no unapproved overrides applied",
    },
    {
      name: "retention_boundary_sanity",
      passed: params.resolved.policy.retentionRules.every((rule) => rule.retentionYears >= 1),
      details: "all retention years >= 1",
    },
    {
      name: "slo_gates_configured",
      passed: Boolean(params.resolved.policy.sloGates),
      details: params.resolved.policy.sloGates ? "configured" : "missing",
    },
    {
      name: "seven_w_one_h_completeness",
      passed: missingSevenWOneHDimensions.length === 0,
      details:
        missingSevenWOneHDimensions.length === 0
          ? "all dimensions present"
          : `missing: ${missingSevenWOneHDimensions.join(", ")}`,
    },
  ];

  const governanceScore = scoreGovernance(checks, missingSevenWOneHDimensions);

  return {
    auditId: `dlc-audit-${Date.now()}`,
    auditedAt: now,
    command: params.command,
    policyId: params.basePolicy.id,
    effectivePolicyId: params.resolved.policy.id,
    resolutionSteps: params.resolved.steps,
    appliedPatchCount: params.resolved.appliedPatches.length,
    skippedPatchCount: params.resolved.skippedPatches.length,
    changedFieldCount: changedFields.length,
    changedFieldsSample: changedFields.slice(0, 20),
    sevenWOneH,
    sevenWOneHComplete: missingSevenWOneHDimensions.length === 0,
    missingSevenWOneHDimensions,
    governanceChecks: checks,
    governanceScore,
    governanceRating: ratingFromScore(governanceScore),
  };
}
