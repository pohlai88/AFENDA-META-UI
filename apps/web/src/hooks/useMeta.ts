/**
 * useMeta hook
 * =============
 * Fetches the RBAC-filtered ModelMeta for a given model from /meta/:model.
 *
 * Returns:
 *   data: MetaResponse (meta schema + permissions + effective_role)
 *   isLoading, error
 */

import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import type { MetaResponse } from "@afenda/meta-types";
import { queryKeys } from "~/lib/query-keys";

export function useMeta(model: string, options?: { skip?: boolean }): UseQueryResult<MetaResponse> {
  return useQuery({
    queryKey: queryKeys.meta.byModel(model),
    queryFn: async (): Promise<MetaResponse> => {
      const res = await fetch(`/meta/${model}`);
      if (!res.ok) {
        throw Object.assign(new Error(`Failed to fetch model schema for "${model}"`), {
          status: res.status,
          statusText: res.statusText,
        });
      }
      return (await res.json()) as MetaResponse;
    },
    enabled: !options?.skip,
    staleTime: 5 * 60 * 1000, // 5 min — schemas don't change frequently
    retry: 1,
  });
}
