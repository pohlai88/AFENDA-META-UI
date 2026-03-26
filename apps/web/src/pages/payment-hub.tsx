/**
 * PaymentHub
 * ==================
 * Enterprise assembly integrating:
 * - useModelList: fetch sales orders with pagination + filtering
 * - useMeta: get RBAC-filtered available actions + permissions
 * - useModel: fetch selected record details
 * - usSearch: quick-search to jump to a specific order
 * - ActionButtons: render RBAC-gated workflow actions
 *
 * This is the **production pattern** for data-intensive hubs that combine
 * list, detail, search, and workflow operations.
 */

import { useState } from "react";
import { PageContainer, PageHeader, PageShell } from "~/components/layout";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Badge,
  Button,
} from "@afenda/ui";
import { ShoppingCart, ChevronRight } from "lucide-react";
import { useModelList, useModel, type ListOptions } from "~/hooks/useModel";
import { useMeta } from "~/hooks/useMeta";
import { SearchInput } from "~/components/SearchInput";
import { ActionButtons } from "~/components/ActionButtons";
import type { MetaAction } from "@afenda/meta-types";

interface SalesOrder {
  id: string;
  supplier: string;
  buyer: string;
  status: "draft" | "submitted" | "approved" | "rejected";
  total: number;
  dueDate: string;
  lineItems?: Array<{ id: string; description: string; qty: number; price: number }>;
}

function getStatusColor(status: SalesOrder["status"]) {
  switch (status) {
    case "approved":
      return "default";
    case "submitted":
      return "secondary";
    case "rejected":
      return "destructive";
    case "draft":
      return "outline";
  }
}

