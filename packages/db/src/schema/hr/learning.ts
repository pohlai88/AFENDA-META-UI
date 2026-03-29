// ============================================================================
// HR DOMAIN: LEARNING MODULE (Phase 2)
// Enhanced Learning Management System with LMS, assessments, certifications
// Implements: 11 tables for full learning lifecycle
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
} from "drizzle-orm/pg-core";
import { z } from "zod/v4";

import { hrSchema } from "./_schema.js";
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
  personNameSchema,
  statusSchema,
  boundedPercentageSchema,
  currencyAmountSchema,
  trainingEnrollmentWorkflow,
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
    level: text("level").notNull().default("beginner"), // beginner, intermediate, advanced
    deliveryMethod: text("delivery_method").notNull().default("blended"), // online, in_person, blended
    categoryId: integer("category_id"), // Link to departments or course categories
    instructorId: uuid("instructor_id"), // Default instructor for the course
    cost: numeric("cost", { precision: 12, scale: 2 }), // Course cost
    currencyId: integer("currency_id"), // Currency for cost
    accreditation: text("accreditation"), // Accreditation body or certification
    prerequisites: text("prerequisites"), // Text description of prerequisites
    learningObjectives: text("learning_objectives"), // Course learning objectives
    targetAudience: text("target_audience"), // Target audience description
    maxCapacity: integer("max_capacity"), // Maximum enrollment capacity
    status: text("status").notNull().default("active"),
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
    check("level_valid", sql`${table.level} IN ('beginner', 'intermediate', 'advanced')`),
    check(
      "delivery_method_valid",
      sql`${table.deliveryMethod} IN ('online', 'in_person', 'blended')`
    ),
    check("cost_positive", sql`${table.cost} IS NULL OR ${table.cost} >= 0`),
    check("max_capacity_positive", sql`${table.maxCapacity} IS NULL OR ${table.maxCapacity} > 0`),
    index().on(table.tenantId),
    index().on(table.level),
    index().on(table.deliveryMethod),
    index().on(table.categoryId),
    index().on(table.instructorId),
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
    index().on(table.tenantId),
    index().on(table.courseId),
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
    status: text("status").notNull().default("active"),
    ...timestampColumns,
    ...softDeleteColumns,
    ...auditColumns,
  },
  (table) => [
    index().on(table.tenantId),
    index().on(table.targetRole),
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
    uniqueIndex().on(table.tenantId, table.learningPathId, table.courseId),
    index().on(table.tenantId),
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
    assessmentType: text("assessment_type").notNull(), // quiz, exam, assignment
    passingScore: numeric("passing_score", { precision: 5, scale: 2 }).notNull(), // 0-100
    timeLimit: integer("time_limit"), // in minutes
    maxAttempts: integer("max_attempts").default(3),
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
    index().on(table.tenantId),
    index().on(table.courseModuleId),
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
    questionType: text("question_type").notNull(), // multiple_choice, short_answer, essay
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
    index().on(table.tenantId),
    index().on(table.assessmentId),
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
    status: text("status").notNull().default("in_progress"), // in_progress, completed, failed, expired
    answers: text("answers"), // JSON string of answers
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
    uniqueIndex().on(
      table.tenantId,
      table.assessmentId,
      table.courseEnrollmentId,
      table.attemptNumber
    ),
    check("attempt_number_positive", sql`${table.attemptNumber} > 0`),
    check(
      "score_valid",
      sql`${table.score} IS NULL OR (${table.score} >= 0 AND ${table.score} <= ${table.maxScore})`
    ),
    check(
      "percentage_valid",
      sql`${table.percentage} IS NULL OR (${table.percentage} >= 0 AND ${table.percentage} <= 100)`
    ),
    check(
      "status_valid",
      sql`${table.status} IN ('in_progress', 'completed', 'failed', 'expired')`
    ),
    check(
      "time_spent_positive",
      sql`${table.timeSpentMinutes} IS NULL OR ${table.timeSpentMinutes} >= 0`
    ),
    index().on(table.tenantId),
    index().on(table.assessmentId),
    index().on(table.courseEnrollmentId),
    index().on(table.status),
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
    status: text("status").notNull().default("scheduled"),
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
    index().on(table.tenantId),
    index().on(table.courseId),
    index().on(table.startDate),
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
    status: text("status").notNull().default("registered"),
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
    index().on(table.tenantId),
    index().on(table.employeeId),
    index().on(table.status),
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
    status: text("status").notNull().default("in_progress"),
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
    uniqueIndex().on(table.tenantId, table.courseEnrollmentId, table.courseModuleId),
    check(
      "score_valid",
      sql`${table.scorePercentage} IS NULL OR (${table.scorePercentage} >= 0 AND ${table.scorePercentage} <= 100)`
    ),
    index().on(table.tenantId),
    index().on(table.status),
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
    index().on(table.tenantId),
    index().on(table.courseEnrollmentId),
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
    costCategory: text("cost_category").notNull(), // instructor, materials, venue, other
    amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
    currency: text("currency").notNull().default("USD"),
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
    check("amount_positive", sql`${table.amount} > 0`),
    index().on(table.tenantId),
    index().on(table.courseSessionId),
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
    status: text("status").notNull().default("active"),
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
    index().on(table.tenantId),
    index().on(table.employeeId),
    index().on(table.status),
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
    status: text("status").notNull().default("active"), // active, expired, revoked
    issuer: text("issuer").notNull(), // Who issued the certificate
    signatory: text("signatory"), // Signatory name
    signatoryTitle: text("signatory_title"),
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
    check("status_valid", sql`${table.status} IN ('active', 'expired', 'revoked')`),
    check(
      "date_order",
      sql`${table.expiryDate} IS NULL OR ${table.expiryDate} >= ${table.issuedDate}`
    ),
    index().on(table.tenantId),
    index().on(table.courseEnrollmentId),
    index().on(table.employeeId),
    index().on(table.courseId),
    index().on(table.verificationCode),
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
    uniqueIndex().on(table.tenantId, table.courseId, table.prerequisiteCourseId),
    check("not_self_reference", sql`${table.courseId} != ${table.prerequisiteCourseId}`),
    index().on(table.tenantId),
    index().on(table.courseId),
    index().on(table.prerequisiteCourseId),
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
    materialType: text("material_type").notNull(), // document, video, link, quiz, assignment
    fileUrl: text("file_url"), // URL to stored file
    fileName: text("file_name"),
    fileSize: integer("file_size"), // in bytes
    mimeType: text("mime_type"),
    duration: integer("duration"), // For videos in minutes
    order: integer("order").notNull().default(0),
    isRequired: boolean("is_required").notNull().default(false),
    isDownloadable: boolean("is_downloadable").notNull().default(true),
    metadata: text("metadata"), // JSON for additional metadata
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
    check(
      "material_type_valid",
      sql`${table.materialType} IN ('document', 'video', 'link', 'quiz', 'assignment', 'presentation', 'ebook')`
    ),
    check("order_positive", sql`${table.order} >= 0`),
    check("file_size_positive", sql`${table.fileSize} IS NULL OR ${table.fileSize} > 0`),
    check("duration_positive", sql`${table.duration} IS NULL OR ${table.duration} > 0`),
    index().on(table.tenantId),
    index().on(table.courseId),
    index().on(table.courseModuleId),
    index().on(table.materialType),
    index().on([table.courseId, table.order]),
    ...tenantIsolationPolicies("course_materials"),
    serviceBypassPolicy("course_materials"),
  ]
);

