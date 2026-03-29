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

import { tenantIsolationPolicies, serviceBypassPolicy } from "../../rls/index.js";
import {
  auditColumns,
  nameColumn,
  softDeleteColumns,
  timestampColumns,
} from "../../columns/index.js";
import { tenants } from "../core/tenants.js";
import { currencies } from "../reference/index.js";
import { hrSchema } from "./_schema.js";
import {
  trainingTypeEnum,
  trainingStatusEnum,
  attendanceStatusEnum,
} from "./_enums.js";
import { employees } from "./people.js";

// ============================================================================
// TRAINING PROGRAMS
// ============================================================================

export const trainingPrograms = hrSchema.table(
  "training_programs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: integer("tenant_id").notNull(),
    programCode: text("program_code").notNull(),
    ...nameColumn,
    description: text("description"),
    trainingType: trainingTypeEnum("training_type").notNull(),
    durationHours: numeric("duration_hours", { precision: 6, scale: 2 }),
    provider: text("provider"),
    cost: numeric("cost", { precision: 15, scale: 2 }),
    currencyId: integer("currency_id"),
    isActive: boolean("is_active").notNull().default(true),
    ...timestampColumns,
    ...auditColumns,
    ...softDeleteColumns,
  },
  (table) => [
    foreignKey({ columns: [table.tenantId], foreignColumns: [tenants.tenantId] }),
    foreignKey({ columns: [table.currencyId], foreignColumns: [currencies.currencyId] }),
    uniqueIndex("training_programs_tenant_code_unique")
      .on(table.tenantId, table.programCode)
      .where(sql`${table.deletedAt} IS NULL`),
    index("training_programs_tenant_idx").on(table.tenantId),
    check("training_programs_duration_check", sql`${table.durationHours} > 0`),
    check("training_programs_cost_check", sql`${table.cost} >= 0`),
    ...tenantIsolationPolicies("training_programs"),
    serviceBypassPolicy("training_programs"),
  ]
);

// ============================================================================
// TRAINING SESSIONS
// ============================================================================

export const trainingSessions = hrSchema.table(
  "training_sessions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: integer("tenant_id").notNull(),
    sessionCode: text("session_code").notNull(),
    trainingProgramId: uuid("training_program_id").notNull(),
    ...nameColumn,
    startDate: date("start_date").notNull(),
    endDate: date("end_date").notNull(),
    trainerId: uuid("trainer_id"),
    location: text("location"),
    maxParticipants: integer("max_participants"),
    currentParticipants: integer("current_participants").notNull().default(0),
    trainingStatus: trainingStatusEnum("training_status").notNull().default("scheduled"),
    notes: text("notes"),
    ...timestampColumns,
    ...auditColumns,
    ...softDeleteColumns,
  },
  (table) => [
    foreignKey({ columns: [table.tenantId], foreignColumns: [tenants.tenantId] }),
    foreignKey({
      columns: [table.tenantId, table.trainingProgramId],
      foreignColumns: [trainingPrograms.tenantId, trainingPrograms.id],
    }),
    foreignKey({
      columns: [table.tenantId, table.trainerId],
      foreignColumns: [employees.tenantId, employees.id],
    }),
    uniqueIndex("training_sessions_tenant_code_unique")
      .on(table.tenantId, table.sessionCode)
      .where(sql`${table.deletedAt} IS NULL`),
    index("training_sessions_tenant_idx").on(table.tenantId),
    index("training_sessions_program_idx").on(table.tenantId, table.trainingProgramId),
    check("training_sessions_dates_check", sql`${table.startDate} <= ${table.endDate}`),
    check("training_sessions_participants_check", sql`${table.currentParticipants} >= 0`),
    check("training_sessions_max_participants_check", sql`${table.maxParticipants} > 0`),
    ...tenantIsolationPolicies("training_sessions"),
    serviceBypassPolicy("training_sessions"),
  ]
);

// ============================================================================
// TRAINING ATTENDANCE
// ============================================================================

export const trainingAttendance = hrSchema.table(
  "training_attendance",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: integer("tenant_id").notNull(),
    trainingSessionId: uuid("training_session_id").notNull(),
    employeeId: uuid("employee_id").notNull(),
    registrationDate: date("registration_date").notNull(),
    attendanceStatus: attendanceStatusEnum("attendance_status").notNull().default("present"),
    completionDate: date("completion_date"),
    score: numeric("score", { precision: 5, scale: 2 }),
    certificateUrl: text("certificate_url"),
    feedback: text("feedback"),
    notes: text("notes"),
    ...timestampColumns,
    ...auditColumns,
  },
  (table) => [
    foreignKey({ columns: [table.tenantId], foreignColumns: [tenants.tenantId] }),
    foreignKey({
      columns: [table.tenantId, table.trainingSessionId],
      foreignColumns: [trainingSessions.tenantId, trainingSessions.id],
    }),
    foreignKey({
      columns: [table.tenantId, table.employeeId],
      foreignColumns: [employees.tenantId, employees.id],
    }),
    uniqueIndex("training_attendance_session_employee_unique").on(
      table.tenantId,
      table.trainingSessionId,
      table.employeeId
    ),
    index("training_attendance_tenant_idx").on(table.tenantId),
    index("training_attendance_employee_idx").on(table.tenantId, table.employeeId),
    check("training_attendance_score_check", sql`${table.score} >= 0 AND ${table.score} <= 100`),
    ...tenantIsolationPolicies("training_attendance"),
    serviceBypassPolicy("training_attendance"),
  ]
);
