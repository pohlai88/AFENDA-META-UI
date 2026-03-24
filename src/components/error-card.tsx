import React from "react";
import { Link } from "react-router-dom";
import { AlertTriangle, Home, RefreshCw } from "lucide-react";
import { Button } from "@afenda/ui";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@afenda/ui";
import { getAppConfig } from "~/lib/app-config";

interface ErrorCardProps {
  title: React.ReactNode;
  description?: React.ReactNode;
  statusCode?: number;
  message?: string;
  stack?: string;
  stackTrace?: string;
  rawErrorDetails?: unknown;
  details?: React.ReactNode;
  showRetry?: boolean;
  onRetry?: () => void;
  showHomeAction?: boolean;
  homeLabel?: string;
  headline?: React.ReactNode;
  primaryAction?: React.ReactNode;
  secondaryAction?: React.ReactNode;
  actions?: React.ReactNode;
}

const appConfig = getAppConfig();

export function ErrorCard({
  title,
  description,
  statusCode,
  message,
  stack,
  stackTrace,
  rawErrorDetails,
  details,
  showRetry = false,
  onRetry,
  showHomeAction = true,
  homeLabel = "Go Home",
  headline,
  primaryAction,
  secondaryAction,
  actions,
}: ErrorCardProps) {
  const titleText = statusCode ? `Error ${statusCode}` : title;
  const resolvedStackTrace = stackTrace ?? stack;
  const builtInDetails = message ? (
    <div className="space-y-2 p-3 bg-muted rounded-md">
      <p className="text-sm font-mono text-muted-foreground">{message}</p>
      {appConfig.isDev && resolvedStackTrace ? (
        <pre className="max-h-40 overflow-auto text-xs text-muted-foreground whitespace-pre-wrap">
          {resolvedStackTrace}
        </pre>
      ) : null}
    </div>
  ) : null;

  const devRawDetails =
    appConfig.isDev && rawErrorDetails !== undefined ? (
      <div className="space-y-1 p-3 bg-muted rounded-md overflow-auto max-h-48">
        <p className="text-xs font-medium text-muted-foreground">Debug details</p>
        <pre className="text-xs font-mono text-muted-foreground whitespace-pre-wrap">
          {typeof rawErrorDetails === "string"
            ? rawErrorDetails
            : JSON.stringify(rawErrorDetails, null, 2)}
        </pre>
      </div>
    ) : null;

  const resolvedPrimaryAction =
    primaryAction ??
    (showRetry && onRetry ? (
      <Button onClick={onRetry} className="flex-1">
        <RefreshCw className="w-4 h-4 mr-2" />
        Try Again
      </Button>
    ) : undefined);

  const resolvedSecondaryAction =
    secondaryAction ??
    (showHomeAction ? (
      <Button variant="outline" asChild className="flex-1">
        <Link to="/">
          <Home className="w-4 h-4 mr-2" />
          {homeLabel}
        </Link>
      </Button>
    ) : undefined);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-lg">
        <CardHeader>
          {headline ? (
            headline
          ) : (
            <div className="flex items-center gap-3">
              <div className="p-2 bg-destructive/10 rounded-lg">
                <AlertTriangle className="w-6 h-6 text-destructive" />
              </div>
              <div>
                <CardTitle>{titleText}</CardTitle>
                {description ? <CardDescription>{description}</CardDescription> : null}
              </div>
            </div>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          {builtInDetails}
          {devRawDetails}
          {details}
          {actions !== undefined ? (
            <div className="flex gap-3">{actions}</div>
          ) : (resolvedPrimaryAction || resolvedSecondaryAction) ? (
            <div className="flex gap-3">
              {resolvedPrimaryAction}
              {resolvedSecondaryAction}
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
