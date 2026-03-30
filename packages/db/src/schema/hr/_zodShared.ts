// ============================================================================
// HR ZOD SHARED SCHEMAS
// Shared branded IDs, business types, workflow state factories, and refinements used across HR domains.
// ============================================================================
/**
 * HR Domain Zod Schema Library - Phase 0 Foundation
 * ============================================================================
 *
 * **Purpose:**
 * Centralized validation library for HR domain tables, integrating @afenda/meta-types
 * to provide type-safe, reusable validators for business domains.
 *
 * **Organization:**
 * - BRANDED ID SCHEMAS: UUID-branded types for all HR entities
 * - BUSINESS TYPE VALIDATORS: Email, phone, currency, tax ID, bank account, etc.
 * - WORKFLOW STATE VALIDATORS: Finite state machines for leave, payroll, recruitment, etc.
 * - CROSS-FIELD REFINEMENTS: Generic and specific business rule validators
 * - TYPE EXPORTS: TypeScript type inference from Zod schemas
 *
 * **Key Features:**
 * ✅ meta-types integration enables type-safe validation across all layers
 * ✅ Workflow state machines prevent invalid state transitions
 * ✅ Reusable refinements mirror database CHECK constraints
 * ✅ Runtime type guards ensure safe JSON/metadata field validation
 * ✅ Comprehensive JSDoc with examples for developer guidance
 *
 * **Integration Pattern:**
 * ```ts
 * // Table schema
 * const employees = pgTable("employees", {
 *   id: uuid().primaryKey(),
 *   email: text().unique(),
 *   phone: text(),
 *   metadata: jsonb(),
 * });
 *
 * // Validation
 * const createEmployeeSchema = createInsertSchema(employees)
 *   .extend({
 *     email: businessEmailSchema,
 *     phone: internationalPhoneSchema,
 *     metadata: metadataSchema, // Uses isJsonObject() guard
 *   })
 *   .superRefine(refineEndDateOnOrAfterStartDate());
 * ```
 *
 * **Related Documentation:**
 * See UPGRADE-EXECUTIVE-SUMMARY.md Phase 0 for detailed implementation plan.
 */

// ============================================================================
// HR ZOD SHARED SCHEMAS
// Shared branded IDs, business types, workflow state factories, and refinements used across HR domains.
// ============================================================================
import { z } from "zod/v4";

import { standardApprovalWorkflowStatuses } from "./_enums.js";
import {
  disposableEmailDomainSet,
  isDisposableEmail,
} from "./disposableEmailDomains.js";

export {
  DEFAULT_DISPOSABLE_EMAIL_DOMAINS,
  disposableEmailDomainSet,
  extractEmailDomainForDisposableCheck,
  isDisposableEmail,
  normalizeDisposableEmailDomain,
  type DisposableEmailDomainSetOptions,
} from "./disposableEmailDomains.js";

// ============================================================================
// META-TYPES IMPORTS
// ============================================================================

// Core utilities for runtime type guards (see JSDoc below for schema alignment notes)
import { isJsonObject } from "@afenda/meta-types/core";

// ============================================================================
// BRANDED ID SCHEMAS
// ============================================================================

export const EmployeeIdSchema = z.uuid().brand<"EmployeeId">();
export const DepartmentIdSchema = z.uuid().brand<"DepartmentId">();
export const JobTitleIdSchema = z.uuid().brand<"JobTitleId">();
export const JobPositionIdSchema = z.uuid().brand<"JobPositionId">();
export const EmploymentContractIdSchema = z.uuid().brand<"EmploymentContractId">();
export const SalaryComponentIdSchema = z.uuid().brand<"SalaryComponentId">();
export const EmployeeSalaryIdSchema = z.uuid().brand<"EmployeeSalaryId">();
export const PayrollPeriodIdSchema = z.uuid().brand<"PayrollPeriodId">();
export const PayrollEntryIdSchema = z.uuid().brand<"PayrollEntryId">();
export const PayrollLineIdSchema = z.uuid().brand<"PayrollLineId">();
export const LeaveTypeConfigIdSchema = z.uuid().brand<"LeaveTypeConfigId">();
export const LeaveAllocationIdSchema = z.uuid().brand<"LeaveAllocationId">();
export const LeaveRequestIdSchema = z.uuid().brand<"LeaveRequestId">();
export const LeaveRequestStatusHistoryIdSchema = z.uuid().brand<"LeaveRequestStatusHistoryId">();
export const HolidayCalendarIdSchema = z.uuid().brand<"HolidayCalendarId">();
export const HolidayIdSchema = z.uuid().brand<"HolidayId">();
export const TimeSheetIdSchema = z.uuid().brand<"TimeSheetId">();
export const TimeSheetLineIdSchema = z.uuid().brand<"TimeSheetLineId">();
export const AttendanceRecordIdSchema = z.uuid().brand<"AttendanceRecordId">();
export const ShiftScheduleIdSchema = z.uuid().brand<"ShiftScheduleId">();
export const ShiftAssignmentIdSchema = z.uuid().brand<"ShiftAssignmentId">();
export const BenefitPlanIdSchema = z.uuid().brand<"BenefitPlanId">();
export const EmployeeBenefitIdSchema = z.uuid().brand<"EmployeeBenefitId">();
export const PerformanceReviewCycleIdSchema = z.uuid().brand<"PerformanceReviewCycleId">();
export const PerformanceReviewIdSchema = z.uuid().brand<"PerformanceReviewId">();
export const ReviewQuestionIdSchema = z.uuid().brand<"ReviewQuestionId">();
export const ReviewAnswerIdSchema = z.uuid().brand<"ReviewAnswerId">();
export const GoalIdSchema = z.uuid().brand<"GoalId">();
export const GoalUpdateIdSchema = z.uuid().brand<"GoalUpdateId">();
export const SkillIdSchema = z.uuid().brand<"SkillId">();
export const EmployeeSkillIdSchema = z.uuid().brand<"EmployeeSkillId">();
export const CertificationIdSchema = z.uuid().brand<"CertificationId">();
export const EmployeeCertificationIdSchema = z.uuid().brand<"EmployeeCertificationId">();
export const JobOpeningIdSchema = z.uuid().brand<"JobOpeningId">();
export const JobApplicationIdSchema = z.uuid().brand<"JobApplicationId">();
export const InterviewIdSchema = z.uuid().brand<"InterviewId">();
export const InterviewerFeedbackIdSchema = z.uuid().brand<"InterviewerFeedbackId">();
export const JobOfferIdSchema = z.uuid().brand<"JobOfferId">();
export const TrainingProgramIdSchema = z.uuid().brand<"TrainingProgramId">();
export const TrainingSessionIdSchema = z.uuid().brand<"TrainingSessionId">();
export const TrainingAttendanceIdSchema = z.uuid().brand<"TrainingAttendanceId">();
export const EmployeeDocumentIdSchema = z.uuid().brand<"EmployeeDocumentId">();
export const ExpenseClaimIdSchema = z.uuid().brand<"ExpenseClaimId">();
export const ExpenseLineIdSchema = z.uuid().brand<"ExpenseLineId">();
export const DisciplinaryActionIdSchema = z.uuid().brand<"DisciplinaryActionId">();
export const EmployeeDependentIdSchema = z.uuid().brand<"EmployeeDependentId">();
export const EmergencyContactIdSchema = z.uuid().brand<"EmergencyContactId">();
export const ExitInterviewIdSchema = z.uuid().brand<"ExitInterviewId">();
export const EmployeeMovementIdSchema = z.uuid().brand<"EmployeeMovementId">();
export const OnboardingChecklistIdSchema = z.uuid().brand<"OnboardingChecklistId">();
export const OnboardingTaskIdSchema = z.uuid().brand<"OnboardingTaskId">();
export const OnboardingProgressIdSchema = z.uuid().brand<"OnboardingProgressId">();
export const CostCenterIdSchema = z.uuid().brand<"CostCenterId">();
export const EmployeeCostAllocationIdSchema = z.uuid().brand<"EmployeeCostAllocationId">();

// New: Benefits Domain (Phase 1)
export const BenefitProviderIdSchema = z.uuid().brand<"BenefitProviderId">();
export const BenefitEnrollmentIdSchema = z.uuid().brand<"BenefitEnrollmentId">();
export const BenefitDependentCoverageIdSchema = z.uuid().brand<"BenefitDependentCoverageId">();
export const BenefitClaimIdSchema = z.uuid().brand<"BenefitClaimId">();
export const BenefitPlanBenefitIdSchema = z.uuid().brand<"BenefitPlanBenefitId">();

// New: Learning Domain Enhancement (Phase 2)
export const CourseIdSchema = z.uuid().brand<"CourseId">();
export const CourseModuleIdSchema = z.uuid().brand<"CourseModuleId">();
export const LearningPathIdSchema = z.uuid().brand<"LearningPathId">();
export const AssessmentIdSchema = z.uuid().brand<"AssessmentId">();
export const AssessmentQuestionIdSchema = z.uuid().brand<"AssessmentQuestionId">();
export const CourseSessionIdSchema = z.uuid().brand<"CourseSessionId">();
export const CourseEnrollmentIdSchema = z.uuid().brand<"CourseEnrollmentId">();
export const LearningProgressIdSchema = z.uuid().brand<"LearningProgressId">();
export const TrainingFeedbackIdSchema = z.uuid().brand<"TrainingFeedbackId">();
export const TrainingCostIdSchema = z.uuid().brand<"TrainingCostId">();
export const LearningPathEnrollmentIdSchema = z.uuid().brand<"LearningPathEnrollmentId">();
export const AssessmentAttemptIdSchema = z.uuid().brand<"AssessmentAttemptId">();
export const CertificateIdSchema = z.uuid().brand<"CertificateId">();
export const CoursePrerequisiteIdSchema = z.uuid().brand<"CoursePrerequisiteId">();
export const CourseMaterialIdSchema = z.uuid().brand<"CourseMaterialId">();

// New: Payroll Enhancement (Phase 3)
export const TaxBracketIdSchema = z.uuid().brand<"TaxBracketId">();
export const StatutoryDeductionIdSchema = z.uuid().brand<"StatutoryDeductionId">();
export const PayrollAdjustmentIdSchema = z.uuid().brand<"PayrollAdjustmentId">();
export const PayslipIdSchema = z.uuid().brand<"PayslipId">();
export const PaymentDistributionIdSchema = z.uuid().brand<"PaymentDistributionId">();

