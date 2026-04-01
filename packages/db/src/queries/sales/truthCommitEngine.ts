/**
 * Truth Commit Engine — financial boundary for commercial documents.
 *
 * ## Lifecycle (sales order example)
 * 1. **Draft / sent** — mutable header and lines; price resolutions may be recomputed.
 * 2. **Approvals (optional)** — `document_approvals` rows; does not freeze truth until commit hooks pass.
 * 3. **Financial commit** — `confirmSalesOrderTruth` runs the truth pipeline (pure gates), inserts `document_truth_links`,
 *    then `document_truth_bindings` + `truth_decision_locks` (immutable totals + decision hashes), sets order → `sale`;
 *    DB triggers lock `price_resolutions`. Row-level checks + `trg_sales_document_truth_bindings_immutable_payload`
 *    forbid mutating frozen amounts/snapshots after `locked_at`; void / `posted` phase transitions use only allowed columns.
 * 4. **Posted to GL** — `markTruthBindingPostedToGl` sets `commit_phase = posted` after `accounting_postings` exist
 *    with `truth_binding_id` set.
 *
 * ## Invariant gating
 * Use `ConfirmSalesOrderTruthHooks` (credit, inventory, GL readiness) **before** the binding insert.
 * For blocking invariant checks, query `domain_invariant_logs` in a hook and throw if any `status = fail` with
 * `severity = error` for the target entity — or centralize in API policy middleware.
 *
 * ## Rollback / void
 * **Void** — `voidTruthBinding` sets `voided_at`, `commit_phase = voided`. It does not delete accounting rows;
 * reverse them via existing `accounting_postings.reversal_entry_id` (or insert offsetting postings) and keep the
 * binding row for audit. A **new** financial commit may insert another binding only after the prior is voided
 * (partial unique index allows one active `voided_at IS NULL` per document).
 *
 * ## Supersession
 * When replacing a commit (rare), void the old binding, insert a new row with `supersedes_binding_id` pointing
 * at the prior id, and new snapshots.
 */

import { createHash, randomUUID } from "node:crypto";

import { Decimal } from "decimal.js";
import { and, asc, eq, inArray, isNull, max } from "drizzle-orm";

import type { Database } from "../../drizzle/db.js";
import type { SalesOrderDocumentTruthInput } from "./documentTruthDecision.js";
import { domainEventLogs, truthDecisionLocks } from "../../schema/sales/governance.js";
import {
  documentTruthBindings,
  type DocumentTruthBinding,
} from "../../schema/sales/truthBindings.js";
import {
  saleOrderLineTaxes,
  saleOrderTaxSummary,
  salesOrderLines,
  salesOrders,
  type SalesOrder,
} from "../../schema/sales/orders.js";
import { commissionEntries } from "../../schema/sales/commission.js";
import { documentTruthLinks } from "../../schema/sales/documentTruthLinks.js";
import { priceResolutions } from "../../schema/sales/pricingTruth.js";

export type TruthCommitInvariantHooks = {
  /** Return only after all blocking invariant checks pass for this document (e.g. scan `domain_invariant_logs`). */
  assertInvariantsOk?: (ctx: {
    db: Database;
    tenantId: number;
    documentType: "sales_order";
    documentId: string;
    actorUserId: number;
  }) => Promise<void>;
};

export function stableTruthDecisionHash(payload: unknown): string {
  return createHash("sha256").update(JSON.stringify(payload)).digest("hex");
}

/** Canonical integrity hash persisted on `document_truth_bindings.snapshot_hash`. */
export function buildDocumentTruthBindingSnapshotHash(args: {
  totalAmount: string;
  subtotalAmount: string;
  taxAmount: string;
  headerSnapshot: unknown;
  lineSnapshot: unknown;
  taxSnapshot: unknown;
}): string {
  return stableTruthDecisionHash({
    kind: "document_truth_binding.snapshot.v1",
    totalAmount: args.totalAmount,
    subtotalAmount: args.subtotalAmount,
    taxAmount: args.taxAmount,
    headerSnapshot: args.headerSnapshot,
    lineSnapshot: args.lineSnapshot,
    taxSnapshot: args.taxSnapshot,
  });
}

