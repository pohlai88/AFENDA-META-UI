// ============================================================================
// HR DOMAIN: BENEFITS & COVERAGE (Phase 1)
// Defines provider catalogs, plan mappings, enrollments, dependent coverage, and claims.
// Tables: benefit_providers, benefit_enrollments, benefit_dependent_coverage, benefit_claims, benefit_plan_benefits
// ============================================================================
import { sql } from "drizzle-orm";
import {
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
import {
  benefitCatalogStatusEnum,
  benefitEnrollmentWorkflowStatusEnum,
  benefitDependentRelationshipEnum,
  benefitClaimStatusEnum,
  benefitPlanCoverageTypeEnum,
  dependentCoverageStatusEnum,
  BenefitCatalogStatusSchema,
  BenefitEnrollmentWorkflowStatusSchema,
  BenefitDependentRelationshipSchema,
  BenefitClaimStatusSchema,
  BenefitPlanCoverageTypeSchema,
  DependentCoverageStatusSchema,
} from "./_enums.js";
import { employees } from "./people.js";
import { currencies } from "../reference/index.js";
import { tenantIsolationPolicies, serviceBypassPolicy } from "../../rls-policies/index.js";
import {
  auditColumns,
  nameColumn,
  softDeleteColumns,
  timestampColumns,
} from "../../column-kit/index.js";
import { users } from "../security/index.js";
import {
  BenefitProviderIdSchema,
  BenefitEnrollmentIdSchema,
  BenefitDependentCoverageIdSchema,
  BenefitClaimIdSchema,
  BenefitPlanBenefitIdSchema,
  EmployeeIdSchema,
  businessEmailSchema,
  internationalPhoneSchema,
  bankAccountSchema,
  personNameSchema,
  currencyAmountSchema,
  hrTenantIdSchema,
  hrAuditUserIdSchema,
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
    status: benefitCatalogStatusEnum("status").notNull().default("active"),
    ...timestampColumns,
    ...softDeleteColumns,
    ...auditColumns(() => users.userId),
  },
  (table) => [
    index("benefit_providers_tenant_idx").on(table.tenantId),
    index("benefit_providers_status_idx").on(table.status),
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
    status: benefitEnrollmentWorkflowStatusEnum("status").notNull().default("pending"),
    ...timestampColumns,
    ...softDeleteColumns,
    ...auditColumns(() => users.userId),
  },
  (table) => [
    foreignKey({
      columns: [table.tenantId, table.benefitProviderId],
      foreignColumns: [benefitProviders.tenantId, benefitProviders.id],
    }),
    foreignKey({
      columns: [table.tenantId, table.employeeId],
      foreignColumns: [employees.tenantId, employees.id],
    }),
    check(
      "enrollment_date_order",
      sql`${table.expiryDate} IS NULL OR ${table.expiryDate} >= ${table.enrollmentDate}`
    ),
    check(
      "benefit_enrollments_active_expiry_current",
      sql`${table.status} <> 'active' OR ${table.expiryDate} IS NULL OR ${table.expiryDate} >= CURRENT_DATE`
    ),
    index("benefit_enrollments_tenant_idx").on(table.tenantId),
    index("benefit_enrollments_employee_idx").on(table.employeeId),
    index("benefit_enrollments_status_idx").on(table.status),
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
    relationship: benefitDependentRelationshipEnum("relationship").notNull(),
    dateOfBirth: date("date_of_birth", { mode: "string" }).notNull(),
    status: dependentCoverageStatusEnum("status").notNull().default("active"),
    ...timestampColumns,
    ...softDeleteColumns,
    ...auditColumns(() => users.userId),
  },
  (table) => [
    foreignKey({
      columns: [table.tenantId, table.benefitEnrollmentId],
      foreignColumns: [benefitEnrollments.tenantId, benefitEnrollments.id],
    }),
    index("benefit_dependent_coverage_tenant_idx").on(table.tenantId),
    index("benefit_dependent_coverage_enrollment_idx").on(table.benefitEnrollmentId),
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
    claimStatus: benefitClaimStatusEnum("claim_status").notNull().default("submitted"),
    description: text("description"),
    reviewedAt: date("reviewed_at", { mode: "string" }),
    reviewedBy: uuid("reviewed_by"),
    ...timestampColumns,
    ...softDeleteColumns,
    ...auditColumns(() => users.userId),
  },
  (table) => [
    foreignKey({
      columns: [table.tenantId, table.benefitEnrollmentId],
      foreignColumns: [benefitEnrollments.tenantId, benefitEnrollments.id],
    }),
    foreignKey({
      columns: [table.tenantId, table.reviewedBy],
      foreignColumns: [employees.tenantId, employees.id],
    }),
    check("claim_amount_positive", sql`${table.claimAmount} > 0`),
    check(
      "approved_amount_valid",
      sql`${table.approvedAmount} IS NULL OR (${table.approvedAmount} >= 0 AND ${table.approvedAmount} <= ${table.claimAmount})`
    ),
    check(
      "benefit_claims_approved_requires_amount",
      sql`${table.claimStatus} <> 'approved' OR ${table.approvedAmount} IS NOT NULL`
    ),
    index("benefit_claims_tenant_idx").on(table.tenantId),
    index("benefit_claims_enrollment_idx").on(table.benefitEnrollmentId),
    index("benefit_claims_claim_status_idx").on(table.claimStatus),
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
    coverageType: benefitPlanCoverageTypeEnum("coverage_type").notNull(),
    deductible: numeric("deductible", { precision: 10, scale: 2 }),
    monthlyPremium: numeric("monthly_premium", { precision: 10, scale: 2 }).notNull(),
    currencyId: integer("currency_id").notNull(),
    status: benefitCatalogStatusEnum("status").notNull().default("active"),
    ...timestampColumns,
    ...softDeleteColumns,
    ...auditColumns(() => users.userId),
  },
  (table) => [
    foreignKey({
      columns: [table.tenantId, table.benefitProviderId],
      foreignColumns: [benefitProviders.tenantId, benefitProviders.id],
    }),
    foreignKey({
      columns: [table.currencyId],
      foreignColumns: [currencies.currencyId],
    }),
    uniqueIndex("benefit_plan_benefits_tenant_provider_plan_active_unique")
      .on(table.tenantId, table.benefitProviderId, table.planName)
      .where(sql`${table.deletedAt} IS NULL`),
    check("premium_positive", sql`${table.monthlyPremium} > 0`),
    check("deductible_valid", sql`${table.deductible} IS NULL OR ${table.deductible} >= 0`),
    index("benefit_plan_benefits_tenant_idx").on(table.tenantId),
    index("benefit_plan_benefits_provider_idx").on(table.benefitProviderId),
    index("benefit_plan_benefits_currency_idx").on(table.currencyId),
    index("benefit_plan_benefits_coverage_type_idx").on(table.coverageType),
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
  tenantId: hrTenantIdSchema,
  name: personNameSchema,
  email: businessEmailSchema.optional(),
  phone: internationalPhoneSchema.optional(),
  bankAccount: bankAccountSchema.optional(),
  status: BenefitCatalogStatusSchema.default("active"),
  createdBy: hrAuditUserIdSchema.optional(),
  updatedBy: hrAuditUserIdSchema.optional(),
});

