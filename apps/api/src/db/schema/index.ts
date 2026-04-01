// Central schema barrel — consolidates local legacy tables with shared DB package.

// Local auth tables (simple shape used by API auth middleware)
export * from "./platform.js";

// Meta-engine tables (from shared @afenda/db package)
export {
  schemaRegistry,
  entities,
  fields,
  layouts,
  policies,
  auditLogs,
  events,
  policySeverityEnum,
  auditOperationEnum,
  auditSourceEnum,
  layoutViewTypeEnum,
} from "@afenda/db/schema/meta";

// Sales domain tables (from shared @afenda/db package)
export {
  accountingDecisions,
  accountingPostings,
  commissionEntries,
  commissionPlans,
  commissionPlanTiers,
  consignmentAgreementLines,
  consignmentAgreements,
  consignmentStockReportLines,
  consignmentStockReports,
  documentApprovals,
  documentTruthBindings,
  glAccounts,
  journalEntries,
  journalLines,
  documentStatusHistory,
  domainEventLogs,
  domainInvariantLogs,
  lineItemDiscounts,
  orderStatusEnum,
  partnerAddresses,
  partnerTypeEnum,
  partners,
  pricelists,
  productCategories,
  products,
  roundingPolicies,
  returnOrderLines,
  returnOrders,
  returnReasonCodes,
  salesDocumentAttachments,
  subscriptionCloseReasons,
  salesTeamMembers,
  salesTeams,
  salesOrders,
  salesOrderLines,
  subscriptionLines,
  subscriptionLogs,
  subscriptionPricingResolutions,
  subscriptionTemplates,
  subscriptions,
  territories,
  territoryResolutions,
  territoryRules,
} from "@afenda/db/schema/sales";

// Phase 4: Tenant persistence tables
export {
  isolationStrategyEnum,
  overrideScopeEnum,
  tenantDefinitions,
  metadataOverrides,
  industryTemplates,
} from "@afenda/db/schema/meta";

// Phase 4: Decision audit persistence tables
export {
  decisionEventTypeEnum,
  decisionStatusEnum,
  decisionAuditEntries,
  decisionAuditChains,
} from "@afenda/db/schema/meta";

// Wave 5A: Mutation policy violation observability
export { mutationPolicyViolations } from "@afenda/db/schema/meta";
