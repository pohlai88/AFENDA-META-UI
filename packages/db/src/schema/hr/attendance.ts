// ============================================================================
// HR DOMAIN: ATTENDANCE & LEAVE (Phase 3)
// Defines leave policies, time sheets, attendance records, shift scheduling.
// Tables: leave_type_configs, leave_allocations, leave_requests, leave_request_status_history,
// holiday_calendars, holidays, time_sheets, time_sheet_lines, attendance_records, shift_schedules, shift_assignments
// ============================================================================
import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  foreignKey,
  index,
  integer,
  numeric,
  text,
  time,
  date,
  timestamp,
  uuid,
  uniqueIndex,
} from "drizzle-orm/pg-core";

import { tenantIsolationPolicies, serviceBypassPolicy } from "../../rls-policies/index.js";
import {
  appendOnlyTimestampColumns,
  auditColumns,
  nameColumn,
  softDeleteColumns,
  timestampColumns,
} from "../../column-kit/index.js";
import { users } from "../security/index.js";
import { tenants } from "../core/tenants.js";
import { countries, states } from "../reference/index.js";
import { hrSchema } from "./_schema.js";
import {
  leaveTypeEnum,
  leaveStatusEnum,
  LeaveStatusSchema,
  LeaveTypeSchema,
  AttendanceStatusSchema,
  ShiftTypeSchema,
  HolidayCalendarTypeSchema,
  ShiftAssignmentStatusSchema,
  attendanceStatusEnum,
  shiftTypeEnum,
  holidayCalendarTypeEnum,
  shiftAssignmentStatusEnum,
} from "./_enums.js";
import { z } from "zod/v4";
import {
  AttendanceRecordIdSchema,
  EmployeeIdSchema,
  HolidayCalendarIdSchema,
  HolidayIdSchema,
  hrTenantIdSchema,
  LeaveAllocationIdSchema,
  LeaveRequestIdSchema,
  LeaveRequestStatusHistoryIdSchema,
  LeaveTypeConfigIdSchema,
  personNameSchema,
  ShiftAssignmentIdSchema,
  ShiftScheduleIdSchema,
  TimeSheetIdSchema,
  TimeSheetLineIdSchema,
  currencyAmountSchema,
  refineApprovedRequiresActor,
  refineApprovalFieldsAbsentUnlessApproved,
  refineRejectedRequiresReason,
  refineReasonAbsentUnlessRejected,
} from "./_zodShared.js";
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
    isEncashable: boolean("is_encashable").notNull().default(false),
    encashmentRate: numeric("encashment_rate", { precision: 5, scale: 2 }),
    isCompensatory: boolean("is_compensatory").notNull().default(false),
    isActive: boolean("is_active").notNull().default(true),
    effectiveFrom: date("effective_from", { mode: "string" }),
    effectiveTo: date("effective_to", { mode: "string" }),
    carryForwardExpiryDate: date("carry_forward_expiry_date", { mode: "string" }),
    ...timestampColumns,
    ...auditColumns(() => users.userId),
    ...softDeleteColumns,
  },
  (table) => [
    foreignKey({ columns: [table.tenantId], foreignColumns: [tenants.tenantId] }),
    check("leave_type_configs_allocation_positive", sql`${table.annualAllocation} >= 0`),
    check(
      "leave_type_configs_effective_range",
      sql`${table.effectiveFrom} IS NULL OR ${table.effectiveTo} IS NULL OR ${table.effectiveTo} >= ${table.effectiveFrom}`
    ),
    check(
      "leave_type_configs_carry_forward_expiry_order",
      sql`${table.carryForwardExpiryDate} IS NULL OR ${table.effectiveFrom} IS NULL OR ${table.carryForwardExpiryDate} >= ${table.effectiveFrom}`
    ),
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
    ...auditColumns(() => users.userId),
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
    check("leave_allocations_balance_valid", sql`${table.balance} >= 0`),
    check("leave_allocations_used_non_negative", sql`${table.used} >= 0`),
    check("leave_allocations_carried_non_negative", sql`${table.carriedForward} >= 0`),
    check(
      "leave_allocations_balance_identity",
      sql`${table.balance} = ${table.totalAllocation} + ${table.carriedForward} - ${table.used}`
    ),
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
    startDate: date("start_date", { mode: "string" }).notNull(),
    endDate: date("end_date", { mode: "string" }).notNull(),
    daysRequested: numeric("days_requested", { precision: 5, scale: 2 }).notNull(),
    reason: text("reason"),
    leaveStatus: leaveStatusEnum("leave_status").notNull().default("draft"),
    requestedDate: date("requested_date", { mode: "string" }).notNull(),
    approvedBy: uuid("approved_by"),
    approvedDate: date("approved_date", { mode: "string" }),
    rejectionReason: text("rejection_reason"),
    notes: text("notes"),
    ...timestampColumns,
    ...auditColumns(() => users.userId),
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
    check(
      "leave_requests_approval_matches_status",
      sql`(
        (${table.leaveStatus} = 'approved'::hr.leave_status AND ${table.approvedBy} IS NOT NULL AND ${table.approvedDate} IS NOT NULL)
        OR
        (${table.leaveStatus} <> 'approved'::hr.leave_status AND ${table.approvedBy} IS NULL AND ${table.approvedDate} IS NULL)
      )`
    ),
    check(
      "leave_requests_rejected_requires_reason",
      sql`${table.leaveStatus} <> 'rejected'::hr.leave_status OR (${table.rejectionReason} IS NOT NULL AND btrim(${table.rejectionReason}) <> '')`
    ),
    uniqueIndex("leave_requests_tenant_number_unique")
      .on(table.tenantId, table.requestNumber)
      .where(sql`${table.deletedAt} IS NULL`),
    index("leave_requests_tenant_idx").on(table.tenantId),
    index("leave_requests_employee_idx").on(table.tenantId, table.employeeId),
    index("leave_requests_status_idx").on(table.tenantId, table.leaveStatus),
    index("leave_requests_employee_status_idx")
      .on(table.tenantId, table.employeeId, table.leaveStatus)
      .where(sql`${table.deletedAt} IS NULL`),
    ...tenantIsolationPolicies("leave_requests"),
    serviceBypassPolicy("leave_requests"),
  ]
);

