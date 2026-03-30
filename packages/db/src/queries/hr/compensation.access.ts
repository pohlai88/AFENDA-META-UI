// @generated
// Full access scaffold — tools/ci-gate/db-access-layer (emit-full).
// Human-owned reporting: use separate modules (not *.access.ts).

import { and, eq, isNull } from "drizzle-orm";
import type { Database } from "../../db.js";
import {
  compensationBudgets,
  compensationCycles,
  equityGrants,
  marketBenchmarks,
  vestingSchedules,
} from "../../schema/hr/compensation.js";

/** Safe by ID: tenant + not soft-deleted. */
export async function getVestingSchedulesByIdSafe(
  db: Database,
  tenantId: (typeof vestingSchedules.$inferSelect)["tenantId"],
  id: (typeof vestingSchedules.$inferSelect)["id"],
) {
  const rows = await db
    .select()
    .from(vestingSchedules)
    .where(
      and(
        eq(vestingSchedules.tenantId, tenantId),
        eq(vestingSchedules.id, id),
        isNull(vestingSchedules.deletedAt),
      ),
    )
    .limit(1);
  return rows[0] ?? null;
}

/** List rows for tenant excluding soft-deleted. */
export async function listVestingSchedulesActive(
  db: Database,
  tenantId: (typeof vestingSchedules.$inferSelect)["tenantId"],
) {
  return await db
    .select()
    .from(vestingSchedules)
    .where(and(eq(vestingSchedules.tenantId, tenantId), isNull(vestingSchedules.deletedAt)));
}

/** List all rows for tenant including soft-deleted. */
export async function listVestingSchedulesAll(
  db: Database,
  tenantId: (typeof vestingSchedules.$inferSelect)["tenantId"],
) {
  return await db.select().from(vestingSchedules).where(eq(vestingSchedules.tenantId, tenantId));
}

/** Soft-archive (mechanical delete flag). */
export async function archiveVestingSchedules(
  db: Database,
  tenantId: (typeof vestingSchedules.$inferSelect)["tenantId"],
  id: (typeof vestingSchedules.$inferSelect)["id"],
) {
  return await db
    .update(vestingSchedules)
    .set({ deletedAt: new Date() })
    .where(and(eq(vestingSchedules.tenantId, tenantId), eq(vestingSchedules.id, id)));
}


/** Safe by ID: tenant + not soft-deleted. */
export async function getCompensationCyclesByIdSafe(
  db: Database,
  tenantId: (typeof compensationCycles.$inferSelect)["tenantId"],
  id: (typeof compensationCycles.$inferSelect)["id"],
) {
  const rows = await db
    .select()
    .from(compensationCycles)
    .where(
      and(
        eq(compensationCycles.tenantId, tenantId),
        eq(compensationCycles.id, id),
        isNull(compensationCycles.deletedAt),
      ),
    )
    .limit(1);
  return rows[0] ?? null;
}

/** List rows for tenant excluding soft-deleted. */
export async function listCompensationCyclesActive(
  db: Database,
  tenantId: (typeof compensationCycles.$inferSelect)["tenantId"],
) {
  return await db
    .select()
    .from(compensationCycles)
    .where(and(eq(compensationCycles.tenantId, tenantId), isNull(compensationCycles.deletedAt)));
}

/** List all rows for tenant including soft-deleted. */
export async function listCompensationCyclesAll(
  db: Database,
  tenantId: (typeof compensationCycles.$inferSelect)["tenantId"],
) {
  return await db.select().from(compensationCycles).where(eq(compensationCycles.tenantId, tenantId));
}

/** Soft-archive (mechanical delete flag). */
export async function archiveCompensationCycles(
  db: Database,
  tenantId: (typeof compensationCycles.$inferSelect)["tenantId"],
  id: (typeof compensationCycles.$inferSelect)["id"],
) {
  return await db
    .update(compensationCycles)
    .set({ deletedAt: new Date() })
    .where(and(eq(compensationCycles.tenantId, tenantId), eq(compensationCycles.id, id)));
}


