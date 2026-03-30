// ============================================================================
// HR DOMAIN: LEARNING & DEVELOPMENT (Phase 2)
// Learning management, assessments, certification, and training cost tracking
// Tables: courses, course_modules, learning_paths, assessments, assessment_questions
// ============================================================================
import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  foreignKey,
  index,
  integer,
  numeric,
  text,
  date,
  uuid,
  uniqueIndex,
  jsonb,
} from "drizzle-orm/pg-core";
import { z } from "zod/v4";

import { hrSchema } from "./_schema.js";
import {
  courseLevelEnum,
  courseDeliveryMethodEnum,
  courseCatalogStatusEnum,
  learningPathStatusEnum,
  courseSessionStatusEnum,
  courseEnrollmentStatusEnum,
  learningPathEnrollmentStatusEnum,
  learningProgressStatusEnum,
  assessmentTypeEnum,
  questionTypeEnum,
  assessmentAttemptWorkflowStatusEnum,
  trainingCostCategoryEnum,
  trainingCertificateStatusEnum,
  courseMaterialTypeEnum,
  courseModuleTypeEnum,
  courseEnrollmentSourceEnum,
  CourseLevelSchema,
  CourseDeliveryMethodSchema,
  CourseCatalogStatusSchema,
  CourseSessionStatusSchema,
  CourseEnrollmentStatusSchema,
  LearningPathEnrollmentStatusSchema,
  LearningProgressStatusSchema,
  AssessmentTypeSchema,
  QuestionTypeSchema,
  AssessmentAttemptWorkflowStatusSchema,
  TrainingCostCategorySchema,
  TrainingCertificateStatusSchema,
  CourseMaterialTypeSchema,
  CourseModuleTypeSchema,
  CourseEnrollmentSourceSchema,
  LearningPathStatusSchema,
} from "./_enums.js";
import { tenantIsolationPolicies, serviceBypassPolicy } from "../../rls/index.js";
import {
  auditColumns,
  nameColumn,
  softDeleteColumns,
  timestampColumns,
} from "../../columns/index.js";
import { employees } from "./people.js";
import { departments } from "./people.js";
import { currencies } from "../reference/index.js";
import { tenants } from "../core/tenants.js";
import {
  CourseIdSchema,
  CourseModuleIdSchema,
  LearningPathIdSchema,
  AssessmentIdSchema,
  AssessmentQuestionIdSchema,
  CourseSessionIdSchema,
  CourseEnrollmentIdSchema,
  LearningProgressIdSchema,
  TrainingFeedbackIdSchema,
  TrainingCostIdSchema,
  LearningPathEnrollmentIdSchema,
  AssessmentAttemptIdSchema,
  CertificateIdSchema,
  CoursePrerequisiteIdSchema,
  CourseMaterialIdSchema,
  EmployeeIdSchema,
  personNameSchema,
  boundedPercentageSchema,
  hrTenantIdSchema,
  addIssueIfSerializedJsonExceeds,
  HR_JSONB_DEFAULT_MAX_BYTES,
} from "./_zodShared.js";

// ============================================================================
// TABLE: courses
// Training courses (enhanced from Phase 0 training table)
// ============================================================================
export const courses = hrSchema.table(
  "courses",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: integer("tenant_id").notNull(),
    courseCode: text("course_code").notNull(), // Unique course identifier
    ...nameColumn,
    description: text("description"),
    duration: integer("duration").notNull(), // in minutes
    level: courseLevelEnum("level").notNull().default("beginner"),
    deliveryMethod: courseDeliveryMethodEnum("delivery_method").notNull().default("blended"),
    categoryId: integer("category_id"), // Link to departments or course categories
    instructorId: uuid("instructor_id"), // Default instructor for the course
    cost: numeric("cost", { precision: 12, scale: 2 }), // Course cost
    currencyId: integer("currency_id"), // Currency for cost
    accreditation: text("accreditation"), // Accreditation body or certification
    prerequisites: text("prerequisites"), // Text description of prerequisites
    learningObjectives: text("learning_objectives"), // Course learning objectives
    targetAudience: text("target_audience"), // Target audience description
    maxCapacity: integer("max_capacity"), // Maximum enrollment capacity
    status: courseCatalogStatusEnum("status").notNull().default("active"),
    /** Semantic version for evolving catalog definitions (e.g. 1.0, 2024-Q1). */
    courseVersion: text("course_version").notNull().default("1.0"),
    ...timestampColumns,
    ...softDeleteColumns,
    ...auditColumns,
  },
  (table) => [
    foreignKey({ columns: [table.tenantId], foreignColumns: [tenants.tenantId] }),
    foreignKey({
      columns: [table.tenantId, table.categoryId],
      foreignColumns: [departments.tenantId, departments.id],
    }),
    foreignKey({
      columns: [table.tenantId, table.instructorId],
      foreignColumns: [employees.tenantId, employees.id],
    }),
    foreignKey({ columns: [table.currencyId], foreignColumns: [currencies.currencyId] }),
    uniqueIndex("courses_tenant_code_unique")
      .on(table.tenantId, table.courseCode)
      .where(sql`${table.deletedAt} IS NULL`),
    check("duration_positive", sql`${table.duration} > 0`),
    check("cost_positive", sql`${table.cost} IS NULL OR ${table.cost} >= 0`),
    check("max_capacity_positive", sql`${table.maxCapacity} IS NULL OR ${table.maxCapacity} > 0`),
    check(
      "courses_course_version_max_len",
      sql`char_length(${table.courseVersion}) >= 1 AND char_length(${table.courseVersion}) <= 32`
    ),
    index("courses_tenant_idx").on(table.tenantId),
    index("courses_level_idx").on(table.level),
    index("courses_delivery_method_idx").on(table.deliveryMethod),
    index("courses_category_id_idx").on(table.categoryId),
    index("courses_instructor_id_idx").on(table.instructorId),
    ...tenantIsolationPolicies("courses"),
    serviceBypassPolicy("courses"),
  ]
);

