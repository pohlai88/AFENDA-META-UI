// @generated
// Full access scaffold — tools/ci-gate/db-access-layer (emit-full).
// Human-owned reporting: use separate modules (not *.access.ts).

import { and, eq, isNull } from "drizzle-orm";
import type { Database } from "../../drizzle/db.js";
import { assertGraphGuardrailAllowsRead } from "../_shared/graph-guardrail.js";
import {
  attendanceRecords,
  holidayCalendars,
  holidays,
  leaveAllocations,
  leaveRequestStatusHistory,
  leaveRequests,
  leaveTypeConfigs,
  shiftAssignments,
  shiftSchedules,
  timeSheetLines,
  timeSheets,
} from "../../schema/hr/attendance.js";

/** Safe by ID: tenant + not soft-deleted. */
export async function getLeaveTypeConfigsByIdSafe(
  db: Database,
  tenantId: (typeof leaveTypeConfigs.$inferSelect)["tenantId"],
  id: (typeof leaveTypeConfigs.$inferSelect)["id"],
) {
  const rows = await db
    .select()
    .from(leaveTypeConfigs)
    .where(
      and(
        eq(leaveTypeConfigs.tenantId, tenantId),
        eq(leaveTypeConfigs.id, id),
        isNull(leaveTypeConfigs.deletedAt),
      ),
    )
    .limit(1);
  return rows[0] ?? null;
}

/** Same as getLeaveTypeConfigsByIdSafe; asserts graph-validation policy when GRAPH_VALIDATION_POLICY_JSON is set. */
export async function getLeaveTypeConfigsByIdSafeGuarded(
  db: Database,
  tenantId: (typeof leaveTypeConfigs.$inferSelect)["tenantId"],
  id: (typeof leaveTypeConfigs.$inferSelect)["id"],
) {
  await assertGraphGuardrailAllowsRead();
  return getLeaveTypeConfigsByIdSafe(db, tenantId, id);
}

/** List rows for tenant excluding soft-deleted. */
export async function listLeaveTypeConfigsActive(
  db: Database,
  tenantId: (typeof leaveTypeConfigs.$inferSelect)["tenantId"],
) {
  return await db
    .select()
    .from(leaveTypeConfigs)
    .where(and(eq(leaveTypeConfigs.tenantId, tenantId), isNull(leaveTypeConfigs.deletedAt)));
}

export async function listLeaveTypeConfigsActiveGuarded(
  db: Database,
  tenantId: (typeof leaveTypeConfigs.$inferSelect)["tenantId"],
) {
  await assertGraphGuardrailAllowsRead();
  return listLeaveTypeConfigsActive(db, tenantId);
}

/** List all rows for tenant including soft-deleted. */
export async function listLeaveTypeConfigsAll(
  db: Database,
  tenantId: (typeof leaveTypeConfigs.$inferSelect)["tenantId"],
) {
  return await db.select().from(leaveTypeConfigs).where(eq(leaveTypeConfigs.tenantId, tenantId));
}

export async function listLeaveTypeConfigsAllGuarded(
  db: Database,
  tenantId: (typeof leaveTypeConfigs.$inferSelect)["tenantId"],
) {
  await assertGraphGuardrailAllowsRead();
  return listLeaveTypeConfigsAll(db, tenantId);
}

/** Soft-archive (mechanical delete flag). */
export async function archiveLeaveTypeConfigs(
  db: Database,
  tenantId: (typeof leaveTypeConfigs.$inferSelect)["tenantId"],
  id: (typeof leaveTypeConfigs.$inferSelect)["id"],
) {
  return await db
    .update(leaveTypeConfigs)
    .set({ deletedAt: new Date() })
    .where(and(eq(leaveTypeConfigs.tenantId, tenantId), eq(leaveTypeConfigs.id, id)));
}

export async function archiveLeaveTypeConfigsGuarded(
  db: Database,
  tenantId: (typeof leaveTypeConfigs.$inferSelect)["tenantId"],
  id: (typeof leaveTypeConfigs.$inferSelect)["id"],
) {
  await assertGraphGuardrailAllowsRead();
  return archiveLeaveTypeConfigs(db, tenantId, id);
}


