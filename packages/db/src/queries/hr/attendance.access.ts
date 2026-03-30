// @generated
// Full access scaffold — tools/ci-gate/db-access-layer (emit-full).
// Human-owned reporting: use separate modules (not *.access.ts).

import { and, eq, isNull } from "drizzle-orm";
import type { Database } from "../../db.js";
import {
  attendanceRecords,
  holidayCalendars,
  holidays,
  leaveAllocations,
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

/** List all rows for tenant including soft-deleted. */
export async function listLeaveTypeConfigsAll(
  db: Database,
  tenantId: (typeof leaveTypeConfigs.$inferSelect)["tenantId"],
) {
  return await db.select().from(leaveTypeConfigs).where(eq(leaveTypeConfigs.tenantId, tenantId));
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


/** By ID for tenant (no soft-delete column on table). */
export async function getLeaveAllocationsById(
  db: Database,
  tenantId: (typeof leaveAllocations.$inferSelect)["tenantId"],
  id: (typeof leaveAllocations.$inferSelect)["id"],
) {
  const rows = await db
    .select()
    .from(leaveAllocations)
    .where(and(eq(leaveAllocations.tenantId, tenantId), eq(leaveAllocations.id, id)))
    .limit(1);
  return rows[0] ?? null;
}

/** List rows for tenant. */
export async function listLeaveAllocations(
  db: Database,
  tenantId: (typeof leaveAllocations.$inferSelect)["tenantId"],
) {
  return await db.select().from(leaveAllocations).where(eq(leaveAllocations.tenantId, tenantId));
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

/** List all rows for tenant including soft-deleted. */
export async function listLeaveRequestsAll(
  db: Database,
  tenantId: (typeof leaveRequests.$inferSelect)["tenantId"],
) {
  return await db.select().from(leaveRequests).where(eq(leaveRequests.tenantId, tenantId));
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

/** List all rows for tenant including soft-deleted. */
export async function listHolidayCalendarsAll(
  db: Database,
  tenantId: (typeof holidayCalendars.$inferSelect)["tenantId"],
) {
  return await db.select().from(holidayCalendars).where(eq(holidayCalendars.tenantId, tenantId));
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

/** List all rows for tenant including soft-deleted. */
export async function listHolidaysAll(
  db: Database,
  tenantId: (typeof holidays.$inferSelect)["tenantId"],
) {
  return await db.select().from(holidays).where(eq(holidays.tenantId, tenantId));
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

/** List all rows for tenant including soft-deleted. */
export async function listTimeSheetsAll(
  db: Database,
  tenantId: (typeof timeSheets.$inferSelect)["tenantId"],
) {
  return await db.select().from(timeSheets).where(eq(timeSheets.tenantId, tenantId));
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


/** By ID for tenant (no soft-delete column on table). */
export async function getTimeSheetLinesById(
  db: Database,
  tenantId: (typeof timeSheetLines.$inferSelect)["tenantId"],
  id: (typeof timeSheetLines.$inferSelect)["id"],
) {
  const rows = await db
    .select()
    .from(timeSheetLines)
    .where(and(eq(timeSheetLines.tenantId, tenantId), eq(timeSheetLines.id, id)))
    .limit(1);
  return rows[0] ?? null;
}

/** List rows for tenant. */
export async function listTimeSheetLines(
  db: Database,
  tenantId: (typeof timeSheetLines.$inferSelect)["tenantId"],
) {
  return await db.select().from(timeSheetLines).where(eq(timeSheetLines.tenantId, tenantId));
}


/** By ID for tenant (no soft-delete column on table). */
export async function getAttendanceRecordsById(
  db: Database,
  tenantId: (typeof attendanceRecords.$inferSelect)["tenantId"],
  id: (typeof attendanceRecords.$inferSelect)["id"],
) {
  const rows = await db
    .select()
    .from(attendanceRecords)
    .where(and(eq(attendanceRecords.tenantId, tenantId), eq(attendanceRecords.id, id)))
    .limit(1);
  return rows[0] ?? null;
}

/** List rows for tenant. */
export async function listAttendanceRecords(
  db: Database,
  tenantId: (typeof attendanceRecords.$inferSelect)["tenantId"],
) {
  return await db.select().from(attendanceRecords).where(eq(attendanceRecords.tenantId, tenantId));
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

/** List all rows for tenant including soft-deleted. */
export async function listShiftSchedulesAll(
  db: Database,
  tenantId: (typeof shiftSchedules.$inferSelect)["tenantId"],
) {
  return await db.select().from(shiftSchedules).where(eq(shiftSchedules.tenantId, tenantId));
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


/** By ID for tenant (no soft-delete column on table). */
export async function getShiftAssignmentsById(
  db: Database,
  tenantId: (typeof shiftAssignments.$inferSelect)["tenantId"],
  id: (typeof shiftAssignments.$inferSelect)["id"],
) {
  const rows = await db
    .select()
    .from(shiftAssignments)
    .where(and(eq(shiftAssignments.tenantId, tenantId), eq(shiftAssignments.id, id)))
    .limit(1);
  return rows[0] ?? null;
}

/** List rows for tenant. */
export async function listShiftAssignments(
  db: Database,
  tenantId: (typeof shiftAssignments.$inferSelect)["tenantId"],
) {
  return await db.select().from(shiftAssignments).where(eq(shiftAssignments.tenantId, tenantId));
}

