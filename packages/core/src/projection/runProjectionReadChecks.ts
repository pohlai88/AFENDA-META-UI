import { buildInvariantFailurePayload } from "../runtime/buildInvariantFailurePayload.js";
import { buildTruthRegistry, type TruthRegistry } from "../runtime/registry.js";
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

  const registry = args.registry ?? buildTruthRegistry();
  return [
    buildInvariantFailurePayload({
      registry,
      invariantKey: "authoritative_projection_requires_clean_truth_contract",
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