/** Safe by ID: tenant + not soft-deleted. */
export async function getLeaveAllocationsByIdSafe(
  db: Database,
  tenantId: (typeof leaveAllocations.$inferSelect)["tenantId"],
  id: (typeof leaveAllocations.$inferSelect)["id"],
) {
  const rows = await db
    .select()
    .from(leaveAllocations)
    .where(
      and(
        eq(leaveAllocations.tenantId, tenantId),
        eq(leaveAllocations.id, id),
        isNull(leaveAllocations.deletedAt),
      ),
    )
    .limit(1);
  return rows[0] ?? null;
}

/** Same as getLeaveAllocationsByIdSafe; asserts graph-validation policy when GRAPH_VALIDATION_POLICY_JSON is set. */
export async function getLeaveAllocationsByIdSafeGuarded(
  db: Database,
  tenantId: (typeof leaveAllocations.$inferSelect)["tenantId"],
  id: (typeof leaveAllocations.$inferSelect)["id"],
) {
  await assertGraphGuardrailAllowsRead();
  return getLeaveAllocationsByIdSafe(db, tenantId, id);
}

/** List rows for tenant excluding soft-deleted. */
export async function listLeaveAllocationsActive(
  db: Database,
  tenantId: (typeof leaveAllocations.$inferSelect)["tenantId"],
) {
  return await db
    .select()
    .from(leaveAllocations)
    .where(and(eq(leaveAllocations.tenantId, tenantId), isNull(leaveAllocations.deletedAt)));
}

export async function listLeaveAllocationsActiveGuarded(
  db: Database,
  tenantId: (typeof leaveAllocations.$inferSelect)["tenantId"],
) {
  await assertGraphGuardrailAllowsRead();
  return listLeaveAllocationsActive(db, tenantId);
}

/** List all rows for tenant including soft-deleted. */
export async function listLeaveAllocationsAll(
  db: Database,
  tenantId: (typeof leaveAllocations.$inferSelect)["tenantId"],
) {
  return await db.select().from(leaveAllocations).where(eq(leaveAllocations.tenantId, tenantId));
}

export async function listLeaveAllocationsAllGuarded(
  db: Database,
  tenantId: (typeof leaveAllocations.$inferSelect)["tenantId"],
) {
  await assertGraphGuardrailAllowsRead();
  return listLeaveAllocationsAll(db, tenantId);
}

/** Soft-archive (mechanical delete flag). */
export async function archiveLeaveAllocations(
  db: Database,
  tenantId: (typeof leaveAllocations.$inferSelect)["tenantId"],
  id: (typeof leaveAllocations.$inferSelect)["id"],
) {
  return await db
    .update(leaveAllocations)
    .set({ deletedAt: new Date() })
    .where(and(eq(leaveAllocations.tenantId, tenantId), eq(leaveAllocations.id, id)));
}

export async function archiveLeaveAllocationsGuarded(
  db: Database,
  tenantId: (typeof leaveAllocations.$inferSelect)["tenantId"],
  id: (typeof leaveAllocations.$inferSelect)["id"],
) {
  await assertGraphGuardrailAllowsRead();
  return archiveLeaveAllocations(db, tenantId, id);
}


/** Safe by ID: tenant + not soft-deleted. */
export async function getLeaveRequestsByIdSafe(
  db: Database,
  tenantId: (typeof leaveRequests.$inferSelect)["tenantId"],
  id: (typeof leaveRequests.$inferSelect)["id"],
) {
  const rows = await db
    .select()
    .from(leaveRequests)
    .where(
      and(
        eq(leaveRequests.tenantId, tenantId),
        eq(leaveRequests.id, id),
        isNull(leaveRequests.deletedAt),
      ),
    )
    .limit(1);
  return rows[0] ?? null;
}

/** Same as getLeaveRequestsByIdSafe; asserts graph-validation policy when GRAPH_VALIDATION_POLICY_JSON is set. */
export async function getLeaveRequestsByIdSafeGuarded(
  db: Database,
  tenantId: (typeof leaveRequests.$inferSelect)["tenantId"],
  id: (typeof leaveRequests.$inferSelect)["id"],
) {
  await assertGraphGuardrailAllowsRead();
  return getLeaveRequestsByIdSafe(db, tenantId, id);
}

