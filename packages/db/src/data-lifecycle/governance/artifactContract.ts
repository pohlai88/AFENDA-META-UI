import { createHash, createHmac } from "node:crypto";
import { z } from "zod/v4";

import type { GovernanceAuditReport } from "./auditReport.js";
import type { PersistedAuditEvidence } from "./persistence.js";

export const GOVERNANCE_AUDIT_ARTIFACT_VERSION = "1.1.0";
export const GOVERNANCE_AUDIT_ARTIFACT_VERSION_LEGACY = "1.0.0";

const GovernanceAuditReportSchema = z.object({
  auditId: z.string(),
  auditedAt: z.string(),
  command: z.string(),
  policyId: z.string(),
  effectivePolicyId: z.string(),
  resolutionSteps: z.array(
    z.object({
      scope: z.string(),
      sourceId: z.string(),
    })
  ),
  appliedPatchCount: z.number().int().min(0),
  skippedPatchCount: z.number().int().min(0),
  changedFieldCount: z.number().int().min(0),
  changedFieldsSample: z.array(z.string()),
  sevenWOneH: z.object({
    who: z.string(),
    what: z.string(),
    when: z.string(),
    where: z.string(),
    why: z.string(),
    which: z.string(),
    whom: z.string(),
    how: z.string(),
  }),
  sevenWOneHComplete: z.boolean(),
  missingSevenWOneHDimensions: z.array(z.string()),
  governanceChecks: z.array(
    z.object({
      name: z.string(),
      passed: z.boolean(),
      details: z.string(),
    })
  ),
  governanceScore: z.number().min(0).max(100),
  governanceRating: z.enum(["excellent", "good", "fair", "poor"]),
});

const PersistedAuditEvidenceSchema = z.object({
  digestSha256: z.string().regex(/^[a-f0-9]{64}$/i),
  digestSignature: z.string().regex(/^[a-f0-9]{64}$/i).optional(),
  storageMirrorKey: z.string().optional(),
});

const GovernanceAuditArtifactSchemaV1 = z.object({
  contractVersion: z.literal(GOVERNANCE_AUDIT_ARTIFACT_VERSION_LEGACY),
  generatedAt: z.string(),
  report: GovernanceAuditReportSchema,
  persistedEvidence: PersistedAuditEvidenceSchema.optional(),
});

const GovernanceAuditArtifactSchemaV1_1 = z.object({
  contractVersion: z.literal(GOVERNANCE_AUDIT_ARTIFACT_VERSION),
  sourceContractVersion: z.string().optional(),
  generatedAt: z.string(),
  report: GovernanceAuditReportSchema,
  persistedEvidence: PersistedAuditEvidenceSchema.optional(),
  policySnapshot: z
    .object({
      stablePolicyHash: z.string().regex(/^[a-f0-9]{64}$/i),
      resolvedPolicy: z.unknown(),
      baselineId: z.string().optional(),
    })
    .optional(),
  qualityProfile: z
    .object({
      tier: z.enum(["reference", "strict", "standard"]).default("standard"),
      minScore: z.number().min(0).max(100).default(80),
      requireSignature: z.boolean().default(false),
    })
    .default({
      tier: "standard",
      minScore: 80,
      requireSignature: false,
    }),
});

export const GovernanceAuditArtifactSchema = z.union([
  GovernanceAuditArtifactSchemaV1,
  GovernanceAuditArtifactSchemaV1_1,
]);

export type GovernanceAuditArtifact = z.infer<typeof GovernanceAuditArtifactSchemaV1_1>;

function computeDigest(payload: string): string {
  return createHash("sha256").update(payload).digest("hex");
}

function computeSignature(digest: string, signingKey: string): string {
  return createHmac("sha256", signingKey).update(digest).digest("hex");
}

function stableStringify(input: unknown): string {
  if (input === null || input === undefined) {
    return JSON.stringify(input);
  }
  if (typeof input !== "object") {
    return JSON.stringify(input);
  }
  if (Array.isArray(input)) {
    return `[${input.map((entry) => stableStringify(entry)).join(",")}]`;
  }

  const entries = Object.entries(input as Record<string, unknown>).sort(([a], [b]) =>
    a.localeCompare(b)
  );
  const body = entries
    .map(([key, value]) => `${JSON.stringify(key)}:${stableStringify(value)}`)
    .join(",");
  return `{${body}}`;
}

export function computeStablePolicyHash(policy: unknown): string {
  return computeDigest(stableStringify(policy));
}

export function normalizeGovernanceAuditArtifact(input: unknown): GovernanceAuditArtifact {
  const parsed = GovernanceAuditArtifactSchema.parse(input);
  if (parsed.contractVersion === GOVERNANCE_AUDIT_ARTIFACT_VERSION) {
    return GovernanceAuditArtifactSchemaV1_1.parse(parsed);
  }
  return GovernanceAuditArtifactSchemaV1_1.parse({
    contractVersion: GOVERNANCE_AUDIT_ARTIFACT_VERSION,
    sourceContractVersion: parsed.contractVersion,
    generatedAt: parsed.generatedAt,
    report: parsed.report,
    persistedEvidence: parsed.persistedEvidence,
    qualityProfile: {
      tier: "standard",
      minScore: 80,
      requireSignature: false,
    },
  });
}

