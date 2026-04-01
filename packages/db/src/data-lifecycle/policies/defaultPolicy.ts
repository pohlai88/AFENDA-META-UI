import type { LifecyclePolicy } from "./types.js";
import { LifecyclePolicySchema } from "./schema.js";

const salesDefaultLifecyclePolicy: LifecyclePolicy = {
  id: "sales-default",
  description: "Default lifecycle policy for sales workloads.",
  partitionTargets: [
    {
      schemaName: "sales",
      parentTable: "sales_orders",
      partitionColumn: "order_date",
      yearsAhead: 2,
    },
  ],
  retentionRules: [
    {
      id: "sales-orders-legal-retention",
      type: "archive-and-soft-delete",
      sourceSchema: "sales",
      sourceTable: "sales_orders",
      archiveSchema: "archive",
      archiveTable: "sales_orders",
      tenantColumn: "tenant_id",
      dateColumn: "order_date",
      retentionYears: 7,
      softDeleteColumn: "deleted_at",
      updatedAtColumn: "updated_at",
      updatedByColumn: "updated_by",
      dedupeKeyColumn: "id",
    },
    {
      id: "approval-logs-purge",
      type: "purge",
      schemaName: "reference",
      tableName: "approval_logs",
      tenantColumn: "tenant_id",
      dateColumn: "created_at",
      retentionYears: 7,
    },
    {
      id: "document-attachments-purge",
      type: "purge",
      schemaName: "reference",
      tableName: "document_attachments",
      tenantColumn: "tenant_id",
      dateColumn: "created_at",
      retentionYears: 2,
    },
  ],
  functions: {
    promoteToWarm: "sales.promote_to_warm_storage",
    identifyColdCandidates: "archive.identify_cold_candidates",
    checkLifecycleHealth: "sales.check_archive_health",
    listWarmInventory: "archive.list_warm_storage_inventory",
    coldCatalogTable: "cold_storage.r2_archive_catalog",
  },
  sloGates: {
    maxPartitionActionsPerRun: 200,
    maxRetentionActionsPerRun: 300,
    maxArchiveFailures: 2,
    maxArchiveFailureRatePct: 10,
  },
};

const hrAttendanceLifecyclePolicy: LifecyclePolicy = {
  id: "hr-attendance-default",
  description: "Default lifecycle policy for HR leave and attendance workloads.",
  partitionTargets: [
    {
      schemaName: "hr",
      parentTable: "leave_requests",
      partitionColumn: "requested_date",
      yearsAhead: 2,
    },
  ],
  retentionRules: [
    {
      id: "hr-leave-requests-retention",
      type: "archive-and-soft-delete",
      sourceSchema: "hr",
      sourceTable: "leave_requests",
      archiveSchema: "archive",
      archiveTable: "leave_requests",
      tenantColumn: "tenant_id",
      dateColumn: "requested_date",
      retentionYears: 5,
      softDeleteColumn: "deleted_at",
      updatedAtColumn: "updated_at",
      updatedByColumn: "updated_by",
      dedupeKeyColumn: "id",
    },
    {
      id: "hr-attendance-records-purge",
      type: "purge",
      schemaName: "hr",
      tableName: "attendance_records",
      tenantColumn: "tenant_id",
      dateColumn: "attendance_date",
      retentionYears: 3,
    },
  ],
  functions: {
    identifyColdCandidates: "archive.identify_cold_candidates",
    coldCatalogTable: "cold_storage.r2_archive_catalog",
  },
  sloGates: {
    maxPartitionActionsPerRun: 120,
    maxRetentionActionsPerRun: 250,
    maxArchiveFailures: 1,
    maxArchiveFailureRatePct: 5,
  },
};

const financeAccountingLifecyclePolicy: LifecyclePolicy = {
  id: "finance-accounting-default",
  description: "Default lifecycle policy for finance/accounting operational data.",
  partitionTargets: [
    {
      schemaName: "sales",
      parentTable: "accounting_postings",
      partitionColumn: "posting_date",
      yearsAhead: 2,
    },
  ],
  retentionRules: [
    {
      id: "finance-accounting-postings-purge",
      type: "purge",
      schemaName: "sales",
      tableName: "accounting_postings",
      tenantColumn: "tenant_id",
      dateColumn: "posting_date",
      retentionYears: 10,
    },
    {
      id: "finance-domain-events-purge",
      type: "purge",
      schemaName: "sales",
      tableName: "domain_event_logs",
      tenantColumn: "tenant_id",
      dateColumn: "created_at",
      retentionYears: 7,
    },
  ],
  functions: {
    identifyColdCandidates: "archive.identify_cold_candidates",
    coldCatalogTable: "cold_storage.r2_archive_catalog",
  },
  sloGates: {
    maxPartitionActionsPerRun: 120,
    maxRetentionActionsPerRun: 250,
    maxArchiveFailures: 1,
    maxArchiveFailureRatePct: 5,
  },
};

const validatedPolicies = [
  LifecyclePolicySchema.parse(salesDefaultLifecyclePolicy),
  LifecyclePolicySchema.parse(hrAttendanceLifecyclePolicy),
  LifecyclePolicySchema.parse(financeAccountingLifecyclePolicy),
];

const lifecyclePolicyRegistry = new Map<string, LifecyclePolicy>([
  [validatedPolicies[0].id, validatedPolicies[0]],
  [validatedPolicies[1].id, validatedPolicies[1]],
  [validatedPolicies[2].id, validatedPolicies[2]],
]);

export function listLifecyclePolicyIds(): string[] {
  return [...lifecyclePolicyRegistry.keys()];
}

export function resolveLifecyclePolicy(policyId?: string): LifecyclePolicy {
  const targetId = policyId || salesDefaultLifecyclePolicy.id;
  const policy = lifecyclePolicyRegistry.get(targetId);
  if (policy) {
    return policy;
  }

  throw new Error(
    `Unsupported lifecycle policy: ${policyId}. Supported policies: ${listLifecyclePolicyIds().join(", ")}`
  );
}
