// ============================================================================
// HR DOMAIN: PEOPLE & ORG STRUCTURE (Phase 0)
// Defines departments, job titles, positions, employees, and cost centers (5 tables).
// Tables: departments, job_titles, job_positions, employees, cost_centers
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

import { tenantIsolationPolicies, serviceBypassPolicy } from "../../rls-policies/index.js";
import {
  auditColumns,
  nameColumn,
  softDeleteColumns,
  timestampColumns,
} from "../../column-kit/index.js";
import { tenants } from "../core/tenants.js";
import { countries, currencies, states } from "../reference/index.js";
import { users, UserIdSchema } from "../security/index.js";
import { hrSchema } from "./_schema.js";
import {
  employmentStatusEnum,
  employmentTypeEnum,
  employeeCategoryEnum,
  genderEnum,
  maritalStatusEnum,
  workLocationTypeEnum,
  departmentTypeEnum,
  costCenterTypeEnum,
  CostCenterTypeSchema,
  DepartmentTypeSchema,
  EmployeeCategorySchema,
  EmploymentStatusSchema,
  EmploymentTypeSchema,
  GenderSchema,
  MaritalStatusSchema,
  WorkLocationTypeSchema,
} from "./_enums.js";
import { z } from "zod/v4";
import {
  DepartmentIdSchema,
  JobTitleIdSchema,
  JobPositionIdSchema,
  EmployeeIdSchema,
  CostCenterIdSchema,
  businessEmailSchema,
  internationalPhoneSchema,
  currencyAmountSchema,
  refineDateRange,
  hrTenantIdSchema,
  HrWorkLocationUuidSchema,
} from "./_zodShared.js";

// ============================================================================
// DEPARTMENTS
// ============================================================================

export const departments = hrSchema.table(
  "departments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: integer("tenant_id").notNull(),
    departmentCode: text("department_code").notNull(),
    ...nameColumn,
    description: text("description"),
    departmentType: departmentTypeEnum("department_type").notNull(),
    parentDepartmentId: uuid("parent_department_id"),
    managerId: uuid("manager_id"), // FK deferred — see CIRCULAR_FKS.md CIRC-001; ADR-006
    costCenterId: uuid("cost_center_id"), // FK deferred — see CIRCULAR_FKS.md CIRC-002; ADR-006
    /** App-maintained materialized path for subtree queries (tenant convention). */
    hierarchyPath: text("hierarchy_path"),
    /** App-maintained depth from root (0 = root). */
    treeDepth: integer("tree_depth"),
    isActive: boolean("is_active").notNull().default(true),
    ...timestampColumns,
    ...auditColumns(() => users.userId),
    ...softDeleteColumns,
  },
  (table) => [
    foreignKey({ columns: [table.tenantId], foreignColumns: [tenants.tenantId] }),
    foreignKey({ columns: [table.parentDepartmentId], foreignColumns: [table.id] }),
    uniqueIndex("departments_tenant_code_unique")
      .on(table.tenantId, table.departmentCode)
      .where(sql`${table.deletedAt} IS NULL`),
    index("departments_tenant_idx").on(table.tenantId),
    index("departments_parent_idx").on(table.tenantId, table.parentDepartmentId),
    ...tenantIsolationPolicies("departments"),
    serviceBypassPolicy("departments"),
  ]
);

// ============================================================================
// JOB TITLES
// ============================================================================

