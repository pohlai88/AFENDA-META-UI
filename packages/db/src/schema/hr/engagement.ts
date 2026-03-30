// ============================================================================
// HR DOMAIN: REWARDS & RECOGNITION (Upgrade Module)
// Defines bonus point rules, balances, transaction ledgers, and redemption workflow.
// Tables: bonus_point_rules, employee_bonus_points, bonus_point_transactions,
//          bonus_point_reward_catalog, bonus_point_redemption_requests
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
  timestamp,
} from "drizzle-orm/pg-core";

import { tenantIsolationPolicies, serviceBypassPolicy } from "../../infra-utils/rls/index.js";
import {
  auditColumns,
  nameColumn,
  softDeleteColumns,
  timestampColumns,
} from "../../infra-utils/columns/index.js";
import { tenants } from "../core/tenants.js";
import { hrSchema } from "./_schema.js";
import {
  bonusPointTriggerEventEnum,
  bonusPointTransactionTypeEnum,
  bonusPointPeriodTypeEnum,
  bonusPointReferenceTypeEnum,
  bonusPointRedemptionStatusEnum,
  bonusPointRewardCatalogStatusEnum,
  BonusPointTriggerEventSchema,
  BonusPointTransactionTypeSchema,
  BonusPointPeriodTypeSchema,
  BonusPointReferenceTypeSchema,
  BonusPointRewardCatalogStatusSchema,
} from "./_enums.js";
import { benefitPlanBenefits } from "./benefits.js";
import { employees } from "./people.js";
import { z } from "zod/v4";
import {
  BonusPointRuleIdSchema,
  EmployeeBonusPointIdSchema,
  BonusPointTransactionIdSchema,
  BonusPointTransactionReferenceIdSchema,
  BonusPointRedemptionRequestIdSchema,
  BonusPointRewardCatalogIdSchema,
  BenefitPlanBenefitIdSchema,
  EmployeeIdSchema,
  hrTenantIdSchema,
} from "./_zodShared.js";

// ============================================================================
// BONUS POINT RULES - Define rules for earning bonus points
// ============================================================================

export const bonusPointRules = hrSchema.table(
  "bonus_point_rules",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: integer("tenant_id").notNull(),
    ruleCode: text("rule_code").notNull(),
    ...nameColumn,
    description: text("description"),
    triggerEvent: bonusPointTriggerEventEnum("trigger_event").notNull(),
    pointsAwarded: integer("points_awarded").notNull(),
    maxPerPeriod: integer("max_per_period"), // Max times rule can trigger per period
    periodType: bonusPointPeriodTypeEnum("period_type"),
    effectiveFrom: date("effective_from"),
    effectiveTo: date("effective_to"),
    isActive: boolean("is_active").notNull().default(true),
    ...timestampColumns,
    ...auditColumns,
    ...softDeleteColumns,
  },
  (table) => [
    foreignKey({ columns: [table.tenantId], foreignColumns: [tenants.tenantId] }),
    uniqueIndex("bonus_point_rules_tenant_code_unique")
      .on(table.tenantId, table.ruleCode)
      .where(sql`${table.deletedAt} IS NULL`),
    index("bonus_point_rules_tenant_idx").on(table.tenantId),
    index("bonus_point_rules_event_idx").on(table.tenantId, table.triggerEvent),
    sql`CONSTRAINT bonus_point_rules_points_positive CHECK (points_awarded > 0)`,
    sql`CONSTRAINT bonus_point_rules_period_cap_consistent CHECK (
      (max_per_period IS NULL AND period_type IS NULL)
      OR (max_per_period IS NOT NULL AND period_type IS NOT NULL)
    )`,
    sql`CONSTRAINT bonus_point_rules_effective_range_ok CHECK (
      effective_from IS NULL OR effective_to IS NULL OR effective_from <= effective_to
    )`,
    ...tenantIsolationPolicies("bonus_point_rules"),
    serviceBypassPolicy("bonus_point_rules"),
  ]
);

// ============================================================================
// EMPLOYEE BONUS POINTS - Track employee bonus point balances
// ============================================================================

