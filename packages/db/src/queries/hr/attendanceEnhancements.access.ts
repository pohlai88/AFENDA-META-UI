// @generated
// Full access scaffold — tools/ci-gate/db-access-layer (emit-full).
// Human-owned reporting: use separate modules (not *.access.ts).

import { and, eq, isNull } from "drizzle-orm";
import type { Database } from "../../db.js";
import {
  attendanceRequests,
  biometricDevices,
  biometricLogs,
  overtimeRules,
  shiftSwapRequests,
} from "../../schema/hr/attendanceEnhancements.js";

/** Safe by ID: tenant + not soft-deleted. */
export async function getAttendanceRequestsByIdSafe(
  db: Database,
  tenantId: (typeof attendanceRequests.$inferSelect)["tenantId"],
  id: (typeof attendanceRequests.$inferSelect)["id"],
) {
  const rows = await db
    .select()
    .from(attendanceRequests)
    .where(
      and(
        eq(attendanceRequests.tenantId, tenantId),
        eq(attendanceRequests.id, id),
        isNull(attendanceRequests.deletedAt),
      ),
    )
    .limit(1);
  return rows[0] ?? null;
}

/** List rows for tenant excluding soft-deleted. */
export async function listAttendanceRequestsActive(
  db: Database,
  tenantId: (typeof attendanceRequests.$inferSelect)["tenantId"],
) {
  return await db
    .select()
    .from(attendanceRequests)
    .where(and(eq(attendanceRequests.tenantId, tenantId), isNull(attendanceRequests.deletedAt)));
}

/** List all rows for tenant including soft-deleted. */
export async function listAttendanceRequestsAll(
  db: Database,
  tenantId: (typeof attendanceRequests.$inferSelect)["tenantId"],
) {
  return await db.select().from(attendanceRequests).where(eq(attendanceRequests.tenantId, tenantId));
}

/** Soft-archive (mechanical delete flag). */
export async function archiveAttendanceRequests(
  db: Database,
  tenantId: (typeof attendanceRequests.$inferSelect)["tenantId"],
  id: (typeof attendanceRequests.$inferSelect)["id"],
) {
  return await db
    .update(attendanceRequests)
    .set({ deletedAt: new Date() })
    .where(and(eq(attendanceRequests.tenantId, tenantId), eq(attendanceRequests.id, id)));
}


/** Safe by ID: tenant + not soft-deleted. */
export async function getOvertimeRulesByIdSafe(
  db: Database,
  tenantId: (typeof overtimeRules.$inferSelect)["tenantId"],
  id: (typeof overtimeRules.$inferSelect)["id"],
) {
  const rows = await db
    .select()
    .from(overtimeRules)
    .where(
      and(
        eq(overtimeRules.tenantId, tenantId),
        eq(overtimeRules.id, id),
        isNull(overtimeRules.deletedAt),
      ),
    )
    .limit(1);
  return rows[0] ?? null;
}

/** List rows for tenant excluding soft-deleted. */
export async function listOvertimeRulesActive(
  db: Database,
  tenantId: (typeof overtimeRules.$inferSelect)["tenantId"],
) {
  return await db
    .select()
    .from(overtimeRules)
    .where(and(eq(overtimeRules.tenantId, tenantId), isNull(overtimeRules.deletedAt)));
}

/** List all rows for tenant including soft-deleted. */
export async function listOvertimeRulesAll(
  db: Database,
  tenantId: (typeof overtimeRules.$inferSelect)["tenantId"],
) {
  return await db.select().from(overtimeRules).where(eq(overtimeRules.tenantId, tenantId));
}

/** Soft-archive (mechanical delete flag). */
export async function archiveOvertimeRules(
  db: Database,
  tenantId: (typeof overtimeRules.$inferSelect)["tenantId"],
  id: (typeof overtimeRules.$inferSelect)["id"],
) {
  return await db
    .update(overtimeRules)
    .set({ deletedAt: new Date() })
    .where(and(eq(overtimeRules.tenantId, tenantId), eq(overtimeRules.id, id)));
}


/** Safe by ID: tenant + not soft-deleted. */
export async function getBiometricDevicesByIdSafe(
  db: Database,
  tenantId: (typeof biometricDevices.$inferSelect)["tenantId"],
  id: (typeof biometricDevices.$inferSelect)["id"],
) {
  const rows = await db
    .select()
    .from(biometricDevices)
    .where(
      and(
        eq(biometricDevices.tenantId, tenantId),
        eq(biometricDevices.id, id),
        isNull(biometricDevices.deletedAt),
      ),
    )
    .limit(1);
  return rows[0] ?? null;
}