/** List rows for tenant excluding soft-deleted. */
export async function listLeaveRequestsActive(
  db: Database,
  tenantId: (typeof leaveRequests.$inferSelect)["tenantId"],
) {
  return await db
    .select()
    .from(leaveRequests)
    .where(and(eq(leaveRequests.tenantId, tenantId), isNull(leaveRequests.deletedAt)));
}

export async function listLeaveRequestsActiveGuarded(
  db: Database,
  tenantId: (typeof leaveRequests.$inferSelect)["tenantId"],
) {
  await assertGraphGuardrailAllowsRead();
  return listLeaveRequestsActive(db, tenantId);
}

/** List all rows for tenant including soft-deleted. */
export async function listLeaveRequestsAll(
  db: Database,
  tenantId: (typeof leaveRequests.$inferSelect)["tenantId"],
) {
  return await db.select().from(leaveRequests).where(eq(leaveRequests.tenantId, tenantId));
}

export async function listLeaveRequestsAllGuarded(
  db: Database,
  tenantId: (typeof leaveRequests.$inferSelect)["tenantId"],
) {
  await assertGraphGuardrailAllowsRead();
  return listLeaveRequestsAll(db, tenantId);
}

/** Soft-archive (mechanical delete flag). */
export async function archiveLeaveRequests(
  db: Database,
  tenantId: (typeof leaveRequests.$inferSelect)["tenantId"],
  id: (typeof leaveRequests.$inferSelect)["id"],
) {
  return await db
    .update(leaveRequests)
    .set({ deletedAt: new Date() })
    .where(and(eq(leaveRequests.tenantId, tenantId), eq(leaveRequests.id, id)));
}

export async function archiveLeaveRequestsGuarded(
  db: Database,
  tenantId: (typeof leaveRequests.$inferSelect)["tenantId"],
  id: (typeof leaveRequests.$inferSelect)["id"],
) {
  await assertGraphGuardrailAllowsRead();
  return archiveLeaveRequests(db, tenantId, id);
}


/** By ID for tenant (no soft-delete column on table). */
export async function getLeaveRequestStatusHistoryById(
  db: Database,
  tenantId: (typeof leaveRequestStatusHistory.$inferSelect)["tenantId"],
  id: (typeof leaveRequestStatusHistory.$inferSelect)["id"],
) {
  const rows = await db
    .select()
    .from(leaveRequestStatusHistory)
    .where(and(eq(leaveRequestStatusHistory.tenantId, tenantId), eq(leaveRequestStatusHistory.id, id)))
    .limit(1);
  return rows[0] ?? null;
}

export async function getLeaveRequestStatusHistoryByIdGuarded(
  db: Database,
  tenantId: (typeof leaveRequestStatusHistory.$inferSelect)["tenantId"],
  id: (typeof leaveRequestStatusHistory.$inferSelect)["id"],
) {
  await assertGraphGuardrailAllowsRead();
  return getLeaveRequestStatusHistoryById(db, tenantId, id);
}

/** List rows for tenant. */
export async function listLeaveRequestStatusHistory(
  db: Database,
  tenantId: (typeof leaveRequestStatusHistory.$inferSelect)["tenantId"],
) {
  return await db.select().from(leaveRequestStatusHistory).where(eq(leaveRequestStatusHistory.tenantId, tenantId));
}

export async function listLeaveRequestStatusHistoryGuarded(
  db: Database,
  tenantId: (typeof leaveRequestStatusHistory.$inferSelect)["tenantId"],
) {
  await assertGraphGuardrailAllowsRead();
  return listLeaveRequestStatusHistory(db, tenantId);
}


/** Safe by ID: tenant + not soft-deleted. */
export async function getHolidayCalendarsByIdSafe(
  db: Database,
  tenantId: (typeof holidayCalendars.$inferSelect)["tenantId"],
  id: (typeof holidayCalendars.$inferSelect)["id"],
) {
  const rows = await db
    .select()
    .from(holidayCalendars)
    .where(
      and(
        eq(holidayCalendars.tenantId, tenantId),
        eq(holidayCalendars.id, id),
        isNull(holidayCalendars.deletedAt),
      ),
    )
    .limit(1);
  return rows[0] ?? null;
}

