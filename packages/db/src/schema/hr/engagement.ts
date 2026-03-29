// ============================================================================
// HR DOMAIN: REWARDS & RECOGNITION (Upgrade Module)
// Defines bonus point rules, balances, and transaction ledgers.
// Tables: bonus_point_rules, bonus_point_transactions, employee_bonus_points
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
import { hrSchema } from "./_schema.js";
import { bonusPointTriggerEventEnum, bonusPointTransactionTypeEnum } from "./_enums.js";
import { employees } from "./people.js";
import { z } from "zod/v4";
import {
  BonusPointRuleIdSchema,
  EmployeeBonusPointIdSchema,
  BonusPointTransactionIdSchema,
  BonusPointTransactionReferenceIdSchema,
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
    periodType: text("period_type"), // 'day' | 'week' | 'month' | 'year'
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
    referenceType: text("reference_type"), // e.g., 'goal', 'attendance', 'training'
    referenceId: uuid("reference_id"), // ID of referenced entity
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
    ...tenantIsolationPolicies("bonus_point_transactions"),
    serviceBypassPolicy("bonus_point_transactions"),
  ]
);

// ============================================================================
// ZOD INSERT SCHEMAS
// ============================================================================

export const insertBonusPointRuleSchema = z.object({
  id: BonusPointRuleIdSchema.optional(),
  tenantId: hrTenantIdSchema,
  ruleCode: z.string().min(2).max(50),
  name: z.string().min(2).max(100),
  description: z.string().max(500).optional(),
  triggerEvent: z.enum([
    "attendance_streak",
    "goal_completion",
    "training_completion",
    "referral",
    "performance_rating",
    "anniversary",
    "manual",
    "other",
  ]),
  pointsAwarded: z.number().int().positive(),
  maxPerPeriod: z.number().int().positive().optional(),
  periodType: z.enum(["day", "week", "month", "year"]).optional(),
  isActive: z.boolean().default(true),
});

export const insertEmployeeBonusPointSchema = z.object({
  id: EmployeeBonusPointIdSchema.optional(),
  tenantId: hrTenantIdSchema,
  employeeId: EmployeeIdSchema,
  totalPoints: z.number().int().min(0).default(0),
  redeemedPoints: z.number().int().min(0).default(0),
  availablePoints: z.number().int().min(0).default(0),
  lastEarnedDate: z.date().optional(),
  lastRedeemedDate: z.date().optional(),
});

export const insertBonusPointTransactionSchema = z.object({
  id: BonusPointTransactionIdSchema.optional(),
  tenantId: hrTenantIdSchema,
  employeeId: EmployeeIdSchema,
  ruleId: BonusPointRuleIdSchema.optional(),
  transactionType: z.enum(["earned", "redeemed", "expired", "adjusted"]),
  points: z.number().int(),
  balance: z.number().int().min(0),
  referenceType: z.string().max(50).optional(),
  referenceId: BonusPointTransactionReferenceIdSchema.optional(),
  notes: z.string().max(1000).optional(),
  transactionDate: z.date().optional(),
});
