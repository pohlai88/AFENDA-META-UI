// @generated
// Full access scaffold — tools/ci-gate/db-access-layer (emit-full).
// Human-owned reporting: use separate modules (not *.access.ts).

import { and, eq, isNull } from "drizzle-orm";
import type { Database } from "../../drizzle/db.js";
import { assertGraphGuardrailAllowsRead } from "../_shared/graph-guardrail.js";
import {
  compensatoryLeaveRequests,
  leaveEncashments,
  leaveRestrictions,
} from "../../schema/hr/leaveEnhancements.js";

/** Safe by ID: tenant + not soft-deleted. */
export async function getCompensatoryLeaveRequestsByIdSafe(
  db: Database,
  tenantId: (typeof compensatoryLeaveRequests.$inferSelect)["tenantId"],
  id: (typeof compensatoryLeaveRequests.$inferSelect)["id"],
) {
  const rows = await db
    .select()
    .from(compensatoryLeaveRequests)
    .where(
      and(
        eq(compensatoryLeaveRequests.tenantId, tenantId),
        eq(compensatoryLeaveRequests.id, id),
        isNull(compensatoryLeaveRequests.deletedAt),
      ),
    )
    .limit(1);
  return rows[0] ?? null;
}

/** Same as getCompensatoryLeaveRequestsByIdSafe; asserts graph-validation policy when GRAPH_VALIDATION_POLICY_JSON is set. */
export async function getCompensatoryLeaveRequestsByIdSafeGuarded(
  db: Database,
  tenantId: (typeof compensatoryLeaveRequests.$inferSelect)["tenantId"],
  id: (typeof compensatoryLeaveRequests.$inferSelect)["id"],
) {
  await assertGraphGuardrailAllowsRead();
  return getCompensatoryLeaveRequestsByIdSafe(db, tenantId, id);
}

/** List rows for tenant excluding soft-deleted. */
export async function listCompensatoryLeaveRequestsActive(
  db: Database,
  tenantId: (typeof compensatoryLeaveRequests.$inferSelect)["tenantId"],
) {
  return await db
    .select()
    .from(compensatoryLeaveRequests)
    .where(and(eq(compensatoryLeaveRequests.tenantId, tenantId), isNull(compensatoryLeaveRequests.deletedAt)));
}

export async function listCompensatoryLeaveRequestsActiveGuarded(
  db: Database,
  tenantId: (typeof compensatoryLeaveRequests.$inferSelect)["tenantId"],
) {
  await assertGraphGuardrailAllowsRead();
  return listCompensatoryLeaveRequestsActive(db, tenantId);
}

/** List all rows for tenant including soft-deleted. */
export async function listCompensatoryLeaveRequestsAll(
  db: Database,
  tenantId: (typeof compensatoryLeaveRequests.$inferSelect)["tenantId"],
) {
  return await db.select().from(compensatoryLeaveRequests).where(eq(compensatoryLeaveRequests.tenantId, tenantId));
}

export async function listCompensatoryLeaveRequestsAllGuarded(
  db: Database,
  tenantId: (typeof compensatoryLeaveRequests.$inferSelect)["tenantId"],
) {
  await assertGraphGuardrailAllowsRead();
  return listCompensatoryLeaveRequestsAll(db, tenantId);
}

/** Soft-archive (mechanical delete flag). */
export async function archiveCompensatoryLeaveRequests(
  db: Database,
  tenantId: (typeof compensatoryLeaveRequests.$inferSelect)["tenantId"],
  id: (typeof compensatoryLeaveRequests.$inferSelect)["id"],
) {
  return await db
    .update(compensatoryLeaveRequests)
    .set({ deletedAt: new Date() })
    .where(and(eq(compensatoryLeaveRequests.tenantId, tenantId), eq(compensatoryLeaveRequests.id, id)));
}

export async function archiveCompensatoryLeaveRequestsGuarded(
  db: Database,
  tenantId: (typeof compensatoryLeaveRequests.$inferSelect)["tenantId"],
  id: (typeof compensatoryLeaveRequests.$inferSelect)["id"],
) {
  await assertGraphGuardrailAllowsRead();
  return archiveCompensatoryLeaveRequests(db, tenantId, id);
}


/** Safe by ID: tenant + not soft-deleted. */
export async function getLeaveRestrictionsByIdSafe(
  db: Database,
  tenantId: (typeof leaveRestrictions.$inferSelect)["tenantId"],
  id: (typeof leaveRestrictions.$inferSelect)["id"],
) {
  const rows = await db
    .select()
    .from(leaveRestrictions)
    .where(
      and(
        eq(leaveRestrictions.tenantId, tenantId),
        eq(leaveRestrictions.id, id),
        isNull(leaveRestrictions.deletedAt),
      ),
    )
    .limit(1);
  return rows[0] ?? null;
}

/** Same as getLeaveRestrictionsByIdSafe; asserts graph-validation policy when GRAPH_VALIDATION_POLICY_JSON is set. */
export async function getLeaveRestrictionsByIdSafeGuarded(
  db: Database,
  tenantId: (typeof leaveRestrictions.$inferSelect)["tenantId"],
  id: (typeof leaveRestrictions.$inferSelect)["id"],
) {
  await assertGraphGuardrailAllowsRead();
  return getLeaveRestrictionsByIdSafe(db, tenantId, id);
}