/** Same as getHolidayCalendarsByIdSafe; asserts graph-validation policy when GRAPH_VALIDATION_POLICY_JSON is set. */
export async function getHolidayCalendarsByIdSafeGuarded(
  db: Database,
  tenantId: (typeof holidayCalendars.$inferSelect)["tenantId"],
  id: (typeof holidayCalendars.$inferSelect)["id"],
) {
  await assertGraphGuardrailAllowsRead();
  return getHolidayCalendarsByIdSafe(db, tenantId, id);
}

/** List rows for tenant excluding soft-deleted. */
export async function listHolidayCalendarsActive(
  db: Database,
  tenantId: (typeof holidayCalendars.$inferSelect)["tenantId"],
) {
  return await db
    .select()
    .from(holidayCalendars)
    .where(and(eq(holidayCalendars.tenantId, tenantId), isNull(holidayCalendars.deletedAt)));
}

export async function listHolidayCalendarsActiveGuarded(
  db: Database,
  tenantId: (typeof holidayCalendars.$inferSelect)["tenantId"],
) {
  await assertGraphGuardrailAllowsRead();
  return listHolidayCalendarsActive(db, tenantId);
}

/** List all rows for tenant including soft-deleted. */
export async function listHolidayCalendarsAll(
  db: Database,
  tenantId: (typeof holidayCalendars.$inferSelect)["tenantId"],
) {
  return await db.select().from(holidayCalendars).where(eq(holidayCalendars.tenantId, tenantId));
}

export async function listHolidayCalendarsAllGuarded(
  db: Database,
  tenantId: (typeof holidayCalendars.$inferSelect)["tenantId"],
) {
  await assertGraphGuardrailAllowsRead();
  return listHolidayCalendarsAll(db, tenantId);
}

/** Soft-archive (mechanical delete flag). */
export async function archiveHolidayCalendars(
  db: Database,
  tenantId: (typeof holidayCalendars.$inferSelect)["tenantId"],
  id: (typeof holidayCalendars.$inferSelect)["id"],
) {
  return await db
    .update(holidayCalendars)
    .set({ deletedAt: new Date() })
    .where(and(eq(holidayCalendars.tenantId, tenantId), eq(holidayCalendars.id, id)));
}

export async function archiveHolidayCalendarsGuarded(
  db: Database,
  tenantId: (typeof holidayCalendars.$inferSelect)["tenantId"],
  id: (typeof holidayCalendars.$inferSelect)["id"],
) {
  await assertGraphGuardrailAllowsRead();
  return archiveHolidayCalendars(db, tenantId, id);
}


/** Safe by ID: tenant + not soft-deleted. */
export async function getHolidaysByIdSafe(
  db: Database,
  tenantId: (typeof holidays.$inferSelect)["tenantId"],
  id: (typeof holidays.$inferSelect)["id"],
) {
  const rows = await db
    .select()
    .from(holidays)
    .where(
      and(
        eq(holidays.tenantId, tenantId),
        eq(holidays.id, id),
        isNull(holidays.deletedAt),
      ),
    )
    .limit(1);
  return rows[0] ?? null;
}

/** Same as getHolidaysByIdSafe; asserts graph-validation policy when GRAPH_VALIDATION_POLICY_JSON is set. */
export async function getHolidaysByIdSafeGuarded(
  db: Database,
  tenantId: (typeof holidays.$inferSelect)["tenantId"],
  id: (typeof holidays.$inferSelect)["id"],
) {
  await assertGraphGuardrailAllowsRead();
  return getHolidaysByIdSafe(db, tenantId, id);
}

/** List rows for tenant excluding soft-deleted. */
export async function listHolidaysActive(
  db: Database,
  tenantId: (typeof holidays.$inferSelect)["tenantId"],
) {
  return await db
    .select()
    .from(holidays)
    .where(and(eq(holidays.tenantId, tenantId), isNull(holidays.deletedAt)));
}

export async function listHolidaysActiveGuarded(
  db: Database,
  tenantId: (typeof holidays.$inferSelect)["tenantId"],
) {
  await assertGraphGuardrailAllowsRead();
  return listHolidaysActive(db, tenantId);
}

