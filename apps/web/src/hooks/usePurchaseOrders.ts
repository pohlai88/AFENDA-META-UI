import { useQuery } from "@tanstack/react-query";
import { fetchPurchaseOrders, type PurchaseOrder } from "~/api/purchase-orders";
import { queryKeys } from "~/lib/query-keys";

export function usePurchaseOrders() {
  return useQuery<PurchaseOrder[]>({
    queryKey: queryKeys.purchaseOrders.list(),
    queryFn: fetchPurchaseOrders,
    staleTime: 60 * 1000,
    retry: 1,
  });
}

export function usePurchaseOrdersData() {
  const { data, isLoading, error } = usePurchaseOrders();
  const orders = data ?? [];
  return {
    orders,
    isLoading,
    error,
    hasOrders: orders.length > 0,
    pendingOrders: orders.filter((order) => order.status === "submitted"),
  };
}
