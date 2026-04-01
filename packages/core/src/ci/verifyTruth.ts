import type { TruthVerificationAdapters } from "./adapters.js";
import { generateTruthEvidence } from "./generateTruthEvidence.js";
import type { VerifyTruthResult } from "./types.js";

export async function verifyTruth(args: {
  adapters: TruthVerificationAdapters;
  generatorDriftChecked: boolean;
}): Promise<VerifyTruthResult> {
  const [events, currentProjection, failures] = await Promise.all([
    args.adapters.readMemoryEvents(),
    args.adapters.readCurrentProjection(),
    args.adapters.readInvariantFailures(),
  ]);

  const evidence = generateTruthEvidence({
    generatorDriftChecked: args.generatorDriftChecked,
    failures,
    events,
    currentProjection,
  });

  return {
    evidence,
    snapshot: {
      events,
      currentProjection,
      failures,
    },
  };
}