export const jobTitles = hrSchema.table(
  "job_titles",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: integer("tenant_id").notNull(),
    titleCode: text("title_code").notNull(),
    ...nameColumn,
    description: text("description"),
    departmentId: uuid("department_id"),
    levelCode: text("level_code"),
    minSalary: numeric("min_salary", { precision: 15, scale: 2 }),
    maxSalary: numeric("max_salary", { precision: 15, scale: 2 }),
    currencyId: integer("currency_id"),
    isActive: boolean("is_active").notNull().default(true),
    ...timestampColumns,
    ...auditColumns(() => users.userId),
    ...softDeleteColumns,
  },
  (table) => [
    foreignKey({ columns: [table.tenantId], foreignColumns: [tenants.tenantId] }),
    foreignKey({
      columns: [table.tenantId, table.departmentId],
      foreignColumns: [departments.tenantId, departments.id],
    }),
    foreignKey({ columns: [table.currencyId], foreignColumns: [currencies.currencyId] }),
    uniqueIndex("job_titles_tenant_code_unique")
      .on(table.tenantId, table.titleCode)
      .where(sql`${table.deletedAt} IS NULL`),
    index("job_titles_tenant_idx").on(table.tenantId),
    index("job_titles_department_idx").on(table.tenantId, table.departmentId),
    check(
      "job_titles_salary_requires_currency",
      sql`(${table.minSalary} IS NULL AND ${table.maxSalary} IS NULL) OR ${table.currencyId} IS NOT NULL`
    ),
    ...tenantIsolationPolicies("job_titles"),
    serviceBypassPolicy("job_titles"),
  ]
);

// ============================================================================
// JOB POSITIONS
// ============================================================================

export const jobPositions = hrSchema.table(
  "job_positions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: integer("tenant_id").notNull(),
    positionCode: text("position_code").notNull(),
    ...nameColumn,
    description: text("description"),
    jobTitleId: uuid("job_title_id").notNull(),
    departmentId: uuid("department_id").notNull(),
    reportsToPositionId: uuid("reports_to_position_id"),
    employmentType: employmentTypeEnum("employment_type").notNull(),
    isActive: boolean("is_active").notNull().default(true),
    maxHeadcount: integer("max_headcount").notNull().default(1),
    currentHeadcount: integer("current_headcount").notNull().default(0),
    ...timestampColumns,
    ...auditColumns(() => users.userId),
    ...softDeleteColumns,
  },
  (table) => [
    foreignKey({ columns: [table.tenantId], foreignColumns: [tenants.tenantId] }),
    foreignKey({
      columns: [table.tenantId, table.jobTitleId],
      foreignColumns: [jobTitles.tenantId, jobTitles.id],
    }),
    foreignKey({
      columns: [table.tenantId, table.departmentId],
      foreignColumns: [departments.tenantId, departments.id],
    }),
    foreignKey({ columns: [table.reportsToPositionId], foreignColumns: [table.id] }),
    uniqueIndex("job_positions_tenant_code_unique")
      .on(table.tenantId, table.positionCode)
      .where(sql`${table.deletedAt} IS NULL`),
    index("job_positions_tenant_idx").on(table.tenantId),
    index("job_positions_department_idx").on(table.tenantId, table.departmentId),
    check(
      "job_positions_max_headcount_positive",
      sql`${table.maxHeadcount} > 0`
    ),
    check(
      "job_positions_current_lte_max",
      sql`${table.currentHeadcount} <= ${table.maxHeadcount}`
    ),
    check(
      "job_positions_current_non_negative",
      sql`${table.currentHeadcount} >= 0`
    ),
    ...tenantIsolationPolicies("job_positions"),
    serviceBypassPolicy("job_positions"),
  ]
);

// ============================================================================
// EMPLOYEES
// ============================================================================