/** List rows for tenant excluding soft-deleted. */
export async function listLeaveRestrictionsActive(
  db: Database,
  tenantId: (typeof leaveRestrictions.$inferSelect)["tenantId"],
) {
  return await db
    .select()
    .from(leaveRestrictions)
    .where(and(eq(leaveRestrictions.tenantId, tenantId), isNull(leaveRestrictions.deletedAt)));
}

export async function listLeaveRestrictionsActiveGuarded(
  db: Database,
  tenantId: (typeof leaveRestrictions.$inferSelect)["tenantId"],
) {
  await assertGraphGuardrailAllowsRead();
  return listLeaveRestrictionsActive(db, tenantId);
}

/** List all rows for tenant including soft-deleted. */
export async function listLeaveRestrictionsAll(
  db: Database,
  tenantId: (typeof leaveRestrictions.$inferSelect)["tenantId"],
) {
  return await db.select().from(leaveRestrictions).where(eq(leaveRestrictions.tenantId, tenantId));
}

export async function listLeaveRestrictionsAllGuarded(
  db: Database,
  tenantId: (typeof leaveRestrictions.$inferSelect)["tenantId"],
) {
  await assertGraphGuardrailAllowsRead();
  return listLeaveRestrictionsAll(db, tenantId);
}

/** Soft-archive (mechanical delete flag). */
export async function archiveLeaveRestrictions(
  db: Database,
  tenantId: (typeof leaveRestrictions.$inferSelect)["tenantId"],
  id: (typeof leaveRestrictions.$inferSelect)["id"],
) {
  return await db
    .update(leaveRestrictions)
    .set({ deletedAt: new Date() })
    .where(and(eq(leaveRestrictions.tenantId, tenantId), eq(leaveRestrictions.id, id)));
}

export async function archiveLeaveRestrictionsGuarded(
  db: Database,
  tenantId: (typeof leaveRestrictions.$inferSelect)["tenantId"],
  id: (typeof leaveRestrictions.$inferSelect)["id"],
) {
  await assertGraphGuardrailAllowsRead();
  return archiveLeaveRestrictions(db, tenantId, id);
}


/** Safe by ID: tenant + not soft-deleted. */
export async function getLeaveEncashmentsByIdSafe(
  db: Database,
  tenantId: (typeof leaveEncashments.$inferSelect)["tenantId"],
  id: (typeof leaveEncashments.$inferSelect)["id"],
) {
  const rows = await db
    .select()
    .from(leaveEncashments)
    .where(
      and(
        eq(leaveEncashments.tenantId, tenantId),
        eq(leaveEncashments.id, id),
        isNull(leaveEncashments.deletedAt),
      ),
    )
    .limit(1);
  return rows[0] ?? null;
}

/** Same as getLeaveEncashmentsByIdSafe; asserts graph-validation policy when GRAPH_VALIDATION_POLICY_JSON is set. */
export async function getLeaveEncashmentsByIdSafeGuarded(
  db: Database,
  tenantId: (typeof leaveEncashments.$inferSelect)["tenantId"],
  id: (typeof leaveEncashments.$inferSelect)["id"],
) {
  await assertGraphGuardrailAllowsRead();
  return getLeaveEncashmentsByIdSafe(db, tenantId, id);
}

/** List rows for tenant excluding soft-deleted. */
export async function listLeaveEncashmentsActive(
  db: Database,
  tenantId: (typeof leaveEncashments.$inferSelect)["tenantId"],
) {
  return await db
    .select()
    .from(leaveEncashments)
    .where(and(eq(leaveEncashments.tenantId, tenantId), isNull(leaveEncashments.deletedAt)));
}

export async function listLeaveEncashmentsActiveGuarded(
  db: Database,
  tenantId: (typeof leaveEncashments.$inferSelect)["tenantId"],
) {
  await assertGraphGuardrailAllowsRead();
  return listLeaveEncashmentsActive(db, tenantId);
}

/** List all rows for tenant including soft-deleted. */
export async function listLeaveEncashmentsAll(
  db: Database,
  tenantId: (typeof leaveEncashments.$inferSelect)["tenantId"],
) {
  return await db.select().from(leaveEncashments).where(eq(leaveEncashments.tenantId, tenantId));
}

export async function listLeaveEncashmentsAllGuarded(
  db: Database,
  tenantId: (typeof leaveEncashments.$inferSelect)["tenantId"],
) {
  await assertGraphGuardrailAllowsRead();
  return listLeaveEncashmentsAll(db, tenantId);
}

/** Soft-archive (mechanical delete flag). */
export async function archiveLeaveEncashments(
  db: Database,
  tenantId: (typeof leaveEncashments.$inferSelect)["tenantId"],
  id: (typeof leaveEncashments.$inferSelect)["id"],
) {
  return await db
    .update(leaveEncashments)
    .set({ deletedAt: new Date() })
    .where(and(eq(leaveEncashments.tenantId, tenantId), eq(leaveEncashments.id, id)));
}

export async function archiveLeaveEncashmentsGuarded(
  db: Database,
  tenantId: (typeof leaveEncashments.$inferSelect)["tenantId"],
  id: (typeof leaveEncashments.$inferSelect)["id"],
) {
  await assertGraphGuardrailAllowsRead();
  return archiveLeaveEncashments(db, tenantId, id);
}

