import React from "react";
import { DataCard, PageContainer, PageHeader, PageShell } from "~/components/layout";
import { PurchaseOrdersTable } from "~/components/PurchaseOrdersTable";

export default function PurchaseOrdersExamplePage() {
  return (
    <PageShell
      variant="neutral"
      header={
        <div className="container mx-auto px-4 py-4 md:px-6 lg:px-8">
          <PageHeader
            title="Purchase Orders"
            description="ERP-scale DataCard composition with role-gated workflow actions"
          />
        </div>
      }
    >
      <PageContainer>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <DataCard
          title="Purchase Orders Table"
          description="Live data with query + mutation-driven workflow actions"
          className="md:col-span-2 xl:col-span-3"
        >
          <PurchaseOrdersTable />
        </DataCard>
      </div>
    </PageContainer>
    </PageShell>
  );
}
