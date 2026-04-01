import type { InvariantFailurePayload } from "../runtime/types.js";
import type { MemoryEvent } from "../replay/types.js";

export type TruthEvidenceArtifact = {
  generatedAt: string;
  generatorDriftChecked: boolean;
  replayVerified: boolean;
  replayChecksum: string;
  currentProjectionChecksum: string;
  replayMatchesCurrentProjection: boolean;
  authorityStatus: "authoritative" | "blocked";
  blockedReasons: InvariantFailurePayload[];
};

export type VerifyReplayArgs<TProjection> = {
  events: readonly MemoryEvent[];
  currentProjection: TProjection;
};

export type VerifyReplayResult<TProjection> = {
  replayProjection: TProjection;
  replayChecksum: string;
  currentProjectionChecksum: string;
  matches: boolean;
};

export type TruthVerificationSnapshot = {
  events: readonly MemoryEvent[];
  currentProjection: Record<string, Record<string, unknown>>;
  failures: readonly InvariantFailurePayload[];
};

export type VerifyTruthResult = {
  evidence: TruthEvidenceArtifact;
  snapshot: TruthVerificationSnapshot;
};
