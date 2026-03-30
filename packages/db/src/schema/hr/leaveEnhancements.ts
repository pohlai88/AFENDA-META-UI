// ============================================================================
// HR DOMAIN: LEAVE ENHANCEMENTS (Upgrade Module)
// Adds compensatory leave requests, encashment, and department/position restrictions.
// Tables: compensatory_leave_requests, leave_restrictions, leave_encashments
// ============================================================================
import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  foreignKey,
  index,
  integer,
  text,
  date,
  uuid,
  uniqueIndex,
  numeric,
  timestamp,
  jsonb,
} from "drizzle-orm/pg-core";

import { tenantIsolationPolicies, serviceBypassPolicy } from "../../infra-utils/rls/index.js";
import {
  auditColumns,
  nameColumn,
  softDeleteColumns,
  timestampColumns,
} from "../../infra-utils/columns/index.js";
import { tenants } from "../core/tenants.js";
import { currencies } from "../reference/index.js";
import { hrSchema } from "./_schema.js";
import {
  compensatoryLeaveStatusEnum,
  leaveEncashmentStatusEnum,
  leaveRestrictionTypeEnum,
  leaveEncashmentReasonEnum,
  CompensatoryLeaveStatusSchema,
  LeaveEncashmentStatusSchema,
  LeaveRestrictionTypeSchema,
  LeaveEncashmentReasonSchema,
} from "./_enums.js";
import { employees, departments, jobPositions } from "./people.js";
import { leaveTypeConfigs } from "./attendance.js";
import { attendanceRecords } from "./attendance.js";
import { z } from "zod/v4";
import {
  CompensatoryLeaveRequestIdSchema,
  LeaveRestrictionIdSchema,
  LeaveEncashmentIdSchema,
  EmployeeIdSchema,
  LeaveTypeConfigIdSchema,
  AttendanceRecordIdSchema,
  DepartmentIdSchema,
  JobPositionIdSchema,
  currencyAmountSchema,
  hrTenantIdSchema,
} from "./_zodShared.js";

// ============================================================================
// COMPENSATORY LEAVE REQUESTS - Comp-off for overtime/holiday work
// ============================================================================

export const compensatoryLeaveRequests = hrSchema.table(
  "compensatory_leave_requests",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: integer("tenant_id").notNull(),
    requestNumber: text("request_number").notNull(),
    employeeId: uuid("employee_id").notNull(),
    leaveTypeId: uuid("leave_type_id").notNull(), // Must be compensatory type
    workDate: date("work_date", { mode: "string" }).notNull(), // Date worked (overtime/holiday)
    attendanceRecordId: uuid("attendance_record_id"), // Reference to attendance
    hoursWorked: numeric("hours_worked", { precision: 5, scale: 2 }).notNull(),
    daysRequested: numeric("days_requested", { precision: 5, scale: 2 }).notNull(),
    /** Remaining comp-off days for this grant after partial use (optional snapshot). */
    compOffBalance: numeric("comp_off_balance", { precision: 5, scale: 2 }),
    reason: text("reason").notNull(),
    status: compensatoryLeaveStatusEnum("status").notNull().default("pending"),
    approvedBy: uuid("approved_by"),
    approvedDate: timestamp("approved_date"),
    expiryDate: date("expiry_date", { mode: "string" }), // Comp-off validity
    usedDate: date("used_date", { mode: "string" }), // When comp-off was used
    statusChangedAt: timestamp("status_changed_at"),
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
      columns: [table.tenantId, table.leaveTypeId],
      foreignColumns: [leaveTypeConfigs.tenantId, leaveTypeConfigs.id],
    }),
    foreignKey({
      columns: [table.tenantId, table.attendanceRecordId],
      foreignColumns: [attendanceRecords.tenantId, attendanceRecords.id],
    }),
    foreignKey({
      columns: [table.tenantId, table.approvedBy],
      foreignColumns: [employees.tenantId, employees.id],
    }),
    uniqueIndex("compensatory_leave_requests_tenant_number_unique")
      .on(table.tenantId, table.requestNumber)
      .where(sql`${table.deletedAt} IS NULL`),
    index("compensatory_leave_requests_tenant_idx").on(table.tenantId),
    index("compensatory_leave_requests_employee_idx").on(table.tenantId, table.employeeId),
    index("compensatory_leave_requests_status_idx").on(table.tenantId, table.status),
    index("compensatory_leave_requests_work_date_idx").on(table.tenantId, table.workDate),
    check("compensatory_leave_requests_hours_positive", sql`${table.hoursWorked} > 0`),
    check("compensatory_leave_requests_days_positive", sql`${table.daysRequested} > 0`),
    check(
      "compensatory_leave_requests_expiry_after_work",
      sql`${table.expiryDate} IS NULL OR ${table.expiryDate} > ${table.workDate}`
    ),
    check("compensatory_leave_requests_reason_max_len", sql`char_length(${table.reason}) <= 1000`),
    check(
      "compensatory_leave_requests_comp_off_balance_non_negative",
      sql`${table.compOffBalance} IS NULL OR ${table.compOffBalance} >= 0`
    ),
    ...tenantIsolationPolicies("compensatory_leave_requests"),
    serviceBypassPolicy("compensatory_leave_requests"),
  ]
);