/** List all rows for tenant including soft-deleted. */
export async function listHolidaysAll(
  db: Database,
  tenantId: (typeof holidays.$inferSelect)["tenantId"],
) {
  return await db.select().from(holidays).where(eq(holidays.tenantId, tenantId));
}

export async function listHolidaysAllGuarded(
  db: Database,
  tenantId: (typeof holidays.$inferSelect)["tenantId"],
) {
  await assertGraphGuardrailAllowsRead();
  return listHolidaysAll(db, tenantId);
}

/** Soft-archive (mechanical delete flag). */
export async function archiveHolidays(
  db: Database,
  tenantId: (typeof holidays.$inferSelect)["tenantId"],
  id: (typeof holidays.$inferSelect)["id"],
) {
  return await db
    .update(holidays)
    .set({ deletedAt: new Date() })
    .where(and(eq(holidays.tenantId, tenantId), eq(holidays.id, id)));
}

export async function archiveHolidaysGuarded(
  db: Database,
  tenantId: (typeof holidays.$inferSelect)["tenantId"],
  id: (typeof holidays.$inferSelect)["id"],
) {
  await assertGraphGuardrailAllowsRead();
  return archiveHolidays(db, tenantId, id);
}


/** Safe by ID: tenant + not soft-deleted. */
export async function getTimeSheetsByIdSafe(
  db: Database,
  tenantId: (typeof timeSheets.$inferSelect)["tenantId"],
  id: (typeof timeSheets.$inferSelect)["id"],
) {
  const rows = await db
    .select()
    .from(timeSheets)
    .where(
      and(
        eq(timeSheets.tenantId, tenantId),
        eq(timeSheets.id, id),
        isNull(timeSheets.deletedAt),
      ),
    )
    .limit(1);
  return rows[0] ?? null;
}

/** Same as getTimeSheetsByIdSafe; asserts graph-validation policy when GRAPH_VALIDATION_POLICY_JSON is set. */
export async function getTimeSheetsByIdSafeGuarded(
  db: Database,
  tenantId: (typeof timeSheets.$inferSelect)["tenantId"],
  id: (typeof timeSheets.$inferSelect)["id"],
) {
  await assertGraphGuardrailAllowsRead();
  return getTimeSheetsByIdSafe(db, tenantId, id);
}

/** List rows for tenant excluding soft-deleted. */
export async function listTimeSheetsActive(
  db: Database,
  tenantId: (typeof timeSheets.$inferSelect)["tenantId"],
) {
  return await db
    .select()
    .from(timeSheets)
    .where(and(eq(timeSheets.tenantId, tenantId), isNull(timeSheets.deletedAt)));
}

export async function listTimeSheetsActiveGuarded(
  db: Database,
  tenantId: (typeof timeSheets.$inferSelect)["tenantId"],
) {
  await assertGraphGuardrailAllowsRead();
  return listTimeSheetsActive(db, tenantId);
}

/** List all rows for tenant including soft-deleted. */
export async function listTimeSheetsAll(
  db: Database,
  tenantId: (typeof timeSheets.$inferSelect)["tenantId"],
) {
  return await db.select().from(timeSheets).where(eq(timeSheets.tenantId, tenantId));
}

export async function listTimeSheetsAllGuarded(
  db: Database,
  tenantId: (typeof timeSheets.$inferSelect)["tenantId"],
) {
  await assertGraphGuardrailAllowsRead();
  return listTimeSheetsAll(db, tenantId);
}

/** Soft-archive (mechanical delete flag). */
export async function archiveTimeSheets(
  db: Database,
  tenantId: (typeof timeSheets.$inferSelect)["tenantId"],
  id: (typeof timeSheets.$inferSelect)["id"],
) {
  return await db
    .update(timeSheets)
    .set({ deletedAt: new Date() })
    .where(and(eq(timeSheets.tenantId, tenantId), eq(timeSheets.id, id)));
}

export async function archiveTimeSheetsGuarded(
  db: Database,
  tenantId: (typeof timeSheets.$inferSelect)["tenantId"],
  id: (typeof timeSheets.$inferSelect)["id"],
) {
  await assertGraphGuardrailAllowsRead();
  return archiveTimeSheets(db, tenantId, id);
}


