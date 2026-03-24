import type { QueryClient } from "@tanstack/react-query";
import { queryKeys } from "./query-keys";

export type QueryDomain = keyof typeof queryKeys;

/**
 * Invalidate all cached queries for a top-level query key domain.
 */
export function invalidateDomain(queryClient: QueryClient, domain: QueryDomain) {
  return queryClient.invalidateQueries({
    queryKey: queryKeys[domain]._def,
  });
}
