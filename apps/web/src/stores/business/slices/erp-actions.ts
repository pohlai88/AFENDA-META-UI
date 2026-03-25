/**
 * ERP Action Creators — Analytics-annotated workflow events
 * ===========================================================
 * Pre-annotated Redux action creators for high-value ERP workflow steps.
 *
 * Each action carries `meta.analytics` with a stable event name and full
 * ERP taxonomy so the analytics middleware emits consistent events regardless
 * of how the action type string evolves.
 *
 * Usage (e.g. in usePurchaseOrderActions):
 *   dispatch(purchaseOrderSubmitted({ id: order.id }));
 *   dispatch(purchaseOrderApproved({ id: order.id }));
 *   dispatch(purchaseOrderRejected({ id: order.id }));
 *
 * The `erp/` namespace ensures the analytics middleware pattern-matches these
 * even without an explicit `meta.analytics.enabled` flag.
 */

import { createAction } from "@reduxjs/toolkit";
import type { AnalyticsMetaConfig } from "../analytics";

/** Internal helper — creates an ERP action creator with analytics metadata baked in. */
function erpAction<P = void>(type: string, analyticsMeta: AnalyticsMetaConfig) {
  return createAction(type, (payload: P) => ({
    payload,
    meta: { analytics: analyticsMeta },
  }));
}

// ─── Purchase Order Workflow ──────────────────────────────────────────────────

/** Clerk submitted a draft purchase order to the approval queue. */
export const purchaseOrderSubmitted = erpAction<{ id: string }>(
  "erp/purchaseOrder.submitted",
  {
    event: "purchase_order.submitted",
    domain: "erp",
    module: "procurement",
    feature: "purchaseOrder",
    operation: "submit",
    category: "workflow",
    outcome: "success",
    tags: ["purchase-order", "workflow"],
  }
);

/** Purchase order submission failed (API error or permission denied). */
export const purchaseOrderSubmitFailed = erpAction<{ id: string; reason?: string }>(
  "erp/purchaseOrder.submitFailed",
  {
    event: "purchase_order.submit_failed",
    domain: "erp",
    module: "procurement",
    feature: "purchaseOrder",
    operation: "submit",
    category: "workflow",
    outcome: "error",
    tags: ["purchase-order", "workflow", "error"],
  }
);

/**
 * Manager approved a submitted purchase order.
 * `immediate: true` — flushed right away because this is a high-audit-value event.
 */
export const purchaseOrderApproved = erpAction<{ id: string }>(
  "erp/purchaseOrder.approved",
  {
    event: "purchase_order.approved",
    domain: "erp",
    module: "procurement",
    feature: "purchaseOrder",
    operation: "approve",
    category: "workflow",
    outcome: "success",
    tags: ["purchase-order", "workflow", "approval"],
    immediate: true,
  }
);

/** Purchase order approval call failed. */
export const purchaseOrderApproveFailed = erpAction<{ id: string; reason?: string }>(
  "erp/purchaseOrder.approveFailed",
  {
    event: "purchase_order.approve_failed",
    domain: "erp",
    module: "procurement",
    feature: "purchaseOrder",
    operation: "approve",
    category: "workflow",
    outcome: "error",
    tags: ["purchase-order", "workflow", "approval", "error"],
  }
);

/**
 * Manager rejected a submitted purchase order.
 * `immediate: true` — rejection decisions are high-audit-value.
 */
export const purchaseOrderRejected = erpAction<{ id: string; reason?: string }>(
  "erp/purchaseOrder.rejected",
  {
    event: "purchase_order.rejected",
    domain: "erp",
    module: "procurement",
    feature: "purchaseOrder",
    operation: "reject",
    category: "workflow",
    outcome: "success",
    tags: ["purchase-order", "workflow", "rejection"],
    immediate: true,
  }
);

/** Purchase order reject call failed. */
export const purchaseOrderRejectFailed = erpAction<{ id: string; reason?: string }>(
  "erp/purchaseOrder.rejectFailed",
  {
    event: "purchase_order.reject_failed",
    domain: "erp",
    module: "procurement",
    feature: "purchaseOrder",
    operation: "reject",
    category: "workflow",
    outcome: "error",
    tags: ["purchase-order", "workflow", "rejection", "error"],
  }
);
