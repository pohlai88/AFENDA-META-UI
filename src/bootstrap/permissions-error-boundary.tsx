import React from "react";
import { ErrorCard } from "~/components/error-card";
import { usePermissions, useRetryBootstrap } from "./permissions-context";

interface PermissionsErrorBoundaryProps {
  children: React.ReactNode;
}

export function PermissionsErrorBoundary({ children }: PermissionsErrorBoundaryProps) {
  const { bootstrapError, bootstrapStatus } = usePermissions();
  const retryBootstrap = useRetryBootstrap();

  if (bootstrapStatus === "error") {
    return (
      <ErrorCard
        title="Permissions Error"
        description="Failed to load permissions. Please try again."
        message={bootstrapError ?? undefined}
        showRetry
        onRetry={retryBootstrap}
      />
    );
  }

  return <>{children}</>;
}
