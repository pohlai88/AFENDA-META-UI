import {
  MutationCache,
  QueryCache,
  QueryClient,
  type QueryClientConfig,
} from "@tanstack/react-query";
import { useNotificationStore } from "~/stores/ui";
import {
  classifyQueryError,
  type QueryErrorClassification,
} from "./query-error-classifier";
import {
  getQueryErrorPresentationOverrides,
  registerQueryErrorPresentationOverrides,
} from "./query-error-overrides-registry";

const PROD_QUERY_STALE_TIME_MS = 5 * 60 * 1000;
const DEV_QUERY_STALE_TIME_MS = 0;
const QUERY_GC_TIME_MS = 10 * 60 * 1000;
const PROD_QUERY_RETRY_COUNT = 1;
const DEV_QUERY_RETRY_COUNT = 0;

interface QueryClientRuntimeEnv {
  DEV?: boolean;
}

function getDefaultRuntimeEnv(): QueryClientRuntimeEnv {
  if (typeof import.meta !== "undefined" && import.meta.env) {
    return import.meta.env;
  }

  return {};
}

function maybeSurfaceActionableError(classification: QueryErrorClassification) {
  if (!classification.actionable) {
    return;
  }

  useNotificationStore.getState().addNotification({
    type: classification.category === "validation" ? "warning" : "error",
    title: classification.title,
    message: classification.message,
  });
}

function logQueryError(error: unknown) {
  const classification = classifyQueryError(error, {
    source: "query",
    presentationOverrides: getQueryErrorPresentationOverrides(),
  });
  console.error("[QueryClient] Query error", { classification, error });
  maybeSurfaceActionableError(classification);
}

function logMutationError(error: unknown) {
  const classification = classifyQueryError(error, {
    source: "mutation",
    presentationOverrides: getQueryErrorPresentationOverrides(),
  });
  console.error("[QueryClient] Mutation error", { classification, error });
  maybeSurfaceActionableError(classification);
}

export { registerQueryErrorPresentationOverrides };

export function getQueryClientConfig(
  env: QueryClientRuntimeEnv = getDefaultRuntimeEnv()
): QueryClientConfig {
  const isDev = Boolean(env.DEV);

  return {
    queryCache: new QueryCache({
      onError: logQueryError,
    }),
    mutationCache: new MutationCache({
      onError: logMutationError,
    }),
    defaultOptions: {
      queries: {
        staleTime: isDev ? DEV_QUERY_STALE_TIME_MS : PROD_QUERY_STALE_TIME_MS,
        gcTime: QUERY_GC_TIME_MS,
        retry: isDev ? DEV_QUERY_RETRY_COUNT : PROD_QUERY_RETRY_COUNT,
        refetchOnWindowFocus: false,
        refetchOnReconnect: true,
        refetchOnMount: true,
      },
      mutations: {
        retry: 0,
      },
    },
  };
}

export function createAppQueryClient(env?: QueryClientRuntimeEnv) {
  return new QueryClient(getQueryClientConfig(env));
}

/**
 * Query Client Configuration
 * ===========================
 * Enterprise-grade defaults for React Query.
 * 
 * Key decisions:
 * - staleTime: prod=5min, dev=0 (surface stale-state bugs faster in local runs)
 * - refetchOnWindowFocus: false (avoid unexpected UI updates mid-use)
 * - refetchOnReconnect: true (ensure fresh data after offline period)
 * - retry: prod=1, dev=0 (fast feedback in development)
 * - global error logging via QueryCache/MutationCache onError handlers
 */
export const queryClient = new QueryClient({
  ...getQueryClientConfig(),
});
