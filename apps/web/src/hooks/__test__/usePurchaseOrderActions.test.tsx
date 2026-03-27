import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { PurchaseOrder } from "~/api/purchase-orders";
import { queryKeys } from "~/lib/query-keys";
import { usePurchaseOrderActions } from "../usePurchaseOrderActions";

const submitPurchaseOrder = vi.fn();
const approvePurchaseOrder = vi.fn();
const rejectPurchaseOrder = vi.fn();
const emitAuditLog = vi.fn();
const toastSuccess = vi.fn();
const toastError = vi.fn();
const dispatchMock = vi.fn();

vi.mock("~/stores/business/hooks", () => ({
  useAppDispatch: () => dispatchMock,
}));

vi.mock("~/api/purchase-orders", () => ({
  submitPurchaseOrder: (...args: unknown[]) => submitPurchaseOrder(...args),
  approvePurchaseOrder: (...args: unknown[]) => approvePurchaseOrder(...args),
  rejectPurchaseOrder: (...args: unknown[]) => rejectPurchaseOrder(...args),
}));

vi.mock("~/api/audit-log", () => ({
  emitAuditLog: (...args: unknown[]) => emitAuditLog(...args),
}));

vi.mock("@afenda/ui", () => ({
  toast: {
    success: (...args: unknown[]) => toastSuccess(...args),
    error: (...args: unknown[]) => toastError(...args),
  },
}));

interface Deferred<T> {
  promise: Promise<T>;
  resolve: (value: T) => void;
  reject: (reason?: unknown) => void;
}

function createDeferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

const seedOrders: PurchaseOrder[] = [
  {
    id: "PO-1",
    supplier: "Acme",
    buyer: "Alex",
    total: 1200,
    status: "draft",
    dueDate: "2026-04-01",
  },
  {
    id: "PO-2",
    supplier: "Globex",
    buyer: "Casey",
    total: 900,
    status: "submitted",
    dueDate: "2026-04-02",
  },
];

function createWrapper(client: QueryClient) {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  };
}

describe("usePurchaseOrderActions", () => {
  beforeEach(() => {
    submitPurchaseOrder.mockReset();
    approvePurchaseOrder.mockReset();
    rejectPurchaseOrder.mockReset();
    emitAuditLog.mockReset();
    emitAuditLog.mockResolvedValue(undefined);
    toastSuccess.mockReset();
    toastError.mockReset();
    dispatchMock.mockReset();
  });

  it("applies optimistic status update before submit mutation resolves", async () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    queryClient.setQueryData(queryKeys.purchaseOrders.list(), structuredClone(seedOrders));

    const deferred = createDeferred<unknown>();
    submitPurchaseOrder.mockReturnValueOnce(deferred.promise);

    const { result } = renderHook(() => usePurchaseOrderActions(), {
      wrapper: createWrapper(queryClient),
    });

    act(() => {
      result.current.submit.mutate("PO-1");
    });

    await waitFor(() => {
      const orders =
        queryClient.getQueryData<PurchaseOrder[]>(queryKeys.purchaseOrders.list()) ?? [];
      expect(orders.find((order) => order.id === "PO-1")?.status).toBe("submitted");
    });

    deferred.resolve({ ok: true });

    await waitFor(() => {
      expect(toastSuccess).toHaveBeenCalledWith("Purchase order PO-1 submitted");
    });
  });

  it("rolls back optimistic status when approve mutation fails", async () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    queryClient.setQueryData(queryKeys.purchaseOrders.list(), structuredClone(seedOrders));

    const deferred = createDeferred<unknown>();
    approvePurchaseOrder.mockReturnValueOnce(deferred.promise);

    const { result } = renderHook(() => usePurchaseOrderActions(), {
      wrapper: createWrapper(queryClient),
    });

    act(() => {
      result.current.approve.mutate("PO-1");
    });

    await waitFor(() => {
      const orders =
        queryClient.getQueryData<PurchaseOrder[]>(queryKeys.purchaseOrders.list()) ?? [];
      expect(orders.find((order) => order.id === "PO-1")?.status).toBe("approved");
    });

    deferred.reject(new Error("Network down"));

    await waitFor(() => {
      const orders =
        queryClient.getQueryData<PurchaseOrder[]>(queryKeys.purchaseOrders.list()) ?? [];
      expect(orders.find((order) => order.id === "PO-1")?.status).toBe("draft");
    });
  });

  it("fires toast and audit logs with correct action names for success and error", async () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    queryClient.setQueryData(queryKeys.purchaseOrders.list(), structuredClone(seedOrders));

    rejectPurchaseOrder.mockResolvedValueOnce({ ok: true });
    submitPurchaseOrder.mockRejectedValueOnce(new Error("No permission"));

    const { result } = renderHook(() => usePurchaseOrderActions(), {
      wrapper: createWrapper(queryClient),
    });

    await act(async () => {
      await result.current.reject.mutateAsync("PO-2");
    });

    await waitFor(() => {
      expect(toastSuccess).toHaveBeenCalledWith("Purchase order PO-2 rejected");
      expect(emitAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "purchaseOrder.reject",
          outcome: "success",
          entityId: "PO-2",
        })
      );
    });

    await act(async () => {
      await expect(result.current.submit.mutateAsync("PO-1")).rejects.toThrow("No permission");
    });

    await waitFor(() => {
      expect(toastError).toHaveBeenCalledWith(
        "Failed to submit purchase order PO-1: No permission"
      );
      expect(emitAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "purchaseOrder.submit",
          outcome: "error",
          entityId: "PO-1",
          message: "No permission",
        })
      );
    });
  });
});
