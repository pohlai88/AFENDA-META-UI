import type { InvariantFailurePayload } from "../../contracts/failures.js";
import type { ResolutionAction } from "../../truth/types.js";
import { getResolutionByRef } from "./resolutionLookup.js";

function injectTargetParams(
  target: string | undefined,
  evidenceFacts: Record<string, unknown>,
): string | undefined {
  if (!target) {
    return undefined;
  }

  return target.replace(/:([A-Za-z0-9_]+)/g, (_, paramName: string) => {
    const value = evidenceFacts[paramName];

    if (value == null) {
      return `:${paramName}`;
    }

    return encodeURIComponent(String(value));
  });
}

function actionTarget(action: ResolutionAction): string | undefined {
  return "target" in action ? action.target : undefined;
}

function actorCanDirectlyResolve(args: {
  actorRole?: string;
  responsibleRole?: string;
}): boolean {
  if (!args.responsibleRole) {
    return true;
  }

  return args.actorRole === args.responsibleRole;
}

export function buildResolutionContract(args: {
  resolutionRef?: string;
  actorRole?: string;
  evidenceFacts: Record<string, unknown>;
}): InvariantFailurePayload["resolution"] | undefined {
  if (!args.resolutionRef) {
    return undefined;
  }

  const resolution = getResolutionByRef(args.resolutionRef);
  const responsibleRole =
    "responsibleRole" in resolution ? resolution.responsibleRole : undefined;
  const directAllowed = actorCanDirectlyResolve({
    actorRole: args.actorRole,
    responsibleRole,
  });

  const escalation = "escalation" in resolution ? resolution.escalation : undefined;

  const actions = directAllowed
    ? resolution.allowedActions.map((action) => ({
        type: action.type,
        label: action.label,
        target: injectTargetParams(actionTarget(action), args.evidenceFacts),
      }))
    : escalation
      ? [
          {
            type: escalation.type,
            label: escalation.label,
            target: injectTargetParams(actionTarget(escalation), args.evidenceFacts),
          },
        ]
      : [];

  return {
    resolutionId: resolution.resolutionId,
    resolutionClass: resolution.resolutionClass,
    title: resolution.title,
    actions,
    responsibleRole,
  };
}
