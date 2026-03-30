// ============================================================================
// HR ENUMS CATALOG
// Centralized pgEnum and Zod enum definitions for all HR domains.
// ============================================================================
import { z } from "zod/v4";

import { hrSchema } from "./_schema.js";

// ============================================================================
// HR ENUM CONVENTIONS (read before adding symbols)
// ============================================================================
// - Value catalogs: plural `as const` arrays (e.g. leaveStatuses, fuelTypes).
// - Drizzle column types: singular domain + `Enum` suffix (e.g. leaveStatusEnum).
// - Zod: singular + `Schema` suffix (e.g. LeaveStatusSchema).
// - TypeScript types: singular names; prefer aliasing a canonical type when
//   multiple domains share the same tuple (e.g. LeaveStatus = WorkflowLifecycleStatus).
// - TypeScript DRY: shared tuples where values match; PostgreSQL stays one pgEnum
//   per domain column (separate enum types, same labels when intentional).
// - Never remove or rename enum values without ADR + migration; changes here are
//   additive-only unless a deliberate catalog shrink is approved and migrated.
// ============================================================================

// Employee Status
export const employmentStatuses = [
  "draft",
  "active",
  "on_leave",
  "suspended",
  "terminated",
  "retired",
] as const;

// Employment Type
export const employmentTypes = [
  "full_time",
  "part_time",
  "contract",
  "intern",
  "consultant",
] as const;

// Gender
export const genders = ["male", "female", "other", "prefer_not_to_say"] as const;

// Marital Status
export const maritalStatuses = ["single", "married", "divorced", "widowed", "separated"] as const;

// Employee Category
export const employeeCategories = ["regular", "probation", "seasonal", "temporary"] as const;

// Leave Types
export const leaveTypes = [
  "annual",
  "sick",
  "maternity",
  "paternity",
  "unpaid",
  "compassionate",
  "study",
  "sabbatical",
] as const;

// ============================================================================
// Shared approval workflow lifecycle (TypeScript DRY, PostgreSQL separate)
// ============================================================================

/** Canonical approval-style workflow values; domain aliases below share this tuple. */
export const standardApprovalWorkflowStatuses = [
  "draft",
  "submitted",
  "approved",
  "rejected",
  "cancelled",
] as const;

export const WorkflowLifecycleStatusSchema = z.enum(standardApprovalWorkflowStatuses);
export type WorkflowLifecycleStatus = (typeof standardApprovalWorkflowStatuses)[number];

export const leaveStatuses = standardApprovalWorkflowStatuses;
export const staffingPlanStatuses = standardApprovalWorkflowStatuses;
export const requestStatuses = standardApprovalWorkflowStatuses;

export const leaveStatusEnum = hrSchema.enum("leave_status", [...leaveStatuses]);
export const staffingPlanStatusEnum = hrSchema.enum("staffing_plan_status", [
  ...staffingPlanStatuses,
]);
export const requestStatusEnum = hrSchema.enum("request_status", [...requestStatuses]);

export const LeaveStatusSchema = WorkflowLifecycleStatusSchema;
export const StaffingPlanStatusSchema = WorkflowLifecycleStatusSchema;
export const RequestStatusSchema = WorkflowLifecycleStatusSchema;

export type LeaveStatus = WorkflowLifecycleStatus;
export type StaffingPlanStatus = WorkflowLifecycleStatus;
export type RequestStatus = WorkflowLifecycleStatus;

export const staffingPlanScenarios = ["baseline", "optimistic", "pessimistic"] as const;
/** Planning context: budget cycle vs forecast vs realized headcount. */
export const staffingPlanTypes = ["budget", "forecast", "actual"] as const;

// Attendance Status
export const attendanceStatuses = ["present", "absent", "late", "half_day", "on_leave"] as const;

// Contract Types
export const contractTypes = ["permanent", "fixed_term", "probation", "apprenticeship"] as const;

// Contract Status
export const contractStatuses = ["draft", "active", "expired", "terminated", "renewed"] as const;

// Payroll Status
export const payrollStatuses = ["draft", "computed", "approved", "paid", "cancelled"] as const;

// Payment Method
export const paymentMethods = ["bank_transfer", "cash", "check", "payroll_card"] as const;

// Country Codes for Tax Configuration (HR-specific enum)
// Note: For country reference data, use reference.countries table
export const hrCountryCodes = [
  "US", // United States
  "SG", // Singapore
  "MY", // Malaysia
  "ID", // Indonesia
  "GB", // United Kingdom
  "AU", // Australia
  "CA", // Canada
  "IN", // India
  "PH", // Philippines
  "TH", // Thailand
  "VN", // Vietnam
  "HK", // Hong Kong
  "TW", // Taiwan
  "JP", // Japan
  "KR", // South Korea
  "NZ", // New Zealand
] as const;

// Tax Types
export const taxTypes = [
  "income_tax",
  "social_security",
  "medicare",
  "provincial_tax",
  "local_tax",
  "disability_insurance",
  "unemployment_insurance",
] as const;

// Statutory Deduction Types
export const statutoryDeductionTypes = [
  "cpf", // Central Provident Fund (SG)
  "epf", // Employees Provident Fund (MY)
  "socso", // Social Security Organization (MY)
  "eis", // Employment Insurance System (MY)
  "pcb", // Monthly Tax Deduction (MY)
  "cpf_cpf", // CPF Contribution (SG)
  "cpf_medisave", // CPF Medisave (SG)
  "cpf_oa", // CPF Ordinary Account (SG)
  "cpf_sa", // CPF Special Account (SG)
  "ssn", // Social Security Number (US)
  "medicare", // Medicare (US)
  "futa", // Federal Unemployment Tax Act (US)
  "suta", // State Unemployment Tax Act (US)
  "national_insurance", // National Insurance (UK)
  "pension", // Pension Scheme (UK)
  "superannuation", // Superannuation (AU)
  "provident_fund", // General Provident Fund
  "esi", // Employee State Insurance (IN)
  "pf", // Provident Fund (IN)
  "professional_tax", // Professional Tax (IN)
] as const;

// Payroll Adjustment Types
export const payrollAdjustmentTypes = [
  "bonus",
  "commission",
  "overtime",
  "allowance",
  "deduction",
  "correction",
  "backpay",
  "reimbursement",
  "loan",
  "garnishment",
  "other",
] as const;

/** Review workflow on `payroll_adjustments` (distinct from `adjustment_type`). */
export const payrollAdjustmentWorkflowStatuses = ["draft", "approved", "rejected"] as const;

// Benefit Types
export const benefitTypes = [
  "health_insurance",
  "life_insurance",
  "retirement_plan",
  "stock_options",
  "gym_membership",
  "education_allowance",
  "transport_allowance",
  "meal_allowance",
  "housing_allowance",
] as const;

// Benefit Status (core enrollment on employment; distinct from upgrade-module enrollment workflow)
export const benefitStatuses = ["pending", "active", "inactive", "expired", "cancelled"] as const;

// Performance Review Status
export const performanceReviewStatuses = [
  "not_started",
  "in_progress",
  "submitted",
  "reviewed",
  "approved",
  "rejected",
] as const;

/** Review *cycle* window lifecycle (distinct from individual review workflow states). */
export const performanceReviewCycleStatuses = ["draft", "open", "closed", "archived"] as const;

// Performance Rating
export const performanceRatings = [
  "outstanding",
  "exceeds_expectations",
  "meets_expectations",
  "needs_improvement",
  "unsatisfactory",
] as const;

// Goal Status
export const goalStatuses = [
  "draft",
  "active",
  "in_progress",
  "completed",
  "cancelled",
  "overdue",
] as const;

// Goal Priority
export const goalPriorities = ["critical", "high", "medium", "low"] as const;

// Recruitment Status
export const recruitmentStatuses = [
  "draft",
  "open",
  "in_progress",
  "on_hold",
  "filled",
  "cancelled",
] as const;

// Application Status
export const applicationStatuses = [
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
] as const;

// Interview Stage
export const interviewStages = [
  "phone_screen",
  "technical_test",
  "first_interview",
  "second_interview",
  "panel_interview",
  "final_interview",
] as const;

// Interview Result
export const interviewResults = [
  "pending",
  "strong_hire",
  "hire",
  "maybe_hire",
  "no_hire",
  "strong_no_hire",
] as const;

// Document Types for Applicant Documents
export const documentTypes = [
  "resume",
  "cover_letter",
  "portfolio",
  "certification",
  "transcript",
  "id_document",
  "work_sample",
  "reference_letter",
  "photo",
  "other",
] as const;

// Feedback Criteria for Structured Interviews
export const feedbackCriteria = [
  "technical_skills",
  "communication",
  "problem_solving",
  "leadership",
  "teamwork",
  "cultural_fit",
  "experience",
  "education",
  "attitude",
  "potential",
] as const;

// Offer Status
export const offerStatuses = [
  "draft",
  "sent",
  "accepted",
  "rejected",
  "expired",
  "withdrawn",
] as const;

/** Structured interview feedback hiring recommendation (interview_feedback.recommendation). */
export const interviewFeedbackRecommendations = ["hire", "no_hire", "maybe"] as const;

/** Configurable pipeline stage row lifecycle (recruitment_pipeline_stages.stage_configuration_status). */
export const recruitmentPipelineStageStatuses = ["active", "archived"] as const;

/** How the candidate applied (job_applications.application_source). */
export const jobApplicationSources = [
  "referral",
  "job_board",
  "company_website",
  "agency",
  "social_media",
  "walk_in",
  "internal",
  "other",
] as const;

/** Resume parser outcome (resume_parsed_data.parse_status). */
export const resumeParseStatuses = ["success", "failed"] as const;

// Document Type for Employee Documents
export const employeeDocumentTypes = [
  "id_proof",
  "address_proof",
  "education_certificate",
  "employment_letter",
  "contract",
  "pay_slip",
  "tax_document",
  "performance_review",
  "disciplinary_action",
  "resignation_letter",
] as const;

// Document Status
export const documentStatuses = ["pending", "verified", "rejected", "expired"] as const;

// Expense Type
export const expenseTypes = [
  "travel",
  "accommodation",
  "meals",
  "transport",
  "supplies",
  "training",
  "entertainment",
  "other",
] as const;

// Expense Status
export const expenseStatuses = [
  "draft",
  "submitted",
  "approved",
  "rejected",
  "reimbursed",
] as const;

// Disciplinary Action Type
export const disciplinaryActionTypes = [
  "verbal_warning",
  "written_warning",
  "suspension",
  "termination",
  "demotion",
] as const;

// Shift Type
export const shiftTypes = ["morning", "afternoon", "evening", "night", "rotating"] as const;

/** Holiday calendar classification (public statutory, company-only, religious observance). */
export const holidayCalendarTypes = ["public", "company", "religious"] as const;

/** Shift assignment execution lifecycle. */
export const shiftAssignmentStatuses = ["planned", "completed", "cancelled"] as const;

// Work Location Type
export const workLocationTypes = ["office", "remote", "hybrid", "field"] as const;

// Skill Level
export const skillLevels = ["beginner", "intermediate", "advanced", "expert"] as const;

// Certification Status
export const certificationStatuses = ["active", "expired", "in_progress", "revoked"] as const;

// Exit Interview Status
export const exitInterviewStatuses = ["scheduled", "completed", "skipped"] as const;

