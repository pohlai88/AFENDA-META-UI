import React from "react";
import {
  bootstrapPermissionsFailure,
  bootstrapPermissionsStart,
  bootstrapPermissionsSuccess,
  useAppDispatch,
} from "~/stores/business";
import type { Permission } from "~/stores/business";
import { getAppConfig } from "~/lib/app-config";

export const PERMISSIONS_BOOTSTRAP_RETRY_EVENT = "permissions-bootstrap:retry";

interface PermissionsBootstrapResponse {
  role: string | null;
  permissions: Permission[];
}

interface RawPermissionsBootstrapResponse {
  role?: unknown;
  permissions?: unknown;
}

const appConfig = getAppConfig();

function isPermission(value: unknown): value is Permission {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as { resource?: unknown; actions?: unknown };
  return (
    typeof candidate.resource === "string" &&
    Array.isArray(candidate.actions) &&
    candidate.actions.every((action) => typeof action === "string")
  );
}

function normalizeBootstrapPayload(payload: unknown): PermissionsBootstrapResponse {
  if (!payload || typeof payload !== "object") {
    return { role: null, permissions: [] };
  }

  const raw = payload as RawPermissionsBootstrapResponse;
  return {
    role: typeof raw.role === "string" ? raw.role : null,
    permissions: Array.isArray(raw.permissions) ? raw.permissions.filter(isPermission) : [],
  };
}

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === "AbortError";
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  return "Failed to bootstrap permissions";
}

export function PermissionsBootstrap({ children }: { children: React.ReactNode }) {
  const dispatch = useAppDispatch();

  React.useEffect(() => {
    const controller = new AbortController();
    const { signal } = controller;

    async function bootstrapPermissions() {
      dispatch(bootstrapPermissionsStart());

      try {
        const response = await fetch(appConfig.permissionsBootstrapEndpoint, {
          signal,
        });

        if (!response.ok) {
          throw new Error(`Bootstrap failed: ${response.status} ${response.statusText}`);
        }

        if (signal.aborted) {
          return;
        }

        const payload = normalizeBootstrapPayload(await response.json());

        dispatch(
          bootstrapPermissionsSuccess({
            permissions: payload.permissions,
            role: payload.role,
          })
        );
      } catch (error) {
        if (signal.aborted || isAbortError(error)) {
          return;
        }

        console.error("Permissions bootstrap failed", {
          endpoint: appConfig.permissionsBootstrapEndpoint,
          error,
        });

        dispatch(bootstrapPermissionsFailure(getErrorMessage(error)));
      }
    }

    void bootstrapPermissions();

    function handleRetry() {
      void bootstrapPermissions();
    }

    window.addEventListener(PERMISSIONS_BOOTSTRAP_RETRY_EVENT, handleRetry);

    return () => {
      window.removeEventListener(PERMISSIONS_BOOTSTRAP_RETRY_EVENT, handleRetry);
      controller.abort();
    };
  }, [dispatch]);

  return <>{children}</>;
}