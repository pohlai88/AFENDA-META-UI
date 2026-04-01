import type { InvariantFailurePayload } from "../runtime/types.js";
import { stableStringify } from "../replay/checksum.js";
import type { FinancialAuthorityProjection } from "./types.js";

const severityRank: Record<InvariantFailurePayload["severity"], number> = {
  critical: 0,
  major: 1,
  minor: 2,
  informational: 3,
};

function unique<T>(values: readonly T[]): T[] {
  return [...new Set(values)];
}

function sortInvariantFailurePayloads(
  failures: readonly InvariantFailurePayload[],
): InvariantFailurePayload[] {
  return [...failures].sort((a, b) => {
    const severityCompare = severityRank[a.severity] - severityRank[b.severity];
    if (severityCompare !== 0) return severityCompare;

    const invariantCompare = a.invariantName.localeCompare(b.invariantName);
    if (invariantCompare !== 0) return invariantCompare;

    const doctrineCompare = a.doctrine.doctrineRef.localeCompare(b.doctrine.doctrineRef);
    if (doctrineCompare !== 0) return doctrineCompare;

    return stableStringify(a.evidence.facts).localeCompare(stableStringify(b.evidence.facts));
  });
}

export function buildFinancialAuthorityProjection(args: {
  tenantId: string;
  scopeId: string;
  failures: readonly InvariantFailurePayload[];
  valuationBasisStatus?: "valid" | "missing" | "invalid";
  checkpointId?: string;
  replayChecksum?: string;
  replayMatchesCurrentProjection?: boolean;
}): FinancialAuthorityProjection {
  const blockedReasons = sortInvariantFailurePayloads(args.failures);
  const blockingInvariantKeys = unique(blockedReasons.map((x) => x.invariantName));
  const blockingDoctrineKeys = unique(blockedReasons.map((x) => x.doctrine.doctrineRef));
  const hasBlockingFailures = blockedReasons.length > 0;
  const replayMismatch = args.replayMatchesCurrentProjection === false;
  const authorityStatus = hasBlockingFailures
    ? "blocked"
    : replayMismatch
      ? "provisional"
      : "authoritative";

  return {
    tenantId: args.tenantId,
    scopeId: args.scopeId,
    authorityStatus,
    invariantSnapshot: blockedReasons.map((failure) => ({
      invariantName: failure.invariantName,
      status: "failed" as const,
      severity: failure.severity,
      doctrineRef: failure.doctrine.doctrineRef,
    })),
    valuationBasisStatus: args.valuationBasisStatus ?? "valid",
    provenance: {
      checkpointId: args.checkpointId,
      replayChecksum: args.replayChecksum,
    },
    blockedReasons,
    blockingInvariantKeys,
    blockingDoctrineKeys,
  };
}