/** Safe by ID: tenant + not soft-deleted. */
export async function getTimeSheetLinesByIdSafe(
  db: Database,
  tenantId: (typeof timeSheetLines.$inferSelect)["tenantId"],
  id: (typeof timeSheetLines.$inferSelect)["id"],
) {
  const rows = await db
    .select()
    .from(timeSheetLines)
    .where(
      and(
        eq(timeSheetLines.tenantId, tenantId),
        eq(timeSheetLines.id, id),
        isNull(timeSheetLines.deletedAt),
      ),
    )
    .limit(1);
  return rows[0] ?? null;
}

/** Same as getTimeSheetLinesByIdSafe; asserts graph-validation policy when GRAPH_VALIDATION_POLICY_JSON is set. */
export async function getTimeSheetLinesByIdSafeGuarded(
  db: Database,
  tenantId: (typeof timeSheetLines.$inferSelect)["tenantId"],
  id: (typeof timeSheetLines.$inferSelect)["id"],
) {
  await assertGraphGuardrailAllowsRead();
  return getTimeSheetLinesByIdSafe(db, tenantId, id);
}

/** List rows for tenant excluding soft-deleted. */
export async function listTimeSheetLinesActive(
  db: Database,
  tenantId: (typeof timeSheetLines.$inferSelect)["tenantId"],
) {
  return await db
    .select()
    .from(timeSheetLines)
    .where(and(eq(timeSheetLines.tenantId, tenantId), isNull(timeSheetLines.deletedAt)));
}

export async function listTimeSheetLinesActiveGuarded(
  db: Database,
  tenantId: (typeof timeSheetLines.$inferSelect)["tenantId"],
) {
  await assertGraphGuardrailAllowsRead();
  return listTimeSheetLinesActive(db, tenantId);
}

/** List all rows for tenant including soft-deleted. */
export async function listTimeSheetLinesAll(
  db: Database,
  tenantId: (typeof timeSheetLines.$inferSelect)["tenantId"],
) {
  return await db.select().from(timeSheetLines).where(eq(timeSheetLines.tenantId, tenantId));
}

export async function listTimeSheetLinesAllGuarded(
  db: Database,
  tenantId: (typeof timeSheetLines.$inferSelect)["tenantId"],
) {
  await assertGraphGuardrailAllowsRead();
  return listTimeSheetLinesAll(db, tenantId);
}

/** Soft-archive (mechanical delete flag). */
export async function archiveTimeSheetLines(
  db: Database,
  tenantId: (typeof timeSheetLines.$inferSelect)["tenantId"],
  id: (typeof timeSheetLines.$inferSelect)["id"],
) {
  return await db
    .update(timeSheetLines)
    .set({ deletedAt: new Date() })
    .where(and(eq(timeSheetLines.tenantId, tenantId), eq(timeSheetLines.id, id)));
}

export async function archiveTimeSheetLinesGuarded(
  db: Database,
  tenantId: (typeof timeSheetLines.$inferSelect)["tenantId"],
  id: (typeof timeSheetLines.$inferSelect)["id"],
) {
  await assertGraphGuardrailAllowsRead();
  return archiveTimeSheetLines(db, tenantId, id);
}


/** Safe by ID: tenant + not soft-deleted. */
export async function getAttendanceRecordsByIdSafe(
  db: Database,
  tenantId: (typeof attendanceRecords.$inferSelect)["tenantId"],
  id: (typeof attendanceRecords.$inferSelect)["id"],
) {
  const rows = await db
    .select()
    .from(attendanceRecords)
    .where(
      and(
        eq(attendanceRecords.tenantId, tenantId),
        eq(attendanceRecords.id, id),
        isNull(attendanceRecords.deletedAt),
      ),
    )
    .limit(1);
  return rows[0] ?? null;
}

/** Same as getAttendanceRecordsByIdSafe; asserts graph-validation policy when GRAPH_VALIDATION_POLICY_JSON is set. */
export async function getAttendanceRecordsByIdSafeGuarded(
  db: Database,
  tenantId: (typeof attendanceRecords.$inferSelect)["tenantId"],
  id: (typeof attendanceRecords.$inferSelect)["id"],
) {
  await assertGraphGuardrailAllowsRead();
  return getAttendanceRecordsByIdSafe(db, tenantId, id);
}

