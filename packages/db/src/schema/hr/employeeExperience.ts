// ============================================================================
// HR DOMAIN: EMPLOYEE SELF-SERVICE (Phase 6)
// ESS portal, generic requests (SLA + aggregate version), multi-step approval tasks,
// domain events + outbox, survey questionnaire versions, invitations, push endpoints.
// See hr-docs/ADR-007-ess-workflow-and-events.md
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
  timestamp,
  uuid,
  uniqueIndex,
  jsonb,
} from "drizzle-orm/pg-core";
import { z } from "zod/v4";

import { tenantIsolationPolicies, serviceBypassPolicy } from "../../rls-policies/index.js";
import {
  appendOnlyTimestampColumns,
  auditColumns,
  nameColumn,
  softDeleteColumns,
  timestampColumns,
} from "../../column-kit/index.js";
import { users } from "../security/index.js";
import { tenants } from "../core/tenants.js";
import { hrSchema } from "./_schema.js";
import {
  requestTypeEnum,
  requestStatusEnum,
  notificationPriorityEnum,
  notificationStatusEnum,
  notificationDeliveryChannelEnum,
  surveyTypeEnum,
  employeeNotificationTypeEnum,
  employeePreferenceTypeEnum,
  employeeSurveyWorkflowStatusEnum,
  essSlaStatusEnum,
  essApprovalTaskStatusEnum,
  essApprovalTaskDecisionEnum,
  essRequestHistoryTransitionSourceEnum,
  employeeNotificationReferenceKindEnum,
  essEventAggregateTypeEnum,
  essOutboxDeliveryStatusEnum,
  surveyInvitationStatusEnum,
  employeePushPlatformEnum,
  essSurveyScoringModelEnum,
  RequestTypeSchema,
  RequestStatusSchema,
  NotificationPrioritySchema,
  NotificationStatusSchema,
  NotificationDeliveryChannelSchema,
  SurveyTypeSchema,
  EmployeeNotificationTypeSchema,
  EmployeePreferenceTypeSchema,
  EmployeeSurveyWorkflowStatusSchema,
  EssSlaStatusSchema,
  EssApprovalTaskStatusSchema,
  EssApprovalTaskDecisionSchema,
  EssRequestHistoryTransitionSourceSchema,
  EmployeeNotificationReferenceKindSchema,
  EssEventAggregateTypeSchema,
  EssOutboxDeliveryStatusSchema,
  SurveyInvitationStatusSchema,
  EmployeePushPlatformSchema,
  EssSurveyScoringModelSchema,
} from "./_enums.js";
import { employees } from "./people.js";
import { employeeGrievances } from "./grievances.js";
import {
  EmployeeSelfServiceProfileIdSchema,
  EmployeeRequestIdSchema,
  EmployeeRequestHistoryIdSchema,
  EssEscalationPolicyIdSchema,
  EmployeeRequestApprovalTaskIdSchema,
  EssEventTypeIdSchema,
  EssDomainEventIdSchema,
  EssOutboxIdSchema,
  EssWorkflowDefinitionIdSchema,
  EssWorkflowStepIdSchema,
  EmployeeSurveyQuestionnaireVersionIdSchema,
  SurveyInvitationIdSchema,
  EmployeePushEndpointIdSchema,
  EmployeeNotificationIdSchema,
  EmployeePreferenceIdSchema,
  EmployeeSurveyIdSchema,
  SurveyResponseIdSchema,
  EmployeeIdSchema,
  GrievanceIdSchema,
  boundedPercentageSchema,
  refineDateRange,
  refineConditionalRequired,
  refineApprovedRequiresActor,
  refineApprovalFieldsAbsentUnlessApproved,
  refineRejectedRequiresReason,
  refineReasonAbsentUnlessRejected,
  hrTenantIdSchema,
  hrAuditUserIdSchema,
  jsonObjectNullishSchema,
  metadataSchema,
  hrSurveyQuestionSchema,
  hrSurveyResponseItemSchema,
  addIssueIfSerializedJsonExceeds,
  HR_JSONB_DEFAULT_MAX_BYTES,
} from "./_zodShared.js";

// ============================================================================
// TABLE: ess_escalation_policies — SLA / escalation catalog (tenant-scoped)
// ============================================================================
export const essEscalationPolicies = hrSchema.table(
  "ess_escalation_policies",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: integer("tenant_id").notNull(),
    policyCode: text("policy_code").notNull(),
    ...nameColumn,
    description: text("description"),
    responseSlaHours: integer("response_sla_hours").notNull(),
    escalationRules: jsonb("escalation_rules").$type<Record<string, unknown>>(),
    rulesSchemaVersion: integer("rules_schema_version").notNull().default(1),
    ...timestampColumns,
    ...auditColumns(() => users.userId),
    ...softDeleteColumns,
  },
  (table) => [
    foreignKey({ columns: [table.tenantId], foreignColumns: [tenants.tenantId] }),
    uniqueIndex("ess_escalation_policies_tenant_code_unique").on(table.tenantId, table.policyCode),
    check("ess_escalation_policies_sla_hours_positive", sql`${table.responseSlaHours} > 0`),
    check(
      "ess_escalation_policies_rules_schema_version",
      sql`${table.rulesSchemaVersion} >= 1`
    ),
    index("ess_escalation_policies_tenant_idx").on(table.tenantId),
    ...tenantIsolationPolicies("ess_escalation_policies"),
    serviceBypassPolicy("ess_escalation_policies"),
  ]
);

// ============================================================================
// TABLE: employee_self_service_profiles
// Portal access and login tracking
// ============================================================================
export const employeeSelfServiceProfiles = hrSchema.table(
  "employee_self_service_profiles",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: integer("tenant_id").notNull(),
    employeeId: uuid("employee_id").notNull(),
    isEnabled: boolean("is_enabled").notNull().default(true),
    lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
    loginCount: integer("login_count").notNull().default(0),
    preferredLanguage: text("preferred_language").default("en"),
    timezone: text("timezone").default("UTC"),
    ...timestampColumns,
    ...auditColumns(() => users.userId),
    ...softDeleteColumns,
  },
  (table) => [
    foreignKey({ columns: [table.tenantId], foreignColumns: [tenants.tenantId] }),
    foreignKey({
      columns: [table.tenantId, table.employeeId],
      foreignColumns: [employees.tenantId, employees.id],
    }),
    uniqueIndex("employee_self_service_profiles_employee_unique").on(
      table.tenantId,
      table.employeeId
    ),
    check("login_count_positive", sql`${table.loginCount} >= 0`),
    index("employee_self_service_profiles_tenant_idx").on(table.tenantId),
    index("employee_self_service_profiles_employee_idx").on(table.tenantId, table.employeeId),
    ...tenantIsolationPolicies("employee_self_service_profiles"),
    serviceBypassPolicy("employee_self_service_profiles"),
  ]
);

