// ============================================================================
// HR DOMAIN: EMPLOYEE LIFECYCLE (Upgrade Module)
// Tracks promotions, transfers, exit interviews, and full & final settlements.
// Tables: employee_promotions, employee_transfers, exit_interviews, full_final_settlements
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

import { tenantIsolationPolicies, serviceBypassPolicy } from "../../rls/index.js";
import {
  auditColumns,
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
  promotionWorkflowStatusEnum,
  transferWorkflowStatusEnum,
  fullFinalSettlementWorkflowStatusEnum,
  promotionReasonCategoryEnum,
  fullFinalSettlementTypeEnum,
  exitInterviewStatusEnum,
  PromotionTypeSchema,
  TransferTypeSchema,
  SeparationTypeSchema,
  PromotionWorkflowStatusSchema,
  TransferWorkflowStatusSchema,
  FullFinalSettlementWorkflowStatusSchema,
  PromotionReasonCategorySchema,
  FullFinalSettlementTypeSchema,
  ExitInterviewStatusSchema,
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
  jsonObjectNullishSchema,
  refineApprovedRequiresActor,
  refineApprovalFieldsAbsentUnlessApproved,
  refineApprovalStampLifecycle,
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
    promotionReasonCategory: promotionReasonCategoryEnum("promotion_reason_category"),
    fromJobPositionId: uuid("from_job_position_id").notNull(),
    toJobPositionId: uuid("to_job_position_id").notNull(),
    fromDepartmentId: uuid("from_department_id"),
    toDepartmentId: uuid("to_department_id"),
    fromSalary: numeric("from_salary", { precision: 15, scale: 2 }),
    toSalary: numeric("to_salary", { precision: 15, scale: 2 }),
    currencyId: integer("currency_id"),
    reason: text("reason"),
    status: promotionWorkflowStatusEnum("status").notNull().default("draft"),
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
    check(
      "employee_promotions_salary_progression",
      sql`${table.fromSalary} IS NULL OR ${table.toSalary} IS NULL OR ${table.fromSalary} <= ${table.toSalary}`
    ),
    check(
      "employee_promotions_notes_max_len",
      sql`${table.notes} IS NULL OR char_length(${table.notes}) <= 2000`
    ),
    check(
      "employee_promotions_reason_max_len",
      sql`${table.reason} IS NULL OR char_length(${table.reason}) <= 2000`
    ),
    check(
      "employee_promotions_approval_stamp_lifecycle",
      sql`(${table.status} = 'approved'::hr.promotion_workflow_status AND ${table.approvedBy} IS NOT NULL AND ${table.approvedDate} IS NOT NULL) OR (${table.status} <> 'approved'::hr.promotion_workflow_status AND ${table.approvedBy} IS NULL AND ${table.approvedDate} IS NULL)`
    ),
    index("employee_promotions_tenant_idx").on(table.tenantId),
    index("employee_promotions_employee_idx").on(table.tenantId, table.employeeId),
    index("employee_promotions_effective_date_idx").on(table.tenantId, table.effectiveDate),
    index("employee_promotions_status_idx").on(table.tenantId, table.status),
    index("employee_promotions_reason_category_idx").on(table.tenantId, table.promotionReasonCategory),
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
    status: transferWorkflowStatusEnum("status").notNull().default("draft"),
    approvedBy: uuid("approved_by"),
    approvedDate: timestamp("approved_date"),
    returnDate: date("return_date", { mode: "string" }),
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
    check(
      "employee_transfers_temporary_requires_return_date",
      sql`${table.transferType} <> 'temporary'::hr.transfer_type OR ${table.returnDate} IS NOT NULL`
    ),
    check(
      "employee_transfers_return_after_effective",
      sql`${table.returnDate} IS NULL OR ${table.returnDate} > ${table.effectiveDate}`
    ),
    check(
      "employee_transfers_notes_max_len",
      sql`${table.notes} IS NULL OR char_length(${table.notes}) <= 2000`
    ),
    check(
      "employee_transfers_reason_max_len",
      sql`char_length(${table.reason}) <= 2000`
    ),
    check(
      "employee_transfers_approval_stamp_lifecycle",
      sql`(${table.status} IN ('approved'::hr.transfer_workflow_status, 'completed'::hr.transfer_workflow_status) AND ${table.approvedBy} IS NOT NULL AND ${table.approvedDate} IS NOT NULL) OR (${table.status} NOT IN ('approved'::hr.transfer_workflow_status, 'completed'::hr.transfer_workflow_status) AND ${table.approvedBy} IS NULL AND ${table.approvedDate} IS NULL)`
    ),
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
    interviewStatus: exitInterviewStatusEnum("interview_status").notNull().default("scheduled"),
    interviewDate: date("interview_date", { mode: "string" }).notNull(),
    interviewerId: uuid("interviewer_id").notNull(),
    separationType: separationTypeEnum("separation_type").notNull(),
    reasonForLeaving: text("reason_for_leaving").notNull(),
    wouldRejoin: boolean("would_rejoin"),
    feedback: jsonb("feedback").$type<Record<string, unknown>>(),
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
    check(
      "exit_interviews_reason_max_len",
      sql`char_length(${table.reasonForLeaving}) <= 2000`
    ),
    check(
      "exit_interviews_suggestions_max_len",
      sql`${table.suggestions} IS NULL OR char_length(${table.suggestions}) <= 5000`
    ),
    check(
      "exit_interviews_confidential_max_len",
      sql`${table.confidentialNotes} IS NULL OR char_length(${table.confidentialNotes}) <= 5000`
    ),
    index("exit_interviews_tenant_idx").on(table.tenantId),
    index("exit_interviews_employee_idx").on(table.tenantId, table.employeeId),
    index("exit_interviews_date_idx").on(table.tenantId, table.interviewDate),
    index("exit_interviews_separation_type_idx").on(table.tenantId, table.separationType),
    index("exit_interviews_interview_status_idx").on(table.tenantId, table.interviewStatus),
    index("exit_interviews_feedback_gin").using("gin", table.feedback),
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
    settlementType: fullFinalSettlementTypeEnum("settlement_type").notNull().default("other"),
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
    status: fullFinalSettlementWorkflowStatusEnum("status").notNull().default("draft"),
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
    check("full_final_settlements_pending_salary_non_negative", sql`${table.pendingSalary} >= 0`),
    check("full_final_settlements_leave_encashment_non_negative", sql`${table.leaveEncashment} >= 0`),
    check("full_final_settlements_bonus_non_negative", sql`${table.bonusPayable} >= 0`),
    check("full_final_settlements_deductions_non_negative", sql`${table.deductions} >= 0`),
    check(
      "full_final_settlements_separation_gte_last_working",
      sql`${table.separationDate} >= ${table.lastWorkingDate}`
    ),
    check(
      "full_final_settlements_net_payable_formula",
      sql`${table.netPayable} = ${table.pendingSalary} + ${table.leaveEncashment} + ${table.bonusPayable} - ${table.deductions}`
    ),
    check(
      "full_final_settlements_notes_max_len",
      sql`${table.notes} IS NULL OR char_length(${table.notes}) <= 2000`
    ),
    check(
      "full_final_settlements_approval_stamp_lifecycle",
      sql`(${table.status} IN ('approved'::hr.full_final_settlement_workflow_status, 'paid'::hr.full_final_settlement_workflow_status) AND ${table.approvedBy} IS NOT NULL AND ${table.approvedDate} IS NOT NULL) OR (${table.status} NOT IN ('approved'::hr.full_final_settlement_workflow_status, 'paid'::hr.full_final_settlement_workflow_status) AND ${table.approvedBy} IS NULL AND ${table.approvedDate} IS NULL)`
    ),
    index("full_final_settlements_tenant_idx").on(table.tenantId),
    index("full_final_settlements_employee_idx").on(table.tenantId, table.employeeId),
    index("full_final_settlements_status_idx").on(table.tenantId, table.status),
    index("full_final_settlements_settlement_type_idx").on(table.tenantId, table.settlementType),
    index("full_final_settlements_separation_date_idx").on(table.tenantId, table.separationDate),
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
    effectiveDate: z.iso.date(),
    promotionType: PromotionTypeSchema,
    promotionReasonCategory: PromotionReasonCategorySchema.optional(),
    fromJobPositionId: JobPositionIdSchema,
    toJobPositionId: JobPositionIdSchema,
    fromDepartmentId: DepartmentIdSchema.optional(),
    toDepartmentId: DepartmentIdSchema.optional(),
    fromSalary: currencyAmountSchema(2).optional(),
    toSalary: currencyAmountSchema(2).optional(),
    currencyId: z.number().int().positive().optional(),
    reason: z.string().max(2000).optional(),
    status: PromotionWorkflowStatusSchema.default("draft"),
    approvedBy: EmployeeIdSchema.optional(),
    approvedDate: z.iso.datetime().optional(),
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

export const insertEmployeeTransferSchema = z
  .object({
    id: EmployeeTransferIdSchema.optional(),
    tenantId: hrTenantIdSchema,
    transferNumber: z.string().min(1).max(50),
    employeeId: EmployeeIdSchema,
    effectiveDate: z.iso.date(),
    transferType: TransferTypeSchema,
    fromDepartmentId: DepartmentIdSchema,
    toDepartmentId: DepartmentIdSchema,
    fromLocationId: HrWorkLocationUuidSchema.optional(),
    toLocationId: HrWorkLocationUuidSchema.optional(),
    reason: z.string().min(10).max(2000),
    status: TransferWorkflowStatusSchema.default("draft"),
    approvedBy: EmployeeIdSchema.optional(),
    approvedDate: z.iso.datetime().optional(),
    returnDate: z.iso.date().optional(),
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
    if (data.effectiveDate && data.returnDate && data.returnDate <= data.effectiveDate) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Return date must be after effective date",
        path: ["returnDate"],
      });
    }
  })
  .superRefine(
    refineApprovalStampLifecycle({
      statusField: "status",
      statusesWithApprovalStamp: ["approved", "completed"],
      actorField: "approvedBy",
      atField: "approvedDate",
    })
  );

