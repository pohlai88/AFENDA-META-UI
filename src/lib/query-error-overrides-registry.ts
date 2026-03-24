import type {
  QueryErrorCategory,
  QueryErrorPresentationOverrides,
  QueryErrorSource,
} from "./query-error-classifier";

const DEFAULT_QUERY_ERROR_PRESENTATION_OVERRIDES: QueryErrorPresentationOverrides = {};

let currentQueryErrorPresentationOverrides: QueryErrorPresentationOverrides =
  DEFAULT_QUERY_ERROR_PRESENTATION_OVERRIDES;

function mergeSourceCategoryOverrides(
  target: QueryErrorPresentationOverrides,
  source: QueryErrorPresentationOverrides,
  sourceKey: QueryErrorSource,
  categoryKey: QueryErrorCategory
) {
  const sourceCategory = source[sourceKey]?.[categoryKey];

  if (!sourceCategory) {
    return target;
  }

  return {
    ...target,
    [sourceKey]: {
      ...target[sourceKey],
      [categoryKey]: {
        ...target[sourceKey]?.[categoryKey],
        ...sourceCategory,
      },
    },
  };
}

function mergePresentationOverrides(
  base: QueryErrorPresentationOverrides,
  extra: QueryErrorPresentationOverrides
): QueryErrorPresentationOverrides {
  let merged = base;
  const sources: QueryErrorSource[] = ["query", "mutation"];
  const categories: QueryErrorCategory[] = [
    "auth",
    "validation",
    "server",
    "network",
    "not-found",
    "cancelled",
    "unknown",
  ];

  for (const source of sources) {
    for (const category of categories) {
      merged = mergeSourceCategoryOverrides(merged, extra, source, category);
    }
  }

  return merged;
}

export function getQueryErrorPresentationOverrides(): QueryErrorPresentationOverrides {
  return currentQueryErrorPresentationOverrides;
}

export function registerQueryErrorPresentationOverrides(
  overrides: QueryErrorPresentationOverrides
) {
  currentQueryErrorPresentationOverrides = mergePresentationOverrides(
    currentQueryErrorPresentationOverrides,
    overrides
  );
}

export function resetQueryErrorPresentationOverrides() {
  currentQueryErrorPresentationOverrides = DEFAULT_QUERY_ERROR_PRESENTATION_OVERRIDES;
}
