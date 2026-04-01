export type SalesRelationDefinition = {
  from: string;
  to: string;
  kind: "one-to-many" | "many-to-one" | "self-reference";
  fromField: string;
  toField: string;
};

export const salesRelations = {
  partnerHierarchy: {
    from: "partners",
    to: "partners",
    kind: "self-reference",
    fromField: "parent_id",
    toField: "id",
  },
  partnerToSalesOrders: {
    from: "partners",
    to: "sales_orders",
    kind: "one-to-many",
    fromField: "id",
    toField: "partner_id",
  },
  productCategoryParent: {
    from: "product_categories",
    to: "product_categories",
    kind: "self-reference",
    fromField: "parent_id",
    toField: "id",
  },
  productCategoryToProducts: {
    from: "product_categories",
    to: "products",
    kind: "one-to-many",
    fromField: "id",
    toField: "category_id",
  },
  salesOrderToLines: {
    from: "sales_orders",
    to: "sales_order_lines",
    kind: "one-to-many",
    fromField: "id",
    toField: "order_id",
  },
  salesOrderToStatusHistory: {
    from: "sales_orders",
    to: "sale_order_status_history",
    kind: "one-to-many",
    fromField: "id",
    toField: "order_id",
  },
  salesOrderToTaxSummary: {
    from: "sales_orders",
    to: "sale_order_tax_summary",
    kind: "one-to-many",
    fromField: "id",
    toField: "order_id",
  },
  salesOrderToOptionLines: {
    from: "sales_orders",
    to: "sale_order_option_lines",
    kind: "one-to-many",
    fromField: "id",
    toField: "order_id",
  },
  pricelistToSalesOrdersAsSnapshot: {
    from: "pricelists",
    to: "sales_orders",
    kind: "one-to-many",
    fromField: "id",
    toField: "pricelist_snapshot_id",
  },
  partnerAddressToSalesOrdersAsInvoice: {
    from: "partner_addresses",
    to: "sales_orders",
    kind: "one-to-many",
    fromField: "id",
    toField: "invoice_address_id",
  },
  partnerAddressToSalesOrdersAsDelivery: {
    from: "partner_addresses",
    to: "sales_orders",
    kind: "one-to-many",
    fromField: "id",
    toField: "delivery_address_id",
  },
  productToSalesOrderLines: {
    from: "products",
    to: "sales_order_lines",
    kind: "one-to-many",
    fromField: "id",
    toField: "product_id",
  },
  productTemplateToSalesOrderLines: {
    from: "product_templates",
    to: "sales_order_lines",
    kind: "one-to-many",
    fromField: "id",
    toField: "product_template_id",
  },
  productToSaleOrderOptionLines: {
    from: "products",
    to: "sale_order_option_lines",
    kind: "one-to-many",
    fromField: "id",
    toField: "product_id",
  },
  partnerToAddresses: {
    from: "partners",
    to: "partner_addresses",
    kind: "one-to-many",
    fromField: "id",
    toField: "partner_id",
  },
  partnerToBankAccounts: {
    from: "partners",
    to: "partner_bank_accounts",
    kind: "one-to-many",
    fromField: "id",
    toField: "partner_id",
  },
  partnerToContactSnapshots: {
    from: "partners",
    to: "partner_contact_snapshots",
    kind: "one-to-many",
    fromField: "id",
    toField: "partner_id",
  },
  partnerToAddressSnapshots: {
    from: "partners",
    to: "partner_address_snapshots",
    kind: "one-to-many",
    fromField: "id",
    toField: "partner_id",
  },
  partnerToEvents: {
    from: "partners",
    to: "partner_events",
    kind: "one-to-many",
    fromField: "id",
    toField: "partner_id",
  },
  partnerEventToTruthBinding: {
    from: "partner_events",
    to: "document_truth_bindings",
    kind: "many-to-one",
    fromField: "truth_binding_id",
    toField: "id",
  },
  partnerToFinancialProjection: {
    from: "partners",
    to: "partner_financial_projections",
    kind: "one-to-many",
    fromField: "id",
    toField: "partner_id",
  },
  partnerToReconciliationLinks: {
    from: "partners",
    to: "partner_reconciliation_links",
    kind: "one-to-many",
    fromField: "id",
    toField: "partner_id",
  },
  paymentTermToLines: {
    from: "payment_terms",
    to: "payment_term_lines",
    kind: "one-to-many",
    fromField: "id",
    toField: "payment_term_id",
  },
  pricelistToItems: {
    from: "pricelists",
    to: "pricelist_items",
    kind: "one-to-many",
    fromField: "id",
    toField: "pricelist_id",
  },
  pricelistBaseToItems: {
    from: "pricelists",
    to: "pricelist_items",
    kind: "one-to-many",
    fromField: "id",
    toField: "base_pricelist_id",
  },
  pricelistItemSupersession: {
    from: "pricelist_items",
    to: "pricelist_items",
    kind: "self-reference",
    fromField: "superseded_by",
    toField: "id",
  },
  productToPricelistItems: {
    from: "products",
    to: "pricelist_items",
    kind: "one-to-many",
    fromField: "id",
    toField: "product_id",
  },
  categoryToPricelistItems: {
    from: "product_categories",
    to: "pricelist_items",
    kind: "one-to-many",
    fromField: "id",
    toField: "categ_id",
  },
  orderLineToLineTaxes: {
    from: "sales_order_lines",
    to: "sale_order_line_taxes",
    kind: "one-to-many",
    fromField: "id",
    toField: "order_line_id",
  },
  partnerToTagAssignments: {
    from: "partners",
    to: "partner_tag_assignments",
    kind: "one-to-many",
    fromField: "id",
    toField: "partner_id",
  },
  tagToTagAssignments: {
    from: "partner_tags",
    to: "partner_tag_assignments",
    kind: "one-to-many",
    fromField: "id",
    toField: "tag_id",
  },
  taxGroupToTaxRates: {
    from: "tax_groups",
    to: "tax_rates",
    kind: "one-to-many",
    fromField: "id",
    toField: "tax_group_id",
  },
  taxRateToChildren: {
    from: "tax_rates",
    to: "tax_rate_children",
    kind: "one-to-many",
    fromField: "id",
    toField: "parent_tax_id",
  },
  taxRateToChildrenAsChildTax: {
    from: "tax_rates",
    to: "tax_rate_children",
    kind: "one-to-many",
    fromField: "id",
    toField: "child_tax_id",
  },
  taxRateReplacedBy: {
    from: "tax_rates",
    to: "tax_rates",
    kind: "self-reference",
    fromField: "replaced_by",
    toField: "id",
  },
  taxRateToFiscalPositionTaxMaps: {
    from: "tax_rates",
    to: "fiscal_position_tax_maps",
    kind: "one-to-many",
    fromField: "id",
    toField: "tax_src_id",
  },
  taxRateToFiscalPositionTaxMapsAsDest: {
    from: "tax_rates",
    to: "fiscal_position_tax_maps",
    kind: "one-to-many",
    fromField: "id",
    toField: "tax_dest_id",
  },
  taxRateToSaleOrderLineTaxes: {
    from: "tax_rates",
    to: "sale_order_line_taxes",
    kind: "one-to-many",
    fromField: "id",
    toField: "tax_id",
  },
  taxRateToSaleOrderTaxSummary: {
    from: "tax_rates",
    to: "sale_order_tax_summary",
    kind: "one-to-many",
    fromField: "id",
    toField: "tax_id",
  },
  taxGroupToSaleOrderTaxSummary: {
    from: "tax_groups",
    to: "sale_order_tax_summary",
    kind: "one-to-many",
    fromField: "id",
    toField: "tax_group_id",
  },
  fiscalPositionToTaxMaps: {
    from: "fiscal_positions",
    to: "fiscal_position_tax_maps",
    kind: "one-to-many",
    fromField: "id",
    toField: "fiscal_position_id",
  },
  fiscalPositionToAccountMaps: {
    from: "fiscal_positions",
    to: "fiscal_position_account_maps",
    kind: "one-to-many",
    fromField: "id",
    toField: "fiscal_position_id",
  },
  fiscalPositionToStates: {
    from: "fiscal_positions",
    to: "fiscal_position_states",
    kind: "one-to-many",
    fromField: "id",
    toField: "fiscal_position_id",
  },
  fiscalPositionToTaxResolutions: {
    from: "fiscal_positions",
    to: "tax_resolutions",
    kind: "one-to-many",
    fromField: "id",
    toField: "fiscal_position_id",
  },
  partnerToConsignmentAgreements: {
    from: "partners",
    to: "consignment_agreements",
    kind: "one-to-many",
    fromField: "id",
    toField: "partner_id",
  },
  paymentTermToConsignmentAgreements: {
    from: "payment_terms",
    to: "consignment_agreements",
    kind: "one-to-many",
    fromField: "id",
    toField: "payment_term_id",
  },
  consignmentAgreementToLines: {
    from: "consignment_agreements",
    to: "consignment_agreement_lines",
    kind: "one-to-many",
    fromField: "id",
    toField: "agreement_id",
  },
  consignmentAgreementToStockReports: {
    from: "consignment_agreements",
    to: "consignment_stock_reports",
    kind: "one-to-many",
    fromField: "id",
    toField: "agreement_id",
  },
  productToConsignmentAgreementLines: {
    from: "products",
    to: "consignment_agreement_lines",
    kind: "one-to-many",
    fromField: "id",
    toField: "product_id",
  },
  consignmentStockReportToLines: {
    from: "consignment_stock_reports",
    to: "consignment_stock_report_lines",
    kind: "one-to-many",
    fromField: "id",
    toField: "report_id",
  },
  productToConsignmentStockReportLines: {
    from: "products",
    to: "consignment_stock_report_lines",
    kind: "one-to-many",
    fromField: "id",
    toField: "product_id",
  },
  returnReasonCodeToReturnOrders: {
    from: "return_reason_codes",
    to: "return_orders",
    kind: "one-to-many",
    fromField: "id",
    toField: "reason_code_id",
  },
  partnerToReturnOrders: {
    from: "partners",
    to: "return_orders",
    kind: "one-to-many",
    fromField: "id",
    toField: "partner_id",
  },
  salesOrderToReturnOrders: {
    from: "sales_orders",
    to: "return_orders",
    kind: "one-to-many",
    fromField: "id",
    toField: "source_order_id",
  },
  returnOrderToLines: {
    from: "return_orders",
    to: "return_order_lines",
    kind: "one-to-many",
    fromField: "id",
    toField: "return_order_id",
  },
  salesOrderLineToReturnLines: {
    from: "sales_order_lines",
    to: "return_order_lines",
    kind: "one-to-many",
    fromField: "id",
    toField: "source_line_id",
  },
  productToReturnOrderLines: {
    from: "products",
    to: "return_order_lines",
    kind: "one-to-many",
    fromField: "id",
    toField: "product_id",
  },
  returnOrderLineToSourcePriceResolution: {
    from: "return_order_lines",
    to: "sales_order_price_resolutions",
    kind: "many-to-one",
    fromField: "source_price_resolution_id",
    toField: "id",
  },
  truthBindingToReturnOrders: {
    from: "document_truth_bindings",
    to: "return_orders",
    kind: "one-to-many",
    fromField: "id",
    toField: "truth_binding_id",
  },
  paymentTermToSubscriptionTemplates: {
    from: "payment_terms",
    to: "subscription_templates",
    kind: "one-to-many",
    fromField: "id",
    toField: "payment_term_id",
  },
  pricelistToSubscriptionTemplates: {
    from: "pricelists",
    to: "subscription_templates",
    kind: "one-to-many",
    fromField: "id",
    toField: "pricelist_id",
  },
  subscriptionStatusToSubscriptions: {
    from: "subscription_statuses",
    to: "subscriptions",
    kind: "one-to-many",
    fromField: "code",
    toField: "status",
  },
  subscriptionTemplateToSubscriptions: {
    from: "subscription_templates",
    to: "subscriptions",
    kind: "one-to-many",
    fromField: "id",
    toField: "template_id",
  },
  subscriptionCloseReasonToSubscriptions: {
    from: "subscription_close_reasons",
    to: "subscriptions",
    kind: "one-to-many",
    fromField: "id",
    toField: "close_reason_id",
  },
  partnerToSubscriptions: {
    from: "partners",
    to: "subscriptions",
    kind: "one-to-many",
    fromField: "id",
    toField: "partner_id",
  },
  subscriptionToLines: {
    from: "subscriptions",
    to: "subscription_lines",
    kind: "one-to-many",
    fromField: "id",
    toField: "subscription_id",
  },
  subscriptionToLogs: {
    from: "subscriptions",
    to: "subscription_logs",
    kind: "one-to-many",
    fromField: "id",
    toField: "subscription_id",
  },
  subscriptionToComplianceAudit: {
    from: "subscriptions",
    to: "subscription_compliance_audit",
    kind: "one-to-many",
    fromField: "id",
    toField: "subscription_id",
  },
  subscriptionToPricingResolutions: {
    from: "subscriptions",
    to: "subscription_pricing_resolutions",
    kind: "one-to-many",
    fromField: "id",
    toField: "subscription_id",
  },
  currencyToSubscriptions: {
    from: "currencies",
    to: "subscriptions",
    kind: "one-to-many",
    fromField: "currency_id",
    toField: "currency_id",
  },
  productToSubscriptionLines: {
    from: "products",
    to: "subscription_lines",
    kind: "one-to-many",
    fromField: "id",
    toField: "product_id",
  },
  uomToSubscriptionLines: {
    from: "units_of_measure",
    to: "subscription_lines",
    kind: "one-to-many",
    fromField: "uom_id",
    toField: "uom_id",
  },
  userToSalesTeams: {
    from: "users",
    to: "sales_teams",
    kind: "one-to-many",
    fromField: "user_id",
    toField: "manager_id",
  },
  salesTeamToMembers: {
    from: "sales_teams",
    to: "sales_team_members",
    kind: "one-to-many",
    fromField: "id",
    toField: "team_id",
  },
  userToSalesTeamMembers: {
    from: "users",
    to: "sales_team_members",
    kind: "one-to-many",
    fromField: "user_id",
    toField: "user_id",
  },
  salesTeamToTerritories: {
    from: "sales_teams",
    to: "territories",
    kind: "one-to-many",
    fromField: "id",
    toField: "team_id",
  },
  territoryHierarchy: {
    from: "territories",
    to: "territories",
    kind: "self-reference",
    fromField: "parent_id",
    toField: "id",
  },
  userToTerritories: {
    from: "users",
    to: "territories",
    kind: "one-to-many",
    fromField: "user_id",
    toField: "default_salesperson_id",
  },
  territoryToRules: {
    from: "territories",
    to: "territory_rules",
    kind: "one-to-many",
    fromField: "id",
    toField: "territory_id",
  },
  territoryToResolutions: {
    from: "territories",
    to: "territory_resolutions",
    kind: "one-to-many",
    fromField: "id",
    toField: "resolved_territory_id",
  },
  territoryRuleToResolutions: {
    from: "territory_rules",
    to: "territory_resolutions",
    kind: "one-to-many",
    fromField: "id",
    toField: "matched_rule_id",
  },
  commissionPlanToTiers: {
    from: "commission_plans",
    to: "commission_plan_tiers",
    kind: "one-to-many",
    fromField: "id",
    toField: "plan_id",
  },
  commissionPlanToEntries: {
    from: "commission_plans",
    to: "commission_entries",
    kind: "one-to-many",
    fromField: "id",
    toField: "plan_id",
  },
  accountingPostingReversalEntry: {
    from: "accounting_postings",
    to: "accounting_postings",
    kind: "self-reference",
    fromField: "reversal_entry_id",
    toField: "id",
  },
  domainEventLogCausality: {
    from: "domain_event_logs",
    to: "domain_event_logs",
    kind: "self-reference",
    fromField: "caused_by_event_id",
    toField: "id",
  },
  documentTruthLinkToTruthBindings: {
    from: "sales_order_document_truth_links",
    to: "document_truth_bindings",
    kind: "one-to-many",
    fromField: "id",
    toField: "price_truth_link_id",
  },
  documentTruthBindingSupersession: {
    from: "document_truth_bindings",
    to: "document_truth_bindings",
    kind: "self-reference",
    fromField: "supersedes_binding_id",
    toField: "id",
  },
  documentTruthBindingToAccountingPostings: {
    from: "document_truth_bindings",
    to: "accounting_postings",
    kind: "one-to-many",
    fromField: "id",
    toField: "truth_binding_id",
  },
  truthDecisionLockToTruthBinding: {
    from: "truth_decision_locks",
    to: "document_truth_bindings",
    kind: "many-to-one",
    fromField: "truth_binding_id",
    toField: "id",
  },
  documentTruthBindingToCommissionEntries: {
    from: "document_truth_bindings",
    to: "commission_entries",
    kind: "one-to-many",
    fromField: "id",
    toField: "truth_binding_id",
  },
  documentTruthBindingToAttachments: {
    from: "document_truth_bindings",
    to: "document_attachments",
    kind: "one-to-many",
    fromField: "id",
    toField: "truth_binding_id",
  },
  documentTruthBindingToJournalEntries: {
    from: "document_truth_bindings",
    to: "journal_entries",
    kind: "one-to-many",
    fromField: "id",
    toField: "truth_binding_id",
  },
  documentTruthBindingToAccountingDecisions: {
    from: "document_truth_bindings",
    to: "accounting_decisions",
    kind: "one-to-many",
    fromField: "id",
    toField: "truth_binding_id",
  },
  accountingDecisionToJournalEntries: {
    from: "accounting_decisions",
    to: "journal_entries",
    kind: "one-to-many",
    fromField: "id",
    toField: "accounting_decision_id",
  },
  glAccountToJournalLines: {
    from: "gl_accounts",
    to: "journal_lines",
    kind: "one-to-many",
    fromField: "id",
    toField: "gl_account_id",
  },
  journalEntryToLines: {
    from: "journal_entries",
    to: "journal_lines",
    kind: "one-to-many",
    fromField: "id",
    toField: "journal_entry_id",
  },
  journalEntryReversal: {
    from: "journal_entries",
    to: "journal_entries",
    kind: "self-reference",
    fromField: "reversal_journal_entry_id",
    toField: "id",
  },
  journalEntryToAccountingPostings: {
    from: "journal_entries",
    to: "accounting_postings",
    kind: "one-to-many",
    fromField: "id",
    toField: "journal_entry_id",
  },
  salesOrderToCommissionEntries: {
    from: "sales_orders",
    to: "commission_entries",
    kind: "one-to-many",
    fromField: "id",
    toField: "order_id",
  },
  salesOrderToPriceResolutions: {
    from: "sales_orders",
    to: "sales_order_price_resolutions",
    kind: "one-to-many",
    fromField: "id",
    toField: "order_id",
  },
  salesOrderLineToPriceResolutions: {
    from: "sales_order_lines",
    to: "sales_order_price_resolutions",
    kind: "one-to-many",
    fromField: "id",
    toField: "line_id",
  },
  salesOrderToDocumentTruthLinks: {
    from: "sales_orders",
    to: "sales_order_document_truth_links",
    kind: "one-to-many",
    fromField: "id",
    toField: "order_id",
  },
  documentTruthLinkToPricingDecision: {
    from: "sales_order_document_truth_links",
    to: "sales_order_pricing_decisions",
    kind: "many-to-one",
    fromField: "pricing_decision_id",
    toField: "id",
  },
  pricingDecisionToPriceResolutions: {
    from: "sales_order_pricing_decisions",
    to: "sales_order_price_resolutions",
    kind: "one-to-many",
    fromField: "id",
    toField: "pricing_decision_id",
  },
  salesOrderToPricingDecisions: {
    from: "sales_orders",
    to: "sales_order_pricing_decisions",
    kind: "one-to-many",
    fromField: "id",
    toField: "order_id",
  },
  pricelistToDocumentTruthLinks: {
    from: "pricelists",
    to: "sales_order_document_truth_links",
    kind: "one-to-many",
    fromField: "id",
    toField: "pricelist_id",
  },
  paymentTermToDocumentTruthLinks: {
    from: "payment_terms",
    to: "sales_order_document_truth_links",
    kind: "one-to-many",
    fromField: "id",
    toField: "payment_term_id",
  },
  priceResolutionToEvents: {
    from: "sales_order_price_resolutions",
    to: "price_resolution_events",
    kind: "one-to-many",
    fromField: "id",
    toField: "resolution_id",
  },
  userToCommissionEntries: {
    from: "users",
    to: "commission_entries",
    kind: "one-to-many",
    fromField: "user_id",
    toField: "salesperson_id",
  },
  commissionEntryToResolutions: {
    from: "commission_entries",
    to: "commission_resolutions",
    kind: "one-to-many",
    fromField: "id",
    toField: "commission_entry_id",
  },
  commissionEntryToLiabilities: {
    from: "commission_entries",
    to: "commission_liabilities",
    kind: "one-to-many",
    fromField: "id",
    toField: "commission_entry_id",
  },
  priceResolutionToCommissionEntries: {
    from: "sales_order_price_resolutions",
    to: "commission_entries",
    kind: "one-to-many",
    fromField: "id",
    toField: "price_resolution_id",
  },
  priceResolutionToCommissionResolutionSources: {
    from: "sales_order_price_resolutions",
    to: "commission_resolutions",
    kind: "one-to-many",
    fromField: "id",
    toField: "source_price_resolution_id",
  },
  commissionPlanTierToCommissionResolutions: {
    from: "commission_plan_tiers",
    to: "commission_resolutions",
    kind: "one-to-many",
    fromField: "id",
    toField: "applied_tier_id",
  },
  paymentTermToCommissionLiabilities: {
    from: "payment_terms",
    to: "commission_liabilities",
    kind: "one-to-many",
    fromField: "id",
    toField: "payment_term_id",
  },
  currencyToCommissionEntries: {
    from: "currencies",
    to: "commission_entries",
    kind: "one-to-many",
    fromField: "currency_id",
    toField: "currency_id",
  },
  // ── Phase 5: Product Configuration ────────────────────────────────────────
  productCategoryToTemplates: {
    from: "product_categories",
    to: "product_templates",
    kind: "one-to-many",
    fromField: "id",
    toField: "category_id",
  },
  productTemplateToVariants: {
    from: "product_templates",
    to: "product_variants",
    kind: "one-to-many",
    fromField: "id",
    toField: "template_id",
  },
  productTemplateToAttributeLines: {
    from: "product_templates",
    to: "product_template_attribute_lines",
    kind: "one-to-many",
    fromField: "id",
    toField: "template_id",
  },
  productAttributeToValues: {
    from: "product_attributes",
    to: "product_attribute_values",
    kind: "one-to-many",
    fromField: "id",
    toField: "attribute_id",
  },
  productAttributeToTemplateLines: {
    from: "product_attributes",
    to: "product_template_attribute_lines",
    kind: "one-to-many",
    fromField: "id",
    toField: "attribute_id",
  },
  templateAttributeLineToValues: {
    from: "product_template_attribute_lines",
    to: "product_template_attribute_values",
    kind: "one-to-many",
    fromField: "id",
    toField: "template_attribute_line_id",
  },
  productAttributeValueToTemplateValues: {
    from: "product_attribute_values",
    to: "product_template_attribute_values",
    kind: "one-to-many",
    fromField: "id",
    toField: "attribute_value_id",
  },
  productVariantToPackaging: {
    from: "product_variants",
    to: "product_packaging",
    kind: "one-to-many",
    fromField: "id",
    toField: "variant_id",
  },
} as const satisfies Record<string, SalesRelationDefinition>;