function assertOrderAmountsCoherent(order: SalesOrder): { subtotal: string; tax: string; total: string } {
  const subtotal = new Decimal(order.amountUntaxed);
  const tax = new Decimal(order.amountTax);
  const total = new Decimal(order.amountTotal);
  if (!subtotal.plus(tax).equals(total)) {
    throw new Error(
      "ensureSalesOrderTruthBinding: amountTotal must equal amountUntaxed + amountTax for truth commit"
    );
  }
  return {
    subtotal: subtotal.toDecimalPlaces(2).toString(),
    tax: tax.toDecimalPlaces(2).toString(),
    total: total.toDecimalPlaces(2).toString(),
  };
}

function normalizeFxRateForStorage(raw: string | null): string | null {
  if (raw == null || raw.trim() === "") {
    return null;
  }
  return new Decimal(raw).toDecimalPlaces(8).toString();
}

export async function resolveNextDocumentTruthBindingVersion(
  db: Database,
  input: { tenantId: number; documentType: "sales_order"; documentId: string }
): Promise<number> {
  const [row] = await db
    .select({ maxV: max(documentTruthBindings.bindingVersion) })
    .from(documentTruthBindings)
    .where(
      and(
        eq(documentTruthBindings.tenantId, input.tenantId),
        eq(documentTruthBindings.documentType, input.documentType),
        eq(documentTruthBindings.documentId, input.documentId)
      )
    );
  const m = row?.maxV;
  const n = m == null ? 0 : typeof m === "number" ? m : Number(m);
  return Number.isFinite(n) ? n + 1 : 1;
}

export type SalesOrderTruthDecisionLockPayloads = {
  pricing: unknown;
  approval: unknown;
  accounting: unknown;
  inventory: unknown;
  credit: unknown;
};

/**
 * Builds deterministic lock payloads from the same {@link SalesOrderDocumentTruthInput} the resolver consumed
 * (plus committed pricing context). Hash these with {@link stableTruthDecisionHash} for `truth_decision_locks`.
 */
export function buildSalesOrderTruthDecisionLockPayloads(args: {
  truthCommitInput: SalesOrderDocumentTruthInput;
  order: SalesOrder;
  committedPricelistId: string;
  committedCurrencyId: number;
  exchangeRate: string | null;
  exchangeRateSource: string | null;
}): SalesOrderTruthDecisionLockPayloads {
  const {
    truthCommitInput: inp,
    order,
    committedPricelistId,
    committedCurrencyId,
    exchangeRate,
    exchangeRateSource,
  } = args;

  return {
    pricing: {
      kind: "pricing",
      pricelistId: committedPricelistId,
      currencyId: committedCurrencyId,
      totalAmount: order.amountTotal,
      exchangeRate,
      exchangeRateSource,
    },
    approval: {
      kind: "approval",
      chain: inp.approvals.map((a) => ({ level: a.level, status: a.status })),
    },
    accounting: { kind: "accounting", phase: "pre_gl" },
    inventory: {
      kind: "inventory",
      requireReservation: inp.policy.requireInventoryReservation === true,
      reservationSucceeded: inp.inventory.reservationSucceeded,
    },
    credit: {
      kind: "credit",
      requireCheck: inp.policy.requireCreditCheck === true,
      checkPassed: inp.credit.checkPassed,
      checkedAtIso: inp.credit.checkedAtIso,
      limitAtCheck: inp.credit.limitAtCheck,
    },
  };
}

