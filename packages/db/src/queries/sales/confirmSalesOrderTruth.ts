import { and, eq } from "drizzle-orm";

import type { Database } from "../../drizzle/db.js";
import {
  documentTruthLinks,
  type NewDocumentTruthLink,
} from "../../schema/sales/documentTruthLinks.js";
import { salesOrders, type SalesOrder } from "../../schema/sales/orders.js";

import { TruthPipelineBlockedError } from "./documentTruthDecision.js";
import { evaluateSalesOrderTruthCommitOrThrow } from "./documentTruthPipeline.js";
import {
  ensureSalesOrderTruthBinding,
  type TruthCommitInvariantHooks,
} from "./truthCommitEngine.js";
import type {
  SalesOrderDocumentTruthInput,
  SalesOrderTruthCreditInput,
  SalesOrderTruthPolicy,
} from "./documentTruthDecision.js";
import {
  finalizePricingDecisionIfDraft,
  getSalesOrderDocumentPricingDecisionStatus,
} from "./documentPricingDecision.js";

export type { SalesOrderTruthPolicy };

export type ConfirmSalesOrderTruthHooks = {
  /** Credit / exposure checks before truth lock (implement in API layer). */
  assertCreditOk?: (ctx: ConfirmSalesOrderTruthContext) => Promise<void>;
  /** Inventory reservation or availability (implement when stock module is wired). */
  reserveInventory?: (ctx: ConfirmSalesOrderTruthContext) => Promise<void>;
  /** Accounting period / readiness (implement when GL bridge exists). */
  assertGlReadiness?: (ctx: ConfirmSalesOrderTruthContext) => Promise<void>;
};

export type ConfirmSalesOrderTruthContext = {
  db: Database;
  tenantId: number;
  orderId: string;
  actorUserId: number;
  order: SalesOrder;
};

export class ConfirmSalesOrderTruthError extends Error {
  constructor(
    readonly code:
      | "ORDER_NOT_FOUND"
      | "ORDER_NOT_CONFIRMABLE"
      | "MISSING_PRICING_CONTEXT"
      | "MISSING_DOCUMENT_PRICING_DECISION"
      | "AMBIGUOUS_DOCUMENT_PRICING_DECISION"
      | "INVALID_EXCHANGE_PAIR"
      | "TRUTH_PIPELINE_BLOCKED",
    message: string
  ) {
    super(message);
    this.name = "ConfirmSalesOrderTruthError";
  }
}

export type ConfirmSalesOrderTruthInput = {
  tenantId: number;
  orderId: string;
  actorUserId: number;
  /** Defaults to `new Date()`; stored on `document_truth_links` and propagated to line locks by trigger. */
  lockedAt?: Date;
  /**
   * Override order header values when persisting the document lock (otherwise pricelist/currency/FX come from the order).
   * `pricingDecisionId` overrides the resolved document-level `pricing_decisions.id` (must match all line resolutions).
   */
  truthOverrides?: Partial<
    Pick<
      NewDocumentTruthLink,
      | "pricelistId"
      | "currencyId"
      | "paymentTermId"
      | "exchangeRate"
      | "exchangeRateSource"
      | "lockReason"
      | "pricingDecisionId"
    >
  > & {
    /**
     * When set, overrides `sales_orders` credit fields for the pure truth decision + `credit` decision lock hash
     * (e.g. external credit service validated in `assertCreditOk` without updating the row).
     */
    creditCommitSnapshot?: SalesOrderTruthCreditInput;
  };
  hooks?: ConfirmSalesOrderTruthHooks;
  /** Optional invariant gating immediately before the immutable `document_truth_bindings` row is created. */
  truthInvariantHooks?: TruthCommitInvariantHooks;
  /** Approval depth and other pure gates evaluated by the truth pipeline before `document_truth_links` insert. */
  truthPolicy?: SalesOrderTruthPolicy;
};

export type ConfirmSalesOrderTruthResult =
  | { status: "confirmed" }
  | { status: "already_confirmed" };

/**
 * Core confirm path for use **inside** an outer transaction (e.g. {@link runOrderConfirmationPipeline}).
 * Inserts `sales_order_document_truth_links` (idempotent), hooks, `status` → `sale`, truth binding.
 * DB triggers require the truth link before sale; line `sales_order_price_resolutions.locked_at` syncs from the link.
 */