export function buildGovernanceAuditArtifact(
  report: GovernanceAuditReport,
  persistedEvidence?: PersistedAuditEvidence,
  options: {
    resolvedPolicy?: unknown;
    baselineId?: string;
    tier?: "reference" | "strict" | "standard";
    minScore?: number;
    requireSignature?: boolean;
  } = {}
): GovernanceAuditArtifact {
  return GovernanceAuditArtifactSchemaV1_1.parse({
    contractVersion: GOVERNANCE_AUDIT_ARTIFACT_VERSION,
    generatedAt: new Date().toISOString(),
    report,
    persistedEvidence,
    policySnapshot: options.resolvedPolicy
      ? {
          stablePolicyHash: computeStablePolicyHash(options.resolvedPolicy),
          resolvedPolicy: options.resolvedPolicy,
          baselineId: options.baselineId,
        }
      : undefined,
    qualityProfile: {
      tier: options.tier ?? "reference",
      minScore: options.minScore ?? 85,
      requireSignature: options.requireSignature ?? false,
    },
  });
}

export function verifyGovernanceAuditArtifact(
  input: unknown,
  options: {
    minGovernanceScore?: number;
    signingKey?: string;
    requireSignature?: boolean;
    requirePolicySnapshot?: boolean;
    maxArtifactAgeDays?: number;
    rejectLegacyContract?: boolean;
    legacyContractSunsetDate?: string;
  } = {}
): { artifact: GovernanceAuditArtifact; checks: Array<{ name: string; passed: boolean; details: string }> } {
  const artifact = normalizeGovernanceAuditArtifact(input);
  const checks: Array<{ name: string; passed: boolean; details: string }> = [];

  const minGovernanceScore = options.minGovernanceScore ?? artifact.qualityProfile.minScore;
  checks.push({
    name: "governance_score_threshold",
    passed: artifact.report.governanceScore >= minGovernanceScore,
    details: `score=${artifact.report.governanceScore} min=${minGovernanceScore}`,
  });

  if (typeof options.maxArtifactAgeDays === "number") {
    const generatedAtMs = Date.parse(artifact.generatedAt);
    if (!Number.isNaN(generatedAtMs)) {
      const ageMs = Date.now() - generatedAtMs;
      const ageDays = ageMs / (1000 * 60 * 60 * 24);
      checks.push({
        name: "artifact_freshness",
        passed: ageDays <= options.maxArtifactAgeDays,
        details: `ageDays=${ageDays.toFixed(2)} maxDays=${options.maxArtifactAgeDays}`,
      });
    } else {
      checks.push({
        name: "artifact_freshness",
        passed: false,
        details: "invalid generatedAt timestamp",
      });
    }
  }

  if (options.rejectLegacyContract) {
    const isLegacy = Boolean(artifact.sourceContractVersion);
    checks.push({
      name: "legacy_contract_deprecation",
      passed: !isLegacy,
      details: isLegacy
        ? `legacy source contract detected: ${artifact.sourceContractVersion}`
        : "current contract only",
    });
  }

  if (options.legacyContractSunsetDate) {
    const sunsetMs = Date.parse(options.legacyContractSunsetDate);
    const isLegacy = Boolean(artifact.sourceContractVersion);
    if (Number.isNaN(sunsetMs)) {
      checks.push({
        name: "legacy_contract_sunset",
        passed: false,
        details: `invalid sunset date: ${options.legacyContractSunsetDate}`,
      });
    } else if (!isLegacy) {
      checks.push({
        name: "legacy_contract_sunset",
        passed: true,
        details: "artifact already on current contract",
      });
    } else {
      const nowMs = Date.now();
      checks.push({
        name: "legacy_contract_sunset",
        passed: nowMs <= sunsetMs,
        details:
          nowMs <= sunsetMs
            ? `legacy contract still allowed until ${new Date(sunsetMs).toISOString()}`
            : `legacy contract sunset expired at ${new Date(sunsetMs).toISOString()}`,
      });
    }
  }

  const reportedDigest = artifact.persistedEvidence?.digestSha256;
  if (reportedDigest) {
    const computedDigest = computeDigest(JSON.stringify(artifact.report));
    checks.push({
      name: "digest_match",
      passed: computedDigest === reportedDigest,
      details: computedDigest === reportedDigest ? "digest matches report payload" : "digest mismatch",
    });
  }

  const reportedSignature = artifact.persistedEvidence?.digestSignature;
  const requireSignature = options.requireSignature ?? artifact.qualityProfile.requireSignature;
  if (reportedSignature) {
    if (!options.signingKey) {
      checks.push({
        name: "signature_verification",
        passed: false,
        details: "signature exists but signing key not provided",
      });
    } else {
      const expectedSignature = computeSignature(
        artifact.persistedEvidence?.digestSha256 ?? "",
        options.signingKey
      );
      checks.push({
        name: "signature_verification",
        passed: expectedSignature === reportedSignature,
        details:
          expectedSignature === reportedSignature
            ? "signature verified"
            : "signature mismatch",
      });
    }
  } else if (requireSignature) {
    checks.push({
      name: "signature_required",
      passed: false,
      details: "signature required but missing from artifact",
    });
  }

  if (options.requirePolicySnapshot && !artifact.policySnapshot) {
    checks.push({
      name: "policy_snapshot_required",
      passed: false,
      details: "artifact missing policy snapshot (regenerate artifact with contract 1.1.0)",
    });
  }

  return { artifact, checks };
}