// ============================================================================
// TABLE: course_modules
// Course modules/chapters with prerequisites
// ============================================================================
export const courseModules = hrSchema.table(
  "course_modules",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: integer("tenant_id").notNull(),
    courseId: uuid("course_id").notNull(),
    ...nameColumn,
    description: text("description"),
    moduleOrder: integer("module_order").notNull(),
    duration: integer("duration").notNull(), // in minutes
    moduleType: courseModuleTypeEnum("module_type").notNull().default("lecture"),
    prerequisiteModuleId: uuid("prerequisite_module_id"), // Self-referential FK
    isActive: boolean("is_active").notNull().default(true),
    ...timestampColumns,
    ...softDeleteColumns,
    ...auditColumns,
  },
  (table) => [
    foreignKey({
      columns: [table.tenantId, table.courseId],
      foreignColumns: [courses.tenantId, courses.id],
    }),
    foreignKey({
      columns: [table.tenantId, table.prerequisiteModuleId],
      foreignColumns: [table.tenantId, table.id],
    }),
    check("duration_positive", sql`${table.duration} > 0`),
    check("order_positive", sql`${table.moduleOrder} > 0`),
    index("course_modules_tenant_idx").on(table.tenantId),
    index("course_modules_course_id_idx").on(table.courseId),
    index("course_modules_module_type_idx").on(table.tenantId, table.moduleType),
    ...tenantIsolationPolicies("course_modules"),
    serviceBypassPolicy("course_modules"),
  ]
);

// ============================================================================
// TABLE: learning_paths
// Career development learning tracks
// ============================================================================
export const learningPaths = hrSchema.table(
  "learning_paths",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: integer("tenant_id").notNull(),
    ...nameColumn,
    description: text("description"),
    targetRole: text("target_role"), // role/position this path prepares for
    estimatedDuration: integer("estimated_duration"), // in days
    status: learningPathStatusEnum("status").notNull().default("active"),
    ...timestampColumns,
    ...softDeleteColumns,
    ...auditColumns,
  },
  (table) => [
    index("learning_paths_tenant_idx").on(table.tenantId),
    index("learning_paths_target_role_idx").on(table.targetRole),
    ...tenantIsolationPolicies("learning_paths"),
    serviceBypassPolicy("learning_paths"),
  ]
);

// ============================================================================
// TABLE: learning_path_courses
// Many-to-many: learning paths ↔ courses
// ============================================================================
export const learningPathCourses = hrSchema.table(
  "learning_path_courses",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: integer("tenant_id").notNull(),
    learningPathId: uuid("learning_path_id").notNull(),
    courseId: uuid("course_id").notNull(),
    courseOrder: integer("course_order").notNull(),
    isRequired: boolean("is_required").notNull().default(true),
    ...timestampColumns,
  },
  (table) => [
    foreignKey({
      columns: [table.tenantId, table.learningPathId],
      foreignColumns: [learningPaths.tenantId, learningPaths.id],
    }),
    foreignKey({
      columns: [table.tenantId, table.courseId],
      foreignColumns: [courses.tenantId, courses.id],
    }),
    uniqueIndex("learning_path_courses_path_course_unique").on(
      table.tenantId,
      table.learningPathId,
      table.courseId
    ),
    index("learning_path_courses_tenant_idx").on(table.tenantId),
    ...tenantIsolationPolicies("learning_path_courses"),
    serviceBypassPolicy("learning_path_courses"),
  ]
);

// ============================================================================
// TABLE: assessments
// Quizzes and exams
// ============================================================================
export const assessments = hrSchema.table(
  "assessments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: integer("tenant_id").notNull(),
    courseModuleId: uuid("course_module_id").notNull(),
    ...nameColumn,
    description: text("description"),
    assessmentType: assessmentTypeEnum("assessment_type").notNull(),
    passingScore: numeric("passing_score", { precision: 5, scale: 2 }).notNull(), // 0-100
    timeLimit: integer("time_limit"), // in minutes
    maxAttempts: integer("max_attempts").default(3),
    randomizeQuestions: boolean("randomize_questions").notNull().default(false),
    ...timestampColumns,
    ...softDeleteColumns,
    ...auditColumns,
  },
  (table) => [
    foreignKey({
      columns: [table.tenantId, table.courseModuleId],
      foreignColumns: [courseModules.tenantId, courseModules.id],
    }),
    check("passing_score_valid", sql`${table.passingScore} >= 0 AND ${table.passingScore} <= 100`),
    check("time_limit_positive", sql`${table.timeLimit} IS NULL OR ${table.timeLimit} > 0`),
    index("assessments_tenant_idx").on(table.tenantId),
    index("assessments_course_module_id_idx").on(table.courseModuleId),
    ...tenantIsolationPolicies("assessments"),
    serviceBypassPolicy("assessments"),
  ]
);

