import { z } from "zod/v4";

import { salesSchema } from "./_schema.js";

export const orderStatuses = ["draft", "sent", "sale", "done", "cancel"] as const;
export const partnerTypes = ["customer", "vendor", "both"] as const;
/** Identity node kind (distinct from commercial `partner_type`). */
export const partnerEntityTypes = ["company", "branch", "contact"] as const;
export const partnerReconciliationStatuses = ["unmatched", "matched", "disputed", "void"] as const;

/**
 * Strict append-only partner ledger event kinds (`sales.partner_events.event_type`).
 * Payload shape + invariants: `partnerEventCatalog.ts`.
 */
export const partnerEventTypes = [
  "partner_created",
  "partner_activated",
  "partner_deactivated",
  "partner_blocked",
  "partner_unblocked",
  "credit_limit_changed",
  "invoice_posted",
  "invoice_voided",
  "payment_received",
  "payment_applied",
  "credit_note_posted",
  "refund_posted",
  "reconciliation_adjustment",
  "external_sync",
] as const;

/** Sub-ledger direction for projections / GL alignment (`sales.partner_events.accounting_impact`). */
export const partnerEventAccountingImpacts = [
  "none",
  "increase_receivable",
  "decrease_receivable",
  "increase_payable",
  "decrease_payable",
] as const;
export const addressTypes = ["invoice", "delivery", "contact", "other"] as const;
export const taxTypeUses = ["sale", "purchase", "none"] as const;
export const taxAmountTypes = ["percent", "fixed", "group", "code"] as const;
/**
 * Deterministic tax math on a line/base amount (engine contract).
 * - `flat`: tax = base × rate (percent/fixed on current taxable base).
 * - `compound`: tax = (base + Σ prior applied taxes in sequence) × rate.
 * - `included`: tax is embedded in the unit price; extract / back out (must align with `price_include`).
 * - `group`: evaluate ordered `tax_rate_children` only (`amount_type` must be `group`).
 */
export const taxComputationMethods = ["flat", "compound", "included", "group"] as const;
/** Immutable `tax_resolutions` anchor (mirrors `territory_resolutions.subject_type` patterns). */
export const taxResolutionSubjectTypes = [
  "sales_order",
  "sales_order_line",
  "return_order",
  "invoice",
  "credit_note",
  "subscription",
  "manual",
  "replay",
] as const;
/**
 * How `tax_resolutions.fiscal_position_id` was chosen (audit / replay).
 * - `ambiguous`: ≥2 auto_apply positions tied on (specificity, sequence, effective_from); UUID tie-break picked the winner.
 */
export const taxResolutionStrategies = ["priority", "default", "fallback", "ambiguous", "none"] as const;
/** Where rounding is applied for a stored resolution (must match engine + `tax_engine_version`). */
export const taxRoundingMethods = ["per_line", "per_tax", "global"] as const;
export const paymentTermValueTypes = ["balance", "percent", "fixed"] as const;
export const discountPolicies = ["with_discount", "without_discount"] as const;
export const pricelistComputeTypes = ["fixed", "percentage", "formula"] as const;
export const pricelistAppliedOns = [
  "global",
  "product_template",
  "product_variant",
  "product_category",
] as const;
/**
 * Commercial document kinds shared across governance (status/approvals/attachments/GL source),
 * truth bindings, price resolutions, and line-item discounts. Keep in sync with DB enum
 * `sales.sales_truth_document_type`.
 */
