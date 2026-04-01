import { z } from "zod/v4";

export const PartnerIdSchema = z.uuid().brand<"PartnerId">();
export const PartnerAddressIdSchema = z.uuid().brand<"PartnerAddressId">();
export const PartnerBankAccountIdSchema = z.uuid().brand<"PartnerBankAccountId">();
export const PartnerTagIdSchema = z.uuid().brand<"PartnerTagId">();
export const PartnerContactSnapshotIdSchema = z.uuid().brand<"PartnerContactSnapshotId">();
export const PartnerAddressSnapshotIdSchema = z.uuid().brand<"PartnerAddressSnapshotId">();
export const PartnerEventIdSchema = z.uuid().brand<"PartnerEventId">();
export const PartnerReconciliationLinkIdSchema = z.uuid().brand<"PartnerReconciliationLinkId">();
export const PriceResolutionIdSchema = z.uuid().brand<"PriceResolutionId">();
/** Document-level pricing decision head; all `price_resolutions` for a document run attach here. */
export const PricingDecisionIdSchema = z.uuid().brand<"PricingDecisionId">();
export const PriceResolutionEventIdSchema = z.uuid().brand<"PriceResolutionEventId">();
export const DocumentTruthLinkIdSchema = z.uuid().brand<"DocumentTruthLinkId">();
export const ProductCategoryIdSchema = z.uuid().brand<"ProductCategoryId">();
export const ProductIdSchema = z.uuid().brand<"ProductId">();
export const SalesOrderIdSchema = z.uuid().brand<"SalesOrderId">();
export const SalesOrderLineIdSchema = z.uuid().brand<"SalesOrderLineId">();
export const PaymentTermIdSchema = z.uuid().brand<"PaymentTermId">();
export const PaymentTermLineIdSchema = z.uuid().brand<"PaymentTermLineId">();
export const PricelistIdSchema = z.uuid().brand<"PricelistId">();
export const PricelistItemIdSchema = z.uuid().brand<"PricelistItemId">();
export const TaxGroupIdSchema = z.uuid().brand<"TaxGroupId">();
export const TaxRateIdSchema = z.uuid().brand<"TaxRateId">();
export const TaxRateChildIdSchema = z.uuid().brand<"TaxRateChildId">();
export const FiscalPositionIdSchema = z.uuid().brand<"FiscalPositionId">();
export const FiscalPositionTaxMapIdSchema = z.uuid().brand<"FiscalPositionTaxMapId">();
export const FiscalPositionAccountMapIdSchema = z.uuid().brand<"FiscalPositionAccountMapId">();
export const FiscalPositionStateIdSchema = z.uuid().brand<"FiscalPositionStateId">();
export const TaxResolutionIdSchema = z.uuid().brand<"TaxResolutionId">();
export const SaleOrderLineTaxIdSchema = z.uuid().brand<"SaleOrderLineTaxId">();
export const SaleOrderOptionLineIdSchema = z.uuid().brand<"SaleOrderOptionLineId">();
export const SaleOrderStatusHistoryIdSchema = z.uuid().brand<"SaleOrderStatusHistoryId">();
export const SaleOrderTaxSummaryIdSchema = z.uuid().brand<"SaleOrderTaxSummaryId">();
export const ConsignmentAgreementIdSchema = z.uuid().brand<"ConsignmentAgreementId">();
export const ConsignmentAgreementLineIdSchema = z.uuid().brand<"ConsignmentAgreementLineId">();
export const ConsignmentStockReportIdSchema = z.uuid().brand<"ConsignmentStockReportId">();
export const ConsignmentStockReportLineIdSchema = z.uuid().brand<"ConsignmentStockReportLineId">();
export const ReturnReasonCodeIdSchema = z.uuid().brand<"ReturnReasonCodeId">();
export const ReturnOrderIdSchema = z.uuid().brand<"ReturnOrderId">();
export const ReturnOrderLineIdSchema = z.uuid().brand<"ReturnOrderLineId">();
export const SubscriptionTemplateIdSchema = z.uuid().brand<"SubscriptionTemplateId">();
export const SubscriptionIdSchema = z.uuid().brand<"SubscriptionId">();
export const SubscriptionLineIdSchema = z.uuid().brand<"SubscriptionLineId">();
export const SubscriptionLogIdSchema = z.uuid().brand<"SubscriptionLogId">();
export const SubscriptionCloseReasonIdSchema = z.uuid().brand<"SubscriptionCloseReasonId">();
export const SalesTeamIdSchema = z.uuid().brand<"SalesTeamId">();
export const SalesTeamMemberIdSchema = z.uuid().brand<"SalesTeamMemberId">();
export const TerritoryIdSchema = z.uuid().brand<"TerritoryId">();
export const TerritoryRuleIdSchema = z.uuid().brand<"TerritoryRuleId">();
export const TerritoryResolutionIdSchema = z.uuid().brand<"TerritoryResolutionId">();
export const CommissionPlanIdSchema = z.uuid().brand<"CommissionPlanId">();
export const CommissionPlanTierIdSchema = z.uuid().brand<"CommissionPlanTierId">();
export const CommissionEntryIdSchema = z.uuid().brand<"CommissionEntryId">();
export const CommissionResolutionIdSchema = z.uuid().brand<"CommissionResolutionId">();
export const CommissionLiabilityIdSchema = z.uuid().brand<"CommissionLiabilityId">();
export const DocumentStatusHistoryIdSchema = z.uuid().brand<"DocumentStatusHistoryId">();
export const DocumentApprovalIdSchema = z.uuid().brand<"DocumentApprovalId">();
export const SalesDocumentAttachmentIdSchema = z.uuid().brand<"SalesDocumentAttachmentId">();
export const LineItemDiscountIdSchema = z.uuid().brand<"LineItemDiscountId">();
export const AccountingPostingIdSchema = z.uuid().brand<"AccountingPostingId">();
export const RoundingPolicyIdSchema = z.uuid().brand<"RoundingPolicyId">();
export const DomainInvariantLogIdSchema = z.uuid().brand<"DomainInvariantLogId">();
export const DomainEventLogIdSchema = z.uuid().brand<"DomainEventLogId">();
export const DocumentTruthBindingIdSchema = z.uuid().brand<"DocumentTruthBindingId">();
export const TruthDecisionLockIdSchema = z.uuid().brand<"TruthDecisionLockId">();
export const JournalEntryIdSchema = z.uuid().brand<"JournalEntryId">();
export const JournalLineIdSchema = z.uuid().brand<"JournalLineId">();
export const AccountingDecisionIdSchema = z.uuid().brand<"AccountingDecisionId">();
export const GlAccountIdSchema = z.uuid().brand<"GlAccountId">();
export const ProductTemplateIdSchema = z.uuid().brand<"ProductTemplateId">();
export const ProductAttributeIdSchema = z.uuid().brand<"ProductAttributeId">();
export const ProductAttributeValueIdSchema = z.uuid().brand<"ProductAttributeValueId">();
export const ProductTemplateAttributeLineIdSchema = z
  .uuid()
  .brand<"ProductTemplateAttributeLineId">();
