import { stableStringify } from "./recordTypes.js";

export type SupersessionRequirementInput = {
  entityName: string;
  previousState: Record<string, unknown> | null | undefined;
  nextState: Record<string, unknown> | null | undefined;
  ignoredFields?: string[];
};

export type SupersessionMetadata =
  | {
      mode: "none";
    }
  | {
      mode: "supersedes";
      supersedesRecordId: string;
      reason: string;
      changedFields?: string[];
    };

export type SupersessionEvaluation = {
  requiresSupersession: boolean;
  changedFields: string[];
};

function toComparableObject(
  value: Record<string, unknown> | null | undefined,
  ignoredFields: Set<string>,
): Record<string, unknown> {
  const src = value ?? {};
  const entries = Object.entries(src)
    .filter(([key]) => !ignoredFields.has(key))
    .sort(([a], [b]) => a.localeCompare(b));

  return Object.fromEntries(entries);
}

function changedTopLevelFields(
  previousState: Record<string, unknown>,
  nextState: Record<string, unknown>,
): string[] {
  const keys = Array.from(
    new Set([...Object.keys(previousState), ...Object.keys(nextState)]),
  ).sort((a, b) => a.localeCompare(b));

  return keys.filter((key) => {
    return stableStringify(previousState[key]) !== stableStringify(nextState[key]);
  });
}

/**
 * Production default:
 * - any meaning-changing update requires supersession
 * - metadata-only fields may be ignored via ignoredFields
 */
export function evaluateSupersessionRequirement(
  input: SupersessionRequirementInput,
): SupersessionEvaluation {
  const ignoredFields = new Set(input.ignoredFields ?? []);

  const previousComparable = toComparableObject(input.previousState, ignoredFields);
  const nextComparable = toComparableObject(input.nextState, ignoredFields);

  const changedFields = changedTopLevelFields(previousComparable, nextComparable);

  return {
    requiresSupersession: changedFields.length > 0,
    changedFields,
  };
}

export function assertSupersessionProvided(params: {
  entityName: string;
  previousState: Record<string, unknown> | null | undefined;
  nextState: Record<string, unknown> | null | undefined;
  supersession: SupersessionMetadata | undefined;
  ignoredFields?: string[];
}): SupersessionEvaluation {
  const evaluation = evaluateSupersessionRequirement({
    entityName: params.entityName,
    previousState: params.previousState,
    nextState: params.nextState,
    ignoredFields: params.ignoredFields,
  });

  if (!evaluation.requiresSupersession) {
    return evaluation;
  }

  if (!params.supersession || params.supersession.mode !== "supersedes") {
    throw new Error(
      `Supersession required for ${params.entityName} but no supersession metadata was provided.`,
    );
  }

  if (
    typeof params.supersession.supersedesRecordId !== "string" ||
    params.supersession.supersedesRecordId.trim() === ""
  ) {
    throw new Error(
      `Supersession required for ${params.entityName} but supersedesRecordId is missing.`,
    );
  }

  if (
    typeof params.supersession.reason !== "string" ||
    params.supersession.reason.trim() === ""
  ) {
    throw new Error(
      `Supersession required for ${params.entityName} but supersession reason is missing.`,
    );
  }

  return evaluation;
}