export type TruthEdgeRole =
  | "ownership"
  | "snapshot"
  | "composition"
  | "derivation"
  | "reference"
  | "supersession";

export type TruthEdgeDirection = "forward" | "reverse" | "bidirectional";

export type TruthEdge = {
  from: string;
  to: string;
  relation: "one-to-many" | "many-to-one" | "self";
  fromField: string;
  toField: string;
  role: TruthEdgeRole;
  direction: TruthEdgeDirection;
  execution?: {
    cascadeDelete?: boolean;
    lockPropagation?: boolean;
    affectsPricing?: boolean;
    affectsAccounting?: boolean;
  };
  constraints?: {
    acyclic?: boolean;
    maxDepth?: number;
  };
};

export type SalesGraphLayer = "truth" | "operational" | "audit";

type TruthEdgeRef = {
  id: string;
  layer: SalesGraphLayer;
  edge: TruthEdge;
};

const relationFromLegacyKind = (
  kind: SalesRelationDefinition["kind"]
): TruthEdge["relation"] => {
  if (kind === "self-reference") {
    return "self";
  }
  return kind;
};

const createTruthEdge = <K extends keyof typeof salesRelations>(
  relationKey: K,
  semantic: Omit<
    TruthEdge,
    "from" | "to" | "relation" | "fromField" | "toField"
  >
): TruthEdge => {
  const relation = salesRelations[relationKey];
  return {
    from: relation.from,
    to: relation.to,
    relation: relationFromLegacyKind(relation.kind),
    fromField: relation.fromField,
    toField: relation.toField,
    ...semantic,
  };
};