export const salesTruthDocumentTypes = [
  "sales_order",
  "return_order",
  "subscription",
  "consignment_stock_report",
  "consignment_agreement",
  "invoice",
  "credit_note",
  "other",
] as const;
/** Append-only lifecycle on `price_resolutions` (`resolved`/`locked` also emitted by DB triggers). */
export const priceResolutionEventTypes = ["resolved", "recomputed", "locked", "overridden"] as const;
export const pricelistBaseTypes = ["list_price", "standard_price", "pricelist"] as const;
export const invoiceStatuses = ["no", "to_invoice", "invoiced"] as const;
export const deliveryStatuses = ["no", "partial", "full"] as const;
export const displayLineTypes = ["line_section", "line_note", "product"] as const;
export const priceSources = ["manual", "pricelist", "override"] as const;
export const discountSources = ["manual", "campaign", "volume", "coupon"] as const;
export const consignmentStatuses = ["draft", "active", "expired", "terminated"] as const;
export const consignmentReportStatuses = ["draft", "confirmed", "invoiced"] as const;
export const consignmentReportPeriods = ["weekly", "monthly", "quarterly"] as const;
export const returnStatuses = [
  "draft",
  "approved",
  "received",
  "inspected",
  "credited",
  "cancelled",
] as const;
export const returnConditions = ["new", "used", "damaged", "defective"] as const;
export const restockPolicies = ["restock", "scrap", "return_to_vendor"] as const;
export const subscriptionBillingPeriods = ["weekly", "monthly", "quarterly", "yearly"] as const;
/** Allowed `subscriptions.status` values; rows live in `sales.subscription_statuses`. */
export const subscriptionStatusCodes = [
  "draft",
  "active",
  "paused",
  "past_due",
  "cancelled",
  "expired",
] as const;
export const subscriptionLogEventTypes = [
  "created",
  "renewed",
  "paused",
  "resumed",
  "plan_changed",
  "price_changed",
  "cancelled",
  "payment_failed",
  "invoice_generated",
] as const;
export const commissionTypes = ["percentage", "tiered", "flat"] as const;
export const commissionBases = ["revenue", "profit", "margin"] as const;
/** How tiered rates combine with the commission base (flat plans ignore this). */
export const commissionCalculationModes = ["flat", "tiered_step", "tiered_cumulative"] as const;
export const commissionEntryStatuses = ["draft", "approved", "paid"] as const;
/** Sub-ledger for earned vs scheduled vs settled commission cash. */
export const commissionLiabilityStatuses = ["accrued", "payable", "paid"] as const;
/** Role within a sales team (distinct from `is_leader`, which marks the single designated leader row). */
export const salesTeamMemberRoles = ["member", "account_executive", "lead", "admin"] as const;

/**
 * How a `territory_rules` row constrains geography.
 * - `wildcard`: null `country_id` / `state_id` / zip bounds mean “any” for that dimension (still subject to DB nullability rules).
 * - `range`: both `zip_from` and `zip_to` required; numeric inclusive range.
 * - `exact`: both zip bounds required and equal (single numeric postal code bucket).
 */
export const territoryRuleMatchTypes = ["wildcard", "range", "exact"] as const;

/** How `territory_resolutions.resolved_territory_id` was chosen (replay / audit). */
export const territoryResolutionStrategies = ["priority", "default", "fallback", "none"] as const;

/** Subject anchor for an immutable `territory_resolutions` row. */
export const territoryResolutionSubjectTypes = [
  "sales_order",
  "return_order",
  "partner_address",
  "manual",
  "replay",
] as const;
export const productTypes = ["consumable", "storable", "service"] as const;
export const productTrackings = ["none", "lot", "serial"] as const;
export const invoicePolicies = ["ordered", "delivered"] as const;
export const attributeDisplayTypes = ["radio", "select", "color", "pills"] as const;
export const createVariantPolicies = ["always", "dynamic", "no_variant"] as const;
export const invariantStatuses = ["pass", "fail"] as const;
export const invariantSeverities = ["error", "warning", "info"] as const;
export const domainEventTypes = [
  "REPORT_VALIDATED",
  "REPORT_CONFIRMED",
  "INVOICE_GENERATED",
  "AGREEMENT_EXPIRED",
  "AGREEMENT_ACTIVATED",
  "ORDER_MUTATED",
  "ORDER_DELETED",
  "SUBSCRIPTION_MUTATED",
  "SUBSCRIPTION_DELETED",
  "COMMISSION_ENTRY_MUTATED",
  "COMMISSION_ENTRY_DELETED",
  "RETURN_ORDER_MUTATED",
  "RETURN_ORDER_DELETED",
  "CONSIGNMENT_AGREEMENT_MUTATED",
  "CONSIGNMENT_AGREEMENT_DELETED",
  "TRUTH_BOUNDARY_COMMITTED",
  "TRUTH_BINDING_VOIDED",
] as const;