export const employees = hrSchema.table(
  "employees",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: integer("tenant_id").notNull(),
    employeeNumber: text("employee_number").notNull(),
    userId: integer("user_id"),
    firstName: text("first_name").notNull(),
    middleName: text("middle_name"),
    lastName: text("last_name").notNull(),
    email: text("email").notNull(),
    phoneNumber: text("phone_number"),
    mobileNumber: text("mobile_number"),
    dateOfBirth: date("date_of_birth", { mode: "string" }),
    gender: genderEnum("gender"),
    maritalStatus: maritalStatusEnum("marital_status"),
    nationality: text("nationality"),
    nationalId: text("national_id"),
    passportNumber: text("passport_number"),
    jobPositionId: uuid("job_position_id").notNull(),
    departmentId: uuid("department_id").notNull(),
    managerId: uuid("manager_id"),
    employmentType: employmentTypeEnum("employment_type").notNull(),
    employmentStatus: employmentStatusEnum("employment_status").notNull(),
    /** Last time `employment_status` changed (app-maintained). */
    statusChangeDate: date("status_change_date", { mode: "string" }),
    employeeCategory: employeeCategoryEnum("employee_category").notNull(),
    hireDate: date("hire_date", { mode: "string" }).notNull(),
    confirmationDate: date("confirmation_date", { mode: "string" }),
    terminationDate: date("termination_date", { mode: "string" }),
    departureReasonId: uuid("departure_reason_id"),
    departureDate: date("departure_date", { mode: "string" }),
    rehireEligible: boolean("rehire_eligible"),
    lastPromotionDate: date("last_promotion_date", { mode: "string" }),
    workLocationId: uuid("work_location_id"),
    workLocationType: workLocationTypeEnum("work_location_type").notNull().default("office"),
    addressLine1: text("address_line_1"),
    addressLine2: text("address_line_2"),
    city: text("city"),
    stateId: integer("state_id"),
    countryId: integer("country_id"),
    postalCode: text("postal_code"),
    emergencyContactName: text("emergency_contact_name"),
    emergencyContactPhone: text("emergency_contact_phone"),
    emergencyContactRelation: text("emergency_contact_relation"),
    bankName: text("bank_name"),
    bankAccountNumber: text("bank_account_number"),
    bankBranch: text("bank_branch"),
    taxId: text("tax_id"),
    socialSecurityNumber: text("social_security_number"),
    profilePhotoUrl: text("profile_photo_url"),
    notes: text("notes"),
    isActive: boolean("is_active").notNull().default(true),
    ...timestampColumns,
    ...auditColumns(() => users.userId),
    ...softDeleteColumns,
  },
  (table) => [
    foreignKey({ columns: [table.tenantId], foreignColumns: [tenants.tenantId] }),
    foreignKey({ columns: [table.userId], foreignColumns: [users.userId] }),
    foreignKey({
      columns: [table.tenantId, table.jobPositionId],
      foreignColumns: [jobPositions.tenantId, jobPositions.id],
    }),
    foreignKey({
      columns: [table.tenantId, table.departmentId],
      foreignColumns: [departments.tenantId, departments.id],
    }),
    foreignKey({ columns: [table.managerId], foreignColumns: [table.id] }),
    foreignKey({ columns: [table.stateId], foreignColumns: [states.stateId] }),
    foreignKey({ columns: [table.countryId], foreignColumns: [countries.countryId] }),
    uniqueIndex("employees_tenant_number_unique")
      .on(table.tenantId, table.employeeNumber)
      .where(sql`${table.deletedAt} IS NULL`),
    uniqueIndex("employees_tenant_email_unique")
      .on(table.tenantId, table.email)
      .where(sql`${table.deletedAt} IS NULL`),
    index("employees_tenant_idx").on(table.tenantId),
    index("employees_department_idx").on(table.tenantId, table.departmentId),
    index("employees_manager_idx").on(table.tenantId, table.managerId),
    index("employees_dept_status_idx")
      .on(table.tenantId, table.departmentId, table.employmentStatus)
      .where(sql`${table.deletedAt} IS NULL`),
    index("employees_status_idx")
      .on(table.tenantId, table.employmentStatus)
      .where(sql`${table.deletedAt} IS NULL`),
    index("employees_status_change_date_idx").on(table.tenantId, table.statusChangeDate),
    ...tenantIsolationPolicies("employees"),
    serviceBypassPolicy("employees"),
  ]
);

// ============================================================================
// COST CENTERS
// ============================================================================