export const ProductTemplateAttributeValueIdSchema = z
  .uuid()
  .brand<"ProductTemplateAttributeValueId">();
export const ProductVariantIdSchema = z.uuid().brand<"ProductVariantId">();
export const ProductPackagingIdSchema = z.uuid().brand<"ProductPackagingId">();

export const positiveMoneyStringSchema = z
  .string()
  .regex(/^\d+(\.\d{1,2})?$/, "Must be a valid positive money string");

/** Matches `numeric(14,2)` commission/pricing amounts with scale ≤ 2 and value ≥ 0. */
export const nonNegativeMoneyStringSchema = z
  .string()
  .regex(/^\d+(\.\d{1,2})?$/, "Must be a valid money string (up to 2 decimal places)")
  .refine((value) => Number(value) >= 0, "Amount must be non-negative");

export const quantityStringSchema = z
  .string()
  .regex(/^\d+(\.\d{1,4})?$/, "Must be a valid quantity string");

export const discountStringSchema = z
  .string()
  .regex(/^(100(\.0{1,2})?|\d{1,2}(\.\d{1,2})?)$/, "Discount must be between 0 and 100");

export const percentageStringSchema = z
  .string()
  .regex(/^\d+(\.\d{1,4})?$/, "Must be a valid percentage string")
  .refine((value) => Number(value) <= 100, "Percentage must be between 0 and 100");