// ============================================================================
// TABLE: employee_requests
// Generic request workflow (time off, document, pay change, etc.)
// ============================================================================
export const employeeRequests = hrSchema.table(
  "employee_requests",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: integer("tenant_id").notNull(),
    employeeId: uuid("employee_id").notNull(),
    requestNumber: text("request_number").notNull(),
    requestType: requestTypeEnum("request_type").notNull(),
    requestDate: date("request_date", { mode: "string" }).notNull(),
    requestStatus: requestStatusEnum("request_status").notNull().default("draft"),
    requestData: jsonb("request_data").$type<Record<string, unknown>>(),
    requestDataSchemaVersion: integer("request_data_schema_version").notNull().default(1),
    aggregateVersion: integer("aggregate_version").notNull().default(1),
    submittedAt: timestamp("submitted_at", { withTimezone: true }),
    slaDueAt: timestamp("sla_due_at", { withTimezone: true }),
    firstResponseAt: timestamp("first_response_at", { withTimezone: true }),
    slaBreachedAt: timestamp("sla_breached_at", { withTimezone: true }),
    slaStatus: essSlaStatusEnum("sla_status").notNull().default("within_sla"),
    slaExtensionReason: text("sla_extension_reason"),
    escalationPolicyId: uuid("escalation_policy_id"),
    amendedFromRequestId: uuid("amended_from_request_id"),
    relatedGrievanceId: uuid("related_grievance_id"),
    approvedBy: uuid("approved_by"),
    approvedAt: timestamp("approved_at", { withTimezone: true }),
    rejectedReason: text("rejected_reason"),
    notes: text("notes"),
    ...timestampColumns,
    ...softDeleteColumns,
    ...auditColumns(() => users.userId),
  },
  (table) => [
    foreignKey({ columns: [table.tenantId], foreignColumns: [tenants.tenantId] }),
    foreignKey({
      columns: [table.tenantId, table.employeeId],
      foreignColumns: [employees.tenantId, employees.id],
    }),
    foreignKey({
      columns: [table.tenantId, table.escalationPolicyId],
      foreignColumns: [essEscalationPolicies.tenantId, essEscalationPolicies.id],
    }),
    sql`CONSTRAINT employee_requests_amended_from_fk FOREIGN KEY (tenant_id, amended_from_request_id) REFERENCES hr.employee_requests(tenant_id, id)`,
    foreignKey({
      columns: [table.tenantId, table.relatedGrievanceId],
      foreignColumns: [employeeGrievances.tenantId, employeeGrievances.id],
    }),
    foreignKey({
      columns: [table.tenantId, table.approvedBy],
      foreignColumns: [employees.tenantId, employees.id],
    }),
    uniqueIndex("employee_requests_tenant_number_unique")
      .on(table.tenantId, table.requestNumber)
      .where(sql`${table.deletedAt} IS NULL`),
    check(
      "employee_requests_approval_matches_status",
      sql`(
        (${table.requestStatus} = 'approved'::hr.request_status AND ${table.approvedBy} IS NOT NULL AND ${table.approvedAt} IS NOT NULL)
        OR
        (${table.requestStatus} <> 'approved'::hr.request_status AND ${table.approvedBy} IS NULL AND ${table.approvedAt} IS NULL)
      )`
    ),
    check(
      "employee_requests_rejected_reason",
      sql`(
        (${table.requestStatus} <> 'rejected'::hr.request_status AND ${table.rejectedReason} IS NULL)
        OR
        (${table.requestStatus} = 'rejected'::hr.request_status AND ${table.rejectedReason} IS NOT NULL)
      )`
    ),
    check(
      "employee_requests_request_data_schema_version",
      sql`${table.requestDataSchemaVersion} >= 1`
    ),
    check("employee_requests_aggregate_version", sql`${table.aggregateVersion} >= 1`),
    check(
      "employee_requests_sla_breach_requires_due",
      sql`${table.slaBreachedAt} IS NULL OR ${table.slaDueAt} IS NOT NULL`
    ),
    check(
      "employee_requests_sla_breached_state",
      sql`(${table.slaStatus} <> 'breached'::hr.ess_sla_status OR ${table.slaBreachedAt} IS NOT NULL)`
    ),
    check(
      "employee_requests_sla_breach_not_draft",
      sql`${table.slaStatus} <> 'breached'::hr.ess_sla_status OR ${table.requestStatus} <> 'draft'::hr.request_status`
    ),
    check(
      "employee_requests_first_response_after_submit",
      sql`${table.firstResponseAt} IS NULL OR ${table.submittedAt} IS NULL OR ${table.firstResponseAt} >= ${table.submittedAt}`
    ),
    index("employee_requests_tenant_idx").on(table.tenantId),
    index("employee_requests_employee_idx").on(table.tenantId, table.employeeId),
    index("employee_requests_status_idx").on(table.tenantId, table.requestStatus),
    index("employee_requests_type_idx").on(table.tenantId, table.requestType),
    index("employee_requests_sla_due_open_idx")
      .on(table.tenantId, table.slaDueAt)
      .where(
        sql`${table.deletedAt} IS NULL AND ${table.requestStatus} IN ('draft'::hr.request_status, 'submitted'::hr.request_status)`
      ),
    index("employee_requests_submitted_idx").on(table.tenantId, table.submittedAt),
    ...tenantIsolationPolicies("employee_requests"),
    serviceBypassPolicy("employee_requests"),
  ]
);

// ============================================================================
// TABLE: employee_request_approval_tasks — multi-step / parallel approvals
// ============================================================================
export const employeeRequestApprovalTasks = hrSchema.table(
  "employee_request_approval_tasks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: integer("tenant_id").notNull(),
    employeeRequestId: uuid("employee_request_id").notNull(),
    stepKey: text("step_key").notNull(),
    sequence: integer("sequence").notNull(),
    parallelGroupId: uuid("parallel_group_id"),
    status: essApprovalTaskStatusEnum("status").notNull().default("pending"),
    decision: essApprovalTaskDecisionEnum("decision"),
    decisionReason: text("decision_reason"),
    delegationReason: text("delegation_reason"),
    assigneeEmployeeId: uuid("assignee_employee_id"),
    delegatedFromEmployeeId: uuid("delegated_from_employee_id"),
    dueAt: timestamp("due_at", { withTimezone: true }),
    decidedAt: timestamp("decided_at", { withTimezone: true }),
    decidedBy: uuid("decided_by"),
    ...timestampColumns,
    ...auditColumns(() => users.userId),
    ...softDeleteColumns,
  },
  (table) => [
    foreignKey({ columns: [table.tenantId], foreignColumns: [tenants.tenantId] }),
    foreignKey({
      columns: [table.tenantId, table.employeeRequestId],
      foreignColumns: [employeeRequests.tenantId, employeeRequests.id],
    }),
    foreignKey({
      columns: [table.tenantId, table.assigneeEmployeeId],
      foreignColumns: [employees.tenantId, employees.id],
    }),
    foreignKey({
      columns: [table.tenantId, table.delegatedFromEmployeeId],
      foreignColumns: [employees.tenantId, employees.id],
    }),
    foreignKey({
      columns: [table.tenantId, table.decidedBy],
      foreignColumns: [employees.tenantId, employees.id],
    }),
    index("employee_request_approval_tasks_tenant_idx").on(table.tenantId),
    index("employee_request_approval_tasks_request_idx").on(
      table.tenantId,
      table.employeeRequestId
    ),
    index("employee_request_approval_tasks_assignee_idx").on(
      table.tenantId,
      table.assigneeEmployeeId
    ),
    index("employee_request_approval_tasks_due_idx")
      .on(table.tenantId, table.dueAt)
      .where(sql`${table.status} = 'pending'::hr.ess_approval_task_status`),
    sql`CONSTRAINT employee_request_approval_tasks_pending_consistent CHECK (
      (${table.status} = 'pending'::hr.ess_approval_task_status AND ${table.decision} IS NULL AND ${table.decidedAt} IS NULL AND ${table.decidedBy} IS NULL)
      OR (${table.status} <> 'pending'::hr.ess_approval_task_status)
    )`,
    sql`CONSTRAINT employee_request_approval_tasks_approved_shape CHECK (
      ${table.status} <> 'approved'::hr.ess_approval_task_status
      OR (
        ${table.decision} IS NOT NULL
        AND ${table.decision} = 'approve'::hr.ess_approval_task_decision
        AND ${table.decidedAt} IS NOT NULL
        AND ${table.decidedBy} IS NOT NULL
      )
    )`,
    sql`CONSTRAINT employee_request_approval_tasks_rejected_shape CHECK (
      ${table.status} <> 'rejected'::hr.ess_approval_task_status
      OR (
        ${table.decision} = 'reject'::hr.ess_approval_task_decision
        AND ${table.decidedAt} IS NOT NULL
        AND ${table.decidedBy} IS NOT NULL
        AND ${table.decisionReason} IS NOT NULL
      )
    )`,
    sql`CONSTRAINT employee_request_approval_tasks_skipped_shape CHECK (
      ${table.status} <> 'skipped'::hr.ess_approval_task_status OR ${table.decidedAt} IS NOT NULL
    )`,
    sql`CONSTRAINT employee_request_approval_tasks_cancelled_shape CHECK (
      ${table.status} <> 'cancelled'::hr.ess_approval_task_status OR ${table.decidedAt} IS NOT NULL
    )`,
    check("employee_request_approval_tasks_sequence_positive", sql`${table.sequence} >= 0`),
    check(
      "employee_request_approval_tasks_delegation_reason",
      sql`${table.delegatedFromEmployeeId} IS NULL OR (${table.delegationReason} IS NOT NULL AND btrim(${table.delegationReason}) <> '')`
    ),
    ...tenantIsolationPolicies("employee_request_approval_tasks"),
    serviceBypassPolicy("employee_request_approval_tasks"),
  ]
);

