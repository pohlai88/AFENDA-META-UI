/**
 * 401 - Unauthorized
 */

import React from "react";
import { Link } from "react-router-dom";
import { Home, RefreshCw, ShieldX } from "lucide-react";
import { Button } from "@afenda/ui";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@afenda/ui";

export default function UnauthorizedPage() {
  return (
    <main className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-lg text-center">
        <CardHeader>
          <div className="flex justify-center mb-4">
            <div className="p-4 bg-destructive/10 rounded-full">
              <ShieldX className="w-12 h-12 text-destructive" aria-hidden="true" />
            </div>
          </div>
          <CardTitle className="text-4xl">401</CardTitle>
          <CardDescription className="text-lg">Unauthorized</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">
            Your session may be missing or expired. Refresh and try again.
          </p>
          <div className="flex flex-wrap gap-3 justify-center">
            <Button onClick={() => window.location.reload()} variant="outline">
              <RefreshCw className="w-4 h-4 mr-2" aria-hidden="true" />
              Refresh Session
            </Button>
            <Button asChild>
              <Link to="/">
                <Home className="w-4 h-4 mr-2" aria-hidden="true" />
                Go Home
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
