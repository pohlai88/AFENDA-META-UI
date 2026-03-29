import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  foreignKey,
  index,
  integer,
  numeric,
  text,
  date,
  timestamp,
  uuid,
  uniqueIndex,
} from "drizzle-orm/pg-core";

import { tenantIsolationPolicies, serviceBypassPolicy } from "../../rls/index.js";
import {
  auditColumns,
  nameColumn,
  softDeleteColumns,
  timestampColumns,
} from "../../columns/index.js";
import { tenants } from "../core/tenants.js";
import { countries, states } from "../reference/index.js";
import { hrSchema } from "./_schema.js";
import {
  leaveTypeEnum,
  leaveStatusEnum,
  attendanceStatusEnum,
  shiftTypeEnum,
} from "./_enums.js";
import { employees } from "./people.js";

// ============================================================================
// LEAVE TYPE CONFIGS
// ============================================================================

export const leaveTypeConfigs = hrSchema.table(
  "leave_type_configs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: integer("tenant_id").notNull(),
    leaveType: leaveTypeEnum("leave_type").notNull(),
    ...nameColumn,
    description: text("description"),
    annualAllocation: numeric("annual_allocation", { precision: 5, scale: 2 }).notNull(),
    maxCarryForward: numeric("max_carry_forward", { precision: 5, scale: 2 }),
    isPaid: boolean("is_paid").notNull().default(true),
    requiresApproval: boolean("requires_approval").notNull().default(true),
    minAdvanceNoticeDays: integer("min_advance_notice_days"),
    maxConsecutiveDays: integer("max_consecutive_days"),
    allowHalfDay: boolean("allow_half_day").notNull().default(true),
    isActive: boolean("is_active").notNull().default(true),
    ...timestampColumns,
    ...auditColumns,
    ...softDeleteColumns,
  },
  (table) => [
    foreignKey({ columns: [table.tenantId], foreignColumns: [tenants.tenantId] }),
    check("leave_type_configs_allocation_positive", sql`${table.annualAllocation} >= 0`),
    uniqueIndex("leave_type_configs_tenant_type_unique")
      .on(table.tenantId, table.leaveType)
      .where(sql`${table.deletedAt} IS NULL`),
    index("leave_type_configs_tenant_idx").on(table.tenantId),
    ...tenantIsolationPolicies("leave_type_configs"),
    serviceBypassPolicy("leave_type_configs"),
  ]
);

// ============================================================================
// LEAVE ALLOCATIONS
// ============================================================================

export const leaveAllocations = hrSchema.table(
  "leave_allocations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: integer("tenant_id").notNull(),
    employeeId: uuid("employee_id").notNull(),
    leaveTypeConfigId: uuid("leave_type_config_id").notNull(),
    allocationYear: integer("allocation_year").notNull(),
    totalAllocation: numeric("total_allocation", { precision: 5, scale: 2 }).notNull(),
    used: numeric("used", { precision: 5, scale: 2 }).notNull().default("0"),
    balance: numeric("balance", { precision: 5, scale: 2 }).notNull(),
    carriedForward: numeric("carried_forward", { precision: 5, scale: 2 }).notNull().default("0"),
    notes: text("notes"),
    ...timestampColumns,
    ...auditColumns,
  },
  (table) => [
    foreignKey({ columns: [table.tenantId], foreignColumns: [tenants.tenantId] }),
    foreignKey({
      columns: [table.tenantId, table.employeeId],
      foreignColumns: [employees.tenantId, employees.id],
    }),
    foreignKey({
      columns: [table.tenantId, table.leaveTypeConfigId],
      foreignColumns: [leaveTypeConfigs.tenantId, leaveTypeConfigs.id],
    }),
    check("leave_allocations_balance_valid", sql`${table.balance} >= 0`),
    uniqueIndex("leave_allocations_employee_type_year_unique").on(
      table.tenantId,
      table.employeeId,
      table.leaveTypeConfigId,
      table.allocationYear
    ),
    index("leave_allocations_tenant_idx").on(table.tenantId),
    index("leave_allocations_employee_idx").on(table.tenantId, table.employeeId),
    ...tenantIsolationPolicies("leave_allocations"),
    serviceBypassPolicy("leave_allocations"),
  ]
);

