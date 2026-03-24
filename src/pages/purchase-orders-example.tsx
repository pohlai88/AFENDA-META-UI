import React from "react";
import { Link } from "react-router-dom";
import { Badge, Button } from "@afenda/ui";
import { DataCard, PageContainer, PageHeader, PageShell } from "~/components/layout";
import { PERMISSION_ACTIONS } from "~/stores/business";
import { useCan, usePermissions } from "~/bootstrap/permissions-context";
import { usePurchaseOrderActions } from "~/hooks/usePurchaseOrderActions";
import { usePurchaseOrders } from "~/hooks/usePurchaseOrders";
import type { PurchaseOrder } from "~/api/purchase-orders";

function getStatusVariant(status: PurchaseOrder["status"]) {
  if (status === "approved") {
    return "default";
  }
  if (status === "submitted") {
    return "secondary";
  }
  if (status === "rejected") {
    return "destructive";
  }
  return "outline";
}

export default function PurchaseOrdersExamplePage() {
  const { data: purchaseOrders = [], isLoading, error } = usePurchaseOrders();
  const { submit, approve, reject } = usePurchaseOrderActions();
  const { role } = usePermissions();
  const canReadSales = useCan("sales", PERMISSION_ACTIONS.READ);
  const canWriteSales = useCan("sales", PERMISSION_ACTIONS.WRITE);
  const canDeleteSales = useCan("sales", PERMISSION_ACTIONS.DELETE);

  const submitPendingId = submit.isPending ? submit.variables : undefined;
  const approvePendingId = approve.isPending ? approve.variables : undefined;
  const rejectPendingId = reject.isPending ? reject.variables : undefined;
  const isClerkOrHigher = Boolean(role && ["admin", "manager", "clerk"].includes(role));
  const isManagerOrHigher = Boolean(role && ["admin", "manager"].includes(role));
  const canViewOrder = canReadSales && isClerkOrHigher;
  const canSubmitOrder = canWriteSales && isClerkOrHigher;
  const canApproveOrder = canWriteSales && isManagerOrHigher;
  const canRejectOrder = canDeleteSales && isManagerOrHigher;

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
          title="Purchase Orders"
          description="Live data with mutation-driven workflow actions"
          loading={isLoading}
          error={error instanceof Error ? error.message : undefined}
          empty={!isLoading && !error && purchaseOrders.length === 0}
          className="md:col-span-2 xl:col-span-3"
        >
          <p className="text-sm text-muted-foreground">
            No purchase orders returned by the API.
          </p>
        </DataCard>

        {purchaseOrders.map((order) => (
          <DataCard
            key={order.id}
            title={order.id}
            description={
              <span className="inline-flex items-center gap-2">
                <span>{order.supplier}</span>
                <Badge variant={getStatusVariant(order.status)}>{order.status}</Badge>
              </span>
            }
            actions={
              canViewOrder ? (
                <Button asChild variant="outline" size="sm">
                  <Link to={`/sales/purchase_order/${order.id}`}>View</Link>
                </Button>
              ) : null
            }
            footerActions={
              <>
                {canSubmitOrder && order.status === "draft" && (
                  <Button
                    size="sm"
                    onClick={() => submit.mutate(order.id)}
                    disabled={submit.isPending}
                  >
                    {submitPendingId === order.id ? "Submitting..." : "Submit"}
                  </Button>
                )}

                {canApproveOrder && order.status === "submitted" && (
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => approve.mutate(order.id)}
                    disabled={approve.isPending}
                  >
                    {approvePendingId === order.id ? "Approving..." : "Approve"}
                  </Button>
                )}

                {canRejectOrder && order.status === "submitted" && (
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => reject.mutate(order.id)}
                    disabled={reject.isPending}
                  >
                    {rejectPendingId === order.id ? "Rejecting..." : "Reject"}
                  </Button>
                )}
              </>
            }
          >
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Buyer: {order.buyer}</p>
              <p className="text-sm text-muted-foreground">
                Due date: {new Date(order.dueDate).toLocaleDateString()}
              </p>
              <p className="text-sm font-medium">Total: ${order.total.toLocaleString()}</p>
            </div>
          </DataCard>
        ))}
      </div>
    </PageContainer>
    </PageShell>
  );
}
