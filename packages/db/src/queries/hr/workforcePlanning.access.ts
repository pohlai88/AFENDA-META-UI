// @generated
// Full access scaffold — tools/ci-gate/db-access-layer (emit-full).
// Human-owned reporting: use separate modules (not *.access.ts).

import { and, eq, isNull } from "drizzle-orm";
import type { Database } from "../../db.js";
import {
  staffingPlanDetails,
  staffingPlans,
} from "../../schema/hr/workforcePlanning.js";

/** Safe by ID: tenant + not soft-deleted. */
export async function getStaffingPlansByIdSafe(
  db: Database,
  tenantId: (typeof staffingPlans.$inferSelect)["tenantId"],
  id: (typeof staffingPlans.$inferSelect)["id"],
) {
  const rows = await db
    .select()
    .from(staffingPlans)
    .where(
      and(
        eq(staffingPlans.tenantId, tenantId),
        eq(staffingPlans.id, id),
        isNull(staffingPlans.deletedAt),
      ),
    )
    .limit(1);
  return rows[0] ?? null;
}

/** List rows for tenant excluding soft-deleted. */
export async function listStaffingPlansActive(
  db: Database,
  tenantId: (typeof staffingPlans.$inferSelect)["tenantId"],
) {
  return await db
    .select()
    .from(staffingPlans)
    .where(and(eq(staffingPlans.tenantId, tenantId), isNull(staffingPlans.deletedAt)));
}

/** List all rows for tenant including soft-deleted. */
export async function listStaffingPlansAll(
  db: Database,
  tenantId: (typeof staffingPlans.$inferSelect)["tenantId"],
) {
  return await db.select().from(staffingPlans).where(eq(staffingPlans.tenantId, tenantId));
}

/** Soft-archive (mechanical delete flag). */
export async function archiveStaffingPlans(
  db: Database,
  tenantId: (typeof staffingPlans.$inferSelect)["tenantId"],
  id: (typeof staffingPlans.$inferSelect)["id"],
) {
  return await db
    .update(staffingPlans)
    .set({ deletedAt: new Date() })
    .where(and(eq(staffingPlans.tenantId, tenantId), eq(staffingPlans.id, id)));
}


/** Safe by ID: tenant + not soft-deleted. */
export async function getStaffingPlanDetailsByIdSafe(
  db: Database,
  tenantId: (typeof staffingPlanDetails.$inferSelect)["tenantId"],
  id: (typeof staffingPlanDetails.$inferSelect)["id"],
) {
  const rows = await db
    .select()
    .from(staffingPlanDetails)
    .where(
      and(
        eq(staffingPlanDetails.tenantId, tenantId),
        eq(staffingPlanDetails.id, id),
        isNull(staffingPlanDetails.deletedAt),
      ),
    )
    .limit(1);
  return rows[0] ?? null;
}

/** List rows for tenant excluding soft-deleted. */
export async function listStaffingPlanDetailsActive(
  db: Database,
  tenantId: (typeof staffingPlanDetails.$inferSelect)["tenantId"],
) {
  return await db
    .select()
    .from(staffingPlanDetails)
    .where(and(eq(staffingPlanDetails.tenantId, tenantId), isNull(staffingPlanDetails.deletedAt)));
}

/** List all rows for tenant including soft-deleted. */
export async function listStaffingPlanDetailsAll(
  db: Database,
  tenantId: (typeof staffingPlanDetails.$inferSelect)["tenantId"],
) {
  return await db.select().from(staffingPlanDetails).where(eq(staffingPlanDetails.tenantId, tenantId));
}

/** Soft-archive (mechanical delete flag). */
export async function archiveStaffingPlanDetails(
  db: Database,
  tenantId: (typeof staffingPlanDetails.$inferSelect)["tenantId"],
  id: (typeof staffingPlanDetails.$inferSelect)["id"],
) {
  return await db
    .update(staffingPlanDetails)
    .set({ deletedAt: new Date() })
    .where(and(eq(staffingPlanDetails.tenantId, tenantId), eq(staffingPlanDetails.id, id)));
}