// ============================================================================
// LEAVE REQUEST STATUS HISTORY (append-only workflow audit)
// ============================================================================

export const leaveRequestStatusHistory = hrSchema.table(
  "leave_request_status_history",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: integer("tenant_id").notNull(),
    leaveRequestId: uuid("leave_request_id").notNull(),
    fromStatus: leaveStatusEnum("from_status"),
    toStatus: leaveStatusEnum("to_status").notNull(),
    changedBy: uuid("changed_by"),
    notes: text("notes"),
    createdBy: integer("created_by").notNull().references(() => users.userId),
    ...appendOnlyTimestampColumns,
  },
  (table) => [
    foreignKey({ columns: [table.tenantId], foreignColumns: [tenants.tenantId] }),
    foreignKey({
      columns: [table.tenantId, table.leaveRequestId],
      foreignColumns: [leaveRequests.tenantId, leaveRequests.id],
    }),
    foreignKey({
      columns: [table.tenantId, table.changedBy],
      foreignColumns: [employees.tenantId, employees.id],
    }),
    index("leave_request_status_history_tenant_idx").on(table.tenantId),
    index("leave_request_status_history_request_idx").on(table.tenantId, table.leaveRequestId),
    ...tenantIsolationPolicies("leave_request_status_history"),
    serviceBypassPolicy("leave_request_status_history"),
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
    holidayType: holidayCalendarTypeEnum("holiday_type").notNull().default("public"),
    isActive: boolean("is_active").notNull().default(true),
    ...timestampColumns,
    ...auditColumns(() => users.userId),
    ...softDeleteColumns,
  },
  (table) => [
    foreignKey({ columns: [table.tenantId], foreignColumns: [tenants.tenantId] }),
    foreignKey({ columns: [table.countryId], foreignColumns: [countries.countryId] }),
    foreignKey({ columns: [table.stateId], foreignColumns: [states.stateId] }),
    index("holiday_calendars_holiday_type_idx").on(table.tenantId, table.holidayType),
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
    holidayDate: date("holiday_date", { mode: "string" }).notNull(),
    description: text("description"),
    isRecurring: boolean("is_recurring").notNull().default(false),
    ...timestampColumns,
    ...auditColumns(() => users.userId),
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
    periodStartDate: date("period_start_date", { mode: "string" }).notNull(),
    periodEndDate: date("period_end_date", { mode: "string" }).notNull(),
    totalHours: numeric("total_hours", { precision: 8, scale: 2 }).notNull().default("0"),
    totalOvertime: numeric("total_overtime", { precision: 8, scale: 2 }).notNull().default("0"),
    leaveStatus: leaveStatusEnum("leave_status").notNull().default("draft"),
    submittedDate: date("submitted_date", { mode: "string" }),
    submittedBy: uuid("submitted_by"),
    approvedBy: uuid("approved_by"),
    approvedDate: date("approved_date", { mode: "string" }),
    notes: text("notes"),
    ...timestampColumns,
    ...auditColumns(() => users.userId),
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
    foreignKey({
      columns: [table.tenantId, table.submittedBy],
      foreignColumns: [employees.tenantId, employees.id],
    }),
    check("time_sheets_date_range", sql`${table.periodStartDate} <= ${table.periodEndDate}`),
    check("time_sheets_hours_positive", sql`${table.totalHours} >= 0`),
    check(
      "time_sheets_approval_matches_status",
      sql`(
        (${table.leaveStatus} = 'approved'::hr.leave_status AND ${table.approvedBy} IS NOT NULL AND ${table.approvedDate} IS NOT NULL)
        OR
        (${table.leaveStatus} <> 'approved'::hr.leave_status AND ${table.approvedBy} IS NULL AND ${table.approvedDate} IS NULL)
      )`
    ),
    uniqueIndex("time_sheets_tenant_number_unique")
      .on(table.tenantId, table.timesheetNumber)
      .where(sql`${table.deletedAt} IS NULL`),
    index("time_sheets_tenant_idx").on(table.tenantId),
    index("time_sheets_employee_idx").on(table.tenantId, table.employeeId),
    index("time_sheets_submitted_by_idx").on(table.tenantId, table.submittedBy),
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
    workDate: date("work_date", { mode: "string" }).notNull(),
    hoursWorked: numeric("hours_worked", { precision: 5, scale: 2 }).notNull(),
    overtimeHours: numeric("overtime_hours", { precision: 5, scale: 2 }).notNull().default("0"),
    description: text("description"),
    notes: text("notes"),
    ...timestampColumns,
    ...auditColumns(() => users.userId),
    ...softDeleteColumns,
  },
  (table) => [
    foreignKey({ columns: [table.tenantId], foreignColumns: [tenants.tenantId] }),
    foreignKey({
      columns: [table.tenantId, table.timeSheetId],
      foreignColumns: [timeSheets.tenantId, timeSheets.id],
    }),
    check(
      "time_sheet_lines_hours_valid",
      sql`${table.hoursWorked} >= 0 AND ${table.hoursWorked} <= 24`
    ),
    check(
      "time_sheet_lines_overtime_valid",
      sql`${table.overtimeHours} >= 0 AND ${table.overtimeHours} <= 24`
    ),
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
    attendanceDate: date("attendance_date", { mode: "string" }).notNull(),
    checkInTime: timestamp("check_in_time", { withTimezone: true }),
    checkOutTime: timestamp("check_out_time", { withTimezone: true }),
    hoursWorked: numeric("hours_worked", { precision: 5, scale: 2 }),
    attendanceStatus: attendanceStatusEnum("attendance_status").notNull(),
    notes: text("notes"),
    ...timestampColumns,
    ...auditColumns(() => users.userId),
    ...softDeleteColumns,
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
    startTime: time("start_time").notNull(),
    endTime: time("end_time").notNull(),
    workingHours: numeric("working_hours", { precision: 5, scale: 2 }).notNull(),
    breakMinutes: integer("break_minutes").notNull().default(0),
    isActive: boolean("is_active").notNull().default(true),
    ...timestampColumns,
    ...auditColumns(() => users.userId),
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
    assignmentDate: date("assignment_date", { mode: "string" }).notNull(),
    status: shiftAssignmentStatusEnum("status").notNull().default("planned"),
    notes: text("notes"),
    ...timestampColumns,
    ...auditColumns(() => users.userId),
    ...softDeleteColumns,
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
    index("shift_assignments_status_idx").on(table.tenantId, table.status),
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

// ============================================================================
// ZOD INSERT SCHEMAS
// ============================================================================

export const insertLeaveTypeConfigSchema = z
  .object({
    id: LeaveTypeConfigIdSchema.optional(),
    tenantId: hrTenantIdSchema,
    leaveType: LeaveTypeSchema,
    name: personNameSchema,
    description: z.string().max(2000).optional(),
    annualAllocation: currencyAmountSchema(2).refine((v) => parseFloat(v) >= 0, "Must be non-negative"),
    maxCarryForward: currencyAmountSchema(2).optional(),
    isPaid: z.boolean().default(true),
    requiresApproval: z.boolean().default(true),
    minAdvanceNoticeDays: z.number().int().nonnegative().optional(),
    maxConsecutiveDays: z.number().int().positive().optional(),
    allowHalfDay: z.boolean().default(true),
    isEncashable: z.boolean().default(false),
    encashmentRate: currencyAmountSchema(2).optional(),
    isCompensatory: z.boolean().default(false),
    isActive: z.boolean().default(true),
    effectiveFrom: z.iso.date().optional(),
    effectiveTo: z.iso.date().optional(),
    carryForwardExpiryDate: z.iso.date().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.effectiveFrom && data.effectiveTo && data.effectiveFrom > data.effectiveTo) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "effectiveTo must be on or after effectiveFrom",
        path: ["effectiveTo"],
      });
    }
    if (
      data.carryForwardExpiryDate &&
      data.effectiveFrom &&
      data.carryForwardExpiryDate < data.effectiveFrom
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "carryForwardExpiryDate must be on or after effectiveFrom when both are set",
        path: ["carryForwardExpiryDate"],
      });
    }
  });