export const salesTruthEdges = {
  order_composes_lines: createTruthEdge("salesOrderToLines", {
    role: "composition",
    direction: "forward",
    execution: { cascadeDelete: true, affectsPricing: true },
    constraints: { acyclic: true, maxDepth: 3 },
  }),
  order_composes_option_lines: createTruthEdge("salesOrderToOptionLines", {
    role: "composition",
    direction: "forward",
    execution: { cascadeDelete: true, affectsPricing: true },
    constraints: { acyclic: true, maxDepth: 3 },
  }),
  order_derives_tax_summary: createTruthEdge("salesOrderToTaxSummary", {
    role: "derivation",
    direction: "forward",
    execution: { affectsPricing: true, affectsAccounting: true },
    constraints: { acyclic: true, maxDepth: 2 },
  }),
  order_derives_pricing_decisions: createTruthEdge("salesOrderToPricingDecisions", {
    role: "derivation",
    direction: "forward",
    execution: { affectsPricing: true },
    constraints: { acyclic: true, maxDepth: 2 },
  }),
  pricing_decision_derives_price_resolutions: createTruthEdge(
    "pricingDecisionToPriceResolutions",
    {
      role: "derivation",
      direction: "forward",
      execution: { affectsPricing: true },
      constraints: { acyclic: true, maxDepth: 2 },
    }
  ),
  order_derives_price_resolutions: createTruthEdge("salesOrderToPriceResolutions", {
    role: "derivation",
    direction: "forward",
    execution: { affectsPricing: true },
    constraints: { acyclic: true, maxDepth: 2 },
  }),
  order_snapshots_pricelist: createTruthEdge("pricelistToSalesOrdersAsSnapshot", {
    role: "snapshot",
    direction: "reverse",
    execution: { affectsPricing: true },
  }),
  order_snapshots_invoice_address: createTruthEdge(
    "partnerAddressToSalesOrdersAsInvoice",
    {
      role: "snapshot",
      direction: "reverse",
    }
  ),
  order_snapshots_delivery_address: createTruthEdge(
    "partnerAddressToSalesOrdersAsDelivery",
    {
      role: "snapshot",
      direction: "reverse",
    }
  ),
  order_composes_truth_links: createTruthEdge("salesOrderToDocumentTruthLinks", {
    role: "composition",
    direction: "forward",
    execution: { lockPropagation: true, cascadeDelete: true, affectsPricing: true },
    constraints: { acyclic: true, maxDepth: 3 },
  }),
  truth_link_references_pricing_decision: createTruthEdge(
    "documentTruthLinkToPricingDecision",
    {
      role: "reference",
      direction: "forward",
      execution: { affectsPricing: true },
    }
  ),
  truth_link_owns_truth_bindings: createTruthEdge("documentTruthLinkToTruthBindings", {
    role: "ownership",
    direction: "forward",
    execution: { lockPropagation: true, cascadeDelete: true },
    constraints: { acyclic: true, maxDepth: 2 },
  }),
  truth_binding_supersedes_binding: createTruthEdge(
    "documentTruthBindingSupersession",
    {
      role: "supersession",
      direction: "forward",
      constraints: { acyclic: true, maxDepth: 20 },
    }
  ),
  truth_binding_derives_accounting_postings: createTruthEdge(
    "documentTruthBindingToAccountingPostings",
    {
      role: "derivation",
      direction: "forward",
      execution: { lockPropagation: true, affectsAccounting: true },
      constraints: { acyclic: true, maxDepth: 4 },
    }
  ),
  truth_binding_derives_commission_entries: createTruthEdge(
    "documentTruthBindingToCommissionEntries",
    {
      role: "derivation",
      direction: "forward",
      execution: { lockPropagation: true, affectsAccounting: true },
      constraints: { acyclic: true, maxDepth: 4 },
    }
  ),
  commission_entry_derives_resolutions: createTruthEdge("commissionEntryToResolutions", {
    role: "derivation",
    direction: "forward",
    execution: { affectsAccounting: true },
    constraints: { acyclic: true, maxDepth: 3 },
  }),
  truth_binding_derives_accounting_decisions: createTruthEdge(
    "documentTruthBindingToAccountingDecisions",
    {
      role: "derivation",
      direction: "forward",
      execution: { lockPropagation: true, affectsAccounting: true },
      constraints: { acyclic: true, maxDepth: 4 },
    }
  ),
  accounting_decision_composes_journal_entries: createTruthEdge(
    "accountingDecisionToJournalEntries",
    {
      role: "composition",
      direction: "forward",
      execution: { cascadeDelete: true, affectsAccounting: true },
      constraints: { acyclic: true, maxDepth: 3 },
    }
  ),
  journal_entry_composes_lines: createTruthEdge("journalEntryToLines", {
    role: "composition",
    direction: "forward",
    execution: { cascadeDelete: true, affectsAccounting: true },
    constraints: { acyclic: true, maxDepth: 3 },
  }),
  journal_entry_derives_accounting_postings: createTruthEdge(
    "journalEntryToAccountingPostings",
    {
      role: "derivation",
      direction: "forward",
      execution: { affectsAccounting: true },
      constraints: { acyclic: true, maxDepth: 3 },
    }
  ),
  tax_rate_derives_order_tax_summary: createTruthEdge("taxRateToSaleOrderTaxSummary", {
    role: "derivation",
    direction: "forward",
    execution: { affectsPricing: true, affectsAccounting: true },
    constraints: { acyclic: true, maxDepth: 2 },
  }),
  tax_rate_supersedes_tax_rate: createTruthEdge("taxRateReplacedBy", {
    role: "supersession",
    direction: "forward",
    constraints: { acyclic: true, maxDepth: 20 },
  }),
  subscription_composes_lines: createTruthEdge("subscriptionToLines", {
    role: "composition",
    direction: "forward",
    execution: { cascadeDelete: true, affectsPricing: true },
    constraints: { acyclic: true, maxDepth: 3 },
  }),
  subscription_derives_pricing_resolutions: createTruthEdge("subscriptionToPricingResolutions", {
    role: "derivation",
    direction: "forward",
    execution: { affectsPricing: true },
    constraints: { acyclic: true, maxDepth: 2 },
  }),
  return_order_composes_lines: createTruthEdge("returnOrderToLines", {
    role: "composition",
    direction: "forward",
    execution: { cascadeDelete: true },
    constraints: { acyclic: true, maxDepth: 3 },
  }),
} as const satisfies Record<string, TruthEdge>;

