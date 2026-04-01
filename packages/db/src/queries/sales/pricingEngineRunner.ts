import { and, asc, eq, isNull, sql } from "drizzle-orm";

import type { Database } from "../../drizzle/db.js";
import { salesOrderLines, salesOrders } from "../../schema/sales/orders.js";
import type { PriceResolutionInputSnapshot } from "../../schema/sales/pricingTruth.js";

import {
  bumpDocumentPricingDecisionVersion,
  finalizePricingDecision,
  ensurePricingDecisionHeadForDocument,
} from "./documentPricingDecision.js";
import { assertLineOutputsSufficientForFinalize } from "./pricingDecisionEngine.js";
import { computePricingDocumentInputsDigest } from "./pricingDigest.js";
import { persistLineResolution, type PersistLineResolutionInput } from "./persistLineResolution.js";

const DOCUMENT_INPUTS_SCHEMA = "sales_order_pricing_inputs_v1" as const;

/**
 * Normalized document-level pricing engine input (hashed into `pricing_decisions.document_inputs_digest`).
 */
export async function buildSalesOrderPricingDocumentInputs(
  db: Database,
  tenantId: number,
  orderId: string
): Promise<Record<string, unknown>> {
  const [order] = await db
    .select({
      id: salesOrders.id,
      partnerId: salesOrders.partnerId,
      pricelistId: salesOrders.pricelistId,
      currencyId: salesOrders.currencyId,
      paymentTermId: salesOrders.paymentTermId,
      fiscalPositionId: salesOrders.fiscalPositionId,
      status: salesOrders.status,
    })
    .from(salesOrders)
    .where(and(eq(salesOrders.tenantId, tenantId), eq(salesOrders.id, orderId)))
    .limit(1);

  if (!order) {
    throw new Error(`buildSalesOrderPricingDocumentInputs: order ${orderId} not found`);
  }

  const lines = await db
    .select({
      lineId: salesOrderLines.id,
      productId: salesOrderLines.productId,
      productTemplateId: salesOrderLines.productTemplateId,
      quantity: salesOrderLines.quantity,
      productUomId: salesOrderLines.productUomId,
      displayType: salesOrderLines.displayType,
      sequence: salesOrderLines.sequence,
    })
    .from(salesOrderLines)
    .where(
      and(
        eq(salesOrderLines.tenantId, tenantId),
        eq(salesOrderLines.orderId, orderId),
        isNull(salesOrderLines.deletedAt)
      )
    )
    .orderBy(asc(salesOrderLines.sequence));

  return {
    schema: DOCUMENT_INPUTS_SCHEMA,
    order: {
      id: order.id,
      partner_id: order.partnerId,
      pricelist_id: order.pricelistId,
      currency_id: order.currencyId,
      payment_term_id: order.paymentTermId,
      fiscal_position_id: order.fiscalPositionId,
      status: order.status,
    },
    lines: lines.map((l) => ({
      line_id: l.lineId,
      product_id: l.productId,
      product_template_id: l.productTemplateId,
      quantity: String(l.quantity),
      uom_id: l.productUomId,
      display_type: l.displayType,
      sequence: l.sequence,
    })),
  };
}

export type PricingEngineLinePersistInput = Omit<
  PersistLineResolutionInput,
  "tenantId" | "orderId" | "pricingDecisionId" | "createdBy" | "updatedBy"
> & { lineId: string };

export type RunSalesOrderPricingEngineInput = {
  tenantId: number;
  orderId: string;
  actorUserId: number;
  /** Per product line outputs (pure resolver results). */
  lineOutputs: PricingEngineLinePersistInput[];
  /** When omitted, built from the current order + lines snapshot. */
  documentInputs?: Record<string, unknown>;
  pricingEngineVersion?: string;
  /**
   * When true (default), starts a fresh `decision_version` and deactivates prior heads (full engine run).
   * When false, attaches lines to the current active draft via `ensurePricingDecisionHeadForDocument` (same digest/inputs).
   */
  bumpVersion?: boolean;
  /** When true (default), sets `pricing_decisions.status` → `final` after all lines persist. */
  finalizeDecision?: boolean;
};

/**
 * Orchestrates: **inputs → pricing_decision → price_resolutions** (optional finalize for truth lock).
 * Truth binding / `document_truth_links` remain a separate commit step (`confirmSalesOrderTruth`).
 */
export async function runSalesOrderPricingEngine(
  db: Database,
  input: RunSalesOrderPricingEngineInput
): Promise<{ pricingDecisionId: string; decisionVersion?: number }> {
  if (input.finalizeDecision !== false) {
    assertLineOutputsSufficientForFinalize(input.lineOutputs);
  }

  const engine = input.pricingEngineVersion ?? "v1";
  const docInputs =
    input.documentInputs ??
    (await buildSalesOrderPricingDocumentInputs(db, input.tenantId, input.orderId));
  const digest = computePricingDocumentInputsDigest(
    docInputs as Record<string, unknown>,
    engine
  );

  let pricingDecisionId: string;
  let decisionVersion: number | undefined;

  const bump = input.bumpVersion !== false;

  if (bump) {
    const bumped = await bumpDocumentPricingDecisionVersion(db, {
      tenantId: input.tenantId,
      orderId: input.orderId,
      actorUserId: input.actorUserId,
      pricingEngineVersion: engine,
      documentInputs: docInputs as Record<string, unknown>,
      documentInputsDigest: digest,
    });
    pricingDecisionId = bumped.pricingDecisionId;
    decisionVersion = bumped.decisionVersion;
  } else {
    const ensured = await ensurePricingDecisionHeadForDocument(db, {
      tenantId: input.tenantId,
      orderId: input.orderId,
      actorUserId: input.actorUserId,
      pricingEngineVersion: engine,
      documentInputs: docInputs as Record<string, unknown>,
      documentInputsDigest: digest,
    });
    pricingDecisionId = ensured.pricingDecisionId;
  }

  for (const line of input.lineOutputs) {
    await persistLineResolution(db, {
      tenantId: input.tenantId,
      orderId: input.orderId,
      lineId: line.lineId,
      createdBy: input.actorUserId,
      updatedBy: input.actorUserId,
      inputSnapshot: line.inputSnapshot as PriceResolutionInputSnapshot | Record<string, unknown>,
      appliedRuleIds: line.appliedRuleIds,
      basePrice: line.basePrice,
      finalPrice: line.finalPrice,
      currencyId: line.currencyId,
      exchangeRate: line.exchangeRate,
      exchangeRateSource: line.exchangeRateSource,
      overrideApprovedBy: line.overrideApprovedBy,
      pricingEngineVersion: line.pricingEngineVersion ?? engine,
      pricingDecisionId,
      lockedAt: line.lockedAt,
      resolutionVersion: line.resolutionVersion,
    });
  }

  const shouldFinalize = input.finalizeDecision !== false;
  if (shouldFinalize) {
    await finalizePricingDecision(db, {
      tenantId: input.tenantId,
      pricingDecisionId,
      actorUserId: input.actorUserId,
    });
  }

  await db
    .update(salesOrders)
    .set({
      activePricingDecisionId: pricingDecisionId,
      updatedBy: input.actorUserId,
      updatedAt: sql`now()`,
    })
    .where(and(eq(salesOrders.tenantId, input.tenantId), eq(salesOrders.id, input.orderId)));

  return { pricingDecisionId, decisionVersion };
}