async function insertSalesOrderTruthDecisionLocks(
  db: Database,
  input: {
    tenantId: number;
    bindingId: string;
    actorUserId: number;
    lockedAt: Date;
    payloads: SalesOrderTruthDecisionLockPayloads;
  }
): Promise<void> {
  const { tenantId, bindingId, actorUserId, lockedAt, payloads } = input;

  const locks = [
    {
      tenantId,
      truthBindingId: bindingId,
      decisionType: "pricing" as const,
      decisionHash: stableTruthDecisionHash(payloads.pricing),
      lockedAt,
      lockedBy: actorUserId,
      createdBy: actorUserId,
      updatedBy: actorUserId,
    },
    {
      tenantId,
      truthBindingId: bindingId,
      decisionType: "approval" as const,
      decisionHash: stableTruthDecisionHash(payloads.approval),
      lockedAt,
      lockedBy: actorUserId,
      createdBy: actorUserId,
      updatedBy: actorUserId,
    },
    {
      tenantId,
      truthBindingId: bindingId,
      decisionType: "accounting" as const,
      decisionHash: stableTruthDecisionHash(payloads.accounting),
      lockedAt,
      lockedBy: actorUserId,
      createdBy: actorUserId,
      updatedBy: actorUserId,
    },
    {
      tenantId,
      truthBindingId: bindingId,
      decisionType: "inventory" as const,
      decisionHash: stableTruthDecisionHash(payloads.inventory),
      lockedAt,
      lockedBy: actorUserId,
      createdBy: actorUserId,
      updatedBy: actorUserId,
    },
    {
      tenantId,
      truthBindingId: bindingId,
      decisionType: "credit" as const,
      decisionHash: stableTruthDecisionHash(payloads.credit),
      lockedAt,
      lockedBy: actorUserId,
      createdBy: actorUserId,
      updatedBy: actorUserId,
    },
  ];

  await db.insert(truthDecisionLocks).values(locks);
}

function stripTenantForSnapshot(row: Record<string, unknown>): Record<string, unknown> {
  const { tenantId: _t, ...rest } = row;
  return rest;
}

/**
 * Reads normalized tax junction + summary rows at commit time for `document_truth_bindings.tax_snapshot`.
 */
export async function fetchSalesOrderTaxSnapshot(
  db: Database,
  tenantId: number,
  orderId: string,
  capturedAtIso: string
): Promise<Record<string, unknown>> {
  const summaryRows = await db
    .select()
    .from(saleOrderTaxSummary)
    .where(
      and(eq(saleOrderTaxSummary.tenantId, tenantId), eq(saleOrderTaxSummary.orderId, orderId))
    )
    .orderBy(asc(saleOrderTaxSummary.taxId));

  const lineIdRows = await db
    .select({ id: salesOrderLines.id })
    .from(salesOrderLines)
    .where(and(eq(salesOrderLines.tenantId, tenantId), eq(salesOrderLines.orderId, orderId)));

  const lineIds = lineIdRows.map((r) => r.id);

  const lineTaxRows =
    lineIds.length === 0
      ? []
      : await db
          .select()
          .from(saleOrderLineTaxes)
          .where(
            and(
              eq(saleOrderLineTaxes.tenantId, tenantId),
              inArray(saleOrderLineTaxes.orderLineId, lineIds)
            )
          )
          .orderBy(asc(saleOrderLineTaxes.orderLineId), asc(saleOrderLineTaxes.taxId));

  return {
    schemaVersion: 1,
    capturedAt: capturedAtIso,
    orderTaxSummary: summaryRows.map((r) => stripTenantForSnapshot(r as unknown as Record<string, unknown>)),
    lineTaxes: lineTaxRows.map((r) => stripTenantForSnapshot(r as unknown as Record<string, unknown>)),
  };
}

export class TruthCommitEngineError extends Error {
  constructor(
    readonly code: "BINDING_NOT_FOUND" | "BINDING_ALREADY_VOIDED" | "INVALID_PHASE_TRANSITION",
    message: string
  ) {
    super(message);
    this.name = "TruthCommitEngineError";
  }
}

/** Header fields frozen into `document_truth_bindings.header_snapshot` (extend as needed). */
export function buildSalesOrderHeaderSnapshot(order: SalesOrder): Record<string, unknown> {
  return {
    id: order.id,
    name: order.name,
    status: order.status,
    partnerId: order.partnerId,
    currencyId: order.currencyId,
    pricelistId: order.pricelistId,
    paymentTermId: order.paymentTermId,
    fiscalPositionId: order.fiscalPositionId,
    amountUntaxed: order.amountUntaxed,
    amountTax: order.amountTax,
    amountTotal: order.amountTotal,
    amountCost: order.amountCost,
    amountProfit: order.amountProfit,
    marginPercent: order.marginPercent,
    invoiceStatus: order.invoiceStatus,
    deliveryStatus: order.deliveryStatus,
    orderDate: order.orderDate,
    quotationDate: order.quotationDate,
    validityDate: order.validityDate,
    pricelistSnapshotId: order.pricelistSnapshotId,
    exchangeRateUsed: order.exchangeRateUsed,
    exchangeRateSource: order.exchangeRateSource,
  };
}