// Termination Reason
export const terminationReasons = [
  "resignation",
  "end_of_contract",
  "redundancy",
  "misconduct",
  "poor_performance",
  "mutual_agreement",
  "retirement",
  "death",
] as const;

// Departure Reason (Enhanced)
export const departureReasons = [
  "resignation",
  "termination",
  "retirement",
  "layoff",
  "contract_end",
  "mutual_agreement",
  "death",
  "other",
] as const;

// Skill Type Category
export const skillTypeCategories = [
  "technical",
  "soft_skills",
  "languages",
  "certifications",
  "domain_knowledge",
  "tools",
  "other",
] as const;

// Resume Line Type
export const resumeLineTypes = [
  "experience",
  "education",
  "certification",
  "project",
  "publication",
  "award",
  "volunteer",
  "other",
] as const;

/** Parsed vs validated resume line rows (employee_resume_lines.line_status). */
export const employeeResumeLineStatuses = ["draft", "verified"] as const;

// Expense Category
export const expenseCategories = [
  "travel",
  "accommodation",
  "meals",
  "transport",
  "supplies",
  "training",
  "entertainment",
  "communication",
  "equipment",
  "other",
] as const;

// Approval Level
export const approvalLevels = ["level_1", "level_2", "level_3", "final"] as const;

// Payroll payment distribution lifecycle (payment_distributions.status)
export const paymentDistributionStatuses = [
  "pending",
  "processing",
  "completed",
  "failed",
  "returned",
] as const;

// Expense policy targeting (expense_policies.applicable_to)
export const expensePolicyApplicableTos = ["all", "department", "position", "employee"] as const;

/** Tax / ledger treatment for an expense category (`expense_categories.tax_treatment`). */
export const expenseTaxTreatments = ["deductible", "non_deductible", "partial", "other"] as const;

/** Report grouping for analytics (`expense_reports.report_type`). */
export const expenseReportTypes = ["travel", "meals", "office", "other"] as const;

/**
 * How the expense report is settled (`expense_reports.expense_workflow_type`).
 * Distinct from `expense_type` / `expenseTypes` (travel, meals, … line-item kinds).
 *
 * - `reimbursement` — employee out-of-pocket, company pays them back.
 * - `advance` — reconcile spend against a prior employee advance (`cash_advances` → settlement report).
 * - `petty_cash` — spend from a company float / custodian; tag reports for GL and audit (not a row in `cash_advances`).
 * - `company_paid` — company settled the vendor directly; employee report is for allocation / policy only.
 */
export const expenseWorkflowTypes = [
  "reimbursement",
  "advance",
  "petty_cash",
  "company_paid",
] as const;

/** Lifecycle of a cash advance (`cash_advances.status`). */
export const cashAdvanceStatuses = ["issued", "outstanding", "settled"] as const;

// People analytics — data export kind (data_exports.export_type)
export const dataExportTypes = ["report", "data_dump", "scheduled"] as const;

// People analytics — SCD dimension kind (analytics_dimensions.dimension_type)
export const analyticsDimensionTypes = [
  "employee",
  "department",
  "position",
  "location",
  "custom",
] as const;

// Employee self-service — in-app notification category
export const employeeNotificationTypes = ["info", "warning", "error", "success"] as const;

// Employee self-service — preference namespace (`structured` = JSON-only payload via `preference_value_json`)
export const employeePreferenceTypes = [
  "ui",
  "communication",
  "privacy",
  "notification",
  "structured",
] as const;

// LMS — course delivery mode (courses.delivery_method)
export const courseDeliveryMethods = ["online", "in_person", "blended"] as const;

/** LMS catalog row visibility (courses.status); not the same as course publication lifecycle enum. */
export const courseCatalogStatuses = ["active", "inactive"] as const;

export const courseSessionStatuses = ["scheduled", "in_progress", "completed", "cancelled"] as const;

export const courseEnrollmentStatuses = [
  "registered",
  "in_progress",
  "completed",
  "cancelled",
  "failed",
] as const;

export const learningPathEnrollmentStatuses = ["active", "completed", "cancelled"] as const;

export const learningProgressStatuses = ["in_progress", "completed", "failed"] as const;

export const trainingCostCategories = ["instructor", "materials", "venue", "other"] as const;

export const trainingCertificateStatuses = ["active", "expired", "revoked"] as const;

export const employeeSurveyWorkflowStatuses = ["draft", "active", "closed", "archived"] as const;

/** Attempt lifecycle on assessment_attempts (distinct from graded attempt_status catalog). */
export const assessmentAttemptWorkflowStatuses = [
  "in_progress",
  "completed",
  "failed",
  "expired",
] as const;

export const courseMaterialTypes = [
  "document",
  "video",
  "link",
  "quiz",
  "assignment",
  "presentation",
  "ebook",
] as const;

/** Course module pedagogical kind (`course_modules.module_type`). */
export const courseModuleTypes = ["lecture", "lab", "project", "other"] as const;

/** How the learner was enrolled (`course_enrollments.enrollment_source`). */
export const courseEnrollmentSources = [
  "self_enrolled",
  "manager_assigned",
  "admin_assigned",
  "other",
] as const;

// Succession / talent — 9-box potential (talent_pool_members.potential_rating)
export const successionPotentialRatings = ["low", "medium", "high"] as const;

// Global workforce — assignment allowances, relocation, DEI
export const assignmentAllowanceTypes = [
  "housing",
  "education",
  "relocation",
  "hardship",
  "cost_of_living",
  "transportation",
  "other",
] as const;

export const allowancePaymentFrequencies = ["one_time", "monthly", "quarterly", "annual"] as const;

export const relocationServiceTypes = [
  "moving",
  "temporary_housing",
  "home_search",
  "school_search",
  "orientation",
  "immigration_support",
  "other",
] as const;

export const relocationServiceStatuses = [
  "planned",
  "scheduled",
  "in_progress",
  "completed",
  "cancelled",
] as const;

export const deiMetricTypes = [
  "diversity",
  "equity",
  "inclusion",
  "pay_gap",
  "representation",
  "promotion_rate",
  "retention",
  "hiring_rate",
  "attrition_rate",
] as const;

export const deiDimensionTypes = [
  "gender",
  "ethnicity",
  "age_group",
  "department",
  "level",
  "location",
] as const;

// Engagement — bonus point rule cap period
export const bonusPointPeriodTypes = ["day", "week", "month", "year"] as const;

// Tax — proof document verification
export const taxProofVerificationStatuses = ["pending", "verified", "rejected"] as const;

// Attendance — overtime rule scope & biometric punch direction
export const overtimeRuleApplicableTos = ["all", "department", "shift", "position"] as const;

export const biometricPunchTypes = ["in", "out"] as const;

// Appraisal templates — scoped applicability
export const appraisalTemplateApplicableTos = ["all", "department", "position"] as const;

export const appraisalReviewFrequencies = ["annual", "quarterly", "adhoc"] as const;

export const appraisalKraCategories = ["financial", "operational", "behavioral"] as const;

export const employeeKraStatuses = ["pending", "achieved", "exceeded"] as const;

// Equity / compensation
export const equityVestingTypes = ["cliff", "graded", "immediate"] as const;

export const equityGrantTypes = ["stock_option", "rsu", "espp", "sar"] as const;

/**
 * Equity grant lifecycle (additive values). Typical flow: granted → active → vested →
 * exercised | expired | cancelled | terminated. Product may refine transitions in an ADR.
 */
export const equityGrantStatuses = [
  "granted",
  "active",
  "vested",
  "exercised",
  "expired",
  "cancelled",
  "terminated",
] as const;

// Benefits upgrade module
export const benefitCatalogStatuses = ["active", "inactive"] as const;

export const benefitEnrollmentWorkflowStatuses = ["pending", "active", "cancelled", "expired"] as const;

export const benefitDependentRelationships = ["spouse", "child", "parent", "sibling", "other"] as const;

export const benefitClaimStatuses = [
  "submitted",
  "under_review",
  "approved",
  "rejected",
  "paid",
] as const;

export const benefitPlanCoverageTypes = [
  "medical",
  "dental",
  "vision",
  "retirement",
  "life",
  "disability",
  "other",
] as const;

/**
 * Dependent coverage lifecycle (dedicated pg enum, not benefit catalog).
 * Includes `inactive` for backward compatibility with legacy `benefit_catalog_status` rows;
 * prefer `expired` / `cancelled` for new data.
 */
export const dependentCoverageStatuses = ["active", "inactive", "expired", "cancelled"] as const;

// Bonus Point Transaction Type
export const bonusPointTransactionTypes = ["earned", "redeemed", "expired", "adjusted"] as const;

/** Polymorphic link on `bonus_point_transactions` (pairs with `reference_id`). */
export const bonusPointReferenceTypes = [
  "goal",
  "attendance",
  "training",
  "referral",
  "performance",
  "benefit_catalog",
  "other",
  "manual",
] as const;

/** Workflow for `bonus_point_redemption_requests` (points → reward / catalog). */
export const bonusPointRedemptionStatuses = [
  "pending",
  "approved",
  "rejected",
  "fulfilled",
  "cancelled",
] as const;

/** `bonus_point_reward_catalog` row lifecycle (same labels as benefit catalog for UX parity). */
export const bonusPointRewardCatalogStatuses = ["active", "inactive"] as const;

// Bonus Point Trigger Event
export const bonusPointTriggerEvents = [
  "attendance_streak",
  "goal_completion",
  "training_completion",
  "referral",
  "performance_rating",
  "anniversary",
  "manual",
  "other",
] as const;

// Disciplinary Action Severity
export const disciplinaryActionSeverities = [
  "minor",
  "moderate",
  "serious",
  "critical",
  "severe",
] as const;

// Disciplinary Action Status
export const disciplinaryActionStatuses = [
  "pending",
  "under_review",
  "confirmed",
  "appealed",
  "closed",
  "withdrawn",
] as const;

// Compensatory Leave Status
export const compensatoryLeaveStatuses = [
  "pending",
  "approved",
  "rejected",
  "expired",
  "used",
] as const;

// Leave Encashment Status
export const leaveEncashmentStatuses = [
  "draft",
  "submitted",
  "approved",
  "rejected",
  "paid",
  "cancelled",
] as const;

/** Kind of leave restriction window / rule (analytics & reporting). */
export const leaveRestrictionTypes = ["blackout", "quota", "seasonal", "other"] as const;

/** Why leave was encashed (reporting). */
export const leaveEncashmentReasons = [
  "year_end",
  "resignation",
  "special_approval",
  "other",
] as const;

// Tax Exemption Category Type
export const taxExemptionCategoryTypes = [
  "housing",
  "education",
  "medical",
  "insurance",
  "investment",
  "donation",
  "other",
] as const;

// Tax Declaration Status
export const taxDeclarationStatuses = [
  "draft",
  "submitted",
  "verified",
  "approved",
  "rejected",
] as const;

/** Supporting document kinds for `tax_exemption_proofs.document_type`. */
export const taxExemptionProofDocumentTypes = [
  "receipt",
  "certificate",
  "invoice",
  "statement",
  "form",
  "other",
] as const;

// Attendance Request Type
export const attendanceRequestTypes = [
  "correction",
  "missing_punch",
  "work_from_home",
  "overtime",
  "early_departure",
  "late_arrival",
] as const;