export const employeeBonusPoints = hrSchema.table(
  "employee_bonus_points",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: integer("tenant_id").notNull(),
    employeeId: uuid("employee_id").notNull(),
    totalPoints: integer("total_points").notNull().default(0),
    redeemedPoints: integer("redeemed_points").notNull().default(0),
    availablePoints: integer("available_points").notNull().default(0),
    lastEarnedDate: timestamp("last_earned_date"),
    lastRedeemedDate: timestamp("last_redeemed_date"),
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
    uniqueIndex("employee_bonus_points_tenant_employee_unique")
      .on(table.tenantId, table.employeeId)
      .where(sql`${table.deletedAt} IS NULL`),
    index("employee_bonus_points_tenant_idx").on(table.tenantId),
    index("employee_bonus_points_employee_idx").on(table.tenantId, table.employeeId),
    sql`CONSTRAINT employee_bonus_points_total_non_negative CHECK (total_points >= 0)`,
    sql`CONSTRAINT employee_bonus_points_redeemed_non_negative CHECK (redeemed_points >= 0)`,
    sql`CONSTRAINT employee_bonus_points_available_non_negative CHECK (available_points >= 0)`,
    sql`CONSTRAINT employee_bonus_points_available_equals_net CHECK (
      available_points = total_points - redeemed_points
    )`,
    ...tenantIsolationPolicies("employee_bonus_points"),
    serviceBypassPolicy("employee_bonus_points"),
  ]
);

// ============================================================================
// BONUS POINT TRANSACTIONS - Track all bonus point movements
// ============================================================================

export const bonusPointTransactions = hrSchema.table(
  "bonus_point_transactions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: integer("tenant_id").notNull(),
    employeeId: uuid("employee_id").notNull(),
    ruleId: uuid("rule_id"),
    transactionType: bonusPointTransactionTypeEnum("transaction_type").notNull(),
    points: integer("points").notNull(),
    balance: integer("balance").notNull(), // Balance after transaction
    referenceType: bonusPointReferenceTypeEnum("reference_type"),
    referenceId: uuid("reference_id"),
    notes: text("notes"),
    transactionDate: timestamp("transaction_date").notNull().defaultNow(),
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
      columns: [table.tenantId, table.ruleId],
      foreignColumns: [bonusPointRules.tenantId, bonusPointRules.id],
    }),
    index("bonus_point_transactions_tenant_idx").on(table.tenantId),
    index("bonus_point_transactions_employee_idx").on(table.tenantId, table.employeeId),
    index("bonus_point_transactions_date_idx").on(table.tenantId, table.transactionDate),
    index("bonus_point_transactions_type_idx").on(table.tenantId, table.transactionType),
    sql`CONSTRAINT bonus_point_transactions_balance_non_negative CHECK (balance >= 0)`,
    sql`CONSTRAINT bonus_point_transactions_reference_pairing CHECK (
      (reference_type IS NULL AND reference_id IS NULL)
      OR (reference_type IS NOT NULL AND reference_id IS NOT NULL)
    )`,
    ...tenantIsolationPolicies("bonus_point_transactions"),
    serviceBypassPolicy("bonus_point_transactions"),
  ]
);

// ============================================================================
// BONUS POINT REWARD CATALOG — Rewards-only redeemables (points cost, tenant SKU)
// ============================================================================

export const bonusPointRewardCatalog = hrSchema.table(
  "bonus_point_reward_catalog",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: integer("tenant_id").notNull(),
    rewardCode: text("reward_code").notNull(),
    ...nameColumn,
    description: text("description"),
    pointsCost: integer("points_cost").notNull(),
    status: bonusPointRewardCatalogStatusEnum("status").notNull().default("active"),
    effectiveFrom: date("effective_from"),
    effectiveTo: date("effective_to"),
    ...timestampColumns,
    ...auditColumns,
    ...softDeleteColumns,
  },
  (table) => [
    foreignKey({ columns: [table.tenantId], foreignColumns: [tenants.tenantId] }),
    uniqueIndex("bonus_point_reward_catalog_tenant_code_unique")
      .on(table.tenantId, table.rewardCode)
      .where(sql`${table.deletedAt} IS NULL`),
    index("bonus_point_reward_catalog_tenant_idx").on(table.tenantId),
    index("bonus_point_reward_catalog_status_idx").on(table.tenantId, table.status),
    sql`CONSTRAINT bonus_point_reward_catalog_points_cost_positive CHECK (points_cost > 0)`,
    sql`CONSTRAINT bonus_point_reward_catalog_effective_range_ok CHECK (
      effective_from IS NULL OR effective_to IS NULL OR effective_from <= effective_to
    )`,
    ...tenantIsolationPolicies("bonus_point_reward_catalog"),
    serviceBypassPolicy("bonus_point_reward_catalog"),
  ]
);

