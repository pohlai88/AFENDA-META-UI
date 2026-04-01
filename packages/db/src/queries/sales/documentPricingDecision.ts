import { and, count, desc, eq, max, sql } from "drizzle-orm";

import type { Database } from "../../drizzle/db.js";
import { pricingDecisions } from "../../schema/sales/pricingDecisions.js";
import { priceResolutions } from "../../schema/sales/pricingTruth.js";

import { computePricingDocumentInputsDigest } from "./pricingDigest.js";

/**
 * Invariant: a **final** `sales_order_pricing_decisions` row must have at least this many
 * `sales_order_price_resolutions` rows (app pre-check in {@link finalizePricingDecisionIfDraft}; DB trigger enforces on final).
 */
export const FINALIZE_PRICING_DECISION_MIN_RESOLUTION_COUNT = 1;

export async function finalizePricingDecisionIfDraft(
  db: Database,
  input: { tenantId: number; pricingDecisionId: string; actorUserId: number }
): Promise<{ finalized: boolean }> {
  const [row] = await db
    .select({ status: pricingDecisions.status })
    .from(pricingDecisions)
    .where(
      and(
        eq(pricingDecisions.tenantId, input.tenantId),
        eq(pricingDecisions.id, input.pricingDecisionId)
      )
    )
    .limit(1);

  if (!row) {
    throw new Error(`finalizePricingDecisionIfDraft: pricing_decision ${input.pricingDecisionId} not found`);
  }
  if (row.status === "final") {
    return { finalized: false };
  }

  const [agg] = await db
    .select({ n: count() })
    .from(priceResolutions)
    .where(eq(priceResolutions.pricingDecisionId, input.pricingDecisionId));

  const n = Number(agg?.n ?? 0);
  if (n < FINALIZE_PRICING_DECISION_MIN_RESOLUTION_COUNT) {
    throw new Error(
      `finalizePricingDecisionIfDraft: cannot finalize pricing_decision without at least ${FINALIZE_PRICING_DECISION_MIN_RESOLUTION_COUNT} price_resolution row(s)`
    );
  }

  await db
    .update(pricingDecisions)
    .set({
      status: "final",
      updatedBy: input.actorUserId,
      updatedAt: sql`now()`,
    })
    .where(
      and(
        eq(pricingDecisions.tenantId, input.tenantId),
        eq(pricingDecisions.id, input.pricingDecisionId),
        eq(pricingDecisions.status, "draft")
      )
    );

  return { finalized: true };
}

/**
 * Freezes a **draft** decision (idempotent if already `final`). Requires ≥1 `price_resolutions` row.
 */
export async function finalizePricingDecision(
  db: Database,
  input: { tenantId: number; pricingDecisionId: string; actorUserId: number }
): Promise<void> {
  await finalizePricingDecisionIfDraft(db, input);
}

type PricingDecisionHeadInput = {
  tenantId: number;
  orderId: string;
  actorUserId: number;
  pricingEngineVersion?: string;
  /** Defaults to `{}` when omitted (line-only persist path). */
  documentInputs?: Record<string, unknown>;
  documentInputsDigest?: string;
};

/**
 * Returns the active **draft** head, or creates one (first version or bump from an active **final** head).
 */
export async function ensurePricingDecisionHeadForDocument(
  db: Database,
  input: PricingDecisionHeadInput
): Promise<{ pricingDecisionId: string; created: boolean; bumpedFromFinal: boolean }> {
  const engine = input.pricingEngineVersion ?? "v1";
  const docInputs = input.documentInputs ?? {};
  const digest =
    input.documentInputsDigest ?? computePricingDocumentInputsDigest(docInputs, engine);

  const docPredicate = and(
    eq(pricingDecisions.tenantId, input.tenantId),
    eq(pricingDecisions.orderId, input.orderId)
  );

  const [activeDraft] = await db
    .select({ id: pricingDecisions.id })
    .from(pricingDecisions)
    .where(
      and(
        docPredicate,
        eq(pricingDecisions.isActive, true),
        eq(pricingDecisions.status, "draft")
      )
    )
    .orderBy(desc(pricingDecisions.decisionVersion))
    .limit(1);

  if (activeDraft) {
    return { pricingDecisionId: activeDraft.id, created: false, bumpedFromFinal: false };
  }

  const [activeOther] = await db
    .select({ id: pricingDecisions.id, status: pricingDecisions.status })
    .from(pricingDecisions)
    .where(and(docPredicate, eq(pricingDecisions.isActive, true)))
    .orderBy(desc(pricingDecisions.decisionVersion))
    .limit(1);

  if (activeOther?.status === "final") {
    const bumped = await bumpDocumentPricingDecisionVersion(db, {
      ...input,
      pricingEngineVersion: engine,
      documentInputs: docInputs,
      documentInputsDigest: digest,
    });
    return {
      pricingDecisionId: bumped.pricingDecisionId,
      created: true,
      bumpedFromFinal: true,
    };
  }

  const [countRow] = await db
    .select({ n: count() })
    .from(pricingDecisions)
    .where(docPredicate);
  const total = Number(countRow?.n ?? 0);

  if (total === 0) {
    const [ins] = await db
      .insert(pricingDecisions)
      .values({
        tenantId: input.tenantId,
        orderId: input.orderId,
        decisionVersion: 1,
        isActive: true,
        status: "draft",
        pricingEngineVersion: engine,
        documentInputs: docInputs,
        documentInputsDigest: digest,
        createdBy: input.actorUserId,
        updatedBy: input.actorUserId,
      })
      .returning({ id: pricingDecisions.id });

    if (!ins) {
      throw new Error("ensurePricingDecisionHeadForDocument: insert returned no row");
    }
    return { pricingDecisionId: ins.id, created: true, bumpedFromFinal: false };
  }

  const bumped = await bumpDocumentPricingDecisionVersion(db, {
    ...input,
    pricingEngineVersion: engine,
    documentInputs: docInputs,
    documentInputsDigest: digest,
  });
  return {
    pricingDecisionId: bumped.pricingDecisionId,
    created: true,
    bumpedFromFinal: false,
  };
}