// New: Recruitment Enhancement (Phase 4)
export const ApplicantDocumentIdSchema = z.uuid().brand<"ApplicantDocumentId">();
export const InterviewFeedbackFormIdSchema = z.uuid().brand<"InterviewFeedbackFormId">();
export const OfferLetterIdSchema = z.uuid().brand<"OfferLetterId">();

/** Matches `integer("tenant_id")` / FK to `core.tenants` for all `hr.*` insert payloads. */
export const hrTenantIdSchema = z.number().int().positive();

/** Matches `integer("created_by")` / `integer("updated_by")` from shared `auditColumns` (e.g. `security.users.user_id`). */
export const hrAuditUserIdSchema = z.number().int().positive().brand<"HrAuditUserId">();

export type HrAuditUserId = z.infer<typeof hrAuditUserIdSchema>;

// ============================================================================
// PHASE 6-9 ENHANCEMENTS: BRANDED ID SCHEMAS
// ============================================================================

// Phase 6: Employee Experience & Self-Service
export const EmployeeSelfServiceProfileIdSchema = z.uuid().brand<"EmployeeSelfServiceProfileId">();
export const EmployeeRequestIdSchema = z.uuid().brand<"EmployeeRequestId">();
export const EmployeeNotificationIdSchema = z.uuid().brand<"EmployeeNotificationId">();
export const EmployeePreferenceIdSchema = z.uuid().brand<"EmployeePreferenceId">();
export const EmployeeSurveyIdSchema = z.uuid().brand<"EmployeeSurveyId">();
export const SurveyResponseIdSchema = z.uuid().brand<"SurveyResponseId">();

// Phase 7: Strategic Workforce Management
export const SuccessionPlanIdSchema = z.uuid().brand<"SuccessionPlanId">();
export const TalentPoolIdSchema = z.uuid().brand<"TalentPoolId">();
export const TalentPoolMemberIdSchema = z.uuid().brand<"TalentPoolMemberId">();
export const CareerPathIdSchema = z.uuid().brand<"CareerPathId">();
export const CareerPathStepIdSchema = z.uuid().brand<"CareerPathStepId">();
export const CareerPathStepSkillIdSchema = z.uuid().brand<"CareerPathStepSkillId">();
export const CareerAspirationIdSchema = z.uuid().brand<"CareerAspirationId">();
export const CareerAspirationSkillGapIdSchema = z.uuid().brand<"CareerAspirationSkillGapId">();
export const CompensationCycleIdSchema = z.uuid().brand<"CompensationCycleId">();
export const CompensationBudgetIdSchema = z.uuid().brand<"CompensationBudgetId">();

// Phase 8: People Analytics & Intelligence
export const AnalyticsFactIdSchema = z.uuid().brand<"AnalyticsFactId">();
export const HrMetricIdSchema = z.uuid().brand<"HrMetricId">();
export const AnalyticsDashboardIdSchema = z.uuid().brand<"AnalyticsDashboardId">();
export const DataExportIdSchema = z.uuid().brand<"DataExportId">();
export const ReportSubscriptionIdSchema = z.uuid().brand<"ReportSubscriptionId">();
export const ReportSubscriptionRecipientIdSchema = z.uuid().brand<"ReportSubscriptionRecipientId">();
export const AnalyticsDimensionIdSchema = z.uuid().brand<"AnalyticsDimensionId">();

// Phase 9: Global Mobility & Compliance
export const InternationalAssignmentIdSchema = z.uuid().brand<"InternationalAssignmentId">();
export const AssignmentAllowanceIdSchema = z.uuid().brand<"AssignmentAllowanceId">();
export const WorkPermitIdSchema = z.uuid().brand<"WorkPermitId">();
export const ComplianceTrackingIdSchema = z.uuid().brand<"ComplianceTrackingId">();
export const RelocationServiceIdSchema = z.uuid().brand<"RelocationServiceId">();
export const DeiMetricIdSchema = z.uuid().brand<"DeiMetricId">();

// Schema Upgrade: Skills Taxonomy
export const SkillTypeIdSchema = z.uuid().brand<"SkillTypeId">();
export const SkillLevelIdSchema = z.uuid().brand<"SkillLevelId">();
export const JobPositionSkillIdSchema = z.uuid().brand<"JobPositionSkillId">();
export const ResumeLineTypeIdSchema = z.uuid().brand<"ResumeLineTypeId">();
export const EmployeeResumeLineIdSchema = z.uuid().brand<"EmployeeResumeLineId">();
export const EmployeeResumeLineAchievementIdSchema = z
  .uuid()
  .brand<"EmployeeResumeLineAchievementId">();
export const EmployeeResumeLineSkillEntryIdSchema = z.uuid().brand<"EmployeeResumeLineSkillEntryId">();

// Schema Upgrade: Expense Management
export const ExpenseCategoryIdSchema = z.uuid().brand<"ExpenseCategoryId">();
export const ExpensePolicyIdSchema = z.uuid().brand<"ExpensePolicyId">();
export const ExpenseReportIdSchema = z.uuid().brand<"ExpenseReportId">();
export const ExpenseApprovalIdSchema = z.uuid().brand<"ExpenseApprovalId">();
export const CashAdvanceIdSchema = z.uuid().brand<"CashAdvanceId">();
/** Optional `expense_lines.project_id` when no cross-schema FK is defined. */
export const ExpenseLineProjectRefIdSchema = z.uuid().brand<"ExpenseLineProjectRefId">();

// Schema Upgrade: Employee Experience
export const BonusPointRuleIdSchema = z.uuid().brand<"BonusPointRuleId">();
export const EmployeeBonusPointIdSchema = z.uuid().brand<"EmployeeBonusPointId">();
export const BonusPointTransactionIdSchema = z.uuid().brand<"BonusPointTransactionId">();
/** Polymorphic `bonus_point_transactions.reference_id` (pairs with `reference_type`). */
export const BonusPointTransactionReferenceIdSchema = z.uuid().brand<"BonusPointTransactionReferenceId">();
export const BonusPointRedemptionRequestIdSchema = z.uuid().brand<"BonusPointRedemptionRequestId">();
export const BonusPointRewardCatalogIdSchema = z.uuid().brand<"BonusPointRewardCatalogId">();
export const EmployeeRequestHistoryIdSchema = z.uuid().brand<"EmployeeRequestHistoryId">();
export const EssEscalationPolicyIdSchema = z.uuid().brand<"EssEscalationPolicyId">();
export const EmployeeRequestApprovalTaskIdSchema = z.uuid().brand<"EmployeeRequestApprovalTaskId">();
export const EssEventTypeIdSchema = z.uuid().brand<"EssEventTypeId">();
export const EssDomainEventIdSchema = z.uuid().brand<"EssDomainEventId">();
export const EssOutboxIdSchema = z.uuid().brand<"EssOutboxId">();
export const EssWorkflowDefinitionIdSchema = z.uuid().brand<"EssWorkflowDefinitionId">();
export const EssWorkflowStepIdSchema = z.uuid().brand<"EssWorkflowStepId">();
export const EmployeeSurveyQuestionnaireVersionIdSchema = z
  .uuid()
  .brand<"EmployeeSurveyQuestionnaireVersionId">();
export const SurveyInvitationIdSchema = z.uuid().brand<"SurveyInvitationId">();
export const EmployeePushEndpointIdSchema = z.uuid().brand<"EmployeePushEndpointId">();
export const DisciplinaryActionTypeIdSchema = z.uuid().brand<"DisciplinaryActionTypeId">();
export const DisciplinaryActionRecordIdSchema = z.uuid().brand<"DisciplinaryActionRecordId">();

// Schema Upgrade: Leave Enhancements
export const CompensatoryLeaveRequestIdSchema = z.uuid().brand<"CompensatoryLeaveRequestId">();
export const LeaveRestrictionIdSchema = z.uuid().brand<"LeaveRestrictionId">();
export const LeaveEncashmentIdSchema = z.uuid().brand<"LeaveEncashmentId">();

// Schema Upgrade: Tax Compliance
export const TaxExemptionCategoryIdSchema = z.uuid().brand<"TaxExemptionCategoryId">();
export const TaxExemptionSubCategoryIdSchema = z.uuid().brand<"TaxExemptionSubCategoryId">();
export const EmployeeTaxDeclarationIdSchema = z.uuid().brand<"EmployeeTaxDeclarationId">();
export const TaxDeclarationItemIdSchema = z.uuid().brand<"TaxDeclarationItemId">();
export const TaxExemptionProofIdSchema = z.uuid().brand<"TaxExemptionProofId">();

// Schema Upgrade: Attendance Enhancement
export const AttendanceRequestIdSchema = z.uuid().brand<"AttendanceRequestId">();
export const OvertimeRuleIdSchema = z.uuid().brand<"OvertimeRuleId">();
export const BiometricDeviceIdSchema = z.uuid().brand<"BiometricDeviceId">();
export const BiometricLogIdSchema = z.uuid().brand<"BiometricLogId">();
/** Work-site / location UUID used where HR tables store `location_id` without a Drizzle FK. */
export const HrWorkLocationUuidSchema = z.uuid().brand<"HrWorkLocationUuid">();

// Schema Upgrade: Employee Lifecycle
export const EmployeePromotionIdSchema = z.uuid().brand<"EmployeePromotionId">();
export const EmployeeTransferIdSchema = z.uuid().brand<"EmployeeTransferId">();
export const ExitInterviewRecordIdSchema = z.uuid().brand<"ExitInterviewRecordId">();
export const FullFinalSettlementIdSchema = z.uuid().brand<"FullFinalSettlementId">();

// Schema Upgrade: Travel & Vehicle
export const TravelRequestIdSchema = z.uuid().brand<"TravelRequestId">();
export const TravelItineraryIdSchema = z.uuid().brand<"TravelItineraryId">();
export const CompanyVehicleIdSchema = z.uuid().brand<"CompanyVehicleId">();
export const VehicleLogIdSchema = z.uuid().brand<"VehicleLogId">();

// Schema Upgrade: Workforce Planning
export const StaffingPlanIdSchema = z.uuid().brand<"StaffingPlanId">();
export const StaffingPlanDetailIdSchema = z.uuid().brand<"StaffingPlanDetailId">();

// Schema Upgrade: Appraisal Templates
export const AppraisalTemplateIdSchema = z.uuid().brand<"AppraisalTemplateId">();
export const AppraisalTemplateKraIdSchema = z.uuid().brand<"AppraisalTemplateKraId">();
export const EmployeeKraIdSchema = z.uuid().brand<"EmployeeKraId">();

