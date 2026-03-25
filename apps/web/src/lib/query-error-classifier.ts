export type QueryErrorCategory =
  | "auth"
  | "validation"
  | "server"
  | "network"
  | "not-found"
  | "cancelled"
  | "unknown";

export type QueryErrorSource = "query" | "mutation";

export interface QueryErrorPresentation {
  title: string;
  message: string;
}

export type QueryErrorPresentationOverrides = Partial<
  Record<QueryErrorSource, Partial<Record<QueryErrorCategory, Partial<QueryErrorPresentation>>>>
>;

export interface ClassifyQueryErrorOptions {
  source?: QueryErrorSource;
  presentationOverrides?: QueryErrorPresentationOverrides;
}

export interface QueryErrorClassification {
  category: QueryErrorCategory;
  actionable: boolean;
  title: string;
  message: string;
  status?: number;
  source: QueryErrorSource;
}

interface ErrorWithStatus {
  status?: number;
  statusText?: string;
  message?: string;
  name?: string;
}

function isErrorWithStatus(value: unknown): value is ErrorWithStatus {
  return Boolean(value) && typeof value === "object";
}

export function getErrorStatus(error: unknown): number | undefined {
  if (!isErrorWithStatus(error)) {
    return undefined;
  }

  return typeof error.status === "number" ? error.status : undefined;
}

function applyPresentationOverride(
  source: QueryErrorSource,
  category: QueryErrorCategory,
  presentation: QueryErrorPresentation,
  overrides?: QueryErrorPresentationOverrides
): QueryErrorPresentation {
  const override = overrides?.[source]?.[category];

  if (!override) {
    return presentation;
  }

  return {
    title: override.title ?? presentation.title,
    message: override.message ?? presentation.message,
  };
}

export function classifyQueryError(
  error: unknown,
  options: ClassifyQueryErrorOptions = {}
): QueryErrorClassification {
  const source = options.source ?? "query";
  const status = getErrorStatus(error);
  const message = error instanceof Error ? error.message : "Unknown error";
  const statusText =
    isErrorWithStatus(error) && typeof error.statusText === "string" ? error.statusText : undefined;
  const errorName =
    isErrorWithStatus(error) && typeof error.name === "string" ? error.name : undefined;

  if (errorName === "AbortError") {
    const presentation = applyPresentationOverride(
      source,
      "cancelled",
      {
        title: "Request cancelled",
        message,
      },
      options.presentationOverrides
    );

    return {
      category: "cancelled",
      actionable: false,
      title: presentation.title,
      message: presentation.message,
      status,
      source,
    };
  }

  if (status === 401 || status === 403) {
    const presentation = applyPresentationOverride(
      source,
      "auth",
      {
        title: "Permission required",
        message: "You do not have permission to perform this action.",
      },
      options.presentationOverrides
    );

    return {
      category: "auth",
      actionable: true,
      title: presentation.title,
      message: presentation.message,
      status,
      source,
    };
  }

  if (status === 404) {
    const presentation = applyPresentationOverride(
      source,
      "not-found",
      {
        title: "Not found",
        message: statusText || message,
      },
      options.presentationOverrides
    );

    return {
      category: "not-found",
      actionable: false,
      title: presentation.title,
      message: presentation.message,
      status,
      source,
    };
  }

  if (status === 400 || status === 422) {
    const presentation = applyPresentationOverride(
      source,
      "validation",
      {
        title: "Invalid request",
        message: statusText || message,
      },
      options.presentationOverrides
    );

    return {
      category: "validation",
      actionable: true,
      title: presentation.title,
      message: presentation.message,
      status,
      source,
    };
  }

  if (typeof status === "number" && status >= 500) {
    const presentation = applyPresentationOverride(
      source,
      "server",
      {
        title: "Server error",
        message: "The server encountered an error. Please try again.",
      },
      options.presentationOverrides
    );

    return {
      category: "server",
      actionable: true,
      title: presentation.title,
      message: presentation.message,
      status,
      source,
    };
  }

  if (error instanceof TypeError) {
    const presentation = applyPresentationOverride(
      source,
      "network",
      {
        title: "Network issue",
        message: "Unable to reach the server. Check your connection and retry.",
      },
      options.presentationOverrides
    );

    return {
      category: "network",
      actionable: true,
      title: presentation.title,
      message: presentation.message,
      status,
      source,
    };
  }

  const presentation = applyPresentationOverride(
    source,
    "unknown",
    {
      title: "Unexpected error",
      message,
    },
    options.presentationOverrides
  );

  return {
    category: "unknown",
    actionable: false,
    title: presentation.title,
    message: presentation.message,
    status,
    source,
  };
}
