import React from "react";
import {
  type PermissionAction,
  selectPermissions,
  selectPermissionsAreBootstrapped,
  selectPermissionsBootstrapError,
  selectPermissionsBootstrapStatus,
  selectRole,
  useAppSelector,
} from "~/stores/business";
import type { Permission } from "~/stores/business";
import { PERMISSIONS_BOOTSTRAP_RETRY_EVENT } from "./permissions-bootstrap";

interface PermissionsContextValue {
  role: string | null;
  permissions: Permission[];
  bootstrapStatus: "idle" | "loading" | "ready" | "error";
  bootstrapError: string | null;
  isReady: boolean;
  hasPermission: (resource: string, action: PermissionAction) => boolean;
  hasAnyPermission: (resource: string) => boolean;
  retryBootstrap: () => void;
}

const PermissionsContext = React.createContext<PermissionsContextValue | null>(null);

export function PermissionsProvider({ children }: { children: React.ReactNode }) {
  const permissions = useAppSelector(selectPermissions);
  const role = useAppSelector(selectRole);
  const bootstrapStatus = useAppSelector(selectPermissionsBootstrapStatus);
  const bootstrapError = useAppSelector(selectPermissionsBootstrapError);
  const isReady = useAppSelector(selectPermissionsAreBootstrapped);
  const permissionsMap = React.useMemo(() => {
    const map = new Map<string, Permission>();
    for (const permission of permissions) {
      map.set(permission.resource, permission);
    }

    return map;
  }, [permissions]);

  const hasPermission = React.useCallback(
    (resource: string, action: PermissionAction) => {
      if (role === "admin") {
        return true;
      }

      const permission = permissionsMap.get(resource);
      if (!permission) {
        return false;
      }

      return permission.actions.includes(action);
    },
    [permissionsMap, role]
  );

  const hasAnyPermission = React.useCallback(
    (resource: string) => {
      if (role === "admin") {
        return true;
      }

      return permissionsMap.has(resource);
    },
    [permissionsMap, role]
  );

  const retryBootstrap = React.useCallback(() => {
    if (typeof window === "undefined") {
      return;
    }

    window.dispatchEvent(new Event(PERMISSIONS_BOOTSTRAP_RETRY_EVENT));
  }, []);

  const value = React.useMemo<PermissionsContextValue>(
    () => ({
      role,
      permissions,
      bootstrapStatus,
      bootstrapError,
      isReady,
      hasPermission,
      hasAnyPermission,
      retryBootstrap,
    }),
    [
      role,
      permissions,
      bootstrapStatus,
      bootstrapError,
      isReady,
      hasPermission,
      hasAnyPermission,
      retryBootstrap,
    ]
  );

  return <PermissionsContext.Provider value={value}>{children}</PermissionsContext.Provider>;
}

export function usePermissions(): PermissionsContextValue {
  const context = React.useContext(PermissionsContext);
  if (!context) {
    throw new Error("usePermissions must be used within PermissionsProvider");
  }

  return context;
}

export function useCan(resource: string, action: PermissionAction): boolean {
  const { hasPermission } = usePermissions();

  return React.useMemo(() => hasPermission(resource, action), [action, hasPermission, resource]);
}

export function useRetryBootstrap(): () => void {
  const { retryBootstrap } = usePermissions();

  return retryBootstrap;
}
