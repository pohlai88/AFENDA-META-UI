// ============================================================================
// HR DOMAIN: ATTENDANCE ENHANCEMENTS (Upgrade Module)
// Adds requests, biometric telemetry, and shift swap workflow between assignments.
// Tables: attendance_requests, overtime_rules, biometric_devices, biometric_logs, shift_swap_requests
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

import { tenantIsolationPolicies, serviceBypassPolicy } from "../../rls-policies/index.js";
import {
  auditColumns,
  nameColumn,
  softDeleteColumns,
  timestampColumns,
} from "../../column-kit/index.js";
import { users } from "../security/index.js";
import { tenants } from "../core/tenants.js";
import { hrSchema } from "./_schema.js";
import {
  attendanceRequestTypeEnum,
  overtimeRuleTypeEnum,
  biometricDeviceTypeEnum,
  leaveStatusEnum,
  shiftSwapStatusEnum,
  overtimeRuleApplicableToEnum,
  biometricPunchTypeEnum,
  AttendanceRequestTypeSchema,
  LeaveStatusSchema,
  OvertimeRuleTypeSchema,
  BiometricDeviceTypeSchema,
  ShiftSwapStatusSchema,
  OvertimeRuleApplicableToSchema,
  BiometricPunchTypeSchema,
} from "./_enums.js";
import { employees } from "./people.js";
import { attendanceRecords, shiftAssignments } from "./attendance.js";
import { z } from "zod/v4";
import {
  AttendanceRequestIdSchema,
  OvertimeRuleIdSchema,
  BiometricDeviceIdSchema,
  BiometricLogIdSchema,
  HrWorkLocationUuidSchema,
  EmployeeIdSchema,
  AttendanceRecordIdSchema,
  ShiftAssignmentIdSchema,
  ShiftSwapRequestIdSchema,
  hrTenantIdSchema,
  biometricLogRawDataSchema,
  refineApprovedRequiresActor,
  refineApprovalFieldsAbsentUnlessApproved,
} from "./_zodShared.js";

// ============================================================================
// ATTENDANCE REQUESTS - Request corrections or special attendance
// ============================================================================

export const attendanceRequests = hrSchema.table(
  "attendance_requests",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: integer("tenant_id").notNull(),
    requestNumber: text("request_number").notNull(),
    employeeId: uuid("employee_id").notNull(),
    requestType: attendanceRequestTypeEnum("request_type").notNull(),
    attendanceDate: date("attendance_date", { mode: "string" }).notNull(),
    requestedCheckIn: timestamp("requested_check_in"),
    requestedCheckOut: timestamp("requested_check_out"),
    reason: text("reason").notNull(),
    status: leaveStatusEnum("status").notNull().default("draft"),
    approvedBy: uuid("approved_by"),
    approvedDate: timestamp("approved_date"),
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
    uniqueIndex("attendance_requests_tenant_number_unique")
      .on(table.tenantId, table.requestNumber)
      .where(sql`${table.deletedAt} IS NULL`),
    index("attendance_requests_tenant_idx").on(table.tenantId),
    index("attendance_requests_employee_idx").on(table.tenantId, table.employeeId),
    index("attendance_requests_status_idx").on(table.tenantId, table.status),
    index("attendance_requests_date_idx").on(table.tenantId, table.attendanceDate),
    check(
      "attendance_requests_approval_matches_status",
      sql`(
        (${table.status} = 'approved' AND ${table.approvedBy} IS NOT NULL AND ${table.approvedDate} IS NOT NULL)
        OR
        (${table.status} <> 'approved' AND ${table.approvedBy} IS NULL AND ${table.approvedDate} IS NULL)
      )`
    ),
    ...tenantIsolationPolicies("attendance_requests"),
    serviceBypassPolicy("attendance_requests"),
  ]
);

// ============================================================================
// OVERTIME RULES - Define overtime calculation rules
// ============================================================================