export const salesOperationalEdges = {
  partner_owns_addresses: createTruthEdge("partnerToAddresses", {
    role: "ownership",
    direction: "forward",
    execution: { cascadeDelete: true },
  }),
  partner_owns_bank_accounts: createTruthEdge("partnerToBankAccounts", {
    role: "ownership",
    direction: "forward",
    execution: { cascadeDelete: true },
  }),
  partner_references_orders: createTruthEdge("partnerToSalesOrders", {
    role: "reference",
    direction: "forward",
  }),
  order_tracks_status_history: createTruthEdge("salesOrderToStatusHistory", {
    role: "reference",
    direction: "forward",
  }),
  subscription_tracks_logs: createTruthEdge("subscriptionToLogs", {
    role: "reference",
    direction: "forward",
  }),
  sales_team_composes_members: createTruthEdge("salesTeamToMembers", {
    role: "composition",
    direction: "forward",
    execution: { cascadeDelete: true },
  }),
  territory_hierarchy: createTruthEdge("territoryHierarchy", {
    role: "ownership",
    direction: "bidirectional",
  }),
  commission_entry_derives_liabilities: createTruthEdge("commissionEntryToLiabilities", {
    role: "derivation",
    direction: "forward",
    execution: { affectsAccounting: true },
  }),
} as const satisfies Record<string, TruthEdge>;