// ============================================================================
// TABLE: assessment_questions
// Question bank for assessments
// ============================================================================
export const assessmentQuestions = hrSchema.table(
  "assessment_questions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: integer("tenant_id").notNull(),
    assessmentId: uuid("assessment_id").notNull(),
    questionText: text("question_text").notNull(),
    questionType: questionTypeEnum("question_type").notNull(),
    correctAnswer: text("correct_answer").notNull(),
    points: numeric("points", { precision: 5, scale: 2 }).notNull().default("1"),
    questionOrder: integer("question_order").notNull(),
    ...timestampColumns,
    ...softDeleteColumns,
    ...auditColumns,
  },
  (table) => [
    foreignKey({
      columns: [table.tenantId, table.assessmentId],
      foreignColumns: [assessments.tenantId, assessments.id],
    }),
    check("points_positive", sql`${table.points} > 0`),
    index("assessment_questions_tenant_idx").on(table.tenantId),
    index("assessment_questions_assessment_id_idx").on(table.assessmentId),
    ...tenantIsolationPolicies("assessment_questions"),
    serviceBypassPolicy("assessment_questions"),
  ]
);

// ============================================================================
// TABLE: assessment_attempts
// Individual assessment attempts tracking
// ============================================================================
export const assessmentAttempts = hrSchema.table(
  "assessment_attempts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: integer("tenant_id").notNull(),
    assessmentId: uuid("assessment_id").notNull(),
    courseEnrollmentId: uuid("course_enrollment_id").notNull(),
    attemptNumber: integer("attempt_number").notNull(),
    startedAt: date("started_at", { mode: "string" }).notNull(),
    completedAt: date("completed_at", { mode: "string" }),
    score: numeric("score", { precision: 5, scale: 2 }),
    maxScore: numeric("max_score", { precision: 5, scale: 2 }).notNull(),
    percentage: numeric("percentage", { precision: 5, scale: 2 }),
    status: assessmentAttemptWorkflowStatusEnum("status").notNull().default("in_progress"),
    answers: jsonb("answers").$type<Record<string, unknown>>(),
    feedback: text("feedback"),
    timeSpentMinutes: integer("time_spent_minutes"),
    ...timestampColumns,
    ...auditColumns,
  },
  (table) => [
    foreignKey({
      columns: [table.tenantId, table.assessmentId],
      foreignColumns: [assessments.tenantId, assessments.id],
    }),
    foreignKey({
      columns: [table.tenantId, table.courseEnrollmentId],
      foreignColumns: [courseEnrollments.tenantId, courseEnrollments.id],
    }),
    uniqueIndex("assessment_attempts_tenant_assessment_enrollment_attempt_unique").on(
      table.tenantId,
      table.assessmentId,
      table.courseEnrollmentId,
      table.attemptNumber
    ),
    check("attempt_number_positive", sql`${table.attemptNumber} > 0`),
    check("assessment_attempts_max_score_positive", sql`${table.maxScore} > 0`),
    check(
      "score_valid",
      sql`${table.score} IS NULL OR (${table.score} >= 0 AND ${table.score} <= ${table.maxScore})`
    ),
    check(
      "percentage_valid",
      sql`${table.percentage} IS NULL OR (${table.percentage} >= 0 AND ${table.percentage} <= 100)`
    ),
    check(
      "assessment_attempts_percentage_matches_score",
      sql`${table.percentage} IS NULL OR (${table.score} IS NOT NULL AND round((${table.score} * 100) / ${table.maxScore}, 2) = ${table.percentage})`
    ),
    check(
      "time_spent_positive",
      sql`${table.timeSpentMinutes} IS NULL OR ${table.timeSpentMinutes} >= 0`
    ),
    check(
      "assessment_attempts_feedback_max_len",
      sql`${table.feedback} IS NULL OR char_length(${table.feedback}) <= 2000`
    ),
    index("assessment_attempts_tenant_idx").on(table.tenantId),
    index("assessment_attempts_assessment_id_idx").on(table.assessmentId),
    index("assessment_attempts_course_enrollment_id_idx").on(table.courseEnrollmentId),
    index("assessment_attempts_status_idx").on(table.status),
    ...tenantIsolationPolicies("assessment_attempts"),
    serviceBypassPolicy("assessment_attempts"),
  ]
);

// ============================================================================
// TABLE: course_sessions
// Scheduled training sessions/classes
// ============================================================================
export const courseSessions = hrSchema.table(
  "course_sessions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: integer("tenant_id").notNull(),
    courseId: uuid("course_id").notNull(),
    ...nameColumn,
    startDate: date("start_date", { mode: "string" }).notNull(),
    endDate: date("end_date", { mode: "string" }).notNull(),
    maxCapacity: integer("max_capacity").notNull(),
    instructorId: uuid("instructor_id"), // Usually employee ID
    location: text("location"),
    status: courseSessionStatusEnum("status").notNull().default("scheduled"),
    ...timestampColumns,
    ...softDeleteColumns,
    ...auditColumns,
  },
  (table) => [
    foreignKey({
      columns: [table.tenantId, table.courseId],
      foreignColumns: [courses.tenantId, courses.id],
    }),
    foreignKey({
      columns: [table.tenantId, table.instructorId],
      foreignColumns: [employees.tenantId, employees.id],
    }),
    check("date_order", sql`${table.endDate} >= ${table.startDate}`),
    check("capacity_positive", sql`${table.maxCapacity} > 0`),
    index("course_sessions_tenant_idx").on(table.tenantId),
    index("course_sessions_course_id_idx").on(table.courseId),
    index("course_sessions_start_date_idx").on(table.startDate),
    ...tenantIsolationPolicies("course_sessions"),
    serviceBypassPolicy("course_sessions"),
  ]
);