export const costCenters = hrSchema.table(
  "cost_centers",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: integer("tenant_id").notNull(),
    costCenterCode: text("cost_center_code").notNull(),
    ...nameColumn,
    description: text("description"),
    costCenterType: costCenterTypeEnum("cost_center_type").notNull(),
    parentCostCenterId: uuid("parent_cost_center_id"),
    managerId: uuid("manager_id"),
    isActive: boolean("is_active").notNull().default(true),
    closedDate: date("closed_date", { mode: "string" }),
    ...timestampColumns,
    ...auditColumns(() => users.userId),
    ...softDeleteColumns,
  },
  (table) => [
    foreignKey({ columns: [table.tenantId], foreignColumns: [tenants.tenantId] }),
    foreignKey({ columns: [table.parentCostCenterId], foreignColumns: [table.id] }),
    foreignKey({
      columns: [table.tenantId, table.managerId],
      foreignColumns: [employees.tenantId, employees.id],
    }),
    uniqueIndex("cost_centers_tenant_code_unique")
      .on(table.tenantId, table.costCenterCode)
      .where(sql`${table.deletedAt} IS NULL`),
    index("cost_centers_tenant_idx").on(table.tenantId),
    index("cost_centers_closed_date_idx").on(table.tenantId, table.closedDate),
    ...tenantIsolationPolicies("cost_centers"),
    serviceBypassPolicy("cost_centers"),
  ]
);

// ============================================================================
// ZOD INSERT SCHEMAS
// ============================================================================

export const insertDepartmentSchema = z.object({
  id: DepartmentIdSchema.optional(),
  tenantId: hrTenantIdSchema,
  departmentCode: z.string().min(2).max(50),
  name: z.string().min(2).max(100),
  description: z.string().max(500).optional(),
  departmentType: DepartmentTypeSchema,
  parentDepartmentId: DepartmentIdSchema.optional(),
  managerId: EmployeeIdSchema.optional(),
  costCenterId: CostCenterIdSchema.optional(),
  hierarchyPath: z.string().max(4000).optional(),
  treeDepth: z.number().int().min(0).optional(),
  isActive: z.boolean().default(true),
});

export const insertJobTitleSchema = z
  .object({
    id: JobTitleIdSchema.optional(),
    tenantId: hrTenantIdSchema,
    titleCode: z.string().min(2).max(50),
    name: z.string().min(2).max(100),
    description: z.string().max(500).optional(),
    departmentId: DepartmentIdSchema.optional(),
    levelCode: z.string().max(20).optional(),
    minSalary: currencyAmountSchema(2).optional(),
    maxSalary: currencyAmountSchema(2).optional(),
    currencyId: z.number().int().positive().optional(),
    isActive: z.boolean().default(true),
  })
  .superRefine((data, ctx) => {
    if (
      data.minSalary !== undefined &&
      data.maxSalary !== undefined &&
      data.minSalary > data.maxSalary
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Minimum salary cannot exceed maximum salary",
        path: ["minSalary"],
      });
    }
    const hasSalaryBand =
      data.minSalary !== undefined || data.maxSalary !== undefined;
    if (hasSalaryBand && data.currencyId == null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "currencyId is required when minSalary or maxSalary is set",
        path: ["currencyId"],
      });
    }
  });

export const insertJobPositionSchema = z
  .object({
    id: JobPositionIdSchema.optional(),
    tenantId: hrTenantIdSchema,
    positionCode: z.string().min(2).max(50),
    name: z.string().min(2).max(100),
    description: z.string().max(1000).optional(),
    jobTitleId: JobTitleIdSchema,
    departmentId: DepartmentIdSchema,
    reportsToPositionId: JobPositionIdSchema.optional(),
    employmentType: EmploymentTypeSchema,
    maxHeadcount: z.number().int().min(1).default(1),
    currentHeadcount: z.number().int().min(0).default(0),
    isActive: z.boolean().default(true),
  })
  .superRefine((data, ctx) => {
    if (data.currentHeadcount > data.maxHeadcount) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "currentHeadcount cannot exceed maxHeadcount",
        path: ["currentHeadcount"],
      });
    }
  });

