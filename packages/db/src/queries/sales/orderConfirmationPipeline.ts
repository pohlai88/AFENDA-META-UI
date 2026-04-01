/**
 * **Order Confirmation Pipeline** — single-transaction orchestration for pricing truth → financial boundary.
 *
 * ## Contract
 * - **Atomicity**: optional pricing engine + {@link confirmSalesOrderTruthInTransaction} share one DB transaction.
 *   On failure, the whole unit rolls back (no half-priced / half-confirmed order).
 * - **Idempotency**: if the order is already `sale` / `done`, returns `{ status: "already_confirmed" }` without
 *   re-running pricing. APIs should still treat HTTP 200 + this body as success for duplicate submits.
 * - **Correlation**: pass `clientCorrelationId` for logs / outbox; the DB does not store it (add a side table if needed).
 *
 * ## Out of scope (explicit extension points)
 * - Journal lines / partner projection: run **after** this pipeline returns success, or inside `hooks.assertGlReadiness`
 *   with idempotent posting keys, so retries do not double-post.
 */
import type { Database } from "../../drizzle/db.js";
import { and, eq } from "drizzle-orm";

import { currencies } from "../../schema/reference/tables.js";
import { salesOrders } from "../../schema/sales/orders.js";

import {
  confirmSalesOrderTruthInTransaction,
  type ConfirmSalesOrderTruthInput,
  type ConfirmSalesOrderTruthResult,
  ConfirmSalesOrderTruthError,
} from "./confirmSalesOrderTruth.js";
import { ensureIdempotentOrderConfirmationPostingDraft } from "./idempotentAccountingPosting.js";
import {
  runSalesOrderPricingEngine,
  type RunSalesOrderPricingEngineInput,
} from "./pricingEngineRunner.js";
import { getActiveTruthBinding } from "./truthCommitEngine.js";

/** Ordered stages for observability and error mapping. */
export type OrderConfirmationStage =
  | "precheck"
  | "pricing_engine"
  | "truth_confirm"
  | "post_confirm";

export class OrderConfirmationPipelineError extends Error {
  constructor(
    readonly stage: OrderConfirmationStage,
    message: string,
    readonly cause?: unknown
  ) {
    super(message);
    this.name = "OrderConfirmationPipelineError";
  }
}

export type OrderConfirmationPipelineInput = ConfirmSalesOrderTruthInput & {
  /**
   * When set, runs {@link runSalesOrderPricingEngine} in the **same** transaction before truth confirm.
   * Omit when pricing was already persisted (e.g. user reviewed lines, then confirms).
   */
  pricing?: Pick<
    RunSalesOrderPricingEngineInput,
    "lineOutputs" | "bumpVersion" | "finalizeDecision" | "pricingEngineVersion" | "documentInputs"
  >;
  /** Idempotency / audit correlation (optional). */
  clientCorrelationId?: string;
};

export type OrderConfirmationPipelineResult = ConfirmSalesOrderTruthResult & {
  stagesExecuted: OrderConfirmationStage[];
  /** Set when pricing stage ran or confirm resolved a decision id (best-effort on already_confirmed). */
  pricingDecisionId?: string;
};

async function runPostConfirmPostingStep(
  txdb: Database,
  input: { tenantId: number; orderId: string; actorUserId: number },
  options: { requireTruthBinding: boolean }
): Promise<void> {
  const binding = await getActiveTruthBinding(txdb, input.tenantId, "sales_order", input.orderId);
  if (!binding) {
    if (options.requireTruthBinding) {
      throw new OrderConfirmationPipelineError(
        "post_confirm",
        "truth binding missing after confirm; cannot anchor accounting stub"
      );
    }
    return;
  }

  const [orderMoney] = await txdb
    .select({
      amountTotal: salesOrders.amountTotal,
      currencyId: salesOrders.currencyId,
    })
    .from(salesOrders)
    .where(and(eq(salesOrders.tenantId, input.tenantId), eq(salesOrders.id, input.orderId)))
    .limit(1);

  if (!orderMoney?.currencyId) {
    throw new OrderConfirmationPipelineError("post_confirm", "order currency missing");
  }

  const [cur] = await txdb
    .select({ code: currencies.code })
    .from(currencies)
    .where(eq(currencies.currencyId, orderMoney.currencyId))
    .limit(1);

  const currencyCode = (cur?.code ?? "USD").trim().toUpperCase() || "USD";

  await ensureIdempotentOrderConfirmationPostingDraft(txdb, {
    tenantId: input.tenantId,
    truthBindingId: binding.id,
    sourceDocumentId: input.orderId,
    actorUserId: input.actorUserId,
    amount: String(orderMoney.amountTotal ?? "0"),
    currencyCode,
  });
}