// ============================================================================
// LEAVE RESTRICTIONS - Blackout periods for leave
// ============================================================================

export const leaveRestrictions = hrSchema.table(
  "leave_restrictions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: integer("tenant_id").notNull(),
    restrictionCode: text("restriction_code").notNull(),
    ...nameColumn,
    description: text("description"),
    restrictionType: leaveRestrictionTypeEnum("restriction_type").notNull().default("blackout"),
    startDate: date("start_date", { mode: "string" }).notNull(),
    endDate: date("end_date", { mode: "string" }).notNull(),
    departmentId: uuid("department_id"), // Optional - restrict specific dept
    jobPositionId: uuid("job_position_id"), // Optional - restrict specific position
    includeAllLeaveTypes: boolean("include_all_leave_types").notNull().default(true),
    excludedLeaveTypes: jsonb("excluded_leave_types").$type<string[]>(), // Leave type config UUIDs
    reason: text("reason").notNull(),
    isActive: boolean("is_active").notNull().default(true),
    statusChangedAt: timestamp("status_changed_at"),
    ...timestampColumns,
    ...auditColumns,
    ...softDeleteColumns,
  },
  (table) => [
    foreignKey({ columns: [table.tenantId], foreignColumns: [tenants.tenantId] }),
    foreignKey({
      columns: [table.tenantId, table.departmentId],
      foreignColumns: [departments.tenantId, departments.id],
    }),
    foreignKey({
      columns: [table.tenantId, table.jobPositionId],
      foreignColumns: [jobPositions.tenantId, jobPositions.id],
    }),
    uniqueIndex("leave_restrictions_tenant_code_unique")
      .on(table.tenantId, table.restrictionCode)
      .where(sql`${table.deletedAt} IS NULL`),
    index("leave_restrictions_tenant_idx").on(table.tenantId),
    index("leave_restrictions_dates_idx").on(table.tenantId, table.startDate, table.endDate),
    index("leave_restrictions_department_idx").on(table.tenantId, table.departmentId),
    index("leave_restrictions_position_idx").on(table.tenantId, table.jobPositionId),
    index("leave_restrictions_restriction_type_idx").on(table.tenantId, table.restrictionType),
    index("leave_restrictions_excluded_leave_types_gin").using("gin", table.excludedLeaveTypes),
    check("leave_restrictions_date_range", sql`${table.endDate} >= ${table.startDate}`),
    check("leave_restrictions_reason_max_len", sql`char_length(${table.reason}) <= 1000`),
    check(
      "leave_restrictions_description_max_len",
      sql`${table.description} IS NULL OR char_length(${table.description}) <= 500`
    ),
    ...tenantIsolationPolicies("leave_restrictions"),
    serviceBypassPolicy("leave_restrictions"),
  ]
);

