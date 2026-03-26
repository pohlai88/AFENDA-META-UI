import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "@afenda/ui";
import type { MetaAction } from "@afenda/meta-types";
import { queryKeys } from "~/lib/query-keys";

interface UseModelActionOptions {
  model: string;
  recordId: string;
}

/**
 * Generic mutation hook for executing a MetaAction against a specific record.
 *
 * - Replaces `:id` in the action URL with `recordId`.
 * - On success: shows a toast and invalidates the record + list queries.
 * - On error: shows an error toast.
 *
 * Usage (generic):
 *   const mutation = useModelAction({ model: "sales_order", recordId: "42" });
 *   mutation.mutate(action);
 *
 * For domain-specific flows (optimistic updates, Redux dispatch, audit logging),
 * pass an `onAction` callback to `ActionButtons` and keep your own mutation hook.
 */
export function useModelAction({ model, recordId }: UseModelActionOptions) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (action: MetaAction) => {
      const url = action.url.replace(/:id\b/g, recordId);
      const init: RequestInit = {
        method: action.method,
      };

      if (
        action.method === "POST" &&
        action.url === "/api/sales/commissions/generate"
      ) {
        init.headers = { "Content-Type": "application/json" };
        init.body = JSON.stringify({ orderId: recordId });
      }

      const res = await fetch(url, init);

      if (!res.ok) {
        throw Object.assign(new Error(`Action "${action.label}" failed`), {
          status: res.status,
          statusText: res.statusText,
        });
      }

      // Some actions return no body (204 No Content)
      return res.json().catch(() => null) as Promise<unknown>;
    },

    onSuccess: (_data, action) => {
      toast.success(`${action.label} completed`);
      void queryClient.invalidateQueries({
        queryKey: queryKeys.models.detail(model, recordId),
      });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.models.lists(model),
      });
    },

    onError: (error, action) => {
      toast.error(
        `${action.label} failed: ${error instanceof Error ? error.message : "Unexpected error"}`
      );
    },
  });
}
