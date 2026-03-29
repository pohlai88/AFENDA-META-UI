// ============================================================================
// HR DOMAIN: BENEFITS MODULE (Phase 1)
// Implements: benefit_providers, benefit_enrollments, benefit_dependent_coverage,
// benefit_claims, benefit_plan_benefits
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
  date,
  uuid,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { z } from "zod/v4";

import { hrSchema } from "./_schema.js";
import { tenantIsolationPolicies, serviceBypassPolicy } from "../../rls/index.js";
import {
  auditColumns,
  nameColumn,
  softDeleteColumns,
  timestampColumns,
} from "../../columns/index.js";
import {
  BenefitProviderIdSchema,
  BenefitEnrollmentIdSchema,
  BenefitDependentCoverageIdSchema,
  BenefitClaimIdSchema,
  businessEmailSchema,
  internationalPhoneSchema,
  bankAccountSchema,
  personNameSchema,
  statusSchema,
  currencyAmountSchema,
  refineDateRange,
  refineConditionalRequired,
} from "./_zodShared.js";

// ============================================================================
// TABLE: benefit_providers
// External insurance/benefit providers (health, dental, retirement, etc.)
// ============================================================================
export const benefitProviders = hrSchema.table(
  "benefit_providers",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: integer("tenant_id").notNull(),
    ...nameColumn,
    email: text("email"),
    phone: text("phone"),
    bankAccount: text("bank_account"),
    status: text("status").notNull().default("active"),
    ...timestampColumns,
    ...softDeleteColumns,
    ...auditColumns,
  },
  (table) => [
    index().on(table.tenantId),
    index().on(table.status),
    ...tenantIsolationPolicies("benefit_providers"),
    serviceBypassPolicy("benefit_providers"),
  ]
);

// ============================================================================
// TABLE: benefit_enrollments
// Employee benefit enrollments with workflow (pending → active → cancelled/expired)
// ============================================================================
export const benefitEnrollments = hrSchema.table(
  "benefit_enrollments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: integer("tenant_id").notNull(),
    employeeId: uuid("employee_id").notNull(),
    benefitProviderId: uuid("benefit_provider_id").notNull(),
    planName: text("plan_name").notNull(),
    enrollmentDate: date("enrollment_date", { mode: "string" }).notNull(),
    expiryDate: date("expiry_date", { mode: "string" }),
    status: text("status").notNull().default("pending"),
    ...timestampColumns,
    ...softDeleteColumns,
    ...auditColumns,
  },
  (table) => [
    foreignKey({
      columns: [table.tenantId, table.benefitProviderId],
      foreignColumns: [benefitProviders.tenantId, benefitProviders.id],
    }),
    check(
      "enrollment_date_order",
      sql`${table.expiryDate} IS NULL OR ${table.expiryDate} >= ${table.enrollmentDate}`
    ),
    check(
      "enrollment_status_valid",
      sql`${table.status} IN ('pending', 'active', 'cancelled', 'expired')`
    ),
    index().on(table.tenantId),
    index().on(table.employeeId),
    index().on(table.status),
    ...tenantIsolationPolicies("benefit_enrollments"),
    serviceBypassPolicy("benefit_enrollments"),
  ]
);

// ============================================================================
// TABLE: benefit_dependent_coverage
// Dependent coverage records (spouse, children, other dependents)
// ============================================================================
export const benefitDependentCoverage = hrSchema.table(
  "benefit_dependent_coverage",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: integer("tenant_id").notNull(),
    benefitEnrollmentId: uuid("benefit_enrollment_id").notNull(),
    ...nameColumn,
    relationship: text("relationship").notNull(), // spouse, child, parent, etc.
    dateOfBirth: date("date_of_birth", { mode: "string" }).notNull(),
    status: text("status").notNull().default("active"),
    ...timestampColumns,
    ...softDeleteColumns,
    ...auditColumns,
  },
  (table) => [
    foreignKey({
      columns: [table.tenantId, table.benefitEnrollmentId],
      foreignColumns: [benefitEnrollments.tenantId, benefitEnrollments.id],
    }),
    check(
      "valid_relationship",
      sql`${table.relationship} IN ('spouse', 'child', 'parent', 'sibling', 'other')`
    ),
    index().on(table.tenantId),
    index().on(table.benefitEnrollmentId),
    ...tenantIsolationPolicies("benefit_dependent_coverage"),
    serviceBypassPolicy("benefit_dependent_coverage"),
  ]
);

