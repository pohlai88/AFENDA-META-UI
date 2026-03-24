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
};

type UseModelWithMetaResult<T> = ReturnType<typeof useModel<T>> & {
  permissions: CrudPermissions | undefined;
  effectiveRole: string | undefined;
  isMetaLoading: boolean;
};

/**
 * Paginated list with RBAC permissions attached.
 */
export function useModelListWithMeta<T = Record<string, unknown>>(
  model: string,
  options?: ListOptions
): UseModelWithMetaListResult<T> {
  const meta = useMeta(model);
  const list = useModelList<T>(model, options);

  return {
    ...list,
    permissions: meta.data?.permissions,
    isMetaLoading: meta.isLoading,
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
        return Promise.reject(
          Object.assign(new Error(`Create not permitted on "${model}"`), { status: 403 })
        );
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
        return Promise.reject(
          Object.assign(new Error(`Update not permitted on "${model}"`), { status: 403 })
        );
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
        return Promise.reject(
          Object.assign(new Error(`Delete not permitted on "${model}"`), { status: 403 })
        );
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
  };
}
