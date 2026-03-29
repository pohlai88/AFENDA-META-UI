import { sql } from "drizzle-orm";
import {
  boolean,
  foreignKey,
  index,
  integer,
  numeric,
  text,
  date,
  uuid,
  uniqueIndex,
} from "drizzle-orm/pg-core";

import { tenantIsolationPolicies, serviceBypassPolicy } from "../../rls/index.js";
import {
  auditColumns,
  nameColumn,
  softDeleteColumns,
  timestampColumns,
} from "../../columns/index.js";
import { tenants } from "../core/tenants.js";
import { countries, currencies, states } from "../reference/index.js";
import { users } from "../security/index.js";
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
} from "./_enums.js";

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
    managerId: uuid("manager_id"), // FK deferred — see CIRCULAR_FKS.md CIRC-001
    costCenterId: uuid("cost_center_id"), // FK deferred — see CIRCULAR_FKS.md CIRC-002
    isActive: boolean("is_active").notNull().default(true),
    ...timestampColumns,
    ...auditColumns,
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
    ...auditColumns,
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
    ...auditColumns,
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
    userId: uuid("user_id"),
    firstName: text("first_name").notNull(),
    middleName: text("middle_name"),
    lastName: text("last_name").notNull(),
    email: text("email").notNull(),
    phoneNumber: text("phone_number"),
    mobileNumber: text("mobile_number"),
    dateOfBirth: date("date_of_birth"),
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
    employeeCategory: employeeCategoryEnum("employee_category").notNull(),
    hireDate: date("hire_date").notNull(),
    confirmationDate: date("confirmation_date"),
    terminationDate: date("termination_date"),
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
    ...auditColumns,
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
    index("employees_status_idx").on(table.tenantId, table.employmentStatus),
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
    ...timestampColumns,
    ...auditColumns,
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
    ...tenantIsolationPolicies("cost_centers"),
    serviceBypassPolicy("cost_centers"),
  ]
);