export async function confirmSalesOrderTruthInTransaction(
  tx: Database,
  input: ConfirmSalesOrderTruthInput
): Promise<ConfirmSalesOrderTruthResult> {
  const {
    tenantId,
    orderId,
    actorUserId,
    lockedAt = new Date(),
    truthOverrides,
    hooks,
    truthInvariantHooks,
    truthPolicy,
  } = input;

  {
    const [order] = await tx
      .select()
      .from(salesOrders)
      .where(and(eq(salesOrders.tenantId, tenantId), eq(salesOrders.id, orderId)))
      .limit(1);

    if (!order) {
      throw new ConfirmSalesOrderTruthError("ORDER_NOT_FOUND", `sales order ${orderId} not found`);
    }

    if (order.status === "sale" || order.status === "done") {
      return { status: "already_confirmed" };
    }

    if (order.status !== "draft" && order.status !== "sent") {
      throw new ConfirmSalesOrderTruthError(
        "ORDER_NOT_CONFIRMABLE",
        `order status ${order.status} cannot be confirmed`
      );
    }

    const pricelistId = truthOverrides?.pricelistId ?? order.pricelistId;
    const currencyId = truthOverrides?.currencyId ?? order.currencyId;
    if (pricelistId == null || currencyId == null) {
      throw new ConfirmSalesOrderTruthError(
        "MISSING_PRICING_CONTEXT",
        "pricelistId and currencyId are required on the order or in truthOverrides"
      );
    }

    let exchangeRate: string | null | undefined = truthOverrides?.exchangeRate ?? null;
    let exchangeRateSource: string | null | undefined = truthOverrides?.exchangeRateSource ?? null;
    if (exchangeRate == null && exchangeRateSource == null) {
      if (order.exchangeRateUsed != null && order.exchangeRateSource) {
        exchangeRate = String(order.exchangeRateUsed);
        exchangeRateSource = order.exchangeRateSource;
      }
    }
    const hasRate = exchangeRate != null && exchangeRate !== "";
    const hasSource = exchangeRateSource != null && exchangeRateSource !== "";
    if (hasRate !== hasSource) {
      throw new ConfirmSalesOrderTruthError(
        "INVALID_EXCHANGE_PAIR",
        "exchangeRate and exchangeRateSource must both be set or both omitted"
      );
    }

    const exchangeRateValue = hasRate ? (exchangeRate as string) : null;
    const exchangeRateSourceValue = hasSource ? (exchangeRateSource as string) : null;

    const status = await getSalesOrderDocumentPricingDecisionStatus(
      tx as unknown as Database,
      tenantId,
      orderId
    );
    if (status.kind === "missing") {
      throw new ConfirmSalesOrderTruthError(
        "MISSING_DOCUMENT_PRICING_DECISION",
        "confirm requires price_resolutions rows with a shared pricing_decision_id for this order"
      );
    }
    if (status.kind === "ambiguous") {
      throw new ConfirmSalesOrderTruthError(
        "AMBIGUOUS_DOCUMENT_PRICING_DECISION",
        `order has multiple pricing_decision_id values on line resolutions: ${status.decisionIds.join(", ")}`
      );
    }
    if (
      truthOverrides?.pricingDecisionId != null &&
      truthOverrides.pricingDecisionId !== status.decisionId
    ) {
      throw new ConfirmSalesOrderTruthError(
        "AMBIGUOUS_DOCUMENT_PRICING_DECISION",
        "truthOverrides.pricingDecisionId must match the single pricing_decision_id on all line resolutions"
      );
    }
    const pricingDecisionId = truthOverrides?.pricingDecisionId ?? status.decisionId;

    await finalizePricingDecisionIfDraft(tx as unknown as Database, {
      tenantId,
      pricingDecisionId,
      actorUserId,
    });

    const ctxBase: ConfirmSalesOrderTruthContext = {
      db: tx as unknown as Database,
      tenantId,
      orderId,
      actorUserId,
      order,
    };

    await hooks?.assertCreditOk?.(ctxBase);

    let inventoryReservationSucceeded = !(truthPolicy?.requireInventoryReservation ?? false);
    if (truthPolicy?.requireInventoryReservation) {
      if (!hooks?.reserveInventory) {
        inventoryReservationSucceeded = false;
      } else {
        await hooks.reserveInventory(ctxBase);
        inventoryReservationSucceeded = true;
      }
    }

    const [orderForTruth] = await tx
      .select()
      .from(salesOrders)
      .where(and(eq(salesOrders.tenantId, tenantId), eq(salesOrders.id, orderId)))
      .limit(1);

    if (!orderForTruth) {
      throw new ConfirmSalesOrderTruthError("ORDER_NOT_FOUND", `sales order ${orderId} not found`);
    }

    const ctxAfterCredit: ConfirmSalesOrderTruthContext = { ...ctxBase, order: orderForTruth };
    await hooks?.assertGlReadiness?.(ctxAfterCredit);

    let truthInput: SalesOrderDocumentTruthInput;
    try {
      truthInput = await evaluateSalesOrderTruthCommitOrThrow(tx as unknown as Database, {
        tenantId,
        orderId,
        order: orderForTruth,
        policy: truthPolicy,
        pricing: {
          pricelistId,
          currencyId,
          exchangeRatePairValid: hasRate === hasSource,
        },
        inventoryReservationSucceeded,
        creditOverride: truthOverrides?.creditCommitSnapshot,
      });
    } catch (e) {
      if (e instanceof TruthPipelineBlockedError) {
        throw new ConfirmSalesOrderTruthError("TRUTH_PIPELINE_BLOCKED", e.message);
      }
      throw e;
    }

    await tx
      .insert(documentTruthLinks)
      .values({
        tenantId,
        orderId,
        pricingDecisionId,
        pricelistId,
        currencyId,
        paymentTermId: truthOverrides?.paymentTermId ?? order.paymentTermId ?? null,
        exchangeRate: exchangeRateValue,
        exchangeRateSource: exchangeRateSourceValue,
        lockedAt,
        lockReason: truthOverrides?.lockReason ?? "order_confirmed",
        createdBy: actorUserId,
        updatedBy: actorUserId,
      })
      .onConflictDoNothing({
        target: [documentTruthLinks.tenantId, documentTruthLinks.orderId],
      });

    const [truthLink] = await tx
      .select({ id: documentTruthLinks.id })
      .from(documentTruthLinks)
      .where(
        and(
          eq(documentTruthLinks.tenantId, tenantId),
          eq(documentTruthLinks.orderId, orderId)
        )
      )
      .limit(1);

    if (!truthLink) {
      throw new ConfirmSalesOrderTruthError(
        "MISSING_PRICING_CONTEXT",
        "document_truth_links row missing after insert; cannot create truth binding"
      );
    }

    await tx
      .update(salesOrders)
      .set({
        status: "sale",
        confirmationDate: lockedAt,
        confirmedBy: actorUserId,
        activePricingDecisionId: pricingDecisionId,
        updatedBy: actorUserId,
      })
      .where(and(eq(salesOrders.tenantId, tenantId), eq(salesOrders.id, orderId)));

    const [freshOrder] = await tx
      .select()
      .from(salesOrders)
      .where(and(eq(salesOrders.tenantId, tenantId), eq(salesOrders.id, orderId)))
      .limit(1);

    if (!freshOrder) {
      throw new ConfirmSalesOrderTruthError("ORDER_NOT_FOUND", `sales order ${orderId} not found after update`);
    }

    await ensureSalesOrderTruthBinding(tx as unknown as Database, {
      tenantId,
      orderId,
      actorUserId,
      lockedAt,
      order: freshOrder,
      orderForLockPayloads: orderForTruth,
      priceTruthLinkId: truthLink.id,
      committedPricelistId: pricelistId,
      committedCurrencyId: currencyId,
      committedExchangeRate: exchangeRateValue,
      committedExchangeRateSource: exchangeRateSourceValue,
      truthCommitInput: truthInput,
      invariantHooks: truthInvariantHooks,
    });

    return { status: "confirmed" };
  }
}

/**
 * Same as {@link confirmSalesOrderTruthInTransaction} in its own transaction.
 */
export async function confirmSalesOrderTruth(
  db: Database,
  input: ConfirmSalesOrderTruthInput
): Promise<ConfirmSalesOrderTruthResult> {
  return db.transaction(async (tx) =>
    confirmSalesOrderTruthInTransaction(tx as unknown as Database, input)
  );
}
