import { z } from "zod/v4";

import { salesSchema } from "./_schema.js";

export const orderStatuses = ["draft", "confirmed", "shipped", "done", "cancelled"] as const;
export const partnerTypes = ["customer", "vendor", "both"] as const;
export const addressTypes = ["invoice", "delivery", "contact", "other"] as const;
export const taxTypeUses = ["sale", "purchase", "none"] as const;
export const taxAmountTypes = ["percent", "fixed", "group", "code"] as const;
export const paymentTermValueTypes = ["balance", "percent", "fixed"] as const;
export const discountPolicies = ["with_discount", "without_discount"] as const;
export const pricelistComputeTypes = ["fixed", "percentage", "formula"] as const;
export const pricelistAppliedOns = [
  "global",
  "product_template",
  "product_variant",
  "product_category",
] as const;
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
export const subscriptionStatuses = [
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
export const commissionEntryStatuses = ["draft", "approved", "paid"] as const;
export const productTypes = ["consumable", "storable", "service"] as const;
export const productTrackings = ["none", "lot", "serial"] as const;
export const invoicePolicies = ["ordered", "delivered"] as const;
export const attributeDisplayTypes = ["radio", "select", "color", "pills"] as const;
export const createVariantPolicies = ["always", "dynamic", "no_variant"] as const;

export const orderStatusEnum = salesSchema.enum("order_status", [...orderStatuses]);
export const partnerTypeEnum = salesSchema.enum("partner_type", [...partnerTypes]);
export const addressTypeEnum = salesSchema.enum("address_type", [...addressTypes]);
export const taxTypeUseEnum = salesSchema.enum("tax_type_use", [...taxTypeUses]);
export const taxAmountTypeEnum = salesSchema.enum("tax_amount_type", [...taxAmountTypes]);
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
export const subscriptionStatusEnum = salesSchema.enum("subscription_status", [
  ...subscriptionStatuses,
]);
export const subscriptionLogEventTypeEnum = salesSchema.enum("subscription_log_event_type", [
  ...subscriptionLogEventTypes,
]);
export const commissionTypeEnum = salesSchema.enum("commission_type", [...commissionTypes]);
export const commissionBaseEnum = salesSchema.enum("commission_base", [...commissionBases]);
export const commissionEntryStatusEnum = salesSchema.enum("commission_entry_status", [
  ...commissionEntryStatuses,
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

export const OrderStatusSchema = z.enum(orderStatuses);
export const PartnerTypeSchema = z.enum(partnerTypes);
export const AddressTypeSchema = z.enum(addressTypes);
export const TaxTypeUseSchema = z.enum(taxTypeUses);
export const TaxAmountTypeSchema = z.enum(taxAmountTypes);
export const PaymentTermValueTypeSchema = z.enum(paymentTermValueTypes);
export const DiscountPolicySchema = z.enum(discountPolicies);
export const PricelistComputeTypeSchema = z.enum(pricelistComputeTypes);
export const PricelistAppliedOnSchema = z.enum(pricelistAppliedOns);
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
export const SubscriptionStatusSchema = z.enum(subscriptionStatuses);
export const SubscriptionLogEventTypeSchema = z.enum(subscriptionLogEventTypes);
export const CommissionTypeSchema = z.enum(commissionTypes);
export const CommissionBaseSchema = z.enum(commissionBases);
export const CommissionEntryStatusSchema = z.enum(commissionEntryStatuses);
export const ProductTypeSchema = z.enum(productTypes);
export const ProductTrackingSchema = z.enum(productTrackings);
export const InvoicePolicySchema = z.enum(invoicePolicies);
export const AttributeDisplayTypeSchema = z.enum(attributeDisplayTypes);
export const CreateVariantPolicySchema = z.enum(createVariantPolicies);

export type OrderStatus = z.infer<typeof OrderStatusSchema>;
export type PartnerType = z.infer<typeof PartnerTypeSchema>;
export type AddressType = z.infer<typeof AddressTypeSchema>;
export type TaxTypeUse = z.infer<typeof TaxTypeUseSchema>;
export type TaxAmountType = z.infer<typeof TaxAmountTypeSchema>;
export type PaymentTermValueType = z.infer<typeof PaymentTermValueTypeSchema>;
export type DiscountPolicy = z.infer<typeof DiscountPolicySchema>;
export type PricelistComputeType = z.infer<typeof PricelistComputeTypeSchema>;
export type PricelistAppliedOn = z.infer<typeof PricelistAppliedOnSchema>;
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
export type CommissionEntryStatus = z.infer<typeof CommissionEntryStatusSchema>;
export type ProductType = z.infer<typeof ProductTypeSchema>;
export type ProductTracking = z.infer<typeof ProductTrackingSchema>;
export type InvoicePolicy = z.infer<typeof InvoicePolicySchema>;
export type AttributeDisplayType = z.infer<typeof AttributeDisplayTypeSchema>;
export type CreateVariantPolicy = z.infer<typeof CreateVariantPolicySchema>;