// Schema Upgrade: Recruitment Enhancement (Phase 6B)
export const RecruitmentPipelineStageIdSchema = z.uuid().brand<"RecruitmentPipelineStageId">();
export const RecruitmentAnalyticsIdSchema = z.uuid().brand<"RecruitmentAnalyticsId">();
export const ResumeParsedDataIdSchema = z.uuid().brand<"ResumeParsedDataId">();

// Schema Upgrade: Enterprise Features (Phase 7)
export const EquityGrantIdSchema = z.uuid().brand<"EquityGrantId">();
export const VestingScheduleIdSchema = z.uuid().brand<"VestingScheduleId">();
export const MarketBenchmarkIdSchema = z.uuid().brand<"MarketBenchmarkId">();

// SWOT Proposal: Grievance Management
export const GrievanceCategoryIdSchema = z.uuid().brand<"GrievanceCategoryId">();
export const GrievanceIdSchema = z.uuid().brand<"GrievanceId">();

// SWOT Proposal: Loan Management
export const LoanTypeIdSchema = z.uuid().brand<"LoanTypeId">();
export const EmployeeLoanIdSchema = z.uuid().brand<"EmployeeLoanId">();
export const EmployeeLoanInstallmentIdSchema = z.uuid().brand<"EmployeeLoanInstallmentId">();

// HR upgrade guide: policy acknowledgments & shift swap
export const HrPolicyDocumentIdSchema = z.uuid().brand<"HrPolicyDocumentId">();
export const EmployeePolicyAcknowledgmentIdSchema = z
  .uuid()
  .brand<"EmployeePolicyAcknowledgmentId">();
export const ShiftSwapRequestIdSchema = z.uuid().brand<"ShiftSwapRequestId">();

// ============================================================================
// BUSINESS TYPE VALIDATORS (meta-types integration)
// ============================================================================

// ============================================================================
// BUSINESS TYPE VALIDATORS (meta-types integration)
// ============================================================================

/**
 * Email validator with business rules
 * - Lowercase normalization
 * - No disposable domains
 * - RFC 5322 compliant
 *
 * Aligns with BusinessTypeSchema: "email"
 *
 * For tenant-specific lists use {@link createBusinessEmailSchema} (`additionalBlockedDomains`,
 * `removeDefaultDisposableDomains`, `strictDisposableDomainListShape`).
 * Memoize the returned schema per tenant in the app layer if you build it on every request.
 */
export function createBusinessEmailSchema(options?: {
  additionalBlockedDomains?: readonly string[];
  /** Allow specific default disposable domains (e.g. `mailinator.com` in sandbox). */
  removeDefaultDisposableDomains?: readonly string[];
  /** When true (default), extra/removal entries must match a hostname-shaped pattern. */
  strictDisposableDomainListShape?: boolean;
}) {
  const blocked = disposableEmailDomainSet({
    additional: options?.additionalBlockedDomains,
    removeDefaults: options?.removeDefaultDisposableDomains,
    strictDomainShape: options?.strictDisposableDomainListShape,
  });
  return z
    .string()
    .email("Must be a valid email address")
    .toLowerCase()
    .refine((email) => !isDisposableEmail(email, blocked), "Disposable email domains not allowed");
}

export const businessEmailSchema = createBusinessEmailSchema();

/**
 * Phone number validator with international format support
 * Supports: E.164 format (+country_code + number)
 *
 * Aligns with BusinessTypeSchema: "phone"
 */
export const internationalPhoneSchema = z
  .string()
  .regex(/^\+[1-9]\d{1,14}$/, "Phone must be in E.164 format (e.g., +6212345678)");

/**
 * Currency amount with configurable precision
 * Supports: Negative values, configurable decimal places, finite numbers
 *
 * Aligns with BusinessTypeSchema: "currency_amount"
 */
export const currencyAmountSchema = (maxDecimals = 2) =>
  z
    .string()
    .regex(
      new RegExp(`^-?\\d+(\\.\\d{1,${maxDecimals}})?$`),
      `Must be a valid currency amount with up to ${maxDecimals} decimals`
    )
    .refine((val) => {
      const num = parseFloat(val);
      return !isNaN(num) && isFinite(num);
    }, "Must be a finite number");

/**
 * Accept numeric input (API / forms), emit a decimal string suitable for numeric/text DB columns.
 * Pipes into {@link currencyAmountSchema} for the same regex/finite checks as string-first payloads.
 */
export function currencyAmountFromNumberSchema(maxDecimals = 2) {
  return z
    .number()
    .finite("Must be a finite number")
    .transform((n) => {
      const fixed = n.toFixed(maxDecimals);
      return fixed.includes(".") ? fixed.replace(/\.?0+$/, "") || "0" : fixed;
    })
    .pipe(currencyAmountSchema(maxDecimals));
}

/**
 * Percentage validator (0-100, up to 2 decimals)
 *
 * Aligns with BusinessTypeSchema: "percentage"
 */
export const boundedPercentageSchema = z
  .number()
  .min(0, "Percentage cannot be negative")
  .max(100, "Percentage cannot exceed 100")
  .refine((val) => {
    // Check if it has at most 2 decimal places
    const decimalPart = (val.toString().split(".")[1] || "").length;
    return decimalPart <= 2;
  }, "Percentage can have at most 2 decimal places");

/**
 * Tax ID validator factory (country-specific patterns)
 * Supports: US, MY, SG, ID, GB, AU
 *
 * Aligns with BusinessTypeSchema: "tax_id"
 */
export const taxIdSchemaFactory = (countryCode: string) => {
  const patterns: Record<string, { pattern: RegExp; description: string }> = {
    US: { pattern: /^\d{2}-\d{7}$/, description: "EIN (12-3456789)" },
    MY: { pattern: /^\d{12}$/, description: "12-digit tax number" },
    SG: { pattern: /^[A-Z]\d{7}[A-Z]$/, description: "NRIC (S1234567D)" },
    ID: { pattern: /^\d{15}$/, description: "NPWP 15-digit" },
    GB: { pattern: /^\d{10}$/, description: "UTR 10-digit" },
    AU: { pattern: /^\d{9}$/, description: "TFN 9-digit" },
  };

  const config = patterns[countryCode] || {
    pattern: /^[A-Z0-9-]+$/,
    description: "Alphanumeric tax ID",
  };

  return z
    .string()
    .regex(config.pattern, `Invalid tax ID format. Expected: ${config.description}`)
    .describe(`Tax ID for ${countryCode}`);
};

/**
 * Bank account number validator
 * International format support (IBAN or country-specific)
 *
 * Aligns with BusinessTypeSchema: "bank_account", "iban"
 */
export const bankAccountSchema = z
  .string()
  .regex(
    /^([A-Z]{2}\d{2}[A-Z0-9]+|[0-9]{8,18})$/,
    "Must be valid IBAN or account number (8-18 digits)"
  )
  .describe("Bank account number or IBAN");

/**
 * IBAN validator (strict format)
 *
 * Aligns with BusinessTypeSchema: "iban"
 */
export const ibanSchema = z
  .string()
  .regex(/^[A-Z]{2}\d{2}[A-Z0-9]+$/, "Must be a valid IBAN format")
  .min(15, "IBAN too short")
  .max(34, "IBAN too long")
  .describe("International Bank Account Number");

/**
 * SWIFT/BIC code validator
 *
 * Aligns with BusinessTypeSchema: "swift_code"
 */
export const swiftCodeSchema = z
  .string()
  .regex(
    /^[A-Z]{6}[A-Z0-9]{2}([A-Z0-9]{3})?$/,
    "Must be a valid SWIFT/BIC code (8 or 11 characters)"
  )
  .describe("SWIFT/BIC code");

/**
 * Social Security Number (country-agnostic)
 *
 * Aligns with BusinessTypeSchema: "social_security"
 */
export const ssnSchema = z
  .string()
  .regex(/^[A-Z0-9-]+$/, "Invalid SSN format")
  .min(9, "SSN too short")
  .max(20, "SSN too long")
  .describe("Social security or national ID number");

/**
 * VAT number validator
 *
 * Aligns with BusinessTypeSchema: "vat_number"
 */
export const vatNumberSchema = z
  .string()
  .regex(/^[A-Z]{2}[A-Z0-9]+$/, "Must be a valid VAT number (country code + digits)")
  .min(8, "VAT number too short")
  .max(15, "VAT number too long")
  .describe("Value Added Tax registration number");

/**
 * India Aadhaar (12 digits, leading digit 1–9).
 * Does not run Verhoeff checksum; add a dedicated check if your policy requires it.
 */
export const aadhaarNumberSchema = z
  .string()
  .regex(/^[1-9]\d{11}$/, "Must be a 12-digit Aadhaar number")
  .describe("India Aadhaar number");

/**
 * UK National Insurance number (NINO) — common formatted pattern.
 */
export const ukNationalInsuranceNumberSchema = z
  .string()
  .regex(
    /^[A-CEGHJ-PR-TW-Z]{1}[A-CEGHJ-NPR-TW-Z]{1}\s?\d{2}\s?\d{2}\s?\d{2}\s?[A-D]{1}$/i,
    "Must be a valid UK National Insurance number"
  )
  .describe("UK National Insurance number");

/**
 * ISO 3166-1 alpha-2 → common EU/EEA (+ CH, NO) national person ID patterns.
 * For production payroll/HR, pair with authoritative verification; these catch obvious typos only.
 */
const EU_NATIONAL_PERSON_ID_PATTERNS: Partial<
  Record<string, { pattern: RegExp; description: string }>
