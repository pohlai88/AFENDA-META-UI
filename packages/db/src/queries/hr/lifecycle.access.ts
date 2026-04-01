// @generated
// Full access scaffold — tools/ci-gate/db-access-layer (emit-full).
// Human-owned reporting: use separate modules (not *.access.ts).

import { and, eq, isNull } from "drizzle-orm";
import type { Database } from "../../drizzle/db.js";
import { assertGraphGuardrailAllowsRead } from "../_shared/graph-guardrail.js";
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

/** Same as getEmployeePromotionsByIdSafe; asserts graph-validation policy when GRAPH_VALIDATION_POLICY_JSON is set. */
export async function getEmployeePromotionsByIdSafeGuarded(
  db: Database,
  tenantId: (typeof employeePromotions.$inferSelect)["tenantId"],
  id: (typeof employeePromotions.$inferSelect)["id"],
) {
  await assertGraphGuardrailAllowsRead();
  return getEmployeePromotionsByIdSafe(db, tenantId, id);
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

export async function listEmployeePromotionsActiveGuarded(
  db: Database,
  tenantId: (typeof employeePromotions.$inferSelect)["tenantId"],
) {
  await assertGraphGuardrailAllowsRead();
  return listEmployeePromotionsActive(db, tenantId);
}

/** List all rows for tenant including soft-deleted. */
export async function listEmployeePromotionsAll(
  db: Database,
  tenantId: (typeof employeePromotions.$inferSelect)["tenantId"],
) {
  return await db.select().from(employeePromotions).where(eq(employeePromotions.tenantId, tenantId));
}

export async function listEmployeePromotionsAllGuarded(
  db: Database,
  tenantId: (typeof employeePromotions.$inferSelect)["tenantId"],
) {
  await assertGraphGuardrailAllowsRead();
  return listEmployeePromotionsAll(db, tenantId);
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

export async function archiveEmployeePromotionsGuarded(
  db: Database,
  tenantId: (typeof employeePromotions.$inferSelect)["tenantId"],
  id: (typeof employeePromotions.$inferSelect)["id"],
) {
  await assertGraphGuardrailAllowsRead();
  return archiveEmployeePromotions(db, tenantId, id);
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

/** Same as getEmployeeTransfersByIdSafe; asserts graph-validation policy when GRAPH_VALIDATION_POLICY_JSON is set. */
export async function getEmployeeTransfersByIdSafeGuarded(
  db: Database,
  tenantId: (typeof employeeTransfers.$inferSelect)["tenantId"],
  id: (typeof employeeTransfers.$inferSelect)["id"],
) {
  await assertGraphGuardrailAllowsRead();
  return getEmployeeTransfersByIdSafe(db, tenantId, id);
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

export async function listEmployeeTransfersActiveGuarded(
  db: Database,
  tenantId: (typeof employeeTransfers.$inferSelect)["tenantId"],
) {
  await assertGraphGuardrailAllowsRead();
  return listEmployeeTransfersActive(db, tenantId);
}

/** List all rows for tenant including soft-deleted. */
export async function listEmployeeTransfersAll(
  db: Database,
  tenantId: (typeof employeeTransfers.$inferSelect)["tenantId"],
) {
  return await db.select().from(employeeTransfers).where(eq(employeeTransfers.tenantId, tenantId));
}

export async function listEmployeeTransfersAllGuarded(
  db: Database,
  tenantId: (typeof employeeTransfers.$inferSelect)["tenantId"],
) {
  await assertGraphGuardrailAllowsRead();
  return listEmployeeTransfersAll(db, tenantId);
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

export async function archiveEmployeeTransfersGuarded(
  db: Database,
  tenantId: (typeof employeeTransfers.$inferSelect)["tenantId"],
  id: (typeof employeeTransfers.$inferSelect)["id"],
) {
  await assertGraphGuardrailAllowsRead();
  return archiveEmployeeTransfers(db, tenantId, id);
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

/** Same as getHrExitInterviewsByIdSafe; asserts graph-validation policy when GRAPH_VALIDATION_POLICY_JSON is set. */
export async function getHrExitInterviewsByIdSafeGuarded(
  db: Database,
  tenantId: (typeof hrExitInterviews.$inferSelect)["tenantId"],
  id: (typeof hrExitInterviews.$inferSelect)["id"],
) {
  await assertGraphGuardrailAllowsRead();
  return getHrExitInterviewsByIdSafe(db, tenantId, id);
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

export async function listHrExitInterviewsActiveGuarded(
  db: Database,
  tenantId: (typeof hrExitInterviews.$inferSelect)["tenantId"],
) {
  await assertGraphGuardrailAllowsRead();
  return listHrExitInterviewsActive(db, tenantId);
}

/** List all rows for tenant including soft-deleted. */
export async function listHrExitInterviewsAll(
  db: Database,
  tenantId: (typeof hrExitInterviews.$inferSelect)["tenantId"],
) {
  return await db.select().from(hrExitInterviews).where(eq(hrExitInterviews.tenantId, tenantId));
}

export async function listHrExitInterviewsAllGuarded(
  db: Database,
  tenantId: (typeof hrExitInterviews.$inferSelect)["tenantId"],
) {
  await assertGraphGuardrailAllowsRead();
  return listHrExitInterviewsAll(db, tenantId);
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

export async function archiveHrExitInterviewsGuarded(
  db: Database,
  tenantId: (typeof hrExitInterviews.$inferSelect)["tenantId"],
  id: (typeof hrExitInterviews.$inferSelect)["id"],
) {
  await assertGraphGuardrailAllowsRead();
  return archiveHrExitInterviews(db, tenantId, id);
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

/** Same as getFullFinalSettlementsByIdSafe; asserts graph-validation policy when GRAPH_VALIDATION_POLICY_JSON is set. */
export async function getFullFinalSettlementsByIdSafeGuarded(
  db: Database,
  tenantId: (typeof fullFinalSettlements.$inferSelect)["tenantId"],
  id: (typeof fullFinalSettlements.$inferSelect)["id"],
) {
  await assertGraphGuardrailAllowsRead();
  return getFullFinalSettlementsByIdSafe(db, tenantId, id);
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

export async function listFullFinalSettlementsActiveGuarded(
  db: Database,
  tenantId: (typeof fullFinalSettlements.$inferSelect)["tenantId"],
) {
  await assertGraphGuardrailAllowsRead();
  return listFullFinalSettlementsActive(db, tenantId);
}

/** List all rows for tenant including soft-deleted. */
export async function listFullFinalSettlementsAll(
  db: Database,
  tenantId: (typeof fullFinalSettlements.$inferSelect)["tenantId"],
) {
  return await db.select().from(fullFinalSettlements).where(eq(fullFinalSettlements.tenantId, tenantId));
}

export async function listFullFinalSettlementsAllGuarded(
  db: Database,
  tenantId: (typeof fullFinalSettlements.$inferSelect)["tenantId"],
) {
  await assertGraphGuardrailAllowsRead();
  return listFullFinalSettlementsAll(db, tenantId);
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

export async function archiveFullFinalSettlementsGuarded(
  db: Database,
  tenantId: (typeof fullFinalSettlements.$inferSelect)["tenantId"],
  id: (typeof fullFinalSettlements.$inferSelect)["id"],
) {
  await assertGraphGuardrailAllowsRead();
  return archiveFullFinalSettlements(db, tenantId, id);
}