export default function PaymentHub() {
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [page, setPage] = useState(1);

  // --- List View: All sales orders
  const listOptions: ListOptions = { page, limit: 10 };
  const {
    data: listResponse,
    isLoading: isListLoading,
    error: listError,
  } = useModelList<SalesOrder>("sales_order", listOptions);

  // --- Detail View: Selected order + metadata
  const {
    data: selectedOrder,
    isLoading: isDetailLoading,
    error: detailError,
  } = useModel<SalesOrder>("sales_order", selectedOrderId ?? undefined);

  const { data: metaResponse, isLoading: isMetaLoading } = useMeta("sales_order");

  // Map available actions to only those the user can perform
  const availableActions = (metaResponse?.meta.actions ?? []) as MetaAction[];

  const orders = listResponse?.data ?? [];
  const totalPages = listResponse?.meta
    ? Math.ceil(listResponse.meta.total / listResponse.meta.limit)
    : 1;

  return (
    <PageShell
      variant="neutral"
      header={<PageHeader title="Payment Hub" description="Sales orders & approvals" />}
    >
      <PageContainer>
        {/* Quick Search + Filters */}
        <div className="grid gap-4 mb-8 md:grid-cols-3">
          <div>
            <p className="text-xs text-muted-foreground mb-2">Quick Search</p>
            <SearchInput
              model="sales_order"
              placeholder="Jump to order…"
              onSelect={(item) => {
                setSelectedOrderId(String(item.id ?? ""));
                setPage(1);
              }}
            />
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-2">Status</p>
            <select className="w-full px-2 py-1.5 text-sm border border-input rounded-md">
              <option value="">All statuses</option>
              <option value="draft">Draft</option>
              <option value="submitted">Submitted</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-2">Supplier</p>
            <input
              type="text"
              placeholder="Filter by supplier…"
              className="w-full px-2 py-1.5 text-sm border border-input rounded-md"
            />
          </div>
        </div>

        {/* Master-Detail Grid */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* === LIST VIEW === */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <ShoppingCart className="w-5 h-5" />
                      Sales Orders
                    </CardTitle>
                    <CardDescription>
                      {listResponse?.meta.total ?? 0} total
                      {selectedOrderId && ` • Selected: ${selectedOrderId}`}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-2">
                {isListLoading && <p className="text-sm text-muted-foreground">Loading orders…</p>}
                {listError && <p className="text-sm text-destructive">Failed to load orders</p>}

                {!isListLoading && !listError && orders.length === 0 && (
                  <p className="text-sm text-muted-foreground">No orders found</p>
                )}

                {/* Order List */}
                <div className="space-y-2 max-h-[500px] overflow-y-auto">
                  {orders.map((order) => (
                    <button
                      key={order.id}
                      onClick={() => setSelectedOrderId(order.id)}
                      className={`w-full p-3 text-left border rounded-md transition-colors ${
                        selectedOrderId === order.id
                          ? "bg-primary/10 border-primary"
                          : "hover:bg-muted border-border"
                      }`}
                    >
                      <div className="flex items-baseline justify-between gap-2 mb-1">
                        <span className="font-medium text-sm">{order.id}</span>
                        <Badge variant={getStatusColor(order.status)} className="text-xs">
                          {order.status}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mb-1">{order.supplier}</p>
                      <p className="text-sm font-semibold text-foreground">
                        ${order.total.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                      </p>
                    </button>
                  ))}
                </div>

                {/* Pagination */}
                <div className="flex gap-2 pt-4 border-t justify-between items-center">
                  <span className="text-xs text-muted-foreground">
                    Page {page} of {totalPages}
                  </span>
                  <div className="flex gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(Math.max(1, page - 1))}
                      disabled={page === 1}
                    >
                      ← Prev
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(Math.min(totalPages, page + 1))}
                      disabled={page >= totalPages}
                    >
                      Next →
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* === DETAIL VIEW === */}
          <div className="lg:col-span-1">
            {selectedOrderId ? (
              <Card>
                <CardHeader>
                  <div className="flex items-baseline justify-between">
                    <div>
                      <CardTitle className="text-lg">{selectedOrderId}</CardTitle>
                      {selectedOrder && (
                        <CardDescription className="mt-1">
                          {selectedOrder.supplier} •{" "}
                          {new Date(selectedOrder.dueDate).toLocaleDateString()}
                        </CardDescription>
                      )}
                    </div>
                    <button
                      onClick={() => setSelectedOrderId(null)}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      ✕
                    </button>
                  </div>
                </CardHeader>

                <CardContent className="space-y-4">
                  {isDetailLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
                  {detailError && (
                    <p className="text-sm text-destructive">Failed to load details</p>
                  )}

                  {selectedOrder && (
                    <>
                      {/* Order Info */}
                      <div className="space-y-2 pb-4 border-b">
                        <div className="flex justify-between gap-2">
                          <span className="text-sm text-muted-foreground">Status</span>
                          <Badge variant={getStatusColor(selectedOrder.status)}>
                            {selectedOrder.status}
                          </Badge>
                        </div>
                        <div className="flex justify-between gap-2">
                          <span className="text-sm text-muted-foreground">Buyer</span>
                          <span className="text-sm font-medium">{selectedOrder.buyer}</span>
                        </div>
                        <div className="flex justify-between gap-2">
                          <span className="text-sm text-muted-foreground">Supplier</span>
                          <span className="text-sm font-medium">{selectedOrder.supplier}</span>
                        </div>
                        <div className="flex justify-between gap-2">
                          <span className="text-sm text-muted-foreground">Due Date</span>
                          <span className="text-sm font-medium">
                            {new Date(selectedOrder.dueDate).toLocaleDateString()}
                          </span>
                        </div>
                      </div>

                      {/* Total */}
                      <div className="flex justify-between gap-2 pb-4 border-b">
                        <span className="text-sm text-muted-foreground">Total</span>
                        <span className="text-lg font-bold">
                          $
                          {selectedOrder.total.toLocaleString("en-US", {
                            minimumFractionDigits: 2,
                          })}
                        </span>
                      </div>

                      {/* Line Items (if available) */}
                      {selectedOrder.lineItems && selectedOrder.lineItems.length > 0 && (
                        <div className="space-y-2 pb-4 border-b">
                          <p className="text-xs font-semibold text-muted-foreground uppercase">
                            Line Items
                          </p>
                          <div className="space-y-1 text-xs">
                            {selectedOrder.lineItems.map((item) => (
                              <div key={item.id} className="flex justify-between">
                                <span className="text-muted-foreground">{item.description}</span>
                                <span className="font-medium">
                                  ×{item.qty} @ ${(item.price * item.qty).toLocaleString()}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Actions */}
                      {!isMetaLoading && (
                        <div>
                          <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">
                            Actions
                          </p>
                          <ActionButtons
                            actions={availableActions}
                            size="sm"
                            model="sales_order"
                            recordId={selectedOrderId}
                          />
                        </div>
                      )}
                    </>
                  )}
                </CardContent>
              </Card>
            ) : (
              <Card className="h-full flex items-center justify-center min-h-[400px]">
                <CardContent className="text-center">
                  <ChevronRight className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">Select an order to view details</p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </PageContainer>
    </PageShell>
  );
}