// ============================================================================
// TABLE: benefit_claims
// Insurance/benefit claims with workflow (submitted → under_review → approved/rejected → paid)
// ============================================================================
export const benefitClaims = hrSchema.table(
  "benefit_claims",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: integer("tenant_id").notNull(),
    benefitEnrollmentId: uuid("benefit_enrollment_id").notNull(),
    claimDate: date("claim_date", { mode: "string" }).notNull(),
    claimAmount: numeric("claim_amount", { precision: 12, scale: 2 }).notNull(),
    approvedAmount: numeric("approved_amount", { precision: 12, scale: 2 }),
    claimStatus: text("claim_status").notNull().default("submitted"),
    description: text("description"),
    reviewedAt: date("reviewed_at", { mode: "string" }),
    reviewedBy: uuid("reviewed_by"),
    ...timestampColumns,
    ...softDeleteColumns,
    ...auditColumns,
  },
  (table) => [
    foreignKey({
      columns: [table.tenantId, table.benefitEnrollmentId],
      foreignColumns: [benefitEnrollments.tenantId, benefitEnrollments.id],
    }),
    check("claim_amount_positive", sql`${table.claimAmount} > 0`),
    check(
      "approved_amount_valid",
      sql`${table.approvedAmount} IS NULL OR (${table.approvedAmount} >= 0 AND ${table.approvedAmount} <= ${table.claimAmount})`
    ),
    check(
      "claim_status_valid",
      sql`${table.claimStatus} IN ('submitted', 'under_review', 'approved', 'rejected', 'paid')`
    ),
    index().on(table.tenantId),
    index().on(table.benefitEnrollmentId),
    index().on(table.claimStatus),
    ...tenantIsolationPolicies("benefit_claims"),
    serviceBypassPolicy("benefit_claims"),
  ]
);

// ============================================================================
// TABLE: benefit_plan_benefits
// Many-to-many mapping: benefit providers ↔ available plans
// ============================================================================
export const benefitPlanBenefits = hrSchema.table(
  "benefit_plan_benefits",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: integer("tenant_id").notNull(),
    benefitProviderId: uuid("benefit_provider_id").notNull(),
    planName: text("plan_name").notNull(),
    description: text("description"),
    coverageType: text("coverage_type").notNull(), // medical, dental, vision, 401k, etc.
    deductible: numeric("deductible", { precision: 10, scale: 2 }),
    monthlyPremium: numeric("monthly_premium", { precision: 10, scale: 2 }).notNull(),
    status: text("status").notNull().default("active"),
    ...timestampColumns,
    ...softDeleteColumns,
    ...auditColumns,
  },
  (table) => [
    foreignKey({
      columns: [table.tenantId, table.benefitProviderId],
      foreignColumns: [benefitProviders.tenantId, benefitProviders.id],
    }),
    uniqueIndex()
      .on(table.tenantId, table.benefitProviderId, table.planName)
      .where(sql`${table.deletedAt} IS NULL`),
    check("premium_positive", sql`${table.monthlyPremium} > 0`),
    check("deductible_valid", sql`${table.deductible} IS NULL OR ${table.deductible} >= 0`),
    index().on(table.tenantId),
    index().on(table.benefitProviderId),
    index().on(table.coverageType),
    ...tenantIsolationPolicies("benefit_plan_benefits"),
    serviceBypassPolicy("benefit_plan_benefits"),
  ]
);

// ============================================================================
// ZOD INSERT SCHEMAS
// ============================================================================

/**
 * Insert schema for benefit providers
 * Validates: name, email (optional), phone (optional), bank account (optional)
 */
export const insertBenefitProviderSchema = z.object({
  id: BenefitProviderIdSchema.optional(),
  tenantId: z.string().uuid("Invalid tenant ID"),
  name: personNameSchema,
  email: businessEmailSchema.optional(),
  phone: internationalPhoneSchema.optional(),
  bankAccount: bankAccountSchema.optional(),
  status: z.enum(["active", "inactive"]).default("active"),
  createdBy: z.string().uuid().optional(),
  updatedBy: z.string().uuid().optional(),
});