// ============================================================================
// LEAVE ENCASHMENTS - Cash out unused leave
// ============================================================================

export const leaveEncashments = hrSchema.table(
  "leave_encashments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: integer("tenant_id").notNull(),
    encashmentNumber: text("encashment_number").notNull(),
    employeeId: uuid("employee_id").notNull(),
    leaveTypeId: uuid("leave_type_id").notNull(),
    daysEncashed: numeric("days_encashed", { precision: 5, scale: 2 }).notNull(),
    amountPerDay: numeric("amount_per_day", { precision: 15, scale: 2 }).notNull(),
    totalAmount: numeric("total_amount", { precision: 15, scale: 2 }).notNull(),
    currencyId: integer("currency_id").notNull(),
    encashmentDate: date("encashment_date", { mode: "string" }).notNull(),
    encashmentReason: leaveEncashmentReasonEnum("encashment_reason").notNull().default("other"),
    status: leaveEncashmentStatusEnum("status").notNull().default("draft"),
    approvedBy: uuid("approved_by"),
    approvedDate: timestamp("approved_date"),
    paymentDate: date("payment_date", { mode: "string" }),
    paymentReference: text("payment_reference"),
    notes: text("notes"),
    statusChangedAt: timestamp("status_changed_at"),
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
      columns: [table.tenantId, table.leaveTypeId],
      foreignColumns: [leaveTypeConfigs.tenantId, leaveTypeConfigs.id],
    }),
    foreignKey({
      columns: [table.tenantId, table.approvedBy],
      foreignColumns: [employees.tenantId, employees.id],
    }),
    foreignKey({
      columns: [table.currencyId],
      foreignColumns: [currencies.currencyId],
    }),
    uniqueIndex("leave_encashments_tenant_number_unique")
      .on(table.tenantId, table.encashmentNumber)
      .where(sql`${table.deletedAt} IS NULL`),
    index("leave_encashments_tenant_idx").on(table.tenantId),
    index("leave_encashments_employee_idx").on(table.tenantId, table.employeeId),
    index("leave_encashments_status_idx").on(table.tenantId, table.status),
    index("leave_encashments_date_idx").on(table.tenantId, table.encashmentDate),
    index("leave_encashments_encashment_reason_idx").on(table.tenantId, table.encashmentReason),
    check("leave_encashments_days_positive", sql`${table.daysEncashed} > 0`),
    check("leave_encashments_amount_per_day_positive", sql`${table.amountPerDay} > 0`),
    check("leave_encashments_total_positive", sql`${table.totalAmount} > 0`),
    check(
      "leave_encashments_total_amount_formula",
      sql`${table.totalAmount} = round(${table.daysEncashed} * ${table.amountPerDay}, 2)`
    ),
    check(
      "leave_encashments_notes_max_len",
      sql`${table.notes} IS NULL OR char_length(${table.notes}) <= 2000`
    ),
    check(
      "leave_encashments_payment_reference_max_len",
      sql`${table.paymentReference} IS NULL OR char_length(${table.paymentReference}) <= 100`
    ),
    ...tenantIsolationPolicies("leave_encashments"),
    serviceBypassPolicy("leave_encashments"),
  ]
);

// ============================================================================
// ZOD INSERT SCHEMAS
// ============================================================================

function roundedCurrencyProduct(days: string, perDay: string): number {
  return Math.round(parseFloat(days) * parseFloat(perDay) * 100) / 100;
}

