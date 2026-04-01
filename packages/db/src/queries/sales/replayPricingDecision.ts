import { and, eq } from "drizzle-orm";

import type { Database } from "../../drizzle/db.js";
import { pricingDecisions } from "../../schema/sales/pricingDecisions.js";

import { computePricingDocumentInputsDigest } from "./pricingDigest.js";

export type ReplayPricingDecisionResult =
  | { ok: true; computedDigest: string; storedDigest: string; pricingEngineVersion: string }
  | { ok: false; computedDigest: string; storedDigest: string; pricingEngineVersion: string };

/**
 * Recomputes the document-input digest from stored `document_inputs` + `pricing_engine_version`.
 * Returns `ok` when it matches `document_inputs_digest`.
 */
export async function replayPricingDecisionDigest(
  db: Database,
  input: { tenantId: number; pricingDecisionId: string }
): Promise<ReplayPricingDecisionResult> {
  const [row] = await db
    .select({
      documentInputs: pricingDecisions.documentInputs,
      documentInputsDigest: pricingDecisions.documentInputsDigest,
      pricingEngineVersion: pricingDecisions.pricingEngineVersion,
    })
    .from(pricingDecisions)
    .where(
      and(
        eq(pricingDecisions.tenantId, input.tenantId),
        eq(pricingDecisions.id, input.pricingDecisionId)
      )
    )
    .limit(1);

  if (!row) {
    throw new Error(`replayPricingDecisionDigest: pricing_decision ${input.pricingDecisionId} not found`);
  }

  const inputs =
    row.documentInputs && typeof row.documentInputs === "object" && !Array.isArray(row.documentInputs)
      ? (row.documentInputs as Record<string, unknown>)
      : {};

  const computedDigest = computePricingDocumentInputsDigest(inputs, row.pricingEngineVersion);
  const storedDigest = row.documentInputsDigest;
  const ok = computedDigest === storedDigest;
  return ok
    ? {
        ok: true,
        computedDigest,
        storedDigest,
        pricingEngineVersion: row.pricingEngineVersion,
      }
    : {
        ok: false,
        computedDigest,
        storedDigest,
        pricingEngineVersion: row.pricingEngineVersion,
      };
}