/**
 * Insert schema for benefit enrollments
 * Validates: employee benefit enrollment with date range
 */
export const insertBenefitEnrollmentSchema = z
  .object({
    id: BenefitEnrollmentIdSchema.optional(),
    tenantId: z.string().uuid("Invalid tenant ID"),
    employeeId: z.string().uuid("Invalid employee ID"),
    benefitProviderId: BenefitProviderIdSchema,
    planName: z.string().min(1, "Plan name required").max(100),
    enrollmentDate: z.string().date("Invalid enrollment date"),
    expiryDate: z.string().date("Invalid expiry date").optional(),
    status: z.enum(["pending", "active", "cancelled", "expired"]).default("pending"),
    createdBy: z.string().uuid().optional(),
    updatedBy: z.string().uuid().optional(),
  })
  .refine(
    (data) => {
      if (!data.expiryDate) return true;
      return new Date(data.expiryDate) >= new Date(data.enrollmentDate);
    },
    {
      message: "Expiry date must be after enrollment date",
      path: ["expiryDate"],
    }
  );

/**
 * Insert schema for benefit dependent coverage
 * Validates: dependent name, relationship, date of birth
 */
export const insertBenefitDependentCoverageSchema = z.object({
  id: BenefitDependentCoverageIdSchema.optional(),
  tenantId: z.string().uuid("Invalid tenant ID"),
  benefitEnrollmentId: BenefitEnrollmentIdSchema,
  dependentName: personNameSchema,
  relationship: z.enum(["spouse", "child", "parent", "sibling", "other"]),
  dateOfBirth: z.string().date("Invalid date of birth"),
  status: z.enum(["active", "inactive"]).default("active"),
  createdBy: z.string().uuid().optional(),
  updatedBy: z.string().uuid().optional(),
});

/**
 * Insert schema for benefit claims
 * Validates: claim amount, approved amount, claim status workflow
 */
export const insertBenefitClaimSchema = z
  .object({
    id: BenefitClaimIdSchema.optional(),
    tenantId: z.string().uuid("Invalid tenant ID"),
    benefitEnrollmentId: BenefitEnrollmentIdSchema,
    claimDate: z.string().date("Invalid claim date"),
    claimAmount: currencyAmountSchema(2),
    approvedAmount: currencyAmountSchema(2).optional(),
    claimStatus: z
      .enum(["submitted", "under_review", "approved", "rejected", "paid"])
      .default("submitted"),
    description: z.string().max(500).optional(),
    reviewedAt: z.string().date().optional(),
    reviewedBy: z.string().uuid().optional(),
    createdBy: z.string().uuid().optional(),
    updatedBy: z.string().uuid().optional(),
  })
  .refine(
    (data) => {
      if (!data.approvedAmount) return true;
      return parseFloat(data.approvedAmount) <= parseFloat(data.claimAmount);
    },
    {
      message: "Approved amount cannot exceed claim amount",
      path: ["approvedAmount"],
    }
  )
  .refine(
    (data) => {
      if (data.claimStatus === "approved" && !data.approvedAmount) return false;
      return true;
    },
    {
      message: "Approved amount required when status is approved",
      path: ["approvedAmount"],
    }
  );

/**
 * Insert schema for benefit plan benefits
 * Validates: plan name, coverage type, premium amount
 */
export const insertBenefitPlanBenefitSchema = z.object({
  id: z.string().uuid().optional(),
  tenantId: z.string().uuid("Invalid tenant ID"),
  benefitProviderId: BenefitProviderIdSchema,
  planName: z.string().min(1, "Plan name required").max(100),
  description: z.string().max(500).optional(),
  coverageType: z.enum([
    "medical",
    "dental",
    "vision",
    "retirement",
    "life",
    "disability",
    "other",
  ]),
  deductible: currencyAmountSchema(2).optional(),
  monthlyPremium: currencyAmountSchema(2),
  status: z.enum(["active", "inactive"]).default("active"),
  createdBy: z.string().uuid().optional(),
  updatedBy: z.string().uuid().optional(),
});