export async function fetchSalesOrderLineSnapshot(
  db: Database,
  tenantId: number,
  orderId: string
): Promise<{ lines: Record<string, unknown>[] }> {
  const lines = await db
    .select()
    .from(salesOrderLines)
    .where(and(eq(salesOrderLines.tenantId, tenantId), eq(salesOrderLines.orderId, orderId)));

  return {
    lines: lines.map((row) => ({
      id: row.id,
      sequence: row.sequence,
      productId: row.productId,
      productTemplateId: row.productTemplateId,
      description: row.description,
      quantity: row.quantity,
      priceUnit: row.priceUnit,
      discount: row.discount,
      priceSubtotal: row.priceSubtotal,
      priceTax: row.priceTax,
      priceTotal: row.priceTotal,
      displayType: row.displayType,
      taxId: row.taxId,
    })),
  };
}

/** Load `document_truth_links` row for a sales order (after insert / onConflictDoNothing). */
export async function getDocumentTruthLinkForSalesOrder(
  db: Database,
  tenantId: number,
  orderId: string
): Promise<{ id: string } | undefined> {
  const [row] = await db
    .select({ id: documentTruthLinks.id })
    .from(documentTruthLinks)
    .where(and(eq(documentTruthLinks.tenantId, tenantId), eq(documentTruthLinks.orderId, orderId)))
    .limit(1);
  return row;
}

export async function getActiveTruthBinding(
  db: Database,
  tenantId: number,
  documentType: "sales_order",
  documentId: string
): Promise<DocumentTruthBinding | undefined> {
  const [row] = await db
    .select()
    .from(documentTruthBindings)
    .where(
      and(
        eq(documentTruthBindings.tenantId, tenantId),
        eq(documentTruthBindings.documentType, documentType),
        eq(documentTruthBindings.documentId, documentId),
        isNull(documentTruthBindings.voidedAt)
      )
    )
    .limit(1);
  return row;
}

/**
 * Creates `document_truth_bindings` and stamps `price_resolutions.truth_binding_id` for the order.
 * Idempotent: if an active binding already exists, returns its id without inserting.
 */