/** Matches `numeric(…, scale 4)` tax amounts; DB enforces percent ≤ 100 via check when `amount_type = percent`. */
export const taxNumericAmountStringSchema = z
  .string()
  .regex(/^\d+(\.\d{1,4})?$/, "Must be a valid decimal string (up to 4 fractional places)")
  .refine((value) => Number(value) >= 0, "Amount must be non-negative");

export const positiveIntegerStringSchema = z
  .string()
  .regex(/^\d+$/, "Must be a valid non-negative integer string");

export type PartnerId = z.infer<typeof PartnerIdSchema>;
export type PartnerAddressId = z.infer<typeof PartnerAddressIdSchema>;
export type PartnerBankAccountId = z.infer<typeof PartnerBankAccountIdSchema>;
export type PartnerTagId = z.infer<typeof PartnerTagIdSchema>;
export type PartnerContactSnapshotId = z.infer<typeof PartnerContactSnapshotIdSchema>;
export type PartnerAddressSnapshotId = z.infer<typeof PartnerAddressSnapshotIdSchema>;
export type PartnerEventId = z.infer<typeof PartnerEventIdSchema>;
export type PartnerReconciliationLinkId = z.infer<typeof PartnerReconciliationLinkIdSchema>;
export type PriceResolutionId = z.infer<typeof PriceResolutionIdSchema>;
export type PricingDecisionId = z.infer<typeof PricingDecisionIdSchema>;
export type PriceResolutionEventId = z.infer<typeof PriceResolutionEventIdSchema>;
export type DocumentTruthLinkId = z.infer<typeof DocumentTruthLinkIdSchema>;
export type ProductCategoryId = z.infer<typeof ProductCategoryIdSchema>;
export type ProductId = z.infer<typeof ProductIdSchema>;
export type SalesOrderId = z.infer<typeof SalesOrderIdSchema>;
export type SalesOrderLineId = z.infer<typeof SalesOrderLineIdSchema>;
export type PaymentTermId = z.infer<typeof PaymentTermIdSchema>;
export type PaymentTermLineId = z.infer<typeof PaymentTermLineIdSchema>;
export type PricelistId = z.infer<typeof PricelistIdSchema>;
export type PricelistItemId = z.infer<typeof PricelistItemIdSchema>;
export type TaxGroupId = z.infer<typeof TaxGroupIdSchema>;
export type TaxRateId = z.infer<typeof TaxRateIdSchema>;
export type TaxRateChildId = z.infer<typeof TaxRateChildIdSchema>;
export type FiscalPositionId = z.infer<typeof FiscalPositionIdSchema>;
export type FiscalPositionTaxMapId = z.infer<typeof FiscalPositionTaxMapIdSchema>;
export type FiscalPositionAccountMapId = z.infer<typeof FiscalPositionAccountMapIdSchema>;
export type FiscalPositionStateId = z.infer<typeof FiscalPositionStateIdSchema>;
export type TaxResolutionId = z.infer<typeof TaxResolutionIdSchema>;
export type SaleOrderLineTaxId = z.infer<typeof SaleOrderLineTaxIdSchema>;
export type SaleOrderOptionLineId = z.infer<typeof SaleOrderOptionLineIdSchema>;
export type SaleOrderStatusHistoryId = z.infer<typeof SaleOrderStatusHistoryIdSchema>;
export type SaleOrderTaxSummaryId = z.infer<typeof SaleOrderTaxSummaryIdSchema>;
export type ConsignmentAgreementId = z.infer<typeof ConsignmentAgreementIdSchema>;
export type ConsignmentAgreementLineId = z.infer<typeof ConsignmentAgreementLineIdSchema>;
export type ConsignmentStockReportId = z.infer<typeof ConsignmentStockReportIdSchema>;
export type ConsignmentStockReportLineId = z.infer<typeof ConsignmentStockReportLineIdSchema>;
export type ReturnReasonCodeId = z.infer<typeof ReturnReasonCodeIdSchema>;
export type ReturnOrderId = z.infer<typeof ReturnOrderIdSchema>;
export type ReturnOrderLineId = z.infer<typeof ReturnOrderLineIdSchema>;
export type SubscriptionTemplateId = z.infer<typeof SubscriptionTemplateIdSchema>;
export type SubscriptionId = z.infer<typeof SubscriptionIdSchema>;
export type SubscriptionLineId = z.infer<typeof SubscriptionLineIdSchema>;
export type SubscriptionLogId = z.infer<typeof SubscriptionLogIdSchema>;
export type SubscriptionCloseReasonId = z.infer<typeof SubscriptionCloseReasonIdSchema>;
export type SalesTeamId = z.infer<typeof SalesTeamIdSchema>;
export type SalesTeamMemberId = z.infer<typeof SalesTeamMemberIdSchema>;
export type TerritoryId = z.infer<typeof TerritoryIdSchema>;
export type TerritoryRuleId = z.infer<typeof TerritoryRuleIdSchema>;
export type TerritoryResolutionId = z.infer<typeof TerritoryResolutionIdSchema>;
export type CommissionPlanId = z.infer<typeof CommissionPlanIdSchema>;
export type CommissionPlanTierId = z.infer<typeof CommissionPlanTierIdSchema>;
export type CommissionEntryId = z.infer<typeof CommissionEntryIdSchema>;
export type CommissionResolutionId = z.infer<typeof CommissionResolutionIdSchema>;
export type CommissionLiabilityId = z.infer<typeof CommissionLiabilityIdSchema>;
export type DocumentStatusHistoryId = z.infer<typeof DocumentStatusHistoryIdSchema>;
export type DocumentApprovalId = z.infer<typeof DocumentApprovalIdSchema>;
export type SalesDocumentAttachmentId = z.infer<typeof SalesDocumentAttachmentIdSchema>;
export type LineItemDiscountId = z.infer<typeof LineItemDiscountIdSchema>;
export type AccountingPostingId = z.infer<typeof AccountingPostingIdSchema>;
export type RoundingPolicyId = z.infer<typeof RoundingPolicyIdSchema>;
export type DomainInvariantLogId = z.infer<typeof DomainInvariantLogIdSchema>;
export type DomainEventLogId = z.infer<typeof DomainEventLogIdSchema>;
export type DocumentTruthBindingId = z.infer<typeof DocumentTruthBindingIdSchema>;
export type TruthDecisionLockId = z.infer<typeof TruthDecisionLockIdSchema>;
export type JournalEntryId = z.infer<typeof JournalEntryIdSchema>;
export type JournalLineId = z.infer<typeof JournalLineIdSchema>;
export type AccountingDecisionId = z.infer<typeof AccountingDecisionIdSchema>;
export type GlAccountId = z.infer<typeof GlAccountIdSchema>;
export type ProductTemplateId = z.infer<typeof ProductTemplateIdSchema>;
export type ProductAttributeId = z.infer<typeof ProductAttributeIdSchema>;
export type ProductAttributeValueId = z.infer<typeof ProductAttributeValueIdSchema>;
export type ProductTemplateAttributeLineId = z.infer<typeof ProductTemplateAttributeLineIdSchema>;
export type ProductTemplateAttributeValueId = z.infer<typeof ProductTemplateAttributeValueIdSchema>;
export type ProductVariantId = z.infer<typeof ProductVariantIdSchema>;
export type ProductPackagingId = z.infer<typeof ProductPackagingIdSchema>;