export const insertLeaveAllocationSchema = z
  .object({
    id: LeaveAllocationIdSchema.optional(),
    tenantId: hrTenantIdSchema,
    employeeId: EmployeeIdSchema,
    leaveTypeConfigId: LeaveTypeConfigIdSchema,
    allocationYear: z.number().int().min(1900).max(2100),
    totalAllocation: currencyAmountSchema(2).refine((v) => parseFloat(v) >= 0, "Must be non-negative"),
    used: currencyAmountSchema(2).default("0"),
    balance: currencyAmountSchema(2).refine((v) => parseFloat(v) >= 0, "Must be non-negative"),
    carriedForward: currencyAmountSchema(2).default("0"),
    notes: z.string().max(2000).optional(),
  })
  .superRefine((data, ctx) => {
    const used = parseFloat(data.used);
    const carried = parseFloat(data.carriedForward);
    if (used < 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "used must be non-negative",
        path: ["used"],
      });
    }
    if (carried < 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "carriedForward must be non-negative",
        path: ["carriedForward"],
      });
    }
    const total = parseFloat(data.totalAllocation);
    const bal = parseFloat(data.balance);
    const expected = Math.round((total + carried - used) * 100) / 100;
    const actual = Math.round(bal * 100) / 100;
    if (actual !== expected) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "balance must equal totalAllocation + carriedForward - used",
        path: ["balance"],
      });
    }
  });