export async function ensureSalesOrderTruthBinding(
  db: Database,
  input: {
    tenantId: number;
    orderId: string;
    actorUserId: number;
    lockedAt: Date;
    order: SalesOrder;
    priceTruthLinkId: string;
    /** Effective pricing context at commit (header + confirm overrides). */
    committedPricelistId: string;
    committedCurrencyId: number;
    committedExchangeRate: string | null;
    committedExchangeRateSource: string | null;
    /** When set, dedupes commit retries per tenant (`uq_sales_document_truth_bindings_idempotency`). */
    idempotencyKey?: string | null;
    /** Functional / reporting currency when FX is known (optional). */
    baseCurrencyId?: number | null;
    /** Same input passed to {@link resolveSalesOrderDocumentTruth} immediately before commit (for lock hashes). */
    truthCommitInput: SalesOrderDocumentTruthInput;
    /**
     * Row as of truth evaluation (before status → `sale`). Used for `truth_decision_locks` pricing hash `totalAmount`
     * so hashes match the resolver’s economic view; defaults to `order` when omitted.
     */
    orderForLockPayloads?: SalesOrder;
    invariantHooks?: TruthCommitInvariantHooks;
  }
): Promise<{ bindingId: string; created: boolean }> {
  const {
    tenantId,
    orderId,
    actorUserId,
    lockedAt,
    order,
    priceTruthLinkId,
    committedPricelistId,
    committedCurrencyId,
    committedExchangeRate,
    committedExchangeRateSource,
    idempotencyKey,
    baseCurrencyId,
    truthCommitInput,
    orderForLockPayloads,
    invariantHooks,
  } = input;
  const lockOrder = orderForLockPayloads ?? order;

  await invariantHooks?.assertInvariantsOk?.({
    db,
    tenantId,
    documentType: "sales_order",
    documentId: orderId,
    actorUserId,
  });

  if (idempotencyKey) {
    const [byKey] = await db
      .select({
        id: documentTruthBindings.id,
        voidedAt: documentTruthBindings.voidedAt,
      })
      .from(documentTruthBindings)
      .where(
        and(
          eq(documentTruthBindings.tenantId, tenantId),
          eq(documentTruthBindings.idempotencyKey, idempotencyKey)
        )
      )
      .limit(1);
    if (byKey) {
      if (byKey.voidedAt != null) {
        throw new Error(
          "ensureSalesOrderTruthBinding: idempotency key is bound to a voided truth row; use a fresh key"
        );
      }
      await db
        .update(priceResolutions)
        .set({ truthBindingId: byKey.id })
        .where(and(eq(priceResolutions.tenantId, tenantId), eq(priceResolutions.orderId, orderId)));
      await db
        .update(commissionEntries)
        .set({ truthBindingId: byKey.id })
        .where(
          and(
            eq(commissionEntries.tenantId, tenantId),
            eq(commissionEntries.orderId, orderId),
            isNull(commissionEntries.truthBindingId)
          )
        );
      return { bindingId: byKey.id, created: false };
    }
  }

  const existing = await getActiveTruthBinding(db, tenantId, "sales_order", orderId);
  if (existing) {
    await db
      .update(priceResolutions)
      .set({ truthBindingId: existing.id })
      .where(
        and(eq(priceResolutions.tenantId, tenantId), eq(priceResolutions.orderId, orderId))
      );
    await db
      .update(commissionEntries)
      .set({ truthBindingId: existing.id })
      .where(
        and(
          eq(commissionEntries.tenantId, tenantId),
          eq(commissionEntries.orderId, orderId),
          isNull(commissionEntries.truthBindingId)
        )
      );
    return { bindingId: existing.id, created: false };
  }

  if (order.currencyId == null) {
    throw new Error("ensureSalesOrderTruthBinding: order.currencyId is required");
  }

  const amounts = assertOrderAmountsCoherent(order);
  const fxRateStored = normalizeFxRateForStorage(committedExchangeRate);
  const bindingVersion = await resolveNextDocumentTruthBindingVersion(db, {
    tenantId,
    documentType: "sales_order",
    documentId: orderId,
  });

  const lineSnapshot = await fetchSalesOrderLineSnapshot(db, tenantId, orderId);
  const taxSnapshot = await fetchSalesOrderTaxSnapshot(db, tenantId, orderId, lockedAt.toISOString());
  const commissionSnapshotId = randomUUID();
  const headerSnapshot = buildSalesOrderHeaderSnapshot(order);
  const snapshotHash = buildDocumentTruthBindingSnapshotHash({
    totalAmount: amounts.total,
    subtotalAmount: amounts.subtotal,
    taxAmount: amounts.tax,
    headerSnapshot,
    lineSnapshot,
    taxSnapshot,
  });

  const lockPayloads = buildSalesOrderTruthDecisionLockPayloads({
    truthCommitInput,
    order: lockOrder,
    committedPricelistId,
    committedCurrencyId,
    exchangeRate: committedExchangeRate,
    exchangeRateSource: committedExchangeRateSource,
  });

  const [inserted] = await db
    .insert(documentTruthBindings)
    .values({
      tenantId,
      documentType: "sales_order",
      documentId: orderId,
      documentStatusAtCommit: "sale",
      commitPhase: "financial_commit",
      committedAt: lockedAt,
      lockedAt,
      committedBy: actorUserId,
      priceTruthLinkId,
      currencyId: order.currencyId,
      bindingVersion,
      totalAmount: amounts.total,
      subtotalAmount: amounts.subtotal,
      taxAmount: amounts.tax,
      snapshotHash,
      fxRate: fxRateStored,
      fxAsOf: fxRateStored != null ? lockedAt : null,
      baseCurrencyId: baseCurrencyId ?? null,
      idempotencyKey: idempotencyKey ?? null,
      headerSnapshot,
      lineSnapshot,
      taxSnapshot,
      commissionSnapshotId,
      createdBy: actorUserId,
      updatedBy: actorUserId,
    })
    .returning({ id: documentTruthBindings.id });

  const bindingId = inserted!.id;

  await db
    .update(priceResolutions)
    .set({ truthBindingId: bindingId })
    .where(and(eq(priceResolutions.tenantId, tenantId), eq(priceResolutions.orderId, orderId)));

  await db
    .update(commissionEntries)
    .set({ truthBindingId: bindingId })
    .where(
      and(
        eq(commissionEntries.tenantId, tenantId),
        eq(commissionEntries.orderId, orderId),
        isNull(commissionEntries.truthBindingId)
      )
    );

  await insertSalesOrderTruthDecisionLocks(db, {
    tenantId,
    bindingId,
    actorUserId,
    lockedAt,
    payloads: lockPayloads,
  });

  await db.insert(domainEventLogs).values({
    tenantId,
    eventType: "TRUTH_BOUNDARY_COMMITTED",
    entityType: "sales_order",
    entityId: orderId,
    payload: { truthBindingId: bindingId, commissionSnapshotId },
    triggeredBy: actorUserId,
    createdBy: actorUserId,
    updatedBy: actorUserId,
  });

  return { bindingId, created: true };
}