> = {
  AT: { pattern: /^\d{10}$/, description: "Austria SVNR (10 digits)" },
  BE: {
    pattern: /^\d{2}\.?\d{2}\.?\d{2}-?\d{3}\.?\d{2}$|^\d{11}$/,
    description: "Belgian national number",
  },
  HR: { pattern: /^\d{11}$/, description: "Croatia OIB (11 digits)" },
  CY: { pattern: /^\d{8}[A-Z]$|^\d{6}[A-Z]$/i, description: "Cyprus identity card number (simplified)" },
  CZ: { pattern: /^\d{6}\/?\d{3,4}$/, description: "Czech birth number" },
  DK: { pattern: /^\d{6}-\d{4}$|^\d{10}$/, description: "Danish CPR" },
  EE: { pattern: /^[1-6]\d{10}[A-Za-z]?$/, description: "Estonian personal ID code" },
  FI: { pattern: /^\d{6}[-+A]\d{3}[A-Z0-9]$/i, description: "Finnish HETU" },
  FR: { pattern: /^\d{15}$/, description: "France NIR (15 digits)" },
  DE: { pattern: /^\d{11}$/, description: "Germany Steuer-ID (11 digits)" },
  GR: { pattern: /^\d{9}$/, description: "Greece AFM (9 digits)" },
  HU: { pattern: /^\d{9}$/, description: "Hungary TAJ (9 digits)" },
  IS: { pattern: /^\d{10}$/, description: "Iceland kennitala (10 digits)" },
  IE: { pattern: /^\d{7}[A-W][A-IW]?$/i, description: "Irish PPS number" },
  IT: {
    pattern: /^[A-Z]{6}\d{2}[A-Z]\d{2}[A-Z]\d{3}[A-Z]$/i,
    description: "Italian codice fiscale",
  },
  LV: { pattern: /^\d{6}-\d{5}$/, description: "Latvia personal code" },
  LT: { pattern: /^\d{11}$/, description: "Lithuania personal code" },
  LU: { pattern: /^\d{11,12}$/, description: "Luxembourg matricule (simplified)" },
  MT: { pattern: /^\d{7,8}[A-Z]?$/i, description: "Malta ID number (simplified)" },
  NL: { pattern: /^\d{9}$/, description: "Netherlands BSN (9 digits)" },
  NO: { pattern: /^\d{11}$/, description: "Norway fødselsnummer (11 digits)" },
  PL: { pattern: /^\d{11}$/, description: "Poland PESEL (11 digits)" },
  PT: { pattern: /^\d{9}$/, description: "Portugal NIF (9 digits)" },
  RO: { pattern: /^\d{13}$/, description: "Romania CNP (13 digits)" },
  SK: { pattern: /^\d{9,10}$/, description: "Slovakia birth number (simplified)" },
  SI: { pattern: /^\d{8}$/, description: "Slovenia EMŠO (simplified)" },
  ES: { pattern: /^\d{8}[A-Z]$|^[XYZ]\d{7,8}[A-Z]$/i, description: "Spain DNI or NIE" },
  SE: { pattern: /^\d{8}-\d{4}$|^\d{10,12}$/, description: "Sweden personnummer" },
  CH: { pattern: /^756\.?\d{4}\.?\d{4}\.?\d{2}$/, description: "Switzerland AHV number (simplified)" },
};

export function euNationalPersonIdSchemaFactory(isoAlpha2Country: string) {
  const cc = isoAlpha2Country.trim().toUpperCase();
  if (cc === "GB" || cc === "XI") {
    return ukNationalInsuranceNumberSchema;
  }
  const row = EU_NATIONAL_PERSON_ID_PATTERNS[cc];
  const config = row ?? {
    pattern: /^[A-Z0-9./\s-]{5,40}$/i,
    description:
      "Generic national identifier — confirm against official rules for this jurisdiction",
  };
  return z
    .string()
    .regex(config.pattern, `Invalid ${cc} national person ID (${config.description})`)
    .describe(`${cc}: ${config.description}`);
}

/**
 * Person name validator (first, middle, last names)
 *
 * Aligns with BusinessTypeSchema: "person_name"
 */