// ============================================================================
// TABLE: course_enrollments
// Employee enrollments in courses (enhanced with progress)
// ============================================================================
export const courseEnrollments = hrSchema.table(
  "course_enrollments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: integer("tenant_id").notNull(),
    employeeId: uuid("employee_id").notNull(),
    courseSessionId: uuid("course_session_id").notNull(),
    enrollmentDate: date("enrollment_date", { mode: "string" }).notNull(),
    completionDate: date("completion_date", { mode: "string" }),
    status: courseEnrollmentStatusEnum("status").notNull().default("registered"),
    enrollmentSource: courseEnrollmentSourceEnum("enrollment_source").notNull().default("self_enrolled"),
    progressPercentage: numeric("progress_percentage", { precision: 5, scale: 2 }).default("0"),
    finalScore: numeric("final_score", { precision: 5, scale: 2 }),
    ...timestampColumns,
    ...softDeleteColumns,
    ...auditColumns,
  },
  (table) => [
    foreignKey({
      columns: [table.tenantId, table.courseSessionId],
      foreignColumns: [courseSessions.tenantId, courseSessions.id],
    }),
    foreignKey({
      columns: [table.tenantId, table.employeeId],
      foreignColumns: [employees.tenantId, employees.id],
    }),
    check(
      "progress_valid",
      sql`${table.progressPercentage} >= 0 AND ${table.progressPercentage} <= 100`
    ),
    check(
      "score_valid",
      sql`${table.finalScore} IS NULL OR (${table.finalScore} >= 0 AND ${table.finalScore} <= 100)`
    ),
    check(
      "course_enrollments_completed_has_completion_date",
      sql`${table.status}::text != 'completed' OR ${table.completionDate} IS NOT NULL`
    ),
    index("course_enrollments_tenant_idx").on(table.tenantId),
    index("course_enrollments_employee_id_idx").on(table.employeeId),
    index("course_enrollments_status_idx").on(table.status),
    index("course_enrollments_enrollment_source_idx").on(table.tenantId, table.enrollmentSource),
    ...tenantIsolationPolicies("course_enrollments"),
    serviceBypassPolicy("course_enrollments"),
  ]
);

// ============================================================================
// TABLE: learning_progress
// Module-level completion tracking
// ============================================================================
export const learningProgress = hrSchema.table(
  "learning_progress",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: integer("tenant_id").notNull(),
    courseEnrollmentId: uuid("course_enrollment_id").notNull(),
    courseModuleId: uuid("course_module_id").notNull(),
    startedAt: date("started_at", { mode: "string" }).notNull(),
    completedAt: date("completed_at", { mode: "string" }),
    status: learningProgressStatusEnum("status").notNull().default("in_progress"),
    scorePercentage: numeric("score_percentage", { precision: 5, scale: 2 }),
    ...timestampColumns,
  },
  (table) => [
    foreignKey({
      columns: [table.tenantId, table.courseEnrollmentId],
      foreignColumns: [courseEnrollments.tenantId, courseEnrollments.id],
    }),
    foreignKey({
      columns: [table.tenantId, table.courseModuleId],
      foreignColumns: [courseModules.tenantId, courseModules.id],
    }),
    uniqueIndex("learning_progress_tenant_enrollment_module_unique").on(
      table.tenantId,
      table.courseEnrollmentId,
      table.courseModuleId
    ),
    check(
      "score_valid",
      sql`${table.scorePercentage} IS NULL OR (${table.scorePercentage} >= 0 AND ${table.scorePercentage} <= 100)`
    ),
    index("learning_progress_tenant_idx").on(table.tenantId),
    index("learning_progress_status_idx").on(table.status),
    ...tenantIsolationPolicies("learning_progress"),
    serviceBypassPolicy("learning_progress"),
  ]
);

// ============================================================================
// TABLE: training_feedback
// Post-training course evaluations
// ============================================================================
export const trainingFeedback = hrSchema.table(
  "training_feedback",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: integer("tenant_id").notNull(),
    courseEnrollmentId: uuid("course_enrollment_id").notNull(),
    courseRating: numeric("course_rating", { precision: 3, scale: 1 }).notNull(), // 1-5
    instructorRating: numeric("instructor_rating", { precision: 3, scale: 1 }), // 1-5
    relevance: numeric("relevance", { precision: 3, scale: 1 }), // 1-5
    comments: text("comments"),
    feedbackDate: date("feedback_date", { mode: "string" }).notNull(),
    ...timestampColumns,
    ...auditColumns,
  },
  (table) => [
    foreignKey({
      columns: [table.tenantId, table.courseEnrollmentId],
      foreignColumns: [courseEnrollments.tenantId, courseEnrollments.id],
    }),
    check("rating_valid", sql`${table.courseRating} >= 1 AND ${table.courseRating} <= 5`),
    check(
      "instructor_rating_valid",
      sql`${table.instructorRating} IS NULL OR (${table.instructorRating} >= 1 AND ${table.instructorRating} <= 5)`
    ),
    check(
      "training_feedback_comments_max_len",
      sql`${table.comments} IS NULL OR char_length(${table.comments}) <= 5000`
    ),
    index("training_feedback_tenant_idx").on(table.tenantId),
    index("training_feedback_course_enrollment_id_idx").on(table.courseEnrollmentId),
    ...tenantIsolationPolicies("training_feedback"),
    serviceBypassPolicy("training_feedback"),
  ]
);

