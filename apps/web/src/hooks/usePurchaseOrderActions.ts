import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "@afenda/ui";
import { emitAuditLog } from "~/api/audit-log";
import {
  type PurchaseOrder,
  type PurchaseOrderStatus,
  approvePurchaseOrder,
  rejectPurchaseOrder,
  submitPurchaseOrder,
} from "~/api/purchase-orders";
import { queryKeys } from "~/lib/query-keys";
import { useAppDispatch } from "~/stores/business/hooks";
import {
  purchaseOrderApproved,
  purchaseOrderApproveFailed,
  purchaseOrderRejected,
  purchaseOrderRejectFailed,
  purchaseOrderSubmitFailed,
  purchaseOrderSubmitted,
} from "~/stores/business/slices/erp-actions";

interface MutationContext {
  previousOrders?: PurchaseOrder[];
}

export function usePurchaseOrderActions() {
  const queryClient = useQueryClient();
  const dispatch = useAppDispatch();

  function stringifyError(error: unknown) {
    if (error instanceof Error && error.message) {
      return error.message;
    }

    return "Unexpected error";
  }

  async function applyOptimisticStatus(
    id: string,
    status: PurchaseOrderStatus
  ): Promise<MutationContext> {
    await queryClient.cancelQueries({ queryKey: queryKeys.purchaseOrders.list() });

    const previousOrders = queryClient.getQueryData<PurchaseOrder[]>(
      queryKeys.purchaseOrders.list()
    );

    queryClient.setQueryData<PurchaseOrder[]>(queryKeys.purchaseOrders.list(), (current) => {
      if (!current) {
        return current;
      }

      return current.map((order) => {
        if (order.id !== id) {
          return order;
        }

        return {
          ...order,
          status,
        };
      });
    });

    return { previousOrders };
  }

  function rollbackOptimisticUpdate(context?: MutationContext) {
    if (!context?.previousOrders) {
      return;
    }

    queryClient.setQueryData(queryKeys.purchaseOrders.list(), context.previousOrders);
  }

  async function refreshPurchaseOrders() {
    await queryClient.invalidateQueries({ queryKey: queryKeys.purchaseOrders._def });
  }

  const submit = useMutation<unknown, Error, string, MutationContext>({
    mutationFn: submitPurchaseOrder,
    onMutate: async (id: string) => applyOptimisticStatus(id, "submitted"),
    onSuccess: async (_response, id) => {
      toast.success(`Purchase order ${id} submitted`);
      dispatch(purchaseOrderSubmitted({ id }));
      await emitAuditLog({
        action: "purchaseOrder.submit",
        outcome: "success",
        entityId: id,
      });
    },
    onError: async (error, id, context) => {
      rollbackOptimisticUpdate(context);
      const message = stringifyError(error);
      toast.error(`Failed to submit purchase order ${id}: ${message}`);
      dispatch(purchaseOrderSubmitFailed({ id, reason: message }));
      await emitAuditLog({
        action: "purchaseOrder.submit",
        outcome: "error",
        entityId: id,
        message,
      });
    },
    onSettled: async () => {
      await refreshPurchaseOrders();
    },
  });

  const approve = useMutation<unknown, Error, string, MutationContext>({
    mutationFn: approvePurchaseOrder,
    onMutate: async (id: string) => applyOptimisticStatus(id, "approved"),
    onSuccess: async (_response, id) => {
      toast.success(`Purchase order ${id} approved`);
      dispatch(purchaseOrderApproved({ id }));
      await emitAuditLog({
        action: "purchaseOrder.approve",
        outcome: "success",
        entityId: id,
      });
    },
    onError: async (error, id, context) => {
      rollbackOptimisticUpdate(context);
      const message = stringifyError(error);
      toast.error(`Failed to approve purchase order ${id}: ${message}`);
      dispatch(purchaseOrderApproveFailed({ id, reason: message }));
      await emitAuditLog({
        action: "purchaseOrder.approve",
        outcome: "error",
        entityId: id,
        message,
      });
    },
    onSettled: async () => {
      await refreshPurchaseOrders();
    },
  });

  const reject = useMutation<unknown, Error, string, MutationContext>({
    mutationFn: rejectPurchaseOrder,
    onMutate: async (id: string) => applyOptimisticStatus(id, "rejected"),
    onSuccess: async (_response, id) => {
      toast.success(`Purchase order ${id} rejected`);
      dispatch(purchaseOrderRejected({ id }));
      await emitAuditLog({
        action: "purchaseOrder.reject",
        outcome: "success",
        entityId: id,
      });
    },
    onError: async (error, id, context) => {
      rollbackOptimisticUpdate(context);
      const message = stringifyError(error);
      toast.error(`Failed to reject purchase order ${id}: ${message}`);
      dispatch(purchaseOrderRejectFailed({ id, reason: message }));
      await emitAuditLog({
        action: "purchaseOrder.reject",
        outcome: "error",
        entityId: id,
        message,
      });
    },
    onSettled: async () => {
      await refreshPurchaseOrders();
    },
  });

  return {
    submit,
    approve,
    reject,
  };
}
