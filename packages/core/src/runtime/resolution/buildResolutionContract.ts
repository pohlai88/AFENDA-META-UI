import type { InvariantFailurePayload } from "../../contracts/failures.js";
import type { TruthRegistry } from "../registry.js";
import { getResolutionByRef } from "./resolutionLookup.js";

function injectRouteParams(target: string, evidenceFacts: Record<string, unknown>): string {
  return target.replace(/:([A-Za-z0-9_]+)/g, (_, key: string) => {
    const value = evidenceFacts[key];
    return value == null ? `:${key}` : encodeURIComponent(String(value));
  });
}

export function buildResolutionContract(args: {
  registry: TruthRegistry;
  resolutionRef?: string;
  actorRole?: string;
  evidenceFacts: Record<string, unknown>;
}): InvariantFailurePayload["resolution"] | undefined {
  if (!args.resolutionRef) {
    return undefined;
  }

  const resolution = getResolutionByRef({
    registry: args.registry,
    resolutionRef: args.resolutionRef,
  });

  const responsibleRole = "responsibleRole" in resolution ? resolution.responsibleRole : undefined;
  const actorCanResolveDirectly = !responsibleRole || !args.actorRole
    ? true
    : responsibleRole === args.actorRole;

  const actions = resolution.actions
    .filter((action) => actorCanResolveDirectly || action.type === "workflow")
    .map((action) =>
      "target" in action && action.target
        ? { ...action, target: injectRouteParams(action.target, args.evidenceFacts) }
        : action,
    );

  const normalizedActions =
    actions.length > 0
      ? actions
      : [
          {
            type: "workflow" as const,
            label: "Escalate for authorized resolution",
            target: "escalation",
          },
        ];

  return {
    resolutionId: resolution.resolutionId,
    resolutionClass: resolution.resolutionClass,
    title: resolution.title,
    actions: normalizedActions,
    responsibleRole,
  };
}