// Overtime Rule Type
export const overtimeRuleTypes = ["daily", "weekly", "monthly", "holiday", "special"] as const;

// Biometric Device Type
export const biometricDeviceTypes = ["fingerprint", "face", "card", "pin", "iris"] as const;

// Promotion Type
export const promotionTypes = ["vertical", "horizontal", "grade_change", "title_change"] as const;

// Transfer Type
export const transferTypes = ["permanent", "temporary", "deputation", "secondment"] as const;

// Separation Type
export const separationTypes = [
  "resignation",
  "termination",
  "retirement",
  "layoff",
  "contract_end",
  "mutual_agreement",
  "death",
] as const;

/** `employee_promotions.status` — same labels as `leave_status` for straightforward migration. */
export const promotionWorkflowStatuses = [...standardApprovalWorkflowStatuses] as const;

/** `employee_transfers.status` — includes `completed` when the move is executed. */
export const transferWorkflowStatuses = [
  "draft",
  "submitted",
  "approved",
  "completed",
  "rejected",
  "cancelled",
] as const;

/** `full_final_settlements.status` — includes `paid` when settled with treasury. */
export const fullFinalSettlementWorkflowStatuses = [
  "draft",
  "submitted",
  "approved",
  "rejected",
  "paid",
  "cancelled",
] as const;

export const promotionReasonCategories = [
  "performance",
  "tenure",
  "reorganization",
  "market_adjustment",
  "other",
] as const;

export const fullFinalSettlementTypes = [
  "voluntary",
  "involuntary",
  "retirement",
  "other",
] as const;

// Travel Request Status
export const travelRequestStatuses = [
  "draft",
  "submitted",
  "approved",
  "rejected",
  "completed",
  "cancelled",
] as const;

// Travel Segment Type
export const travelSegmentTypes = ["flight", "train", "bus", "car", "hotel", "other"] as const;

// Vehicle Status
export const vehicleStatuses = [
  "available",
  "assigned",
  "maintenance",
  "retired",
  "disposed",
] as const;

// Fuel Type
export const fuelTypes = [
  "petrol",
  "diesel",
  "electric",
  "hybrid",
  "cng",
  "hydrogen",
  "biofuel",
  "other",
] as const;

// Onboarding Status
export const onboardingStatuses = ["not_started", "in_progress", "completed", "cancelled"] as const;

// Department Type
export const departmentTypes = ["operational", "support", "executive", "project_based"] as const;

// Cost Center Type
export const costCenterTypes = ["department", "project", "location", "function"] as const;

// Salary Component Type
export const componentTypes = [
  "earning",
  "deduction",
  "allowance",
  "benefit",
  "statutory",
] as const;

// Course Status
export const courseStatuses = ["draft", "published", "archived", "retired"] as const;

// Course Level
export const courseLevels = ["beginner", "intermediate", "advanced", "expert"] as const;

// Enrollment Status
export const enrollmentStatuses = [
  "enrolled",
  "in_progress",
  "completed",
  "failed",
  "withdrawn",
  "on_hold",
] as const;

// Assessment Status
export const assessmentStatuses = ["draft", "published", "active", "closed", "archived"] as const;

// Assessment Type
export const assessmentTypes = [
  "pre_assessment",
  "formative",
  "summative",
  "practical",
  "quiz",
] as const;

// Question Type
export const questionTypes = [
  "multiple_choice",
  "true_false",
  "short_answer",
  "essay",
  "matching",
] as const;

// Attempt Status
export const attemptStatuses = ["in_progress", "submitted", "graded", "failed", "passed"] as const;

// Certification Status
export const certificationLevelStatuses = ["active", "expired", "revoked", "pending"] as const;

// Training Feedback Status
export const feedbackStatuses = ["draft", "submitted", "reviewed", "archived"] as const;

// Learning Path Status
export const learningPathStatuses = ["draft", "active", "archived", "retired"] as const;

// ============================================================================
// PG ENUMS
// ============================================================================

export const employmentStatusEnum = hrSchema.enum("employment_status", [...employmentStatuses]);
export const employmentTypeEnum = hrSchema.enum("employment_type", [...employmentTypes]);
export const genderEnum = hrSchema.enum("gender", [...genders]);
export const maritalStatusEnum = hrSchema.enum("marital_status", [...maritalStatuses]);
export const employeeCategoryEnum = hrSchema.enum("employee_category", [...employeeCategories]);
export const leaveTypeEnum = hrSchema.enum("leave_type", [...leaveTypes]);
export const staffingPlanScenarioEnum = hrSchema.enum("staffing_plan_scenario", [...staffingPlanScenarios]);
export const staffingPlanTypeEnum = hrSchema.enum("staffing_plan_type", [...staffingPlanTypes]);
export const attendanceStatusEnum = hrSchema.enum("attendance_status", [...attendanceStatuses]);
export const contractTypeEnum = hrSchema.enum("contract_type", [...contractTypes]);
export const contractStatusEnum = hrSchema.enum("contract_status", [...contractStatuses]);
export const payrollStatusEnum = hrSchema.enum("payroll_status", [...payrollStatuses]);
export const paymentMethodEnum = hrSchema.enum("payment_method", [...paymentMethods]);
export const countryEnum = hrSchema.enum("country", [...hrCountryCodes]);
export const taxTypeEnum = hrSchema.enum("tax_type", [...taxTypes]);
export const statutoryDeductionTypeEnum = hrSchema.enum("statutory_deduction_type", [
  ...statutoryDeductionTypes,
]);
export const payrollAdjustmentTypeEnum = hrSchema.enum("payroll_adjustment_type", [
  ...payrollAdjustmentTypes,
]);
export const payrollAdjustmentWorkflowStatusEnum = hrSchema.enum(
  "payroll_adjustment_workflow_status",
  [...payrollAdjustmentWorkflowStatuses]
);
export const benefitTypeEnum = hrSchema.enum("benefit_type", [...benefitTypes]);
export const benefitStatusEnum = hrSchema.enum("benefit_status", [...benefitStatuses]);
export const performanceReviewStatusEnum = hrSchema.enum("performance_review_status", [
  ...performanceReviewStatuses,
]);
export const performanceReviewCycleStatusEnum = hrSchema.enum("performance_review_cycle_status", [
  ...performanceReviewCycleStatuses,
]);
export const performanceRatingEnum = hrSchema.enum("performance_rating", [...performanceRatings]);
export const goalStatusEnum = hrSchema.enum("goal_status", [...goalStatuses]);
export const goalPriorityEnum = hrSchema.enum("goal_priority", [...goalPriorities]);
export const recruitmentStatusEnum = hrSchema.enum("recruitment_status", [...recruitmentStatuses]);
export const applicationStatusEnum = hrSchema.enum("application_status", [...applicationStatuses]);
export const interviewStageEnum = hrSchema.enum("interview_stage", [...interviewStages]);
export const interviewResultEnum = hrSchema.enum("interview_result", [...interviewResults]);
export const documentTypeEnum = hrSchema.enum("document_type", [...documentTypes]);
export const feedbackCriteriaEnum = hrSchema.enum("feedback_criteria", [...feedbackCriteria]);
export const offerStatusEnum = hrSchema.enum("offer_status", [...offerStatuses]);
export const interviewFeedbackRecommendationEnum = hrSchema.enum("interview_feedback_recommendation", [
  ...interviewFeedbackRecommendations,
]);
export const recruitmentPipelineStageStatusEnum = hrSchema.enum("recruitment_pipeline_stage_status", [
  ...recruitmentPipelineStageStatuses,
]);
export const jobApplicationSourceEnum = hrSchema.enum("job_application_source", [...jobApplicationSources]);
export const resumeParseStatusEnum = hrSchema.enum("resume_parse_status", [...resumeParseStatuses]);
export const documentStatusEnum = hrSchema.enum("document_status", [...documentStatuses]);
export const expenseTypeEnum = hrSchema.enum("expense_type", [...expenseTypes]);
export const expenseStatusEnum = hrSchema.enum("expense_status", [...expenseStatuses]);
export const disciplinaryActionTypeEnum = hrSchema.enum("disciplinary_action_type", [
  ...disciplinaryActionTypes,
]);
export const shiftTypeEnum = hrSchema.enum("shift_type", [...shiftTypes]);
export const holidayCalendarTypeEnum = hrSchema.enum("holiday_calendar_type", [...holidayCalendarTypes]);
export const shiftAssignmentStatusEnum = hrSchema.enum("shift_assignment_status", [
  ...shiftAssignmentStatuses,
]);
export const workLocationTypeEnum = hrSchema.enum("work_location_type", [...workLocationTypes]);
export const skillLevelEnum = hrSchema.enum("skill_level", [...skillLevels]);
export const certificationStatusEnum = hrSchema.enum("certification_status", [
  ...certificationStatuses,
]);
export const exitInterviewStatusEnum = hrSchema.enum("exit_interview_status", [
  ...exitInterviewStatuses,
]);
export const terminationReasonEnum = hrSchema.enum("termination_reason", [...terminationReasons]);
export const onboardingStatusEnum = hrSchema.enum("onboarding_status", [...onboardingStatuses]);
export const departmentTypeEnum = hrSchema.enum("department_type", [...departmentTypes]);
export const costCenterTypeEnum = hrSchema.enum("cost_center_type", [...costCenterTypes]);
export const componentTypeEnum = hrSchema.enum("component_type", [...componentTypes]);
export const courseStatusEnum = hrSchema.enum("course_status", [...courseStatuses]);
export const courseLevelEnum = hrSchema.enum("course_level", [...courseLevels]);
export const enrollmentStatusEnum = hrSchema.enum("enrollment_status", [...enrollmentStatuses]);
export const assessmentStatusEnum = hrSchema.enum("assessment_status", [...assessmentStatuses]);
export const assessmentTypeEnum = hrSchema.enum("assessment_type", [...assessmentTypes]);
export const questionTypeEnum = hrSchema.enum("question_type", [...questionTypes]);
export const attemptStatusEnum = hrSchema.enum("attempt_status", [...attemptStatuses]);
export const certificationLevelStatusEnum = hrSchema.enum("certification_level_status", [
  ...certificationLevelStatuses,
]);
export const feedbackStatusEnum = hrSchema.enum("feedback_status", [...feedbackStatuses]);
export const learningPathStatusEnum = hrSchema.enum("learning_path_status", [
  ...learningPathStatuses,
]);