// ============================================================================
// TABLE: employee_request_history
// Append-only status transitions for workflow analytics / audit
// ============================================================================
export const employeeRequestHistory = hrSchema.table(
  "employee_request_history",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: integer("tenant_id").notNull(),
    employeeRequestId: uuid("employee_request_id").notNull(),
    fromStatus: requestStatusEnum("from_status"),
    toStatus: requestStatusEnum("to_status").notNull(),
    actorEmployeeId: uuid("actor_employee_id"),
    correlationId: uuid("correlation_id"),
    transitionSource: essRequestHistoryTransitionSourceEnum("transition_source")
      .notNull()
      .default("user"),
    notes: text("notes"),
    createdBy: integer("created_by").notNull().references(() => users.userId),
    ...appendOnlyTimestampColumns,
  },
  (table) => [
    foreignKey({ columns: [table.tenantId], foreignColumns: [tenants.tenantId] }),
    foreignKey({
      columns: [table.tenantId, table.employeeRequestId],
      foreignColumns: [employeeRequests.tenantId, employeeRequests.id],
    }),
    foreignKey({
      columns: [table.tenantId, table.actorEmployeeId],
      foreignColumns: [employees.tenantId, employees.id],
    }),
    index("employee_request_history_tenant_idx").on(table.tenantId),
    index("employee_request_history_request_idx").on(table.tenantId, table.employeeRequestId),
    index("employee_request_history_correlation_idx")
      .on(table.tenantId, table.correlationId)
      .where(sql`${table.correlationId} IS NOT NULL`),
    ...tenantIsolationPolicies("employee_request_history"),
    serviceBypassPolicy("employee_request_history"),
  ]
);

// ============================================================================
// TABLE: employee_notifications
// System notifications and alerts
// ============================================================================
export const employeeNotifications = hrSchema.table(
  "employee_notifications",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: integer("tenant_id").notNull(),
    employeeId: uuid("employee_id").notNull(),
    title: text("title").notNull(),
    message: text("message").notNull(),
    notificationType: employeeNotificationTypeEnum("notification_type").notNull(),
    priority: notificationPriorityEnum("priority").notNull().default("medium"),
    status: notificationStatusEnum("status").notNull().default("unread"),
    deliveryChannel: notificationDeliveryChannelEnum("delivery_channel").notNull().default("in_app"),
    actionUrl: text("action_url"),
    actionLabel: text("action_label"),
    readAt: timestamp("read_at", { withTimezone: true }),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    metadata: jsonb("metadata").$type<Record<string, unknown>>(),
    metadataSchemaVersion: integer("metadata_schema_version").notNull().default(1),
    referenceKind: employeeNotificationReferenceKindEnum("reference_kind"),
    referenceId: uuid("reference_id"),
    deliveryAttempts: integer("delivery_attempts").notNull().default(0),
    lastAttemptAt: timestamp("last_attempt_at", { withTimezone: true }),
    ...timestampColumns,
    ...auditColumns(() => users.userId),
    ...softDeleteColumns,
  },
  (table) => [
    foreignKey({ columns: [table.tenantId], foreignColumns: [tenants.tenantId] }),
    foreignKey({
      columns: [table.tenantId, table.employeeId],
      foreignColumns: [employees.tenantId, employees.id],
    }),
    check(
      "employee_notifications_delivery_attempts_non_negative",
      sql`${table.deliveryAttempts} >= 0`
    ),
    index("employee_notifications_tenant_idx").on(table.tenantId),
    index("employee_notifications_employee_idx").on(table.tenantId, table.employeeId),
    index("employee_notifications_status_idx").on(table.tenantId, table.status),
    index("employee_notifications_priority_idx").on(table.tenantId, table.priority),
    index("employee_notifications_employee_status_idx").on(table.employeeId, table.status),
    index("employee_notifications_delivery_idx").on(table.tenantId, table.deliveryChannel),
    index("employee_notifications_metadata_gin")
      .using("gin", table.metadata)
      .where(sql`${table.metadata} IS NOT NULL`),
    check(
      "employee_notifications_expired_requires_expiry",
      sql`${table.status} <> 'expired'::hr.notification_status OR ${table.expiresAt} IS NOT NULL`
    ),
    check(
      "employee_notifications_read_requires_read_at",
      sql`${table.status} <> 'read'::hr.notification_status OR ${table.readAt} IS NOT NULL`
    ),
    check(
      "employee_notifications_metadata_schema_version",
      sql`${table.metadataSchemaVersion} >= 1`
    ),
    check(
      "employee_notifications_reference_pairing",
      sql`(${table.referenceKind} IS NULL AND ${table.referenceId} IS NULL) OR (${table.referenceKind} IS NOT NULL AND ${table.referenceId} IS NOT NULL)`
    ),
    index("employee_notifications_reference_idx")
      .on(table.tenantId, table.referenceKind, table.referenceId)
      .where(sql`${table.referenceId} IS NOT NULL`),
    ...tenantIsolationPolicies("employee_notifications"),
    serviceBypassPolicy("employee_notifications"),
  ]
);

