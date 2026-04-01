import { and, eq, max, or } from "drizzle-orm";

import type { Database } from "../../drizzle/db.js";
import { salesOrderLines } from "../../schema/sales/orders.js";
import { pricingDecisions } from "../../schema/sales/pricingDecisions.js";
import { priceResolutions } from "../../schema/sales/pricingTruth.js";

/**
 * Picks a representative `sales_order_price_resolutions.id` for an order (e.g. UI deep-link).
 * Truth binding uses `sales_order_document_truth_links.pricing_decision_id` → `sales_order_pricing_decisions`, not this id.
 * Uses the latest `resolution_version` per line on the **active** decision head, then prefers
 * `display_type = 'product'` lines ordered by `sequence`, then any other line.
 */
export async function pickCanonicalPriceResolutionIdForOrder(
  db: Database,
  tenantId: number,
  orderId: string
): Promise<string | undefined> {
  const latestByLine = await db
    .select({
      lineId: priceResolutions.lineId,
      maxV: max(priceResolutions.resolutionVersion),
    })
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
    .groupBy(priceResolutions.lineId);

  if (latestByLine.length === 0) {
    return undefined;
  }

  const versionClauses = latestByLine.map((r) => {
    const mv = r.maxV == null ? 0 : typeof r.maxV === "number" ? r.maxV : Number(r.maxV);
    return and(eq(priceResolutions.lineId, r.lineId), eq(priceResolutions.resolutionVersion, mv));
  });

  const resolutionRows = await db
    .select({ id: priceResolutions.id, lineId: priceResolutions.lineId })
    .from(priceResolutions)
    .innerJoin(pricingDecisions, eq(priceResolutions.pricingDecisionId, pricingDecisions.id))
    .where(
      and(
        eq(priceResolutions.tenantId, tenantId),
        eq(priceResolutions.orderId, orderId),
        eq(pricingDecisions.tenantId, tenantId),
        eq(pricingDecisions.isActive, true),
        or(...versionClauses)
      )
    );

  const lineMeta = await db
    .select({
      id: salesOrderLines.id,
      sequence: salesOrderLines.sequence,
      displayType: salesOrderLines.displayType,
    })
    .from(salesOrderLines)
    .where(and(eq(salesOrderLines.tenantId, tenantId), eq(salesOrderLines.orderId, orderId)));

  const metaById = new Map(lineMeta.map((l) => [l.id, l]));

  const withMeta = resolutionRows
    .map((r) => {
      const meta = metaById.get(r.lineId);
      return meta ? { id: r.id, meta } : null;
    })
    .filter((x): x is { id: string; meta: (typeof lineMeta)[number] } => x != null)
    .sort((a, b) => {
      const rank = (d: string) => (d === "product" ? 0 : 1);
      const df = rank(a.meta.displayType) - rank(b.meta.displayType);
      if (df !== 0) return df;
      return a.meta.sequence - b.meta.sequence;
    });

  const productPick = withMeta.find((r) => r.meta.displayType === "product");
  if (productPick) {
    return productPick.id;
  }
  return withMeta[0]?.id;
}
