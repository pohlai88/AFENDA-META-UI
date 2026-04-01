import type { InvariantFailurePayload } from "../contracts/failures.js";
import type { TruthRegistry } from "./registry.js";
import { buildDoctrineTrace } from "./doctrine/doctrineTrace.js";
import { buildResolutionContract } from "./resolution/buildResolutionContract.js";

export function buildInvariantFailurePayload(args: {
  registry: TruthRegistry;
  invariantKey: string;
  evidenceSummary: string;
  evidenceFacts: Record<string, unknown>;
  actorRole?: string;
}): InvariantFailurePayload {
  const invariant = args.registry.invariantsByKey.get(args.invariantKey);
  if (!invariant) {
    throw new Error(`Unknown invariant: ${args.invariantKey}`);
  }

  const doctrine = buildDoctrineTrace({
    registry: args.registry,
    doctrineRef: invariant.doctrineRef,
  });

  if (!doctrine) {
    throw new Error(`Invariant ${invariant.key} is missing doctrine trace`);
  }

  const resolution = buildResolutionContract({
    registry: args.registry,
    resolutionRef: invariant.resolutionRef,
    actorRole: args.actorRole,
    evidenceFacts: args.evidenceFacts,
  });

  return {
    invariantName: invariant.key,
    severity: invariant.severity,
    failurePolicy: invariant.failurePolicy,
    doctrine,
    evidence: {
      summary: args.evidenceSummary,
      facts: args.evidenceFacts,
    },
    resolution,
  };
}
