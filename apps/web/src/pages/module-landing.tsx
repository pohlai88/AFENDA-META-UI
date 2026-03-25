/**
 * Module Landing Page
 * ===================
 * Route: /:module
 *
 * Dedicated landing page per module. Keeps room for module-specific
 * overview widgets and quick links as the app grows.
 */

import React from "react";
import { Link, useParams } from "react-router-dom";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@afenda/ui";
import { ArrowRight } from "lucide-react";
import { PageContainer, PageHeader } from "~/components/layout";
import { toTitle } from "~/lib/breadcrumb-utils";

const moduleShortcuts: Record<string, Array<{ model: string; label: string; note: string }>> = {
  sales: [
    { model: "partner", label: "Partners", note: "Manage customers and suppliers" },
    { model: "sales_order", label: "Sales Orders", note: "Track quotations and orders" },
    { model: "product", label: "Products", note: "Maintain catalog and pricing" },
  ],
};

export default function ModuleLandingPage() {
  const { module } = useParams<{ module: string }>();

  if (!module) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        Invalid route: missing module parameter
      </div>
    );
  }

  const shortcuts = moduleShortcuts[module] ?? [];
  const moduleTitle = toTitle(module);

  return (
    <PageContainer>
      <PageHeader
        title={`${moduleTitle} Module`}
        description={`Module overview and entry points for ${moduleTitle}.`}
      />

      {shortcuts.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {shortcuts.map((shortcut) => (
            <Card key={shortcut.model}>
              <CardHeader>
                <div className="flex items-center justify-between gap-3">
                  <CardTitle>{shortcut.label}</CardTitle>
                  <Badge variant="outline">{shortcut.model}</Badge>
                </div>
                <CardDescription>{shortcut.note}</CardDescription>
              </CardHeader>
              <CardContent>
                <Button asChild className="w-full">
                  <Link to={`/${module}/${shortcut.model}`}>
                    Open List
                    <ArrowRight className="w-4 h-4 ml-2" aria-hidden="true" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Module Ready</CardTitle>
            <CardDescription>
              This module does not have custom shortcuts yet. Open a model route directly, for
              example /{module}/your_model.
            </CardDescription>
          </CardHeader>
        </Card>
      )}
    </PageContainer>
  );
}
