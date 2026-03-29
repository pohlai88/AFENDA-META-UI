// ============================================================================
// HR DOMAIN: EMPLOYEE LIFECYCLE (Upgrade Module)
// Tracks promotions, transfers, exit interviews, and full & final settlements.
// Tables: employee_promotions, employee_transfers, exit_interviews, full_final_settlements
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
import {
  promotionTypeEnum,
  transferTypeEnum,
  separationTypeEnum,
  leaveStatusEnum,
} from "./_enums.js";
import { employees, departments, jobPositions } from "./people.js";
import { z } from "zod/v4";
import {
  EmployeePromotionIdSchema,
  EmployeeTransferIdSchema,
  ExitInterviewRecordIdSchema,
  FullFinalSettlementIdSchema,
  EmployeeIdSchema,
  DepartmentIdSchema,
  JobPositionIdSchema,
  currencyAmountSchema,
  hrTenantIdSchema,
  HrWorkLocationUuidSchema,
} from "./_zodShared.js";

// ============================================================================
// EMPLOYEE PROMOTIONS - Track promotions
// ============================================================================

export const employeePromotions = hrSchema.table(
  "employee_promotions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: integer("tenant_id").notNull(),
    promotionNumber: text("promotion_number").notNull(),
    employeeId: uuid("employee_id").notNull(),
    effectiveDate: date("effective_date", { mode: "string" }).notNull(),
    promotionType: promotionTypeEnum("promotion_type").notNull(),
    fromJobPositionId: uuid("from_job_position_id").notNull(),
    toJobPositionId: uuid("to_job_position_id").notNull(),
    fromDepartmentId: uuid("from_department_id"),
    toDepartmentId: uuid("to_department_id"),
    fromSalary: numeric("from_salary", { precision: 15, scale: 2 }),
    toSalary: numeric("to_salary", { precision: 15, scale: 2 }),
    currencyId: integer("currency_id"),
    reason: text("reason"),
    status: leaveStatusEnum("status").notNull().default("draft"),
    approvedBy: uuid("approved_by"),
    approvedDate: timestamp("approved_date"),
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
      columns: [table.tenantId, table.fromJobPositionId],
      foreignColumns: [jobPositions.tenantId, jobPositions.id],
    }),
    foreignKey({
      columns: [table.tenantId, table.toJobPositionId],
      foreignColumns: [jobPositions.tenantId, jobPositions.id],
    }),
    foreignKey({
      columns: [table.tenantId, table.fromDepartmentId],
      foreignColumns: [departments.tenantId, departments.id],
    }),
    foreignKey({
      columns: [table.tenantId, table.toDepartmentId],
      foreignColumns: [departments.tenantId, departments.id],
    }),
    foreignKey({
      columns: [table.tenantId, table.approvedBy],
      foreignColumns: [employees.tenantId, employees.id],
    }),
    foreignKey({
      columns: [table.currencyId],
      foreignColumns: [currencies.currencyId],
    }),
    uniqueIndex("employee_promotions_tenant_number_unique")
      .on(table.tenantId, table.promotionNumber)
      .where(sql`${table.deletedAt} IS NULL`),
    index("employee_promotions_tenant_idx").on(table.tenantId),
    index("employee_promotions_employee_idx").on(table.tenantId, table.employeeId),
    index("employee_promotions_effective_date_idx").on(table.tenantId, table.effectiveDate),
    index("employee_promotions_status_idx").on(table.tenantId, table.status),
    ...tenantIsolationPolicies("employee_promotions"),
    serviceBypassPolicy("employee_promotions"),
  ]
);

// ============================================================================
// EMPLOYEE TRANSFERS - Track transfers
// ============================================================================

export const employeeTransfers = hrSchema.table(
  "employee_transfers",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: integer("tenant_id").notNull(),
    transferNumber: text("transfer_number").notNull(),
    employeeId: uuid("employee_id").notNull(),
    effectiveDate: date("effective_date", { mode: "string" }).notNull(),
    transferType: transferTypeEnum("transfer_type").notNull(),
    fromDepartmentId: uuid("from_department_id").notNull(),
    toDepartmentId: uuid("to_department_id").notNull(),
    fromLocationId: uuid("from_location_id"),
    toLocationId: uuid("to_location_id"),
    reason: text("reason").notNull(),
    status: leaveStatusEnum("status").notNull().default("draft"),
    approvedBy: uuid("approved_by"),
    approvedDate: timestamp("approved_date"),
    returnDate: date("return_date", { mode: "string" }), // For temporary transfers
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
      columns: [table.tenantId, table.fromDepartmentId],
      foreignColumns: [departments.tenantId, departments.id],
    }),
    foreignKey({
      columns: [table.tenantId, table.toDepartmentId],
      foreignColumns: [departments.tenantId, departments.id],
    }),
    foreignKey({
      columns: [table.tenantId, table.approvedBy],
      foreignColumns: [employees.tenantId, employees.id],
    }),
    uniqueIndex("employee_transfers_tenant_number_unique")
      .on(table.tenantId, table.transferNumber)
      .where(sql`${table.deletedAt} IS NULL`),
    index("employee_transfers_tenant_idx").on(table.tenantId),
    index("employee_transfers_employee_idx").on(table.tenantId, table.employeeId),
    index("employee_transfers_effective_date_idx").on(table.tenantId, table.effectiveDate),
    index("employee_transfers_status_idx").on(table.tenantId, table.status),
    ...tenantIsolationPolicies("employee_transfers"),
    serviceBypassPolicy("employee_transfers"),
  ]
);

