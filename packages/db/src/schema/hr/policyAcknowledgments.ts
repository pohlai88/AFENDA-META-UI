// ============================================================================
// HR DOMAIN: POLICY DOCUMENTS & ACKNOWLEDGMENTS (Upgrade — P0 guide closure)
// Tenant-scoped handbook / compliance policies and employee attestation rows.
// Tables: hr_policy_documents, employee_policy_acknowledgments
//
// Inactive policies require an end date; `version_number` orders versions; acknowledgments carry
// compliance metadata, optional revocation, and digital-signature URL when method requires it.
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
    /** Monotonic per `policy_code` for sort/compare (alongside human `version_label`). */
    versionNumber: integer("version_number").notNull().default(1),
    /** Primary document locale (BCP 47 style, e.g. en, en-US). */
    languageCode: text("language_code"),
    effectiveFrom: date("effective_from", { mode: "string" }).notNull(),
    effectiveTo: date("effective_to", { mode: "string" }),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    retiredAt: timestamp("retired_at", { withTimezone: true }),
    requiresAcknowledgment: boolean("requires_acknowledgment").notNull().default(true),
    isActive: boolean("is_active").notNull().default(true),
    ...timestampColumns,
    ...auditColumns,
    ...softDeleteColumns,
  },
  (table) => [
    foreignKey({ columns: [table.tenantId], foreignColumns: [tenants.tenantId] }),
    uniqueIndex("hr_policy_documents_tenant_code_version_label_unique")
      .on(table.tenantId, table.policyCode, table.versionLabel)
      .where(sql`${table.deletedAt} IS NULL`),
    uniqueIndex("hr_policy_documents_tenant_code_version_number_unique")
      .on(table.tenantId, table.policyCode, table.versionNumber)
      .where(sql`${table.deletedAt} IS NULL`),
    index("hr_policy_documents_tenant_idx").on(table.tenantId),
    index("hr_policy_documents_category_idx").on(table.tenantId, table.category),
    index("hr_policy_documents_active_idx").on(table.tenantId, table.isActive),
    index("hr_policy_documents_language_idx").on(table.tenantId, table.languageCode),
    check(
      "hr_policy_documents_effective_range",
      sql`${table.effectiveTo} IS NULL OR ${table.effectiveTo} >= ${table.effectiveFrom}`
    ),
    check(
      "hr_policy_documents_inactive_requires_effective_to",
      sql`${table.isActive} = true OR ${table.effectiveTo} IS NOT NULL`
    ),
    check(
      "hr_policy_documents_version_number_positive",
      sql`${table.versionNumber} >= 1`
    ),
    check(
      "hr_policy_documents_name_max_len",
      sql`char_length(${table.name}) <= 200`
    ),
    check(
      "hr_policy_documents_description_max_len",
      sql`${table.description} IS NULL OR char_length(${table.description}) <= 2000`
    ),
    check(
      "hr_policy_documents_policy_code_max_len",
      sql`char_length(${table.policyCode}) <= 80`
    ),
    check(
      "hr_policy_documents_version_label_max_len",
      sql`char_length(${table.versionLabel}) <= 64`
    ),
    check(
      "hr_policy_documents_document_url_max_len",
      sql`char_length(${table.documentUrl}) <= 2048`
    ),
    check(
      "hr_policy_documents_language_code_max_len",
      sql`${table.languageCode} IS NULL OR char_length(${table.languageCode}) <= 32`
    ),
    check(
      "hr_policy_documents_retired_when_inactive",
      sql`${table.retiredAt} IS NULL OR ${table.isActive} = false`
    ),
    check(
      "hr_policy_documents_retired_after_published",
      sql`${table.publishedAt} IS NULL OR ${table.retiredAt} IS NULL OR ${table.retiredAt} >= ${table.publishedAt}`
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
    /** Always set on insert (DB default); omit on insert to use server time. */
    acknowledgedAt: timestamp("acknowledged_at", { withTimezone: true }).notNull().defaultNow(),
    signatureDocumentUrl: text("signature_document_url"),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    notes: text("notes"),
    /** When attestation was invalidated (e.g. policy superseded or withdrawn). */
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
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
    index("employee_policy_ack_revoked_idx").on(table.tenantId, table.revokedAt),
    check(
      "employee_policy_ack_digital_signature_requires_url",
      sql`${table.acknowledgmentMethod} <> 'digital_signature'::hr.policy_acknowledgment_method OR ${table.signatureDocumentUrl} IS NOT NULL`
    ),
    check(
      "employee_policy_ack_notes_max_len",
      sql`${table.notes} IS NULL OR char_length(${table.notes}) <= 2000`
    ),
    check(
      "employee_policy_ack_user_agent_max_len",
      sql`${table.userAgent} IS NULL OR char_length(${table.userAgent}) <= 512`
    ),
    check(
      "employee_policy_ack_ip_max_len",
      sql`${table.ipAddress} IS NULL OR char_length(${table.ipAddress}) <= 45`
    ),
    check(
      "employee_policy_ack_signature_url_max_len",
      sql`${table.signatureDocumentUrl} IS NULL OR char_length(${table.signatureDocumentUrl}) <= 2048`
    ),
    check(
      "employee_policy_ack_policy_version_at_ack_max_len",
      sql`char_length(${table.policyVersionAtAck}) <= 64`
    ),
    check(
      "employee_policy_ack_revoked_on_or_after_ack",
      sql`${table.revokedAt} IS NULL OR ${table.revokedAt} >= ${table.acknowledgedAt}`
    ),
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
    versionNumber: z.number().int().min(1).default(1),
    languageCode: z.string().min(2).max(32).optional(),
    effectiveFrom: z.iso.date(),
    effectiveTo: z.iso.date().optional(),
    publishedAt: z.iso.datetime().optional(),
    retiredAt: z.iso.datetime().optional(),
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
    if (data.isActive === false && data.effectiveTo == null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "effectiveTo is required when isActive is false",
        path: ["effectiveTo"],
      });
    }
    if (data.retiredAt != null && data.isActive === true) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "retiredAt is only allowed when isActive is false",
        path: ["retiredAt"],
      });
    }
    if (data.publishedAt != null && data.retiredAt != null) {
      const p = Date.parse(data.publishedAt);
      const r = Date.parse(data.retiredAt);
      if (Number.isFinite(p) && Number.isFinite(r) && r < p) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "retiredAt must be on or after publishedAt",
          path: ["retiredAt"],
        });
      }
    }
  });