// ============================================================================
// TABLE: training_costs
// Budget tracking for training programs
// ============================================================================
export const trainingCosts = hrSchema.table(
  "training_costs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: integer("tenant_id").notNull(),
    courseSessionId: uuid("course_session_id").notNull(),
    costCategory: trainingCostCategoryEnum("cost_category").notNull(),
    amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
    currencyId: integer("currency_id").notNull(),
    description: text("description"),
    ...timestampColumns,
    ...softDeleteColumns,
    ...auditColumns,
  },
  (table) => [
    foreignKey({
      columns: [table.tenantId, table.courseSessionId],
      foreignColumns: [courseSessions.tenantId, courseSessions.id],
    }),
    foreignKey({
      columns: [table.currencyId],
      foreignColumns: [currencies.currencyId],
    }),
    check("amount_positive", sql`${table.amount} > 0`),
    index("training_costs_tenant_idx").on(table.tenantId),
    index("training_costs_currency_id_idx").on(table.currencyId),
    index("training_costs_course_session_id_idx").on(table.courseSessionId),
    ...tenantIsolationPolicies("training_costs"),
    serviceBypassPolicy("training_costs"),
  ]
);

// ============================================================================
// TABLE: learning_path_enrollments
// Employee enrollments in career development learning paths
// ============================================================================
export const learningPathEnrollments = hrSchema.table(
  "learning_path_enrollments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: integer("tenant_id").notNull(),
    employeeId: uuid("employee_id").notNull(),
    learningPathId: uuid("learning_path_id").notNull(),
    enrollmentDate: date("enrollment_date", { mode: "string" }).notNull(),
    targetCompletionDate: date("target_completion_date", { mode: "string" }),
    completionDate: date("completion_date", { mode: "string" }),
    status: learningPathEnrollmentStatusEnum("status").notNull().default("active"),
    progressPercentage: numeric("progress_percentage", { precision: 5, scale: 2 }).default("0"),
    ...timestampColumns,
    ...softDeleteColumns,
    ...auditColumns,
  },
  (table) => [
    foreignKey({
      columns: [table.tenantId, table.learningPathId],
      foreignColumns: [learningPaths.tenantId, learningPaths.id],
    }),
    foreignKey({
      columns: [table.tenantId, table.employeeId],
      foreignColumns: [employees.tenantId, employees.id],
    }),
    check(
      "progress_valid",
      sql`${table.progressPercentage} >= 0 AND ${table.progressPercentage} <= 100`
    ),
    check(
      "learning_path_enrollments_completed_has_completion_date",
      sql`${table.status}::text != 'completed' OR ${table.completionDate} IS NOT NULL`
    ),
    index("learning_path_enrollments_tenant_idx").on(table.tenantId),
    index("learning_path_enrollments_employee_id_idx").on(table.employeeId),
    index("learning_path_enrollments_status_idx").on(table.status),
    ...tenantIsolationPolicies("learning_path_enrollments"),
    serviceBypassPolicy("learning_path_enrollments"),
  ]
);

// ============================================================================
// TABLE: certificates
// Issued certificates for completed courses
// ============================================================================
export const certificates = hrSchema.table(
  "certificates",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: integer("tenant_id").notNull(),
    certificateNumber: text("certificate_number").notNull(),
    courseEnrollmentId: uuid("course_enrollment_id").notNull(),
    employeeId: uuid("employee_id").notNull(),
    courseId: uuid("course_id").notNull(),
    issuedDate: date("issued_date", { mode: "string" }).notNull(),
    expiryDate: date("expiry_date", { mode: "string" }),
    certificateUrl: text("certificate_url"), // URL to PDF certificate
    verificationCode: text("verification_code").unique(),
    grade: text("grade"), // A, B, C, Pass, etc.
    status: trainingCertificateStatusEnum("status").notNull().default("active"),
    issuer: text("issuer").notNull(), // Who issued the certificate
    signatory: text("signatory"), // Signatory name
    signatoryTitle: text("signatory_title"),
    revokedDate: date("revoked_date", { mode: "string" }),
    revocationReason: text("revocation_reason"),
    ...timestampColumns,
    ...softDeleteColumns,
    ...auditColumns,
  },
  (table) => [
    foreignKey({
      columns: [table.tenantId, table.courseEnrollmentId],
      foreignColumns: [courseEnrollments.tenantId, courseEnrollments.id],
    }),
    foreignKey({
      columns: [table.tenantId, table.employeeId],
      foreignColumns: [employees.tenantId, employees.id],
    }),
    foreignKey({
      columns: [table.tenantId, table.courseId],
      foreignColumns: [courses.tenantId, courses.id],
    }),
    uniqueIndex("certificates_tenant_number_unique")
      .on(table.tenantId, table.certificateNumber)
      .where(sql`${table.deletedAt} IS NULL`),
    uniqueIndex("certificates_verification_code_unique").on(table.verificationCode),
    check(
      "date_order",
      sql`${table.expiryDate} IS NULL OR ${table.expiryDate} >= ${table.issuedDate}`
    ),
    check(
      "certificates_active_expiry_current_or_open",
      sql`${table.status}::text != 'active' OR ${table.expiryDate} IS NULL OR ${table.expiryDate} >= CURRENT_DATE`
    ),
    check(
      "certificates_revoked_has_revoked_date",
      sql`${table.status}::text != 'revoked' OR ${table.revokedDate} IS NOT NULL`
    ),
    check(
      "certificates_revocation_reason_max_len",
      sql`${table.revocationReason} IS NULL OR char_length(${table.revocationReason}) <= 2000`
    ),
    index("certificates_tenant_idx").on(table.tenantId),
    index("certificates_course_enrollment_id_idx").on(table.courseEnrollmentId),
    index("certificates_employee_id_idx").on(table.employeeId),
    index("certificates_course_id_idx").on(table.courseId),
    index("certificates_verification_code_idx").on(table.verificationCode),
    ...tenantIsolationPolicies("certificates"),
    serviceBypassPolicy("certificates"),
  ]
);