export const salesAuditEdges = {
  partner_emits_events: createTruthEdge("partnerToEvents", {
    role: "derivation",
    direction: "forward",
  }),
  partner_event_references_truth_binding: createTruthEdge("partnerEventToTruthBinding", {
    role: "reference",
    direction: "forward",
  }),
  domain_event_causes_domain_event: createTruthEdge("domainEventLogCausality", {
    role: "derivation",
    direction: "forward",
    constraints: { acyclic: true, maxDepth: 100 },
  }),
  price_resolution_emits_events: createTruthEdge("priceResolutionToEvents", {
    role: "derivation",
    direction: "forward",
  }),
  subscription_references_compliance_audit: createTruthEdge(
    "subscriptionToComplianceAudit",
    {
      role: "reference",
      direction: "forward",
    }
  ),
} as const satisfies Record<string, TruthEdge>;

export const salesTruthGraph = {
  truth: salesTruthEdges,
  operational: salesOperationalEdges,
  audit: salesAuditEdges,
} as const;

type RoleFilter = TruthEdgeRole | readonly TruthEdgeRole[];

export type TruthEdgeFilter = {
  layer?: SalesGraphLayer | readonly SalesGraphLayer[];
  from?: string;
  to?: string;
  role?: RoleFilter;
  affectsPricing?: boolean;
  affectsAccounting?: boolean;
  lockPropagation?: boolean;
};

