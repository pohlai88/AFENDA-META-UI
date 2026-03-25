/**
 * 422 - Unprocessable Entity
 */

import React from "react";
import { Link } from "react-router-dom";
import { CircleAlert, Home, Undo2 } from "lucide-react";
import { Button } from "@afenda/ui";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@afenda/ui";

export default function ValidationErrorPage() {
  return (
    <main className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-lg text-center">
        <CardHeader>
          <div className="flex justify-center mb-4">
            <div className="p-4 bg-amber-500/10 rounded-full">
              <CircleAlert className="w-12 h-12 text-amber-600" aria-hidden="true" />
            </div>
          </div>
          <CardTitle className="text-4xl">422</CardTitle>
          <CardDescription className="text-lg">Validation Error</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">
            Some fields contain invalid values. Review your input and submit again.
          </p>
          <div className="flex flex-wrap gap-3 justify-center">
            <Button onClick={() => window.history.back()} variant="outline">
              <Undo2 className="w-4 h-4 mr-2" aria-hidden="true" />
              Go Back To Form
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