// ============================================================================
// EXIT INTERVIEWS - Offboarding interviews
// ============================================================================

export const hrExitInterviews = hrSchema.table(
  "exit_interviews",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: integer("tenant_id").notNull(),
    employeeId: uuid("employee_id").notNull(),
    interviewDate: date("interview_date", { mode: "string" }).notNull(),
    interviewerId: uuid("interviewer_id").notNull(),
    separationType: separationTypeEnum("separation_type").notNull(),
    reasonForLeaving: text("reason_for_leaving").notNull(),
    wouldRejoin: boolean("would_rejoin"),
    feedback: text("feedback"), // JSON structured feedback
    suggestions: text("suggestions"),
    confidentialNotes: text("confidential_notes"),
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
      columns: [table.tenantId, table.interviewerId],
      foreignColumns: [employees.tenantId, employees.id],
    }),
    uniqueIndex("exit_interviews_tenant_employee_unique")
      .on(table.tenantId, table.employeeId)
      .where(sql`${table.deletedAt} IS NULL`),
    index("exit_interviews_tenant_idx").on(table.tenantId),
    index("exit_interviews_employee_idx").on(table.tenantId, table.employeeId),
    index("exit_interviews_date_idx").on(table.tenantId, table.interviewDate),
    index("exit_interviews_separation_type_idx").on(table.tenantId, table.separationType),
    ...tenantIsolationPolicies("exit_interviews"),
    serviceBypassPolicy("exit_interviews"),
  ]
);

// ============================================================================
// FULL & FINAL SETTLEMENTS - Settlement calculations
// ============================================================================

export const fullFinalSettlements = hrSchema.table(
  "full_final_settlements",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: integer("tenant_id").notNull(),
    settlementNumber: text("settlement_number").notNull(),
    employeeId: uuid("employee_id").notNull(),
    separationDate: date("separation_date", { mode: "string" }).notNull(),
    lastWorkingDate: date("last_working_date", { mode: "string" }).notNull(),
    pendingSalary: numeric("pending_salary", { precision: 15, scale: 2 }).notNull().default("0"),
    leaveEncashment: numeric("leave_encashment", { precision: 15, scale: 2 })
      .notNull()
      .default("0"),
    bonusPayable: numeric("bonus_payable", { precision: 15, scale: 2 }).notNull().default("0"),
    deductions: numeric("deductions", { precision: 15, scale: 2 }).notNull().default("0"),
    netPayable: numeric("net_payable", { precision: 15, scale: 2 }).notNull().default("0"),
    currencyId: integer("currency_id").notNull(),
    status: leaveStatusEnum("status").notNull().default("draft"),
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
      columns: [table.tenantId, table.approvedBy],
      foreignColumns: [employees.tenantId, employees.id],
    }),
    foreignKey({
      columns: [table.currencyId],
      foreignColumns: [currencies.currencyId],
    }),
    uniqueIndex("full_final_settlements_tenant_number_unique")
      .on(table.tenantId, table.settlementNumber)
      .where(sql`${table.deletedAt} IS NULL`),
    uniqueIndex("full_final_settlements_tenant_employee_unique")
      .on(table.tenantId, table.employeeId)
      .where(sql`${table.deletedAt} IS NULL`),
    index("full_final_settlements_tenant_idx").on(table.tenantId),
    index("full_final_settlements_employee_idx").on(table.tenantId, table.employeeId),
    index("full_final_settlements_status_idx").on(table.tenantId, table.status),
    index("full_final_settlements_separation_date_idx").on(table.tenantId, table.separationDate),
    sql`CONSTRAINT full_final_settlements_pending_salary_non_negative CHECK (pending_salary >= 0)`,
    sql`CONSTRAINT full_final_settlements_leave_encashment_non_negative CHECK (leave_encashment >= 0)`,
    sql`CONSTRAINT full_final_settlements_bonus_non_negative CHECK (bonus_payable >= 0)`,
    sql`CONSTRAINT full_final_settlements_deductions_non_negative CHECK (deductions >= 0)`,
    ...tenantIsolationPolicies("full_final_settlements"),
    serviceBypassPolicy("full_final_settlements"),
  ]
);

