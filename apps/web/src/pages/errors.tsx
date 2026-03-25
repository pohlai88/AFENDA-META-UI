/**
 * Error Catalog
 */

import React from "react";
import { Link } from "react-router-dom";
import { Badge, Button } from "@afenda/ui";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@afenda/ui";

const erpErrorCatalog = [
  { code: 401, title: "Unauthorized", path: "/errors/401", note: "Session missing or expired" },
  { code: 403, title: "Forbidden", path: "/errors/403", note: "Permission denied" },
  { code: 404, title: "Not Found", path: "/404", note: "Resource or route missing" },
  { code: 408, title: "Request Timeout", path: "/errors/408", note: "Long-running request timed out" },
  { code: 409, title: "Conflict", path: "/errors/409", note: "Concurrent update conflict" },
  { code: 422, title: "Validation Error", path: "/errors/422", note: "Invalid payload or business rules" },
  { code: 429, title: "Too Many Requests", path: "/errors/429", note: "Rate limit reached" },
  { code: 500, title: "Server Error", path: "/errors/500", note: "Unhandled application exception" },
  { code: 503, title: "Service Unavailable", path: "/errors/503", note: "Maintenance or dependency outage" },
] as const;

const erpErrorActionMatrix = [
  { code: 401, action: "Refresh session and re-authenticate", owner: "User / Auth" },
  { code: 403, action: "Retry permissions bootstrap or request access", owner: "User / Admin" },
  { code: 404, action: "Verify route or resource identifier", owner: "User" },
  { code: 408, action: "Retry request and check network latency", owner: "User / Network" },
  { code: 409, action: "Refresh record and resolve data conflict", owner: "User / Business" },
  { code: 422, action: "Correct invalid fields and resubmit", owner: "User" },
  { code: 429, action: "Back off and retry after cooldown", owner: "User / Platform" },
  { code: 500, action: "Capture context and escalate to engineering", owner: "Engineering" },
  { code: 503, action: "Wait for service recovery and retry", owner: "Platform / Ops" },
] as const;

export default function ErrorCatalogPage() {
  return (
    <main className="min-h-screen bg-background p-4 sm:p-8">
      <div className="mx-auto max-w-4xl space-y-6">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">ERP Error Catalog</h1>
          <p className="text-muted-foreground">
            Standard error routes for operational, security, and data-validation scenarios.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {erpErrorCatalog.map((item) => (
            <Card key={item.code}>
              <CardHeader className="space-y-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">{item.title}</CardTitle>
                  <Badge variant="secondary">{item.code}</Badge>
                </div>
                <CardDescription>{item.note}</CardDescription>
              </CardHeader>
              <CardContent>
                <Button asChild size="sm">
                  <Link to={item.path}>Open {item.code} Page</Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-xl">Recommended Action Matrix</CardTitle>
            <CardDescription>
              Quick operational guidance for support, QA, and on-call workflows.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="py-2 pr-4 font-medium">Code</th>
                    <th className="py-2 pr-4 font-medium">Recommended Action</th>
                    <th className="py-2 font-medium">Primary Owner</th>
                  </tr>
                </thead>
                <tbody>
                  {erpErrorActionMatrix.map((row) => (
                    <tr key={row.code} className="border-b last:border-0">
                      <td className="py-2 pr-4">
                        <Badge variant="outline">{row.code}</Badge>
                      </td>
                      <td className="py-2 pr-4 text-muted-foreground">{row.action}</td>
                      <td className="py-2 text-muted-foreground">{row.owner}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
