/**
 * useModules Hook
 * ===============
 *
 * Fetches module definitions and menus from the module registry.
 *
 * Usage:
 * ```tsx
 * const { data: menus, isLoading } = useModules();
 * ```
 */

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "~/lib/query-keys";
import { usePermissions } from "~/bootstrap/permissions-context";

export interface ModuleMenu {
  module: string;
  label: string;
  icon?: string;
  models: Array<{
    name: string;
    label: string;
    icon?: string;
  }>;
}

export interface ModulesResponse {
  menus: ModuleMenu[];
}

export interface AccessibleModulesResult {
  menus: ModuleMenu[];
  isLoading: boolean;
  error: Error | null;
}

/**
 * Fetch module menus from the API
 */
async function fetchModuleMenus(): Promise<ModuleMenu[]> {
  const res = await fetch("/meta/menus");

  if (!res.ok) {
    throw Object.assign(new Error(`Failed to fetch module menus: ${res.statusText}`), {
      status: res.status,
      statusText: res.statusText,
    });
  }

  const data: ModulesResponse = await res.json();
  return data.menus;
}

/**
 * React Query hook for module menus
 */
export function useModules() {
  return useQuery<ModuleMenu[]>({
    queryKey: queryKeys.modules.menus(),
    queryFn: fetchModuleMenus,
    staleTime: 5 * 60 * 1000, // 5 minutes (modules rarely change)
    gcTime: 10 * 60 * 1000, // 10 minutes (garbage collection time)
    retry: 1,
  });
}

/**
 * Convenience wrapper — returns a stable empty array instead of undefined while loading.
 */
export function useModuleMenus() {
  const { data, isLoading, error } = useModules();
  return { menus: data ?? [], isLoading, error };
}

/**
 * Returns only menus where the current user has at least one permission
 * on any of the module's models, using the bootstrapped permissions store.
 */
export function useAccessibleModules(): AccessibleModulesResult {
  const { data: menus, isLoading, error } = useModules();
  const { hasAnyPermission } = usePermissions();

  const accessibleMenus = useMemo(() => {
    if (!menus) return [];
    return menus.filter((menu) => menu.models.some((model) => hasAnyPermission(model.name)));
  }, [hasAnyPermission, menus]);

  return { menus: accessibleMenus, isLoading, error };
}

/**
 * Backward-compatible list-only helper.
 */
export function useAccessibleModulesList(): ModuleMenu[] {
  const { menus } = useAccessibleModules();
  return menus;
}
