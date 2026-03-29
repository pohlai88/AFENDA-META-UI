// ============================================================================
// HR DOMAIN: POLICY DOCUMENTS & ACKNOWLEDGMENTS (Upgrade — P0 guide closure)
// Tenant-scoped handbook / compliance policies and employee attestation rows.
// Tables: hr_policy_documents, employee_policy_acknowledgments
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
  timestamp,
  uuid,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { z } from "zod/v4";

import { tenantIsolationPolicies, serviceBypassPolicy } from "../../rls/index.js";
import {
  auditColumns,
  nameColumn,
  softDeleteColumns,
  timestampColumns,
} from "../../columns/index.js";
import { tenants } from "../core/tenants.js";
import { hrSchema } from "./_schema.js";
import {
  policyDocumentCategoryEnum,
  policyAcknowledgmentMethodEnum,
  PolicyDocumentCategorySchema,
  PolicyAcknowledgmentMethodSchema,
} from "./_enums.js";
import { employees } from "./people.js";
import {
  EmployeeIdSchema,
  HrPolicyDocumentIdSchema,
  EmployeePolicyAcknowledgmentIdSchema,
  hrTenantIdSchema,
} from "./_zodShared.js";

// ============================================================================
// HR POLICY DOCUMENTS
// ============================================================================

export const hrPolicyDocuments = hrSchema.table(
  "hr_policy_documents",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: integer("tenant_id").notNull(),
    policyCode: text("policy_code").notNull(),
    ...nameColumn,
    description: text("description"),
    category: policyDocumentCategoryEnum("category").notNull(),
    documentUrl: text("document_url").notNull(),
    versionLabel: text("version_label").notNull(),
    effectiveFrom: date("effective_from", { mode: "string" }).notNull(),
    effectiveTo: date("effective_to", { mode: "string" }),
    requiresAcknowledgment: boolean("requires_acknowledgment").notNull().default(true),
    isActive: boolean("is_active").notNull().default(true),
    ...timestampColumns,
    ...auditColumns,
    ...softDeleteColumns,
  },
  (table) => [
    foreignKey({ columns: [table.tenantId], foreignColumns: [tenants.tenantId] }),
    uniqueIndex("hr_policy_documents_tenant_code_version_unique")
      .on(table.tenantId, table.policyCode, table.versionLabel)
      .where(sql`${table.deletedAt} IS NULL`),
    index("hr_policy_documents_tenant_idx").on(table.tenantId),
    index("hr_policy_documents_category_idx").on(table.tenantId, table.category),
    index("hr_policy_documents_active_idx").on(table.tenantId, table.isActive),
    check(
      "hr_policy_documents_effective_range",
      sql`${table.effectiveTo} IS NULL OR ${table.effectiveTo} >= ${table.effectiveFrom}`
    ),
    ...tenantIsolationPolicies("hr_policy_documents"),
    serviceBypassPolicy("hr_policy_documents"),
  ]
);

// ============================================================================
// EMPLOYEE POLICY ACKNOWLEDGMENTS
// ============================================================================

export const employeePolicyAcknowledgments = hrSchema.table(
  "employee_policy_acknowledgments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: integer("tenant_id").notNull(),
    employeeId: uuid("employee_id").notNull(),
    policyDocumentId: uuid("policy_document_id").notNull(),
    policyVersionAtAck: text("policy_version_at_ack").notNull(),
    acknowledgmentMethod: policyAcknowledgmentMethodEnum("acknowledgment_method").notNull(),
    acknowledgedAt: timestamp("acknowledged_at", { withTimezone: true }).notNull().defaultNow(),
    signatureDocumentUrl: text("signature_document_url"),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    notes: text("notes"),
    ...timestampColumns,
    ...auditColumns,
  },
  (table) => [
    foreignKey({ columns: [table.tenantId], foreignColumns: [tenants.tenantId] }),
    foreignKey({
      columns: [table.tenantId, table.employeeId],
      foreignColumns: [employees.tenantId, employees.id],
    }),
    foreignKey({
      columns: [table.tenantId, table.policyDocumentId],
      foreignColumns: [hrPolicyDocuments.tenantId, hrPolicyDocuments.id],
    }),
    uniqueIndex("employee_policy_ack_tenant_employee_policy_version_unique").on(
      table.tenantId,
      table.employeeId,
      table.policyDocumentId,
      table.policyVersionAtAck
    ),
    index("employee_policy_ack_tenant_idx").on(table.tenantId),
    index("employee_policy_ack_employee_idx").on(table.tenantId, table.employeeId),
    index("employee_policy_ack_policy_idx").on(table.tenantId, table.policyDocumentId),
    ...tenantIsolationPolicies("employee_policy_acknowledgments"),
    serviceBypassPolicy("employee_policy_acknowledgments"),
  ]
);

// ============================================================================
// ZOD INSERT SCHEMAS
// ============================================================================

export const insertHrPolicyDocumentSchema = z
  .object({
    id: HrPolicyDocumentIdSchema.optional(),
    tenantId: hrTenantIdSchema,
    policyCode: z.string().min(2).max(80),
    name: z.string().min(2).max(200),
    description: z.string().max(2000).optional(),
    category: PolicyDocumentCategorySchema,
    documentUrl: z.string().url().max(2048),
    versionLabel: z.string().min(1).max(64),
    effectiveFrom: z.string().date(),
    effectiveTo: z.string().date().optional(),
    requiresAcknowledgment: z.boolean().default(true),
    isActive: z.boolean().default(true),
  })
  .superRefine((data, ctx) => {
    if (data.effectiveTo && data.effectiveFrom && data.effectiveTo < data.effectiveFrom) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "effectiveTo must be on or after effectiveFrom",
        path: ["effectiveTo"],
      });
    }
  });

export const insertEmployeePolicyAcknowledgmentSchema = z.object({
  id: EmployeePolicyAcknowledgmentIdSchema.optional(),
  tenantId: hrTenantIdSchema,
  employeeId: EmployeeIdSchema,
  policyDocumentId: HrPolicyDocumentIdSchema,
  policyVersionAtAck: z.string().min(1).max(64),
  acknowledgmentMethod: PolicyAcknowledgmentMethodSchema,
  acknowledgedAt: z.coerce.date().optional(),
  signatureDocumentUrl: z.string().url().max(2048).optional(),
  ipAddress: z.string().max(45).optional(),
  userAgent: z.string().max(512).optional(),
  notes: z.string().max(2000).optional(),
});
