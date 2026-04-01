import { and, eq, isNotNull, sql } from "drizzle-orm";
import { Decimal } from "decimal.js";

import type { Database } from "../../drizzle/db.js";
import { journalEntries } from "../../schema/sales/journal.js";
import {
  partnerEvents,
  partnerFinancialProjections,
  partnerReconciliationLinks,
} from "../../schema/sales/partner.js";
import { salesOrders } from "../../schema/sales/orders.js";
import { documentTruthBindings } from "../../schema/sales/truthBindings.js";

export type PartnerReconciliationScope = {
  tenantId: number;
  partnerId: string;
};

export type PartnerReconciliationReport = {
  scope: PartnerReconciliationScope;
  /** Σ signed partner-event amounts in the receivable sub-ledger (increase − decrease). */
  eventReceivableNet: string;
  /** Σ signed amounts in the payable sub-ledger. */
  eventPayableNet: string;
  /** Distinct truth bindings with a posted journal for this partner (via `sales_order` bridge). */
  journalPostedBindingCount: number;
  /** Sum of `document_truth_bindings.total_amount` for those bindings (one row per binding). */
  journalTruthCommittedTotal: string;
  /** Cached projection row, if any. */
  projection: {
    totalInvoiced: string;
    totalPaid: string;
    totalOutstanding: string;
    lastProcessedEventId: string | null;
    lastRebuildAt: Date | null;
  } | null;
  /** Truth bindings referenced by partner events but with no posted journal row for this partner bridge. */
  eventsMissingPostedJournal: string[];
  /** Truth bindings with posted journal for this partner but no partner_event row (any type) carrying that `truth_binding_id`. */
  journalMissingPartnerEvent: string[];
  /** Rows from `partner_reconciliation_links` by status (external / farm / third-party pointers). */
  externalLinkSummary: Record<"unmatched" | "matched" | "disputed" | "void", number>;
  /**
   * Heuristic: |eventReceivableNet − journalTruthCommittedTotal| ≤ tolerance.
   * Not authoritative when document types beyond `sales_order` post to the partner.
   */
  receivableWithinTolerance: boolean;
};

const ZERO = new Decimal(0);

function sumDecimal(rows: { v: string | null }[]): Decimal {
  return rows.reduce((acc, r) => acc.plus(new Decimal(r.v ?? "0")), ZERO);
}

/**
 * Three-way reconciliation for a partner: append-only **partner_events**, **journal_entries**
 * (via `document_truth_bindings` + `sales_orders`), and **partner_reconciliation_links** (external pointers).
 */