// ============================================================================
// ZOD INSERT SCHEMAS
// ============================================================================

export const insertEmployeePromotionSchema = z
  .object({
    id: EmployeePromotionIdSchema.optional(),
    tenantId: hrTenantIdSchema,
    promotionNumber: z.string().min(1).max(50),
    employeeId: EmployeeIdSchema,
    effectiveDate: z.string().date(),
    promotionType: z.enum(["vertical", "horizontal", "grade_change", "title_change"]),
    fromJobPositionId: JobPositionIdSchema,
    toJobPositionId: JobPositionIdSchema,
    fromDepartmentId: DepartmentIdSchema.optional(),
    toDepartmentId: DepartmentIdSchema.optional(),
    fromSalary: currencyAmountSchema(2).optional(),
    toSalary: currencyAmountSchema(2).optional(),
    currencyId: z.number().int().positive().optional(),
    reason: z.string().max(1000).optional(),
    status: z.enum(["draft", "submitted", "approved", "rejected", "cancelled"]).default("draft"),
    approvedBy: EmployeeIdSchema.optional(),
    approvedDate: z.date().optional(),
    notes: z.string().max(2000).optional(),
  })
  .superRefine((data, ctx) => {
    if (
      data.fromSalary &&
      data.toSalary &&
      parseFloat(data.fromSalary) > parseFloat(data.toSalary)
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Promotion should result in salary increase or equal",
        path: ["toSalary"],
      });
    }
  });

export const insertEmployeeTransferSchema = z
  .object({
    id: EmployeeTransferIdSchema.optional(),
    tenantId: hrTenantIdSchema,
    transferNumber: z.string().min(1).max(50),
    employeeId: EmployeeIdSchema,
    effectiveDate: z.string().date(),
    transferType: z.enum(["permanent", "temporary", "deputation", "secondment"]),
    fromDepartmentId: DepartmentIdSchema,
    toDepartmentId: DepartmentIdSchema,
    fromLocationId: HrWorkLocationUuidSchema.optional(),
    toLocationId: HrWorkLocationUuidSchema.optional(),
    reason: z.string().min(10).max(1000),
    status: z.enum(["draft", "submitted", "approved", "rejected", "cancelled"]).default("draft"),
    approvedBy: EmployeeIdSchema.optional(),
    approvedDate: z.date().optional(),
    returnDate: z.string().date().optional(),
    notes: z.string().max(2000).optional(),
  })
  .superRefine((data, ctx) => {
    if (data.transferType === "temporary" && !data.returnDate) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Temporary transfers must have a return date",
        path: ["returnDate"],
      });
    }
    if (data.effectiveDate && data.returnDate && data.effectiveDate >= data.returnDate) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Return date must be after effective date",
        path: ["returnDate"],
      });
    }
  });

export const insertExitInterviewSchema = z.object({
  id: ExitInterviewRecordIdSchema.optional(),
  tenantId: hrTenantIdSchema,
  employeeId: EmployeeIdSchema,
  interviewDate: z.string().date(),
  interviewerId: EmployeeIdSchema,
  separationType: z.enum([
    "resignation",
    "termination",
    "retirement",
    "layoff",
    "contract_end",
    "mutual_agreement",
    "death",
  ]),
  reasonForLeaving: z.string().min(10).max(2000),
  wouldRejoin: z.boolean().optional(),
  feedback: z.string().max(5000).optional(),
  suggestions: z.string().max(5000).optional(),
  confidentialNotes: z.string().max(5000).optional(),
});

export const insertFullFinalSettlementSchema = z
  .object({
    id: FullFinalSettlementIdSchema.optional(),
    tenantId: hrTenantIdSchema,
    settlementNumber: z.string().min(1).max(50),
    employeeId: EmployeeIdSchema,
    separationDate: z.string().date(),
    lastWorkingDate: z.string().date(),
    pendingSalary: currencyAmountSchema(2).default("0"),
    leaveEncashment: currencyAmountSchema(2).default("0"),
    bonusPayable: currencyAmountSchema(2).default("0"),
    deductions: currencyAmountSchema(2).default("0"),
    netPayable: currencyAmountSchema(2).default("0"),
    currencyId: z.number().int().positive(),
    status: z.enum(["draft", "submitted", "approved", "rejected", "cancelled"]).default("draft"),
    approvedBy: EmployeeIdSchema.optional(),
    approvedDate: z.date().optional(),
    paymentDate: z.string().date().optional(),
    paymentReference: z.string().max(100).optional(),
    notes: z.string().max(2000).optional(),
  })
  .superRefine((data, ctx) => {
    if (data.separationDate && data.lastWorkingDate && data.separationDate < data.lastWorkingDate) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Separation date cannot be before last working date",
        path: ["separationDate"],
      });
    }
  });
