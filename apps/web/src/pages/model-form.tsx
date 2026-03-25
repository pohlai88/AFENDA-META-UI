/**
 * Model Form Page
 * ================
 * Create or edit a record for any model using MetaFormV2.
 * Routes:
 * - /:module/:model/new (create)
 * - /:module/:model/:id (edit)
 */

import React, { lazy } from "react";
import { useParams, useNavigate } from "react-router-dom";

const MetaFormV2 = lazy(async () => {
  const module = await import("~/renderers/MetaFormV2");
  return { default: module.MetaFormV2 };
});

export default function ModelFormPage() {
  const { module, model, id } = useParams<{ module: string; model: string; id?: string }>();
  const navigate = useNavigate();

  if (!module || !model) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        Invalid route: missing module or model parameter
      </div>
    );
  }

  const handleSaved = () => {
    // Navigate back to list view after successful save
    navigate(`/${module}/${model}`);
  };

  const handleCancel = () => {
    // Navigate back to list view on cancel
    navigate(`/${module}/${model}`);
  };

  return (
    <MetaFormV2
      key={`${model}-${id ?? 'new'}`}
      model={model}
      recordId={id}
      onSaved={handleSaved}
      onCancel={handleCancel}
    />
  );
}