export const insertExitInterviewSchema = z.object({
  id: ExitInterviewRecordIdSchema.optional(),
  tenantId: hrTenantIdSchema,
  employeeId: EmployeeIdSchema,
  interviewStatus: ExitInterviewStatusSchema.default("scheduled"),
  interviewDate: z.iso.date(),
  interviewerId: EmployeeIdSchema,
  separationType: SeparationTypeSchema,
  reasonForLeaving: z.string().min(10).max(2000),
  wouldRejoin: z.boolean().optional(),
  feedback: jsonObjectNullishSchema,
  suggestions: z.string().max(5000).optional(),
  confidentialNotes: z.string().max(5000).optional(),
});

export const insertFullFinalSettlementSchema = z
  .object({
    id: FullFinalSettlementIdSchema.optional(),
    tenantId: hrTenantIdSchema,
    settlementNumber: z.string().min(1).max(50),
    employeeId: EmployeeIdSchema,
    settlementType: FullFinalSettlementTypeSchema.default("other"),
    separationDate: z.iso.date(),
    lastWorkingDate: z.iso.date(),
    pendingSalary: currencyAmountSchema(2).default("0"),
    leaveEncashment: currencyAmountSchema(2).default("0"),
    bonusPayable: currencyAmountSchema(2).default("0"),
    deductions: currencyAmountSchema(2).default("0"),
    netPayable: currencyAmountSchema(2).default("0"),
    currencyId: z.number().int().positive(),
    status: FullFinalSettlementWorkflowStatusSchema.default("draft"),
    approvedBy: EmployeeIdSchema.optional(),
    approvedDate: z.iso.datetime().optional(),
    paymentDate: z.iso.date().optional(),
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
    const net =
      Number(data.pendingSalary) +
      Number(data.leaveEncashment) +
      Number(data.bonusPayable) -
      Number(data.deductions);
    if (Math.abs(Number(data.netPayable) - net) > 1e-6) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          "netPayable must equal pendingSalary + leaveEncashment + bonusPayable - deductions",
        path: ["netPayable"],
      });
    }
  })
  .superRefine(
    refineApprovalStampLifecycle({
      statusField: "status",
      statusesWithApprovalStamp: ["approved", "paid"],
      actorField: "approvedBy",
      atField: "approvedDate",
    })
  );