export const overtimeRules = hrSchema.table(
  "overtime_rules",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: integer("tenant_id").notNull(),
    ruleCode: text("rule_code").notNull(),
    ...nameColumn,
    description: text("description"),
    ruleType: overtimeRuleTypeEnum("rule_type").notNull(),
    applicableTo: overtimeRuleApplicableToEnum("applicable_to").notNull(),
    applicableIds: jsonb("applicable_ids").$type<string[]>(),
    thresholdHours: numeric("threshold_hours", { precision: 5, scale: 2 }).notNull(), // Daily hours before OT
    multiplier: numeric("multiplier", { precision: 5, scale: 2 }).notNull(), // 1.5x, 2x, etc.
    maxDailyOvertimeHours: numeric("max_daily_overtime_hours", { precision: 5, scale: 2 }),
    requiresPreApproval: boolean("requires_pre_approval").notNull().default(false),
    effectiveFrom: date("effective_from", { mode: "string" }).notNull(),
    effectiveTo: date("effective_to", { mode: "string" }),
    isActive: boolean("is_active").notNull().default(true),
    ...timestampColumns,
    ...auditColumns(() => users.userId),
    ...softDeleteColumns,
  },
  (table) => [
    foreignKey({ columns: [table.tenantId], foreignColumns: [tenants.tenantId] }),
    uniqueIndex("overtime_rules_tenant_code_unique")
      .on(table.tenantId, table.ruleCode)
      .where(sql`${table.deletedAt} IS NULL`),
    index("overtime_rules_tenant_idx").on(table.tenantId),
    index("overtime_rules_type_idx").on(table.tenantId, table.ruleType),
    index("overtime_rules_applicable_idx").on(table.tenantId, table.applicableTo),
    index("overtime_rules_applicable_ids_gin").using("gin", table.applicableIds),
    sql`CONSTRAINT overtime_rules_threshold_positive CHECK (threshold_hours > 0)`,
    sql`CONSTRAINT overtime_rules_multiplier_positive CHECK (multiplier > 0)`,
    check(
      "overtime_rules_effective_range",
      sql`${table.effectiveTo} IS NULL OR ${table.effectiveTo} >= ${table.effectiveFrom}`
    ),
    ...tenantIsolationPolicies("overtime_rules"),
    serviceBypassPolicy("overtime_rules"),
  ]
);

// ============================================================================
// BIOMETRIC DEVICES - Track biometric attendance devices
// ============================================================================

export const biometricDevices = hrSchema.table(
  "biometric_devices",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: integer("tenant_id").notNull(),
    deviceCode: text("device_code").notNull(),
    ...nameColumn,
    description: text("description"),
    deviceType: biometricDeviceTypeEnum("device_type").notNull(),
    locationId: uuid("location_id"), // Reference to work location
    ipAddress: text("ip_address"),
    serialNumber: text("serial_number"),
    isActive: boolean("is_active").notNull().default(true),
    lastSyncDate: timestamp("last_sync_date"),
    ...timestampColumns,
    ...auditColumns(() => users.userId),
    ...softDeleteColumns,
  },
  (table) => [
    foreignKey({ columns: [table.tenantId], foreignColumns: [tenants.tenantId] }),
    uniqueIndex("biometric_devices_tenant_code_unique")
      .on(table.tenantId, table.deviceCode)
      .where(sql`${table.deletedAt} IS NULL`),
    uniqueIndex("biometric_devices_tenant_serial_unique")
      .on(table.tenantId, table.serialNumber)
      .where(sql`${table.deletedAt} IS NULL AND ${table.serialNumber} IS NOT NULL`),
    index("biometric_devices_tenant_idx").on(table.tenantId),
    index("biometric_devices_type_idx").on(table.tenantId, table.deviceType),
    index("biometric_devices_location_idx").on(table.tenantId, table.locationId),
    ...tenantIsolationPolicies("biometric_devices"),
    serviceBypassPolicy("biometric_devices"),
  ]
);