export const insertEmployeePolicyAcknowledgmentSchema = z
  .object({
    id: EmployeePolicyAcknowledgmentIdSchema.optional(),
    tenantId: hrTenantIdSchema,
    employeeId: EmployeeIdSchema,
    policyDocumentId: HrPolicyDocumentIdSchema,
    policyVersionAtAck: z.string().min(1).max(64),
    acknowledgmentMethod: PolicyAcknowledgmentMethodSchema,
    acknowledgedAt: z.iso.datetime().optional(),
    signatureDocumentUrl: z.string().url().max(2048).optional(),
    ipAddress: z.string().max(45).optional(),
    userAgent: z.string().max(512).optional(),
    notes: z.string().max(2000).optional(),
    revokedAt: z.iso.datetime().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.acknowledgmentMethod === "digital_signature" && data.signatureDocumentUrl == null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "signatureDocumentUrl is required when acknowledgmentMethod is digital_signature",
        path: ["signatureDocumentUrl"],
      });
    }
    if (data.revokedAt != null && data.acknowledgedAt != null) {
      const a = Date.parse(data.acknowledgedAt);
      const r = Date.parse(data.revokedAt);
      if (Number.isFinite(a) && Number.isFinite(r) && r < a) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "revokedAt must be on or after acknowledgedAt",
          path: ["revokedAt"],
        });
      }
    }
  });
