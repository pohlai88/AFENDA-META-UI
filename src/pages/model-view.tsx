/**
 * Model View Page
 * ================
 * Route: /:module/:model/:id/:view
 *
 * For now this shares the record form implementation so dynamic views can be
 * introduced incrementally (kanban, dashboard, timeline, etc.).
 */

import React from "react";
import ModelFormPage from "~/pages/model-form";

export default function ModelViewPage() {
  return <ModelFormPage />;
}