export const insertHolidayCalendarSchema = z.object({
  id: HolidayCalendarIdSchema.optional(),
  tenantId: hrTenantIdSchema,
  calendarCode: z.string().min(2).max(50),
  name: personNameSchema,
  description: z.string().max(2000).optional(),
  year: z.number().int().min(1900).max(2100),
  countryId: z.number().int().positive().optional(),
  stateId: z.number().int().positive().optional(),
  holidayType: HolidayCalendarTypeSchema.default("public"),
  isActive: z.boolean().default(true),
});

export const insertHolidaySchema = z.object({
  id: HolidayIdSchema.optional(),
  tenantId: hrTenantIdSchema,
  holidayCalendarId: HolidayCalendarIdSchema,
  name: personNameSchema,
  holidayDate: z.iso.date(),
  description: z.string().max(2000).optional(),
  isRecurring: z.boolean().default(false),
});

const hours0to24 = z
  .string()
  .regex(/^\d+(\.\d{1,2})?$/)
  .refine((v) => {
    const n = parseFloat(v);
    return n >= 0 && n <= 24;
  }, "Must be between 0 and 24");

export const insertTimeSheetLineSchema = z.object({
  id: TimeSheetLineIdSchema.optional(),
  tenantId: hrTenantIdSchema,
  timeSheetId: TimeSheetIdSchema,
  workDate: z.iso.date(),
  hoursWorked: hours0to24,
  overtimeHours: z
    .string()
    .regex(/^\d+(\.\d{1,2})?$/)
    .default("0")
    .refine((v) => {
      const n = parseFloat(v);
      return n >= 0 && n <= 24;
    }, "Must be between 0 and 24"),
  description: z.string().max(500).optional(),
  notes: z.string().max(2000).optional(),
});

