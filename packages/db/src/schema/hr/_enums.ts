// ============================================================================
// HR ENUMS CATALOG
// Centralized pgEnum and Zod enum definitions for all HR domains.
// ============================================================================
import { z } from "zod/v4";

import { hrSchema } from "./_schema.js";

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

// Leave Status
export const leaveStatuses = ["draft", "submitted", "approved", "rejected", "cancelled"] as const;

// General approval workflow statuses (deferred via P0 cleanup)
export const approvalStatuses = [
  "draft",
  "submitted",
  "approved",
  "rejected",
  "cancelled",
] as const;

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

// Benefit Status
export const benefitStatuses = ["active", "inactive", "expired", "cancelled"] as const;

// Performance Review Status
export const performanceReviewStatuses = [
  "not_started",
  "in_progress",
  "submitted",
  "reviewed",
  "approved",
  "rejected",
] as const;

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

// Bonus Point Transaction Type
export const bonusPointTransactionTypes = ["earned", "redeemed", "expired", "adjusted"] as const;

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
export const fuelTypes = ["petrol", "diesel", "electric", "hybrid", "cng", "other"] as const;

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
export const leaveStatusEnum = hrSchema.enum("leave_status", [...leaveStatuses]);
export const approvalStatusEnum = hrSchema.enum("approval_status", [...approvalStatuses]);
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
export const benefitTypeEnum = hrSchema.enum("benefit_type", [...benefitTypes]);
export const benefitStatusEnum = hrSchema.enum("benefit_status", [...benefitStatuses]);
export const performanceReviewStatusEnum = hrSchema.enum("performance_review_status", [
  ...performanceReviewStatuses,
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
export const documentStatusEnum = hrSchema.enum("document_status", [...documentStatuses]);
export const expenseTypeEnum = hrSchema.enum("expense_type", [...expenseTypes]);
export const expenseStatusEnum = hrSchema.enum("expense_status", [...expenseStatuses]);
export const disciplinaryActionTypeEnum = hrSchema.enum("disciplinary_action_type", [
  ...disciplinaryActionTypes,
]);
export const shiftTypeEnum = hrSchema.enum("shift_type", [...shiftTypes]);
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
export const expenseCategoryEnum = hrSchema.enum("expense_category", [...expenseCategories]);
export const approvalLevelEnum = hrSchema.enum("approval_level", [...approvalLevels]);
export const bonusPointTransactionTypeEnum = hrSchema.enum("bonus_point_transaction_type", [
  ...bonusPointTransactionTypes,
]);
export const bonusPointTriggerEventEnum = hrSchema.enum("bonus_point_trigger_event", [
  ...bonusPointTriggerEvents,
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
export const taxExemptionCategoryTypeEnum = hrSchema.enum("tax_exemption_category_type", [
  ...taxExemptionCategoryTypes,
]);
export const taxDeclarationStatusEnum = hrSchema.enum("tax_declaration_status", [
  ...taxDeclarationStatuses,
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
export const LeaveStatusSchema = z.enum(leaveStatuses);
export const AttendanceStatusSchema = z.enum(attendanceStatuses);
export const ContractTypeSchema = z.enum(contractTypes);
export const ContractStatusSchema = z.enum(contractStatuses);
export const PayrollStatusSchema = z.enum(payrollStatuses);
export const PaymentMethodSchema = z.enum(paymentMethods);
export const CountrySchema = z.enum(hrCountryCodes);
export const TaxTypeSchema = z.enum(taxTypes);
export const StatutoryDeductionTypeSchema = z.enum(statutoryDeductionTypes);
export const PayrollAdjustmentTypeSchema = z.enum(payrollAdjustmentTypes);
export const BenefitTypeSchema = z.enum(benefitTypes);
export const BenefitStatusSchema = z.enum(benefitStatuses);
export const PerformanceReviewStatusSchema = z.enum(performanceReviewStatuses);
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
export const DocumentStatusSchema = z.enum(documentStatuses);
export const ExpenseTypeSchema = z.enum(expenseTypes);
export const ExpenseStatusSchema = z.enum(expenseStatuses);
export const DisciplinaryActionTypeSchema = z.enum(disciplinaryActionTypes);
export const ShiftTypeSchema = z.enum(shiftTypes);
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
export const ExpenseCategorySchema = z.enum(expenseCategories);
export const ApprovalLevelSchema = z.enum(approvalLevels);
export const BonusPointTransactionTypeSchema = z.enum(bonusPointTransactionTypes);
export const BonusPointTriggerEventSchema = z.enum(bonusPointTriggerEvents);
export const DisciplinaryActionSeveritySchema = z.enum(disciplinaryActionSeverities);
export const DisciplinaryActionStatusSchema = z.enum(disciplinaryActionStatuses);
export const CompensatoryLeaveStatusSchema = z.enum(compensatoryLeaveStatuses);
export const LeaveEncashmentStatusSchema = z.enum(leaveEncashmentStatuses);
export const TaxExemptionCategoryTypeSchema = z.enum(taxExemptionCategoryTypes);
export const TaxDeclarationStatusSchema = z.enum(taxDeclarationStatuses);
export const AttendanceRequestTypeSchema = z.enum(attendanceRequestTypes);
export const OvertimeRuleTypeSchema = z.enum(overtimeRuleTypes);
export const BiometricDeviceTypeSchema = z.enum(biometricDeviceTypes);
export const PromotionTypeSchema = z.enum(promotionTypes);
export const TransferTypeSchema = z.enum(transferTypes);
export const SeparationTypeSchema = z.enum(separationTypes);
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
export type LeaveStatus = (typeof leaveStatuses)[number];
export type AttendanceStatus = (typeof attendanceStatuses)[number];
export type ContractType = (typeof contractTypes)[number];
export type ContractStatus = (typeof contractStatuses)[number];
export type PayrollStatus = (typeof payrollStatuses)[number];
export type PaymentMethod = (typeof paymentMethods)[number];
export type HrCountryCode = (typeof hrCountryCodes)[number];
export type TaxType = (typeof taxTypes)[number];
export type StatutoryDeductionType = (typeof statutoryDeductionTypes)[number];
export type PayrollAdjustmentType = (typeof payrollAdjustmentTypes)[number];
export type BenefitType = (typeof benefitTypes)[number];
export type BenefitStatus = (typeof benefitStatuses)[number];
export type PerformanceReviewStatus = (typeof performanceReviewStatuses)[number];
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
export type DocumentStatus = (typeof documentStatuses)[number];
export type ExpenseType = (typeof expenseTypes)[number];
export type ExpenseStatus = (typeof expenseStatuses)[number];
export type DisciplinaryActionType = (typeof disciplinaryActionTypes)[number];
export type ShiftType = (typeof shiftTypes)[number];
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
export type ExpenseCategory = (typeof expenseCategories)[number];
export type ApprovalLevel = (typeof approvalLevels)[number];
export type BonusPointTransactionType = (typeof bonusPointTransactionTypes)[number];
export type BonusPointTriggerEvent = (typeof bonusPointTriggerEvents)[number];
export type DisciplinaryActionSeverity = (typeof disciplinaryActionSeverities)[number];
export type DisciplinaryActionStatus = (typeof disciplinaryActionStatuses)[number];
export type CompensatoryLeaveStatus = (typeof compensatoryLeaveStatuses)[number];
export type LeaveEncashmentStatus = (typeof leaveEncashmentStatuses)[number];
export type TaxExemptionCategoryType = (typeof taxExemptionCategoryTypes)[number];
export type TaxDeclarationStatus = (typeof taxDeclarationStatuses)[number];
export type AttendanceRequestType = (typeof attendanceRequestTypes)[number];
export type OvertimeRuleType = (typeof overtimeRuleTypes)[number];
export type BiometricDeviceType = (typeof biometricDeviceTypes)[number];
export type PromotionType = (typeof promotionTypes)[number];
export type TransferType = (typeof transferTypes)[number];
export type SeparationType = (typeof separationTypes)[number];
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
export const requestStatuses = ["draft", "submitted", "approved", "rejected", "cancelled"] as const;
export const notificationPriorities = ["low", "medium", "high", "urgent"] as const;
export const notificationStatuses = ["unread", "read", "archived"] as const;
export const surveyTypes = ["engagement", "pulse", "exit", "onboarding", "custom"] as const;

// Phase 7: Strategic Workforce Management
export const successionReadinesses = [
  "ready_now",
  "ready_1_year",
  "ready_2_years",
  "not_ready",
] as const;
export const talentPoolStatuses = ["active", "inactive"] as const;
export const careerPathStatuses = ["active", "inactive", "archived"] as const;
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

export const policyAcknowledgmentMethods = ["electronic", "written", "witnessed"] as const;

// ============================================================================
// PHASE 6-9: PG ENUMS
// ============================================================================

// Phase 6
export const requestTypeEnum = hrSchema.enum("request_type", [...requestTypes]);
export const requestStatusEnum = hrSchema.enum("request_status", [...requestStatuses]);
export const notificationPriorityEnum = hrSchema.enum("notification_priority", [
  ...notificationPriorities,
]);
export const notificationStatusEnum = hrSchema.enum("notification_status", [
  ...notificationStatuses,
]);
export const surveyTypeEnum = hrSchema.enum("survey_type", [...surveyTypes]);

// Phase 7
export const successionReadinessEnum = hrSchema.enum("succession_readiness", [
  ...successionReadinesses,
]);
export const talentPoolStatusEnum = hrSchema.enum("talent_pool_status", [...talentPoolStatuses]);
export const careerPathStatusEnum = hrSchema.enum("career_path_status", [...careerPathStatuses]);
export const compensationCycleStatusEnum = hrSchema.enum("compensation_cycle_status", [
  ...compensationCycleStatuses,
]);

// Phase 8
export const metricTypeEnum = hrSchema.enum("metric_type", [...metricTypes]);
export const metricFrequencyEnum = hrSchema.enum("metric_frequency", [...metricFrequencies]);
export const exportFormatEnum = hrSchema.enum("export_format", [...exportFormats]);
export const exportStatusEnum = hrSchema.enum("export_status", [...exportStatuses]);
export const dashboardTypeEnum = hrSchema.enum("dashboard_type", [...dashboardTypes]);

// Phase 9
export const assignmentTypeEnum = hrSchema.enum("assignment_type", [...assignmentTypes]);
export const assignmentStatusEnum = hrSchema.enum("assignment_status", [...assignmentStatuses]);
export const permitTypeEnum = hrSchema.enum("permit_type", [...permitTypes]);
export const permitStatusEnum = hrSchema.enum("permit_status", [...permitStatuses]);
export const complianceTypeEnum = hrSchema.enum("compliance_type", [...complianceTypes]);
export const complianceStatusEnum = hrSchema.enum("compliance_status", [...complianceStatuses]);

// SWOT Proposals
export const grievanceCategoryTypeEnum = hrSchema.enum("grievance_category_type", [
  ...grievanceCategoryTypes,
]);
export const grievanceStatusEnum = hrSchema.enum("grievance_status", [...grievanceStatuses]);
export const grievancePriorityEnum = hrSchema.enum("grievance_priority", [...grievancePriorities]);
export const loanCategoryEnum = hrSchema.enum("loan_category", [...loanCategories]);
export const loanStatusEnum = hrSchema.enum("loan_status", [...loanStatuses]);
export const loanRepaymentFrequencyEnum = hrSchema.enum("loan_repayment_frequency", [
  ...loanRepaymentFrequencies,
]);
export const onboardingTaskStatusEnum = hrSchema.enum("onboarding_task_status", [
  ...onboardingTaskStatuses,
]);
export const onboardingTaskCategoryEnum = hrSchema.enum("onboarding_task_category", [
  ...onboardingTaskCategories,
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
export const RequestStatusSchema = z.enum(requestStatuses);
export const NotificationPrioritySchema = z.enum(notificationPriorities);
export const NotificationStatusSchema = z.enum(notificationStatuses);
export const SurveyTypeSchema = z.enum(surveyTypes);

// Phase 7
export const SuccessionReadinessSchema = z.enum(successionReadinesses);
export const TalentPoolStatusSchema = z.enum(talentPoolStatuses);
export const CareerPathStatusSchema = z.enum(careerPathStatuses);
export const CompensationCycleStatusSchema = z.enum(compensationCycleStatuses);

// Phase 8
export const MetricTypeSchema = z.enum(metricTypes);
export const MetricFrequencySchema = z.enum(metricFrequencies);
export const ExportFormatSchema = z.enum(exportFormats);
export const ExportStatusSchema = z.enum(exportStatuses);
export const DashboardTypeSchema = z.enum(dashboardTypes);

// Phase 9
export const AssignmentTypeSchema = z.enum(assignmentTypes);
export const AssignmentStatusSchema = z.enum(assignmentStatuses);
export const PermitTypeSchema = z.enum(permitTypes);
export const PermitStatusSchema = z.enum(permitStatuses);
export const ComplianceTypeSchema = z.enum(complianceTypes);
export const ComplianceStatusSchema = z.enum(complianceStatuses);

// SWOT Proposals
export const GrievanceCategoryTypeSchema = z.enum(grievanceCategoryTypes);
export const GrievanceStatusSchema = z.enum(grievanceStatuses);
export const GrievancePrioritySchema = z.enum(grievancePriorities);
export const LoanCategorySchema = z.enum(loanCategories);
export const LoanStatusSchema = z.enum(loanStatuses);
export const LoanRepaymentFrequencySchema = z.enum(loanRepaymentFrequencies);
export const OnboardingTaskStatusSchema = z.enum(onboardingTaskStatuses);
export const OnboardingTaskCategorySchema = z.enum(onboardingTaskCategories);
export const ShiftSwapStatusSchema = z.enum(shiftSwapStatuses);
export const PolicyDocumentCategorySchema = z.enum(policyDocumentCategories);
export const PolicyAcknowledgmentMethodSchema = z.enum(policyAcknowledgmentMethods);

// ============================================================================
// PHASE 6-9: TYPE EXPORTS
// ============================================================================

// Phase 6
export type RequestType = (typeof requestTypes)[number];
export type RequestStatus = (typeof requestStatuses)[number];
export type NotificationPriority = (typeof notificationPriorities)[number];
export type NotificationStatus = (typeof notificationStatuses)[number];
export type SurveyType = (typeof surveyTypes)[number];

// Phase 7
export type SuccessionReadiness = (typeof successionReadinesses)[number];
export type TalentPoolStatus = (typeof talentPoolStatuses)[number];
export type CareerPathStatus = (typeof careerPathStatuses)[number];
export type CompensationCycleStatus = (typeof compensationCycleStatuses)[number];

// Phase 8
export type MetricType = (typeof metricTypes)[number];
export type MetricFrequency = (typeof metricFrequencies)[number];
export type ExportFormat = (typeof exportFormats)[number];
export type ExportStatus = (typeof exportStatuses)[number];
export type DashboardType = (typeof dashboardTypes)[number];

// Phase 9
export type AssignmentType = (typeof assignmentTypes)[number];
export type AssignmentStatus = (typeof assignmentStatuses)[number];
export type PermitType = (typeof permitTypes)[number];
export type PermitStatus = (typeof permitStatuses)[number];
export type ComplianceType = (typeof complianceTypes)[number];
export type ComplianceStatus = (typeof complianceStatuses)[number];

// SWOT Proposals
export type GrievanceCategoryType = (typeof grievanceCategoryTypes)[number];
export type GrievanceStatus = (typeof grievanceStatuses)[number];
export type GrievancePriority = (typeof grievancePriorities)[number];
export type LoanCategory = (typeof loanCategories)[number];
export type LoanStatus = (typeof loanStatuses)[number];
export type LoanRepaymentFrequency = (typeof loanRepaymentFrequencies)[number];
export type OnboardingTaskStatus = (typeof onboardingTaskStatuses)[number];
export type OnboardingTaskCategory = (typeof onboardingTaskCategories)[number];
export type ShiftSwapStatus = (typeof shiftSwapStatuses)[number];
export type PolicyDocumentCategory = (typeof policyDocumentCategories)[number];
export type PolicyAcknowledgmentMethod = (typeof policyAcknowledgmentMethods)[number];