// ============================================================================
// TABLE: course_prerequisites
// Course-level prerequisite relationships
// ============================================================================
export const coursePrerequisites = hrSchema.table(
  "course_prerequisites",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: integer("tenant_id").notNull(),
    courseId: uuid("course_id").notNull(),
    prerequisiteCourseId: uuid("prerequisite_course_id").notNull(),
    isMandatory: boolean("is_mandatory").notNull().default(true),
    minimumGrade: text("minimum_grade"), // Minimum grade required (e.g., "C", "Pass")
    description: text("description"),
    ...timestampColumns,
    ...auditColumns,
  },
  (table) => [
    foreignKey({
      columns: [table.tenantId, table.courseId],
      foreignColumns: [courses.tenantId, courses.id],
    }),
    foreignKey({
      columns: [table.tenantId, table.prerequisiteCourseId],
      foreignColumns: [courses.tenantId, courses.id],
    }),
    uniqueIndex("course_prerequisites_tenant_course_prereq_unique").on(
      table.tenantId,
      table.courseId,
      table.prerequisiteCourseId
    ),
    check("not_self_reference", sql`${table.courseId} != ${table.prerequisiteCourseId}`),
    index("course_prerequisites_tenant_idx").on(table.tenantId),
    index("course_prerequisites_course_id_idx").on(table.courseId),
    index("course_prerequisites_prerequisite_course_id_idx").on(table.prerequisiteCourseId),
    ...tenantIsolationPolicies("course_prerequisites"),
    serviceBypassPolicy("course_prerequisites"),
  ]
);

// ============================================================================
// TABLE: course_materials
// Course resources and documents
// ============================================================================
export const courseMaterials = hrSchema.table(
  "course_materials",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: integer("tenant_id").notNull(),
    courseId: uuid("course_id").notNull(),
    courseModuleId: uuid("course_module_id"), // Optional: link to specific module
    title: text("title").notNull(),
    description: text("description"),
    materialType: courseMaterialTypeEnum("material_type").notNull(),
    fileUrl: text("file_url"), // URL to stored file
    fileName: text("file_name"),
    fileSize: integer("file_size"), // in bytes
    mimeType: text("mime_type"),
    duration: integer("duration"), // For videos in minutes
    order: integer("order").notNull().default(0),
    isRequired: boolean("is_required").notNull().default(false),
    isDownloadable: boolean("is_downloadable").notNull().default(true),
    metadata: jsonb("metadata").$type<Record<string, unknown>>(),
    ...timestampColumns,
    ...softDeleteColumns,
    ...auditColumns,
  },
  (table) => [
    foreignKey({
      columns: [table.tenantId, table.courseId],
      foreignColumns: [courses.tenantId, courses.id],
    }),
    foreignKey({
      columns: [table.tenantId, table.courseModuleId],
      foreignColumns: [courseModules.tenantId, courseModules.id],
    }),
    check("order_positive", sql`${table.order} >= 0`),
    check("file_size_positive", sql`${table.fileSize} IS NULL OR ${table.fileSize} > 0`),
    check("duration_positive", sql`${table.duration} IS NULL OR ${table.duration} > 0`),
    index("course_materials_tenant_idx").on(table.tenantId),
    index("course_materials_course_id_idx").on(table.courseId),
    index("course_materials_course_module_id_idx").on(table.courseModuleId),
    index("course_materials_material_type_idx").on(table.materialType),
    index("course_materials_course_id_order_idx").on(table.courseId, table.order),
    index("course_materials_metadata_gin").using("gin", table.metadata),
    ...tenantIsolationPolicies("course_materials"),
    serviceBypassPolicy("course_materials"),
  ]
);

// ============================================================================
// ZOD INSERT SCHEMAS
// ============================================================================