export const insertAttendanceRecordSchema = z.object({
  id: AttendanceRecordIdSchema.optional(),
  tenantId: hrTenantIdSchema,
  employeeId: EmployeeIdSchema,
  attendanceDate: z.iso.date(),
  checkInTime: z.iso.datetime().optional(),
  checkOutTime: z.iso.datetime().optional(),
  hoursWorked: z
    .string()
    .regex(/^\d+(\.\d{1,2})?$/)
    .refine((v) => parseFloat(v) >= 0, "Must be non-negative")
    .optional(),
  attendanceStatus: AttendanceStatusSchema,
  notes: z.string().max(2000).optional(),
});

export const insertShiftScheduleSchema = z.object({
  id: ShiftScheduleIdSchema.optional(),
  tenantId: hrTenantIdSchema,
  shiftCode: z.string().min(2).max(50),
  name: personNameSchema,
  description: z.string().max(2000).optional(),
  shiftType: ShiftTypeSchema,
  startTime: z.iso.time(),
  endTime: z.iso.time(),
  workingHours: z
    .string()
    .regex(/^\d+(\.\d{1,2})?$/)
    .refine((v) => parseFloat(v) > 0, "Must be positive"),
  breakMinutes: z.number().int().nonnegative().default(0),
  isActive: z.boolean().default(true),
});

export const insertShiftAssignmentSchema = z.object({
  id: ShiftAssignmentIdSchema.optional(),
  tenantId: hrTenantIdSchema,
  employeeId: EmployeeIdSchema,
  shiftScheduleId: ShiftScheduleIdSchema,
  assignmentDate: z.iso.date(),
  status: ShiftAssignmentStatusSchema.default("planned"),
  notes: z.string().max(2000).optional(),
});

export const insertLeaveRequestStatusHistorySchema = z.object({
  id: LeaveRequestStatusHistoryIdSchema.optional(),
  tenantId: hrTenantIdSchema,
  leaveRequestId: LeaveRequestIdSchema,
  fromStatus: LeaveStatusSchema.optional(),
  toStatus: LeaveStatusSchema,
  changedBy: EmployeeIdSchema.optional(),
  notes: z.string().max(2000).optional(),
});

