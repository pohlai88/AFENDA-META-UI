// @generated
// Full access scaffold — tools/ci-gate/db-access-layer (emit-full).
// Human-owned reporting: use separate modules (not *.access.ts).

import { and, eq, isNull } from "drizzle-orm";
import type { Database } from "../../db.js";
import {
  employeePromotions,
  employeeTransfers,
  fullFinalSettlements,
  hrExitInterviews,
} from "../../schema/hr/lifecycle.js";

/** Safe by ID: tenant + not soft-deleted. */
export async function getEmployeePromotionsByIdSafe(
  db: Database,
  tenantId: (typeof employeePromotions.$inferSelect)["tenantId"],
  id: (typeof employeePromotions.$inferSelect)["id"],
) {
  const rows = await db
    .select()
    .from(employeePromotions)
    .where(
      and(
        eq(employeePromotions.tenantId, tenantId),
        eq(employeePromotions.id, id),
        isNull(employeePromotions.deletedAt),
      ),
    )
    .limit(1);
  return rows[0] ?? null;
}

/** List rows for tenant excluding soft-deleted. */
export async function listEmployeePromotionsActive(
  db: Database,
  tenantId: (typeof employeePromotions.$inferSelect)["tenantId"],
) {
  return await db
    .select()
    .from(employeePromotions)
    .where(and(eq(employeePromotions.tenantId, tenantId), isNull(employeePromotions.deletedAt)));
}

/** List all rows for tenant including soft-deleted. */
export async function listEmployeePromotionsAll(
  db: Database,
  tenantId: (typeof employeePromotions.$inferSelect)["tenantId"],
) {
  return await db.select().from(employeePromotions).where(eq(employeePromotions.tenantId, tenantId));
}

/** Soft-archive (mechanical delete flag). */
export async function archiveEmployeePromotions(
  db: Database,
  tenantId: (typeof employeePromotions.$inferSelect)["tenantId"],
  id: (typeof employeePromotions.$inferSelect)["id"],
) {
  return await db
    .update(employeePromotions)
    .set({ deletedAt: new Date() })
    .where(and(eq(employeePromotions.tenantId, tenantId), eq(employeePromotions.id, id)));
}


/** Safe by ID: tenant + not soft-deleted. */
export async function getEmployeeTransfersByIdSafe(
  db: Database,
  tenantId: (typeof employeeTransfers.$inferSelect)["tenantId"],
  id: (typeof employeeTransfers.$inferSelect)["id"],
) {
  const rows = await db
    .select()
    .from(employeeTransfers)
    .where(
      and(
        eq(employeeTransfers.tenantId, tenantId),
        eq(employeeTransfers.id, id),
        isNull(employeeTransfers.deletedAt),
      ),
    )
    .limit(1);
  return rows[0] ?? null;
}

/** List rows for tenant excluding soft-deleted. */
export async function listEmployeeTransfersActive(
  db: Database,
  tenantId: (typeof employeeTransfers.$inferSelect)["tenantId"],
) {
  return await db
    .select()
    .from(employeeTransfers)
    .where(and(eq(employeeTransfers.tenantId, tenantId), isNull(employeeTransfers.deletedAt)));
}

/** List all rows for tenant including soft-deleted. */
export async function listEmployeeTransfersAll(
  db: Database,
  tenantId: (typeof employeeTransfers.$inferSelect)["tenantId"],
) {
  return await db.select().from(employeeTransfers).where(eq(employeeTransfers.tenantId, tenantId));
}

/** Soft-archive (mechanical delete flag). */
export async function archiveEmployeeTransfers(
  db: Database,
  tenantId: (typeof employeeTransfers.$inferSelect)["tenantId"],
  id: (typeof employeeTransfers.$inferSelect)["id"],
) {
  return await db
    .update(employeeTransfers)
    .set({ deletedAt: new Date() })
    .where(and(eq(employeeTransfers.tenantId, tenantId), eq(employeeTransfers.id, id)));
}


/** Safe by ID: tenant + not soft-deleted. */
export async function getHrExitInterviewsByIdSafe(
  db: Database,
  tenantId: (typeof hrExitInterviews.$inferSelect)["tenantId"],
  id: (typeof hrExitInterviews.$inferSelect)["id"],
) {
  const rows = await db
    .select()
    .from(hrExitInterviews)
    .where(
      and(
        eq(hrExitInterviews.tenantId, tenantId),
        eq(hrExitInterviews.id, id),
        isNull(hrExitInterviews.deletedAt),
      ),
    )
    .limit(1);
  return rows[0] ?? null;
}

/** List rows for tenant excluding soft-deleted. */
export async function listHrExitInterviewsActive(
  db: Database,
  tenantId: (typeof hrExitInterviews.$inferSelect)["tenantId"],
) {
  return await db
    .select()
    .from(hrExitInterviews)
    .where(and(eq(hrExitInterviews.tenantId, tenantId), isNull(hrExitInterviews.deletedAt)));
}

/** List all rows for tenant including soft-deleted. */
export async function listHrExitInterviewsAll(
  db: Database,
  tenantId: (typeof hrExitInterviews.$inferSelect)["tenantId"],
) {
  return await db.select().from(hrExitInterviews).where(eq(hrExitInterviews.tenantId, tenantId));
}

/** Soft-archive (mechanical delete flag). */
export async function archiveHrExitInterviews(
  db: Database,
  tenantId: (typeof hrExitInterviews.$inferSelect)["tenantId"],
  id: (typeof hrExitInterviews.$inferSelect)["id"],
) {
  return await db
    .update(hrExitInterviews)
    .set({ deletedAt: new Date() })
    .where(and(eq(hrExitInterviews.tenantId, tenantId), eq(hrExitInterviews.id, id)));
}


/** Safe by ID: tenant + not soft-deleted. */
export async function getFullFinalSettlementsByIdSafe(
  db: Database,
  tenantId: (typeof fullFinalSettlements.$inferSelect)["tenantId"],
  id: (typeof fullFinalSettlements.$inferSelect)["id"],
) {
  const rows = await db
    .select()
    .from(fullFinalSettlements)
    .where(
      and(
        eq(fullFinalSettlements.tenantId, tenantId),
        eq(fullFinalSettlements.id, id),
        isNull(fullFinalSettlements.deletedAt),
      ),
    )
    .limit(1);
  return rows[0] ?? null;
}

/** List rows for tenant excluding soft-deleted. */
export async function listFullFinalSettlementsActive(
  db: Database,
  tenantId: (typeof fullFinalSettlements.$inferSelect)["tenantId"],
) {
  return await db
    .select()
    .from(fullFinalSettlements)
    .where(and(eq(fullFinalSettlements.tenantId, tenantId), isNull(fullFinalSettlements.deletedAt)));
}

/** List all rows for tenant including soft-deleted. */
export async function listFullFinalSettlementsAll(
  db: Database,
  tenantId: (typeof fullFinalSettlements.$inferSelect)["tenantId"],
) {
  return await db.select().from(fullFinalSettlements).where(eq(fullFinalSettlements.tenantId, tenantId));
}

/** Soft-archive (mechanical delete flag). */
export async function archiveFullFinalSettlements(
  db: Database,
  tenantId: (typeof fullFinalSettlements.$inferSelect)["tenantId"],
  id: (typeof fullFinalSettlements.$inferSelect)["id"],
) {
  return await db
    .update(fullFinalSettlements)
    .set({ deletedAt: new Date() })
    .where(and(eq(fullFinalSettlements.tenantId, tenantId), eq(fullFinalSettlements.id, id)));
}