export type ResolveDependenciesOptions = {
  layer?: SalesGraphLayer | readonly SalesGraphLayer[];
  role?: RoleFilter;
  maxDepth?: number;
  includeStart?: boolean;
};

export type GraphTraversalResult = {
  nodes: string[];
  edges: TruthEdgeRef[];
};

const listFromMaybe = <T>(input?: T | readonly T[]): T[] => {
  if (input === undefined) {
    return [];
  }
  return Array.isArray(input) ? [...input] : [input as T];
};

const asRoleSet = (role?: RoleFilter): Set<TruthEdgeRole> | undefined => {
  if (!role) {
    return undefined;
  }
  return new Set(listFromMaybe(role));
};

const asLayerSet = (
  layer?: SalesGraphLayer | readonly SalesGraphLayer[]
): Set<SalesGraphLayer> => {
  const requested = listFromMaybe(layer);
  if (requested.length === 0) {
    return new Set<SalesGraphLayer>(["truth", "operational", "audit"]);
  }
  return new Set(requested);
};

const directionNextNode = (node: string, edge: TruthEdge): string | undefined => {
  if (edge.direction === "forward") {
    return edge.from === node ? edge.to : undefined;
  }
  if (edge.direction === "reverse") {
    return edge.to === node ? edge.from : undefined;
  }
  if (edge.from === node) {
    return edge.to;
  }
  if (edge.to === node) {
    return edge.from;
  }
  return undefined;
};

