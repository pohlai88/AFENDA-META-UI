// ============================================================================
// HR DOMAIN: LEAVE ENHANCEMENTS (Upgrade Module)
// Adds compensatory leave requests, encashment, and department/position restrictions.
// Tables: compensatory_leave_requests, leave_restrictions, leave_encashments
// ============================================================================
import { sql } from "drizzle-orm";
import {
  boolean,
  foreignKey,
  index,
  integer,
  text,
  date,
  uuid,
  uniqueIndex,
  numeric,
  timestamp,
} from "drizzle-orm/pg-core";

import { tenantIsolationPolicies, serviceBypassPolicy } from "../../rls/index.js";
import {
  auditColumns,
  nameColumn,
  softDeleteColumns,
  timestampColumns,
} from "../../columns/index.js";
import { tenants } from "../core/tenants.js";
import { currencies } from "../reference/index.js";
import { hrSchema } from "./_schema.js";
import { compensatoryLeaveStatusEnum, leaveEncashmentStatusEnum } from "./_enums.js";
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
    reason: text("reason").notNull(),
    status: compensatoryLeaveStatusEnum("status").notNull().default("pending"),
    approvedBy: uuid("approved_by"),
    approvedDate: timestamp("approved_date"),
    expiryDate: date("expiry_date", { mode: "string" }), // Comp-off validity
    usedDate: date("used_date", { mode: "string" }), // When comp-off was used
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
    sql`CONSTRAINT compensatory_leave_requests_hours_positive CHECK (hours_worked > 0)`,
    sql`CONSTRAINT compensatory_leave_requests_days_positive CHECK (days_requested > 0)`,
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
    startDate: date("start_date", { mode: "string" }).notNull(),
    endDate: date("end_date", { mode: "string" }).notNull(),
    departmentId: uuid("department_id"), // Optional - restrict specific dept
    jobPositionId: uuid("job_position_id"), // Optional - restrict specific position
    includeAllLeaveTypes: boolean("include_all_leave_types").notNull().default(true),
    excludedLeaveTypes: text("excluded_leave_types"), // JSON array of leave type IDs
    reason: text("reason").notNull(),
    isActive: boolean("is_active").notNull().default(true),
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
    sql`CONSTRAINT leave_restrictions_date_range CHECK (end_date >= start_date)`,
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
    status: leaveEncashmentStatusEnum("status").notNull().default("draft"),
    approvedBy: uuid("approved_by"),
    approvedDate: timestamp("approved_date"),
    paymentDate: date("payment_date", { mode: "string" }),
    paymentReference: text("payment_reference"),
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
    sql`CONSTRAINT leave_encashments_days_positive CHECK (days_encashed > 0)`,
    sql`CONSTRAINT leave_encashments_amount_per_day_positive CHECK (amount_per_day > 0)`,
    sql`CONSTRAINT leave_encashments_total_positive CHECK (total_amount > 0)`,
    ...tenantIsolationPolicies("leave_encashments"),
    serviceBypassPolicy("leave_encashments"),
  ]
);

// ============================================================================
// ZOD INSERT SCHEMAS
// ============================================================================

export const insertCompensatoryLeaveRequestSchema = z
  .object({
    id: CompensatoryLeaveRequestIdSchema.optional(),
    tenantId: hrTenantIdSchema,
    requestNumber: z.string().min(1).max(50),
    employeeId: EmployeeIdSchema,
    leaveTypeId: LeaveTypeConfigIdSchema,
    workDate: z.string().date(),
    attendanceRecordId: AttendanceRecordIdSchema.optional(),
    hoursWorked: z
      .string()
      .regex(/^\d+(\.\d{1,2})?$/)
      .refine((val) => parseFloat(val) > 0, "Hours must be positive"),
    daysRequested: z
      .string()
      .regex(/^\d+(\.\d{1,2})?$/)
      .refine((val) => parseFloat(val) > 0, "Days must be positive"),
    reason: z.string().min(10).max(1000),
    status: z.enum(["pending", "approved", "rejected", "expired", "used"]).default("pending"),
    approvedBy: EmployeeIdSchema.optional(),
    approvedDate: z.date().optional(),
    expiryDate: z.string().date().optional(),
    usedDate: z.string().date().optional(),
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
    startDate: z.string().date(),
    endDate: z.string().date(),
    departmentId: DepartmentIdSchema.optional(),
    jobPositionId: JobPositionIdSchema.optional(),
    includeAllLeaveTypes: z.boolean().default(true),
    excludedLeaveTypes: z.string().optional(),
    reason: z.string().min(10).max(1000),
    isActive: z.boolean().default(true),
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

export const insertLeaveEncashmentSchema = z.object({
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
  encashmentDate: z.string().date(),
  status: z
    .enum(["draft", "submitted", "approved", "rejected", "paid", "cancelled"])
    .default("draft"),
  approvedBy: EmployeeIdSchema.optional(),
  approvedDate: z.date().optional(),
  paymentDate: z.string().date().optional(),
  paymentReference: z.string().max(100).optional(),
  notes: z.string().max(2000).optional(),
});