/** List rows for tenant excluding soft-deleted. */
export async function listAttendanceRecordsActive(
  db: Database,
  tenantId: (typeof attendanceRecords.$inferSelect)["tenantId"],
) {
  return await db
    .select()
    .from(attendanceRecords)
    .where(and(eq(attendanceRecords.tenantId, tenantId), isNull(attendanceRecords.deletedAt)));
}

export async function listAttendanceRecordsActiveGuarded(
  db: Database,
  tenantId: (typeof attendanceRecords.$inferSelect)["tenantId"],
) {
  await assertGraphGuardrailAllowsRead();
  return listAttendanceRecordsActive(db, tenantId);
}

/** List all rows for tenant including soft-deleted. */
export async function listAttendanceRecordsAll(
  db: Database,
  tenantId: (typeof attendanceRecords.$inferSelect)["tenantId"],
) {
  return await db.select().from(attendanceRecords).where(eq(attendanceRecords.tenantId, tenantId));
}

export async function listAttendanceRecordsAllGuarded(
  db: Database,
  tenantId: (typeof attendanceRecords.$inferSelect)["tenantId"],
) {
  await assertGraphGuardrailAllowsRead();
  return listAttendanceRecordsAll(db, tenantId);
}

/** Soft-archive (mechanical delete flag). */
export async function archiveAttendanceRecords(
  db: Database,
  tenantId: (typeof attendanceRecords.$inferSelect)["tenantId"],
  id: (typeof attendanceRecords.$inferSelect)["id"],
) {
  return await db
    .update(attendanceRecords)
    .set({ deletedAt: new Date() })
    .where(and(eq(attendanceRecords.tenantId, tenantId), eq(attendanceRecords.id, id)));
}

export async function archiveAttendanceRecordsGuarded(
  db: Database,
  tenantId: (typeof attendanceRecords.$inferSelect)["tenantId"],
  id: (typeof attendanceRecords.$inferSelect)["id"],
) {
  await assertGraphGuardrailAllowsRead();
  return archiveAttendanceRecords(db, tenantId, id);
}


/** Safe by ID: tenant + not soft-deleted. */
export async function getShiftSchedulesByIdSafe(
  db: Database,
  tenantId: (typeof shiftSchedules.$inferSelect)["tenantId"],
  id: (typeof shiftSchedules.$inferSelect)["id"],
) {
  const rows = await db
    .select()
    .from(shiftSchedules)
    .where(
      and(
        eq(shiftSchedules.tenantId, tenantId),
        eq(shiftSchedules.id, id),
        isNull(shiftSchedules.deletedAt),
      ),
    )
    .limit(1);
  return rows[0] ?? null;
}

/** Same as getShiftSchedulesByIdSafe; asserts graph-validation policy when GRAPH_VALIDATION_POLICY_JSON is set. */
export async function getShiftSchedulesByIdSafeGuarded(
  db: Database,
  tenantId: (typeof shiftSchedules.$inferSelect)["tenantId"],
  id: (typeof shiftSchedules.$inferSelect)["id"],
) {
  await assertGraphGuardrailAllowsRead();
  return getShiftSchedulesByIdSafe(db, tenantId, id);
}

/** List rows for tenant excluding soft-deleted. */
export async function listShiftSchedulesActive(
  db: Database,
  tenantId: (typeof shiftSchedules.$inferSelect)["tenantId"],
) {
  return await db
    .select()
    .from(shiftSchedules)
    .where(and(eq(shiftSchedules.tenantId, tenantId), isNull(shiftSchedules.deletedAt)));
}

export async function listShiftSchedulesActiveGuarded(
  db: Database,
  tenantId: (typeof shiftSchedules.$inferSelect)["tenantId"],
) {
  await assertGraphGuardrailAllowsRead();
  return listShiftSchedulesActive(db, tenantId);
}

/** List all rows for tenant including soft-deleted. */
export async function listShiftSchedulesAll(
  db: Database,
  tenantId: (typeof shiftSchedules.$inferSelect)["tenantId"],
) {
  return await db.select().from(shiftSchedules).where(eq(shiftSchedules.tenantId, tenantId));
}