function mapConfirmCodeToStage(
  code: ConfirmSalesOrderTruthError["code"]
): OrderConfirmationStage {
  switch (code) {
    case "ORDER_NOT_FOUND":
    case "ORDER_NOT_CONFIRMABLE":
      return "precheck";
    case "MISSING_PRICING_CONTEXT":
    case "MISSING_DOCUMENT_PRICING_DECISION":
    case "AMBIGUOUS_DOCUMENT_PRICING_DECISION":
    case "INVALID_EXCHANGE_PAIR":
      return "truth_confirm";
    case "TRUTH_PIPELINE_BLOCKED":
      return "truth_confirm";
    default:
      return "truth_confirm";
  }
}

/**
 * Runs optional pricing + sales-order truth confirmation in **one** transaction.
 */
export async function runOrderConfirmationPipeline(
  db: Database,
  input: OrderConfirmationPipelineInput
): Promise<OrderConfirmationPipelineResult> {
  const { pricing, clientCorrelationId: _correlation, ...confirmInput } = input;
  const stagesExecuted: OrderConfirmationStage[] = [];

  return db.transaction(async (tx) => {
    const txdb = tx as unknown as Database;

    const [orderRow] = await tx
      .select({
        id: salesOrders.id,
        status: salesOrders.status,
      })
      .from(salesOrders)
      .where(
        and(eq(salesOrders.tenantId, input.tenantId), eq(salesOrders.id, input.orderId))
      )
      .limit(1);

    if (!orderRow) {
      throw new OrderConfirmationPipelineError(
        "precheck",
        `sales order ${input.orderId} not found`
      );
    }

    if (orderRow.status === "sale" || orderRow.status === "done") {
      stagesExecuted.push("post_confirm");
      try {
        await runPostConfirmPostingStep(
          txdb,
          {
            tenantId: input.tenantId,
            orderId: input.orderId,
            actorUserId: input.actorUserId,
          },
          { requireTruthBinding: false }
        );
      } catch (e) {
        if (e instanceof OrderConfirmationPipelineError) {
          throw e;
        }
        throw new OrderConfirmationPipelineError(
          "post_confirm",
          e instanceof Error ? e.message : "post confirm failed",
          e
        );
      }
      return {
        status: "already_confirmed",
        stagesExecuted,
        pricingDecisionId: undefined,
      };
    }

    let pricingDecisionId: string | undefined;

    if (pricing?.lineOutputs?.length) {
      stagesExecuted.push("pricing_engine");
      try {
        const pr = await runSalesOrderPricingEngine(txdb, {
          tenantId: input.tenantId,
          orderId: input.orderId,
          actorUserId: input.actorUserId,
          lineOutputs: pricing.lineOutputs,
          documentInputs: pricing.documentInputs,
          pricingEngineVersion: pricing.pricingEngineVersion,
          bumpVersion: pricing.bumpVersion,
          finalizeDecision: pricing.finalizeDecision,
        });
        pricingDecisionId = pr.pricingDecisionId;
      } catch (e) {
        throw new OrderConfirmationPipelineError(
          "pricing_engine",
          e instanceof Error ? e.message : "pricing engine failed",
          e
        );
      }
    }

    stagesExecuted.push("truth_confirm");
    let confirmResult: ConfirmSalesOrderTruthResult;
    try {
      confirmResult = await confirmSalesOrderTruthInTransaction(txdb, confirmInput);
    } catch (e) {
      if (e instanceof ConfirmSalesOrderTruthError) {
        throw new OrderConfirmationPipelineError(
          mapConfirmCodeToStage(e.code),
          e.message,
          e
        );
      }
      throw new OrderConfirmationPipelineError("truth_confirm", "confirm failed", e);
    }

    stagesExecuted.push("post_confirm");
    try {
      await runPostConfirmPostingStep(
        txdb,
        {
          tenantId: input.tenantId,
          orderId: input.orderId,
          actorUserId: input.actorUserId,
        },
        { requireTruthBinding: confirmResult.status === "confirmed" }
      );
    } catch (e) {
      if (e instanceof OrderConfirmationPipelineError) {
        throw e;
      }
      throw new OrderConfirmationPipelineError(
        "post_confirm",
        e instanceof Error ? e.message : "post confirm failed",
        e
      );
    }

    const [after] = await tx
      .select({ activePricingDecisionId: salesOrders.activePricingDecisionId })
      .from(salesOrders)
      .where(and(eq(salesOrders.tenantId, input.tenantId), eq(salesOrders.id, input.orderId)))
      .limit(1);

    return {
      ...confirmResult,
      stagesExecuted,
      pricingDecisionId: pricingDecisionId ?? after?.activePricingDecisionId ?? undefined,
    };
  });
}
