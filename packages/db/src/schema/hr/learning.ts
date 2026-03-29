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
    ...nameColumn,
    description: text("description"),
    duration: integer("duration").notNull(), // in minutes
    level: text("level").notNull().default("beginner"), // beginner, intermediate, advanced
    status: text("status").notNull().default("active"),
    ...timestampColumns,
    ...softDeleteColumns,
    ...auditColumns,
  },
  (table) => [
    check("duration_positive", sql`${table.duration} > 0`),
    check("level_valid", sql`${table.level} IN ('beginner', 'intermediate', 'advanced')`),
    index().on(table.tenantId),
    index().on(table.level),
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
    check("progress_valid", sql`${table.progressPercentage} >= 0 AND ${table.progressPercentage} <= 100`),
    check("score_valid", sql`${table.finalScore} IS NULL OR (${table.finalScore} >= 0 AND ${table.finalScore} <= 100)`),
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
    check("score_valid", sql`${table.scorePercentage} IS NULL OR (${table.scorePercentage} >= 0 AND ${table.scorePercentage} <= 100)`),
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
    check("instructor_rating_valid", sql`${table.instructorRating} IS NULL OR (${table.instructorRating} >= 1 AND ${table.instructorRating} <= 5)`),
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
    check("progress_valid", sql`${table.progressPercentage} >= 0 AND ${table.progressPercentage} <= 100`),
    index().on(table.tenantId),
    index().on(table.employeeId),
    index().on(table.status),
    ...tenantIsolationPolicies("learning_path_enrollments"),
    serviceBypassPolicy("learning_path_enrollments"),
  ]
);

// ============================================================================
// ZOD INSERT SCHEMAS
// ============================================================================

export const insertCourseSchema = z.object({
  id: CourseIdSchema.optional(),
  tenantId: z.number().int().positive(),
  name: personNameSchema,
  description: z.string().max(1000).optional(),
  duration: z.number().int().positive("Duration must be positive minutes"),
  level: z.enum(["beginner", "intermediate", "advanced"]).default("beginner"),
  status: z.enum(["active", "inactive"]).default("active"),
});

export const insertCourseSessionSchema = z.object({
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
}).refine(
  (data) => new Date(data.endDate) >= new Date(data.startDate),
  { message: "End date must be after start date", path: ["endDate"] }
);

export const insertCourseEnrollmentSchema = z.object({
  id: CourseEnrollmentIdSchema.optional(),
  tenantId: z.number().int().positive(),
  employeeId: z.string().uuid("Invalid employee ID"),
  courseSessionId: CourseSessionIdSchema,
  enrollmentDate: z.string().date(),
  completionDate: z.string().date().optional(),
  status: z.enum(["registered", "in_progress", "completed", "cancelled", "failed"]).default("registered"),
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