export async function listShiftSchedulesAllGuarded(
  db: Database,
  tenantId: (typeof shiftSchedules.$inferSelect)["tenantId"],
) {
  await assertGraphGuardrailAllowsRead();
  return listShiftSchedulesAll(db, tenantId);
}

/** Soft-archive (mechanical delete flag). */
export async function archiveShiftSchedules(
  db: Database,
  tenantId: (typeof shiftSchedules.$inferSelect)["tenantId"],
  id: (typeof shiftSchedules.$inferSelect)["id"],
) {
  return await db
    .update(shiftSchedules)
    .set({ deletedAt: new Date() })
    .where(and(eq(shiftSchedules.tenantId, tenantId), eq(shiftSchedules.id, id)));
}

export async function archiveShiftSchedulesGuarded(
  db: Database,
  tenantId: (typeof shiftSchedules.$inferSelect)["tenantId"],
  id: (typeof shiftSchedules.$inferSelect)["id"],
) {
  await assertGraphGuardrailAllowsRead();
  return archiveShiftSchedules(db, tenantId, id);
}


/** Safe by ID: tenant + not soft-deleted. */
export async function getShiftAssignmentsByIdSafe(
  db: Database,
  tenantId: (typeof shiftAssignments.$inferSelect)["tenantId"],
  id: (typeof shiftAssignments.$inferSelect)["id"],
) {
  const rows = await db
    .select()
    .from(shiftAssignments)
    .where(
      and(
        eq(shiftAssignments.tenantId, tenantId),
        eq(shiftAssignments.id, id),
        isNull(shiftAssignments.deletedAt),
      ),
    )
    .limit(1);
  return rows[0] ?? null;
}

/** Same as getShiftAssignmentsByIdSafe; asserts graph-validation policy when GRAPH_VALIDATION_POLICY_JSON is set. */
export async function getShiftAssignmentsByIdSafeGuarded(
  db: Database,
  tenantId: (typeof shiftAssignments.$inferSelect)["tenantId"],
  id: (typeof shiftAssignments.$inferSelect)["id"],
) {
  await assertGraphGuardrailAllowsRead();
  return getShiftAssignmentsByIdSafe(db, tenantId, id);
}

/** List rows for tenant excluding soft-deleted. */
export async function listShiftAssignmentsActive(
  db: Database,
  tenantId: (typeof shiftAssignments.$inferSelect)["tenantId"],
) {
  return await db
    .select()
    .from(shiftAssignments)
    .where(and(eq(shiftAssignments.tenantId, tenantId), isNull(shiftAssignments.deletedAt)));
}

export async function listShiftAssignmentsActiveGuarded(
  db: Database,
  tenantId: (typeof shiftAssignments.$inferSelect)["tenantId"],
) {
  await assertGraphGuardrailAllowsRead();
  return listShiftAssignmentsActive(db, tenantId);
}

/** List all rows for tenant including soft-deleted. */
export async function listShiftAssignmentsAll(
  db: Database,
  tenantId: (typeof shiftAssignments.$inferSelect)["tenantId"],
) {
  return await db.select().from(shiftAssignments).where(eq(shiftAssignments.tenantId, tenantId));
}

export async function listShiftAssignmentsAllGuarded(
  db: Database,
  tenantId: (typeof shiftAssignments.$inferSelect)["tenantId"],
) {
  await assertGraphGuardrailAllowsRead();
  return listShiftAssignmentsAll(db, tenantId);
}

/** Soft-archive (mechanical delete flag). */
export async function archiveShiftAssignments(
  db: Database,
  tenantId: (typeof shiftAssignments.$inferSelect)["tenantId"],
  id: (typeof shiftAssignments.$inferSelect)["id"],
) {
  return await db
    .update(shiftAssignments)
    .set({ deletedAt: new Date() })
    .where(and(eq(shiftAssignments.tenantId, tenantId), eq(shiftAssignments.id, id)));
}

export async function archiveShiftAssignmentsGuarded(
  db: Database,
  tenantId: (typeof shiftAssignments.$inferSelect)["tenantId"],
  id: (typeof shiftAssignments.$inferSelect)["id"],
) {
  await assertGraphGuardrailAllowsRead();
  return archiveShiftAssignments(db, tenantId, id);
}