// ============================================================================
// LEAVE REQUESTS
// ============================================================================

export const leaveRequests = hrSchema.table(
  "leave_requests",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: integer("tenant_id").notNull(),
    requestNumber: text("request_number").notNull(),
    employeeId: uuid("employee_id").notNull(),
    leaveTypeConfigId: uuid("leave_type_config_id").notNull(),
    startDate: date("start_date").notNull(),
    endDate: date("end_date").notNull(),
    daysRequested: numeric("days_requested", { precision: 5, scale: 2 }).notNull(),
    reason: text("reason"),
    leaveStatus: leaveStatusEnum("leave_status").notNull().default("draft"),
    requestedDate: date("requested_date").notNull(),
    approvedBy: uuid("approved_by"),
    approvedDate: date("approved_date"),
    rejectionReason: text("rejection_reason"),
    notes: text("notes"),
    ...timestampColumns,
    ...auditColumns,
    ...softDeleteColumns,
  },
  (table) => [
    foreignKey({ columns: [table.tenantId], foreignColumns: [tenants.tenantId] }),
    foreignKey({
      columns: [table.tenantId, table.employeeId],
      foreignColumns: [employees.tenantId, employees.id],
    }),
    foreignKey({
      columns: [table.tenantId, table.leaveTypeConfigId],
      foreignColumns: [leaveTypeConfigs.tenantId, leaveTypeConfigs.id],
    }),
    foreignKey({
      columns: [table.tenantId, table.approvedBy],
      foreignColumns: [employees.tenantId, employees.id],
    }),
    check("leave_requests_date_range", sql`${table.startDate} <= ${table.endDate}`),
    check("leave_requests_days_positive", sql`${table.daysRequested} > 0`),
    uniqueIndex("leave_requests_tenant_number_unique")
      .on(table.tenantId, table.requestNumber)
      .where(sql`${table.deletedAt} IS NULL`),
    index("leave_requests_tenant_idx").on(table.tenantId),
    index("leave_requests_employee_idx").on(table.tenantId, table.employeeId),
    index("leave_requests_status_idx").on(table.tenantId, table.leaveStatus),
    ...tenantIsolationPolicies("leave_requests"),
    serviceBypassPolicy("leave_requests"),
  ]
);

// ============================================================================
// HOLIDAY CALENDARS
// ============================================================================

export const holidayCalendars = hrSchema.table(
  "holiday_calendars",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: integer("tenant_id").notNull(),
    calendarCode: text("calendar_code").notNull(),
    ...nameColumn,
    description: text("description"),
    year: integer("year").notNull(),
    countryId: integer("country_id"),
    stateId: integer("state_id"),
    isActive: boolean("is_active").notNull().default(true),
    ...timestampColumns,
    ...auditColumns,
    ...softDeleteColumns,
  },
  (table) => [
    foreignKey({ columns: [table.tenantId], foreignColumns: [tenants.tenantId] }),
    foreignKey({ columns: [table.countryId], foreignColumns: [countries.countryId] }),
    foreignKey({ columns: [table.stateId], foreignColumns: [states.stateId] }),
    uniqueIndex("holiday_calendars_tenant_code_unique")
      .on(table.tenantId, table.calendarCode)
      .where(sql`${table.deletedAt} IS NULL`),
    index("holiday_calendars_tenant_idx").on(table.tenantId),
    ...tenantIsolationPolicies("holiday_calendars"),
    serviceBypassPolicy("holiday_calendars"),
  ]
);

// ============================================================================
// HOLIDAYS
// ============================================================================