// ============================================================================
// BIOMETRIC LOGS - Raw biometric punch data
// ============================================================================

export const biometricLogs = hrSchema.table(
  "biometric_logs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: integer("tenant_id").notNull(),
    deviceId: uuid("device_id").notNull(),
    employeeId: uuid("employee_id").notNull(),
    punchTime: timestamp("punch_time").notNull(),
    punchType: biometricPunchTypeEnum("punch_type").notNull(),
    rawData: jsonb("raw_data").$type<
      | { deviceEvent?: string; payload?: unknown; [key: string]: unknown }
      | unknown[]
      | null
    >(),
    processedToAttendance: boolean("processed_to_attendance").notNull().default(false),
    attendanceRecordId: uuid("attendance_record_id"),
    ...timestampColumns,
    ...auditColumns(() => users.userId),
    ...softDeleteColumns,
  },
  (table) => [
    foreignKey({ columns: [table.tenantId], foreignColumns: [tenants.tenantId] }),
    foreignKey({
      columns: [table.tenantId, table.deviceId],
      foreignColumns: [biometricDevices.tenantId, biometricDevices.id],
    }),
    foreignKey({
      columns: [table.tenantId, table.employeeId],
      foreignColumns: [employees.tenantId, employees.id],
    }),
    foreignKey({
      columns: [table.tenantId, table.attendanceRecordId],
      foreignColumns: [attendanceRecords.tenantId, attendanceRecords.id],
    }),
    index("biometric_logs_tenant_idx").on(table.tenantId),
    index("biometric_logs_device_idx").on(table.tenantId, table.deviceId),
    index("biometric_logs_employee_idx").on(table.tenantId, table.employeeId),
    index("biometric_logs_punch_time_idx").on(table.tenantId, table.punchTime),
    index("biometric_logs_processed_idx").on(table.tenantId, table.processedToAttendance),
    index("biometric_logs_raw_data_gin")
      .using("gin", table.rawData)
      .where(sql`${table.rawData} IS NOT NULL`),
    ...tenantIsolationPolicies("biometric_logs"),
    serviceBypassPolicy("biometric_logs"),
  ]
);

// ============================================================================
// SHIFT SWAP REQUESTS — peer + manager approval workflow
// ============================================================================

