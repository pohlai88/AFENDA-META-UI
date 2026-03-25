/**
 * useModelWithMeta hook
 * =====================
 * Combines useModel CRUD operations with RBAC permissions from useMeta.
 *
 * Mutations are gated by the server-resolved CrudPermissions returned in the
 * MetaResponse (`can_create`, `can_update`, `can_delete`). Calling a forbidden
 * mutation throws immediately — before any network request is made — so callers
 * can either guard the UI or catch the error.
 *
 * Example:
 *   const { data, permissions, createRecord } = useModelWithMeta("sales_order");
 *   if (permissions?.can_create) {
 *     await createRecord({ ... });
 *   }
 */

import { useCallback } from "react";
import type { CrudPermissions } from "@afenda/meta-types";
import { useMeta } from "~/hooks/useMeta";
import { useModel, useModelList } from "~/hooks/useModel";
import type { FilterGroup } from "~/hooks/useModel";
import type { UseQueryResult } from "@tanstack/react-query";

// Re-export so consumers can import from one place
export type { FilterGroup };

interface ListOptions {
  page?: number;
  limit?: number;
  orderBy?: string;
  orderDir?: "asc" | "desc";
  filters?: FilterGroup;
}

interface ListResponse<T = Record<string, unknown>> {
  data: T[];
  meta: {
    page: number;
    limit: number;
    total: number;
    filters?: FilterGroup;
    sort?: Array<{ field: string; order: "asc" | "desc" }>;
  };
}

type UseModelWithMetaListResult<T> = UseQueryResult<ListResponse<T>> & {
  permissions: CrudPermissions | undefined;
  isMetaLoading: boolean;
  isReady: boolean;
};

type UseModelWithMetaResult<T> = ReturnType<typeof useModel<T>> & {
  permissions: CrudPermissions | undefined;
  effectiveRole: string | undefined;
  isMetaLoading: boolean;
  isReady: boolean;
};

function buildPermissionError(model: string, operation: "create" | "update" | "delete") {
  return Object.assign(new Error(`${operation} not permitted on "${model}"`), {
    status: 403,
    type: "permission",
  });
}

/**
 * Paginated list with RBAC permissions attached.
 */
export function useModelListWithMeta<T = Record<string, unknown>>(
  model: string,
  options?: ListOptions
): UseModelWithMetaListResult<T> {
  const meta = useMeta(model);
  const list = useModelList<T>(model, options);
  const permissions = meta.data?.permissions;

  return {
    ...list,
    permissions,
    isMetaLoading: meta.isLoading,
    isReady: !meta.isLoading && !!permissions,
  };
}

/**
 * Single record with RBAC-gated CRUD mutations.
 *
 * `createRecord`, `updateRecord`, and `deleteRecord` each check the
 * corresponding `can_*` flag before firing. If permissions haven't loaded yet
 * or the operation is forbidden, an error is thrown synchronously.
 */
export function useModelWithMeta<T = Record<string, unknown>>(
  model: string,
  recordId?: string
): UseModelWithMetaResult<T> {
  const meta = useMeta(model);
  const model$ = useModel<T>(model, recordId);

  const permissions = meta.data?.permissions;

  const createRecord = useCallback(
    (data: T): Promise<T> => {
      if (!permissions) {
        return Promise.reject(new Error(`Permissions for "${model}" not yet loaded`));
      }
      if (!permissions.can_create) {
        return Promise.reject(buildPermissionError(model, "create"));
      }
      return model$.createRecord(data);
    },
    [model, model$.createRecord, permissions]
  );

  const updateRecord = useCallback(
    (id: string, data: Partial<T>): Promise<T> => {
      if (!permissions) {
        return Promise.reject(new Error(`Permissions for "${model}" not yet loaded`));
      }
      if (!permissions.can_update) {
        return Promise.reject(buildPermissionError(model, "update"));
      }
      return model$.updateRecord(id, data);
    },
    [model, model$.updateRecord, permissions]
  );

  const deleteRecord = useCallback(
    (id: string): Promise<T> => {
      if (!permissions) {
        return Promise.reject(new Error(`Permissions for "${model}" not yet loaded`));
      }
      if (!permissions.can_delete) {
        return Promise.reject(buildPermissionError(model, "delete"));
      }
      return model$.deleteRecord(id);
    },
    [model, model$.deleteRecord, permissions]
  );

  return {
    ...model$,
    createRecord,
    updateRecord,
    deleteRecord,
    permissions,
    effectiveRole: meta.data?.effective_role,
    isMetaLoading: meta.isLoading,
    isReady: !meta.isLoading && !!permissions,
  };
}