export const holidays = hrSchema.table(
  "holidays",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: integer("tenant_id").notNull(),
    holidayCalendarId: uuid("holiday_calendar_id").notNull(),
    ...nameColumn,
    holidayDate: date("holiday_date").notNull(),
    description: text("description"),
    isRecurring: boolean("is_recurring").notNull().default(false),
    ...timestampColumns,
    ...auditColumns,
    ...softDeleteColumns,
  },
  (table) => [
    foreignKey({ columns: [table.tenantId], foreignColumns: [tenants.tenantId] }),
    foreignKey({
      columns: [table.tenantId, table.holidayCalendarId],
      foreignColumns: [holidayCalendars.tenantId, holidayCalendars.id],
    }),
    index("holidays_tenant_idx").on(table.tenantId),
    index("holidays_calendar_idx").on(table.tenantId, table.holidayCalendarId),
    index("holidays_date_idx").on(table.tenantId, table.holidayDate),
    ...tenantIsolationPolicies("holidays"),
    serviceBypassPolicy("holidays"),
  ]
);

// ============================================================================
// TIME SHEETS
// ============================================================================

export const timeSheets = hrSchema.table(
  "time_sheets",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: integer("tenant_id").notNull(),
    timesheetNumber: text("timesheet_number").notNull(),
    employeeId: uuid("employee_id").notNull(),
    periodStartDate: date("period_start_date").notNull(),
    periodEndDate: date("period_end_date").notNull(),
    totalHours: numeric("total_hours", { precision: 8, scale: 2 }).notNull().default("0"),
    totalOvertime: numeric("total_overtime", { precision: 8, scale: 2 }).notNull().default("0"),
    leaveStatus: leaveStatusEnum("leave_status").notNull().default("draft"),
    submittedDate: date("submitted_date"),
    approvedBy: uuid("approved_by"),
    approvedDate: date("approved_date"),
    notes: text("notes"),
    ...timestampColumns,
    ...auditColumns,
    ...softDeleteColumns,
  },
  (table) => [
    foreignKey({ columns: [table.tenantId], foreignColumns: [tenants.tenantId] }),
    foreignKey({
      columns: [table.tenantId, table.employeeId],
      foreignColumns: [employees.tenantId, employees.id],
    }),
    foreignKey({
      columns: [table.tenantId, table.approvedBy],
      foreignColumns: [employees.tenantId, employees.id],
    }),
    check("time_sheets_date_range", sql`${table.periodStartDate} <= ${table.periodEndDate}`),
    check("time_sheets_hours_positive", sql`${table.totalHours} >= 0`),
    uniqueIndex("time_sheets_tenant_number_unique")
      .on(table.tenantId, table.timesheetNumber)
      .where(sql`${table.deletedAt} IS NULL`),
    index("time_sheets_tenant_idx").on(table.tenantId),
    index("time_sheets_employee_idx").on(table.tenantId, table.employeeId),
    ...tenantIsolationPolicies("time_sheets"),
    serviceBypassPolicy("time_sheets"),
  ]
);

// ============================================================================
// TIME SHEET LINES
// ============================================================================

export const timeSheetLines = hrSchema.table(
  "time_sheet_lines",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: integer("tenant_id").notNull(),
    timeSheetId: uuid("time_sheet_id").notNull(),
    workDate: date("work_date").notNull(),
    hoursWorked: numeric("hours_worked", { precision: 5, scale: 2 }).notNull(),
    overtimeHours: numeric("overtime_hours", { precision: 5, scale: 2 }).notNull().default("0"),
    description: text("description"),
    notes: text("notes"),
    ...timestampColumns,
    ...auditColumns,
  },
  (table) => [
    foreignKey({ columns: [table.tenantId], foreignColumns: [tenants.tenantId] }),
    foreignKey({
      columns: [table.tenantId, table.timeSheetId],
      foreignColumns: [timeSheets.tenantId, timeSheets.id],
    }),
    check("time_sheet_lines_hours_valid", sql`${table.hoursWorked} >= 0 AND ${table.hoursWorked} <= 24`),
    index("time_sheet_lines_tenant_idx").on(table.tenantId),
    index("time_sheet_lines_timesheet_idx").on(table.tenantId, table.timeSheetId),
    ...tenantIsolationPolicies("time_sheet_lines"),
    serviceBypassPolicy("time_sheet_lines"),
  ]
);

// ============================================================================
// ATTENDANCE RECORDS
// ============================================================================

