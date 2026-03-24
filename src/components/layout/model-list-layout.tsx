import React from "react";
import { Link } from "react-router-dom";
import { Button } from "@afenda/ui";
import { Plus } from "lucide-react";
import { useCan } from "~/bootstrap/permissions-context";
import { PERMISSION_ACTIONS } from "~/stores/business";
import { toTitle } from "~/lib/breadcrumb-utils";

interface ModelListLayoutProps {
  module: string;
  model: string;
  children: React.ReactNode;
}

export function ModelListLayout({ module, model, children }: ModelListLayoutProps) {
  const canCreate = useCan(model, PERMISSION_ACTIONS.WRITE);
  const modelLabel = toTitle(model);

  return (
    <div className="relative">
      {canCreate && (
        <div className="fixed bottom-4 left-4 right-4 z-50 sm:left-auto sm:right-8 sm:bottom-8">
          <Button asChild size="lg" className="w-full shadow-lg sm:w-auto">
            <Link to={`/${module}/${model}/new`}>
              <Plus className="w-5 h-5 mr-2" aria-hidden="true" />
              New {modelLabel}
            </Link>
          </Button>
        </div>
      )}

      {children}
    </div>
  );
}

export default ModelListLayout;