export async function markTruthBindingPostedToGl(
  db: Database,
  input: { tenantId: number; bindingId: string; actorUserId: number }
): Promise<void> {
  const { tenantId, bindingId, actorUserId } = input;
  const [row] = await db
    .select()
    .from(documentTruthBindings)
    .where(and(eq(documentTruthBindings.tenantId, tenantId), eq(documentTruthBindings.id, bindingId)))
    .limit(1);

  if (!row) {
    throw new TruthCommitEngineError("BINDING_NOT_FOUND", `truth binding ${bindingId} not found`);
  }
  if (row.voidedAt != null) {
    throw new TruthCommitEngineError("BINDING_ALREADY_VOIDED", "cannot mark voided binding as posted");
  }
  if (row.commitPhase !== "financial_commit") {
    throw new TruthCommitEngineError(
      "INVALID_PHASE_TRANSITION",
      `expected financial_commit, got ${row.commitPhase}`
    );
  }

  const postedAt = new Date();
  await db
    .update(documentTruthBindings)
    .set({
      commitPhase: "posted",
      updatedBy: actorUserId,
      updatedAt: postedAt,
    })
    .where(and(eq(documentTruthBindings.tenantId, tenantId), eq(documentTruthBindings.id, bindingId)));
}

export async function voidTruthBinding(
  db: Database,
  input: {
    tenantId: number;
    bindingId: string;
    actorUserId: number;
    reason: string;
    /** When true, `commit_phase` is `superseded` (voided row replaced by a new binding). */
    asSuperseded?: boolean;
  }
): Promise<void> {
  const { tenantId, bindingId, actorUserId, reason, asSuperseded } = input;
  const [row] = await db
    .select()
    .from(documentTruthBindings)
    .where(and(eq(documentTruthBindings.tenantId, tenantId), eq(documentTruthBindings.id, bindingId)))
    .limit(1);

  if (!row) {
    throw new TruthCommitEngineError("BINDING_NOT_FOUND", `truth binding ${bindingId} not found`);
  }
  if (row.voidedAt != null) {
    throw new TruthCommitEngineError("BINDING_ALREADY_VOIDED", "binding already voided");
  }

  const now = new Date();
  await db
    .update(documentTruthBindings)
    .set({
      commitPhase: asSuperseded ? "superseded" : "voided",
      voidedAt: now,
      voidedBy: actorUserId,
      voidReason: reason,
      updatedBy: actorUserId,
      updatedAt: now,
    })
    .where(and(eq(documentTruthBindings.tenantId, tenantId), eq(documentTruthBindings.id, bindingId)));

  await db.insert(domainEventLogs).values({
    tenantId,
    eventType: "TRUTH_BINDING_VOIDED",
    entityType: row.documentType,
    entityId: row.documentId,
    payload: { truthBindingId: bindingId, reason, asSuperseded: Boolean(asSuperseded) },
    triggeredBy: actorUserId,
    createdBy: actorUserId,
    updatedBy: actorUserId,
  });
}
