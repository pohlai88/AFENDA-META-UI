/**
 * Model List Page
 * ================
 * Displays a list of records for any model using MetaListV2.
 * Route: /:module/:model
 */

import React, { lazy } from "react";
import { useParams } from "react-router-dom";
import { ErrorBoundaryClass } from "~/components/error-boundary";
import { ModelListLayout } from "~/components/layout";

const MetaListV2 = lazy(async () => {
  const module = await import("~/renderers/MetaListV2");
  return { default: module.MetaListV2 };
});

export default function ModelListPage() {
  const { module, model } = useParams<{ module: string; model: string }>();

  if (!module || !model) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        Invalid route: missing module or model parameter
      </div>
    );
  }

  return (
    <ModelListLayout module={module} model={model}>
      <ErrorBoundaryClass>
        <MetaListV2 key={model} model={model} />
      </ErrorBoundaryClass>
    </ModelListLayout>
  );
}
