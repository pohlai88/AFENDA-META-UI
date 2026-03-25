/**
 * useActions Hook
 * ===============
 * Manages custom model actions defined in model metadata.
 *
 * Features:
 * - Action discovery from model meta
 * - Action execution with error handling
 * - Toast notifications for feedback
 */

import { useCallback, useMemo, useState } from "react";
import { useMeta } from "./useMeta";
import type { MetaAction } from "@afenda/meta-types";
import { toast } from "sonner";

export interface ActionContext {
  model: string;
  recordId?: string | string[];
  data?: Record<string, unknown>;
}

/**
 * Hook to retrieve and execute model actions
 * @param model - Model name (e.g., "sales.sales_order")
 * @returns { actions, execute, isExecuting, error }
 */
export function useActions(model: string) {
  const { data: metaData, isLoading, error: fetchError } = useMeta(model);
  const [isExecuting, setIsExecuting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Get actions for this model from meta data
  const actions: MetaAction[] = useMemo(() => {
    if (!metaData?.meta?.actions) return [];
    return metaData.meta.actions;
  }, [metaData]);

  /**
   * Execute an action
   * @param actionId - Action identifier
   * @param context - Action context (model, recordId, data)
   */
  const execute = useCallback(
    async (actionId: string, context: ActionContext) => {
      const action = actions.find((a: any) => a.id === actionId);
      if (!action) {
        const msg = `Action '${actionId}' not found`;
        setError(msg);
        toast.error(msg);
        return;
      }

      setIsExecuting(true);
      setError(null);

      try {
        // Build URL with context
        let url = action.url;
        if (context.recordId) {
          const idValue = Array.isArray(context.recordId)
            ? context.recordId.join(",")
            : context.recordId;
          url = url.replace(":id", idValue);
        }

        // Make request
        const options: RequestInit = {
          method: action.method,
          headers: { "Content-Type": "application/json" },
        };

        if (context.data && ["POST", "PUT", "PATCH"].includes(action.method)) {
          options.body = JSON.stringify(context.data);
        }

        const response = await fetch(url, options);

        if (!response.ok) {
          let errorMsg = "Action failed";
          try {
            const errorData = await response.json();
            errorMsg = errorData.error || errorData.message || errorMsg;
          } catch {
            // If response is not JSON, use status text
            errorMsg = response.statusText || errorMsg;
          }
          throw new Error(errorMsg);
        }

        const resultData = await response.json();
        toast.success(`${action.label} completed successfully`);
        return resultData;
      } catch (err: any) {
        const errMsg = err?.message || "Action failed";
        setError(errMsg);
        toast.error(errMsg);
      } finally {
        setIsExecuting(false);
      }
    },
    [actions]
  );

  return { actions, execute, isExecuting, error, isLoading: isLoading || !!fetchError };
}

/**
 * Get icon for action
 */
export function getActionIcon(action: MetaAction): string {
  return action.icon || "zap";
}