export type SalesOrderDocumentPricingDecisionStatus =
  | { kind: "ok"; decisionId: string }
  | { kind: "missing" }
  | { kind: "ambiguous"; decisionIds: string[] };

/**
 * Resolves the **active** `sales_order_pricing_decisions` head referenced by line resolutions (any `status`).
 * Call `finalizePricingDecisionIfDraft` before inserting `sales_order_document_truth_links` (DB requires `status = final`).
 */
export async function getSalesOrderDocumentPricingDecisionStatus(
  db: Database,
  tenantId: number,
  orderId: string
): Promise<SalesOrderDocumentPricingDecisionStatus> {
  const rows = await db
    .select({ id: priceResolutions.pricingDecisionId })
    .from(priceResolutions)
    .innerJoin(pricingDecisions, eq(priceResolutions.pricingDecisionId, pricingDecisions.id))
    .where(
      and(
        eq(priceResolutions.tenantId, tenantId),
        eq(priceResolutions.orderId, orderId),
        eq(pricingDecisions.tenantId, tenantId),
        eq(pricingDecisions.isActive, true)
      )
    )
    .groupBy(priceResolutions.pricingDecisionId);

  const ids = rows.map((r) => r.id);
  if (ids.length === 0) return { kind: "missing" };
  if (ids.length > 1) return { kind: "ambiguous", decisionIds: ids };
  return { kind: "ok", decisionId: ids[0]! };
}

/**
 * Starts a new document-level pricing run (`decision_version + 1`), deactivates siblings, activates the new **draft** row.
 */
export async function bumpDocumentPricingDecisionVersion(
  db: Database,
  input: PricingDecisionHeadInput
): Promise<{ pricingDecisionId: string; decisionVersion: number }> {
  const engine = input.pricingEngineVersion ?? "v1";
  const docInputs = input.documentInputs ?? {};
  const digest =
    input.documentInputsDigest ?? computePricingDocumentInputsDigest(docInputs, engine);

  const docPredicate = and(
    eq(pricingDecisions.tenantId, input.tenantId),
    eq(pricingDecisions.orderId, input.orderId)
  );

  await db
    .update(pricingDecisions)
    .set({
      isActive: false,
      updatedBy: input.actorUserId,
      updatedAt: sql`now()`,
    })
    .where(docPredicate);

  const [agg] = await db
    .select({ maxV: max(pricingDecisions.decisionVersion) })
    .from(pricingDecisions)
    .where(docPredicate);
  const prev = agg?.maxV == null ? 0 : typeof agg.maxV === "number" ? agg.maxV : Number(agg.maxV);
  const decisionVersion = prev + 1;

  const [ins] = await db
    .insert(pricingDecisions)
    .values({
      tenantId: input.tenantId,
      orderId: input.orderId,
      decisionVersion,
      isActive: true,
      status: "draft",
      pricingEngineVersion: engine,
      documentInputs: docInputs,
      documentInputsDigest: digest,
      createdBy: input.actorUserId,
      updatedBy: input.actorUserId,
    })
    .returning({ id: pricingDecisions.id });

  if (!ins) {
    throw new Error("bumpDocumentPricingDecisionVersion: insert returned no row");
  }
  return { pricingDecisionId: ins.id, decisionVersion };
}