// ============================================================================
// ZOD INSERT SCHEMAS
// ============================================================================

export const insertCourseSchema = z.object({
  id: CourseIdSchema.optional(),
  tenantId: z.number().int().positive(),
  courseCode: z.string().min(3).max(20),
  name: personNameSchema,
  description: z.string().max(2000).optional(),
  duration: z.number().int().positive("Duration must be positive minutes"),
  level: z.enum(["beginner", "intermediate", "advanced"]).default("beginner"),
  deliveryMethod: z.enum(["online", "in_person", "blended"]).default("blended"),
  categoryId: z.number().int().positive().optional(),
  instructorId: z.string().uuid().optional(),
  cost: z.number().positive().optional(),
  currencyId: z.number().int().positive().optional(),
  accreditation: z.string().max(200).optional(),
  prerequisites: z.string().max(1000).optional(),
  learningObjectives: z.string().max(2000).optional(),
  targetAudience: z.string().max(1000).optional(),
  maxCapacity: z.number().int().positive().optional(),
  status: z.enum(["active", "inactive"]).default("active"),
});

export const insertCourseSessionSchema = z
  .object({
    id: CourseSessionIdSchema.optional(),
    tenantId: z.number().int().positive(),
    courseId: CourseIdSchema,
    name: personNameSchema,
    startDate: z.string().date(),
    endDate: z.string().date(),
    maxCapacity: z.number().int().positive(),
    instructorId: z.string().uuid().optional(),
    location: z.string().max(200).optional(),
    status: z.enum(["scheduled", "in_progress", "completed", "cancelled"]).default("scheduled"),
  })
  .refine((data) => new Date(data.endDate) >= new Date(data.startDate), {
    message: "End date must be after start date",
    path: ["endDate"],
  });

export const insertCourseEnrollmentSchema = z.object({
  id: CourseEnrollmentIdSchema.optional(),
  tenantId: z.number().int().positive(),
  employeeId: z.string().uuid("Invalid employee ID"),
  courseSessionId: CourseSessionIdSchema,
  enrollmentDate: z.string().date(),
  completionDate: z.string().date().optional(),
  status: z
    .enum(["registered", "in_progress", "completed", "cancelled", "failed"])
    .default("registered"),
  progressPercentage: boundedPercentageSchema.optional(),
  finalScore: boundedPercentageSchema.optional(),
});