export const insertCompensatoryLeaveRequestSchema = z
  .object({
    id: CompensatoryLeaveRequestIdSchema.optional(),
    tenantId: hrTenantIdSchema,
    requestNumber: z.string().min(1).max(50),
    employeeId: EmployeeIdSchema,
    leaveTypeId: LeaveTypeConfigIdSchema,
    workDate: z.iso.date(),
    attendanceRecordId: AttendanceRecordIdSchema.optional(),
    hoursWorked: z
      .string()
      .regex(/^\d+(\.\d{1,2})?$/)
      .refine((val) => parseFloat(val) > 0, "Hours must be positive"),
    daysRequested: z
      .string()
      .regex(/^\d+(\.\d{1,2})?$/)
      .refine((val) => parseFloat(val) > 0, "Days must be positive"),
    compOffBalance: z
      .string()
      .regex(/^\d+(\.\d{1,2})?$/)
      .refine((val) => parseFloat(val) >= 0, "Balance must be non-negative")
      .optional(),
    reason: z.string().min(10).max(1000),
    status: CompensatoryLeaveStatusSchema.default("pending"),
    approvedBy: EmployeeIdSchema.optional(),
    approvedDate: z.date().optional(),
    expiryDate: z.iso.date().optional(),
    usedDate: z.iso.date().optional(),
    statusChangedAt: z.date().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.expiryDate && data.workDate && data.expiryDate <= data.workDate) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Expiry date must be after work date",
        path: ["expiryDate"],
      });
    }
  });

export const insertLeaveRestrictionSchema = z
  .object({
    id: LeaveRestrictionIdSchema.optional(),
    tenantId: hrTenantIdSchema,
    restrictionCode: z.string().min(2).max(50),
    name: z.string().min(2).max(100),
    description: z.string().max(500).optional(),
    restrictionType: LeaveRestrictionTypeSchema.default("blackout"),
    startDate: z.iso.date(),
    endDate: z.iso.date(),
    departmentId: DepartmentIdSchema.optional(),
    jobPositionId: JobPositionIdSchema.optional(),
    includeAllLeaveTypes: z.boolean().default(true),
    excludedLeaveTypes: z.array(LeaveTypeConfigIdSchema).optional(),
    reason: z.string().min(10).max(1000),
    isActive: z.boolean().default(true),
    statusChangedAt: z.date().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.startDate && data.endDate && data.startDate > data.endDate) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Start date cannot be after end date",
        path: ["startDate"],
      });
    }
  });

export const insertLeaveEncashmentSchema = z
  .object({
    id: LeaveEncashmentIdSchema.optional(),
    tenantId: hrTenantIdSchema,
    encashmentNumber: z.string().min(1).max(50),
    employeeId: EmployeeIdSchema,
    leaveTypeId: LeaveTypeConfigIdSchema,
    daysEncashed: z
      .string()
      .regex(/^\d+(\.\d{1,2})?$/)
      .refine((val) => parseFloat(val) > 0, "Days must be positive"),
    amountPerDay: currencyAmountSchema(2).refine(
      (val) => parseFloat(val) > 0,
      "Amount per day must be positive"
    ),
    totalAmount: currencyAmountSchema(2).refine(
      (val) => parseFloat(val) > 0,
      "Total amount must be positive"
    ),
    currencyId: z.number().int().positive(),
    encashmentDate: z.iso.date(),
    encashmentReason: LeaveEncashmentReasonSchema.default("other"),
    status: LeaveEncashmentStatusSchema.default("draft"),
    approvedBy: EmployeeIdSchema.optional(),
    approvedDate: z.date().optional(),
    paymentDate: z.iso.date().optional(),
    paymentReference: z.string().max(100).optional(),
    notes: z.string().max(2000).optional(),
    statusChangedAt: z.date().optional(),
  })
  .superRefine((data, ctx) => {
    const expected = roundedCurrencyProduct(data.daysEncashed, data.amountPerDay);
    const total = parseFloat(data.totalAmount);
    if (Math.abs(expected - total) > 0.005) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Total amount must equal days encashed × amount per day (rounded to 2 decimals)",
        path: ["totalAmount"],
      });
    }
  });
