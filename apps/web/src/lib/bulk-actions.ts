/**
 * Bulk Actions System
 * ====================
 * Generic bulk action framework for MetaListV2.
 * Supports both selected records and query-based selection.
 */

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { MetaListSelectionSnapshot } from "~/renderers/meta-list-selection";

/**
 * Bulk action definition
 */
export interface BulkAction {
  id: string;
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
  requiresPermission?: "update" | "delete" | "create";
  confirmMessage?: string;
  variant?: "default" | "destructive";
  execute: (ids: string[]) => Promise<void>;
}

/**
 * Hook for executing bulk actions
 */
export function useBulkAction(model: string) {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async ({
      action,
      ids,
    }: {
      action: BulkAction;
      ids: string[];
    }) => {
      await action.execute(ids);
    },
    onSuccess: (_, variables) => {
      toast.success(`Bulk action completed: ${variables.action.label}`);
      
      // Invalidate list query to refresh data
      queryClient.invalidateQueries({ queryKey: ["model", model, "list"] });
    },
    onError: (error, variables) => {
      toast.error(`Bulk action failed: ${variables.action.label}`, {
        description: error instanceof Error ? error.message : "Unknown error",
      });
    },
  });

  return mutation;
}

/**
 * Hook for row-based bulk actions (uses selected IDs directly)
 */
export function useRowBulkAction(
  model: string,
  selection: MetaListSelectionSnapshot,
  allRows: Record<string, unknown>[]
) {
  const bulkAction = useBulkAction(model);

  const execute = async (action: BulkAction) => {
    let idsToUpdate: string[] = [];

    if (selection.mode === "query") {
      // Query-based selection: get all matching IDs
      // In a real implementation, this would fetch from API with the filter
      // For now, we'll use all row IDs as approximation
      idsToUpdate = allRows
        .map((row) => String(row.id))
        .filter((id) => id && id !== "undefined");
    } else {
      // Row-based selection: use selected IDs directly
      idsToUpdate = selection.ids;
    }

    if (idsToUpdate.length === 0) {
      toast.warning("No records selected");
      return;
    }

    // Show confirmation if required
    if (action.confirmMessage) {
      const confirmed = window.confirm(
        action.confirmMessage.replace(
          "{count}",
          String(idsToUpdate.length)
        )
      );
      if (!confirmed) {
        return;
      }
    }

    await bulkAction.mutateAsync({ action, ids: idsToUpdate });
  };

  return { execute, isLoading: bulkAction.isPending };
}

/**
 * Create bulk update action
 */
export function createBulkUpdateAction(
  model: string,
  field: string,
  value: unknown,
  label?: string
): BulkAction {
  return {
    id: `update-${field}`,
    label: label || `Set ${field} to ${value}`,
    requiresPermission: "update",
    execute: async (ids: string[]) => {
      // Make API request to update multiple records
      const response = await fetch(`/api/meta/${model}/bulk-update`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ids,
          updates: { [field]: value },
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to update records: ${response.statusText}`);
      }
    },
  };
}

/**
 * Create bulk delete action
 */
export function createBulkDeleteAction(model: string): BulkAction {
  return {
    id: "delete",
    label: "Delete selected",
    requiresPermission: "delete",
    variant: "destructive",
    confirmMessage: "Are you sure you want to delete {count} records? This action cannot be undone.",
    execute: async (ids: string[]) => {
      const response = await fetch(`/api/meta/${model}/bulk-delete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids }),
      });

      if (!response.ok) {
        throw new Error(`Failed to delete records: ${response.statusText}`);
      }
    },
  };
}
