// @generated
// Full access scaffold — tools/ci-gate/db-access-layer (emit-full).
// Human-owned reporting: use separate modules (not *.access.ts).

import { and, eq, isNull } from "drizzle-orm";
import type { Database } from "../../drizzle/db.js";
import { assertGraphGuardrailAllowsRead } from "../_shared/graph-guardrail.js";
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

/** Same as getVestingSchedulesByIdSafe; asserts graph-validation policy when GRAPH_VALIDATION_POLICY_JSON is set. */
export async function getVestingSchedulesByIdSafeGuarded(
  db: Database,
  tenantId: (typeof vestingSchedules.$inferSelect)["tenantId"],
  id: (typeof vestingSchedules.$inferSelect)["id"],
) {
  await assertGraphGuardrailAllowsRead();
  return getVestingSchedulesByIdSafe(db, tenantId, id);
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

export async function listVestingSchedulesActiveGuarded(
  db: Database,
  tenantId: (typeof vestingSchedules.$inferSelect)["tenantId"],
) {
  await assertGraphGuardrailAllowsRead();
  return listVestingSchedulesActive(db, tenantId);
}

/** List all rows for tenant including soft-deleted. */
export async function listVestingSchedulesAll(
  db: Database,
  tenantId: (typeof vestingSchedules.$inferSelect)["tenantId"],
) {
  return await db.select().from(vestingSchedules).where(eq(vestingSchedules.tenantId, tenantId));
}

export async function listVestingSchedulesAllGuarded(
  db: Database,
  tenantId: (typeof vestingSchedules.$inferSelect)["tenantId"],
) {
  await assertGraphGuardrailAllowsRead();
  return listVestingSchedulesAll(db, tenantId);
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

export async function archiveVestingSchedulesGuarded(
  db: Database,
  tenantId: (typeof vestingSchedules.$inferSelect)["tenantId"],
  id: (typeof vestingSchedules.$inferSelect)["id"],
) {
  await assertGraphGuardrailAllowsRead();
  return archiveVestingSchedules(db, tenantId, id);
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

/** Same as getCompensationCyclesByIdSafe; asserts graph-validation policy when GRAPH_VALIDATION_POLICY_JSON is set. */
export async function getCompensationCyclesByIdSafeGuarded(
  db: Database,
  tenantId: (typeof compensationCycles.$inferSelect)["tenantId"],
  id: (typeof compensationCycles.$inferSelect)["id"],
) {
  await assertGraphGuardrailAllowsRead();
  return getCompensationCyclesByIdSafe(db, tenantId, id);
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

export async function listCompensationCyclesActiveGuarded(
  db: Database,
  tenantId: (typeof compensationCycles.$inferSelect)["tenantId"],
) {
  await assertGraphGuardrailAllowsRead();
  return listCompensationCyclesActive(db, tenantId);
}

/** List all rows for tenant including soft-deleted. */
export async function listCompensationCyclesAll(
  db: Database,
  tenantId: (typeof compensationCycles.$inferSelect)["tenantId"],
) {
  return await db.select().from(compensationCycles).where(eq(compensationCycles.tenantId, tenantId));
}

export async function listCompensationCyclesAllGuarded(
  db: Database,
  tenantId: (typeof compensationCycles.$inferSelect)["tenantId"],
) {
  await assertGraphGuardrailAllowsRead();
  return listCompensationCyclesAll(db, tenantId);
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

export async function archiveCompensationCyclesGuarded(
  db: Database,
  tenantId: (typeof compensationCycles.$inferSelect)["tenantId"],
  id: (typeof compensationCycles.$inferSelect)["id"],
) {
  await assertGraphGuardrailAllowsRead();
  return archiveCompensationCycles(db, tenantId, id);
}


/** Safe by ID: tenant + not soft-deleted. */
export async function getCompensationBudgetsByIdSafe(
  db: Database,
  tenantId: (typeof compensationBudgets.$inferSelect)["tenantId"],
  id: (typeof compensationBudgets.$inferSelect)["id"],
) {
  const rows = await db
    .select()
    .from(compensationBudgets)
    .where(
      and(
        eq(compensationBudgets.tenantId, tenantId),
        eq(compensationBudgets.id, id),
        isNull(compensationBudgets.deletedAt),
      ),
    )
    .limit(1);
  return rows[0] ?? null;
}

/** Same as getCompensationBudgetsByIdSafe; asserts graph-validation policy when GRAPH_VALIDATION_POLICY_JSON is set. */
export async function getCompensationBudgetsByIdSafeGuarded(
  db: Database,
  tenantId: (typeof compensationBudgets.$inferSelect)["tenantId"],
  id: (typeof compensationBudgets.$inferSelect)["id"],
) {
  await assertGraphGuardrailAllowsRead();
  return getCompensationBudgetsByIdSafe(db, tenantId, id);
}

/** List rows for tenant excluding soft-deleted. */
export async function listCompensationBudgetsActive(
  db: Database,
  tenantId: (typeof compensationBudgets.$inferSelect)["tenantId"],
) {
  return await db
    .select()
    .from(compensationBudgets)
    .where(and(eq(compensationBudgets.tenantId, tenantId), isNull(compensationBudgets.deletedAt)));
}

export async function listCompensationBudgetsActiveGuarded(
  db: Database,
  tenantId: (typeof compensationBudgets.$inferSelect)["tenantId"],
) {
  await assertGraphGuardrailAllowsRead();
  return listCompensationBudgetsActive(db, tenantId);
}

/** List all rows for tenant including soft-deleted. */
export async function listCompensationBudgetsAll(
  db: Database,
  tenantId: (typeof compensationBudgets.$inferSelect)["tenantId"],
) {
  return await db.select().from(compensationBudgets).where(eq(compensationBudgets.tenantId, tenantId));
}

export async function listCompensationBudgetsAllGuarded(
  db: Database,
  tenantId: (typeof compensationBudgets.$inferSelect)["tenantId"],
) {
  await assertGraphGuardrailAllowsRead();
  return listCompensationBudgetsAll(db, tenantId);
}

/** Soft-archive (mechanical delete flag). */
export async function archiveCompensationBudgets(
  db: Database,
  tenantId: (typeof compensationBudgets.$inferSelect)["tenantId"],
  id: (typeof compensationBudgets.$inferSelect)["id"],
) {
  return await db
    .update(compensationBudgets)
    .set({ deletedAt: new Date() })
    .where(and(eq(compensationBudgets.tenantId, tenantId), eq(compensationBudgets.id, id)));
}

export async function archiveCompensationBudgetsGuarded(
  db: Database,
  tenantId: (typeof compensationBudgets.$inferSelect)["tenantId"],
  id: (typeof compensationBudgets.$inferSelect)["id"],
) {
  await assertGraphGuardrailAllowsRead();
  return archiveCompensationBudgets(db, tenantId, id);
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

/** Same as getEquityGrantsByIdSafe; asserts graph-validation policy when GRAPH_VALIDATION_POLICY_JSON is set. */
export async function getEquityGrantsByIdSafeGuarded(
  db: Database,
  tenantId: (typeof equityGrants.$inferSelect)["tenantId"],
  id: (typeof equityGrants.$inferSelect)["id"],
) {
  await assertGraphGuardrailAllowsRead();
  return getEquityGrantsByIdSafe(db, tenantId, id);
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

export async function listEquityGrantsActiveGuarded(
  db: Database,
  tenantId: (typeof equityGrants.$inferSelect)["tenantId"],
) {
  await assertGraphGuardrailAllowsRead();
  return listEquityGrantsActive(db, tenantId);
}

/** List all rows for tenant including soft-deleted. */
export async function listEquityGrantsAll(
  db: Database,
  tenantId: (typeof equityGrants.$inferSelect)["tenantId"],
) {
  return await db.select().from(equityGrants).where(eq(equityGrants.tenantId, tenantId));
}

export async function listEquityGrantsAllGuarded(
  db: Database,
  tenantId: (typeof equityGrants.$inferSelect)["tenantId"],
) {
  await assertGraphGuardrailAllowsRead();
  return listEquityGrantsAll(db, tenantId);
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

export async function archiveEquityGrantsGuarded(
  db: Database,
  tenantId: (typeof equityGrants.$inferSelect)["tenantId"],
  id: (typeof equityGrants.$inferSelect)["id"],
) {
  await assertGraphGuardrailAllowsRead();
  return archiveEquityGrants(db, tenantId, id);
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

/** Same as getMarketBenchmarksByIdSafe; asserts graph-validation policy when GRAPH_VALIDATION_POLICY_JSON is set. */
export async function getMarketBenchmarksByIdSafeGuarded(
  db: Database,
  tenantId: (typeof marketBenchmarks.$inferSelect)["tenantId"],
  id: (typeof marketBenchmarks.$inferSelect)["id"],
) {
  await assertGraphGuardrailAllowsRead();
  return getMarketBenchmarksByIdSafe(db, tenantId, id);
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

export async function listMarketBenchmarksActiveGuarded(
  db: Database,
  tenantId: (typeof marketBenchmarks.$inferSelect)["tenantId"],
) {
  await assertGraphGuardrailAllowsRead();
  return listMarketBenchmarksActive(db, tenantId);
}

/** List all rows for tenant including soft-deleted. */
export async function listMarketBenchmarksAll(
  db: Database,
  tenantId: (typeof marketBenchmarks.$inferSelect)["tenantId"],
) {
  return await db.select().from(marketBenchmarks).where(eq(marketBenchmarks.tenantId, tenantId));
}

export async function listMarketBenchmarksAllGuarded(
  db: Database,
  tenantId: (typeof marketBenchmarks.$inferSelect)["tenantId"],
) {
  await assertGraphGuardrailAllowsRead();
  return listMarketBenchmarksAll(db, tenantId);
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

export async function archiveMarketBenchmarksGuarded(
  db: Database,
  tenantId: (typeof marketBenchmarks.$inferSelect)["tenantId"],
  id: (typeof marketBenchmarks.$inferSelect)["id"],
) {
  await assertGraphGuardrailAllowsRead();
  return archiveMarketBenchmarks(db, tenantId, id);
}

