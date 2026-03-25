/**
 * useModel hook
 * =============
 * Provides CRUD operations and data fetching for a specific model.
 *
 * Example:
 *   const { data, isLoading } = useModelList("sales_order", { page: 1 });
 *   const { data: record } = useModel("sales_order", recordId);
 *   const { createRecord, updateRecord } = useModel("sales_order");
 */

import { useCallback } from "react";
import { useQuery, useMutation, useQueryClient, type UseQueryResult } from "@tanstack/react-query";
import { queryKeys } from "~/lib/query-keys";

export interface FilterCondition {
  field: string;
  op:
    | "eq"
    | "neq"
    | "gt"
    | "gte"
    | "lt"
    | "lte"
    | "like"
    | "ilike"
    | "in"
    | "between"
    | "is_null"
    | "is_not_null";
  value?: unknown;
}

export interface FilterGroup {
  logic: "and" | "or";
  conditions: FilterCondition[];
}

export interface ListOptions {
  page?: number;
  limit?: number;
  orderBy?: string;
  orderDir?: "asc" | "desc";
  filters?: FilterGroup;
}

export interface ListResponse<T = Record<string, unknown>> {
  data: T[];
  meta: {
    page: number;
    limit: number;
    total: number;
    filters?: FilterGroup;
    sort?: Array<{ field: string; order: "asc" | "desc" }>;
  };
}

type UseModelResult<T = Record<string, unknown>> = UseQueryResult<T> & {
  createRecord: (newData: T) => Promise<T>;
  updateRecord: (id: string, newData: Partial<T>) => Promise<T>;
  deleteRecord: (id: string) => Promise<T>;
  isMutating: boolean;
};

/**
 * Fetch a paginated list of records.
 */
export function buildModelListSearchParams(options?: ListOptions): URLSearchParams {
  const params = new URLSearchParams({
    page: String(options?.page ?? 1),
    limit: String(options?.limit ?? 50),
    ...(options?.orderBy ? { orderBy: options.orderBy, orderDir: options.orderDir ?? "asc" } : {}),
  });

  if (options?.filters && options.filters.conditions.length > 0) {
    params.set("filters", JSON.stringify(options.filters));
  }

  return params;
}

export function useModelList<T = Record<string, unknown>>(
  model: string,
  options?: ListOptions
): UseQueryResult<ListResponse<T>> {
  const params = buildModelListSearchParams(options);

  return useQuery({
    queryKey: queryKeys.models.list(model, options),
    queryFn: async (): Promise<ListResponse<T>> => {
      const res = await fetch(`/api/${model}?${params}`);
      if (!res.ok) {
        throw Object.assign(new Error(`Failed to fetch ${model} list`), {
          status: res.status,
          statusText: res.statusText,
        });
      }
      return (await res.json()) as ListResponse<T>;
    },
    retry: 1,
  });
}

/**
 * Fetch a single record by ID.
 */
export function useModel<T = Record<string, unknown>>(
  model: string,
  recordId?: string
): UseModelResult<T> {
  const queryClient = useQueryClient();
  const detailQueryKey = recordId
    ? queryKeys.models.detail(model, recordId)
    : queryKeys.models.details(model);

  const query = useQuery({
    queryKey: detailQueryKey,
    queryFn: async (): Promise<T> => {
      if (!recordId) return {} as T;
      const res = await fetch(`/api/${model}/${recordId}`);
      if (!res.ok) {
        throw Object.assign(new Error(`Failed to fetch ${model}/${recordId}`), {
          status: res.status,
          statusText: res.statusText,
        });
      }
      return (await res.json()).data as T;
    },
    enabled: !!recordId,
    retry: 1,
  });

  const createMutation = useMutation<T, Error, T>({
    mutationFn: async (data: T) => {
      const res = await fetch(`/api/${model}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        throw Object.assign(new Error("Create failed"), {
          status: res.status,
          statusText: res.statusText,
        });
      }
      return (await res.json()).data as T;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.models.lists(model) });
    },
  });

  const updateMutation = useMutation<
    T,
    Error,
    { id: string; data: Partial<T> },
    { previous: unknown; id: string }
  >({
    mutationFn: async ({ id, data }: { id: string; data: Partial<T> }) => {
      const res = await fetch(`/api/${model}/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        throw Object.assign(new Error("Update failed"), {
          status: res.status,
          statusText: res.statusText,
        });
      }
      return (await res.json()).data as T;
    },
    onMutate: async ({ id, data }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.models.detail(model, id) });
      const previous = queryClient.getQueryData(queryKeys.models.detail(model, id));
      queryClient.setQueryData(queryKeys.models.detail(model, id), (old: T | undefined) => ({
        ...old,
        ...data,
      }));
      return { previous, id };
    },
    onError: (_err, variables, context) => {
      if (context?.previous !== undefined) {
        queryClient.setQueryData(queryKeys.models.detail(model, variables.id), context.previous);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.models.details(model) });
    },
  });

  const deleteMutation = useMutation<T, Error, string>({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/${model}/${id}`, { method: "DELETE" });
      if (!res.ok) {
        throw Object.assign(new Error("Delete failed"), {
          status: res.status,
          statusText: res.statusText,
        });
      }
      return (await res.json()).data as T;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.models.lists(model) });
    },
  });

  // Stable function references to avoid downstream re-renders
  const createRecord = useCallback((data: T) => createMutation.mutateAsync(data), [createMutation]);

  const updateRecord = useCallback(
    (id: string, data: Partial<T>) => updateMutation.mutateAsync({ id, data }),
    [updateMutation]
  );

  const deleteRecord = useCallback(
    (id: string) => deleteMutation.mutateAsync(id),
    [deleteMutation]
  );

  return {
    ...query,
    createRecord,
    updateRecord,
    deleteRecord,
    isMutating: createMutation.isPending || updateMutation.isPending || deleteMutation.isPending,
  };
}