// New Enums for Schema Upgrades
export const departureReasonEnum = hrSchema.enum("departure_reason", [...departureReasons]);
export const skillTypeCategoryEnum = hrSchema.enum("skill_type_category", [...skillTypeCategories]);
export const resumeLineTypeEnum = hrSchema.enum("resume_line_type", [...resumeLineTypes]);
export const employeeResumeLineStatusEnum = hrSchema.enum("employee_resume_line_status", [
  ...employeeResumeLineStatuses,
]);
export const expenseCategoryEnum = hrSchema.enum("expense_category", [...expenseCategories]);
export const approvalLevelEnum = hrSchema.enum("approval_level", [...approvalLevels]);
export const bonusPointTransactionTypeEnum = hrSchema.enum("bonus_point_transaction_type", [
  ...bonusPointTransactionTypes,
]);
export const bonusPointTriggerEventEnum = hrSchema.enum("bonus_point_trigger_event", [
  ...bonusPointTriggerEvents,
]);
export const bonusPointReferenceTypeEnum = hrSchema.enum("bonus_point_reference_type", [
  ...bonusPointReferenceTypes,
]);
export const bonusPointRedemptionStatusEnum = hrSchema.enum("bonus_point_redemption_status", [
  ...bonusPointRedemptionStatuses,
]);
export const bonusPointRewardCatalogStatusEnum = hrSchema.enum("bonus_point_reward_catalog_status", [
  ...bonusPointRewardCatalogStatuses,
]);
export const disciplinaryActionSeverityEnum = hrSchema.enum("disciplinary_action_severity", [
  ...disciplinaryActionSeverities,
]);
export const disciplinaryActionStatusEnum = hrSchema.enum("disciplinary_action_status", [
  ...disciplinaryActionStatuses,
]);
export const compensatoryLeaveStatusEnum = hrSchema.enum("compensatory_leave_status", [
  ...compensatoryLeaveStatuses,
]);
export const leaveEncashmentStatusEnum = hrSchema.enum("leave_encashment_status", [
  ...leaveEncashmentStatuses,
]);
export const leaveRestrictionTypeEnum = hrSchema.enum("leave_restriction_type", [
  ...leaveRestrictionTypes,
]);
export const leaveEncashmentReasonEnum = hrSchema.enum("leave_encashment_reason", [
  ...leaveEncashmentReasons,
]);
export const taxExemptionCategoryTypeEnum = hrSchema.enum("tax_exemption_category_type", [
  ...taxExemptionCategoryTypes,
]);
export const taxDeclarationStatusEnum = hrSchema.enum("tax_declaration_status", [
  ...taxDeclarationStatuses,
]);
export const taxExemptionProofDocumentTypeEnum = hrSchema.enum("tax_exemption_proof_document_type", [
  ...taxExemptionProofDocumentTypes,
]);
export const attendanceRequestTypeEnum = hrSchema.enum("attendance_request_type", [
  ...attendanceRequestTypes,
]);
export const overtimeRuleTypeEnum = hrSchema.enum("overtime_rule_type", [...overtimeRuleTypes]);
export const biometricDeviceTypeEnum = hrSchema.enum("biometric_device_type", [
  ...biometricDeviceTypes,
]);
export const promotionTypeEnum = hrSchema.enum("promotion_type", [...promotionTypes]);
export const transferTypeEnum = hrSchema.enum("transfer_type", [...transferTypes]);
export const separationTypeEnum = hrSchema.enum("separation_type", [...separationTypes]);
export const promotionWorkflowStatusEnum = hrSchema.enum("promotion_workflow_status", [
  ...promotionWorkflowStatuses,
]);
export const transferWorkflowStatusEnum = hrSchema.enum("transfer_workflow_status", [
  ...transferWorkflowStatuses,
]);
export const fullFinalSettlementWorkflowStatusEnum = hrSchema.enum(
  "full_final_settlement_workflow_status",
  [...fullFinalSettlementWorkflowStatuses]
);
export const promotionReasonCategoryEnum = hrSchema.enum("promotion_reason_category", [
  ...promotionReasonCategories,
]);
export const fullFinalSettlementTypeEnum = hrSchema.enum("full_final_settlement_type", [
  ...fullFinalSettlementTypes,
]);
export const travelRequestStatusEnum = hrSchema.enum("travel_request_status", [
  ...travelRequestStatuses,
]);
export const travelSegmentTypeEnum = hrSchema.enum("travel_segment_type", [...travelSegmentTypes]);
export const vehicleStatusEnum = hrSchema.enum("vehicle_status", [...vehicleStatuses]);
export const fuelTypeEnum = hrSchema.enum("fuel_type", [...fuelTypes]);

// ============================================================================
// ZOD SCHEMAS
// ============================================================================

export const EmploymentStatusSchema = z.enum(employmentStatuses);
export const EmploymentTypeSchema = z.enum(employmentTypes);
export const GenderSchema = z.enum(genders);
export const MaritalStatusSchema = z.enum(maritalStatuses);
export const EmployeeCategorySchema = z.enum(employeeCategories);
export const LeaveTypeSchema = z.enum(leaveTypes);
export const StaffingPlanScenarioSchema = z.enum(staffingPlanScenarios);
export const StaffingPlanTypeSchema = z.enum(staffingPlanTypes);
export const AttendanceStatusSchema = z.enum(attendanceStatuses);
export const ContractTypeSchema = z.enum(contractTypes);
export const ContractStatusSchema = z.enum(contractStatuses);
export const PayrollStatusSchema = z.enum(payrollStatuses);
export const PaymentMethodSchema = z.enum(paymentMethods);
export const CountrySchema = z.enum(hrCountryCodes);
export const TaxTypeSchema = z.enum(taxTypes);
export const StatutoryDeductionTypeSchema = z.enum(statutoryDeductionTypes);
export const PayrollAdjustmentTypeSchema = z.enum(payrollAdjustmentTypes);
export const PayrollAdjustmentWorkflowStatusSchema = z.enum(payrollAdjustmentWorkflowStatuses);
export const BenefitTypeSchema = z.enum(benefitTypes);
export const BenefitStatusSchema = z.enum(benefitStatuses);
export const PerformanceReviewStatusSchema = z.enum(performanceReviewStatuses);
export const PerformanceReviewCycleStatusSchema = z.enum(performanceReviewCycleStatuses);
export const PerformanceRatingSchema = z.enum(performanceRatings);
export const GoalStatusSchema = z.enum(goalStatuses);
export const GoalPrioritySchema = z.enum(goalPriorities);
export const RecruitmentStatusSchema = z.enum(recruitmentStatuses);
export const ApplicationStatusSchema = z.enum(applicationStatuses);
export const InterviewStageSchema = z.enum(interviewStages);
export const InterviewResultSchema = z.enum(interviewResults);
export const DocumentTypeSchema = z.enum(documentTypes);
export const FeedbackCriteriaSchema = z.enum(feedbackCriteria);
export const OfferStatusSchema = z.enum(offerStatuses);
export const InterviewFeedbackRecommendationSchema = z.enum(interviewFeedbackRecommendations);
export const RecruitmentPipelineStageStatusSchema = z.enum(recruitmentPipelineStageStatuses);
export const JobApplicationSourceSchema = z.enum(jobApplicationSources);
export const ResumeParseStatusSchema = z.enum(resumeParseStatuses);
export const DocumentStatusSchema = z.enum(documentStatuses);
export const ExpenseTypeSchema = z.enum(expenseTypes);
export const ExpenseStatusSchema = z.enum(expenseStatuses);
export const DisciplinaryActionTypeSchema = z.enum(disciplinaryActionTypes);
export const ShiftTypeSchema = z.enum(shiftTypes);
export const HolidayCalendarTypeSchema = z.enum(holidayCalendarTypes);
export const ShiftAssignmentStatusSchema = z.enum(shiftAssignmentStatuses);
export const WorkLocationTypeSchema = z.enum(workLocationTypes);
export const SkillLevelSchema = z.enum(skillLevels);
export const CertificationStatusSchema = z.enum(certificationStatuses);
export const ExitInterviewStatusSchema = z.enum(exitInterviewStatuses);
export const TerminationReasonSchema = z.enum(terminationReasons);
export const OnboardingStatusSchema = z.enum(onboardingStatuses);
export const DepartmentTypeSchema = z.enum(departmentTypes);
export const CostCenterTypeSchema = z.enum(costCenterTypes);
export const ComponentTypeSchema = z.enum(componentTypes);

// Learning Module Schemas
export const CourseStatusSchema = z.enum(courseStatuses);
export const CourseLevelSchema = z.enum(courseLevels);
export const EnrollmentStatusSchema = z.enum(enrollmentStatuses);
export const AssessmentStatusSchema = z.enum(assessmentStatuses);
export const AssessmentTypeSchema = z.enum(assessmentTypes);
export const QuestionTypeSchema = z.enum(questionTypes);
export const AttemptStatusSchema = z.enum(attemptStatuses);
export const CertificationLevelStatusSchema = z.enum(certificationLevelStatuses);
export const FeedbackStatusSchema = z.enum(feedbackStatuses);
export const LearningPathStatusSchema = z.enum(learningPathStatuses);

// New Zod Schemas for Schema Upgrades
export const DepartureReasonSchema = z.enum(departureReasons);
export const SkillTypeCategorySchema = z.enum(skillTypeCategories);
export const ResumeLineTypeSchema = z.enum(resumeLineTypes);
export const EmployeeResumeLineStatusSchema = z.enum(employeeResumeLineStatuses);
export const ExpenseCategorySchema = z.enum(expenseCategories);
export const ApprovalLevelSchema = z.enum(approvalLevels);
export const BonusPointTransactionTypeSchema = z.enum(bonusPointTransactionTypes);
export const BonusPointTriggerEventSchema = z.enum(bonusPointTriggerEvents);
export const BonusPointReferenceTypeSchema = z.enum(bonusPointReferenceTypes);
export const BonusPointRedemptionStatusSchema = z.enum(bonusPointRedemptionStatuses);
export const BonusPointRewardCatalogStatusSchema = z.enum(bonusPointRewardCatalogStatuses);
export const DisciplinaryActionSeveritySchema = z.enum(disciplinaryActionSeverities);
export const DisciplinaryActionStatusSchema = z.enum(disciplinaryActionStatuses);
export const CompensatoryLeaveStatusSchema = z.enum(compensatoryLeaveStatuses);
export const LeaveEncashmentStatusSchema = z.enum(leaveEncashmentStatuses);
export const LeaveRestrictionTypeSchema = z.enum(leaveRestrictionTypes);
export const LeaveEncashmentReasonSchema = z.enum(leaveEncashmentReasons);
export const TaxExemptionCategoryTypeSchema = z.enum(taxExemptionCategoryTypes);
export const TaxDeclarationStatusSchema = z.enum(taxDeclarationStatuses);
export const TaxExemptionProofDocumentTypeSchema = z.enum(taxExemptionProofDocumentTypes);
export const AttendanceRequestTypeSchema = z.enum(attendanceRequestTypes);
export const OvertimeRuleTypeSchema = z.enum(overtimeRuleTypes);
export const BiometricDeviceTypeSchema = z.enum(biometricDeviceTypes);
export const PromotionTypeSchema = z.enum(promotionTypes);
export const TransferTypeSchema = z.enum(transferTypes);
export const SeparationTypeSchema = z.enum(separationTypes);
export const PromotionWorkflowStatusSchema = z.enum(promotionWorkflowStatuses);
export const TransferWorkflowStatusSchema = z.enum(transferWorkflowStatuses);
export const FullFinalSettlementWorkflowStatusSchema = z.enum(fullFinalSettlementWorkflowStatuses);
export const PromotionReasonCategorySchema = z.enum(promotionReasonCategories);
export const FullFinalSettlementTypeSchema = z.enum(fullFinalSettlementTypes);
export const TravelRequestStatusSchema = z.enum(travelRequestStatuses);
export const TravelSegmentTypeSchema = z.enum(travelSegmentTypes);
export const VehicleStatusSchema = z.enum(vehicleStatuses);
export const FuelTypeSchema = z.enum(fuelTypes);