// ============================================================================
// BONUS POINT REDEMPTION REQUESTS — Points → rewards (two optional catalog FKs)
// ============================================================================
// Product: `benefit_plan_benefits` = benefits upgrade-module SKU (provider / plan / coverage).
// `reward_catalog_id` = this module’s rewards-only catalog. At most one of the two may be set;
// if both are null, describe the reward in `request_notes` (ad-hoc redemption).

export const bonusPointRedemptionRequests = hrSchema.table(
  "bonus_point_redemption_requests",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: integer("tenant_id").notNull(),
    employeeBonusPointId: uuid("employee_bonus_point_id").notNull(),
    benefitPlanBenefitId: uuid("benefit_plan_benefit_id"),
    rewardCatalogId: uuid("reward_catalog_id"),
    requestedPoints: integer("requested_points").notNull(),
    status: bonusPointRedemptionStatusEnum("status").notNull().default("pending"),
    requestNotes: text("request_notes"),
    rejectionReason: text("rejection_reason"),
    /** Employee (HR/manager) who approved or rejected the request. */
    approvedBy: uuid("approved_by"),
    approvedAt: timestamp("approved_at", { withTimezone: true }),
    /** Ledger row created when the redemption is fulfilled (`transaction_type = redeemed`). */
    bonusPointTransactionId: uuid("bonus_point_transaction_id"),
    ...timestampColumns,
    ...auditColumns,
    ...softDeleteColumns,
  },
  (table) => [
    foreignKey({ columns: [table.tenantId], foreignColumns: [tenants.tenantId] }),
    foreignKey({
      columns: [table.tenantId, table.employeeBonusPointId],
      foreignColumns: [employeeBonusPoints.tenantId, employeeBonusPoints.id],
    }),
    foreignKey({
      columns: [table.tenantId, table.benefitPlanBenefitId],
      foreignColumns: [benefitPlanBenefits.tenantId, benefitPlanBenefits.id],
    }),
    foreignKey({
      columns: [table.tenantId, table.rewardCatalogId],
      foreignColumns: [bonusPointRewardCatalog.tenantId, bonusPointRewardCatalog.id],
    }),
    foreignKey({
      columns: [table.tenantId, table.approvedBy],
      foreignColumns: [employees.tenantId, employees.id],
    }),
    foreignKey({
      columns: [table.tenantId, table.bonusPointTransactionId],
      foreignColumns: [bonusPointTransactions.tenantId, bonusPointTransactions.id],
    }),
    index("bonus_point_redemption_requests_tenant_idx").on(table.tenantId),
    index("bonus_point_redemption_requests_status_idx").on(table.tenantId, table.status),
    index("bonus_point_redemption_requests_balance_idx").on(table.tenantId, table.employeeBonusPointId),
    sql`CONSTRAINT bonus_point_redemption_requests_points_positive CHECK (requested_points > 0)`,
    sql`CONSTRAINT bonus_point_redemption_requests_review_consistency CHECK (
      (
        status = 'pending'::hr.bonus_point_redemption_status
        AND approved_by IS NULL
        AND approved_at IS NULL
      )
      OR (status = 'cancelled'::hr.bonus_point_redemption_status)
      OR (
        status IN (
          'approved'::hr.bonus_point_redemption_status,
          'rejected'::hr.bonus_point_redemption_status,
          'fulfilled'::hr.bonus_point_redemption_status
        )
        AND approved_by IS NOT NULL
        AND approved_at IS NOT NULL
      )
    )`,
    sql`CONSTRAINT bonus_point_redemption_requests_rejection_reason CHECK (
      status <> 'rejected'::hr.bonus_point_redemption_status OR rejection_reason IS NOT NULL
    )`,
    sql`CONSTRAINT bonus_point_redemption_requests_single_catalog_fk CHECK (
      NOT (
        benefit_plan_benefit_id IS NOT NULL
        AND reward_catalog_id IS NOT NULL
      )
    )`,
    ...tenantIsolationPolicies("bonus_point_redemption_requests"),
    serviceBypassPolicy("bonus_point_redemption_requests"),
  ]
);

// ============================================================================
// ZOD INSERT SCHEMAS
// ============================================================================