// ============================================================================
// TABLE: employee_preferences
// Key-value preferences (UI, communication, privacy, notification)
// ============================================================================
export const employeePreferences = hrSchema.table(
  "employee_preferences",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: integer("tenant_id").notNull(),
    employeeId: uuid("employee_id").notNull(),
    preferenceKey: text("preference_key").notNull(),
    /** Scalar value; use `preferenceValueJson` for structured payloads (channels, layouts). */
    preferenceValue: text("preference_value"),
    preferenceValueJson: jsonb("preference_value_json").$type<Record<string, unknown>>(),
    preferenceType: employeePreferenceTypeEnum("preference_type").notNull(),
    description: text("description"),
    lastUpdatedByEmployeeId: uuid("last_updated_by_employee_id"),
    ...timestampColumns,
    ...auditColumns(() => users.userId),
    ...softDeleteColumns,
  },
  (table) => [
    foreignKey({ columns: [table.tenantId], foreignColumns: [tenants.tenantId] }),
    foreignKey({
      columns: [table.tenantId, table.employeeId],
      foreignColumns: [employees.tenantId, employees.id],
    }),
    foreignKey({
      columns: [table.tenantId, table.lastUpdatedByEmployeeId],
      foreignColumns: [employees.tenantId, employees.id],
    }),
    uniqueIndex("employee_preferences_employee_key_unique").on(
      table.tenantId,
      table.employeeId,
      table.preferenceKey
    ),
    index("employee_preferences_tenant_idx").on(table.tenantId),
    index("employee_preferences_employee_idx").on(table.tenantId, table.employeeId),
    index("employee_preferences_value_json_gin")
      .using("gin", table.preferenceValueJson)
      .where(sql`${table.preferenceValueJson} IS NOT NULL`),
    check(
      "employee_preferences_value_payload",
      sql`(${table.preferenceValueJson} IS NOT NULL) OR (${table.preferenceValue} IS NOT NULL AND btrim(${table.preferenceValue}) <> '')`
    ),
    check(
      "employee_preferences_structured_requires_json",
      sql`${table.preferenceType} <> 'structured'::hr.employee_preference_type OR ${table.preferenceValueJson} IS NOT NULL`
    ),
    index("employee_preferences_last_updated_by_idx").on(table.tenantId, table.lastUpdatedByEmployeeId),
    ...tenantIsolationPolicies("employee_preferences"),
    serviceBypassPolicy("employee_preferences"),
  ]
);

// ============================================================================
// TABLE: employee_surveys
// Survey definitions (engagement, pulse, exit, onboarding, custom)
// ============================================================================
export const employeeSurveys = hrSchema.table(
  "employee_surveys",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: integer("tenant_id").notNull(),
    surveyCode: text("survey_code").notNull(),
    ...nameColumn,
    description: text("description"),
    surveyType: surveyTypeEnum("survey_type").notNull(),
    startDate: date("start_date", { mode: "string" }).notNull(),
    endDate: date("end_date", { mode: "string" }).notNull(),
    isAnonymous: boolean("is_anonymous").notNull().default(true),
    targetAudience: jsonb("target_audience").$type<Record<string, unknown>>(),
    questions: jsonb("questions")
      .$type<Array<Record<string, unknown>>>()
      .notNull(),
    questionsSchemaVersion: integer("questions_schema_version").notNull().default(1),
    branchingSchemaVersion: integer("branching_schema_version").notNull().default(1),
    scoringModel: essSurveyScoringModelEnum("scoring_model").notNull().default("none"),
    computedScore: numeric("computed_score", { precision: 10, scale: 4 }),
    scoreComponents: jsonb("score_components").$type<Record<string, unknown>>(),
    sampleSize: integer("sample_size"),
    responseRate: numeric("response_rate", { precision: 5, scale: 2 }),
    status: employeeSurveyWorkflowStatusEnum("status").notNull().default("draft"),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    closedAt: timestamp("closed_at", { withTimezone: true }),
    ...timestampColumns,
    ...softDeleteColumns,
    ...auditColumns(() => users.userId),
  },
  (table) => [
    foreignKey({ columns: [table.tenantId], foreignColumns: [tenants.tenantId] }),
    uniqueIndex("employee_surveys_tenant_code_unique")
      .on(table.tenantId, table.surveyCode)
      .where(sql`${table.deletedAt} IS NULL`),
    check("employee_surveys_date_range", sql`${table.endDate} >= ${table.startDate}`),
    check(
      "employee_surveys_questions_schema_version",
      sql`${table.questionsSchemaVersion} >= 1`
    ),
    check(
      "employee_surveys_branching_schema_version",
      sql`${table.branchingSchemaVersion} >= 1`
    ),
    check(
      "employee_surveys_published_closed_order",
      sql`${table.publishedAt} IS NULL OR ${table.closedAt} IS NULL OR ${table.publishedAt} <= ${table.closedAt}`
    ),
    check(
      "employee_surveys_scoring_requires_computed_score",
      sql`${table.scoringModel} = 'none'::hr.ess_survey_scoring_model OR ${table.computedScore} IS NOT NULL`
    ),
    check(
      "employee_surveys_sample_size_non_negative",
      sql`${table.sampleSize} IS NULL OR ${table.sampleSize} >= 0`
    ),
    check(
      "employee_surveys_response_rate_range",
      sql`${table.responseRate} IS NULL OR (${table.responseRate} >= 0 AND ${table.responseRate} <= 100)`
    ),
    index("employee_surveys_tenant_idx").on(table.tenantId),
    index("employee_surveys_type_idx").on(table.tenantId, table.surveyType),
    index("employee_surveys_status_idx").on(table.tenantId, table.status),
    ...tenantIsolationPolicies("employee_surveys"),
    serviceBypassPolicy("employee_surveys"),
  ]
);

// ============================================================================
// TABLE: employee_survey_questionnaire_versions — immutable published snapshots
// ============================================================================
export const employeeSurveyQuestionnaireVersions = hrSchema.table(
  "employee_survey_questionnaire_versions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: integer("tenant_id").notNull(),
    surveyId: uuid("survey_id").notNull(),
    version: integer("version").notNull(),
    questions: jsonb("questions").$type<Array<Record<string, unknown>>>().notNull(),
    questionsSchemaVersion: integer("questions_schema_version").notNull().default(1),
    isLocked: boolean("is_locked").notNull().default(true),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    ...timestampColumns,
    ...auditColumns(() => users.userId),
    ...softDeleteColumns,
  },
  (table) => [
    foreignKey({ columns: [table.tenantId], foreignColumns: [tenants.tenantId] }),
    foreignKey({
      columns: [table.tenantId, table.surveyId],
      foreignColumns: [employeeSurveys.tenantId, employeeSurveys.id],
    }),
    uniqueIndex("employee_survey_questionnaire_versions_survey_version_unique").on(
      table.tenantId,
      table.surveyId,
      table.version
    ),
    check(
      "employee_survey_questionnaire_versions_version_positive",
      sql`${table.version} >= 1`
    ),
    check(
      "employee_survey_questionnaire_versions_q_schema",
      sql`${table.questionsSchemaVersion} >= 1`
    ),
    index("employee_survey_questionnaire_versions_tenant_idx").on(table.tenantId),
    index("employee_survey_questionnaire_versions_survey_idx").on(
      table.tenantId,
      table.surveyId
    ),
    ...tenantIsolationPolicies("employee_survey_questionnaire_versions"),
    serviceBypassPolicy("employee_survey_questionnaire_versions"),
  ]
);