const isEdgeInFilter = (ref: TruthEdgeRef, filter?: TruthEdgeFilter): boolean => {
  if (!filter) {
    return true;
  }
  const layerSet = asLayerSet(filter.layer);
  if (!layerSet.has(ref.layer)) {
    return false;
  }
  if (filter.from && filter.from !== ref.edge.from) {
    return false;
  }
  if (filter.to && filter.to !== ref.edge.to) {
    return false;
  }
  const roleSet = asRoleSet(filter.role);
  if (roleSet && !roleSet.has(ref.edge.role)) {
    return false;
  }
  if (
    filter.affectsPricing !== undefined &&
    (ref.edge.execution?.affectsPricing ?? false) !== filter.affectsPricing
  ) {
    return false;
  }
  if (
    filter.affectsAccounting !== undefined &&
    (ref.edge.execution?.affectsAccounting ?? false) !== filter.affectsAccounting
  ) {
    return false;
  }
  if (
    filter.lockPropagation !== undefined &&
    (ref.edge.execution?.lockPropagation ?? false) !== filter.lockPropagation
  ) {
    return false;
  }
  return true;
};

const collectLayerEdges = (
  graph = salesTruthGraph,
  layer?: SalesGraphLayer | readonly SalesGraphLayer[]
): TruthEdgeRef[] => {
  const layerSet = asLayerSet(layer);
  const refs: TruthEdgeRef[] = [];
  const orderedLayers: readonly SalesGraphLayer[] = ["truth", "operational", "audit"];

  for (const layerName of orderedLayers) {
    if (!layerSet.has(layerName)) {
      continue;
    }
    const edges = graph[layerName];
    for (const id of Object.keys(edges).sort()) {
      refs.push({
        id,
        layer: layerName,
        edge: edges[id as keyof typeof edges],
      });
    }
  }
  return refs;
};