export const insertBonusPointRuleSchema = z
  .object({
    id: BonusPointRuleIdSchema.optional(),
    tenantId: hrTenantIdSchema,
    ruleCode: z.string().min(2).max(50),
    name: z.string().min(2).max(100),
    description: z.string().max(500).optional(),
    triggerEvent: BonusPointTriggerEventSchema,
    pointsAwarded: z.number().int().positive(),
    maxPerPeriod: z.number().int().positive().optional(),
    periodType: BonusPointPeriodTypeSchema.optional(),
    effectiveFrom: z.iso.date().optional(),
    effectiveTo: z.iso.date().optional(),
    isActive: z.boolean().default(true),
  })
  .superRefine((v, ctx) => {
    const hasCap = v.maxPerPeriod != null;
    const hasPeriod = v.periodType != null;
    if (hasCap !== hasPeriod) {
      ctx.addIssue({
        code: "custom",
        message: "maxPerPeriod and periodType must both be set or both omitted",
        path: hasCap ? ["periodType"] : ["maxPerPeriod"],
      });
    }
    if (v.effectiveFrom && v.effectiveTo && v.effectiveFrom > v.effectiveTo) {
      ctx.addIssue({
        code: "custom",
        message: "effectiveFrom must be on or before effectiveTo",
        path: ["effectiveTo"],
      });
    }
  });

export const insertEmployeeBonusPointSchema = z
  .object({
    id: EmployeeBonusPointIdSchema.optional(),
    tenantId: hrTenantIdSchema,
    employeeId: EmployeeIdSchema,
    totalPoints: z.number().int().min(0).default(0),
    redeemedPoints: z.number().int().min(0).default(0),
    availablePoints: z.number().int().min(0).default(0),
    lastEarnedDate: z.date().optional(),
    lastRedeemedDate: z.date().optional(),
  })
  .superRefine((v, ctx) => {
    if (v.availablePoints !== v.totalPoints - v.redeemedPoints) {
      ctx.addIssue({
        code: "custom",
        message: "availablePoints must equal totalPoints - redeemedPoints",
        path: ["availablePoints"],
      });
    }
  });

export const insertBonusPointTransactionSchema = z
  .object({
    id: BonusPointTransactionIdSchema.optional(),
    tenantId: hrTenantIdSchema,
    employeeId: EmployeeIdSchema,
    ruleId: BonusPointRuleIdSchema.optional(),
    transactionType: BonusPointTransactionTypeSchema,
    points: z.number().int(),
    balance: z.number().int().min(0),
    referenceType: BonusPointReferenceTypeSchema.optional(),
    referenceId: BonusPointTransactionReferenceIdSchema.optional(),
    notes: z.string().max(1000).optional(),
    transactionDate: z.date().optional(),
  })
  .superRefine((v, ctx) => {
    const hasType = v.referenceType != null;
    const hasId = v.referenceId != null;
    if (hasType !== hasId) {
      ctx.addIssue({
        code: "custom",
        message: "referenceType and referenceId must both be set or both omitted",
        path: hasType ? ["referenceId"] : ["referenceType"],
      });
    }
  });

export const insertBonusPointRewardCatalogSchema = z
  .object({
    id: BonusPointRewardCatalogIdSchema.optional(),
    tenantId: hrTenantIdSchema,
    rewardCode: z.string().min(2).max(50),
    name: z.string().min(2).max(100),
    description: z.string().max(500).optional(),
    pointsCost: z.number().int().positive(),
    status: BonusPointRewardCatalogStatusSchema.optional(),
    effectiveFrom: z.iso.date().optional(),
    effectiveTo: z.iso.date().optional(),
  })
  .superRefine((v, ctx) => {
    if (v.effectiveFrom && v.effectiveTo && v.effectiveFrom > v.effectiveTo) {
      ctx.addIssue({
        code: "custom",
        message: "effectiveFrom must be on or before effectiveTo",
        path: ["effectiveTo"],
      });
    }
  });

/** Employee-submitted redemption; workflow updates use normal `update` + domain rules. */
export const insertBonusPointRedemptionRequestSchema = z
  .object({
    id: BonusPointRedemptionRequestIdSchema.optional(),
    tenantId: hrTenantIdSchema,
    employeeBonusPointId: EmployeeBonusPointIdSchema,
    benefitPlanBenefitId: BenefitPlanBenefitIdSchema.optional(),
    rewardCatalogId: BonusPointRewardCatalogIdSchema.optional(),
    requestedPoints: z.number().int().positive(),
    requestNotes: z.string().max(1000).optional(),
  })
  .superRefine((v, ctx) => {
    if (v.benefitPlanBenefitId != null && v.rewardCatalogId != null) {
      ctx.addIssue({
        code: "custom",
        message: "benefitPlanBenefitId and rewardCatalogId cannot both be set",
        path: ["rewardCatalogId"],
      });
    }
  });