// Leave / time workflow (`leave_status` enum)
export const insertLeaveRequestSchema = z
  .object({
    id: LeaveRequestIdSchema.optional(),
    tenantId: hrTenantIdSchema,
    requestNumber: z.string().min(3).max(50),
    employeeId: EmployeeIdSchema,
    leaveTypeConfigId: LeaveTypeConfigIdSchema,
    startDate: z.iso.date(),
    endDate: z.iso.date(),
    daysRequested: z
      .string()
      .regex(/^\d+(\.\d{1,2})?$/)
      .refine((v) => parseFloat(v) > 0, "daysRequested must be positive"),
    reason: z.string().max(2000).optional(),
    leaveStatus: LeaveStatusSchema.default("draft"),
    requestedDate: z.iso.date(),
    approvedBy: EmployeeIdSchema.optional(),
    approvedDate: z.iso.date().optional(),
    rejectionReason: z.string().max(2000).optional(),
    notes: z.string().max(2000).optional(),
  })
  .superRefine((data, ctx) => {
    if (data.startDate > data.endDate) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "endDate must be on or after startDate",
        path: ["endDate"],
      });
    }
  })
  .superRefine(
    refineApprovedRequiresActor({
      statusField: "leaveStatus",
      approvedValue: "approved",
      actorField: "approvedBy",
      atField: "approvedDate",
    })
  )
  .superRefine(
    refineApprovalFieldsAbsentUnlessApproved({
      statusField: "leaveStatus",
      approvedValue: "approved",
      actorField: "approvedBy",
      atField: "approvedDate",
    })
  )
  .superRefine(
    refineRejectedRequiresReason({
      statusField: "leaveStatus",
      rejectedValue: "rejected",
      reasonField: "rejectionReason",
    })
  )
  .superRefine(
    refineReasonAbsentUnlessRejected({
      statusField: "leaveStatus",
      rejectedValue: "rejected",
      reasonField: "rejectionReason",
    })
  );

export const insertTimeSheetSchema = z
  .object({
    id: TimeSheetIdSchema.optional(),
    tenantId: hrTenantIdSchema,
    timesheetNumber: z.string().min(3).max(50),
    employeeId: EmployeeIdSchema,
    periodStartDate: z.iso.date(),
    periodEndDate: z.iso.date(),
    totalHours: z
      .string()
      .regex(/^\d+(\.\d{1,2})?$/)
      .default("0"),
    totalOvertime: z
      .string()
      .regex(/^\d+(\.\d{1,2})?$/)
      .default("0"),
    leaveStatus: LeaveStatusSchema.default("draft"),
    submittedDate: z.iso.date().optional(),
    submittedBy: EmployeeIdSchema.optional(),
    approvedBy: EmployeeIdSchema.optional(),
    approvedDate: z.iso.date().optional(),
    notes: z.string().max(2000).optional(),
  })
  .superRefine((data, ctx) => {
    if (data.periodStartDate > data.periodEndDate) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "periodEndDate must be on or after periodStartDate",
        path: ["periodEndDate"],
      });
    }
  })
  .superRefine(
    refineApprovedRequiresActor({
      statusField: "leaveStatus",
      approvedValue: "approved",
      actorField: "approvedBy",
      atField: "approvedDate",
    })
  )
  .superRefine(
    refineApprovalFieldsAbsentUnlessApproved({
      statusField: "leaveStatus",
      approvedValue: "approved",
      actorField: "approvedBy",
      atField: "approvedDate",
    })
  );

/** Round-trip safe compare for numeric(8,2)-style strings. */
function roundCurrency2(value: string): number {
  return Math.round(parseFloat(value) * 100) / 100;
}

/**
 * Derive `time_sheets.total_hours` / `total_overtime` from line rows (application layer).
 * Use when persisting or validating payloads instead of DB triggers.
 */
export function timeSheetLineTotalsAggregate(
  lines: ReadonlyArray<{ hoursWorked: string; overtimeHours?: string }>
): { totalHours: string; totalOvertime: string } {
  let th = 0;
  let ot = 0;
  for (const line of lines) {
    th += parseFloat(line.hoursWorked);
    ot += parseFloat(line.overtimeHours ?? "0");
  }
  return { totalHours: th.toFixed(2), totalOvertime: ot.toFixed(2) };
}

/** True when header totals match the aggregate of the given lines (2 dp). */
export function timeSheetHeaderMatchesLineTotals(
  totalHours: string,
  totalOvertime: string,
  lines: ReadonlyArray<{ hoursWorked: string; overtimeHours?: string }>
): boolean {
  const agg = timeSheetLineTotalsAggregate(lines);
  return (
    roundCurrency2(totalHours) === roundCurrency2(agg.totalHours) &&
    roundCurrency2(totalOvertime) === roundCurrency2(agg.totalOvertime)
  );
}