export const shiftSwapRequests = hrSchema.table(
  "shift_swap_requests",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: integer("tenant_id").notNull(),
    requestNumber: text("request_number").notNull(),
    requesterEmployeeId: uuid("requester_employee_id").notNull(),
    counterpartEmployeeId: uuid("counterpart_employee_id").notNull(),
    requesterShiftAssignmentId: uuid("requester_shift_assignment_id").notNull(),
    counterpartShiftAssignmentId: uuid("counterpart_shift_assignment_id").notNull(),
    status: shiftSwapStatusEnum("status").notNull().default("draft"),
    reason: text("reason").notNull(),
    managerApprovedBy: uuid("manager_approved_by"),
    managerApprovedAt: timestamp("manager_approved_at", { withTimezone: true }),
    executedAt: timestamp("executed_at", { withTimezone: true }),
    notes: text("notes"),
    ...timestampColumns,
    ...auditColumns(() => users.userId),
    ...softDeleteColumns,
  },
  (table) => [
    foreignKey({ columns: [table.tenantId], foreignColumns: [tenants.tenantId] }),
    foreignKey({
      columns: [table.tenantId, table.requesterEmployeeId],
      foreignColumns: [employees.tenantId, employees.id],
    }),
    foreignKey({
      columns: [table.tenantId, table.counterpartEmployeeId],
      foreignColumns: [employees.tenantId, employees.id],
    }),
    foreignKey({
      columns: [table.tenantId, table.requesterShiftAssignmentId],
      foreignColumns: [shiftAssignments.tenantId, shiftAssignments.id],
    }),
    foreignKey({
      columns: [table.tenantId, table.counterpartShiftAssignmentId],
      foreignColumns: [shiftAssignments.tenantId, shiftAssignments.id],
    }),
    foreignKey({
      columns: [table.tenantId, table.managerApprovedBy],
      foreignColumns: [employees.tenantId, employees.id],
    }),
    check(
      "shift_swap_requests_distinct_employees",
      sql`${table.requesterEmployeeId} <> ${table.counterpartEmployeeId}`
    ),
    check(
      "shift_swap_requests_distinct_assignments",
      sql`${table.requesterShiftAssignmentId} <> ${table.counterpartShiftAssignmentId}`
    ),
    check(
      "shift_swap_requests_manager_approval_consistency",
      sql`(${table.managerApprovedBy} IS NULL AND ${table.managerApprovedAt} IS NULL) OR (${table.managerApprovedBy} IS NOT NULL AND ${table.managerApprovedAt} IS NOT NULL)`
    ),
    check(
      "shift_swap_completed_implies_executed",
      sql`${table.status} <> 'completed' OR ${table.executedAt} IS NOT NULL`
    ),
    check(
      "shift_swap_requests_approved_requires_manager",
      sql`${table.status} <> 'approved' OR (${table.managerApprovedBy} IS NOT NULL AND ${table.managerApprovedAt} IS NOT NULL)`
    ),
    uniqueIndex("shift_swap_requests_tenant_number_unique")
      .on(table.tenantId, table.requestNumber)
      .where(sql`${table.deletedAt} IS NULL`),
    index("shift_swap_requests_tenant_idx").on(table.tenantId),
    index("shift_swap_requests_status_idx").on(table.tenantId, table.status),
    index("shift_swap_requests_requester_idx").on(table.tenantId, table.requesterEmployeeId),
    ...tenantIsolationPolicies("shift_swap_requests"),
    serviceBypassPolicy("shift_swap_requests"),
  ]
);

// ============================================================================
// ZOD INSERT SCHEMAS
// ============================================================================

export const insertAttendanceRequestSchema = z
  .object({
    id: AttendanceRequestIdSchema.optional(),
    tenantId: hrTenantIdSchema,
    requestNumber: z.string().min(1).max(50),
    employeeId: EmployeeIdSchema,
    requestType: AttendanceRequestTypeSchema,
    attendanceDate: z.iso.date(),
    requestedCheckIn: z.date().optional(),
    requestedCheckOut: z.date().optional(),
    reason: z.string().min(10).max(1000),
    status: LeaveStatusSchema.default("draft"),
    approvedBy: EmployeeIdSchema.optional(),
    approvedDate: z.date().optional(),
    notes: z.string().max(2000).optional(),
  })
  .superRefine((data, ctx) => {
    if (
      data.requestedCheckIn &&
      data.requestedCheckOut &&
      data.requestedCheckIn >= data.requestedCheckOut
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Check-in time must be before check-out time",
        path: ["requestedCheckIn"],
      });
    }
    if (Boolean(data.approvedBy) !== Boolean(data.approvedDate)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "approvedBy and approvedDate must both be set or both omitted",
        path: ["approvedDate"],
      });
    }
  })
  .superRefine(
    refineApprovedRequiresActor({
      statusField: "status",
      approvedValue: "approved",
      actorField: "approvedBy",
      atField: "approvedDate",
    })
  )
  .superRefine(
    refineApprovalFieldsAbsentUnlessApproved({
      statusField: "status",
      approvedValue: "approved",
      actorField: "approvedBy",
      atField: "approvedDate",
    })
  );