// ============================================================================
// TABLE: survey_responses
// Anonymous survey responses
// ============================================================================
export const surveyResponses = hrSchema.table(
  "survey_responses",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: integer("tenant_id").notNull(),
    surveyId: uuid("survey_id").notNull(),
    questionnaireVersionId: uuid("questionnaire_version_id"),
    employeeId: uuid("employee_id"), // Nullable for anonymous surveys
    responseDate: timestamp("response_date", { withTimezone: true }).notNull().defaultNow(),
    responses: jsonb("responses").$type<unknown[]>().notNull(),
    responsesSchemaVersion: integer("responses_schema_version").notNull().default(1),
    completionPercentage: numeric("completion_percentage", { precision: 5, scale: 2 }).notNull(),
    isCompleted: boolean("is_completed").notNull().default(false),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    ipAddress: text("ip_address"), // For fraud detection
    userAgent: text("user_agent"),
    geoLocation: jsonb("geo_location").$type<Record<string, unknown>>(),
    responseHash: text("response_hash"),
    validatedAt: timestamp("validated_at", { withTimezone: true }),
    ...timestampColumns,
    ...auditColumns(() => users.userId),
    ...softDeleteColumns,
  },
  (table) => [
    foreignKey({ columns: [table.tenantId], foreignColumns: [tenants.tenantId] }),
    foreignKey({
      columns: [table.tenantId, table.surveyId],
      foreignColumns: [employeeSurveys.tenantId, employeeSurveys.id],
    }),
    foreignKey({
      columns: [table.tenantId, table.questionnaireVersionId],
      foreignColumns: [
        employeeSurveyQuestionnaireVersions.tenantId,
        employeeSurveyQuestionnaireVersions.id,
      ],
    }),
    foreignKey({
      columns: [table.tenantId, table.employeeId],
      foreignColumns: [employees.tenantId, employees.id],
    }),
    check(
      "survey_responses_responses_schema_version",
      sql`${table.responsesSchemaVersion} >= 1`
    ),
    check(
      "survey_responses_completion_valid",
      sql`${table.completionPercentage} >= 0 AND ${table.completionPercentage} <= 100`
    ),
    check(
      "survey_responses_completed_consistency",
      sql`${table.isCompleted} = false OR (${table.isCompleted} = true AND ${table.completedAt} IS NOT NULL)`
    ),
    index("survey_responses_tenant_idx").on(table.tenantId),
    index("survey_responses_survey_idx").on(table.tenantId, table.surveyId),
    index("survey_responses_employee_idx").on(table.tenantId, table.employeeId),
    index("survey_responses_completed_idx").on(table.tenantId, table.isCompleted),
    index("survey_responses_questionnaire_version_idx")
      .on(table.tenantId, table.questionnaireVersionId)
      .where(sql`${table.questionnaireVersionId} IS NOT NULL`),
    index("survey_responses_geo_gin")
      .using("gin", table.geoLocation)
      .where(sql`${table.geoLocation} IS NOT NULL`),
    ...tenantIsolationPolicies("survey_responses"),
    serviceBypassPolicy("survey_responses"),
  ]
);

// ============================================================================
// TABLE: survey_invitations — non-anonymous survey delivery / completion tracking
// ============================================================================
export const surveyInvitations = hrSchema.table(
  "survey_invitations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: integer("tenant_id").notNull(),
    surveyId: uuid("survey_id").notNull(),
    employeeId: uuid("employee_id").notNull(),
    status: surveyInvitationStatusEnum("status").notNull().default("pending"),
    invitedAt: timestamp("invited_at", { withTimezone: true }).notNull().defaultNow(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    ...timestampColumns,
    ...auditColumns(() => users.userId),
    ...softDeleteColumns,
  },
  (table) => [
    foreignKey({ columns: [table.tenantId], foreignColumns: [tenants.tenantId] }),
    foreignKey({
      columns: [table.tenantId, table.surveyId],
      foreignColumns: [employeeSurveys.tenantId, employeeSurveys.id],
    }),
    foreignKey({
      columns: [table.tenantId, table.employeeId],
      foreignColumns: [employees.tenantId, employees.id],
    }),
    uniqueIndex("survey_invitations_tenant_survey_employee_unique").on(
      table.tenantId,
      table.surveyId,
      table.employeeId
    ),
    check(
      "survey_invitations_completed_consistency",
      sql`${table.status} <> 'completed'::hr.survey_invitation_status OR ${table.completedAt} IS NOT NULL`
    ),
    index("survey_invitations_tenant_idx").on(table.tenantId),
    index("survey_invitations_survey_idx").on(table.tenantId, table.surveyId),
    ...tenantIsolationPolicies("survey_invitations"),
    serviceBypassPolicy("survey_invitations"),
  ]
);

// ============================================================================
// TABLE: employee_push_endpoints — device tokens for delivery_channel = push
// ============================================================================
export const employeePushEndpoints = hrSchema.table(
  "employee_push_endpoints",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: integer("tenant_id").notNull(),
    employeeId: uuid("employee_id").notNull(),
    platform: employeePushPlatformEnum("platform").notNull(),
    endpointToken: text("endpoint_token").notNull(),
    deviceId: text("device_id"),
    lastRegisteredAt: timestamp("last_registered_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    ...timestampColumns,
    ...auditColumns(() => users.userId),
    ...softDeleteColumns,
  },
  (table) => [
    foreignKey({ columns: [table.tenantId], foreignColumns: [tenants.tenantId] }),
    foreignKey({
      columns: [table.tenantId, table.employeeId],
      foreignColumns: [employees.tenantId, employees.id],
    }),
    uniqueIndex("employee_push_endpoints_tenant_employee_device_unique")
      .on(table.tenantId, table.employeeId, table.deviceId)
      .where(sql`${table.deviceId} IS NOT NULL`),
    index("employee_push_endpoints_tenant_idx").on(table.tenantId),
    index("employee_push_endpoints_employee_idx").on(table.tenantId, table.employeeId),
    ...tenantIsolationPolicies("employee_push_endpoints"),
    serviceBypassPolicy("employee_push_endpoints"),
  ]
);

// ============================================================================
// TABLE: ess_event_types — catalogued domain event types (no ad-hoc event_code)
// ============================================================================
export const essEventTypes = hrSchema.table(
  "ess_event_types",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: integer("tenant_id").notNull(),
    eventCode: text("event_code").notNull(),
    aggregateType: essEventAggregateTypeEnum("aggregate_type").notNull(),
    payloadSchemaVersion: integer("payload_schema_version").notNull().default(1),
    isActive: boolean("is_active").notNull().default(true),
    description: text("description"),
    ...timestampColumns,
    ...auditColumns(() => users.userId),
    ...softDeleteColumns,
  },
  (table) => [
    foreignKey({ columns: [table.tenantId], foreignColumns: [tenants.tenantId] }),
    uniqueIndex("ess_event_types_tenant_code_unique").on(table.tenantId, table.eventCode),
    check("ess_event_types_payload_schema_version", sql`${table.payloadSchemaVersion} >= 1`),
    index("ess_event_types_tenant_idx").on(table.tenantId),
    index("ess_event_types_aggregate_idx").on(table.tenantId, table.aggregateType),
    ...tenantIsolationPolicies("ess_event_types"),
    serviceBypassPolicy("ess_event_types"),
  ]
);

// ============================================================================
// TABLE: ess_domain_events — append-only facts (Truth Engine)
// ============================================================================
export const essDomainEvents = hrSchema.table(
  "ess_domain_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: integer("tenant_id").notNull(),
    eventTypeId: uuid("event_type_id").notNull(),
    aggregateType: essEventAggregateTypeEnum("aggregate_type").notNull(),
    aggregateId: uuid("aggregate_id").notNull(),
    aggregateVersion: integer("aggregate_version"),
    payload: jsonb("payload").$type<Record<string, unknown>>().notNull(),
    occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull().defaultNow(),
    correlationId: uuid("correlation_id"),
    causationId: uuid("causation_id"),
    actorEmployeeId: uuid("actor_employee_id"),
    createdBy: integer("created_by").notNull().references(() => users.userId),
    ...appendOnlyTimestampColumns,
  },
  (table) => [
    foreignKey({ columns: [table.tenantId], foreignColumns: [tenants.tenantId] }),
    foreignKey({
      columns: [table.tenantId, table.eventTypeId],
      foreignColumns: [essEventTypes.tenantId, essEventTypes.id],
    }),
    foreignKey({
      columns: [table.tenantId, table.actorEmployeeId],
      foreignColumns: [employees.tenantId, employees.id],
    }),
    index("ess_domain_events_tenant_idx").on(table.tenantId),
    index("ess_domain_events_aggregate_idx").on(
      table.tenantId,
      table.aggregateType,
      table.aggregateId,
      table.occurredAt
    ),
    index("ess_domain_events_type_idx").on(table.tenantId, table.eventTypeId),
    ...tenantIsolationPolicies("ess_domain_events"),
    serviceBypassPolicy("ess_domain_events"),
  ]
);

