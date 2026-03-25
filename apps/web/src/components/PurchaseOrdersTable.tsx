import React from "react";
import { Link } from "react-router-dom";
import { Badge, Button } from "@afenda/ui";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import { usePurchaseOrderActions } from "~/hooks/usePurchaseOrderActions";
import { usePurchaseOrdersData } from "~/hooks/usePurchaseOrders";
import type { PurchaseOrder } from "~/api/purchase-orders";

function getStatusVariant(status: PurchaseOrder["status"]) {
  if (status === "approved") return "default";
  if (status === "submitted") return "secondary";
  if (status === "rejected") return "destructive";
  return "outline";
}

function formatError(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return "Failed to load purchase orders.";
}

interface RowActionButtonsProps {
  orderId: string;
  status: PurchaseOrder["status"];
}

function RowActionButtons({ orderId, status }: RowActionButtonsProps) {
  const { submit, approve, reject } = usePurchaseOrderActions();

  const submitPending = submit.isPending && submit.variables === orderId;
  const approvePending = approve.isPending && approve.variables === orderId;
  const rejectPending = reject.isPending && reject.variables === orderId;
  const isAnyPending = submitPending || approvePending || rejectPending;

  if (status === "approved" || status === "rejected") {
    return <span className="text-xs text-muted-foreground">No actions</span>;
  }

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {status === "draft" ? (
        <Button size="sm" onClick={() => void submit.mutateAsync(orderId)} disabled={isAnyPending}>
          {submitPending ? "Submitting..." : "Submit"}
        </Button>
      ) : null}

      {status === "submitted" ? (
        <>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => void approve.mutateAsync(orderId)}
            disabled={isAnyPending}
          >
            {approvePending ? "Approving..." : "Approve"}
          </Button>
          <Button
            size="sm"
            variant="destructive"
            onClick={() => void reject.mutateAsync(orderId)}
            disabled={isAnyPending}
          >
            {rejectPending ? "Rejecting..." : "Reject"}
          </Button>
        </>
      ) : null}
    </div>
  );
}

export function PurchaseOrdersTable() {
  const { orders, isLoading, error } = usePurchaseOrdersData();

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">Loading purchase orders...</p>;
  }

  if (error) {
    return <p className="text-sm text-destructive">{formatError(error)}</p>;
  }

  if (!orders.length) {
    return <p className="text-sm text-muted-foreground">No purchase orders found.</p>;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>ID</TableHead>
          <TableHead>Supplier</TableHead>
          <TableHead>Buyer</TableHead>
          <TableHead>Due Date</TableHead>
          <TableHead className="text-right">Total</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Actions</TableHead>
          <TableHead>View</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {orders.map((order) => (
          <TableRow key={order.id}>
            <TableCell className="font-medium">{order.id}</TableCell>
            <TableCell>{order.supplier}</TableCell>
            <TableCell>{order.buyer}</TableCell>
            <TableCell>{new Date(order.dueDate).toLocaleDateString()}</TableCell>
            <TableCell className="text-right">${order.total.toLocaleString()}</TableCell>
            <TableCell>
              <Badge variant={getStatusVariant(order.status)}>{order.status}</Badge>
            </TableCell>
            <TableCell>
              <RowActionButtons orderId={order.id} status={order.status} />
            </TableCell>
            <TableCell>
              <Button asChild variant="outline" size="sm">
                <Link to={`/sales/purchase_order/${order.id}`}>View</Link>
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
