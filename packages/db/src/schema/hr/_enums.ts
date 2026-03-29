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
  "maybe",
  "no_hire",
  "no_show",
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

// Training Status
export const trainingStatuses = [
  "draft",
  "scheduled",
  "in_progress",
  "completed",
  "cancelled",
] as const;

// Training Type
export const trainingTypes = [
  "onboarding",
  "technical",
  "soft_skills",
  "compliance",
  "leadership",
] as const;

// Document Type
export const documentTypes = [
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
export const courseStatuses = [
  "draft",
  "published",
  "archived",
  "retired",
] as const;

// Course Level
export const courseLevels = [
  "beginner",
  "intermediate",
  "advanced",
  "expert",
] as const;

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
export const assessmentStatuses = [
  "draft",
  "published",
  "active",
  "closed",
  "archived",
] as const;

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
export const attemptStatuses = [
  "in_progress",
  "submitted",
  "graded",
  "failed",
  "passed",
] as const;

// Certification Status
export const certificationLevelStatuses = [
  "active",
  "expired",
  "revoked",
  "pending",
] as const;

// Training Feedback Status
export const feedbackStatuses = [
  "draft",
  "submitted",
  "reviewed",
  "archived",
] as const;

// Learning Path Status
export const learningPathStatuses = [
  "draft",
  "active",
  "archived",
  "retired",
] as const;

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
export const attendanceStatusEnum = hrSchema.enum("attendance_status", [...attendanceStatuses]);
export const contractTypeEnum = hrSchema.enum("contract_type", [...contractTypes]);
export const contractStatusEnum = hrSchema.enum("contract_status", [...contractStatuses]);
export const payrollStatusEnum = hrSchema.enum("payroll_status", [...payrollStatuses]);
export const paymentMethodEnum = hrSchema.enum("payment_method", [...paymentMethods]);
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
export const offerStatusEnum = hrSchema.enum("offer_status", [...offerStatuses]);
export const trainingStatusEnum = hrSchema.enum("training_status", [...trainingStatuses]);
export const trainingTypeEnum = hrSchema.enum("training_type", [...trainingTypes]);
export const documentTypeEnum = hrSchema.enum("document_type", [...documentTypes]);
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
export const learningPathStatusEnum = hrSchema.enum("learning_path_status", [...learningPathStatuses]);

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
export const OfferStatusSchema = z.enum(offerStatuses);
export const TrainingStatusSchema = z.enum(trainingStatuses);
export const TrainingTypeSchema = z.enum(trainingTypes);
export const DocumentTypeSchema = z.enum(documentTypes);
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
export type OfferStatus = (typeof offerStatuses)[number];
export type TrainingStatus = (typeof trainingStatuses)[number];
export type TrainingType = (typeof trainingTypes)[number];
export type DocumentType = (typeof documentTypes)[number];
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