export const insertOvertimeRuleSchema = z
  .object({
    id: OvertimeRuleIdSchema.optional(),
    tenantId: hrTenantIdSchema,
    ruleCode: z.string().min(2).max(50),
    name: z.string().min(2).max(100),
    description: z.string().max(500).optional(),
    ruleType: OvertimeRuleTypeSchema,
    applicableTo: OvertimeRuleApplicableToSchema,
    applicableIds: z.array(z.string().uuid()).optional(),
    thresholdHours: z
      .string()
      .regex(/^\d+(\.\d{1,2})?$/)
      .refine((val) => parseFloat(val) > 0, "Threshold must be positive"),
    multiplier: z
      .string()
      .regex(/^\d+(\.\d{1,2})?$/)
      .refine((val) => parseFloat(val) > 0, "Multiplier must be positive"),
    maxDailyOvertimeHours: z
      .string()
      .regex(/^\d+(\.\d{1,2})?$/)
      .optional(),
    requiresPreApproval: z.boolean().default(false),
    effectiveFrom: z.iso.date(),
    effectiveTo: z.iso.date().optional(),
    isActive: z.boolean().default(true),
  })
  .superRefine((data, ctx) => {
    if (data.effectiveFrom && data.effectiveTo && data.effectiveFrom > data.effectiveTo) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Effective from date cannot be after effective to date",
        path: ["effectiveFrom"],
      });
    }
  });

export const insertBiometricDeviceSchema = z.object({
  id: BiometricDeviceIdSchema.optional(),
  tenantId: hrTenantIdSchema,
  deviceCode: z.string().min(2).max(50),
  name: z.string().min(2).max(100),
  description: z.string().max(500).optional(),
  deviceType: BiometricDeviceTypeSchema,
  locationId: HrWorkLocationUuidSchema.optional(),
  ipAddress: z
    .string()
    .regex(/^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/, "Must be a valid IP address")
    .optional(),
  serialNumber: z.string().max(100).optional(),
  isActive: z.boolean().default(true),
  lastSyncDate: z.date().optional(),
});

export const insertBiometricLogSchema = z.object({
  id: BiometricLogIdSchema.optional(),
  tenantId: hrTenantIdSchema,
  deviceId: BiometricDeviceIdSchema,
  employeeId: EmployeeIdSchema,
  punchTime: z.date(),
  punchType: BiometricPunchTypeSchema,
  rawData: biometricLogRawDataSchema,
  processedToAttendance: z.boolean().default(false),
  attendanceRecordId: AttendanceRecordIdSchema.optional(),
});

export const insertShiftSwapRequestSchema = z
  .object({
    id: ShiftSwapRequestIdSchema.optional(),
    tenantId: hrTenantIdSchema,
    requestNumber: z.string().min(1).max(80),
    requesterEmployeeId: EmployeeIdSchema,
    counterpartEmployeeId: EmployeeIdSchema,
    requesterShiftAssignmentId: ShiftAssignmentIdSchema,
    counterpartShiftAssignmentId: ShiftAssignmentIdSchema,
    status: ShiftSwapStatusSchema.default("draft"),
    reason: z.string().min(10).max(2000),
    managerApprovedBy: EmployeeIdSchema.optional(),
    managerApprovedAt: z.coerce.date().optional(),
    executedAt: z.coerce.date().optional(),
    notes: z.string().max(2000).optional(),
  })
  .superRefine((data, ctx) => {
    if (data.requesterEmployeeId === data.counterpartEmployeeId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Requester and counterpart must be different employees",
        path: ["counterpartEmployeeId"],
      });
    }
    if (data.requesterShiftAssignmentId === data.counterpartShiftAssignmentId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Shift assignments must be different rows",
        path: ["counterpartShiftAssignmentId"],
      });
    }
    if (Boolean(data.managerApprovedBy) !== Boolean(data.managerApprovedAt)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "managerApprovedBy and managerApprovedAt must both be set or both omitted",
        path: ["managerApprovedAt"],
      });
    }
    if (data.status === "completed" && !data.executedAt) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "executedAt is required when status is completed",
        path: ["executedAt"],
      });
    }
  })
  .superRefine(
    refineApprovedRequiresActor({
      statusField: "status",
      approvedValue: "approved",
      actorField: "managerApprovedBy",
      atField: "managerApprovedAt",
      messages: {
        actor: "managerApprovedBy is required when status is approved",
        at: "managerApprovedAt is required when status is approved",
      },
    })
  );