export type EmploymentStatus = (typeof employmentStatuses)[number];
export type EmploymentType = (typeof employmentTypes)[number];
export type Gender = (typeof genders)[number];
export type MaritalStatus = (typeof maritalStatuses)[number];
export type EmployeeCategory = (typeof employeeCategories)[number];
export type LeaveType = (typeof leaveTypes)[number];
export type StaffingPlanScenario = (typeof staffingPlanScenarios)[number];
export type StaffingPlanType = (typeof staffingPlanTypes)[number];
export type AttendanceStatus = (typeof attendanceStatuses)[number];
export type ContractType = (typeof contractTypes)[number];
export type ContractStatus = (typeof contractStatuses)[number];
export type PayrollStatus = (typeof payrollStatuses)[number];
export type PaymentMethod = (typeof paymentMethods)[number];
export type HrCountryCode = (typeof hrCountryCodes)[number];
export type TaxType = (typeof taxTypes)[number];
export type StatutoryDeductionType = (typeof statutoryDeductionTypes)[number];
export type PayrollAdjustmentType = (typeof payrollAdjustmentTypes)[number];
export type PayrollAdjustmentWorkflowStatus = (typeof payrollAdjustmentWorkflowStatuses)[number];
export type BenefitType = (typeof benefitTypes)[number];
export type BenefitStatus = (typeof benefitStatuses)[number];
export type PerformanceReviewStatus = (typeof performanceReviewStatuses)[number];
export type PerformanceReviewCycleStatus = (typeof performanceReviewCycleStatuses)[number];
export type PerformanceRating = (typeof performanceRatings)[number];
export type GoalStatus = (typeof goalStatuses)[number];
export type GoalPriority = (typeof goalPriorities)[number];
export type RecruitmentStatus = (typeof recruitmentStatuses)[number];
export type ApplicationStatus = (typeof applicationStatuses)[number];
export type InterviewStage = (typeof interviewStages)[number];
export type InterviewResult = (typeof interviewResults)[number];
export type DocumentType = (typeof documentTypes)[number];
export type FeedbackCriteria = (typeof feedbackCriteria)[number];
export type OfferStatus = (typeof offerStatuses)[number];
export type InterviewFeedbackRecommendation = (typeof interviewFeedbackRecommendations)[number];
export type RecruitmentPipelineStageStatus = (typeof recruitmentPipelineStageStatuses)[number];
export type JobApplicationSource = (typeof jobApplicationSources)[number];
export type ResumeParseStatus = (typeof resumeParseStatuses)[number];
export type DocumentStatus = (typeof documentStatuses)[number];
export type ExpenseType = (typeof expenseTypes)[number];
export type ExpenseStatus = (typeof expenseStatuses)[number];
export type DisciplinaryActionType = (typeof disciplinaryActionTypes)[number];
export type ShiftType = (typeof shiftTypes)[number];
export type HolidayCalendarType = (typeof holidayCalendarTypes)[number];
export type ShiftAssignmentStatus = (typeof shiftAssignmentStatuses)[number];
export type WorkLocationType = (typeof workLocationTypes)[number];
export type SkillLevel = (typeof skillLevels)[number];
export type CertificationStatus = (typeof certificationStatuses)[number];
export type ExitInterviewStatus = (typeof exitInterviewStatuses)[number];
export type TerminationReason = (typeof terminationReasons)[number];
export type OnboardingStatus = (typeof onboardingStatuses)[number];
export type DepartmentType = (typeof departmentTypes)[number];
export type CostCenterType = (typeof costCenterTypes)[number];
export type ComponentType = (typeof componentTypes)[number];

// Learning Module Types
export type CourseStatus = (typeof courseStatuses)[number];
export type CourseLevel = (typeof courseLevels)[number];
export type EnrollmentStatus = (typeof enrollmentStatuses)[number];
export type AssessmentStatus = (typeof assessmentStatuses)[number];
export type AssessmentType = (typeof assessmentTypes)[number];
export type QuestionType = (typeof questionTypes)[number];
export type AttemptStatus = (typeof attemptStatuses)[number];
export type CertificationLevelStatus = (typeof certificationLevelStatuses)[number];
export type FeedbackStatus = (typeof feedbackStatuses)[number];
export type LearningPathStatus = (typeof learningPathStatuses)[number];

// New Type Exports for Schema Upgrades
export type DepartureReason = (typeof departureReasons)[number];
export type SkillTypeCategory = (typeof skillTypeCategories)[number];
export type ResumeLineType = (typeof resumeLineTypes)[number];
export type EmployeeResumeLineStatus = (typeof employeeResumeLineStatuses)[number];
export type ExpenseCategory = (typeof expenseCategories)[number];
export type ApprovalLevel = (typeof approvalLevels)[number];
export type BonusPointTransactionType = (typeof bonusPointTransactionTypes)[number];
export type BonusPointTriggerEvent = (typeof bonusPointTriggerEvents)[number];
export type BonusPointReferenceType = (typeof bonusPointReferenceTypes)[number];
export type BonusPointRedemptionStatus = (typeof bonusPointRedemptionStatuses)[number];
export type BonusPointRewardCatalogStatus = (typeof bonusPointRewardCatalogStatuses)[number];
export type DisciplinaryActionSeverity = (typeof disciplinaryActionSeverities)[number];
export type DisciplinaryActionStatus = (typeof disciplinaryActionStatuses)[number];
export type CompensatoryLeaveStatus = (typeof compensatoryLeaveStatuses)[number];
export type LeaveEncashmentStatus = (typeof leaveEncashmentStatuses)[number];
export type LeaveRestrictionType = (typeof leaveRestrictionTypes)[number];
export type LeaveEncashmentReason = (typeof leaveEncashmentReasons)[number];
export type TaxExemptionCategoryType = (typeof taxExemptionCategoryTypes)[number];
export type TaxDeclarationStatus = (typeof taxDeclarationStatuses)[number];
export type TaxExemptionProofDocumentType = (typeof taxExemptionProofDocumentTypes)[number];
export type AttendanceRequestType = (typeof attendanceRequestTypes)[number];
export type OvertimeRuleType = (typeof overtimeRuleTypes)[number];
export type BiometricDeviceType = (typeof biometricDeviceTypes)[number];
export type PromotionType = (typeof promotionTypes)[number];
export type TransferType = (typeof transferTypes)[number];
export type SeparationType = (typeof separationTypes)[number];
export type PromotionWorkflowStatus = (typeof promotionWorkflowStatuses)[number];
export type TransferWorkflowStatus = (typeof transferWorkflowStatuses)[number];
export type FullFinalSettlementWorkflowStatus = (typeof fullFinalSettlementWorkflowStatuses)[number];
export type PromotionReasonCategory = (typeof promotionReasonCategories)[number];
export type FullFinalSettlementType = (typeof fullFinalSettlementTypes)[number];
export type TravelRequestStatus = (typeof travelRequestStatuses)[number];
export type TravelSegmentType = (typeof travelSegmentTypes)[number];
export type VehicleStatus = (typeof vehicleStatuses)[number];
export type FuelType = (typeof fuelTypes)[number];

// ============================================================================
// PHASE 6-9 ENHANCEMENTS: NEW ENUMS
// ============================================================================

// Phase 6: Employee Experience & Self-Service
export const requestTypes = [
  "time_off",
  "document",
  "pay_change",
  "profile_update",
  "other",
] as const;
export const notificationPriorities = ["low", "medium", "high", "urgent"] as const;
export const notificationStatuses = ["unread", "read", "archived", "expired"] as const;

/** How an `employee_notifications` row was delivered (analytics / routing). */
export const notificationDeliveryChannels = ["email", "sms", "in_app", "push"] as const;
export const surveyTypes = ["engagement", "pulse", "exit", "onboarding", "custom"] as const;

/** SLA evaluation state on `employee_requests` (timers/breach logic live in app). */
export const essSlaStatuses = ["within_sla", "approaching_breach", "breached", "paused"] as const;

/** Per-step approval row on `employee_request_approval_tasks`. */
export const essApprovalTaskStatuses = [
  "pending",
  "approved",
  "rejected",
  "skipped",
  "cancelled",
] as const;

/** Decision taken when a task leaves `pending` (audit / analytics). */
export const essApprovalTaskDecisions = ["approve", "reject", "delegate", "escalate"] as const;

/** Who produced a row in `employee_request_history`. */
export const essRequestHistoryTransitionSources = ["user", "system", "rule", "migration"] as const;

/** Polymorphic source for `employee_notifications` (pair with `reference_id`). */
export const employeeNotificationReferenceKinds = [
  "employee_request",
  "employee_survey",
  "survey_response",
  "employee_grievance",
  "other",
] as const;

/** Allowed `aggregate_type` values for `ess_event_types` / `ess_domain_events`. */
export const essEventAggregateTypes = [
  "employee_request",
  "employee_survey",
  "survey_response",
  "employee_notification",
] as const;

/** Outbox row lifecycle (worker updates). */
export const essOutboxDeliveryStatuses = ["pending", "delivered", "failed", "dead"] as const;

/** Survey invite / reminder tracking for non-anonymous surveys. */
export const surveyInvitationStatuses = ["pending", "completed", "expired"] as const;

/** Mobile/web push registration (`employee_push_endpoints`). */
export const employeePushPlatforms = ["ios", "android", "web"] as const;

/** Optional rollup model on `employee_surveys`. */
export const essSurveyScoringModels = ["none", "enps", "likert_index", "custom"] as const;

// Phase 7: Strategic Workforce Management
export const successionReadinesses = [
  "ready_now",
  "ready_1_year",
  "ready_2_years",
  "not_ready",
] as const;
export const talentPoolStatuses = ["active", "inactive"] as const;
export const talentPoolTypes = [
  "leadership",
  "technical",
  "high_potential",
  "critical_skills",
] as const;
export const successionRiskLevels = ["low", "medium", "high", "critical"] as const;
/** Succession plan lifecycle (distinct from readiness / risk dimensions). */
export const successionPlanStatuses = ["draft", "active", "archived"] as const;
export const careerAspirationStatuses = ["active", "achieved", "abandoned", "on_hold"] as const;
export const careerPathStatuses = ["active", "inactive", "archived"] as const;
/** Required vs nice-to-have on a career path step (junction `career_path_step_skills`). */
export const stepSkillImportances = ["mandatory", "preferred"] as const;
/** Per-skill gap severity on a career aspiration (junction `career_aspiration_skill_gaps`). */
export const careerAspirationSkillGapLevels = ["minor", "moderate", "critical"] as const;
export const compensationCycleStatuses = [
  "planning",
  "budgeting",
  "review",
  "approved",
  "closed",
] as const;

// Phase 8: People Analytics & Intelligence
export const metricTypes = [
  "headcount",
  "turnover",
  "engagement",
  "productivity",
  "cost",
  "custom",
] as const;
export const metricFrequencies = ["daily", "weekly", "monthly", "quarterly", "annual"] as const;
export const exportFormats = ["csv", "xlsx", "json", "pdf"] as const;
export const exportStatuses = ["pending", "processing", "completed", "failed"] as const;
export const dashboardTypes = ["executive", "manager", "hr_admin", "custom"] as const;

/** Grain of an `analytics_facts` row (partitioning / rollups). */
export const analyticsFactGranularities = ["daily", "weekly", "monthly"] as const;

