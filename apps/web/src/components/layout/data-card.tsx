import React from "react";
import {
  Badge,
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  Skeleton,
} from "@afenda/ui";
import { cn } from "~/lib/utils";
import { type PermissionAction } from "~/stores/business";
import { usePermissions } from "~/bootstrap/permissions-context";

interface PermissionGatedActionProps {
  children: React.ReactNode;
  resource?: string;
  action?: PermissionAction;
  allowedRoles?: string[];
  fallback?: React.ReactNode;
}

interface DataCardProps {
  title?: React.ReactNode;
  description?: React.ReactNode;
  children: React.ReactNode;
  actions?: React.ReactNode;
  footerActions?: React.ReactNode;
  className?: string;
  loading?: boolean;
  loadingState?: React.ReactNode;
  error?: React.ReactNode;
  errorState?: React.ReactNode;
  empty?: boolean;
  emptyState?: React.ReactNode;
}

function getContentClassName(hasHeader: boolean) {
  return hasHeader ? undefined : "pt-6";
}

function DefaultLoadingState() {
  return (
    <div className="space-y-3" role="status" aria-live="polite" aria-label="Loading content">
      <Skeleton className="h-5 w-1/2" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-4/5" />
    </div>
  );
}

function DefaultErrorState({ error }: { error?: React.ReactNode }) {
  return (
    <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3" role="alert">
      <p className="text-sm font-medium text-destructive">Unable to load this card.</p>
      {error && <div className="mt-1 text-sm text-muted-foreground">{error}</div>}
    </div>
  );
}

function DefaultEmptyState() {
  return (
    <div className="flex items-center justify-center rounded-md border border-dashed p-6">
      <div className="text-center">
        <Badge variant="secondary" className="mb-2">
          Empty
        </Badge>
        <p className="text-sm text-muted-foreground">No records to display.</p>
      </div>
    </div>
  );
}

export function PermissionGatedAction({
  children,
  resource,
  action,
  allowedRoles,
  fallback = null,
}: PermissionGatedActionProps) {
  const { role, hasPermission } = usePermissions();

  const isPermissionGranted = !resource || !action ? true : hasPermission(resource, action);

  const hasRoleAccess = !allowedRoles || (role ? allowedRoles.includes(role) : false);

  if (!isPermissionGranted || !hasRoleAccess) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}

export function DataCard({
  title,
  description,
  children,
  actions,
  footerActions,
  className,
  loading = false,
  loadingState,
  error,
  errorState,
  empty = false,
  emptyState,
}: DataCardProps) {
  const cardId = React.useId();
  const hasHeader = Boolean(title || description || actions);
  const hasError = Boolean(error || errorState);

  const titleId = title ? `${cardId}-title` : undefined;
  const descriptionId = description ? `${cardId}-description` : undefined;

  let content = children;
  if (loading) {
    content = loadingState ?? <DefaultLoadingState />;
  } else if (hasError) {
    content = errorState ?? <DefaultErrorState error={error} />;
  } else if (empty) {
    content = emptyState ?? <DefaultEmptyState />;
  }

  return (
    <Card className={cn(className)}>
      {hasHeader && (
        <CardHeader className="border-b">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1.5">
              {title && <CardTitle id={titleId}>{title}</CardTitle>}
              {description && <CardDescription id={descriptionId}>{description}</CardDescription>}
            </div>
            {actions && (
              <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
                {actions}
              </div>
            )}
          </div>
        </CardHeader>
      )}
      <CardContent
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        className={getContentClassName(hasHeader)}
      >
        {content}
      </CardContent>
      {footerActions && <CardFooter className="justify-end gap-2">{footerActions}</CardFooter>}
    </Card>
  );
}