/** Lifecycle of a `document_truth_bindings` row (financial boundary, not draft/sent on the commercial doc). */
export const truthBindingCommitPhases = ["financial_commit", "posted", "voided", "superseded"] as const;

/** Immutable decision facets stamped on a truth binding at commit (anti–re-evaluation / drift). */
export const truthDecisionTypes = ["pricing", "approval", "accounting", "inventory", "credit"] as const;

/** GL journal entry header status (`sales.journal_entries`). */
export const journalEntryStatuses = ["draft", "posted", "reversed"] as const;

/** Document-level pricing decision lifecycle (`sales.pricing_decisions.status`). */
export const pricingDecisionStatuses = ["draft", "final"] as const;

export const orderStatusEnum = salesSchema.enum("order_status", [...orderStatuses]);
export const partnerTypeEnum = salesSchema.enum("partner_type", [...partnerTypes]);
export const partnerEntityTypeEnum = salesSchema.enum("partner_entity_type", [...partnerEntityTypes]);
export const partnerReconciliationStatusEnum = salesSchema.enum("partner_reconciliation_status", [
  ...partnerReconciliationStatuses,
]);
export const partnerEventTypeEnum = salesSchema.enum("partner_event_type", [...partnerEventTypes]);
export const partnerEventAccountingImpactEnum = salesSchema.enum("partner_event_accounting_impact", [
  ...partnerEventAccountingImpacts,
]);
export const addressTypeEnum = salesSchema.enum("address_type", [...addressTypes]);
export const taxTypeUseEnum = salesSchema.enum("tax_type_use", [...taxTypeUses]);
export const taxAmountTypeEnum = salesSchema.enum("tax_amount_type", [...taxAmountTypes]);
export const taxComputationMethodEnum = salesSchema.enum("tax_computation_method", [
  ...taxComputationMethods,
]);
export const taxResolutionSubjectTypeEnum = salesSchema.enum("tax_resolution_subject_type", [
  ...taxResolutionSubjectTypes,
]);
export const taxResolutionStrategyEnum = salesSchema.enum("tax_resolution_strategy", [
  ...taxResolutionStrategies,
]);
export const taxRoundingMethodEnum = salesSchema.enum("tax_rounding_method", [...taxRoundingMethods]);
export const paymentTermValueTypeEnum = salesSchema.enum("payment_term_value_type", [
  ...paymentTermValueTypes,
]);
export const discountPolicyEnum = salesSchema.enum("discount_policy", [...discountPolicies]);
export const pricelistComputeTypeEnum = salesSchema.enum("pricelist_compute_type", [
  ...pricelistComputeTypes,
]);
export const pricelistAppliedOnEnum = salesSchema.enum("pricelist_applied_on", [
  ...pricelistAppliedOns,
]);
export const salesTruthDocumentTypeEnum = salesSchema.enum("sales_truth_document_type", [
  ...salesTruthDocumentTypes,
]);
export const priceResolutionEventTypeEnum = salesSchema.enum("price_resolution_event_type", [
  ...priceResolutionEventTypes,
]);
export const pricelistBaseTypeEnum = salesSchema.enum("pricelist_base_type", [
  ...pricelistBaseTypes,
]);
export const invoiceStatusEnum = salesSchema.enum("invoice_status", [...invoiceStatuses]);
export const deliveryStatusEnum = salesSchema.enum("delivery_status", [...deliveryStatuses]);
export const displayLineTypeEnum = salesSchema.enum("display_line_type", [...displayLineTypes]);
export const priceSourceEnum = salesSchema.enum("price_source", [...priceSources]);
export const discountSourceEnum = salesSchema.enum("discount_source", [...discountSources]);
export const consignmentStatusEnum = salesSchema.enum("consignment_status", [
  ...consignmentStatuses,
]);
export const consignmentReportStatusEnum = salesSchema.enum("consignment_report_status", [
  ...consignmentReportStatuses,
]);
export const consignmentReportPeriodEnum = salesSchema.enum("consignment_report_period", [
  ...consignmentReportPeriods,
]);
export const returnStatusEnum = salesSchema.enum("return_status", [...returnStatuses]);
export const returnConditionEnum = salesSchema.enum("return_condition", [...returnConditions]);
export const restockPolicyEnum = salesSchema.enum("restock_policy", [...restockPolicies]);
export const subscriptionBillingPeriodEnum = salesSchema.enum("subscription_billing_period", [
  ...subscriptionBillingPeriods,
]);
export const subscriptionLogEventTypeEnum = salesSchema.enum("subscription_log_event_type", [
  ...subscriptionLogEventTypes,
]);
export const commissionTypeEnum = salesSchema.enum("commission_type", [...commissionTypes]);
export const commissionBaseEnum = salesSchema.enum("commission_base", [...commissionBases]);
export const commissionCalculationModeEnum = salesSchema.enum("commission_calculation_mode", [
  ...commissionCalculationModes,
]);
export const commissionEntryStatusEnum = salesSchema.enum("commission_entry_status", [
  ...commissionEntryStatuses,
]);
export const commissionLiabilityStatusEnum = salesSchema.enum("commission_liability_status", [
  ...commissionLiabilityStatuses,
]);
export const salesTeamMemberRoleEnum = salesSchema.enum("sales_team_member_role", [
  ...salesTeamMemberRoles,
]);
export const territoryRuleMatchTypeEnum = salesSchema.enum("territory_rule_match_type", [
  ...territoryRuleMatchTypes,
]);
export const territoryResolutionStrategyEnum = salesSchema.enum("territory_resolution_strategy", [
  ...territoryResolutionStrategies,
]);
export const territoryResolutionSubjectTypeEnum = salesSchema.enum("territory_resolution_subject_type", [
  ...territoryResolutionSubjectTypes,
]);
export const productTypeEnum = salesSchema.enum("product_type", [...productTypes]);
export const productTrackingEnum = salesSchema.enum("product_tracking", [...productTrackings]);
export const invoicePolicyEnum = salesSchema.enum("invoice_policy", [...invoicePolicies]);
export const attributeDisplayTypeEnum = salesSchema.enum("attribute_display_type", [
  ...attributeDisplayTypes,
]);
export const createVariantPolicyEnum = salesSchema.enum("create_variant_policy", [
  ...createVariantPolicies,
]);
export const invariantStatusEnum = salesSchema.enum("invariant_status", [
  ...invariantStatuses,
]);
export const invariantSeverityEnum = salesSchema.enum("invariant_severity", [
  ...invariantSeverities,
]);
export const domainEventTypeEnum = salesSchema.enum("domain_event_type", [...domainEventTypes]);
export const truthBindingCommitPhaseEnum = salesSchema.enum("truth_binding_commit_phase", [
  ...truthBindingCommitPhases,
]);
export const truthDecisionTypeEnum = salesSchema.enum("truth_decision_type", [...truthDecisionTypes]);
export const journalEntryStatusEnum = salesSchema.enum("journal_entry_status", [...journalEntryStatuses]);
export const pricingDecisionStatusEnum = salesSchema.enum("pricing_decision_status", [
  ...pricingDecisionStatuses,
]);

