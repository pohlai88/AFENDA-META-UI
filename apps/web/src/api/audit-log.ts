export type AuditAction =
  | "purchaseOrder.submit"
  | "purchaseOrder.approve"
  | "purchaseOrder.reject"
  | "metaList.bulk.export"
  | "metaList.bulk.statusTransition";

export interface AuditLogPayload {
  action: AuditAction;
  outcome: "success" | "error";
  entityId: string;
  message?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Fire-and-forget audit event emitter.
 * Failures are intentionally swallowed to keep UI flows resilient.
 */
export async function emitAuditLog(payload: AuditLogPayload): Promise<void> {
  try {
    await fetch("/api/audit-log", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        ...payload,
        timestamp: new Date().toISOString(),
      }),
    });
  } catch {
    // no-op
  }
}