/** List rows for tenant excluding soft-deleted. */
export async function listBiometricDevicesActive(
  db: Database,
  tenantId: (typeof biometricDevices.$inferSelect)["tenantId"],
) {
  return await db
    .select()
    .from(biometricDevices)
    .where(and(eq(biometricDevices.tenantId, tenantId), isNull(biometricDevices.deletedAt)));
}

/** List all rows for tenant including soft-deleted. */
export async function listBiometricDevicesAll(
  db: Database,
  tenantId: (typeof biometricDevices.$inferSelect)["tenantId"],
) {
  return await db.select().from(biometricDevices).where(eq(biometricDevices.tenantId, tenantId));
}

/** Soft-archive (mechanical delete flag). */
export async function archiveBiometricDevices(
  db: Database,
  tenantId: (typeof biometricDevices.$inferSelect)["tenantId"],
  id: (typeof biometricDevices.$inferSelect)["id"],
) {
  return await db
    .update(biometricDevices)
    .set({ deletedAt: new Date() })
    .where(and(eq(biometricDevices.tenantId, tenantId), eq(biometricDevices.id, id)));
}


/** Safe by ID: tenant + not soft-deleted. */
export async function getBiometricLogsByIdSafe(
  db: Database,
  tenantId: (typeof biometricLogs.$inferSelect)["tenantId"],
  id: (typeof biometricLogs.$inferSelect)["id"],
) {
  const rows = await db
    .select()
    .from(biometricLogs)
    .where(
      and(
        eq(biometricLogs.tenantId, tenantId),
        eq(biometricLogs.id, id),
        isNull(biometricLogs.deletedAt),
      ),
    )
    .limit(1);
  return rows[0] ?? null;
}

/** List rows for tenant excluding soft-deleted. */
export async function listBiometricLogsActive(
  db: Database,
  tenantId: (typeof biometricLogs.$inferSelect)["tenantId"],
) {
  return await db
    .select()
    .from(biometricLogs)
    .where(and(eq(biometricLogs.tenantId, tenantId), isNull(biometricLogs.deletedAt)));
}

/** List all rows for tenant including soft-deleted. */
export async function listBiometricLogsAll(
  db: Database,
  tenantId: (typeof biometricLogs.$inferSelect)["tenantId"],
) {
  return await db.select().from(biometricLogs).where(eq(biometricLogs.tenantId, tenantId));
}

/** Soft-archive (mechanical delete flag). */
export async function archiveBiometricLogs(
  db: Database,
  tenantId: (typeof biometricLogs.$inferSelect)["tenantId"],
  id: (typeof biometricLogs.$inferSelect)["id"],
) {
  return await db
    .update(biometricLogs)
    .set({ deletedAt: new Date() })
    .where(and(eq(biometricLogs.tenantId, tenantId), eq(biometricLogs.id, id)));
}


/** Safe by ID: tenant + not soft-deleted. */
export async function getShiftSwapRequestsByIdSafe(
  db: Database,
  tenantId: (typeof shiftSwapRequests.$inferSelect)["tenantId"],
  id: (typeof shiftSwapRequests.$inferSelect)["id"],
) {
  const rows = await db
    .select()
    .from(shiftSwapRequests)
    .where(
      and(
        eq(shiftSwapRequests.tenantId, tenantId),
        eq(shiftSwapRequests.id, id),
        isNull(shiftSwapRequests.deletedAt),
      ),
    )
    .limit(1);
  return rows[0] ?? null;
}

/** List rows for tenant excluding soft-deleted. */
export async function listShiftSwapRequestsActive(
  db: Database,
  tenantId: (typeof shiftSwapRequests.$inferSelect)["tenantId"],
) {
  return await db
    .select()
    .from(shiftSwapRequests)
    .where(and(eq(shiftSwapRequests.tenantId, tenantId), isNull(shiftSwapRequests.deletedAt)));
}

/** List all rows for tenant including soft-deleted. */
export async function listShiftSwapRequestsAll(
  db: Database,
  tenantId: (typeof shiftSwapRequests.$inferSelect)["tenantId"],
) {
  return await db.select().from(shiftSwapRequests).where(eq(shiftSwapRequests.tenantId, tenantId));
}

/** Soft-archive (mechanical delete flag). */
export async function archiveShiftSwapRequests(
  db: Database,
  tenantId: (typeof shiftSwapRequests.$inferSelect)["tenantId"],
  id: (typeof shiftSwapRequests.$inferSelect)["id"],
) {
  return await db
    .update(shiftSwapRequests)
    .set({ deletedAt: new Date() })
    .where(and(eq(shiftSwapRequests.tenantId, tenantId), eq(shiftSwapRequests.id, id)));
}