/** By ID for tenant (no soft-delete column on table). */
export async function getCompensationBudgetsById(
  db: Database,
  tenantId: (typeof compensationBudgets.$inferSelect)["tenantId"],
  id: (typeof compensationBudgets.$inferSelect)["id"],
) {
  const rows = await db
    .select()
    .from(compensationBudgets)
    .where(and(eq(compensationBudgets.tenantId, tenantId), eq(compensationBudgets.id, id)))
    .limit(1);
  return rows[0] ?? null;
}

/** List rows for tenant. */
export async function listCompensationBudgets(
  db: Database,
  tenantId: (typeof compensationBudgets.$inferSelect)["tenantId"],
) {
  return await db.select().from(compensationBudgets).where(eq(compensationBudgets.tenantId, tenantId));
}


/** Safe by ID: tenant + not soft-deleted. */
export async function getEquityGrantsByIdSafe(
  db: Database,
  tenantId: (typeof equityGrants.$inferSelect)["tenantId"],
  id: (typeof equityGrants.$inferSelect)["id"],
) {
  const rows = await db
    .select()
    .from(equityGrants)
    .where(
      and(
        eq(equityGrants.tenantId, tenantId),
        eq(equityGrants.id, id),
        isNull(equityGrants.deletedAt),
      ),
    )
    .limit(1);
  return rows[0] ?? null;
}

/** List rows for tenant excluding soft-deleted. */
export async function listEquityGrantsActive(
  db: Database,
  tenantId: (typeof equityGrants.$inferSelect)["tenantId"],
) {
  return await db
    .select()
    .from(equityGrants)
    .where(and(eq(equityGrants.tenantId, tenantId), isNull(equityGrants.deletedAt)));
}

/** List all rows for tenant including soft-deleted. */
export async function listEquityGrantsAll(
  db: Database,
  tenantId: (typeof equityGrants.$inferSelect)["tenantId"],
) {
  return await db.select().from(equityGrants).where(eq(equityGrants.tenantId, tenantId));
}

/** Soft-archive (mechanical delete flag). */
export async function archiveEquityGrants(
  db: Database,
  tenantId: (typeof equityGrants.$inferSelect)["tenantId"],
  id: (typeof equityGrants.$inferSelect)["id"],
) {
  return await db
    .update(equityGrants)
    .set({ deletedAt: new Date() })
    .where(and(eq(equityGrants.tenantId, tenantId), eq(equityGrants.id, id)));
}


/** Safe by ID: tenant + not soft-deleted. */
export async function getMarketBenchmarksByIdSafe(
  db: Database,
  tenantId: (typeof marketBenchmarks.$inferSelect)["tenantId"],
  id: (typeof marketBenchmarks.$inferSelect)["id"],
) {
  const rows = await db
    .select()
    .from(marketBenchmarks)
    .where(
      and(
        eq(marketBenchmarks.tenantId, tenantId),
        eq(marketBenchmarks.id, id),
        isNull(marketBenchmarks.deletedAt),
      ),
    )
    .limit(1);
  return rows[0] ?? null;
}

/** List rows for tenant excluding soft-deleted. */
export async function listMarketBenchmarksActive(
  db: Database,
  tenantId: (typeof marketBenchmarks.$inferSelect)["tenantId"],
) {
  return await db
    .select()
    .from(marketBenchmarks)
    .where(and(eq(marketBenchmarks.tenantId, tenantId), isNull(marketBenchmarks.deletedAt)));
}

/** List all rows for tenant including soft-deleted. */
export async function listMarketBenchmarksAll(
  db: Database,
  tenantId: (typeof marketBenchmarks.$inferSelect)["tenantId"],
) {
  return await db.select().from(marketBenchmarks).where(eq(marketBenchmarks.tenantId, tenantId));
}

/** Soft-archive (mechanical delete flag). */
export async function archiveMarketBenchmarks(
  db: Database,
  tenantId: (typeof marketBenchmarks.$inferSelect)["tenantId"],
  id: (typeof marketBenchmarks.$inferSelect)["id"],
) {
  return await db
    .update(marketBenchmarks)
    .set({ deletedAt: new Date() })
    .where(and(eq(marketBenchmarks.tenantId, tenantId), eq(marketBenchmarks.id, id)));
}

