import type { Database } from "../../drizzle/db.js";
import type { PriceResolutionEventType } from "../../schema/sales/_enums.js";
import { priceResolutionEvents } from "../../schema/sales/pricingTruth.js";

/**
 * Append `recomputed` / `overridden` (or custom) events. Do not emit `resolved` — that is inserted by the
 * DB trigger on `price_resolutions` INSERT; `locked` is emitted when `locked_at` is set (incl. order confirm sync).
 */
export async function appendPriceResolutionEvent(
  db: Database,
  input: {
    tenantId: number;
    resolutionId: string;
    eventType: Exclude<PriceResolutionEventType, "resolved" | "locked">;
    createdBy: number;
    payload?: Record<string, unknown>;
  }
): Promise<void> {
  await db.insert(priceResolutionEvents).values({
    tenantId: input.tenantId,
    resolutionId: input.resolutionId,
    eventType: input.eventType,
    createdBy: input.createdBy,
    payload: input.payload ?? {},
  });
}
