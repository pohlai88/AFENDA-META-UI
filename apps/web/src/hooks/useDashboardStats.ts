import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "~/lib/query-keys";

interface ListMetaResponse {
  meta?: {
    total?: number;
  };
}

export interface DashboardStats {
  partners: number;
  salesOrders: number;
  products: number;
}

async function fetchModelTotal(model: string): Promise<number> {
  const res = await fetch(`/api/${model}?page=1&limit=1`);

  if (!res.ok) {
    throw Object.assign(new Error(`Failed to fetch dashboard stat for ${model}`), {
      status: res.status,
      statusText: res.statusText,
    });
  }

  const payload = (await res.json()) as ListMetaResponse;
  return payload.meta?.total ?? 0;
}

async function safeFetchModelTotal(model: string): Promise<number> {
  try {
    return await fetchModelTotal(model);
  } catch (error) {
    console.warn(`Failed to fetch ${model}, defaulting to 0:`, error);
    return 0;
  }
}

export function useDashboardStats() {
  return useQuery<DashboardStats>({
    queryKey: queryKeys.dashboard.list("home", "stats"),
    queryFn: async () => {
      const [partners, salesOrders, products] = await Promise.all([
        safeFetchModelTotal("partner"),
        safeFetchModelTotal("sales_order"),
        safeFetchModelTotal("product"),
      ]);

      return {
        partners,
        salesOrders,
        products,
      };
    },
    staleTime: 60 * 1000,
    retry: 1,
  });
}
