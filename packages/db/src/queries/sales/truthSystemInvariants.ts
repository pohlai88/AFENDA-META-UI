/**
 * **System Invariants Layer** — documented “machine rules” for the Truth Engine.
 *
 * These are **application-level** checks (for batch jobs, admin tools, and invariant test suites).
 * Critical paths should still rely on DB triggers and FKs where they exist.
 *
 * | ID | Rule |
 * |----|------|
 * | `INV-SO-001` | Posted / non-draft journal entry must reference a truth binding (`journal_entries.truth_binding_id` NOT NULL — enforced in schema). |
 * | `INV-SO-002` | Order in `sale` must have a `sales_order_document_truth_links` row for `(tenant_id, order_id)`. |
 * | `INV-SO-003` | Order in `sale` should have a non-void `document_truth_bindings` row (financial boundary). |
 * | `INV-SO-004` | Active pricing pointer on order should match an existing decision when set. |
 *
 * **Financial unification** (journal vs partner projection): choose journal as ledger truth; reconcile projections
 * with {@link runPartnerReconciliation} (or equivalent) — see partner module.
 */
import { and, eq, isNull } from "drizzle-orm";

import type { Database } from "../../drizzle/db.js";
import { documentTruthBindings } from "../../schema/sales/truthBindings.js";
import { documentTruthLinks } from "../../schema/sales/documentTruthLinks.js";
import { journalEntries } from "../../schema/sales/journal.js";
import { salesOrders } from "../../schema/sales/orders.js";
import { pricingDecisions } from "../../schema/sales/pricingDecisions.js";

export type TruthInvariantId = "INV-SO-001" | "INV-SO-002" | "INV-SO-003" | "INV-SO-004";

export type TruthInvariantCheck = {
  id: TruthInvariantId;
  ok: boolean;
  message?: string;
};

/** Catalog for docs / UI (single source of list). */
export const TRUTH_INVARIANT_CATALOG: ReadonlyArray<{
  id: TruthInvariantId;
  description: string;
}> = [
  {
    id: "INV-SO-001",
    description:
      "Journal entries carry truth_binding_id (ledger posts are anchored to a financial boundary).",
  },
  {
    id: "INV-SO-002",
    description: "A sold order has a document-level pricing truth link.",
  },
  {
    id: "INV-SO-003",
    description: "A sold order has an active (non-voided) document truth binding.",
  },
  {
    id: "INV-SO-004",
    description: "When set, sales_orders.active_pricing_decision_id references a real decision row.",
  },
];

/**
 * INV-SO-001: journal row must have truth binding (schema NOT NULL — this catches legacy / direct SQL).
 */
export async function checkJournalEntryTruthBinding(
  db: Database,
  tenantId: number,
  journalEntryId: string
): Promise<TruthInvariantCheck> {
  const [row] = await db
    .select({ truthBindingId: journalEntries.truthBindingId })
    .from(journalEntries)
    .where(and(eq(journalEntries.tenantId, tenantId), eq(journalEntries.id, journalEntryId)))
    .limit(1);

  if (!row) {
    return { id: "INV-SO-001", ok: false, message: "journal entry not found" };
  }
  if (row.truthBindingId == null) {
    return { id: "INV-SO-001", ok: false, message: "truth_binding_id is null" };
  }
  return { id: "INV-SO-001", ok: true };
}

/**
 * INV-SO-002 / INV-SO-003 / INV-SO-004 for one sales order (when status is `sale` or `done`).
 */
export async function checkSalesOrderTruthCompletion(
  db: Database,
  tenantId: number,
  orderId: string
): Promise<TruthInvariantCheck[]> {
  const [order] = await db
    .select({
      status: salesOrders.status,
      activePricingDecisionId: salesOrders.activePricingDecisionId,
    })
    .from(salesOrders)
    .where(and(eq(salesOrders.tenantId, tenantId), eq(salesOrders.id, orderId)))
    .limit(1);

  const out: TruthInvariantCheck[] = [];

  if (!order) {
    return [
      { id: "INV-SO-002", ok: false, message: "order not found" },
      { id: "INV-SO-003", ok: false, message: "order not found" },
      { id: "INV-SO-004", ok: false, message: "order not found" },
    ];
  }

  const isSold = order.status === "sale" || order.status === "done";

  if (isSold) {
    const [link] = await db
      .select({ id: documentTruthLinks.id })
      .from(documentTruthLinks)
      .where(
        and(eq(documentTruthLinks.tenantId, tenantId), eq(documentTruthLinks.orderId, orderId))
      )
      .limit(1);
    out.push(
      link
        ? { id: "INV-SO-002", ok: true }
        : {
            id: "INV-SO-002",
            ok: false,
            message: "missing sales_order_document_truth_links row",
          }
    );

    const [binding] = await db
      .select({ id: documentTruthBindings.id })
      .from(documentTruthBindings)
      .where(
        and(
          eq(documentTruthBindings.tenantId, tenantId),
          eq(documentTruthBindings.documentType, "sales_order"),
          eq(documentTruthBindings.documentId, orderId),
          isNull(documentTruthBindings.voidedAt)
        )
      )
      .limit(1);
    out.push(
      binding
        ? { id: "INV-SO-003", ok: true }
        : {
            id: "INV-SO-003",
            ok: false,
            message: "missing or voided document_truth_bindings row",
          }
    );
  } else {
    out.push({
      id: "INV-SO-002",
      ok: true,
      message: "skipped (order not in sale/done)",
    });
    out.push({
      id: "INV-SO-003",
      ok: true,
      message: "skipped (order not in sale/done)",
    });
  }

  if (order.activePricingDecisionId == null) {
    out.push({ id: "INV-SO-004", ok: true, message: "active pointer unset" });
  } else {
    const [pd] = await db
      .select({ id: pricingDecisions.id })
      .from(pricingDecisions)
      .where(
        and(
          eq(pricingDecisions.tenantId, tenantId),
          eq(pricingDecisions.id, order.activePricingDecisionId)
        )
      )
      .limit(1);
    out.push(
      pd
        ? { id: "INV-SO-004", ok: true }
        : {
            id: "INV-SO-004",
            ok: false,
            message: "active_pricing_decision_id does not resolve",
          }
    );
  }

  return out;
}

/**
 * Run all applicable checks for a sold order; throws nothing — inspect `.ok`.
 */
export async function runTruthInvariantsForSalesOrder(
  db: Database,
  tenantId: number,
  orderId: string
): Promise<TruthInvariantCheck[]> {
  return checkSalesOrderTruthCompletion(db, tenantId, orderId);
}