export const OrderStatusSchema = z.enum(orderStatuses);
export const PartnerTypeSchema = z.enum(partnerTypes);
export const PartnerEntityTypeSchema = z.enum(partnerEntityTypes);
export const PartnerReconciliationStatusSchema = z.enum(partnerReconciliationStatuses);
export const PartnerEventTypeSchema = z.enum(partnerEventTypes);
export const PartnerEventAccountingImpactSchema = z.enum(partnerEventAccountingImpacts);
export const AddressTypeSchema = z.enum(addressTypes);
export const TaxTypeUseSchema = z.enum(taxTypeUses);
export const TaxAmountTypeSchema = z.enum(taxAmountTypes);
export const TaxComputationMethodSchema = z.enum(taxComputationMethods);
export const TaxResolutionSubjectTypeSchema = z.enum(taxResolutionSubjectTypes);
export const TaxResolutionStrategySchema = z.enum(taxResolutionStrategies);
export const TaxRoundingMethodSchema = z.enum(taxRoundingMethods);
export const PaymentTermValueTypeSchema = z.enum(paymentTermValueTypes);
export const DiscountPolicySchema = z.enum(discountPolicies);
export const PricelistComputeTypeSchema = z.enum(pricelistComputeTypes);
export const PricelistAppliedOnSchema = z.enum(pricelistAppliedOns);
export const SalesTruthDocumentTypeSchema = z.enum(salesTruthDocumentTypes);
export const PriceResolutionEventTypeSchema = z.enum(priceResolutionEventTypes);
export const PricelistBaseTypeSchema = z.enum(pricelistBaseTypes);
export const InvoiceStatusSchema = z.enum(invoiceStatuses);
export const DeliveryStatusSchema = z.enum(deliveryStatuses);
export const DisplayLineTypeSchema = z.enum(displayLineTypes);
export const PriceSourceSchema = z.enum(priceSources);
export const DiscountSourceSchema = z.enum(discountSources);
export const ConsignmentStatusSchema = z.enum(consignmentStatuses);
export const ConsignmentReportStatusSchema = z.enum(consignmentReportStatuses);
export const ConsignmentReportPeriodSchema = z.enum(consignmentReportPeriods);
export const ReturnStatusSchema = z.enum(returnStatuses);
export const ReturnConditionSchema = z.enum(returnConditions);
export const RestockPolicySchema = z.enum(restockPolicies);
export const SubscriptionBillingPeriodSchema = z.enum(subscriptionBillingPeriods);
export const SubscriptionStatusSchema = z.enum(subscriptionStatusCodes);
export const SubscriptionLogEventTypeSchema = z.enum(subscriptionLogEventTypes);
export const CommissionTypeSchema = z.enum(commissionTypes);
export const CommissionBaseSchema = z.enum(commissionBases);
export const CommissionCalculationModeSchema = z.enum(commissionCalculationModes);
export const CommissionEntryStatusSchema = z.enum(commissionEntryStatuses);
export const CommissionLiabilityStatusSchema = z.enum(commissionLiabilityStatuses);
export const SalesTeamMemberRoleSchema = z.enum(salesTeamMemberRoles);
export const TerritoryRuleMatchTypeSchema = z.enum(territoryRuleMatchTypes);
export const TerritoryResolutionStrategySchema = z.enum(territoryResolutionStrategies);
export const TerritoryResolutionSubjectTypeSchema = z.enum(territoryResolutionSubjectTypes);
export const ProductTypeSchema = z.enum(productTypes);
export const ProductTrackingSchema = z.enum(productTrackings);
export const InvoicePolicySchema = z.enum(invoicePolicies);
export const AttributeDisplayTypeSchema = z.enum(attributeDisplayTypes);
export const CreateVariantPolicySchema = z.enum(createVariantPolicies);
export const InvariantStatusSchema = z.enum(invariantStatuses);
export const InvariantSeveritySchema = z.enum(invariantSeverities);
export const DomainEventTypeSchema = z.enum(domainEventTypes);
export const TruthBindingCommitPhaseSchema = z.enum(truthBindingCommitPhases);
export const TruthDecisionTypeSchema = z.enum(truthDecisionTypes);
export const JournalEntryStatusSchema = z.enum(journalEntryStatuses);
export const PricingDecisionStatusSchema = z.enum(pricingDecisionStatuses);

