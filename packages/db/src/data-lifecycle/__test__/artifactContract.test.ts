import { describe, expect, it } from "vitest";
import { createHash, createHmac } from "node:crypto";

import { buildGovernanceAuditReport } from "../governance/auditReport.js";
import {
  buildGovernanceAuditArtifact,
  normalizeGovernanceAuditArtifact,
  verifyGovernanceAuditArtifact,
} from "../governance/artifactContract.js";
import { resolveLifecyclePolicy } from "../policies/defaultPolicy.js";

describe("governance audit artifact contract", () => {
  it("builds and verifies artifact with score threshold", () => {
    const basePolicy = resolveLifecyclePolicy("sales-default");
    const report = buildGovernanceAuditReport({
      basePolicy,
      resolved: {
        policy: basePolicy,
        steps: [{ scope: "base", sourceId: basePolicy.id }],
        appliedPatches: [],
        skippedPatches: [],
      },
      command: "audit-policy",
      actor: "tester",
    });
    const digest = createHash("sha256").update(JSON.stringify(report)).digest("hex");
    const artifact = buildGovernanceAuditArtifact(
      report,
      {
        digestSha256: digest,
      },
      {
        resolvedPolicy: basePolicy,
      }
    );
    const verified = verifyGovernanceAuditArtifact(artifact, { minGovernanceScore: 70 });
    expect(verified.artifact.contractVersion).toBe("1.1.0");
    expect(verified.checks.find((check) => check.name === "governance_score_threshold")?.passed).toBe(
      true
    );
    expect(verified.checks.find((check) => check.name === "digest_match")?.passed).toBe(true);
    expect(verified.artifact.policySnapshot?.stablePolicyHash).toBeDefined();
  });

  it("validates signature when signing key is provided", () => {
    const basePolicy = resolveLifecyclePolicy("sales-default");
    const report = buildGovernanceAuditReport({
      basePolicy,
      resolved: {
        policy: basePolicy,
        steps: [{ scope: "base", sourceId: basePolicy.id }],
        appliedPatches: [],
        skippedPatches: [],
      },
      command: "audit-policy",
      actor: "tester",
    });

    const digest = createHash("sha256").update(JSON.stringify(report)).digest("hex");
    const signingKey = "unit-test-signing-key";
    const signature = createHmac("sha256", signingKey).update(digest).digest("hex");
    const artifact = buildGovernanceAuditArtifact(
      report,
      {
        digestSha256: digest,
        digestSignature: signature,
      },
      {
        resolvedPolicy: basePolicy,
      }
    );
    const verified = verifyGovernanceAuditArtifact(artifact, {
      signingKey,
      requireSignature: true,
      minGovernanceScore: 70,
    });
    expect(verified.checks.find((check) => check.name === "signature_verification")?.passed).toBe(true);
  });

  it("normalizes legacy v1.0.0 artifact to current contract", () => {
    const basePolicy = resolveLifecyclePolicy("sales-default");
    const report = buildGovernanceAuditReport({
      basePolicy,
      resolved: {
        policy: basePolicy,
        steps: [{ scope: "base", sourceId: basePolicy.id }],
        appliedPatches: [],
        skippedPatches: [],
      },
      command: "audit-policy",
      actor: "tester",
    });
    const digest = createHash("sha256").update(JSON.stringify(report)).digest("hex");
    const legacyArtifact = {
      contractVersion: "1.0.0",
      generatedAt: new Date().toISOString(),
      report,
      persistedEvidence: {
        digestSha256: digest,
      },
    };
    const normalized = normalizeGovernanceAuditArtifact(legacyArtifact);
    expect(normalized.contractVersion).toBe("1.1.0");
    expect(normalized.sourceContractVersion).toBe("1.0.0");
  });

  it("fails when legacy artifacts are deprecated", () => {
    const basePolicy = resolveLifecyclePolicy("sales-default");
    const report = buildGovernanceAuditReport({
      basePolicy,
      resolved: {
        policy: basePolicy,
        steps: [{ scope: "base", sourceId: basePolicy.id }],
        appliedPatches: [],
        skippedPatches: [],
      },
      command: "audit-policy",
      actor: "tester",
    });
    const digest = createHash("sha256").update(JSON.stringify(report)).digest("hex");
    const legacyArtifact = {
      contractVersion: "1.0.0",
      generatedAt: new Date().toISOString(),
      report,
      persistedEvidence: {
        digestSha256: digest,
      },
    };
    const verified = verifyGovernanceAuditArtifact(legacyArtifact, {
      rejectLegacyContract: true,
    });
    expect(verified.checks.find((check) => check.name === "legacy_contract_deprecation")?.passed).toBe(
      false
    );
  });

  it("fails stale artifact when max age threshold exceeded", () => {
    const basePolicy = resolveLifecyclePolicy("sales-default");
    const report = buildGovernanceAuditReport({
      basePolicy,
      resolved: {
        policy: basePolicy,
        steps: [{ scope: "base", sourceId: basePolicy.id }],
        appliedPatches: [],
        skippedPatches: [],
      },
      command: "audit-policy",
      actor: "tester",
    });
    const digest = createHash("sha256").update(JSON.stringify(report)).digest("hex");
    const staleDate = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();
    const artifact = {
      contractVersion: "1.1.0",
      generatedAt: staleDate,
      report,
      persistedEvidence: { digestSha256: digest },
      qualityProfile: {
        tier: "reference",
        minScore: 85,
        requireSignature: false,
      },
    };
    const verified = verifyGovernanceAuditArtifact(artifact, {
      maxArtifactAgeDays: 1,
    });
    expect(verified.checks.find((check) => check.name === "artifact_freshness")?.passed).toBe(false);
  });

  it("fails legacy artifact after sunset date", () => {
    const basePolicy = resolveLifecyclePolicy("sales-default");
    const report = buildGovernanceAuditReport({
      basePolicy,
      resolved: {
        policy: basePolicy,
        steps: [{ scope: "base", sourceId: basePolicy.id }],
        appliedPatches: [],
        skippedPatches: [],
      },
      command: "audit-policy",
      actor: "tester",
    });
    const digest = createHash("sha256").update(JSON.stringify(report)).digest("hex");
    const legacyArtifact = {
      contractVersion: "1.0.0",
      generatedAt: new Date().toISOString(),
      report,
      persistedEvidence: { digestSha256: digest },
    };
    const verified = verifyGovernanceAuditArtifact(legacyArtifact, {
      legacyContractSunsetDate: "2000-01-01T00:00:00.000Z",
    });
    expect(verified.checks.find((check) => check.name === "legacy_contract_sunset")?.passed).toBe(
      false
    );
  });
});