export const insertCourseSchema = z.object({
  id: CourseIdSchema.optional(),
  tenantId: hrTenantIdSchema,
  courseCode: z.string().min(3).max(20),
  name: personNameSchema,
  description: z.string().max(2000).optional(),
  duration: z.number().int().positive("Duration must be positive minutes"),
  level: CourseLevelSchema.default("beginner"),
  deliveryMethod: CourseDeliveryMethodSchema.default("blended"),
  categoryId: z.number().int().positive().optional(),
  instructorId: EmployeeIdSchema.optional(),
  cost: z.number().positive().optional(),
  currencyId: z.number().int().positive().optional(),
  accreditation: z.string().max(200).optional(),
  prerequisites: z.string().max(1000).optional(),
  learningObjectives: z.string().max(2000).optional(),
  targetAudience: z.string().max(1000).optional(),
  maxCapacity: z.number().int().positive().optional(),
  status: CourseCatalogStatusSchema.default("active"),
  courseVersion: z.string().min(1).max(32).default("1.0"),
});

export const insertCourseModuleSchema = z.object({
  id: CourseModuleIdSchema.optional(),
  tenantId: hrTenantIdSchema,
  courseId: CourseIdSchema,
  name: personNameSchema,
  description: z.string().max(2000).optional(),
  moduleOrder: z.number().int().positive(),
  duration: z.number().int().positive("Duration must be positive minutes"),
  moduleType: CourseModuleTypeSchema.default("lecture"),
  prerequisiteModuleId: CourseModuleIdSchema.optional(),
  isActive: z.boolean().default(true),
});

export const insertLearningPathSchema = z.object({
  id: LearningPathIdSchema.optional(),
  tenantId: hrTenantIdSchema,
  name: personNameSchema,
  description: z.string().max(2000).optional(),
  targetRole: z.string().max(200).optional(),
  estimatedDuration: z.number().int().positive().optional(),
  status: LearningPathStatusSchema.default("active"),
});

export const insertLearningPathCourseSchema = z.object({
  id: z.uuid().optional(),
  tenantId: hrTenantIdSchema,
  learningPathId: LearningPathIdSchema,
  courseId: CourseIdSchema,
  courseOrder: z.number().int().positive(),
  isRequired: z.boolean().default(true),
});

export const insertCourseSessionSchema = z
  .object({
    id: CourseSessionIdSchema.optional(),
    tenantId: hrTenantIdSchema,
    courseId: CourseIdSchema,
    name: personNameSchema,
    startDate: z.iso.date(),
    endDate: z.iso.date(),
    maxCapacity: z.number().int().positive(),
    instructorId: EmployeeIdSchema.optional(),
    location: z.string().max(200).optional(),
    status: CourseSessionStatusSchema.default("scheduled"),
  })
  .refine((data) => new Date(data.endDate) >= new Date(data.startDate), {
    message: "End date must be after start date",
    path: ["endDate"],
  });

export const insertCourseEnrollmentSchema = z
  .object({
    id: CourseEnrollmentIdSchema.optional(),
    tenantId: hrTenantIdSchema,
    employeeId: EmployeeIdSchema,
    courseSessionId: CourseSessionIdSchema,
    enrollmentDate: z.iso.date(),
    completionDate: z.iso.date().optional(),
    status: CourseEnrollmentStatusSchema.default("registered"),
    enrollmentSource: CourseEnrollmentSourceSchema.default("self_enrolled"),
    progressPercentage: boundedPercentageSchema.optional(),
    finalScore: boundedPercentageSchema.optional(),
  })
  .superRefine((data, ctx) => {
    if (data.status === "completed" && !data.completionDate) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Completed enrollments must have a completion date",
        path: ["completionDate"],
      });
    }
  });

export const insertLearningPathEnrollmentSchema = z
  .object({
    id: LearningPathEnrollmentIdSchema.optional(),
    tenantId: hrTenantIdSchema,
    employeeId: EmployeeIdSchema,
    learningPathId: LearningPathIdSchema,
    enrollmentDate: z.iso.date(),
    targetCompletionDate: z.iso.date().optional(),
    completionDate: z.iso.date().optional(),
    status: LearningPathEnrollmentStatusSchema.default("active"),
    progressPercentage: boundedPercentageSchema.optional(),
  })
  .superRefine((data, ctx) => {
    if (data.status === "completed" && !data.completionDate) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Completed path enrollments must have a completion date",
        path: ["completionDate"],
      });
    }
  });

export const insertAssessmentSchema = z.object({
  id: AssessmentIdSchema.optional(),
  tenantId: hrTenantIdSchema,
  courseModuleId: CourseModuleIdSchema,
  name: personNameSchema,
  description: z.string().max(1000).optional(),
  assessmentType: AssessmentTypeSchema,
  passingScore: boundedPercentageSchema,
  timeLimit: z.number().int().positive().optional(),
  maxAttempts: z.number().int().positive().default(3),
  randomizeQuestions: z.boolean().default(false),
});

export const insertAssessmentQuestionSchema = z.object({
  id: AssessmentQuestionIdSchema.optional(),
  tenantId: hrTenantIdSchema,
  assessmentId: AssessmentIdSchema,
  questionText: z.string().min(10).max(1000),
  questionType: QuestionTypeSchema,
  correctAnswer: z.string().min(1),
  points: z.number().positive().default(1),
  questionOrder: z.number().int().positive(),
});