export const attendanceRecords = hrSchema.table(
  "attendance_records",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: integer("tenant_id").notNull(),
    employeeId: uuid("employee_id").notNull(),
    attendanceDate: date("attendance_date").notNull(),
    checkInTime: timestamp("check_in_time", { withTimezone: true }),
    checkOutTime: timestamp("check_out_time", { withTimezone: true }),
    hoursWorked: numeric("hours_worked", { precision: 5, scale: 2 }),
    attendanceStatus: attendanceStatusEnum("attendance_status").notNull(),
    notes: text("notes"),
    ...timestampColumns,
    ...auditColumns,
  },
  (table) => [
    foreignKey({ columns: [table.tenantId], foreignColumns: [tenants.tenantId] }),
    foreignKey({
      columns: [table.tenantId, table.employeeId],
      foreignColumns: [employees.tenantId, employees.id],
    }),
    uniqueIndex("attendance_records_employee_date_unique").on(
      table.tenantId,
      table.employeeId,
      table.attendanceDate
    ),
    index("attendance_records_tenant_idx").on(table.tenantId),
    index("attendance_records_employee_idx").on(table.tenantId, table.employeeId),
    index("attendance_records_date_idx").on(table.tenantId, table.attendanceDate),
    ...tenantIsolationPolicies("attendance_records"),
    serviceBypassPolicy("attendance_records"),
  ]
);

// ============================================================================
// SHIFT SCHEDULES
// ============================================================================

export const shiftSchedules = hrSchema.table(
  "shift_schedules",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: integer("tenant_id").notNull(),
    shiftCode: text("shift_code").notNull(),
    ...nameColumn,
    description: text("description"),
    shiftType: shiftTypeEnum("shift_type").notNull(),
    startTime: text("start_time").notNull(),
    endTime: text("end_time").notNull(),
    workingHours: numeric("working_hours", { precision: 5, scale: 2 }).notNull(),
    breakMinutes: integer("break_minutes").notNull().default(0),
    isActive: boolean("is_active").notNull().default(true),
    ...timestampColumns,
    ...auditColumns,
    ...softDeleteColumns,
  },
  (table) => [
    foreignKey({ columns: [table.tenantId], foreignColumns: [tenants.tenantId] }),
    check("shift_schedules_working_hours_positive", sql`${table.workingHours} > 0`),
    check("shift_schedules_break_positive", sql`${table.breakMinutes} >= 0`),
    uniqueIndex("shift_schedules_tenant_code_unique")
      .on(table.tenantId, table.shiftCode)
      .where(sql`${table.deletedAt} IS NULL`),
    index("shift_schedules_tenant_idx").on(table.tenantId),
    ...tenantIsolationPolicies("shift_schedules"),
    serviceBypassPolicy("shift_schedules"),
  ]
);

// ============================================================================
// SHIFT ASSIGNMENTS
// ============================================================================

export const shiftAssignments = hrSchema.table(
  "shift_assignments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: integer("tenant_id").notNull(),
    employeeId: uuid("employee_id").notNull(),
    shiftScheduleId: uuid("shift_schedule_id").notNull(),
    assignmentDate: date("assignment_date").notNull(),
    notes: text("notes"),
    ...timestampColumns,
    ...auditColumns,
  },
  (table) => [
    foreignKey({ columns: [table.tenantId], foreignColumns: [tenants.tenantId] }),
    foreignKey({
      columns: [table.tenantId, table.employeeId],
      foreignColumns: [employees.tenantId, employees.id],
    }),
    foreignKey({
      columns: [table.tenantId, table.shiftScheduleId],
      foreignColumns: [shiftSchedules.tenantId, shiftSchedules.id],
    }),
    uniqueIndex("shift_assignments_employee_date_unique").on(
      table.tenantId,
      table.employeeId,
      table.assignmentDate
    ),
    index("shift_assignments_tenant_idx").on(table.tenantId),
    index("shift_assignments_employee_idx").on(table.tenantId, table.employeeId),
    ...tenantIsolationPolicies("shift_assignments"),
    serviceBypassPolicy("shift_assignments"),
  ]
);
