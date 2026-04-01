import { and, eq } from "drizzle-orm";
import { Decimal } from "decimal.js";

import type { Database } from "../../drizzle/db.js";
import { partnerFinancialProjections, partners } from "../../schema/sales/partner.js";

/**
 * Bridge path: hydrate `partner_financial_projections` from legacy `partners.total_invoiced` /
 * `total_due` until append-only `partner_events` fully drives the read model.
 *
 * `total_paid` is derived as `max(0, total_invoiced - total_due)` — a pragmatic stand-in until
 * payment events are authoritative.
 */
export async function upsertPartnerFinancialProjectionFromLegacyPartner(
  db: Database,
  tenantId: number,
  partnerId: string
): Promise<void> {
  const [row] = await db
    .select({
      totalInvoiced: partners.totalInvoiced,
      totalDue: partners.totalDue,
      creditLimit: partners.creditLimit,
    })
    .from(partners)
    .where(and(eq(partners.tenantId, tenantId), eq(partners.id, partnerId)))
    .limit(1);

  if (!row) return;

  const invoiced = new Decimal(row.totalInvoiced);
  const due = new Decimal(row.totalDue);
  const paid = Decimal.max(0, invoiced.minus(due)).toFixed(2);
  const now = new Date();

  await db
    .insert(partnerFinancialProjections)
    .values({
      tenantId,
      partnerId,
      totalInvoiced: row.totalInvoiced,
      totalPaid: paid,
      totalOutstanding: row.totalDue,
      creditLimit: row.creditLimit,
      lastUpdatedAt: now,
    })
    .onConflictDoUpdate({
      target: [partnerFinancialProjections.tenantId, partnerFinancialProjections.partnerId],
      set: {
        totalInvoiced: row.totalInvoiced,
        totalPaid: paid,
        totalOutstanding: row.totalDue,
        creditLimit: row.creditLimit,
        lastUpdatedAt: now,
      },
    });
}
