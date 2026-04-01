import { createHash, createHmac } from "node:crypto";
import { sql } from "drizzle-orm";

import type { R2ObjectRepo } from "../../r2/objectRepo.types.js";
import type { GovernanceAuditReport } from "./auditReport.js";

export type PersistedAuditEvidence = {
  digestSha256: string;
  digestSignature?: string;
  storageMirrorKey?: string;
};

function computeDigest(payload: string): string {
  return createHash("sha256").update(payload).digest("hex");
}

function signDigest(digest: string, signingKey?: string): string | undefined {
  if (!signingKey) {
    return undefined;
  }
  return createHmac("sha256", signingKey).update(digest).digest("hex");
}

export async function persistGovernanceAuditReport(
  db: any,
  report: GovernanceAuditReport,
  options: {
    repo?: R2ObjectRepo;
    bucketPrefix?: string;
    signingKey?: string;
  } = {}
): Promise<PersistedAuditEvidence> {
  const payload = JSON.stringify(report);
  const digestSha256 = computeDigest(payload);
  const digestSignature = signDigest(digestSha256, options.signingKey);

  let storageMirrorKey: string | undefined;
  if (options.repo) {
    storageMirrorKey = `${options.bucketPrefix ?? "governance/audit"}/${report.policyId}/${report.auditId}.json`;
    await options.repo.putObject({
      key: storageMirrorKey,
      body: Buffer.from(payload, "utf-8"),
      contentType: "application/json",
      metadata: {
        auditid: report.auditId,
        policyid: report.policyId,
        score: String(report.governanceScore),
        digest: digestSha256,
      },
    });
  }

  await db.execute(sql`
    INSERT INTO lifecycle_audit_reports (
      id,
      policy_id,
      effective_policy_id,
      command,
      actor,
      governance_score,
      governance_rating,
      seven_w_one_h_complete,
      digest_sha256,
      digest_signature,
      payload,
      storage_mirror_key
    ) VALUES (
      ${report.auditId},
      ${report.policyId},
      ${report.effectivePolicyId},
      ${report.command},
      ${report.sevenWOneH.who},
      ${String(report.governanceScore)},
      ${report.governanceRating},
      ${report.sevenWOneHComplete},
      ${digestSha256},
      ${digestSignature ?? null},
      ${JSON.parse(payload)},
      ${storageMirrorKey ?? null}
    )
  `);

  return {
    digestSha256,
    digestSignature,
    storageMirrorKey,
  };
}
