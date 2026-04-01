import { buildInvariantFailurePayload } from "../runtime/buildInvariantFailurePayload.js";
import { invariants } from "../generated/invariants.js";
import type { TruthRegistry } from "../runtime/registry.js";
import type { InvariantFailurePayload } from "../runtime/types.js";

export type ProjectionReadCheckContext = {
  truthContractValid: boolean;
  scopeId: string;
  actorRole?: string;
  breachReason?: string;
};

export function runProjectionReadChecks(args: {
  context: ProjectionReadCheckContext;
  registry?: TruthRegistry;
}): InvariantFailurePayload[] {
  if (args.context.truthContractValid) {
    return [];
  }

  const invariant = invariants.find(
    (entry) => entry.key === "authoritative_projection_requires_clean_truth_contract",
  );
  if (!invariant) {
    throw new Error("Missing generated invariant: authoritative_projection_requires_clean_truth_contract");
  }
  return [
    buildInvariantFailurePayload({
      invariantName: invariant.key,
      severity: invariant.severity,
      failurePolicy: invariant.failurePolicy,
      doctrineRef: invariant.doctrineRef,
      resolutionRef: invariant.resolutionRef,
      actorRole: args.context.actorRole,
      evidenceSummary: "Truth contract is not clean for authoritative projection.",
      evidenceFacts: {
        scopeId: args.context.scopeId,
        truthContractValid: args.context.truthContractValid,
        breachReason: args.context.breachReason ?? "truth_contract_invalid",
      },
    }),
  ];
}