// Phase 9: Global Mobility & Compliance
export const assignmentTypes = [
  "short_term",
  "long_term",
  "permanent",
  "rotational",
  "commuter",
] as const;
export const assignmentStatuses = [
  "planned",
  "active",
  "completed",
  "cancelled",
  "extended",
] as const;
export const permitTypes = [
  "work_visa",
  "residence_permit",
  "citizenship",
  "dependent_visa",
  "other",
] as const;
export const permitStatuses = ["applied", "approved", "rejected", "expired", "renewed"] as const;
export const complianceTypes = [
  "eeo",
  "ofccp",
  "gdpr",
  "local_labor_law",
  "tax_compliance",
  "other",
] as const;
export const complianceStatuses = [
  "compliant",
  "non_compliant",
  "under_review",
  "remediated",
] as const;

/** Why the international assignment exists (`international_assignments.assignment_reason`). */
export const assignmentReasons = ["business", "development", "compliance", "other"] as const;

/** Severity of compliance findings (`compliance_tracking.finding_severity`). */
export const complianceFindingSeverities = ["minor", "major", "critical"] as const;

// SWOT Proposal: Grievance Management
export const grievanceCategoryTypes = [
  "harassment",
  "discrimination",
  "workplace_safety",
  "compensation",
  "management",
  "policy_violation",
  "work_conditions",
  "bullying",
  "retaliation",
  "other",
] as const;
export const grievanceStatuses = [
  "submitted",
  "acknowledged",
  "under_investigation",
  "resolved",
  "closed",
  "appealed",
  "withdrawn",
] as const;
export const grievancePriorities = ["low", "medium", "high", "critical"] as const;

/** How the grievance was reported (`employee_grievances.grievance_channel`). */
export const grievanceChannels = ["email", "hotline", "portal", "other"] as const;

/** Appeal outcome workflow (`employee_grievances.appeal_status`). */
export const grievanceAppealStatuses = ["pending", "reviewed", "upheld", "overturned"] as const;

// SWOT Proposal: Loan Management
export const loanCategories = [
  "salary_advance",
  "personal_loan",
  "housing_loan",
  "vehicle_loan",
  "education_loan",
  "medical_loan",
  "emergency_loan",
  "other",
] as const;
export const loanStatuses = [
  "applied",
  "approved",
  "disbursed",
  "repaying",
  "completed",
  "defaulted",
  "cancelled",
] as const;
export const loanRepaymentFrequencies = ["monthly", "bi_weekly", "weekly"] as const;

/** How interest accrues on `loan_types` / copied to `employee_loans` at origination. */
export const loanInterestTypes = ["flat", "reducing_balance"] as const;

/** Row in `employee_loan_installments`. */
export const loanInstallmentStatuses = [
  "pending",
  "paid",
  "partially_paid",
  "overdue",
  "waived",
] as const;

// SWOT Proposal: Onboarding Checklists
export const onboardingTaskStatuses = [
  "pending",
  "in_progress",
  "completed",
  "skipped",
  "overdue",
  "blocked",
] as const;
export const onboardingTaskCategories = [
  "documentation",
  "it_setup",
  "training",
  "compliance",
  "facilities",
  "introduction",
  "benefits_enrollment",
  "security",
  "other",
] as const;

/** Who owns an onboarding task (`onboarding_tasks.assigned_to_role`). */
export const onboardingTaskAssigneeRoles = [
  "employee",
  "manager",
  "hr",
  "it",
  "facilities",
  "compliance",
  "buddy",
  "other",
] as const;

// HR policy documents & shift swap (P0 upgrade guide closure)
export const shiftSwapStatuses = [
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
] as const;

export const policyDocumentCategories = [
  "handbook",
  "code_of_conduct",
  "safety",
  "it_security",
  "harassment_prevention",
  "benefits_summary",
  "remote_work",
  "privacy",
  "other",
] as const;

export const policyAcknowledgmentMethods = [
  "electronic",
  "written",
  "witnessed",
  "digital_signature",
] as const;

// ============================================================================
// PHASE 6-9: PG ENUMS
// ============================================================================

// Phase 6
export const requestTypeEnum = hrSchema.enum("request_type", [...requestTypes]);
export const notificationPriorityEnum = hrSchema.enum("notification_priority", [
  ...notificationPriorities,
]);
export const notificationStatusEnum = hrSchema.enum("notification_status", [
  ...notificationStatuses,
]);
export const notificationDeliveryChannelEnum = hrSchema.enum("notification_delivery_channel", [
  ...notificationDeliveryChannels,
]);
export const surveyTypeEnum = hrSchema.enum("survey_type", [...surveyTypes]);
export const essSlaStatusEnum = hrSchema.enum("ess_sla_status", [...essSlaStatuses]);
export const essApprovalTaskStatusEnum = hrSchema.enum("ess_approval_task_status", [
  ...essApprovalTaskStatuses,
]);
export const essApprovalTaskDecisionEnum = hrSchema.enum("ess_approval_task_decision", [
  ...essApprovalTaskDecisions,
]);
export const essRequestHistoryTransitionSourceEnum = hrSchema.enum(
  "ess_request_history_transition_source",
  [...essRequestHistoryTransitionSources]
);
export const employeeNotificationReferenceKindEnum = hrSchema.enum(
  "employee_notification_reference_kind",
  [...employeeNotificationReferenceKinds]
);
export const essEventAggregateTypeEnum = hrSchema.enum("ess_event_aggregate_type", [
  ...essEventAggregateTypes,
]);
export const essOutboxDeliveryStatusEnum = hrSchema.enum("ess_outbox_delivery_status", [
  ...essOutboxDeliveryStatuses,
]);
export const surveyInvitationStatusEnum = hrSchema.enum("survey_invitation_status", [
  ...surveyInvitationStatuses,
]);
export const employeePushPlatformEnum = hrSchema.enum("employee_push_platform", [
  ...employeePushPlatforms,
]);
export const essSurveyScoringModelEnum = hrSchema.enum("ess_survey_scoring_model", [
  ...essSurveyScoringModels,
]);

// Phase 7
export const successionReadinessEnum = hrSchema.enum("succession_readiness", [
  ...successionReadinesses,
]);
export const talentPoolStatusEnum = hrSchema.enum("talent_pool_status", [...talentPoolStatuses]);
export const talentPoolTypeEnum = hrSchema.enum("talent_pool_type", [...talentPoolTypes]);
export const successionRiskLevelEnum = hrSchema.enum("succession_risk_level", [
  ...successionRiskLevels,
]);
export const successionPlanStatusEnum = hrSchema.enum("succession_plan_status", [
  ...successionPlanStatuses,
]);
export const careerAspirationStatusEnum = hrSchema.enum("career_aspiration_status", [
  ...careerAspirationStatuses,
]);
export const careerPathStatusEnum = hrSchema.enum("career_path_status", [...careerPathStatuses]);
export const stepSkillImportanceEnum = hrSchema.enum("step_skill_importance", [
  ...stepSkillImportances,
]);
export const careerAspirationSkillGapLevelEnum = hrSchema.enum(
  "career_aspiration_skill_gap_level",
  [...careerAspirationSkillGapLevels]
);
export const compensationCycleStatusEnum = hrSchema.enum("compensation_cycle_status", [
  ...compensationCycleStatuses,
]);

// Phase 8
export const metricTypeEnum = hrSchema.enum("metric_type", [...metricTypes]);
export const metricFrequencyEnum = hrSchema.enum("metric_frequency", [...metricFrequencies]);
export const exportFormatEnum = hrSchema.enum("export_format", [...exportFormats]);
export const exportStatusEnum = hrSchema.enum("export_status", [...exportStatuses]);
export const dashboardTypeEnum = hrSchema.enum("dashboard_type", [...dashboardTypes]);
export const analyticsFactGranularityEnum = hrSchema.enum("analytics_fact_granularity", [
  ...analyticsFactGranularities,
]);

// Phase 9
export const assignmentTypeEnum = hrSchema.enum("assignment_type", [...assignmentTypes]);
export const assignmentStatusEnum = hrSchema.enum("assignment_status", [...assignmentStatuses]);
export const permitTypeEnum = hrSchema.enum("permit_type", [...permitTypes]);
export const permitStatusEnum = hrSchema.enum("permit_status", [...permitStatuses]);
export const complianceTypeEnum = hrSchema.enum("compliance_type", [...complianceTypes]);
export const complianceStatusEnum = hrSchema.enum("compliance_status", [...complianceStatuses]);
export const assignmentReasonEnum = hrSchema.enum("assignment_reason", [...assignmentReasons]);
export const complianceFindingSeverityEnum = hrSchema.enum("compliance_finding_severity", [
  ...complianceFindingSeverities,
]);

// HR stabilization — align former text+CHECK columns with pgEnum
export const paymentDistributionStatusEnum = hrSchema.enum("payment_distribution_status", [
  ...paymentDistributionStatuses,
]);
export const expensePolicyApplicableToEnum = hrSchema.enum("expense_policy_applicable_to", [
  ...expensePolicyApplicableTos,
]);
export const expenseTaxTreatmentEnum = hrSchema.enum("expense_tax_treatment", [...expenseTaxTreatments]);
export const expenseReportTypeEnum = hrSchema.enum("expense_report_type", [...expenseReportTypes]);
export const expenseWorkflowTypeEnum = hrSchema.enum("expense_workflow_type", [
  ...expenseWorkflowTypes,
]);
export const cashAdvanceStatusEnum = hrSchema.enum("cash_advance_status", [...cashAdvanceStatuses]);
export const dataExportTypeEnum = hrSchema.enum("data_export_type", [...dataExportTypes]);
export const analyticsDimensionTypeEnum = hrSchema.enum("analytics_dimension_type", [
  ...analyticsDimensionTypes,
]);
export const employeeNotificationTypeEnum = hrSchema.enum("employee_notification_type", [
  ...employeeNotificationTypes,
]);
export const employeePreferenceTypeEnum = hrSchema.enum("employee_preference_type", [
  ...employeePreferenceTypes,
]);
export const courseDeliveryMethodEnum = hrSchema.enum("course_delivery_method", [
  ...courseDeliveryMethods,
]);
export const courseCatalogStatusEnum = hrSchema.enum("course_catalog_status", [
  ...courseCatalogStatuses,
]);
export const courseSessionStatusEnum = hrSchema.enum("course_session_status", [
  ...courseSessionStatuses,
]);
export const courseEnrollmentStatusEnum = hrSchema.enum("course_enrollment_status", [
  ...courseEnrollmentStatuses,
]);
export const learningPathEnrollmentStatusEnum = hrSchema.enum("learning_path_enrollment_status", [
  ...learningPathEnrollmentStatuses,
]);
export const learningProgressStatusEnum = hrSchema.enum("learning_progress_status", [
  ...learningProgressStatuses,
]);
export const trainingCostCategoryEnum = hrSchema.enum("training_cost_category", [
  ...trainingCostCategories,
]);
export const trainingCertificateStatusEnum = hrSchema.enum("training_certificate_status", [
  ...trainingCertificateStatuses,
]);
export const employeeSurveyWorkflowStatusEnum = hrSchema.enum("employee_survey_workflow_status", [
  ...employeeSurveyWorkflowStatuses,
]);
export const assessmentAttemptWorkflowStatusEnum = hrSchema.enum(
  "assessment_attempt_workflow_status",
  [...assessmentAttemptWorkflowStatuses]
);
export const courseMaterialTypeEnum = hrSchema.enum("course_material_type", [...courseMaterialTypes]);
export const courseModuleTypeEnum = hrSchema.enum("course_module_type", [...courseModuleTypes]);
export const courseEnrollmentSourceEnum = hrSchema.enum("course_enrollment_source", [
  ...courseEnrollmentSources,
]);

