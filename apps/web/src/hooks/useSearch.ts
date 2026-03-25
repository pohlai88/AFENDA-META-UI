import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "~/lib/query-keys";

export interface SearchRecord {
  [key: string]: unknown;
}

export function useSearch(model: string, query: string) {
  return useQuery<SearchRecord[]>({
    queryKey: queryKeys.relations.search(model, query),
    queryFn: async () => {
      if (!model || !query) return [];

      try {
        const url = `/api/${model}?limit=20${query ? `&search=${encodeURIComponent(query)}` : ""}`;
        const res = await fetch(url);
        if (!res.ok) throw new Error(`Search failed: ${res.status} ${res.statusText}`);
        const d = (await res.json()) as { data: SearchRecord[] };
        return d.data;
      } catch (error) {
        console.warn(`Search for "${model}" failed, returning empty results:`, error);
        return [];
      }
    },
    enabled: !!model && query.length >= 2,
    staleTime: 30_000,
  });
}