export type OrderStatus = z.infer<typeof OrderStatusSchema>;
export type PartnerType = z.infer<typeof PartnerTypeSchema>;
export type PartnerEntityType = z.infer<typeof PartnerEntityTypeSchema>;
export type PartnerReconciliationStatus = z.infer<typeof PartnerReconciliationStatusSchema>;
export type PartnerEventType = z.infer<typeof PartnerEventTypeSchema>;
export type PartnerEventAccountingImpact = z.infer<typeof PartnerEventAccountingImpactSchema>;
export type AddressType = z.infer<typeof AddressTypeSchema>;
export type TaxTypeUse = z.infer<typeof TaxTypeUseSchema>;
export type TaxAmountType = z.infer<typeof TaxAmountTypeSchema>;
export type TaxComputationMethod = z.infer<typeof TaxComputationMethodSchema>;
export type TaxResolutionSubjectType = z.infer<typeof TaxResolutionSubjectTypeSchema>;
export type TaxResolutionStrategy = z.infer<typeof TaxResolutionStrategySchema>;
export type TaxRoundingMethod = z.infer<typeof TaxRoundingMethodSchema>;
export type PaymentTermValueType = z.infer<typeof PaymentTermValueTypeSchema>;
export type DiscountPolicy = z.infer<typeof DiscountPolicySchema>;
export type PricelistComputeType = z.infer<typeof PricelistComputeTypeSchema>;
export type PricelistAppliedOn = z.infer<typeof PricelistAppliedOnSchema>;
export type SalesTruthDocumentType = z.infer<typeof SalesTruthDocumentTypeSchema>;
export type PriceResolutionEventType = z.infer<typeof PriceResolutionEventTypeSchema>;
export type PricelistBaseType = z.infer<typeof PricelistBaseTypeSchema>;
export type InvoiceStatus = z.infer<typeof InvoiceStatusSchema>;
export type DeliveryStatus = z.infer<typeof DeliveryStatusSchema>;
export type DisplayLineType = z.infer<typeof DisplayLineTypeSchema>;
export type PriceSource = z.infer<typeof PriceSourceSchema>;
export type DiscountSource = z.infer<typeof DiscountSourceSchema>;
export type ConsignmentStatus = z.infer<typeof ConsignmentStatusSchema>;
export type ConsignmentReportStatus = z.infer<typeof ConsignmentReportStatusSchema>;
export type ConsignmentReportPeriod = z.infer<typeof ConsignmentReportPeriodSchema>;
export type ReturnStatus = z.infer<typeof ReturnStatusSchema>;
export type ReturnCondition = z.infer<typeof ReturnConditionSchema>;
export type RestockPolicy = z.infer<typeof RestockPolicySchema>;
export type SubscriptionBillingPeriod = z.infer<typeof SubscriptionBillingPeriodSchema>;
export type SubscriptionStatus = z.infer<typeof SubscriptionStatusSchema>;
export type SubscriptionLogEventType = z.infer<typeof SubscriptionLogEventTypeSchema>;
export type CommissionType = z.infer<typeof CommissionTypeSchema>;
export type CommissionBase = z.infer<typeof CommissionBaseSchema>;
export type CommissionCalculationMode = z.infer<typeof CommissionCalculationModeSchema>;
export type CommissionEntryStatus = z.infer<typeof CommissionEntryStatusSchema>;
export type CommissionLiabilityStatus = z.infer<typeof CommissionLiabilityStatusSchema>;
export type SalesTeamMemberRole = z.infer<typeof SalesTeamMemberRoleSchema>;
export type TerritoryRuleMatchType = z.infer<typeof TerritoryRuleMatchTypeSchema>;
export type TerritoryResolutionStrategy = z.infer<typeof TerritoryResolutionStrategySchema>;
export type TerritoryResolutionSubjectType = z.infer<typeof TerritoryResolutionSubjectTypeSchema>;
export type ProductType = z.infer<typeof ProductTypeSchema>;
export type ProductTracking = z.infer<typeof ProductTrackingSchema>;
export type InvoicePolicy = z.infer<typeof InvoicePolicySchema>;
export type AttributeDisplayType = z.infer<typeof AttributeDisplayTypeSchema>;
export type CreateVariantPolicy = z.infer<typeof CreateVariantPolicySchema>;
export type InvariantStatus = z.infer<typeof InvariantStatusSchema>;
export type InvariantSeverity = z.infer<typeof InvariantSeveritySchema>;
export type DomainEventType = z.infer<typeof DomainEventTypeSchema>;
export type TruthBindingCommitPhase = z.infer<typeof TruthBindingCommitPhaseSchema>;
export type TruthDecisionType = z.infer<typeof TruthDecisionTypeSchema>;
export type JournalEntryStatus = z.infer<typeof JournalEntryStatusSchema>;
export type PricingDecisionStatus = z.infer<typeof PricingDecisionStatusSchema>;