export const successionPotentialRatingEnum = hrSchema.enum("succession_potential_rating", [
  ...successionPotentialRatings,
]);
export const assignmentAllowanceTypeEnum = hrSchema.enum("assignment_allowance_type", [
  ...assignmentAllowanceTypes,
]);
export const allowancePaymentFrequencyEnum = hrSchema.enum("allowance_payment_frequency", [
  ...allowancePaymentFrequencies,
]);
export const relocationServiceTypeEnum = hrSchema.enum("relocation_service_type", [
  ...relocationServiceTypes,
]);
export const relocationServiceStatusEnum = hrSchema.enum("relocation_service_status", [
  ...relocationServiceStatuses,
]);
export const deiMetricTypeEnum = hrSchema.enum("dei_metric_type", [...deiMetricTypes]);
export const deiDimensionTypeEnum = hrSchema.enum("dei_dimension_type", [...deiDimensionTypes]);
export const bonusPointPeriodTypeEnum = hrSchema.enum("bonus_point_period_type", [
  ...bonusPointPeriodTypes,
]);
export const taxProofVerificationStatusEnum = hrSchema.enum("tax_proof_verification_status", [
  ...taxProofVerificationStatuses,
]);
export const overtimeRuleApplicableToEnum = hrSchema.enum("overtime_rule_applicable_to", [
  ...overtimeRuleApplicableTos,
]);
export const biometricPunchTypeEnum = hrSchema.enum("biometric_punch_type", [...biometricPunchTypes]);
export const appraisalTemplateApplicableToEnum = hrSchema.enum("appraisal_template_applicable_to", [
  ...appraisalTemplateApplicableTos,
]);
export const appraisalReviewFrequencyEnum = hrSchema.enum("appraisal_review_frequency", [
  ...appraisalReviewFrequencies,
]);
export const appraisalKraCategoryEnum = hrSchema.enum("appraisal_kra_category", [...appraisalKraCategories]);
export const employeeKraStatusEnum = hrSchema.enum("employee_kra_status", [...employeeKraStatuses]);
export const equityVestingTypeEnum = hrSchema.enum("equity_vesting_type", [...equityVestingTypes]);
export const equityGrantTypeEnum = hrSchema.enum("equity_grant_type", [...equityGrantTypes]);
export const equityGrantStatusEnum = hrSchema.enum("equity_grant_status", [...equityGrantStatuses]);
export const benefitCatalogStatusEnum = hrSchema.enum("benefit_catalog_status", [
  ...benefitCatalogStatuses,
]);
export const benefitEnrollmentWorkflowStatusEnum = hrSchema.enum(
  "benefit_enrollment_workflow_status",
  [...benefitEnrollmentWorkflowStatuses]
);
export const benefitDependentRelationshipEnum = hrSchema.enum("benefit_dependent_relationship", [
  ...benefitDependentRelationships,
]);
export const benefitClaimStatusEnum = hrSchema.enum("benefit_claim_status", [...benefitClaimStatuses]);
export const benefitPlanCoverageTypeEnum = hrSchema.enum("benefit_plan_coverage_type", [
  ...benefitPlanCoverageTypes,
]);
export const dependentCoverageStatusEnum = hrSchema.enum("dependent_coverage_status", [
  ...dependentCoverageStatuses,
]);

// SWOT Proposals
export const grievanceCategoryTypeEnum = hrSchema.enum("grievance_category_type", [
  ...grievanceCategoryTypes,
]);
export const grievanceStatusEnum = hrSchema.enum("grievance_status", [...grievanceStatuses]);
export const grievancePriorityEnum = hrSchema.enum("grievance_priority", [...grievancePriorities]);
export const grievanceChannelEnum = hrSchema.enum("grievance_channel", [...grievanceChannels]);
export const grievanceAppealStatusEnum = hrSchema.enum("grievance_appeal_status", [
  ...grievanceAppealStatuses,
]);
export const loanCategoryEnum = hrSchema.enum("loan_category", [...loanCategories]);
export const loanStatusEnum = hrSchema.enum("loan_status", [...loanStatuses]);
export const loanRepaymentFrequencyEnum = hrSchema.enum("loan_repayment_frequency", [
  ...loanRepaymentFrequencies,
]);
export const loanInterestTypeEnum = hrSchema.enum("loan_interest_type", [...loanInterestTypes]);
export const loanInstallmentStatusEnum = hrSchema.enum("loan_installment_status", [
  ...loanInstallmentStatuses,
]);
export const onboardingTaskStatusEnum = hrSchema.enum("onboarding_task_status", [
  ...onboardingTaskStatuses,
]);
export const onboardingTaskCategoryEnum = hrSchema.enum("onboarding_task_category", [
  ...onboardingTaskCategories,
]);
export const onboardingTaskAssigneeRoleEnum = hrSchema.enum("onboarding_task_assignee_role", [
  ...onboardingTaskAssigneeRoles,
]);
export const shiftSwapStatusEnum = hrSchema.enum("shift_swap_status", [...shiftSwapStatuses]);
export const policyDocumentCategoryEnum = hrSchema.enum("policy_document_category", [
  ...policyDocumentCategories,
]);
export const policyAcknowledgmentMethodEnum = hrSchema.enum("policy_acknowledgment_method", [
  ...policyAcknowledgmentMethods,
]);

// ============================================================================
// PHASE 6-9: ZOD SCHEMAS
// ============================================================================

// Phase 6
export const RequestTypeSchema = z.enum(requestTypes);
export const NotificationPrioritySchema = z.enum(notificationPriorities);
export const NotificationStatusSchema = z.enum(notificationStatuses);
export const NotificationDeliveryChannelSchema = z.enum(notificationDeliveryChannels);
export const SurveyTypeSchema = z.enum(surveyTypes);
export const EssSlaStatusSchema = z.enum(essSlaStatuses);
export const EssApprovalTaskStatusSchema = z.enum(essApprovalTaskStatuses);
export const EssApprovalTaskDecisionSchema = z.enum(essApprovalTaskDecisions);
export const EssRequestHistoryTransitionSourceSchema = z.enum(essRequestHistoryTransitionSources);
export const EmployeeNotificationReferenceKindSchema = z.enum(employeeNotificationReferenceKinds);
export const EssEventAggregateTypeSchema = z.enum(essEventAggregateTypes);
export const EssOutboxDeliveryStatusSchema = z.enum(essOutboxDeliveryStatuses);
export const SurveyInvitationStatusSchema = z.enum(surveyInvitationStatuses);
export const EmployeePushPlatformSchema = z.enum(employeePushPlatforms);
export const EssSurveyScoringModelSchema = z.enum(essSurveyScoringModels);

// Phase 7
export const SuccessionReadinessSchema = z.enum(successionReadinesses);
export const TalentPoolStatusSchema = z.enum(talentPoolStatuses);
export const TalentPoolTypeSchema = z.enum(talentPoolTypes);
export const SuccessionRiskLevelSchema = z.enum(successionRiskLevels);
export const SuccessionPlanStatusSchema = z.enum(successionPlanStatuses);
export const CareerAspirationStatusSchema = z.enum(careerAspirationStatuses);
export const CareerPathStatusSchema = z.enum(careerPathStatuses);
export const StepSkillImportanceSchema = z.enum(stepSkillImportances);
export const CareerAspirationSkillGapLevelSchema = z.enum(careerAspirationSkillGapLevels);
export const CompensationCycleStatusSchema = z.enum(compensationCycleStatuses);

// Phase 8
export const MetricTypeSchema = z.enum(metricTypes);
export const MetricFrequencySchema = z.enum(metricFrequencies);
export const ExportFormatSchema = z.enum(exportFormats);
export const ExportStatusSchema = z.enum(exportStatuses);
export const DashboardTypeSchema = z.enum(dashboardTypes);
export const AnalyticsFactGranularitySchema = z.enum(analyticsFactGranularities);

// Phase 9
export const AssignmentTypeSchema = z.enum(assignmentTypes);
export const AssignmentStatusSchema = z.enum(assignmentStatuses);
export const PermitTypeSchema = z.enum(permitTypes);
export const PermitStatusSchema = z.enum(permitStatuses);
export const ComplianceTypeSchema = z.enum(complianceTypes);
export const ComplianceStatusSchema = z.enum(complianceStatuses);
export const AssignmentReasonSchema = z.enum(assignmentReasons);
export const ComplianceFindingSeveritySchema = z.enum(complianceFindingSeverities);

// HR stabilization (Zod mirrors pgEnum tuples above)
export const PaymentDistributionStatusSchema = z.enum(paymentDistributionStatuses);
export const ExpensePolicyApplicableToSchema = z.enum(expensePolicyApplicableTos);
export const ExpenseTaxTreatmentSchema = z.enum(expenseTaxTreatments);
export const ExpenseReportTypeSchema = z.enum(expenseReportTypes);
export const ExpenseWorkflowTypeSchema = z.enum(expenseWorkflowTypes);
export const CashAdvanceStatusSchema = z.enum(cashAdvanceStatuses);
export const DataExportTypeSchema = z.enum(dataExportTypes);
export const AnalyticsDimensionTypeSchema = z.enum(analyticsDimensionTypes);
export const EmployeeNotificationTypeSchema = z.enum(employeeNotificationTypes);
export const EmployeePreferenceTypeSchema = z.enum(employeePreferenceTypes);
export const CourseDeliveryMethodSchema = z.enum(courseDeliveryMethods);
export const CourseCatalogStatusSchema = z.enum(courseCatalogStatuses);
export const CourseSessionStatusSchema = z.enum(courseSessionStatuses);
export const CourseEnrollmentStatusSchema = z.enum(courseEnrollmentStatuses);
export const LearningPathEnrollmentStatusSchema = z.enum(learningPathEnrollmentStatuses);
export const LearningProgressStatusSchema = z.enum(learningProgressStatuses);
export const TrainingCostCategorySchema = z.enum(trainingCostCategories);
export const TrainingCertificateStatusSchema = z.enum(trainingCertificateStatuses);
export const EmployeeSurveyWorkflowStatusSchema = z.enum(employeeSurveyWorkflowStatuses);
export const AssessmentAttemptWorkflowStatusSchema = z.enum(assessmentAttemptWorkflowStatuses);
export const CourseMaterialTypeSchema = z.enum(courseMaterialTypes);
export const CourseModuleTypeSchema = z.enum(courseModuleTypes);
export const CourseEnrollmentSourceSchema = z.enum(courseEnrollmentSources);