// ============================================================================
// TABLE: ess_outbox — transactional outbox (at-most-once per destination)
// ============================================================================
export const essOutbox = hrSchema.table(
  "ess_outbox",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: integer("tenant_id").notNull(),
    domainEventId: uuid("domain_event_id").notNull(),
    destination: text("destination").notNull(),
    deliveryStatus: essOutboxDeliveryStatusEnum("delivery_status").notNull().default("pending"),
    idempotencyKey: text("idempotency_key"),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    attemptCount: integer("attempt_count").notNull().default(0),
    lastError: text("last_error"),
    ...timestampColumns,
    ...auditColumns(() => users.userId),
    ...softDeleteColumns,
  },
  (table) => [
    foreignKey({ columns: [table.tenantId], foreignColumns: [tenants.tenantId] }),
    foreignKey({
      columns: [table.tenantId, table.domainEventId],
      foreignColumns: [essDomainEvents.tenantId, essDomainEvents.id],
    }),
    uniqueIndex("ess_outbox_event_destination_unique").on(table.domainEventId, table.destination),
    uniqueIndex("ess_outbox_tenant_idempotency_unique")
      .on(table.tenantId, table.idempotencyKey)
      .where(sql`${table.idempotencyKey} IS NOT NULL`),
    check("ess_outbox_attempt_count_nonnegative", sql`${table.attemptCount} >= 0`),
    index("ess_outbox_pending_idx")
      .on(table.tenantId, table.publishedAt)
      .where(sql`${table.publishedAt} IS NULL`),
    ...tenantIsolationPolicies("ess_outbox"),
    serviceBypassPolicy("ess_outbox"),
  ]
);

// ============================================================================
// TABLE: ess_workflow_definitions — optional template rows (runtime interprets)
// ============================================================================
export const essWorkflowDefinitions = hrSchema.table(
  "ess_workflow_definitions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: integer("tenant_id").notNull(),
    definitionCode: text("definition_code").notNull(),
    ...nameColumn,
    requestType: requestTypeEnum("request_type"),
    version: integer("version").notNull().default(1),
    isActive: boolean("is_active").notNull().default(true),
    ...timestampColumns,
    ...auditColumns(() => users.userId),
    ...softDeleteColumns,
  },
  (table) => [
    foreignKey({ columns: [table.tenantId], foreignColumns: [tenants.tenantId] }),
    uniqueIndex("ess_workflow_definitions_tenant_code_version_unique").on(
      table.tenantId,
      table.definitionCode,
      table.version
    ),
    check("ess_workflow_definitions_version_positive", sql`${table.version} >= 1`),
    index("ess_workflow_definitions_tenant_idx").on(table.tenantId),
    ...tenantIsolationPolicies("ess_workflow_definitions"),
    serviceBypassPolicy("ess_workflow_definitions"),
  ]
);

// ============================================================================
// TABLE: ess_workflow_steps
// ============================================================================
export const essWorkflowSteps = hrSchema.table(
  "ess_workflow_steps",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: integer("tenant_id").notNull(),
    workflowDefinitionId: uuid("workflow_definition_id").notNull(),
    stepKey: text("step_key").notNull(),
    sequence: integer("sequence").notNull(),
    parallelGroupId: uuid("parallel_group_id"),
    assigneeRule: jsonb("assignee_rule").$type<Record<string, unknown>>(),
    ...timestampColumns,
    ...auditColumns(() => users.userId),
    ...softDeleteColumns,
  },
  (table) => [
    foreignKey({ columns: [table.tenantId], foreignColumns: [tenants.tenantId] }),
    foreignKey({
      columns: [table.tenantId, table.workflowDefinitionId],
      foreignColumns: [essWorkflowDefinitions.tenantId, essWorkflowDefinitions.id],
    }),
    index("ess_workflow_steps_definition_idx").on(table.tenantId, table.workflowDefinitionId),
    check("ess_workflow_steps_sequence_nonnegative", sql`${table.sequence} >= 0`),
    ...tenantIsolationPolicies("ess_workflow_steps"),
    serviceBypassPolicy("ess_workflow_steps"),
  ]
);

// ============================================================================
// ZOD INSERT SCHEMAS
// ============================================================================

export const insertEmployeeSelfServiceProfileSchema = z.object({
  id: EmployeeSelfServiceProfileIdSchema.optional(),
  tenantId: hrTenantIdSchema,
  employeeId: EmployeeIdSchema,
  isEnabled: z.boolean().default(true),
  lastLoginAt: z.iso.datetime().optional(),
  loginCount: z.number().int().nonnegative().default(0),
  preferredLanguage: z.string().length(2).default("en"),
  timezone: z.string().max(50).default("UTC"),
});

export const insertEmployeeRequestSchema = z
  .object({
    id: EmployeeRequestIdSchema.optional(),
    tenantId: hrTenantIdSchema,
    employeeId: EmployeeIdSchema,
    requestNumber: z.string().min(5).max(50),
    requestType: RequestTypeSchema,
    requestDate: z.iso.date(),
    requestStatus: RequestStatusSchema.default("draft"),
    requestData: metadataSchema.nullish(),
    requestDataSchemaVersion: z.number().int().min(1).default(1),
    aggregateVersion: z.number().int().min(1).default(1),
    submittedAt: z.iso.datetime().optional(),
    slaDueAt: z.iso.datetime().optional(),
    firstResponseAt: z.iso.datetime().optional(),
    slaBreachedAt: z.iso.datetime().optional(),
    slaStatus: EssSlaStatusSchema.default("within_sla"),
    slaExtensionReason: z.string().max(1000).optional(),
    escalationPolicyId: EssEscalationPolicyIdSchema.optional(),
    amendedFromRequestId: EmployeeRequestIdSchema.optional(),
    relatedGrievanceId: GrievanceIdSchema.optional(),
    approvedBy: EmployeeIdSchema.optional(),
    approvedAt: z.iso.datetime().optional(),
    rejectedReason: z.string().max(500).optional(),
    notes: z.string().max(1000).optional(),
  })
  .superRefine(
    refineApprovedRequiresActor({
      statusField: "requestStatus",
      approvedValue: "approved",
      actorField: "approvedBy",
      atField: "approvedAt",
    })
  )
  .superRefine(
    refineApprovalFieldsAbsentUnlessApproved({
      statusField: "requestStatus",
      approvedValue: "approved",
      actorField: "approvedBy",
      atField: "approvedAt",
    })
  )
  .superRefine(
    refineRejectedRequiresReason({
      statusField: "requestStatus",
      rejectedValue: "rejected",
      reasonField: "rejectedReason",
    })
  )
  .superRefine(
    refineReasonAbsentUnlessRejected({
      statusField: "requestStatus",
      rejectedValue: "rejected",
      reasonField: "rejectedReason",
    })
  )
  .superRefine((data, ctx) => {
    if (data.slaBreachedAt != null && data.slaDueAt == null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "slaDueAt is required when slaBreachedAt is set",
        path: ["slaDueAt"],
      });
    }
    if (data.slaStatus === "breached" && data.slaBreachedAt == null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "slaBreachedAt is required when slaStatus is breached",
        path: ["slaBreachedAt"],
      });
    }
    if (data.slaStatus === "breached" && data.requestStatus === "draft") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "requestStatus cannot remain draft when slaStatus is breached",
        path: ["requestStatus"],
      });
    }
    if (
      data.firstResponseAt != null &&
      data.submittedAt != null &&
      data.firstResponseAt < data.submittedAt
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "firstResponseAt must be on or after submittedAt",
        path: ["firstResponseAt"],
      });
    }
  });

