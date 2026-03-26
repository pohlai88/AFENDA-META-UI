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
} from "@afenda/db/schema-meta";

// Sales domain tables (from shared @afenda/db package)
export {
  commissionEntries,
  commissionPlans,
  commissionPlanTiers,
  consignmentAgreementLines,
  consignmentAgreements,
  consignmentStockReportLines,
  consignmentStockReports,
  domainEventLogs,
  domainInvariantLogs,
  orderStatusEnum,
  partnerTypeEnum,
  partners,
  productCategories,
  products,
  returnOrderLines,
  returnOrders,
  returnReasonCodes,
  salesTeamMembers,
  salesTeams,
  salesOrders,
  salesOrderLines,
  subscriptionLines,
  subscriptions,
  territories,
  territoryRules,
} from "@afenda/db/schema-domain";

// Phase 4: Tenant persistence tables
export {
  isolationStrategyEnum,
  overrideScopeEnum,
  tenantDefinitions,
  metadataOverrides,
  industryTemplates,
} from "@afenda/db/schema-meta";

// Phase 4: Decision audit persistence tables
export {
  decisionEventTypeEnum,
  decisionStatusEnum,
  decisionAuditEntries,
  decisionAuditChains,
} from "@afenda/db/schema-meta";