/**
 * Insert schema for benefit enrollments
 * Validates: employee benefit enrollment with date range
 */
export const insertBenefitEnrollmentSchema = z
  .object({
    id: BenefitEnrollmentIdSchema.optional(),
    tenantId: hrTenantIdSchema,
    employeeId: EmployeeIdSchema,
    benefitProviderId: BenefitProviderIdSchema,
    planName: z.string().min(1, "Plan name required").max(100),
    enrollmentDate: z.iso.date("Invalid enrollment date"),
    expiryDate: z.iso.date("Invalid expiry date").optional(),
    status: BenefitEnrollmentWorkflowStatusSchema.default("pending"),
    createdBy: hrAuditUserIdSchema.optional(),
    updatedBy: hrAuditUserIdSchema.optional(),
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
  )
  .refine(
    (data) => {
      if (data.status !== "active") return true;
      if (!data.expiryDate) return true;
      const today = new Date().toISOString().slice(0, 10);
      return data.expiryDate >= today;
    },
    {
      message: "Active enrollment requires null expiry or expiry on or after today",
      path: ["expiryDate"],
    }
  );

/**
 * Insert schema for benefit dependent coverage
 * Validates: dependent name, relationship, date of birth
 */
export const insertBenefitDependentCoverageSchema = z.object({
  id: BenefitDependentCoverageIdSchema.optional(),
  tenantId: hrTenantIdSchema,
  benefitEnrollmentId: BenefitEnrollmentIdSchema,
  name: personNameSchema,
  relationship: BenefitDependentRelationshipSchema,
  dateOfBirth: z.iso.date("Invalid date of birth"),
  status: DependentCoverageStatusSchema.default("active"),
  createdBy: hrAuditUserIdSchema.optional(),
  updatedBy: hrAuditUserIdSchema.optional(),
});

/**
 * Insert schema for benefit claims
 * Validates: claim amount, approved amount, claim status workflow
 */
export const insertBenefitClaimSchema = z
  .object({
    id: BenefitClaimIdSchema.optional(),
    tenantId: hrTenantIdSchema,
    benefitEnrollmentId: BenefitEnrollmentIdSchema,
    claimDate: z.iso.date("Invalid claim date"),
    claimAmount: currencyAmountSchema(2),
    approvedAmount: currencyAmountSchema(2).optional(),
    claimStatus: BenefitClaimStatusSchema.default("submitted"),
    description: z.string().max(500).optional(),
    reviewedAt: z.iso.date().optional(),
    reviewedBy: EmployeeIdSchema.optional(),
    createdBy: hrAuditUserIdSchema.optional(),
    updatedBy: hrAuditUserIdSchema.optional(),
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
  .superRefine(
    refineConditionalRequired(
      "approvedAmount",
      (data) => data.claimStatus === "approved",
      "Approved amount required when status is approved"
    )
  );

/**
 * Insert schema for benefit plan benefits
 * Validates: plan name, coverage type, premium amount
 */
export const insertBenefitPlanBenefitSchema = z.object({
  id: BenefitPlanBenefitIdSchema.optional(),
  tenantId: hrTenantIdSchema,
  benefitProviderId: BenefitProviderIdSchema,
  planName: z.string().min(1, "Plan name required").max(100),
  description: z.string().max(500).optional(),
  coverageType: BenefitPlanCoverageTypeSchema,
  deductible: currencyAmountSchema(2).optional(),
  monthlyPremium: currencyAmountSchema(2),
  currencyId: z.number().int().positive(),
  status: BenefitCatalogStatusSchema.default("active"),
  createdBy: hrAuditUserIdSchema.optional(),
  updatedBy: hrAuditUserIdSchema.optional(),
});