export const insertLearningPathEnrollmentSchema = z.object({
  id: LearningPathEnrollmentIdSchema.optional(),
  tenantId: z.number().int().positive(),
  employeeId: z.string().uuid(),
  learningPathId: LearningPathIdSchema,
  enrollmentDate: z.string().date(),
  targetCompletionDate: z.string().date().optional(),
  completionDate: z.string().date().optional(),
  status: z.enum(["active", "completed", "cancelled"]).default("active"),
  progressPercentage: boundedPercentageSchema.optional(),
});

export const insertAssessmentSchema = z.object({
  id: AssessmentIdSchema.optional(),
  tenantId: z.number().int().positive(),
  courseModuleId: CourseModuleIdSchema,
  name: personNameSchema,
  description: z.string().max(1000).optional(),
  assessmentType: z.enum(["quiz", "exam", "assignment"]),
  passingScore: boundedPercentageSchema,
  timeLimit: z.number().int().positive().optional(),
  maxAttempts: z.number().int().positive().default(3),
});

export const insertAssessmentQuestionSchema = z.object({
  id: AssessmentQuestionIdSchema.optional(),
  tenantId: z.number().int().positive(),
  assessmentId: AssessmentIdSchema,
  questionText: z.string().min(10).max(1000),
  questionType: z.enum(["multiple_choice", "short_answer", "essay"]),
  correctAnswer: z.string().min(1),
  points: z.number().positive().default(1),
  questionOrder: z.number().int().positive(),
});

export const insertTrainingFeedbackSchema = z.object({
  id: TrainingFeedbackIdSchema.optional(),
  tenantId: z.number().int().positive(),
  courseEnrollmentId: CourseEnrollmentIdSchema,
  courseRating: z.number().min(1).max(5),
  instructorRating: z.number().min(1).max(5).optional(),
  relevance: z.number().min(1).max(5).optional(),
  comments: z.string().max(2000).optional(),
  feedbackDate: z.string().date(),
});

export const insertTrainingCostSchema = z.object({
  id: TrainingCostIdSchema.optional(),
  tenantId: z.number().int().positive(),
  courseSessionId: CourseSessionIdSchema,
  costCategory: z.enum(["instructor", "materials", "venue", "other"]),
  amount: z.number().positive(),
  currency: z.string().length(3).default("USD"),
  description: z.string().max(500).optional(),
});

export const insertLearningProgressSchema = z.object({
  id: LearningProgressIdSchema.optional(),
  tenantId: z.number().int().positive(),
  courseEnrollmentId: CourseEnrollmentIdSchema,
  courseModuleId: CourseModuleIdSchema,
  startedAt: z.string().date(),
  completedAt: z.string().date().optional(),
  status: z.enum(["in_progress", "completed", "failed"]).default("in_progress"),
  scorePercentage: boundedPercentageSchema.optional(),
});

export const insertAssessmentAttemptSchema = z.object({
  id: AssessmentAttemptIdSchema.optional(),
  tenantId: z.number().int().positive(),
  assessmentId: AssessmentIdSchema,
  courseEnrollmentId: CourseEnrollmentIdSchema,
  attemptNumber: z.number().int().positive(),
  startedAt: z.string().date(),
  completedAt: z.string().date().optional(),
  score: z.number().min(0).optional(),
  maxScore: z.number().positive(),
  percentage: boundedPercentageSchema.optional(),
  status: z.enum(["in_progress", "completed", "failed", "expired"]).default("in_progress"),
  answers: z.string().optional(), // JSON string
  feedback: z.string().max(2000).optional(),
  timeSpentMinutes: z.number().int().nonnegative().optional(),
});

export const insertCertificateSchema = z.object({
  id: CertificateIdSchema.optional(),
  tenantId: z.number().int().positive(),
  certificateNumber: z.string().min(5).max(50),
  courseEnrollmentId: CourseEnrollmentIdSchema,
  employeeId: z.string().uuid(),
  courseId: CourseIdSchema,
  issuedDate: z.string().date(),
  expiryDate: z.string().date().optional(),
  certificateUrl: z.string().url().optional(),
  verificationCode: z.string().min(8).max(50).optional(),
  grade: z.string().max(10).optional(),
  status: z.enum(["active", "expired", "revoked"]).default("active"),
  issuer: z.string().min(2).max(100),
  signatory: z.string().max(100).optional(),
  signatoryTitle: z.string().max(100).optional(),
});

export const insertCoursePrerequisiteSchema = z
  .object({
    id: CoursePrerequisiteIdSchema.optional(),
    tenantId: z.number().int().positive(),
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
  tenantId: z.number().int().positive(),
  courseId: CourseIdSchema,
  courseModuleId: CourseModuleIdSchema.optional(),
  title: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  materialType: z.enum([
    "document",
    "video",
    "link",
    "quiz",
    "assignment",
    "presentation",
    "ebook",
  ]),
  fileUrl: z.string().url().optional(),
  fileName: z.string().max(255).optional(),
  fileSize: z.number().int().positive().optional(),
  mimeType: z.string().max(100).optional(),
  duration: z.number().int().positive().optional(),
  order: z.number().int().nonnegative().default(0),
  isRequired: z.boolean().default(false),
  isDownloadable: z.boolean().default(true),
  metadata: z.string().optional(), // JSON string
});