export class SalesTruthGraphEngine {
  constructor(private readonly graph = salesTruthGraph) {}

  findEdges(filter?: TruthEdgeFilter): TruthEdgeRef[] {
    return collectLayerEdges(this.graph, filter?.layer).filter((ref) => isEdgeInFilter(ref, filter));
  }

  resolveDependencies(
    startTable: string,
    options?: ResolveDependenciesOptions
  ): GraphTraversalResult {
    return this.traverse(startTable, {
      layer: options?.layer,
      role: options?.role,
      maxDepth: options?.maxDepth,
      includeStart: options?.includeStart ?? false,
    });
  }

  whatBreaksIf(startTable: string): GraphTraversalResult {
    return this.traverse(startTable, {
      layer: "truth",
      role: ["composition", "derivation", "supersession"],
      includeStart: false,
    });
  }

  propagateLock(startTable: string): GraphTraversalResult {
    return this.traverse(startTable, {
      layer: "truth",
      includeStart: false,
      edgeFilter: (ref) => ref.edge.execution?.lockPropagation === true,
    });
  }

  replay(startTable: string): GraphTraversalResult {
    return this.traverse(startTable, {
      layer: "truth",
      role: "derivation",
      includeStart: true,
    });
  }

  validateGraph(layer: SalesGraphLayer = "truth"): { isValid: boolean; cycles: string[][] } {
    const edges = this.findEdges({ layer }).filter((ref) => ref.edge.constraints?.acyclic === true);
    const adjacency = new Map<string, string[]>();
    for (const ref of edges) {
      const from = ref.edge.from;
      if (ref.edge.relation === "self" && ref.edge.from === ref.edge.to) {
        continue;
      }
      const to = directionNextNode(from, ref.edge);
      if (!to) {
        continue;
      }
      const neighbors = adjacency.get(from) ?? [];
      neighbors.push(to);
      adjacency.set(from, neighbors);
    }
    for (const neighbors of adjacency.values()) {
      neighbors.sort();
    }

    const permanent = new Set<string>();
    const temporary = new Set<string>();
    const stack: string[] = [];
    const cycles: string[][] = [];

    const visit = (node: string): void => {
      if (permanent.has(node)) {
        return;
      }
      if (temporary.has(node)) {
        const cycleStart = stack.indexOf(node);
        cycles.push(stack.slice(cycleStart).concat(node));
        return;
      }

      temporary.add(node);
      stack.push(node);
      const neighbors = adjacency.get(node) ?? [];
      for (const neighbor of neighbors) {
        visit(neighbor);
      }
      stack.pop();
      temporary.delete(node);
      permanent.add(node);
    };

    for (const node of [...adjacency.keys()].sort()) {
      visit(node);
    }

    return { isValid: cycles.length === 0, cycles };
  }

  private traverse(
    startTable: string,
    options: ResolveDependenciesOptions & { edgeFilter?: (ref: TruthEdgeRef) => boolean }
  ): GraphTraversalResult {
    const maxDepth = options.maxDepth ?? Number.POSITIVE_INFINITY;
    const roleSet = asRoleSet(options.role);
    const refs = collectLayerEdges(this.graph, options.layer);
    const byNode = new Map<string, TruthEdgeRef[]>();
    for (const ref of refs) {
      const fromList = byNode.get(ref.edge.from) ?? [];
      fromList.push(ref);
      byNode.set(ref.edge.from, fromList);
      if (ref.edge.direction !== "forward") {
        const toList = byNode.get(ref.edge.to) ?? [];
        toList.push(ref);
        byNode.set(ref.edge.to, toList);
      }
    }
    for (const list of byNode.values()) {
      list.sort((a, b) => a.id.localeCompare(b.id));
    }

    const queue: Array<{ node: string; depth: number }> = [{ node: startTable, depth: 0 }];
    const visitedNodes = new Set<string>([startTable]);
    const visitedEdges = new Set<string>();
    const resultNodes = new Set<string>(options.includeStart ? [startTable] : []);
    const resultEdges: TruthEdgeRef[] = [];

    while (queue.length > 0) {
      const current = queue.shift();
      if (!current) {
        break;
      }
      if (current.depth >= maxDepth) {
        continue;
      }

      const candidates = byNode.get(current.node) ?? [];
      for (const ref of candidates) {
        if (roleSet && !roleSet.has(ref.edge.role)) {
          continue;
        }
        if (options.edgeFilter && !options.edgeFilter(ref)) {
          continue;
        }
        const nextNode = directionNextNode(current.node, ref.edge);
        if (!nextNode) {
          continue;
        }
        const edgeVisitKey = `${ref.layer}:${ref.id}:${current.node}->${nextNode}`;
        if (!visitedEdges.has(edgeVisitKey)) {
          visitedEdges.add(edgeVisitKey);
          resultEdges.push(ref);
        }
        if (!visitedNodes.has(nextNode)) {
          visitedNodes.add(nextNode);
          resultNodes.add(nextNode);
          queue.push({ node: nextNode, depth: current.depth + 1 });
        }
      }
    }

    return {
      nodes: [...resultNodes].sort(),
      edges: resultEdges.sort((a, b) => a.id.localeCompare(b.id)),
    };
  }
}

export const salesTruthGraphEngine = new SalesTruthGraphEngine();
