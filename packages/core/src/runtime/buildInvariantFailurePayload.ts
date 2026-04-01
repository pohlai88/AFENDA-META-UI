import type { InvariantFailurePayload } from "../contracts/failures.js";
import { buildDoctrineTrace } from "./doctrine/doctrineTrace.js";
import { buildResolutionContract } from "./resolution/buildResolutionContract.js";

export function buildInvariantFailurePayload(args: {
  invariantName: string;
  severity: InvariantFailurePayload["severity"];
  failurePolicy: InvariantFailurePayload["failurePolicy"];
  evidenceSummary: string;
  evidenceFacts: Record<string, unknown>;
  doctrineRef?: string;
  resolutionRef?: string;
  actorRole?: string;
}): InvariantFailurePayload {
  const doctrine = buildDoctrineTrace({
    doctrineRef: args.doctrineRef,
  });
  if (!doctrine) {
    throw new Error(`Invariant ${args.invariantName} is missing doctrine trace`);
  }

  return {
    invariantName: args.invariantName,
    severity: args.severity,
    failurePolicy: args.failurePolicy,
    doctrine,
    evidence: {
      summary: args.evidenceSummary,
      facts: args.evidenceFacts,
    },
    resolution: buildResolutionContract({
      resolutionRef: args.resolutionRef,
      actorRole: args.actorRole,
      evidenceFacts: args.evidenceFacts,
    }),
  };
}