export const insertEmployeeSchema = z
  .object({
    id: EmployeeIdSchema.optional(),
    tenantId: hrTenantIdSchema,
    employeeNumber: z.string().min(3).max(50),
    userId: UserIdSchema.optional(),
    firstName: z.string().min(1).max(100),
    middleName: z.string().max(100).optional(),
    lastName: z.string().min(1).max(100),
    email: businessEmailSchema,
    phoneNumber: internationalPhoneSchema.optional(),
    mobileNumber: internationalPhoneSchema.optional(),
    dateOfBirth: z.iso.date().optional(),
    gender: GenderSchema.optional(),
    maritalStatus: MaritalStatusSchema.optional(),
    nationality: z.string().max(100).optional(),
    nationalId: z.string().max(100).optional(),
    passportNumber: z.string().max(50).optional(),
    jobPositionId: JobPositionIdSchema,
    departmentId: DepartmentIdSchema,
    managerId: EmployeeIdSchema.optional(),
    employmentType: EmploymentTypeSchema,
    employmentStatus: EmploymentStatusSchema,
    statusChangeDate: z.iso.date().optional(),
    employeeCategory: EmployeeCategorySchema,
    hireDate: z.iso.date(),
    confirmationDate: z.iso.date().optional(),
    terminationDate: z.iso.date().optional(),
    departureReasonId: z.uuid().optional(),
    departureDate: z.iso.date().optional(),
    rehireEligible: z.boolean().optional(),
    workLocationId: HrWorkLocationUuidSchema.optional(),
    workLocationType: WorkLocationTypeSchema.default("office"),
    addressLine1: z.string().max(200).optional(),
    addressLine2: z.string().max(200).optional(),
    city: z.string().max(100).optional(),
    stateId: z.number().int().positive().optional(),
    countryId: z.number().int().positive().optional(),
    postalCode: z.string().max(20).optional(),
    emergencyContactName: z.string().max(100).optional(),
    emergencyContactPhone: internationalPhoneSchema.optional(),
    emergencyContactRelation: z.string().max(50).optional(),
    bankName: z.string().max(120).optional(),
    bankBranch: z.string().max(120).optional(),
    /** Prefer tokenized/vaulted storage in production; length guard only here. */
    bankAccountNumber: z.string().max(34).optional(),
    taxId: z.string().max(50).optional(),
    socialSecurityNumber: z.string().max(32).optional(),
    profilePhotoUrl: z.string().max(2048).optional(),
    notes: z.string().max(5000).optional(),
    isActive: z.boolean().default(true),
  })
  .superRefine((data, ctx) => {
    if (data.hireDate && data.terminationDate && data.hireDate > data.terminationDate) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Hire date cannot be after termination date",
        path: ["hireDate"],
      });
    }
    if (data.hireDate && data.confirmationDate && data.hireDate > data.confirmationDate) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Hire date cannot be after confirmation date",
        path: ["hireDate"],
      });
    }
    if (
      data.departureDate &&
      data.terminationDate &&
      data.departureDate < data.terminationDate
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "departureDate cannot be before terminationDate",
        path: ["departureDate"],
      });
    }
    const terminal = data.employmentStatus === "terminated" || data.employmentStatus === "retired";
    if (terminal && data.terminationDate == null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "terminationDate is required when employmentStatus is terminated or retired",
        path: ["terminationDate"],
      });
    }
  });

export const insertCostCenterSchema = z.object({
  id: CostCenterIdSchema.optional(),
  tenantId: hrTenantIdSchema,
  costCenterCode: z.string().min(2).max(50),
  name: z.string().min(2).max(100),
  description: z.string().max(500).optional(),
  costCenterType: CostCenterTypeSchema,
  parentCostCenterId: CostCenterIdSchema.optional(),
  managerId: EmployeeIdSchema.optional(),
  isActive: z.boolean().default(true),
  closedDate: z.iso.date().optional(),
});