export const insertTrainingFeedbackSchema = z.object({
  id: TrainingFeedbackIdSchema.optional(),
  tenantId: hrTenantIdSchema,
  courseEnrollmentId: CourseEnrollmentIdSchema,
  courseRating: z.number().min(1).max(5),
  instructorRating: z.number().min(1).max(5).optional(),
  relevance: z.number().min(1).max(5).optional(),
  comments: z.string().max(5000).optional(),
  feedbackDate: z.iso.date(),
});

export const insertTrainingCostSchema = z.object({
  id: TrainingCostIdSchema.optional(),
  tenantId: hrTenantIdSchema,
  courseSessionId: CourseSessionIdSchema,
  costCategory: TrainingCostCategorySchema,
  amount: z.number().positive(),
  currency: z.string().length(3).default("USD"),
  description: z.string().max(500).optional(),
});

export const insertLearningProgressSchema = z.object({
  id: LearningProgressIdSchema.optional(),
  tenantId: hrTenantIdSchema,
  courseEnrollmentId: CourseEnrollmentIdSchema,
  courseModuleId: CourseModuleIdSchema,
  startedAt: z.iso.date(),
  completedAt: z.iso.date().optional(),
  status: LearningProgressStatusSchema.default("in_progress"),
  scorePercentage: boundedPercentageSchema.optional(),
});

function roundedAttemptPercentage(score: number, maxScore: number): number {
  return Math.round((score * 100) / maxScore * 100) / 100;
}

export const insertAssessmentAttemptSchema = z
  .object({
    id: AssessmentAttemptIdSchema.optional(),
    tenantId: hrTenantIdSchema,
    assessmentId: AssessmentIdSchema,
    courseEnrollmentId: CourseEnrollmentIdSchema,
    attemptNumber: z.number().int().positive(),
    startedAt: z.iso.date(),
    completedAt: z.iso.date().optional(),
    score: z.number().min(0).optional(),
    maxScore: z.number().positive(),
    percentage: boundedPercentageSchema.optional(),
    status: AssessmentAttemptWorkflowStatusSchema.default("in_progress"),
    answers: z.record(z.string(), z.json()).optional(),
    feedback: z.string().max(2000).optional(),
    timeSpentMinutes: z.number().int().nonnegative().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.percentage != null && data.score != null) {
      const expected = roundedAttemptPercentage(data.score, data.maxScore);
      if (Math.abs(expected - data.percentage) > 0.005) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Percentage must equal score ÷ max score × 100 (rounded to 2 decimals)",
          path: ["percentage"],
        });
      }
    }
    addIssueIfSerializedJsonExceeds(
      data.answers,
      ctx,
      HR_JSONB_DEFAULT_MAX_BYTES.assessmentAnswers,
      ["answers"]
    );
  });

export const insertCertificateSchema = z
  .object({
    id: CertificateIdSchema.optional(),
    tenantId: hrTenantIdSchema,
    certificateNumber: z.string().min(5).max(50),
    courseEnrollmentId: CourseEnrollmentIdSchema,
    employeeId: EmployeeIdSchema,
    courseId: CourseIdSchema,
    issuedDate: z.iso.date(),
    expiryDate: z.iso.date().optional(),
    certificateUrl: z.string().url().optional(),
    verificationCode: z.string().min(8).max(50).optional(),
    grade: z.string().max(10).optional(),
    status: TrainingCertificateStatusSchema.default("active"),
    issuer: z.string().min(2).max(100),
    signatory: z.string().max(100).optional(),
    signatoryTitle: z.string().max(100).optional(),
    revokedDate: z.iso.date().optional(),
    revocationReason: z.string().max(2000).optional(),
  })
  .superRefine((data, ctx) => {
    const today = new Date().toISOString().slice(0, 10);
    if (
      data.status === "active" &&
      data.expiryDate &&
      data.expiryDate < today
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Active certificates cannot have an expiry date in the past",
        path: ["expiryDate"],
      });
    }
    if (data.status === "revoked" && !data.revokedDate) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Revoked certificates must include revoked date",
        path: ["revokedDate"],
      });
    }
  });

export const insertCoursePrerequisiteSchema = z
  .object({
    id: CoursePrerequisiteIdSchema.optional(),
    tenantId: hrTenantIdSchema,
    courseId: CourseIdSchema,
    prerequisiteCourseId: CourseIdSchema,
    isMandatory: z.boolean().default(true),
    minimumGrade: z.string().max(10).optional(),
    description: z.string().max(500).optional(),
  })
  .refine((data) => data.courseId !== data.prerequisiteCourseId, {
    message: "Course cannot be a prerequisite of itself",
    path: ["prerequisiteCourseId"],
  });

export const insertCourseMaterialSchema = z.object({
  id: CourseMaterialIdSchema.optional(),
  tenantId: hrTenantIdSchema,
  courseId: CourseIdSchema,
  courseModuleId: CourseModuleIdSchema.optional(),
  title: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  materialType: CourseMaterialTypeSchema,
  fileUrl: z.string().url().optional(),
  fileName: z.string().max(255).optional(),
  fileSize: z.number().int().positive().optional(),
  mimeType: z.string().max(100).optional(),
  duration: z.number().int().positive().optional(),
  order: z.number().int().nonnegative().default(0),
  isRequired: z.boolean().default(false),
  isDownloadable: z.boolean().default(true),
  metadata: z.record(z.string(), z.unknown()).optional(),
});