export async function runPartnerFinancialReconciliation(
  db: Database,
  scope: PartnerReconciliationScope,
  options?: { tolerance?: string }
): Promise<PartnerReconciliationReport> {
  const { tenantId, partnerId } = scope;
  const tolerance = new Decimal(options?.tolerance ?? "0.01");

  const [incRecv] = await db
    .select({ v: sql<string>`coalesce(sum(${partnerEvents.amount}), '0')` })
    .from(partnerEvents)
    .where(
      and(
        eq(partnerEvents.tenantId, tenantId),
        eq(partnerEvents.partnerId, partnerId),
        eq(partnerEvents.accountingImpact, "increase_receivable")
      )
    );

  const [decRecv] = await db
    .select({ v: sql<string>`coalesce(sum(${partnerEvents.amount}), '0')` })
    .from(partnerEvents)
    .where(
      and(
        eq(partnerEvents.tenantId, tenantId),
        eq(partnerEvents.partnerId, partnerId),
        eq(partnerEvents.accountingImpact, "decrease_receivable")
      )
    );

  const [incPay] = await db
    .select({ v: sql<string>`coalesce(sum(${partnerEvents.amount}), '0')` })
    .from(partnerEvents)
    .where(
      and(
        eq(partnerEvents.tenantId, tenantId),
        eq(partnerEvents.partnerId, partnerId),
        eq(partnerEvents.accountingImpact, "increase_payable")
      )
    );

  const [decPay] = await db
    .select({ v: sql<string>`coalesce(sum(${partnerEvents.amount}), '0')` })
    .from(partnerEvents)
    .where(
      and(
        eq(partnerEvents.tenantId, tenantId),
        eq(partnerEvents.partnerId, partnerId),
        eq(partnerEvents.accountingImpact, "decrease_payable")
      )
    );

  const eventReceivableNet = new Decimal(incRecv?.v ?? "0")
    .minus(new Decimal(decRecv?.v ?? "0"))
    .toFixed(2);
  const eventPayableNet = new Decimal(incPay?.v ?? "0")
    .minus(new Decimal(decPay?.v ?? "0"))
    .toFixed(2);

  const postedBindings = await db
    .select({
      bindingId: documentTruthBindings.id,
      totalAmount: documentTruthBindings.totalAmount,
    })
    .from(journalEntries)
    .innerJoin(documentTruthBindings, eq(journalEntries.truthBindingId, documentTruthBindings.id))
    .innerJoin(
      salesOrders,
      and(
        eq(documentTruthBindings.tenantId, salesOrders.tenantId),
        eq(documentTruthBindings.documentId, salesOrders.id),
        eq(documentTruthBindings.documentType, "sales_order")
      )
    )
    .where(
      and(
        eq(journalEntries.tenantId, tenantId),
        eq(journalEntries.status, "posted"),
        eq(salesOrders.tenantId, tenantId),
        eq(salesOrders.partnerId, partnerId)
      )
    )
    .groupBy(documentTruthBindings.id, documentTruthBindings.totalAmount);

  const journalTruthCommittedTotal = sumDecimal(
    postedBindings.map((r) => ({ v: r.totalAmount }))
  ).toFixed(2);

  const eventTruthIds = await db
    .select({ id: partnerEvents.truthBindingId })
    .from(partnerEvents)
    .where(
      and(
        eq(partnerEvents.tenantId, tenantId),
        eq(partnerEvents.partnerId, partnerId),
        isNotNull(partnerEvents.truthBindingId)
      )
    )
    .groupBy(partnerEvents.truthBindingId);

  const eventBindingSet = new Set(
    eventTruthIds.map((r) => r.id).filter((x): x is string => x != null)
  );
  const journalBindingSet = new Set(postedBindings.map((r) => r.bindingId));

  const eventsMissingPostedJournal = [...eventBindingSet].filter((id) => !journalBindingSet.has(id));

  const journalMissingPartnerEvent = [...journalBindingSet].filter((id) => !eventBindingSet.has(id));

  const [proj] = await db
    .select({
      totalInvoiced: partnerFinancialProjections.totalInvoiced,
      totalPaid: partnerFinancialProjections.totalPaid,
      totalOutstanding: partnerFinancialProjections.totalOutstanding,
      lastProcessedEventId: partnerFinancialProjections.lastProcessedEventId,
      lastRebuildAt: partnerFinancialProjections.lastRebuildAt,
    })
    .from(partnerFinancialProjections)
    .where(
      and(
        eq(partnerFinancialProjections.tenantId, tenantId),
        eq(partnerFinancialProjections.partnerId, partnerId)
      )
    )
    .limit(1);

  const linkRows = await db
    .select({ status: partnerReconciliationLinks.status })
    .from(partnerReconciliationLinks)
    .where(
      and(
        eq(partnerReconciliationLinks.tenantId, tenantId),
        eq(partnerReconciliationLinks.partnerId, partnerId)
      )
    );

  const externalLinkSummary = {
    unmatched: 0,
    matched: 0,
    disputed: 0,
    void: 0,
  } as PartnerReconciliationReport["externalLinkSummary"];

  for (const row of linkRows) {
    externalLinkSummary[row.status] += 1;
  }

  const diff = new Decimal(eventReceivableNet).minus(new Decimal(journalTruthCommittedTotal)).abs();
  const receivableWithinTolerance = diff.lte(tolerance);

  return {
    scope,
    eventReceivableNet,
    eventPayableNet,
    journalPostedBindingCount: postedBindings.length,
    journalTruthCommittedTotal,
    projection: proj
      ? {
          totalInvoiced: proj.totalInvoiced,
          totalPaid: proj.totalPaid,
          totalOutstanding: proj.totalOutstanding,
          lastProcessedEventId: proj.lastProcessedEventId,
          lastRebuildAt: proj.lastRebuildAt,
        }
      : null,
    eventsMissingPostedJournal,
    journalMissingPartnerEvent,
    externalLinkSummary,
    receivableWithinTolerance,
  };
}

/**
 * Batch reconciliation for all partners in a tenant that have any partner_event or posted journal bridge row.
 */
export async function runTenantPartnerReconciliationSweep(
  db: Database,
  tenantId: number,
  options?: { tolerance?: string }
): Promise<PartnerReconciliationReport[]> {
  const partnerIdsFromEvents = await db
    .select({ partnerId: partnerEvents.partnerId })
    .from(partnerEvents)
    .where(eq(partnerEvents.tenantId, tenantId))
    .groupBy(partnerEvents.partnerId);

  const partnerIdsFromJournal = await db
    .select({ partnerId: salesOrders.partnerId })
    .from(journalEntries)
    .innerJoin(documentTruthBindings, eq(journalEntries.truthBindingId, documentTruthBindings.id))
    .innerJoin(
      salesOrders,
      and(
        eq(documentTruthBindings.tenantId, salesOrders.tenantId),
        eq(documentTruthBindings.documentId, salesOrders.id),
        eq(documentTruthBindings.documentType, "sales_order")
      )
    )
    .where(and(eq(journalEntries.tenantId, tenantId), eq(journalEntries.status, "posted")))
    .groupBy(salesOrders.partnerId);

  const idSet = new Set<string>();
  for (const r of partnerIdsFromEvents) idSet.add(r.partnerId);
  for (const r of partnerIdsFromJournal) idSet.add(r.partnerId);

  const out: PartnerReconciliationReport[] = [];
  for (const partnerId of idSet) {
    out.push(await runPartnerFinancialReconciliation(db, { tenantId, partnerId }, options));
  }
  return out;
}