export const insertEmployeeNotificationSchema = z
  .object({
    id: EmployeeNotificationIdSchema.optional(),
    tenantId: hrTenantIdSchema,
    employeeId: EmployeeIdSchema,
    title: z.string().min(1).max(200),
    message: z.string().min(1).max(2000),
    notificationType: EmployeeNotificationTypeSchema,
    priority: NotificationPrioritySchema.default("medium"),
    status: NotificationStatusSchema.default("unread"),
    deliveryChannel: NotificationDeliveryChannelSchema.default("in_app"),
    actionUrl: z.string().url().optional(),
    actionLabel: z.string().max(50).optional(),
    readAt: z.iso.datetime().optional(),
    expiresAt: z.iso.datetime().optional(),
    metadata: metadataSchema.nullish(),
    metadataSchemaVersion: z.number().int().min(1).default(1),
    referenceKind: EmployeeNotificationReferenceKindSchema.optional(),
    referenceId: z.uuid().optional(),
    deliveryAttempts: z.number().int().nonnegative().default(0),
    lastAttemptAt: z.iso.datetime().optional(),
  })
  .refine(
    (data) => {
      if (data.actionUrl && !data.actionLabel) return false;
      return true;
    },
    {
      message: "actionLabel is required when actionUrl is provided",
      path: ["actionLabel"],
    }
  )
  .superRefine(
    refineConditionalRequired(
      "readAt",
      (data) => data.status === "read",
      "readAt is required when status is read"
    )
  )
  .superRefine(
    refineConditionalRequired(
      "expiresAt",
      (data) => data.status === "expired",
      "expiresAt is required when status is expired"
    )
  )
  .superRefine((data, ctx) => {
    if (data.expiresAt == null || data.status === "expired") return;
    const t = Date.parse(data.expiresAt);
    if (Number.isFinite(t) && t < Date.now()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          "status must be expired when expiresAt is in the past (matches hr.employee_notifications_auto_expire trigger)",
        path: ["status"],
      });
    }
  })
  .superRefine((data, ctx) => {
    const hasRefKind = data.referenceKind != null;
    const hasRefId = data.referenceId != null;
    if (hasRefKind !== hasRefId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "referenceKind and referenceId must both be set or both omitted",
        path: hasRefKind ? ["referenceId"] : ["referenceKind"],
      });
    }
  });

export const insertEmployeePreferenceSchema = z
  .object({
    id: EmployeePreferenceIdSchema.optional(),
    tenantId: hrTenantIdSchema,
    employeeId: EmployeeIdSchema,
    preferenceKey: z.string().min(1).max(100),
    preferenceValue: z.string().min(1).max(500).optional(),
    preferenceValueJson: jsonObjectNullishSchema,
    preferenceType: EmployeePreferenceTypeSchema,
    description: z.string().max(500).optional(),
    lastUpdatedByEmployeeId: EmployeeIdSchema.optional(),
    createdBy: hrAuditUserIdSchema,
    updatedBy: hrAuditUserIdSchema,
  })
  .superRefine((data, ctx) => {
    const hasText = data.preferenceValue != null && data.preferenceValue.trim() !== "";
    const hasJson = data.preferenceValueJson != null;
    if (data.preferenceType === "structured") {
      if (!hasJson) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "preferenceValueJson is required when preferenceType is structured",
          path: ["preferenceValueJson"],
        });
      }
    } else if (!hasText && !hasJson) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Provide preferenceValue and/or a non-empty preferenceValueJson",
        path: ["preferenceValue"],
      });
    }
  });

export const insertEmployeeSurveySchema = z
  .object({
    id: EmployeeSurveyIdSchema.optional(),
    tenantId: hrTenantIdSchema,
    surveyCode: z.string().min(3).max(50),
    name: z.string().min(2).max(100),
    description: z.string().max(2000).optional(),
    surveyType: SurveyTypeSchema,
    startDate: z.iso.date(),
    endDate: z.iso.date(),
    isAnonymous: z.boolean().default(true),
    targetAudience: jsonObjectNullishSchema,
    questions: z.array(hrSurveyQuestionSchema).min(1),
    questionsSchemaVersion: z.number().int().min(1).default(1),
    branchingSchemaVersion: z.number().int().min(1).default(1),
    scoringModel: EssSurveyScoringModelSchema.default("none"),
    computedScore: z.string().regex(/^\d+(\.\d{1,4})?$/).optional(),
    scoreComponents: jsonObjectNullishSchema,
    sampleSize: z.number().int().nonnegative().optional(),
    responseRate: boundedPercentageSchema.optional(),
    status: EmployeeSurveyWorkflowStatusSchema.default("draft"),
    publishedAt: z.iso.datetime().optional(),
    closedAt: z.iso.datetime().optional(),
  })
  .superRefine(refineDateRange("startDate", "endDate"))
  .superRefine((data, ctx) => {
    if (data.publishedAt && data.closedAt && data.publishedAt > data.closedAt) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "publishedAt must be on or before closedAt",
        path: ["closedAt"],
      });
    }
    addIssueIfSerializedJsonExceeds(
      data.questions,
      ctx,
      HR_JSONB_DEFAULT_MAX_BYTES.surveyQuestionsDocument,
      ["questions"]
    );
    if (data.scoringModel !== "none" && data.computedScore == null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "computedScore is required when scoringModel is not none",
        path: ["computedScore"],
      });
    }
  });

export const insertSurveyResponseSchema = z
  .object({
    id: SurveyResponseIdSchema.optional(),
    tenantId: hrTenantIdSchema,
    surveyId: EmployeeSurveyIdSchema,
    questionnaireVersionId: EmployeeSurveyQuestionnaireVersionIdSchema.optional(),
    employeeId: EmployeeIdSchema.optional(), // Nullable for anonymous
    responseDate: z.iso.datetime().optional(),
    responses: z.array(hrSurveyResponseItemSchema).min(1),
    responsesSchemaVersion: z.number().int().min(1).default(1),
    completionPercentage: boundedPercentageSchema,
    isCompleted: z.boolean().default(false),
    completedAt: z.iso.datetime().optional(),
    ipAddress: z
      .string()
      .regex(/^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$|^(?:[a-fA-F0-9:]+:+)+[a-fA-F0-9]+$/)
      .optional(),
    userAgent: z.string().max(500).optional(),
    geoLocation: jsonObjectNullishSchema,
    responseHash: z
      .string()
      .max(128)
      .regex(/^[A-Fa-f0-9]+$/, "responseHash must be hexadecimal")
      .optional(),
    validatedAt: z.iso.datetime().optional(),
  })
  .superRefine(refineConditionalRequired("completedAt", (data) => data.isCompleted === true))
  .superRefine((data, ctx) => {
    addIssueIfSerializedJsonExceeds(
      data.responses,
      ctx,
      HR_JSONB_DEFAULT_MAX_BYTES.surveyResponsesDocument,
      ["responses"]
    );
    addIssueIfSerializedJsonExceeds(data.geoLocation, ctx, 65_536, ["geoLocation"]);
  });

export const insertEmployeeRequestHistorySchema = z.object({
  id: EmployeeRequestHistoryIdSchema.optional(),
  tenantId: hrTenantIdSchema,
  employeeRequestId: EmployeeRequestIdSchema,
  fromStatus: RequestStatusSchema.optional(),
  toStatus: RequestStatusSchema,
  actorEmployeeId: EmployeeIdSchema.optional(),
  correlationId: z.uuid().optional(),
  transitionSource: EssRequestHistoryTransitionSourceSchema.default("user"),
  notes: z.string().max(1000).optional(),
});

