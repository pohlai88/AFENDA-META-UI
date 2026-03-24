/**
 * 409 - Conflict
 */

import React from "react";
import { Link } from "react-router-dom";
import { AlertTriangle, Home, RefreshCw } from "lucide-react";
import { Button } from "@afenda/ui";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@afenda/ui";

export default function ConflictPage() {
  return (
    <main className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-lg text-center">
        <CardHeader>
          <div className="flex justify-center mb-4">
            <div className="p-4 bg-amber-500/10 rounded-full">
              <AlertTriangle className="w-12 h-12 text-amber-600" aria-hidden="true" />
            </div>
          </div>
          <CardTitle className="text-4xl">409</CardTitle>
          <CardDescription className="text-lg">Data Conflict</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">
            This data was changed by another action. Refresh and review the latest values.
          </p>
          <div className="flex flex-wrap gap-3 justify-center">
            <Button onClick={() => window.location.reload()} variant="outline">
              <RefreshCw className="w-4 h-4 mr-2" aria-hidden="true" />
              Refresh Data
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
