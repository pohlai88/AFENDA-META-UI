import { buildFinancialAuthorityProjection } from "../projection/authorityProjection.js";
import { runProjectionReadChecks, type ProjectionReadCheckContext } from "../projection/runProjectionReadChecks.js";
import type { InvariantFailurePayload } from "../runtime/types.js";
import type { MemoryEvent } from "../replay/types.js";
import type { TruthEvidenceArtifact } from "./types.js";
import { verifyReplay } from "./verifyReplay.js";

export function generateTruthEvidence(args: {
  generatorDriftChecked: boolean;
  failures: readonly InvariantFailurePayload[];
  events: readonly MemoryEvent[];
  currentProjection: Record<string, Record<string, unknown>>;
  tenantId?: string;
  scopeId?: string;
  readCheckContext?: ProjectionReadCheckContext;
}): TruthEvidenceArtifact {
  const readTimeFailures = args.readCheckContext
    ? runProjectionReadChecks({ context: args.readCheckContext })
    : [];
  const allFailures = [...args.failures, ...readTimeFailures];
  const replay = verifyReplay({
    events: args.events,
    currentProjection: args.currentProjection,
  });
  const authority = buildFinancialAuthorityProjection({
    tenantId: args.tenantId ?? "tenant_unknown",
    scopeId: args.scopeId ?? "financial_authority",
    failures: allFailures,
    replayChecksum: replay.replayChecksum,
    replayMatchesCurrentProjection: replay.matches,
  });

  return {
    generatedAt: new Date().toISOString(),
    generatorDriftChecked: args.generatorDriftChecked,
    replayVerified: true,
    replayChecksum: replay.replayChecksum,
    currentProjectionChecksum: replay.currentProjectionChecksum,
    replayMatchesCurrentProjection: replay.matches,
    tenantId: authority.tenantId,
    scopeId: authority.scopeId,
    authorityStatus: authority.authorityStatus,
    invariantSnapshot: authority.invariantSnapshot,
    valuationBasisStatus: authority.valuationBasisStatus,
    provenance: authority.provenance,
    blockedReasons: authority.blockedReasons,
    blockingInvariantKeys: authority.blockingInvariantKeys,
    blockingDoctrineKeys: authority.blockingDoctrineKeys,
  };
}
