import { and, eq, inArray } from "drizzle-orm";

import type { Database } from "../../drizzle/db.js";
import { accountingPostings } from "../../schema/sales/governance.js";

/** Draft accrual row created once per binding after order confirmation (idempotent). */
export const ORDER_CONFIRMATION_POSTING_ENTRY_TYPE = "order_confirmation_accrual" as const;

export type EnsureIdempotentOrderConfirmationPostingDraftInput = {
  tenantId: number;
  truthBindingId: string;
  sourceDocumentId: string;
  actorUserId: number;
  amount: string;
  currencyCode: string;
};

export type EnsureIdempotentOrderConfirmationPostingDraftResult = {
  postingId: string;
  created: boolean;
};

/**
 * Ensures a single **draft** `accounting_postings` row for `(tenant, truth_binding_id, entry_type)` while the row
 * is still `draft` or `posted` (partial unique index). Safe to call on every confirm retry.
 */
export async function ensureIdempotentOrderConfirmationPostingDraft(
  db: Database,
  input: EnsureIdempotentOrderConfirmationPostingDraftInput
): Promise<EnsureIdempotentOrderConfirmationPostingDraftResult> {
  const {
    tenantId,
    truthBindingId,
    sourceDocumentId,
    actorUserId,
    amount,
    currencyCode,
  } = input;

  const [existing] = await db
    .select({ id: accountingPostings.id })
    .from(accountingPostings)
    .where(
      and(
        eq(accountingPostings.tenantId, tenantId),
        eq(accountingPostings.truthBindingId, truthBindingId),
        eq(accountingPostings.postingEntryType, ORDER_CONFIRMATION_POSTING_ENTRY_TYPE),
        inArray(accountingPostings.postingStatus, ["draft", "posted"])
      )
    )
    .limit(1);

  if (existing) {
    return { postingId: existing.id, created: false };
  }

  const [row] = await db
    .insert(accountingPostings)
    .values({
      tenantId,
      truthBindingId,
      postingEntryType: ORDER_CONFIRMATION_POSTING_ENTRY_TYPE,
      sourceDocumentType: "sales_order",
      sourceDocumentId,
      postingDate: new Date(),
      amount,
      currencyCode: currencyCode.toUpperCase(),
      postingStatus: "draft",
      createdBy: actorUserId,
      updatedBy: actorUserId,
    })
    .returning({ id: accountingPostings.id });

  if (!row) {
    throw new Error("ensureIdempotentOrderConfirmationPostingDraft: insert returned no row");
  }

  return { postingId: row.id, created: true };
}
