export type PurchaseOrderStatus = "draft" | "submitted" | "approved" | "rejected";

export interface PurchaseOrder {
  id: string;
  supplier: string;
  buyer: string;
  total: number;
  status: PurchaseOrderStatus;
  dueDate: string;
}

interface PurchaseOrdersResponse {
  data?: PurchaseOrder[];
}

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init);

  if (!response.ok) {
    const fallback = `Request failed (${response.status})`;
    throw new Error(response.statusText || fallback);
  }

  return response.json() as Promise<T>;
}

export async function fetchPurchaseOrders(): Promise<PurchaseOrder[]> {
  const payload = await request<PurchaseOrder[] | PurchaseOrdersResponse>("/api/purchase-orders");

  if (Array.isArray(payload)) {
    return payload;
  }

  return payload.data ?? [];
}

export async function submitPurchaseOrder(id: string) {
  return request(`/api/purchase-orders/${id}/submit`, { method: "POST" });
}

export async function approvePurchaseOrder(id: string) {
  return request(`/api/purchase-orders/${id}/approve`, { method: "POST" });
}

export async function rejectPurchaseOrder(id: string) {
  return request(`/api/purchase-orders/${id}/reject`, { method: "POST" });
}
