/**
 * 403 - Forbidden
 */

import React from "react";
import { Link } from "react-router-dom";
import { Home, RefreshCw, ShieldAlert } from "lucide-react";
import { Button } from "@afenda/ui";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@afenda/ui";
import { usePermissions, useRetryBootstrap } from "~/bootstrap/permissions-context";

export default function ForbiddenPage() {
  const retryBootstrap = useRetryBootstrap();
  const { bootstrapStatus, bootstrapError } = usePermissions();
  const isRetryingPermissions = bootstrapStatus === "loading";

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-lg text-center">
        <CardHeader>
          <div className="flex justify-center mb-4">
            <div className="p-4 bg-destructive/10 rounded-full">
              <ShieldAlert className="w-12 h-12 text-destructive" />
            </div>
          </div>
          <CardTitle className="text-4xl">403</CardTitle>
          <CardDescription className="text-lg">
            Access Forbidden
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">
            You don't have permission to access this resource.
            Please contact your administrator if you believe this is an error.
          </p>
          {bootstrapError && (
            <p className="text-sm text-destructive" role="alert" aria-live="polite">
              Permissions bootstrap error: {bootstrapError}
            </p>
          )}
          <div className="flex flex-wrap gap-3 justify-center">
            <Button
              onClick={retryBootstrap}
              variant="outline"
              disabled={isRetryingPermissions}
              aria-busy={isRetryingPermissions}
            >
              <RefreshCw
                className={`w-4 h-4 mr-2 ${isRetryingPermissions ? "animate-spin" : ""}`}
              />
              {isRetryingPermissions ? "Retrying Permissions..." : "Retry Permissions"}
            </Button>
            <Button onClick={() => window.location.reload()} variant="outline">
              <RefreshCw className="w-4 h-4 mr-2" />
              Reload Page
            </Button>
            <Button asChild>
              <Link to="/">
                <Home className="w-4 h-4 mr-2" />
                Go Home
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