export const personNameSchema = z
  .string()
  .min(1, "Name cannot be empty")
  .max(100, "Name too long")
  .regex(/^[a-zA-Z\s'-]+$/, "Name can only contain letters, spaces, hyphens, and apostrophes")
  .describe("Person's name");

/**
 * Postal/ZIP code validator (generic)
 *
 * Aligns with BusinessTypeSchema: "postal_code"
 */
export const postalCodeSchema = z
  .string()
  .regex(/^[A-Z0-9\s-]+$/i, "Invalid postal code format")
  .min(3, "Postal code too short")
  .max(10, "Postal code too long")
  .describe("Postal or ZIP code");

/**
 * Document reference number
 *
 * Aligns with BusinessTypeSchema: "document_ref"
 */
export const documentRefSchema = z
  .string()
  .regex(/^[A-Z0-9-]+$/, "Invalid document reference format")
  .min(5, "Document reference too short")
  .max(30, "Document reference too long")
  .describe("Document reference number");

/**
 * Serial number validator
 *
 * Aligns with BusinessTypeSchema: "serial_number"
 */
export const serialNumberSchema = z
  .string()
  .regex(/^[A-Z0-9-]+$/, "Invalid serial number format")
  .min(6, "Serial number too short")
  .max(50, "Serial number too long")
  .describe("Equipment or asset serial number");

/**
 * Status field validator (generic)
 *
 * Aligns with BusinessTypeSchema: "status"
 */
export const statusSchema = z
  .string()
  .regex(/^[a-z_]+$/, "Status must be lowercase with underscores")
  .min(3, "Status too short")
  .max(30, "Status too long")
  .describe("Status field");

// ============================================================================
// JSON METADATA VALIDATORS (runtime type guard integration)
// ============================================================================

/**
 * JSON metadata validator using isJsonObject() runtime guard
 *
 * Ensures metadata field contains a valid JSON object for storing flexible,
 * type-safe metadata. Uses meta-types/core isJsonObject() for runtime validation.
 *
 * @example
 * const employeeSchema = createInsertSchema(employees).extend({
 *   metadata: metadataSchema,
 * });
 *
 * // Valid
 * metadataSchema.parse({ department: "IT", level: 5 }); // ✓
 * metadataSchema.parse({}); // ✓
 *
 * // Invalid
 * metadataSchema.parse(null); // ✗ Must be an object
 * metadataSchema.parse("string"); // ✗ Must be an object
 */
export const metadataSchema = z
  .record(z.string(), z.unknown())
  .refine((value) => isJsonObject(value), {
    message: "Metadata must be a valid JSON object",
  })
  .default({})
  .describe("Flexible metadata object for storing custom attributes");

/**
 * Optional/nullable plain JSON object (no default). Root value must be an object, not an array or primitive.
 * Use for nullable `jsonb` columns where the product stores a single object document (audience filters, pool criteria, etc.).
 */
export const jsonObjectNullishSchema = z
  .record(z.string(), z.unknown())
  .refine((value) => isJsonObject(value), {
    message: "Value must be a valid JSON object",
  })
  .nullish()
  .describe("Optional JSON object (plain object at root)");

// ---------------------------------------------------------------------------
// JSONB payload sizing + structured HR blobs (auditable defaults)
// ---------------------------------------------------------------------------

/** API validation caps (serialized UTF-16-ish length via JSON.stringify). Tune with ops; see HR_JSONB_INDEX_AND_PARTITION_RUNBOOK.md */
export const HR_JSONB_DEFAULT_MAX_BYTES = {
  biometricRawData: 65_536,
  recruitmentAutoAdvanceCriteria: 131_072,
  assessmentAnswers: 524_288,
  surveyQuestionsDocument: 1_048_576,
  surveyResponsesDocument: 1_048_576,
} as const;

export type HrJsonbPayloadCapKey = keyof typeof HR_JSONB_DEFAULT_MAX_BYTES;

/** Resolve max serialized JSON bytes (e.g. tenant tier overrides from app config). */
export function hrJsonbMaxBytes(
  key: HrJsonbPayloadCapKey,
  tenantOverrides?: Partial<Record<HrJsonbPayloadCapKey, number>>
): number {
  const o = tenantOverrides?.[key];
  return typeof o === "number" && o > 0 ? o : HR_JSONB_DEFAULT_MAX_BYTES[key];
}

export function addIssueIfSerializedJsonExceeds(
  val: unknown,
  ctx: z.RefinementCtx,
  maxBytes: number,
  path: PropertyKey[] = []
): void {
  if (val === undefined || val === null) return;
  try {
    if (JSON.stringify(val).length > maxBytes) {
      ctx.addIssue({
        code: "custom" as const,
        message: `JSON payload exceeds ${maxBytes} bytes (serialized length)`,
        path,
      });
    }
  } catch {
    ctx.addIssue({
      code: "custom" as const,
      message: "Value is not JSON-serializable",
      path,
    });
  }
}

const hrSurveyQuestionOptionSchema = z
  .object({
    value: z.string().min(1).max(500),
    label: z.string().min(1).max(500).optional(),
  })
  .passthrough();

const hrSurveyQuestionOptionEntrySchema = z.union([
  hrSurveyQuestionOptionSchema,
  z.string().min(1).max(500),
]);

/**
 * One ESS survey question: structured core fields + `.passthrough()` for tenant extensions (branching keys, scale metadata).
 * `prompt` / `text` / `label` and `type` / `kind` remain interchangeable for backward compatibility.
 */
export const hrSurveyQuestionSchema = z
  .object({
    questionId: z.string().min(1).max(128).optional(),
    prompt: z.string().min(1).max(5000).optional(),
    text: z.string().min(1).max(5000).optional(),
    label: z.string().min(1).max(5000).optional(),
    type: z.string().min(1).max(64).optional(),
    kind: z.string().min(1).max(64).optional(),
    options: z.array(hrSurveyQuestionOptionEntrySchema).max(500).optional(),
    required: z.boolean().optional(),
    scoringWeight: z.number().finite().min(0).max(100).optional(),
  })
  .passthrough()
  .superRefine((val, ctx) => {
    const prompt =
      typeof val.prompt === "string"
        ? val.prompt
        : typeof val.text === "string"
          ? val.text
          : typeof val.label === "string"
            ? val.label
            : null;
    if (prompt === null || prompt.length < 1 || prompt.length > 5000) {
      ctx.addIssue({
        code: "custom",
        message: "Each question must include prompt, text, or label (1-5000 characters)",
      });
    }
    const typ =
      typeof val.type === "string"
        ? val.type
        : typeof val.kind === "string"
          ? val.kind
          : null;
    if (typ === null || typ.length < 1 || typ.length > 64) {
      ctx.addIssue({
        code: "custom",
        message: "Each question must include type or kind (1-64 characters)",
        path: ["type"],
      });
    }
  });

/**
 * One survey answer row: string-keyed JSON map (structured `{ questionId, value }` or flat `{ q1: "yes" }`).
 */
export const hrSurveyResponseItemSchema = z
  .record(z.string(), z.json())
  .superRefine((val, ctx) => {
    if (Object.keys(val).length === 0) {
      ctx.addIssue({ code: "custom", message: "Each response item must be a non-empty object" });
    }
  });

/** Pipeline auto-advance rules: root must be object or array; bounded size. */
export const recruitmentAutoAdvanceCriteriaSchema = z
  .json()
  .optional()
  .superRefine((val, ctx) => {
    if (val === undefined) return;
    if (val === null || typeof val !== "object") {
      ctx.addIssue({
        code: "custom",
        message: "autoAdvanceCriteria must be a JSON object or array",
      });
      return;
    }
    addIssueIfSerializedJsonExceeds(
      val,
      ctx,
      HR_JSONB_DEFAULT_MAX_BYTES.recruitmentAutoAdvanceCriteria
    );
  });

/** Biometric vendor payload: object or array only, bounded size. */
export const biometricDevicePayloadSchema = z
  .json()
  .optional()
  .superRefine((val, ctx) => {
    if (val === undefined) return;
    if (val === null || typeof val !== "object") {
      ctx.addIssue({
        code: "custom",
        message: "rawData must be a JSON object or array",
      });
      return;
    }
    addIssueIfSerializedJsonExceeds(val, ctx, HR_JSONB_DEFAULT_MAX_BYTES.biometricRawData);
  });

const biometricLogRawDataObjectSchema = z
  .object({
    deviceEvent: z.string().max(500).optional(),
    payload: z.unknown().optional(),
  })
  .passthrough();

/**
 * Biometric log `raw_data`: preferred `{ deviceEvent?, payload? }` envelope with passthrough keys;
 * top-level JSON arrays still accepted for legacy vendor dumps.
 */
export const biometricLogRawDataSchema = z
  .union([biometricLogRawDataObjectSchema, z.array(z.unknown())])
  .optional()
  .superRefine((val, ctx) => {
    if (val === undefined) return;
    addIssueIfSerializedJsonExceeds(val, ctx, HR_JSONB_DEFAULT_MAX_BYTES.biometricRawData);
  });

/**
 * Strict metadata validator - no empty objects allowed
 *
 * Use when metadata is required to have at least one key-value pair.
 *
 * @example
 * strictMetadataSchema.parse({ key: "value" }); // ✓
 * strictMetadataSchema.parse({}); // ✗ Metadata cannot be empty
 */
export const strictMetadataSchema = z
  .record(z.string(), z.unknown())
  .refine((value) => isJsonObject(value) && Object.keys(value).length > 0, {
    message: "Metadata must be a non-empty JSON object",
  })
  .describe("Required metadata with at least one key-value pair");

/**
 * Typed metadata schema factory for structured metadata
 *
 * Creates a metadata validator that ensures a specific object shape.
 *
 * @example
 * const departmentMetadataSchema = createTypedMetadataSchema({
 *   budgetCode: z.string(),
 *   manager: z.string().optional(),
 * });
 *
 * // Valid
 * departmentMetadataSchema.parse({ budgetCode: "D001", manager: "John" }); // ✓
 *
 * // Invalid
 * departmentMetadataSchema.parse({ budgetCode: 123 }); // ✗ Wrong type
 */
export function createTypedMetadataSchema<T extends z.ZodRawShape>(
  shape: T,
  options?: { required?: boolean }
) {
  const { required = false } = options || {};
  const schema = z.object(shape);

  return z.record(z.string(), z.unknown()).refine(
    (value) => {
      if (!isJsonObject(value)) return false;
      if (required && Object.keys(value).length === 0) return false;

      try {
        schema.parse(value);
        return true;
      } catch {
        return false;
      }
    },
    {
      message: `Metadata must match expected structure${required ? " and not be empty" : ""}`,
    }
  );
}

export const employeeCodeSchema = z
  .string()
  .regex(/^[A-Z0-9-]+$/, "Employee code must contain only uppercase letters, numbers, and hyphens")
  .min(3, "Employee code must be at least 3 characters")
  .max(20, "Employee code must not exceed 20 characters");

// ============================================================================
// WORKFLOW STATE VALIDATORS (meta-types/workflow integration)
// ============================================================================

/**
 * Workflow state transition validator generator
 * Ensures state transitions follow defined workflow rules
 */
export function createWorkflowStateSchema<S extends string>(workflowDef: {
  states: readonly S[];
  transitions: Record<S, readonly S[]>;
}) {
  return z
    .object({
      currentState: z.enum(workflowDef.states as [S, ...S[]]),
      nextState: z.enum(workflowDef.states as [S, ...S[]]),
    })
    .refine(
      (data) => {
        const allowedTransitions = workflowDef.transitions[data.currentState] || [];
        return allowedTransitions.includes(data.nextState);
      },
      {
        message: "Invalid state transition",
        path: ["nextState"],
      }
    );
}

/**
 * Leave request workflow — states match `standardApprovalWorkflowStatuses` / `leave_status` pgEnum.
 */
export const leaveRequestWorkflow = {
  states: standardApprovalWorkflowStatuses,
  transitions: {
    draft: ["submitted", "cancelled"],
    submitted: ["approved", "rejected", "cancelled"],
    approved: ["cancelled"],
    rejected: [],
    cancelled: [],
  },
} as const;

export const leaveRequestStateSchema = createWorkflowStateSchema(leaveRequestWorkflow);

/**
 * Recruitment workflow states
 */
export const recruitmentWorkflow = {
  states: [
    "received",
    "screening",
    "shortlisted",
    "interview_scheduled",
    "interviewed",
    "offer_extended",
    "offer_accepted",
    "offer_rejected",
    "rejected",
    "withdrawn",
  ] as const,
  transitions: {
    received: ["screening", "rejected", "withdrawn"],
    screening: ["shortlisted", "rejected", "withdrawn"],
    shortlisted: ["interview_scheduled", "rejected", "withdrawn"],
    interview_scheduled: ["interviewed", "withdrawn"],
    interviewed: ["offer_extended", "rejected", "withdrawn"],
    offer_extended: ["offer_accepted", "offer_rejected", "withdrawn"],
    offer_accepted: [],
    offer_rejected: [],
    rejected: [],
    withdrawn: [],
  },
} as const;

export const recruitmentStateSchema = createWorkflowStateSchema(recruitmentWorkflow);

/**
 * Payroll status workflow
 */
export const payrollWorkflow = {
  states: ["draft", "computed", "approved", "paid", "cancelled"] as const,
  transitions: {
    draft: ["computed", "cancelled"],
    computed: ["approved", "draft", "cancelled"],
    approved: ["paid", "cancelled"],
    paid: [],
    cancelled: [],
  },
} as const;

export const payrollStateSchema = createWorkflowStateSchema(payrollWorkflow);

/**
 * Benefits enrollment workflow
 */
export const benefitsEnrollmentWorkflow = {
  states: ["pending", "active", "cancelled", "expired"] as const,
  transitions: {
    pending: ["active", "cancelled"],
    active: ["cancelled", "expired"],
    cancelled: [],
    expired: [],
  },
} as const;

export const benefitsEnrollmentStateSchema = createWorkflowStateSchema(benefitsEnrollmentWorkflow);

/**
 * Claims processing workflow
 */
export const claimsProcessingWorkflow = {
  states: ["submitted", "under_review", "approved", "rejected", "paid"] as const,
  transitions: {
    submitted: ["under_review", "rejected"],
    under_review: ["approved", "rejected"],
    approved: ["paid"],
    rejected: [],
    paid: [],
  },
} as const;

export const claimsProcessingStateSchema = createWorkflowStateSchema(claimsProcessingWorkflow);

/**
 * Performance review workflow
 */
export const performanceReviewWorkflow = {
  states: ["not_started", "in_progress", "submitted", "reviewed", "approved", "rejected"] as const,
  transitions: {
    not_started: ["in_progress"],
    in_progress: ["submitted"],
    submitted: ["reviewed", "in_progress"],
    reviewed: ["approved", "rejected", "submitted"],
    approved: [],
    rejected: ["in_progress"],
  },
} as const;

export const performanceReviewStateSchema = createWorkflowStateSchema(performanceReviewWorkflow);

/**
 * Training enrollment workflow
 */
export const trainingEnrollmentWorkflow = {
  states: ["registered", "in_progress", "completed", "cancelled", "failed"] as const,
  transitions: {
    registered: ["in_progress", "cancelled"],
    in_progress: ["completed", "failed", "cancelled"],
    completed: [],
    cancelled: [],
    failed: ["registered"],
  },
} as const;

export const trainingEnrollmentStateSchema = createWorkflowStateSchema(trainingEnrollmentWorkflow);

/**
 * Contract lifecycle workflow
 */
export const contractLifecycleWorkflow = {
  states: ["draft", "active", "expired", "terminated", "renewed"] as const,
  transitions: {
    draft: ["active"],
    active: ["expired", "terminated", "renewed"],
    expired: ["renewed"],
    terminated: [],
    renewed: ["active"],
  },
} as const;

export const contractLifecycleStateSchema = createWorkflowStateSchema(contractLifecycleWorkflow);

/**
 * Onboarding workflow
 */
export const onboardingWorkflow = {
  states: ["not_started", "in_progress", "completed", "cancelled"] as const,
  transitions: {
    not_started: ["in_progress", "cancelled"],
    in_progress: ["completed", "cancelled"],
    completed: [],
    cancelled: [],
  },
} as const;

export const onboardingStateSchema = createWorkflowStateSchema(onboardingWorkflow);

/**
 * Grievance workflow states
 */
export const grievanceWorkflow = {
  states: [
    "submitted",
    "acknowledged",
    "under_investigation",
    "resolved",
    "closed",
    "appealed",
    "withdrawn",
  ] as const,
  transitions: {
    submitted: ["acknowledged", "withdrawn"],
    acknowledged: ["under_investigation", "resolved", "withdrawn"],
    under_investigation: ["resolved", "withdrawn"],
    resolved: ["closed", "appealed"],
    closed: [],
    appealed: ["under_investigation", "resolved"],
    withdrawn: [],
  },
} as const;

export const grievanceStateSchema = createWorkflowStateSchema(grievanceWorkflow);

/**
 * Loan lifecycle workflow states
 */
export const loanWorkflow = {
  states: [
    "applied",
    "approved",
    "disbursed",
    "repaying",
    "completed",
    "defaulted",
    "cancelled",
  ] as const,
  transitions: {
    applied: ["approved", "cancelled"],
    approved: ["disbursed", "cancelled"],
    disbursed: ["repaying"],
    repaying: ["completed", "defaulted"],
    completed: [],
    defaulted: [],
    cancelled: [],
  },
} as const;

export const loanStateSchema = createWorkflowStateSchema(loanWorkflow);

/**
 * Shift swap request workflow (counterparty + manager gates)
 */
export const shiftSwapWorkflow = {
  states: [
    "draft",
    "submitted",
    "counterparty_pending",
    "counterparty_accepted",
    "counterparty_declined",
    "manager_pending",
    "approved",
    "rejected",
    "cancelled",
    "completed",
  ] as const,
  transitions: {
    draft: ["submitted", "cancelled"],
    submitted: ["counterparty_pending", "cancelled"],
    counterparty_pending: ["counterparty_accepted", "counterparty_declined", "cancelled"],
    counterparty_accepted: ["manager_pending", "cancelled"],
    counterparty_declined: ["cancelled"],
    manager_pending: ["approved", "rejected", "cancelled"],
    approved: ["completed", "cancelled"],
    rejected: [],
    cancelled: [],
    completed: [],
  },
} as const;

export const shiftSwapStateSchema = createWorkflowStateSchema(shiftSwapWorkflow);

// ============================================================================
// CROSS-FIELD REFINEMENTS
// Reusable superRefine callbacks mirroring CHECK constraints.
// Usage: createInsertSchema(table).superRefine(refineEndDateOnOrAfterStartDate())
// ============================================================================

/**
 * Validates endDate >= startDate when both are present.
 * Mirrors CHECK constraints: payroll_periods_date_range, leave_requests_date_range,
 * time_sheets_date_range, training_sessions_dates_check.
 */
export function refineEndDateOnOrAfterStartDate<
  T extends { startDate: string | Date; endDate?: string | Date | null },
>(message = "End date must be on or after start date") {
  return (data: T, ctx: z.RefinementCtx) => {
    if (data.endDate == null) return;
    const start =
      data.startDate instanceof Date ? data.startDate.getTime() : Date.parse(data.startDate);
    const end = data.endDate instanceof Date ? data.endDate.getTime() : Date.parse(data.endDate);
    if (Number.isNaN(start) || Number.isNaN(end)) return;
    if (end < start) {
      ctx.addIssue({ code: "custom", message, path: ["endDate"] });
    }
  };
}

/**
 * Validates terminationDate >= hireDate when terminationDate is set.
 * Mirrors business rule: employee cannot be terminated before being hired.
 */
export function refineTerminationAfterHire<
  T extends { hireDate: string | Date; terminationDate?: string | Date | null },
>(message = "Termination date must be on or after hire date") {
  return (data: T, ctx: z.RefinementCtx) => {
    if (data.terminationDate == null) return;
    const hire =
      data.hireDate instanceof Date ? data.hireDate.getTime() : Date.parse(data.hireDate);
    const term =
      data.terminationDate instanceof Date
        ? data.terminationDate.getTime()
        : Date.parse(data.terminationDate);
    if (Number.isNaN(hire) || Number.isNaN(term)) return;
    if (term < hire) {
      ctx.addIssue({ code: "custom", message, path: ["terminationDate"] });
    }
  };
}

/**
 * Validates that a numeric string field is non-negative (>= 0).
 * Mirrors CHECK constraints: employee_salaries_amount_positive,
 * payroll_entries_gross_positive, payroll_entries_net_positive,
 * expense_claims_total_amount_check, leave_allocations_balance_valid.
 */
export function refineNonNegativeAmount(field: string, message = "Amount must be non-negative") {
  return (data: Record<string, unknown>, ctx: z.RefinementCtx) => {
    const value = data[field];
    if (value == null) return;
    if (Number(value) < 0) {
      ctx.addIssue({ code: "custom", message, path: [field] });
    }
  };
}

/**
 * Validates that a numeric string field is strictly positive (> 0).
 * Mirrors CHECK constraints: leave_requests_days_positive,
 * payroll_lines_quantity_positive, expense_lines_amount_check,
 * shift_schedules_working_hours_positive, onboarding_tasks_order_check.
 */
export function refinePositiveAmount(field: string, message = "Amount must be positive") {
  return (data: Record<string, unknown>, ctx: z.RefinementCtx) => {
    const value = data[field];
    if (value == null) return;
    if (Number(value) <= 0) {
      ctx.addIssue({ code: "custom", message, path: [field] });
    }
  };
}

/**
 * Validates that hours are within 0–24.
 * Mirrors CHECK: time_sheet_lines_hours_valid.
 */
export function refineBoundedHours(field: string, min = 0, max = 24, message?: string) {
  return (data: Record<string, unknown>, ctx: z.RefinementCtx) => {
    const value = data[field];
    if (value == null) return;
    const num = Number(value);
    if (num < min || num > max) {
      ctx.addIssue({
        code: "custom",
        message: message ?? `${field} must be between ${min} and ${max}`,
        path: [field],
      });
    }
  };
}

// ============================================================================
// ENHANCED CROSS-FIELD REFINEMENTS (meta-types integration)
// ============================================================================

/**
 * **Zod 4 ISO strings**
 *
 * - Calendar dates (`YYYY-MM-DD`): `z.iso.date()` — not `z.string().date()`.
 * - Instants: `z.iso.datetime()` — not `z.string().datetime()`.
 * - Time of day: `z.iso.time()` — not `z.string().time()`.
 * - ISO durations: `z.iso.duration()` — not `z.string().duration()`.
 *
 * Upstream: `node_modules/zod/v4/classic/schemas.d.ts` (`ZodString#date`, `#datetime`, `#time`, `#duration`).
 *
 * HR insert schemas import `z` from `zod/v4` and align string columns with Drizzle `date` / `timestamp`
 * modes.
 */

/**
 * Generic date range validator factory
 * Validates that endField >= startField when both are present
 *
 * @example
 * createInsertSchema(contracts).superRefine(refineDateRange("startDate", "endDate"))
 */
export function refineDateRange<T extends Record<string, unknown>>(
  startField: keyof T,
  endField: keyof T,
  options?: {
    message?: string;
    allowSameDate?: boolean;
  }
) {
  const { message, allowSameDate = true } = options || {};
  return (data: T, ctx: z.RefinementCtx) => {
    const startValue = data[startField];
    const endValue = data[endField];

    if (startValue == null || endValue == null) return;

    const start =
      startValue instanceof Date ? startValue.getTime() : Date.parse(String(startValue));
    const end = endValue instanceof Date ? endValue.getTime() : Date.parse(String(endValue));

    if (Number.isNaN(start) || Number.isNaN(end)) return;

    const isValid = allowSameDate ? end >= start : end > start;

    if (!isValid) {
      ctx.addIssue({
        code: "custom",
        message:
          message ||
          `${String(endField)} must be ${allowSameDate ? "on or after" : "after"} ${String(startField)}`,
        path: [String(endField)],
      });
    }
  };
}

/**
 * Generic amount range validator factory
 * Validates that a numeric field falls within a specified range
 *
 * @example
 * createInsertSchema(salaries).superRefine(refineAmountRange("amount", { min: 0, max: 999999.99 }))
 */
export function refineAmountRange<T extends Record<string, unknown>>(
  field: keyof T,
  options: {
    min?: number;
    max?: number;
    message?: string;
  }
) {
  const { min, max, message } = options;
  return (data: T, ctx: z.RefinementCtx) => {
    const value = data[field];
    if (value == null) return;

    const num = typeof value === "number" ? value : Number(value);

    if (Number.isNaN(num)) return;

    let isInvalid = false;
    let defaultMessage = "";

    if (min !== undefined && max !== undefined) {
      isInvalid = num < min || num > max;
      defaultMessage = `${String(field)} must be between ${min} and ${max}`;
    } else if (min !== undefined) {
      isInvalid = num < min;
      defaultMessage = `${String(field)} must be at least ${min}`;
    } else if (max !== undefined) {
      isInvalid = num > max;
      defaultMessage = `${String(field)} must be at most ${max}`;
    }

    if (isInvalid) {
      ctx.addIssue({
        code: "custom",
        message: message || defaultMessage,
        path: [String(field)],
      });
    }
  };
}

/**
 * Conditional required field validator factory
 * Makes a field required when a condition is met
 *
 * @example
 * createInsertSchema(employees).superRefine(
 *   refineConditionalRequired("terminationReason", (data) => data.terminationDate != null)
 * )
 */
export function refineConditionalRequired<T extends Record<string, unknown>>(
  field: keyof T,
  condition: (data: T) => boolean,
  message?: string
) {
  return (data: T, ctx: z.RefinementCtx) => {
    if (condition(data) && (data[field] == null || data[field] === "")) {
      ctx.addIssue({
        code: "custom",
        message: message || `${String(field)} is required when condition is met`,
        path: [String(field)],
      });
    }
  };
}

/**
 * When `statusField` equals `approvedValue`, require a non-null actor (e.g. `approvedBy`, `decidedBy`).
 * Optionally require a decision timestamp column (`approvedAt`, `decidedAt`).
 */
export function refineApprovedRequiresActor<T extends Record<string, unknown>>(params: {
  statusField: keyof T;
  approvedValue: string;
  actorField: keyof T;
  atField?: keyof T;
  messages?: { actor?: string; at?: string };
}): (data: T, ctx: z.RefinementCtx) => void {
  const { statusField, approvedValue, actorField, atField, messages } = params;
  return (data: T, ctx: z.RefinementCtx) => {
    if (String(data[statusField]) !== approvedValue) return;
    const actor = data[actorField];
    if (actor == null || actor === "") {
      ctx.addIssue({
        code: "custom",
        message:
          messages?.actor ??
          `${String(actorField)} is required when ${String(statusField)} is ${approvedValue}`,
        path: [String(actorField)],
      });
    }
    if (atField != null) {
      const at = data[atField];
      if (at == null || at === "") {
        ctx.addIssue({
          code: "custom",
          message:
            messages?.at ??
            `${String(atField)} is required when ${String(statusField)} is ${approvedValue}`,
          path: [String(atField)],
        });
      }
    }
  };
}

/**
 * When `statusField` equals `rejectedValue`, require a non-empty reason string (`rejectionReason`, `decisionReason`, …).
 */
export function refineRejectedRequiresReason<T extends Record<string, unknown>>(params: {
  statusField: keyof T;
  rejectedValue: string;
  reasonField: keyof T;
  trim?: boolean;
  message?: string;
}): (data: T, ctx: z.RefinementCtx) => void {
  const { statusField, rejectedValue, reasonField, trim = true, message } = params;
  return (data: T, ctx: z.RefinementCtx) => {
    if (String(data[statusField]) !== rejectedValue) return;
    const raw = data[reasonField];
    const str = raw == null ? "" : String(raw);
    const ok = trim ? str.trim().length > 0 : str.length > 0;
    if (!ok) {
      ctx.addIssue({
        code: "custom",
        message:
          message ??
          `${String(reasonField)} is required when ${String(statusField)} is ${rejectedValue}`,
        path: [String(reasonField)],
      });
    }
  };
}

/**
 * When `statusField` is not `approvedValue`, approval stamp fields must be unset (mirrors common `CHECK` pairs on HR tables).
 */
export function refineApprovalFieldsAbsentUnlessApproved<T extends Record<string, unknown>>(params: {
  statusField: keyof T;
  approvedValue: string;
  actorField: keyof T;
  atField?: keyof T;
  messages?: { actor?: string; at?: string };
}): (data: T, ctx: z.RefinementCtx) => void {
  const { statusField, approvedValue, actorField, atField, messages } = params;
  const isSet = (v: unknown) => v != null && v !== "";
  return (data: T, ctx: z.RefinementCtx) => {
    if (String(data[statusField]) === approvedValue) return;
    if (isSet(data[actorField])) {
      ctx.addIssue({
        code: "custom",
        message:
          messages?.actor ??
          `${String(actorField)} must be omitted unless ${String(statusField)} is ${approvedValue}`,
        path: [String(actorField)],
      });
    }
    if (atField != null && isSet(data[atField])) {
      ctx.addIssue({
        code: "custom",
        message:
          messages?.at ??
          `${String(atField)} must be omitted unless ${String(statusField)} is ${approvedValue}`,
        path: [String(atField)],
      });
    }
  };
}

/**
 * When `statusField` is not `rejectedValue`, the rejection reason field must be empty/absent.
 */
export function refineReasonAbsentUnlessRejected<T extends Record<string, unknown>>(params: {
  statusField: keyof T;
  rejectedValue: string;
  reasonField: keyof T;
  message?: string;
}): (data: T, ctx: z.RefinementCtx) => void {
  const { statusField, rejectedValue, reasonField, message } = params;
  return (data: T, ctx: z.RefinementCtx) => {
    if (String(data[statusField]) === rejectedValue) return;
    const raw = data[reasonField];
    if (raw != null && String(raw).trim() !== "") {
      ctx.addIssue({
        code: "custom",
        message:
          message ??
          `${String(reasonField)} must be omitted unless ${String(statusField)} is ${rejectedValue}`,
        path: [String(reasonField)],
      });
    }
  };
}

/**
 * When `status` is one of `statusesWithApprovalStamp`, require approver (+ optional timestamp);
 * otherwise both must be absent. Use for `completed` / `paid` style workflows.
 */
export function refineApprovalStampLifecycle<T extends Record<string, unknown>>(params: {
  statusField: keyof T;
  statusesWithApprovalStamp: readonly string[];
  actorField: keyof T;
  atField?: keyof T;
  messages?: {
    requireActor?: string;
    requireAt?: string;
    omitActor?: string;
    omitAt?: string;
  };
}): (data: T, ctx: z.RefinementCtx) => void {
  const { statusField, statusesWithApprovalStamp, actorField, atField, messages } = params;
  const stampStatuses = new Set(statusesWithApprovalStamp);
  const isSet = (v: unknown) => v != null && v !== "";
  const label = statusesWithApprovalStamp.join(", ");
  return (data: T, ctx: z.RefinementCtx) => {
    const st = String(data[statusField]);
    if (stampStatuses.has(st)) {
      const actor = data[actorField];
      if (actor == null || actor === "") {
        ctx.addIssue({
          code: "custom",
          message:
            messages?.requireActor ??
            `${String(actorField)} is required when ${String(statusField)} is one of: ${label}`,
          path: [String(actorField)],
        });
      }
      if (atField != null) {
        const at = data[atField];
        if (at == null || at === "") {
          ctx.addIssue({
            code: "custom",
            message:
              messages?.requireAt ??
              `${String(atField)} is required when ${String(statusField)} is one of: ${label}`,
            path: [String(atField)],
          });
        }
      }
    } else {
      if (isSet(data[actorField])) {
        ctx.addIssue({
          code: "custom",
          message:
            messages?.omitActor ??
            `${String(actorField)} must be omitted unless ${String(statusField)} is one of: ${label}`,
          path: [String(actorField)],
        });
      }
      if (atField != null && isSet(data[atField])) {
        ctx.addIssue({
          code: "custom",
          message:
            messages?.omitAt ??
            `${String(atField)} must be omitted unless ${String(statusField)} is one of: ${label}`,
          path: [String(atField)],
        });
      }
    }
  };
}

/**
 * Enum value validator factory
 * Validates that a field's value is within a specified enum set
 *
 * @example
 * createInsertSchema(employees).superRefine(
 *   refineEnumValue("status", ["active", "inactive", "terminated"])
 * )
 */
export function refineEnumValue<T extends Record<string, unknown>>(
  field: keyof T,
  allowedValues: readonly string[],
  message?: string
) {
  return (data: T, ctx: z.RefinementCtx) => {
    const value = data[field];
    if (value == null) return;

    if (!allowedValues.includes(String(value))) {
      ctx.addIssue({
        code: "custom",
        message: message || `${String(field)} must be one of: ${allowedValues.join(", ")}`,
        path: [String(field)],
      });
    }
  };
}

/**
 * Mutually exclusive fields validator
 * Ensures that only one of the specified fields is set
 *
 * @example
 * createInsertSchema(payments).superRefine(
 *   refineMutuallyExclusive(["cashAmount", "bankTransferAmount"], "Only one payment method allowed")
 * )
 */
export function refineMutuallyExclusive<T extends Record<string, unknown>>(
  fields: (keyof T)[],
  message?: string
) {
  return (data: T, ctx: z.RefinementCtx) => {
    const setFields = fields.filter((field) => {
      const value = data[field];
      return value != null && value !== "" && value !== 0;
    });

    if (setFields.length > 1) {
      ctx.addIssue({
        code: "custom",
        message: message || `Only one of these fields can be set: ${fields.map(String).join(", ")}`,
        path: [String(setFields[0])],
      });
    }
  };
}

/**
 * At least one required validator
 * Ensures that at least one of the specified fields is set
 *
 * @example
 * createInsertSchema(contacts).superRefine(
 *   refineAtLeastOne(["email", "phone"], "Provide at least one contact method")
 * )
 */
export function refineAtLeastOne<T extends Record<string, unknown>>(
  fields: (keyof T)[],
  message?: string
) {
  return (data: T, ctx: z.RefinementCtx) => {
    const hasAny = fields.some((field) => {
      const value = data[field];
      return value != null && value !== "" && value !== 0;
    });

    if (!hasAny) {
      ctx.addIssue({
        code: "custom",
        message:
          message || `At least one of these fields must be set: ${fields.map(String).join(", ")}`,
        path: [String(fields[0])],
      });
    }
  };
}

/**
 * Unique array values validator
 * Ensures all array elements are unique
 *
 * @example
 * createInsertSchema(courses).superRefine(refineUniqueArray("tags"))
 */
export function refineUniqueArray<T extends Record<string, unknown>>(
  field: keyof T,
  message?: string
) {
  return (data: T, ctx: z.RefinementCtx) => {
    const value = data[field];
    if (!Array.isArray(value)) return;

    const uniqueValues = new Set(value.map((v) => JSON.stringify(v)));

    if (uniqueValues.size !== value.length) {
      ctx.addIssue({
        code: "custom",
        message: message || `${String(field)} must contain unique values`,
        path: [String(field)],
      });
    }
  };
}

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type EmployeeId = z.infer<typeof EmployeeIdSchema>;
export type DepartmentId = z.infer<typeof DepartmentIdSchema>;
export type JobTitleId = z.infer<typeof JobTitleIdSchema>;
export type JobPositionId = z.infer<typeof JobPositionIdSchema>;
export type EmploymentContractId = z.infer<typeof EmploymentContractIdSchema>;
export type SalaryComponentId = z.infer<typeof SalaryComponentIdSchema>;
export type EmployeeSalaryId = z.infer<typeof EmployeeSalaryIdSchema>;
export type PayrollPeriodId = z.infer<typeof PayrollPeriodIdSchema>;
export type PayrollEntryId = z.infer<typeof PayrollEntryIdSchema>;
export type PayrollLineId = z.infer<typeof PayrollLineIdSchema>;
export type LeaveTypeConfigId = z.infer<typeof LeaveTypeConfigIdSchema>;
export type LeaveAllocationId = z.infer<typeof LeaveAllocationIdSchema>;
export type LeaveRequestId = z.infer<typeof LeaveRequestIdSchema>;
export type LeaveRequestStatusHistoryId = z.infer<typeof LeaveRequestStatusHistoryIdSchema>;
export type HolidayCalendarId = z.infer<typeof HolidayCalendarIdSchema>;
export type HolidayId = z.infer<typeof HolidayIdSchema>;
export type TimeSheetId = z.infer<typeof TimeSheetIdSchema>;
export type TimeSheetLineId = z.infer<typeof TimeSheetLineIdSchema>;
export type AttendanceRecordId = z.infer<typeof AttendanceRecordIdSchema>;
export type ShiftScheduleId = z.infer<typeof ShiftScheduleIdSchema>;
export type ShiftAssignmentId = z.infer<typeof ShiftAssignmentIdSchema>;
export type BenefitPlanId = z.infer<typeof BenefitPlanIdSchema>;
export type EmployeeBenefitId = z.infer<typeof EmployeeBenefitIdSchema>;
export type PerformanceReviewCycleId = z.infer<typeof PerformanceReviewCycleIdSchema>;
export type PerformanceReviewId = z.infer<typeof PerformanceReviewIdSchema>;
export type ReviewQuestionId = z.infer<typeof ReviewQuestionIdSchema>;
export type ReviewAnswerId = z.infer<typeof ReviewAnswerIdSchema>;
export type GoalId = z.infer<typeof GoalIdSchema>;
export type GoalUpdateId = z.infer<typeof GoalUpdateIdSchema>;
export type SkillId = z.infer<typeof SkillIdSchema>;
export type EmployeeSkillId = z.infer<typeof EmployeeSkillIdSchema>;
export type CertificationId = z.infer<typeof CertificationIdSchema>;
export type EmployeeCertificationId = z.infer<typeof EmployeeCertificationIdSchema>;
export type JobOpeningId = z.infer<typeof JobOpeningIdSchema>;
export type JobApplicationId = z.infer<typeof JobApplicationIdSchema>;
export type InterviewId = z.infer<typeof InterviewIdSchema>;
export type InterviewerFeedbackId = z.infer<typeof InterviewerFeedbackIdSchema>;
export type JobOfferId = z.infer<typeof JobOfferIdSchema>;
export type TrainingProgramId = z.infer<typeof TrainingProgramIdSchema>;
export type TrainingSessionId = z.infer<typeof TrainingSessionIdSchema>;
export type TrainingAttendanceId = z.infer<typeof TrainingAttendanceIdSchema>;
export type EmployeeDocumentId = z.infer<typeof EmployeeDocumentIdSchema>;
export type ExpenseClaimId = z.infer<typeof ExpenseClaimIdSchema>;
export type ExpenseLineId = z.infer<typeof ExpenseLineIdSchema>;
export type DisciplinaryActionId = z.infer<typeof DisciplinaryActionIdSchema>;
export type EmployeeDependentId = z.infer<typeof EmployeeDependentIdSchema>;
export type EmergencyContactId = z.infer<typeof EmergencyContactIdSchema>;
export type ExitInterviewId = z.infer<typeof ExitInterviewIdSchema>;
export type EmployeeMovementId = z.infer<typeof EmployeeMovementIdSchema>;
export type OnboardingChecklistId = z.infer<typeof OnboardingChecklistIdSchema>;
export type OnboardingTaskId = z.infer<typeof OnboardingTaskIdSchema>;
export type OnboardingProgressId = z.infer<typeof OnboardingProgressIdSchema>;
export type CostCenterId = z.infer<typeof CostCenterIdSchema>;
export type EmployeeCostAllocationId = z.infer<typeof EmployeeCostAllocationIdSchema>;

// ============================================================================
// NEW TYPE EXPORTS (Phase 1-4 Enhancement)
// ============================================================================

// Benefits Domain (Phase 1)
export type BenefitProviderId = z.infer<typeof BenefitProviderIdSchema>;
export type BenefitEnrollmentId = z.infer<typeof BenefitEnrollmentIdSchema>;
export type BenefitDependentCoverageId = z.infer<typeof BenefitDependentCoverageIdSchema>;
export type BenefitClaimId = z.infer<typeof BenefitClaimIdSchema>;
export type BenefitPlanBenefitId = z.infer<typeof BenefitPlanBenefitIdSchema>;

// Learning Domain (Phase 2)
export type CourseId = z.infer<typeof CourseIdSchema>;
export type CourseModuleId = z.infer<typeof CourseModuleIdSchema>;
export type LearningPathId = z.infer<typeof LearningPathIdSchema>;
export type AssessmentId = z.infer<typeof AssessmentIdSchema>;
export type AssessmentQuestionId = z.infer<typeof AssessmentQuestionIdSchema>;
export type CourseSessionId = z.infer<typeof CourseSessionIdSchema>;
export type CourseEnrollmentId = z.infer<typeof CourseEnrollmentIdSchema>;
export type LearningProgressId = z.infer<typeof LearningProgressIdSchema>;
export type TrainingFeedbackId = z.infer<typeof TrainingFeedbackIdSchema>;
export type TrainingCostId = z.infer<typeof TrainingCostIdSchema>;
export type LearningPathEnrollmentId = z.infer<typeof LearningPathEnrollmentIdSchema>;
export type AssessmentAttemptId = z.infer<typeof AssessmentAttemptIdSchema>;
export type CertificateId = z.infer<typeof CertificateIdSchema>;
export type CoursePrerequisiteId = z.infer<typeof CoursePrerequisiteIdSchema>;
export type CourseMaterialId = z.infer<typeof CourseMaterialIdSchema>;

// Payroll Enhancement (Phase 3)
export type TaxBracketId = z.infer<typeof TaxBracketIdSchema>;
export type StatutoryDeductionId = z.infer<typeof StatutoryDeductionIdSchema>;
export type PayrollAdjustmentId = z.infer<typeof PayrollAdjustmentIdSchema>;
export type PayslipId = z.infer<typeof PayslipIdSchema>;
export type PaymentDistributionId = z.infer<typeof PaymentDistributionIdSchema>;

// Recruitment Enhancement (Phase 4)
export type ApplicantDocumentId = z.infer<typeof ApplicantDocumentIdSchema>;
export type InterviewFeedbackFormId = z.infer<typeof InterviewFeedbackFormIdSchema>;
export type OfferLetterId = z.infer<typeof OfferLetterIdSchema>;

// HR upgrade guide closures
export type HrPolicyDocumentId = z.infer<typeof HrPolicyDocumentIdSchema>;
export type EmployeePolicyAcknowledgmentId = z.infer<typeof EmployeePolicyAcknowledgmentIdSchema>;
export type ShiftSwapRequestId = z.infer<typeof ShiftSwapRequestIdSchema>;

// ============================================================================
// EXPORT SUMMARY & DEVELOPER REFERENCE
// ============================================================================

/**
 * PHASE 0 VALIDATION LIBRARY - Complete Export Summary
 *
 * This file exports three categories of validators:
 *
 * 1. BRANDED ID TYPES (70+ schemas)
 *    └─ All HR entity identifiers: Employee, Department, LeaveRequest, etc.
 *    └─ Usage: import { EmployeeIdSchema, type EmployeeId } from "./_zodShared"
 *
 * 2. BUSINESS TYPE VALIDATORS (20+ schemas)
 *    ├─ Core: businessEmailSchema, internationalPhoneSchema, currencyAmountSchema
 *    ├─ Financial: bankAccountSchema, ibanSchema, swiftCodeSchema
 *    ├─ Government: taxIdSchemaFactory, ssnSchema, vatNumberSchema
 *    ├─ Personal: personNameSchema, postalCodeSchema
 *    ├─ Reference: documentRefSchema, serialNumberSchema, statusSchema
 *    ├─ Metadata: metadataSchema, strictMetadataSchema, createTypedMetadataSchema
 *    └─ Usage: import { businessEmailSchema, currencyAmountSchema } from "./_zodShared"
 *
 * 3. WORKFLOW STATE VALIDATORS (8 workflows)
 *    ├─ leaveRequestWorkflow → draft → submitted → approved/rejected → cancelled
 *    ├─ recruitmentWorkflow → received → ... → offer_accepted/rejected
 *    ├─ payrollWorkflow → draft → computed → approved → paid
 *    ├─ benefitsEnrollmentWorkflow → pending → active → cancelled/expired
 *    ├─ claimsProcessingWorkflow → submitted → under_review → approved/rejected → paid
 *    ├─ performanceReviewWorkflow → not_started → in_progress → submitted → reviewed → approved/rejected
 *    ├─ trainingEnrollmentWorkflow → registered → in_progress → completed/failed
 *    ├─ contractLifecycleWorkflow → draft → active → expired/terminated/renewed
 *    ├─ onboardingWorkflow → not_started → in_progress → completed
 *    ├─ grievanceWorkflow → submitted → acknowledged → investigation → resolved → closed/appealed
 *    ├─ loanWorkflow → applied → disbursed → repaying → completed/defaulted
 *    ├─ shiftSwapWorkflow → draft → counterparty → manager → approved → completed
 *    └─ Usage: import { leaveRequestStateSchema } from "./_zodShared"
 *
 * 4. CROSS-FIELD REFINEMENTS (15+ factories)
 *    ├─ Date range: refineEndDateOnOrAfterStartDate, refineDateRange, refineTerminationAfterHire
 *    ├─ Amount validation: refineNonNegativeAmount, refinePositiveAmount, refineAmountRange, refineBoundedHours, currencyAmountFromNumberSchema
 *    ├─ Conditional logic: refineConditionalRequired, refineEnumValue, refineApprovedRequiresActor, refineRejectedRequiresReason, refineApprovalFieldsAbsentUnlessApproved, refineReasonAbsentUnlessRejected, refineApprovalStampLifecycle
 *    ├─ Complex patterns: refineMutuallyExclusive, refineAtLeastOne, refineUniqueArray
 *    └─ Usage: createInsertSchema(table).superRefine(refineEndDateOnOrAfterStartDate())
 *
 * 5. IDENTIFIER / CODE HELPERS
 *    └─ employeeCodeSchema (HR employee codes)
 *
 * **Integration Examples:**
 *
 * Example 1: Simple business type validation
 * ```ts
 * const employeeSchema = createInsertSchema(employees).extend({
 *   email: businessEmailSchema,
 *   phone: internationalPhoneSchema,
 *   salary: currencyAmountSchema(2),
 * });
 * ```
 *
 * Example 2: Workflow state transition
 * ```ts
 * const leaveRequestSchema = createInsertSchema(leaveRequests)
 *   .extend({ currentState: z.enum(leaveRequestWorkflow.states) })
 *   .superRefine(leaveRequestStateSchema);
 * ```
 *
 * Example 3: Complex cross-field refinement
 * ```ts
 * const contractSchema = createInsertSchema(contracts)
 *   .extend({
 *     startDate: z.coerce.date(),
 *     endDate: z.coerce.date().optional(),
 *   })
 *   .superRefine(refineDateRange("startDate", "endDate", { allowSameDate: false }))
 *   .superRefine(refineConditionalRequired("terminationReason",
 *     (data) => data.status === "terminated"
 *   ));
 * ```
 *
 * Example 4: Metadata with type safety
 * ```ts
 * const departmentMetadata = createTypedMetadataSchema({
 *   budgetCode: z.string(),
 *   manager: z.string().optional(),
 *   tags: z.array(z.string()),
 * }, { required: true });
 *
 * const departmentSchema = createInsertSchema(departments).extend({
 *   metadata: departmentMetadata,
 * });
 * ```
 *
 * **Testing Coverage:**
 * All validators are tested in packages/db/src/schema/hr/__tests__/_zodShared.test.ts
 * - Unit tests for each business type validator
 * - Workflow state transition tests
 * - Cross-field refinement edge cases
 * - Metadata validation with isJsonObject() guard
 *
 * **Phase Roadmap:**
 * ✅ Phase 0 (Complete): Foundation Enhancement - THIS FILE
 * 📋 Phase 1: Benefits Domain (benefitProviders, benefitPlans, benefitEnrollments, etc.)
 * 📋 Phase 2: Learning Enhancement (courseModules, learningPaths, assessments, etc.)
 * 📋 Phase 3: Payroll Enhancement (taxBrackets, statutoryDeductions, payslips, etc.)
 * 📋 Phase 4: Recruitment Enhancement (applicantDocuments, interviewFeedback, offerLetters)
 * 📋 Phase 5: Documentation & Diagrams (ERD, workflow diagrams, ADR-003)
 *
 * **Related Files:**
 * - packages/meta-types/src/schema/* — Business type definitions
 * - packages/meta-types/src/workflow/* — Workflow state machine patterns
 * - packages/meta-types/src/core/* — Runtime type guards (isJsonObject, assertNever)
 * - UPGRADE-EXECUTIVE-SUMMARY.md — Strategic rationale
 * - UPGRADE-PLAN.md — Detailed technical implementation guide
 */