export const insertEssEscalationPolicySchema = z.object({
  id: EssEscalationPolicyIdSchema.optional(),
  tenantId: hrTenantIdSchema,
  policyCode: z.string().min(2).max(50),
  name: z.string().min(2).max(100),
  description: z.string().max(2000).optional(),
  responseSlaHours: z.number().int().positive(),
  escalationRules: jsonObjectNullishSchema,
  rulesSchemaVersion: z.number().int().min(1).default(1),
  createdBy: hrAuditUserIdSchema,
  updatedBy: hrAuditUserIdSchema,
});

export const insertEmployeeRequestApprovalTaskSchema = z
  .object({
    id: EmployeeRequestApprovalTaskIdSchema.optional(),
    tenantId: hrTenantIdSchema,
    employeeRequestId: EmployeeRequestIdSchema,
    stepKey: z.string().min(1).max(100),
    sequence: z.number().int().nonnegative(),
    parallelGroupId: z.uuid().optional(),
    status: EssApprovalTaskStatusSchema.default("pending"),
    decision: EssApprovalTaskDecisionSchema.optional(),
    decisionReason: z.string().max(1000).optional(),
    delegationReason: z.string().min(1).max(1000).optional(),
    assigneeEmployeeId: EmployeeIdSchema.optional(),
    delegatedFromEmployeeId: EmployeeIdSchema.optional(),
    dueAt: z.iso.datetime().optional(),
    decidedAt: z.iso.datetime().optional(),
    decidedBy: EmployeeIdSchema.optional(),
  })
  .superRefine((data, ctx) => {
    if (data.status === "pending") {
      if (data.decision != null)
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "decision must be omitted when status is pending",
          path: ["decision"],
        });
      if (data.decidedAt != null)
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "decidedAt must be omitted when status is pending",
          path: ["decidedAt"],
        });
      if (data.decidedBy != null)
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "decidedBy must be omitted when status is pending",
          path: ["decidedBy"],
        });
    }
  })
  .superRefine((data, ctx) => {
    if (data.status === "approved" && data.decision !== "approve") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "decision must be approve when status is approved",
        path: ["decision"],
      });
    }
  })
  .superRefine(
    refineApprovedRequiresActor({
      statusField: "status",
      approvedValue: "approved",
      actorField: "decidedBy",
      atField: "decidedAt",
    })
  )
  .superRefine((data, ctx) => {
    if (data.status !== "rejected") return;
    if (data.decision !== "reject") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "decision must be reject when status is rejected",
        path: ["decision"],
      });
    }
    if (data.decidedAt == null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "decidedAt is required when status is rejected",
        path: ["decidedAt"],
      });
    }
    if (data.decidedBy == null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "decidedBy is required when status is rejected",
        path: ["decidedBy"],
      });
    }
  })
  .superRefine(
    refineRejectedRequiresReason({
      statusField: "status",
      rejectedValue: "rejected",
      reasonField: "decisionReason",
    })
  )
  .superRefine((data, ctx) => {
    if (data.status === "skipped" && data.decidedAt == null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "decidedAt is required when status is skipped",
        path: ["decidedAt"],
      });
    }
    if (data.status === "cancelled" && data.decidedAt == null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "decidedAt is required when status is cancelled",
        path: ["decidedAt"],
      });
    }
    if (
      data.delegatedFromEmployeeId != null &&
      (data.delegationReason == null || !data.delegationReason.trim())
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "delegationReason is required when delegatedFromEmployeeId is set",
        path: ["delegationReason"],
      });
    }
  });

export const insertEssEventTypeSchema = z.object({
  id: EssEventTypeIdSchema.optional(),
  tenantId: hrTenantIdSchema,
  eventCode: z.string().min(2).max(120),
  aggregateType: EssEventAggregateTypeSchema,
  payloadSchemaVersion: z.number().int().min(1).default(1),
  isActive: z.boolean().default(true),
  description: z.string().max(500).optional(),
});

export const insertEssDomainEventSchema = z.object({
  id: EssDomainEventIdSchema.optional(),
  tenantId: hrTenantIdSchema,
  eventTypeId: EssEventTypeIdSchema,
  aggregateType: EssEventAggregateTypeSchema,
  aggregateId: z.uuid(),
  aggregateVersion: z.number().int().min(1).optional(),
  payload: z.record(z.string(), z.unknown()),
});

export const insertEssOutboxSchema = z.object({
  id: EssOutboxIdSchema.optional(),
  tenantId: hrTenantIdSchema,
  domainEventId: EssDomainEventIdSchema,
  destination: z.string().min(1).max(200),
  deliveryStatus: EssOutboxDeliveryStatusSchema.default("pending"),
  idempotencyKey: z.string().min(8).max(200).optional(),
});

export const insertEssWorkflowDefinitionSchema = z.object({
  id: EssWorkflowDefinitionIdSchema.optional(),
  tenantId: hrTenantIdSchema,
  definitionCode: z.string().min(2).max(80),
  name: z.string().min(2).max(100),
  requestType: RequestTypeSchema.optional(),
  version: z.number().int().min(1).default(1),
  isActive: z.boolean().default(true),
  createdBy: hrAuditUserIdSchema,
  updatedBy: hrAuditUserIdSchema,
});

export const insertEssWorkflowStepSchema = z.object({
  id: EssWorkflowStepIdSchema.optional(),
  tenantId: hrTenantIdSchema,
  workflowDefinitionId: EssWorkflowDefinitionIdSchema,
  stepKey: z.string().min(1).max(100),
  sequence: z.number().int().nonnegative(),
  parallelGroupId: z.uuid().optional(),
  assigneeRule: jsonObjectNullishSchema,
});

export const insertEmployeeSurveyQuestionnaireVersionSchema = z
  .object({
    id: EmployeeSurveyQuestionnaireVersionIdSchema.optional(),
    tenantId: hrTenantIdSchema,
    surveyId: EmployeeSurveyIdSchema,
    version: z.number().int().min(1),
    questions: z.array(hrSurveyQuestionSchema).min(1),
    questionsSchemaVersion: z.number().int().min(1).default(1),
    isLocked: z.boolean().default(true),
    publishedAt: z.iso.datetime().optional(),
    createdBy: hrAuditUserIdSchema,
    updatedBy: hrAuditUserIdSchema,
  })
  .superRefine((data, ctx) => {
    addIssueIfSerializedJsonExceeds(
      data.questions,
      ctx,
      HR_JSONB_DEFAULT_MAX_BYTES.surveyQuestionsDocument,
      ["questions"]
    );
  });

export const insertSurveyInvitationSchema = z.object({
  id: SurveyInvitationIdSchema.optional(),
  tenantId: hrTenantIdSchema,
  surveyId: EmployeeSurveyIdSchema,
  employeeId: EmployeeIdSchema,
  status: SurveyInvitationStatusSchema.default("pending"),
  invitedAt: z.iso.datetime().optional(),
  completedAt: z.iso.datetime().optional(),
});

export const insertEmployeePushEndpointSchema = z.object({
  id: EmployeePushEndpointIdSchema.optional(),
  tenantId: hrTenantIdSchema,
  employeeId: EmployeeIdSchema,
  platform: EmployeePushPlatformSchema,
  endpointToken: z.string().min(10).max(4096),
  deviceId: z.string().max(200).optional(),
  lastRegisteredAt: z.iso.datetime().optional(),
});
