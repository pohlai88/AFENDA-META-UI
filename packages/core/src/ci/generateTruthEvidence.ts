import { buildFinancialAuthorityProjection } from "../projection/authorityProjection.js";
import type { InvariantFailurePayload } from "../runtime/types.js";
import type { MemoryEvent } from "../replay/types.js";
import type { TruthEvidenceArtifact } from "./types.js";
import { verifyReplay } from "./verifyReplay.js";

export function generateTruthEvidence(args: {
  generatorDriftChecked: boolean;
  failures: readonly InvariantFailurePayload[];
  events: readonly MemoryEvent[];
  currentProjection: Record<string, Record<string, unknown>>;
}): TruthEvidenceArtifact {
  const authority = buildFinancialAuthorityProjection({
    failures: args.failures,
  });

  const replay = verifyReplay({
    events: args.events,
    currentProjection: args.currentProjection,
  });

  return {
    generatedAt: new Date().toISOString(),
    generatorDriftChecked: args.generatorDriftChecked,
    replayVerified: true,
    replayChecksum: replay.replayChecksum,
    currentProjectionChecksum: replay.currentProjectionChecksum,
    replayMatchesCurrentProjection: replay.matches,
    authorityStatus: authority.authorityStatus,
    blockedReasons: authority.blockedReasons,
  };
}