export const SuccessionPotentialRatingSchema = z.enum(successionPotentialRatings);
export const AssignmentAllowanceTypeSchema = z.enum(assignmentAllowanceTypes);
export const AllowancePaymentFrequencySchema = z.enum(allowancePaymentFrequencies);
export const RelocationServiceTypeSchema = z.enum(relocationServiceTypes);
export const RelocationServiceStatusSchema = z.enum(relocationServiceStatuses);
export const DeiMetricTypeSchema = z.enum(deiMetricTypes);
export const DeiDimensionTypeSchema = z.enum(deiDimensionTypes);
export const BonusPointPeriodTypeSchema = z.enum(bonusPointPeriodTypes);
export const TaxProofVerificationStatusSchema = z.enum(taxProofVerificationStatuses);
export const OvertimeRuleApplicableToSchema = z.enum(overtimeRuleApplicableTos);
export const BiometricPunchTypeSchema = z.enum(biometricPunchTypes);
export const AppraisalTemplateApplicableToSchema = z.enum(appraisalTemplateApplicableTos);
export const AppraisalReviewFrequencySchema = z.enum(appraisalReviewFrequencies);
export const AppraisalKraCategorySchema = z.enum(appraisalKraCategories);
export const EmployeeKraStatusSchema = z.enum(employeeKraStatuses);
export const EquityVestingTypeSchema = z.enum(equityVestingTypes);
export const EquityGrantTypeSchema = z.enum(equityGrantTypes);
export const EquityGrantStatusSchema = z.enum(equityGrantStatuses);
export const BenefitCatalogStatusSchema = z.enum(benefitCatalogStatuses);
export const BenefitEnrollmentWorkflowStatusSchema = z.enum(benefitEnrollmentWorkflowStatuses);
export const BenefitDependentRelationshipSchema = z.enum(benefitDependentRelationships);
export const BenefitClaimStatusSchema = z.enum(benefitClaimStatuses);
export const BenefitPlanCoverageTypeSchema = z.enum(benefitPlanCoverageTypes);
export const DependentCoverageStatusSchema = z.enum(dependentCoverageStatuses);

// SWOT Proposals
export const GrievanceCategoryTypeSchema = z.enum(grievanceCategoryTypes);
export const GrievanceStatusSchema = z.enum(grievanceStatuses);
export const GrievancePrioritySchema = z.enum(grievancePriorities);
export const GrievanceChannelSchema = z.enum(grievanceChannels);
export const GrievanceAppealStatusSchema = z.enum(grievanceAppealStatuses);
export const LoanCategorySchema = z.enum(loanCategories);
export const LoanStatusSchema = z.enum(loanStatuses);
export const LoanRepaymentFrequencySchema = z.enum(loanRepaymentFrequencies);
export const LoanInterestTypeSchema = z.enum(loanInterestTypes);
export const LoanInstallmentStatusSchema = z.enum(loanInstallmentStatuses);
export const OnboardingTaskStatusSchema = z.enum(onboardingTaskStatuses);
export const OnboardingTaskCategorySchema = z.enum(onboardingTaskCategories);
export const OnboardingTaskAssigneeRoleSchema = z.enum(onboardingTaskAssigneeRoles);
export const ShiftSwapStatusSchema = z.enum(shiftSwapStatuses);
export const PolicyDocumentCategorySchema = z.enum(policyDocumentCategories);
export const PolicyAcknowledgmentMethodSchema = z.enum(policyAcknowledgmentMethods);

// ============================================================================
// PHASE 6-9: TYPE EXPORTS
// ============================================================================

// Phase 6
export type RequestType = (typeof requestTypes)[number];
export type NotificationPriority = (typeof notificationPriorities)[number];
export type NotificationStatus = (typeof notificationStatuses)[number];
export type NotificationDeliveryChannel = (typeof notificationDeliveryChannels)[number];
export type SurveyType = (typeof surveyTypes)[number];
export type EssSlaStatus = (typeof essSlaStatuses)[number];
export type EssApprovalTaskStatus = (typeof essApprovalTaskStatuses)[number];
export type EssApprovalTaskDecision = (typeof essApprovalTaskDecisions)[number];
export type EssRequestHistoryTransitionSource = (typeof essRequestHistoryTransitionSources)[number];
export type EmployeeNotificationReferenceKind = (typeof employeeNotificationReferenceKinds)[number];
export type EssEventAggregateType = (typeof essEventAggregateTypes)[number];
export type EssOutboxDeliveryStatus = (typeof essOutboxDeliveryStatuses)[number];
export type SurveyInvitationStatus = (typeof surveyInvitationStatuses)[number];
export type EmployeePushPlatform = (typeof employeePushPlatforms)[number];
export type EssSurveyScoringModel = (typeof essSurveyScoringModels)[number];

// Phase 7
export type SuccessionReadiness = (typeof successionReadinesses)[number];
export type TalentPoolStatus = (typeof talentPoolStatuses)[number];
export type TalentPoolType = (typeof talentPoolTypes)[number];
export type SuccessionRiskLevel = (typeof successionRiskLevels)[number];
export type SuccessionPlanStatus = (typeof successionPlanStatuses)[number];
export type CareerAspirationStatus = (typeof careerAspirationStatuses)[number];
export type CareerPathStatus = (typeof careerPathStatuses)[number];
export type StepSkillImportance = (typeof stepSkillImportances)[number];
export type CareerAspirationSkillGapLevel = (typeof careerAspirationSkillGapLevels)[number];
export type CompensationCycleStatus = (typeof compensationCycleStatuses)[number];

// Phase 8
export type MetricType = (typeof metricTypes)[number];
export type MetricFrequency = (typeof metricFrequencies)[number];
export type ExportFormat = (typeof exportFormats)[number];
export type ExportStatus = (typeof exportStatuses)[number];
export type DashboardType = (typeof dashboardTypes)[number];
export type AnalyticsFactGranularity = (typeof analyticsFactGranularities)[number];

// Phase 9
export type AssignmentType = (typeof assignmentTypes)[number];
export type AssignmentStatus = (typeof assignmentStatuses)[number];
export type PermitType = (typeof permitTypes)[number];
export type PermitStatus = (typeof permitStatuses)[number];
export type ComplianceType = (typeof complianceTypes)[number];
export type ComplianceStatus = (typeof complianceStatuses)[number];
export type AssignmentReason = (typeof assignmentReasons)[number];
export type ComplianceFindingSeverity = (typeof complianceFindingSeverities)[number];

// SWOT Proposals
export type GrievanceCategoryType = (typeof grievanceCategoryTypes)[number];
export type GrievanceStatus = (typeof grievanceStatuses)[number];
export type GrievancePriority = (typeof grievancePriorities)[number];
export type GrievanceChannel = (typeof grievanceChannels)[number];
export type GrievanceAppealStatus = (typeof grievanceAppealStatuses)[number];
export type LoanCategory = (typeof loanCategories)[number];
export type LoanStatus = (typeof loanStatuses)[number];
export type LoanRepaymentFrequency = (typeof loanRepaymentFrequencies)[number];
export type LoanInterestType = (typeof loanInterestTypes)[number];
export type LoanInstallmentStatus = (typeof loanInstallmentStatuses)[number];
export type OnboardingTaskStatus = (typeof onboardingTaskStatuses)[number];
export type OnboardingTaskCategory = (typeof onboardingTaskCategories)[number];
export type OnboardingTaskAssigneeRole = (typeof onboardingTaskAssigneeRoles)[number];
export type ShiftSwapStatus = (typeof shiftSwapStatuses)[number];
export type PolicyDocumentCategory = (typeof policyDocumentCategories)[number];
export type PolicyAcknowledgmentMethod = (typeof policyAcknowledgmentMethods)[number];

// HR stabilization
export type PaymentDistributionStatus = (typeof paymentDistributionStatuses)[number];
export type ExpensePolicyApplicableTo = (typeof expensePolicyApplicableTos)[number];
export type ExpenseTaxTreatment = (typeof expenseTaxTreatments)[number];
export type ExpenseReportType = (typeof expenseReportTypes)[number];
export type ExpenseWorkflowType = (typeof expenseWorkflowTypes)[number];
export type CashAdvanceStatus = (typeof cashAdvanceStatuses)[number];
export type DataExportType = (typeof dataExportTypes)[number];
export type AnalyticsDimensionType = (typeof analyticsDimensionTypes)[number];
export type EmployeeNotificationType = (typeof employeeNotificationTypes)[number];
export type EmployeePreferenceType = (typeof employeePreferenceTypes)[number];
export type CourseDeliveryMethod = (typeof courseDeliveryMethods)[number];
export type CourseCatalogStatus = (typeof courseCatalogStatuses)[number];
export type CourseSessionStatus = (typeof courseSessionStatuses)[number];
export type CourseEnrollmentStatus = (typeof courseEnrollmentStatuses)[number];
export type LearningPathEnrollmentStatus = (typeof learningPathEnrollmentStatuses)[number];
export type LearningProgressStatus = (typeof learningProgressStatuses)[number];
export type TrainingCostCategory = (typeof trainingCostCategories)[number];
export type TrainingCertificateStatus = (typeof trainingCertificateStatuses)[number];
export type EmployeeSurveyWorkflowStatus = (typeof employeeSurveyWorkflowStatuses)[number];
export type AssessmentAttemptWorkflowStatus = (typeof assessmentAttemptWorkflowStatuses)[number];
export type CourseMaterialType = (typeof courseMaterialTypes)[number];
export type CourseModuleType = (typeof courseModuleTypes)[number];
export type CourseEnrollmentSource = (typeof courseEnrollmentSources)[number];

export type SuccessionPotentialRating = (typeof successionPotentialRatings)[number];
export type AssignmentAllowanceType = (typeof assignmentAllowanceTypes)[number];
export type AllowancePaymentFrequency = (typeof allowancePaymentFrequencies)[number];
export type RelocationServiceType = (typeof relocationServiceTypes)[number];
export type RelocationServiceStatus = (typeof relocationServiceStatuses)[number];
export type DeiMetricType = (typeof deiMetricTypes)[number];
export type DeiDimensionType = (typeof deiDimensionTypes)[number];
export type BonusPointPeriodType = (typeof bonusPointPeriodTypes)[number];
export type TaxProofVerificationStatus = (typeof taxProofVerificationStatuses)[number];
export type OvertimeRuleApplicableTo = (typeof overtimeRuleApplicableTos)[number];
export type BiometricPunchType = (typeof biometricPunchTypes)[number];
export type AppraisalTemplateApplicableTo = (typeof appraisalTemplateApplicableTos)[number];
export type AppraisalReviewFrequency = (typeof appraisalReviewFrequencies)[number];
export type AppraisalKraCategory = (typeof appraisalKraCategories)[number];
export type EmployeeKraStatus = (typeof employeeKraStatuses)[number];
export type EquityVestingType = (typeof equityVestingTypes)[number];
export type EquityGrantType = (typeof equityGrantTypes)[number];
export type EquityGrantStatus = (typeof equityGrantStatuses)[number];
export type BenefitCatalogStatus = (typeof benefitCatalogStatuses)[number];
export type BenefitEnrollmentWorkflowStatus = (typeof benefitEnrollmentWorkflowStatuses)[number];
export type BenefitDependentRelationship = (typeof benefitDependentRelationships)[number];
export type BenefitClaimStatus = (typeof benefitClaimStatuses)[number];
export type BenefitPlanCoverageType = (typeof benefitPlanCoverageTypes)[number];
export type DependentCoverageStatus = (typeof dependentCoverageStatuses)[number];
