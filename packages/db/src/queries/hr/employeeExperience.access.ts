// @generated
// Full access scaffold — tools/ci-gate/db-access-layer (emit-full).
// Human-owned reporting: use separate modules (not *.access.ts).

import { and, eq, isNull } from "drizzle-orm";
import type { Database } from "../../drizzle/db.js";
import { assertGraphGuardrailAllowsRead } from "../_shared/graph-guardrail.js";
import {
  employeeNotifications,
  employeePreferences,
  employeePushEndpoints,
  employeeRequestApprovalTasks,
  employeeRequestHistory,
  employeeRequests,
  employeeSelfServiceProfiles,
  employeeSurveyQuestionnaireVersions,
  employeeSurveys,
  essDomainEvents,
  essEscalationPolicies,
  essEventTypes,
  essOutbox,
  essWorkflowDefinitions,
  essWorkflowSteps,
  surveyInvitations,
  surveyResponses,
} from "../../schema/hr/employeeExperience.js";

/** Safe by ID: tenant + not soft-deleted. */
export async function getEssEscalationPoliciesByIdSafe(
  db: Database,
  tenantId: (typeof essEscalationPolicies.$inferSelect)["tenantId"],
  id: (typeof essEscalationPolicies.$inferSelect)["id"],
) {
  const rows = await db
    .select()
    .from(essEscalationPolicies)
    .where(
      and(
        eq(essEscalationPolicies.tenantId, tenantId),
        eq(essEscalationPolicies.id, id),
        isNull(essEscalationPolicies.deletedAt),
      ),
    )
    .limit(1);
  return rows[0] ?? null;
}

/** Same as getEssEscalationPoliciesByIdSafe; asserts graph-validation policy when GRAPH_VALIDATION_POLICY_JSON is set. */
export async function getEssEscalationPoliciesByIdSafeGuarded(
  db: Database,
  tenantId: (typeof essEscalationPolicies.$inferSelect)["tenantId"],
  id: (typeof essEscalationPolicies.$inferSelect)["id"],
) {
  await assertGraphGuardrailAllowsRead();
  return getEssEscalationPoliciesByIdSafe(db, tenantId, id);
}

/** List rows for tenant excluding soft-deleted. */
export async function listEssEscalationPoliciesActive(
  db: Database,
  tenantId: (typeof essEscalationPolicies.$inferSelect)["tenantId"],
) {
  return await db
    .select()
    .from(essEscalationPolicies)
    .where(and(eq(essEscalationPolicies.tenantId, tenantId), isNull(essEscalationPolicies.deletedAt)));
}

export async function listEssEscalationPoliciesActiveGuarded(
  db: Database,
  tenantId: (typeof essEscalationPolicies.$inferSelect)["tenantId"],
) {
  await assertGraphGuardrailAllowsRead();
  return listEssEscalationPoliciesActive(db, tenantId);
}

/** List all rows for tenant including soft-deleted. */
export async function listEssEscalationPoliciesAll(
  db: Database,
  tenantId: (typeof essEscalationPolicies.$inferSelect)["tenantId"],
) {
  return await db.select().from(essEscalationPolicies).where(eq(essEscalationPolicies.tenantId, tenantId));
}

export async function listEssEscalationPoliciesAllGuarded(
  db: Database,
  tenantId: (typeof essEscalationPolicies.$inferSelect)["tenantId"],
) {
  await assertGraphGuardrailAllowsRead();
  return listEssEscalationPoliciesAll(db, tenantId);
}

/** Soft-archive (mechanical delete flag). */
export async function archiveEssEscalationPolicies(
  db: Database,
  tenantId: (typeof essEscalationPolicies.$inferSelect)["tenantId"],
  id: (typeof essEscalationPolicies.$inferSelect)["id"],
) {
  return await db
    .update(essEscalationPolicies)
    .set({ deletedAt: new Date() })
    .where(and(eq(essEscalationPolicies.tenantId, tenantId), eq(essEscalationPolicies.id, id)));
}

export async function archiveEssEscalationPoliciesGuarded(
  db: Database,
  tenantId: (typeof essEscalationPolicies.$inferSelect)["tenantId"],
  id: (typeof essEscalationPolicies.$inferSelect)["id"],
) {
  await assertGraphGuardrailAllowsRead();
  return archiveEssEscalationPolicies(db, tenantId, id);
}


/** Safe by ID: tenant + not soft-deleted. */
export async function getEmployeeSelfServiceProfilesByIdSafe(
  db: Database,
  tenantId: (typeof employeeSelfServiceProfiles.$inferSelect)["tenantId"],
  id: (typeof employeeSelfServiceProfiles.$inferSelect)["id"],
) {
  const rows = await db
    .select()
    .from(employeeSelfServiceProfiles)
    .where(
      and(
        eq(employeeSelfServiceProfiles.tenantId, tenantId),
        eq(employeeSelfServiceProfiles.id, id),
        isNull(employeeSelfServiceProfiles.deletedAt),
      ),
    )
    .limit(1);
  return rows[0] ?? null;
}

/** Same as getEmployeeSelfServiceProfilesByIdSafe; asserts graph-validation policy when GRAPH_VALIDATION_POLICY_JSON is set. */
export async function getEmployeeSelfServiceProfilesByIdSafeGuarded(
  db: Database,
  tenantId: (typeof employeeSelfServiceProfiles.$inferSelect)["tenantId"],
  id: (typeof employeeSelfServiceProfiles.$inferSelect)["id"],
) {
  await assertGraphGuardrailAllowsRead();
  return getEmployeeSelfServiceProfilesByIdSafe(db, tenantId, id);
}

/** List rows for tenant excluding soft-deleted. */
export async function listEmployeeSelfServiceProfilesActive(
  db: Database,
  tenantId: (typeof employeeSelfServiceProfiles.$inferSelect)["tenantId"],
) {
  return await db
    .select()
    .from(employeeSelfServiceProfiles)
    .where(and(eq(employeeSelfServiceProfiles.tenantId, tenantId), isNull(employeeSelfServiceProfiles.deletedAt)));
}

export async function listEmployeeSelfServiceProfilesActiveGuarded(
  db: Database,
  tenantId: (typeof employeeSelfServiceProfiles.$inferSelect)["tenantId"],
) {
  await assertGraphGuardrailAllowsRead();
  return listEmployeeSelfServiceProfilesActive(db, tenantId);
}

/** List all rows for tenant including soft-deleted. */
export async function listEmployeeSelfServiceProfilesAll(
  db: Database,
  tenantId: (typeof employeeSelfServiceProfiles.$inferSelect)["tenantId"],
) {
  return await db.select().from(employeeSelfServiceProfiles).where(eq(employeeSelfServiceProfiles.tenantId, tenantId));
}

export async function listEmployeeSelfServiceProfilesAllGuarded(
  db: Database,
  tenantId: (typeof employeeSelfServiceProfiles.$inferSelect)["tenantId"],
) {
  await assertGraphGuardrailAllowsRead();
  return listEmployeeSelfServiceProfilesAll(db, tenantId);
}

/** Soft-archive (mechanical delete flag). */
export async function archiveEmployeeSelfServiceProfiles(
  db: Database,
  tenantId: (typeof employeeSelfServiceProfiles.$inferSelect)["tenantId"],
  id: (typeof employeeSelfServiceProfiles.$inferSelect)["id"],
) {
  return await db
    .update(employeeSelfServiceProfiles)
    .set({ deletedAt: new Date() })
    .where(and(eq(employeeSelfServiceProfiles.tenantId, tenantId), eq(employeeSelfServiceProfiles.id, id)));
}

export async function archiveEmployeeSelfServiceProfilesGuarded(
  db: Database,
  tenantId: (typeof employeeSelfServiceProfiles.$inferSelect)["tenantId"],
  id: (typeof employeeSelfServiceProfiles.$inferSelect)["id"],
) {
  await assertGraphGuardrailAllowsRead();
  return archiveEmployeeSelfServiceProfiles(db, tenantId, id);
}


/** Safe by ID: tenant + not soft-deleted. */
export async function getEmployeeRequestsByIdSafe(
  db: Database,
  tenantId: (typeof employeeRequests.$inferSelect)["tenantId"],
  id: (typeof employeeRequests.$inferSelect)["id"],
) {
  const rows = await db
    .select()
    .from(employeeRequests)
    .where(
      and(
        eq(employeeRequests.tenantId, tenantId),
        eq(employeeRequests.id, id),
        isNull(employeeRequests.deletedAt),
      ),
    )
    .limit(1);
  return rows[0] ?? null;
}

/** Same as getEmployeeRequestsByIdSafe; asserts graph-validation policy when GRAPH_VALIDATION_POLICY_JSON is set. */
export async function getEmployeeRequestsByIdSafeGuarded(
  db: Database,
  tenantId: (typeof employeeRequests.$inferSelect)["tenantId"],
  id: (typeof employeeRequests.$inferSelect)["id"],
) {
  await assertGraphGuardrailAllowsRead();
  return getEmployeeRequestsByIdSafe(db, tenantId, id);
}

/** List rows for tenant excluding soft-deleted. */
export async function listEmployeeRequestsActive(
  db: Database,
  tenantId: (typeof employeeRequests.$inferSelect)["tenantId"],
) {
  return await db
    .select()
    .from(employeeRequests)
    .where(and(eq(employeeRequests.tenantId, tenantId), isNull(employeeRequests.deletedAt)));
}

export async function listEmployeeRequestsActiveGuarded(
  db: Database,
  tenantId: (typeof employeeRequests.$inferSelect)["tenantId"],
) {
  await assertGraphGuardrailAllowsRead();
  return listEmployeeRequestsActive(db, tenantId);
}

/** List all rows for tenant including soft-deleted. */
export async function listEmployeeRequestsAll(
  db: Database,
  tenantId: (typeof employeeRequests.$inferSelect)["tenantId"],
) {
  return await db.select().from(employeeRequests).where(eq(employeeRequests.tenantId, tenantId));
}

export async function listEmployeeRequestsAllGuarded(
  db: Database,
  tenantId: (typeof employeeRequests.$inferSelect)["tenantId"],
) {
  await assertGraphGuardrailAllowsRead();
  return listEmployeeRequestsAll(db, tenantId);
}

/** Soft-archive (mechanical delete flag). */
export async function archiveEmployeeRequests(
  db: Database,
  tenantId: (typeof employeeRequests.$inferSelect)["tenantId"],
  id: (typeof employeeRequests.$inferSelect)["id"],
) {
  return await db
    .update(employeeRequests)
    .set({ deletedAt: new Date() })
    .where(and(eq(employeeRequests.tenantId, tenantId), eq(employeeRequests.id, id)));
}

export async function archiveEmployeeRequestsGuarded(
  db: Database,
  tenantId: (typeof employeeRequests.$inferSelect)["tenantId"],
  id: (typeof employeeRequests.$inferSelect)["id"],
) {
  await assertGraphGuardrailAllowsRead();
  return archiveEmployeeRequests(db, tenantId, id);
}


/** Safe by ID: tenant + not soft-deleted. */
export async function getEmployeeRequestApprovalTasksByIdSafe(
  db: Database,
  tenantId: (typeof employeeRequestApprovalTasks.$inferSelect)["tenantId"],
  id: (typeof employeeRequestApprovalTasks.$inferSelect)["id"],
) {
  const rows = await db
    .select()
    .from(employeeRequestApprovalTasks)
    .where(
      and(
        eq(employeeRequestApprovalTasks.tenantId, tenantId),
        eq(employeeRequestApprovalTasks.id, id),
        isNull(employeeRequestApprovalTasks.deletedAt),
      ),
    )
    .limit(1);
  return rows[0] ?? null;
}

/** Same as getEmployeeRequestApprovalTasksByIdSafe; asserts graph-validation policy when GRAPH_VALIDATION_POLICY_JSON is set. */
export async function getEmployeeRequestApprovalTasksByIdSafeGuarded(
  db: Database,
  tenantId: (typeof employeeRequestApprovalTasks.$inferSelect)["tenantId"],
  id: (typeof employeeRequestApprovalTasks.$inferSelect)["id"],
) {
  await assertGraphGuardrailAllowsRead();
  return getEmployeeRequestApprovalTasksByIdSafe(db, tenantId, id);
}

/** List rows for tenant excluding soft-deleted. */
export async function listEmployeeRequestApprovalTasksActive(
  db: Database,
  tenantId: (typeof employeeRequestApprovalTasks.$inferSelect)["tenantId"],
) {
  return await db
    .select()
    .from(employeeRequestApprovalTasks)
    .where(and(eq(employeeRequestApprovalTasks.tenantId, tenantId), isNull(employeeRequestApprovalTasks.deletedAt)));
}

export async function listEmployeeRequestApprovalTasksActiveGuarded(
  db: Database,
  tenantId: (typeof employeeRequestApprovalTasks.$inferSelect)["tenantId"],
) {
  await assertGraphGuardrailAllowsRead();
  return listEmployeeRequestApprovalTasksActive(db, tenantId);
}

/** List all rows for tenant including soft-deleted. */
export async function listEmployeeRequestApprovalTasksAll(
  db: Database,
  tenantId: (typeof employeeRequestApprovalTasks.$inferSelect)["tenantId"],
) {
  return await db.select().from(employeeRequestApprovalTasks).where(eq(employeeRequestApprovalTasks.tenantId, tenantId));
}

export async function listEmployeeRequestApprovalTasksAllGuarded(
  db: Database,
  tenantId: (typeof employeeRequestApprovalTasks.$inferSelect)["tenantId"],
) {
  await assertGraphGuardrailAllowsRead();
  return listEmployeeRequestApprovalTasksAll(db, tenantId);
}

/** Soft-archive (mechanical delete flag). */
export async function archiveEmployeeRequestApprovalTasks(
  db: Database,
  tenantId: (typeof employeeRequestApprovalTasks.$inferSelect)["tenantId"],
  id: (typeof employeeRequestApprovalTasks.$inferSelect)["id"],
) {
  return await db
    .update(employeeRequestApprovalTasks)
    .set({ deletedAt: new Date() })
    .where(and(eq(employeeRequestApprovalTasks.tenantId, tenantId), eq(employeeRequestApprovalTasks.id, id)));
}

export async function archiveEmployeeRequestApprovalTasksGuarded(
  db: Database,
  tenantId: (typeof employeeRequestApprovalTasks.$inferSelect)["tenantId"],
  id: (typeof employeeRequestApprovalTasks.$inferSelect)["id"],
) {
  await assertGraphGuardrailAllowsRead();
  return archiveEmployeeRequestApprovalTasks(db, tenantId, id);
}


/** By ID for tenant (no soft-delete column on table). */
export async function getEmployeeRequestHistoryById(
  db: Database,
  tenantId: (typeof employeeRequestHistory.$inferSelect)["tenantId"],
  id: (typeof employeeRequestHistory.$inferSelect)["id"],
) {
  const rows = await db
    .select()
    .from(employeeRequestHistory)
    .where(and(eq(employeeRequestHistory.tenantId, tenantId), eq(employeeRequestHistory.id, id)))
    .limit(1);
  return rows[0] ?? null;
}

export async function getEmployeeRequestHistoryByIdGuarded(
  db: Database,
  tenantId: (typeof employeeRequestHistory.$inferSelect)["tenantId"],
  id: (typeof employeeRequestHistory.$inferSelect)["id"],
) {
  await assertGraphGuardrailAllowsRead();
  return getEmployeeRequestHistoryById(db, tenantId, id);
}

/** List rows for tenant. */
export async function listEmployeeRequestHistory(
  db: Database,
  tenantId: (typeof employeeRequestHistory.$inferSelect)["tenantId"],
) {
  return await db.select().from(employeeRequestHistory).where(eq(employeeRequestHistory.tenantId, tenantId));
}

export async function listEmployeeRequestHistoryGuarded(
  db: Database,
  tenantId: (typeof employeeRequestHistory.$inferSelect)["tenantId"],
) {
  await assertGraphGuardrailAllowsRead();
  return listEmployeeRequestHistory(db, tenantId);
}


/** Safe by ID: tenant + not soft-deleted. */
export async function getEmployeeNotificationsByIdSafe(
  db: Database,
  tenantId: (typeof employeeNotifications.$inferSelect)["tenantId"],
  id: (typeof employeeNotifications.$inferSelect)["id"],
) {
  const rows = await db
    .select()
    .from(employeeNotifications)
    .where(
      and(
        eq(employeeNotifications.tenantId, tenantId),
        eq(employeeNotifications.id, id),
        isNull(employeeNotifications.deletedAt),
      ),
    )
    .limit(1);
  return rows[0] ?? null;
}

/** Same as getEmployeeNotificationsByIdSafe; asserts graph-validation policy when GRAPH_VALIDATION_POLICY_JSON is set. */
export async function getEmployeeNotificationsByIdSafeGuarded(
  db: Database,
  tenantId: (typeof employeeNotifications.$inferSelect)["tenantId"],
  id: (typeof employeeNotifications.$inferSelect)["id"],
) {
  await assertGraphGuardrailAllowsRead();
  return getEmployeeNotificationsByIdSafe(db, tenantId, id);
}

/** List rows for tenant excluding soft-deleted. */
export async function listEmployeeNotificationsActive(
  db: Database,
  tenantId: (typeof employeeNotifications.$inferSelect)["tenantId"],
) {
  return await db
    .select()
    .from(employeeNotifications)
    .where(and(eq(employeeNotifications.tenantId, tenantId), isNull(employeeNotifications.deletedAt)));
}

export async function listEmployeeNotificationsActiveGuarded(
  db: Database,
  tenantId: (typeof employeeNotifications.$inferSelect)["tenantId"],
) {
  await assertGraphGuardrailAllowsRead();
  return listEmployeeNotificationsActive(db, tenantId);
}

/** List all rows for tenant including soft-deleted. */
export async function listEmployeeNotificationsAll(
  db: Database,
  tenantId: (typeof employeeNotifications.$inferSelect)["tenantId"],
) {
  return await db.select().from(employeeNotifications).where(eq(employeeNotifications.tenantId, tenantId));
}

export async function listEmployeeNotificationsAllGuarded(
  db: Database,
  tenantId: (typeof employeeNotifications.$inferSelect)["tenantId"],
) {
  await assertGraphGuardrailAllowsRead();
  return listEmployeeNotificationsAll(db, tenantId);
}

/** Soft-archive (mechanical delete flag). */
export async function archiveEmployeeNotifications(
  db: Database,
  tenantId: (typeof employeeNotifications.$inferSelect)["tenantId"],
  id: (typeof employeeNotifications.$inferSelect)["id"],
) {
  return await db
    .update(employeeNotifications)
    .set({ deletedAt: new Date() })
    .where(and(eq(employeeNotifications.tenantId, tenantId), eq(employeeNotifications.id, id)));
}

export async function archiveEmployeeNotificationsGuarded(
  db: Database,
  tenantId: (typeof employeeNotifications.$inferSelect)["tenantId"],
  id: (typeof employeeNotifications.$inferSelect)["id"],
) {
  await assertGraphGuardrailAllowsRead();
  return archiveEmployeeNotifications(db, tenantId, id);
}


/** Safe by ID: tenant + not soft-deleted. */
export async function getEmployeePreferencesByIdSafe(
  db: Database,
  tenantId: (typeof employeePreferences.$inferSelect)["tenantId"],
  id: (typeof employeePreferences.$inferSelect)["id"],
) {
  const rows = await db
    .select()
    .from(employeePreferences)
    .where(
      and(
        eq(employeePreferences.tenantId, tenantId),
        eq(employeePreferences.id, id),
        isNull(employeePreferences.deletedAt),
      ),
    )
    .limit(1);
  return rows[0] ?? null;
}

/** Same as getEmployeePreferencesByIdSafe; asserts graph-validation policy when GRAPH_VALIDATION_POLICY_JSON is set. */
export async function getEmployeePreferencesByIdSafeGuarded(
  db: Database,
  tenantId: (typeof employeePreferences.$inferSelect)["tenantId"],
  id: (typeof employeePreferences.$inferSelect)["id"],
) {
  await assertGraphGuardrailAllowsRead();
  return getEmployeePreferencesByIdSafe(db, tenantId, id);
}

/** List rows for tenant excluding soft-deleted. */
export async function listEmployeePreferencesActive(
  db: Database,
  tenantId: (typeof employeePreferences.$inferSelect)["tenantId"],
) {
  return await db
    .select()
    .from(employeePreferences)
    .where(and(eq(employeePreferences.tenantId, tenantId), isNull(employeePreferences.deletedAt)));
}

export async function listEmployeePreferencesActiveGuarded(
  db: Database,
  tenantId: (typeof employeePreferences.$inferSelect)["tenantId"],
) {
  await assertGraphGuardrailAllowsRead();
  return listEmployeePreferencesActive(db, tenantId);
}

/** List all rows for tenant including soft-deleted. */
export async function listEmployeePreferencesAll(
  db: Database,
  tenantId: (typeof employeePreferences.$inferSelect)["tenantId"],
) {
  return await db.select().from(employeePreferences).where(eq(employeePreferences.tenantId, tenantId));
}

export async function listEmployeePreferencesAllGuarded(
  db: Database,
  tenantId: (typeof employeePreferences.$inferSelect)["tenantId"],
) {
  await assertGraphGuardrailAllowsRead();
  return listEmployeePreferencesAll(db, tenantId);
}

/** Soft-archive (mechanical delete flag). */
export async function archiveEmployeePreferences(
  db: Database,
  tenantId: (typeof employeePreferences.$inferSelect)["tenantId"],
  id: (typeof employeePreferences.$inferSelect)["id"],
) {
  return await db
    .update(employeePreferences)
    .set({ deletedAt: new Date() })
    .where(and(eq(employeePreferences.tenantId, tenantId), eq(employeePreferences.id, id)));
}

export async function archiveEmployeePreferencesGuarded(
  db: Database,
  tenantId: (typeof employeePreferences.$inferSelect)["tenantId"],
  id: (typeof employeePreferences.$inferSelect)["id"],
) {
  await assertGraphGuardrailAllowsRead();
  return archiveEmployeePreferences(db, tenantId, id);
}


/** Safe by ID: tenant + not soft-deleted. */
export async function getEmployeeSurveysByIdSafe(
  db: Database,
  tenantId: (typeof employeeSurveys.$inferSelect)["tenantId"],
  id: (typeof employeeSurveys.$inferSelect)["id"],
) {
  const rows = await db
    .select()
    .from(employeeSurveys)
    .where(
      and(
        eq(employeeSurveys.tenantId, tenantId),
        eq(employeeSurveys.id, id),
        isNull(employeeSurveys.deletedAt),
      ),
    )
    .limit(1);
  return rows[0] ?? null;
}

/** Same as getEmployeeSurveysByIdSafe; asserts graph-validation policy when GRAPH_VALIDATION_POLICY_JSON is set. */
export async function getEmployeeSurveysByIdSafeGuarded(
  db: Database,
  tenantId: (typeof employeeSurveys.$inferSelect)["tenantId"],
  id: (typeof employeeSurveys.$inferSelect)["id"],
) {
  await assertGraphGuardrailAllowsRead();
  return getEmployeeSurveysByIdSafe(db, tenantId, id);
}

/** List rows for tenant excluding soft-deleted. */
export async function listEmployeeSurveysActive(
  db: Database,
  tenantId: (typeof employeeSurveys.$inferSelect)["tenantId"],
) {
  return await db
    .select()
    .from(employeeSurveys)
    .where(and(eq(employeeSurveys.tenantId, tenantId), isNull(employeeSurveys.deletedAt)));
}

export async function listEmployeeSurveysActiveGuarded(
  db: Database,
  tenantId: (typeof employeeSurveys.$inferSelect)["tenantId"],
) {
  await assertGraphGuardrailAllowsRead();
  return listEmployeeSurveysActive(db, tenantId);
}

/** List all rows for tenant including soft-deleted. */
export async function listEmployeeSurveysAll(
  db: Database,
  tenantId: (typeof employeeSurveys.$inferSelect)["tenantId"],
) {
  return await db.select().from(employeeSurveys).where(eq(employeeSurveys.tenantId, tenantId));
}

export async function listEmployeeSurveysAllGuarded(
  db: Database,
  tenantId: (typeof employeeSurveys.$inferSelect)["tenantId"],
) {
  await assertGraphGuardrailAllowsRead();
  return listEmployeeSurveysAll(db, tenantId);
}

/** Soft-archive (mechanical delete flag). */
export async function archiveEmployeeSurveys(
  db: Database,
  tenantId: (typeof employeeSurveys.$inferSelect)["tenantId"],
  id: (typeof employeeSurveys.$inferSelect)["id"],
) {
  return await db
    .update(employeeSurveys)
    .set({ deletedAt: new Date() })
    .where(and(eq(employeeSurveys.tenantId, tenantId), eq(employeeSurveys.id, id)));
}

export async function archiveEmployeeSurveysGuarded(
  db: Database,
  tenantId: (typeof employeeSurveys.$inferSelect)["tenantId"],
  id: (typeof employeeSurveys.$inferSelect)["id"],
) {
  await assertGraphGuardrailAllowsRead();
  return archiveEmployeeSurveys(db, tenantId, id);
}


/** Safe by ID: tenant + not soft-deleted. */
export async function getEmployeeSurveyQuestionnaireVersionsByIdSafe(
  db: Database,
  tenantId: (typeof employeeSurveyQuestionnaireVersions.$inferSelect)["tenantId"],
  id: (typeof employeeSurveyQuestionnaireVersions.$inferSelect)["id"],
) {
  const rows = await db
    .select()
    .from(employeeSurveyQuestionnaireVersions)
    .where(
      and(
        eq(employeeSurveyQuestionnaireVersions.tenantId, tenantId),
        eq(employeeSurveyQuestionnaireVersions.id, id),
        isNull(employeeSurveyQuestionnaireVersions.deletedAt),
      ),
    )
    .limit(1);
  return rows[0] ?? null;
}

/** Same as getEmployeeSurveyQuestionnaireVersionsByIdSafe; asserts graph-validation policy when GRAPH_VALIDATION_POLICY_JSON is set. */
export async function getEmployeeSurveyQuestionnaireVersionsByIdSafeGuarded(
  db: Database,
  tenantId: (typeof employeeSurveyQuestionnaireVersions.$inferSelect)["tenantId"],
  id: (typeof employeeSurveyQuestionnaireVersions.$inferSelect)["id"],
) {
  await assertGraphGuardrailAllowsRead();
  return getEmployeeSurveyQuestionnaireVersionsByIdSafe(db, tenantId, id);
}

/** List rows for tenant excluding soft-deleted. */
export async function listEmployeeSurveyQuestionnaireVersionsActive(
  db: Database,
  tenantId: (typeof employeeSurveyQuestionnaireVersions.$inferSelect)["tenantId"],
) {
  return await db
    .select()
    .from(employeeSurveyQuestionnaireVersions)
    .where(and(eq(employeeSurveyQuestionnaireVersions.tenantId, tenantId), isNull(employeeSurveyQuestionnaireVersions.deletedAt)));
}

export async function listEmployeeSurveyQuestionnaireVersionsActiveGuarded(
  db: Database,
  tenantId: (typeof employeeSurveyQuestionnaireVersions.$inferSelect)["tenantId"],
) {
  await assertGraphGuardrailAllowsRead();
  return listEmployeeSurveyQuestionnaireVersionsActive(db, tenantId);
}

/** List all rows for tenant including soft-deleted. */
export async function listEmployeeSurveyQuestionnaireVersionsAll(
  db: Database,
  tenantId: (typeof employeeSurveyQuestionnaireVersions.$inferSelect)["tenantId"],
) {
  return await db.select().from(employeeSurveyQuestionnaireVersions).where(eq(employeeSurveyQuestionnaireVersions.tenantId, tenantId));
}

export async function listEmployeeSurveyQuestionnaireVersionsAllGuarded(
  db: Database,
  tenantId: (typeof employeeSurveyQuestionnaireVersions.$inferSelect)["tenantId"],
) {
  await assertGraphGuardrailAllowsRead();
  return listEmployeeSurveyQuestionnaireVersionsAll(db, tenantId);
}

/** Soft-archive (mechanical delete flag). */
export async function archiveEmployeeSurveyQuestionnaireVersions(
  db: Database,
  tenantId: (typeof employeeSurveyQuestionnaireVersions.$inferSelect)["tenantId"],
  id: (typeof employeeSurveyQuestionnaireVersions.$inferSelect)["id"],
) {
  return await db
    .update(employeeSurveyQuestionnaireVersions)
    .set({ deletedAt: new Date() })
    .where(and(eq(employeeSurveyQuestionnaireVersions.tenantId, tenantId), eq(employeeSurveyQuestionnaireVersions.id, id)));
}

export async function archiveEmployeeSurveyQuestionnaireVersionsGuarded(
  db: Database,
  tenantId: (typeof employeeSurveyQuestionnaireVersions.$inferSelect)["tenantId"],
  id: (typeof employeeSurveyQuestionnaireVersions.$inferSelect)["id"],
) {
  await assertGraphGuardrailAllowsRead();
  return archiveEmployeeSurveyQuestionnaireVersions(db, tenantId, id);
}


/** Safe by ID: tenant + not soft-deleted. */
export async function getSurveyResponsesByIdSafe(
  db: Database,
  tenantId: (typeof surveyResponses.$inferSelect)["tenantId"],
  id: (typeof surveyResponses.$inferSelect)["id"],
) {
  const rows = await db
    .select()
    .from(surveyResponses)
    .where(
      and(
        eq(surveyResponses.tenantId, tenantId),
        eq(surveyResponses.id, id),
        isNull(surveyResponses.deletedAt),
      ),
    )
    .limit(1);
  return rows[0] ?? null;
}

/** Same as getSurveyResponsesByIdSafe; asserts graph-validation policy when GRAPH_VALIDATION_POLICY_JSON is set. */
export async function getSurveyResponsesByIdSafeGuarded(
  db: Database,
  tenantId: (typeof surveyResponses.$inferSelect)["tenantId"],
  id: (typeof surveyResponses.$inferSelect)["id"],
) {
  await assertGraphGuardrailAllowsRead();
  return getSurveyResponsesByIdSafe(db, tenantId, id);
}

/** List rows for tenant excluding soft-deleted. */
export async function listSurveyResponsesActive(
  db: Database,
  tenantId: (typeof surveyResponses.$inferSelect)["tenantId"],
) {
  return await db
    .select()
    .from(surveyResponses)
    .where(and(eq(surveyResponses.tenantId, tenantId), isNull(surveyResponses.deletedAt)));
}

export async function listSurveyResponsesActiveGuarded(
  db: Database,
  tenantId: (typeof surveyResponses.$inferSelect)["tenantId"],
) {
  await assertGraphGuardrailAllowsRead();
  return listSurveyResponsesActive(db, tenantId);
}

/** List all rows for tenant including soft-deleted. */
export async function listSurveyResponsesAll(
  db: Database,
  tenantId: (typeof surveyResponses.$inferSelect)["tenantId"],
) {
  return await db.select().from(surveyResponses).where(eq(surveyResponses.tenantId, tenantId));
}

export async function listSurveyResponsesAllGuarded(
  db: Database,
  tenantId: (typeof surveyResponses.$inferSelect)["tenantId"],
) {
  await assertGraphGuardrailAllowsRead();
  return listSurveyResponsesAll(db, tenantId);
}

/** Soft-archive (mechanical delete flag). */
export async function archiveSurveyResponses(
  db: Database,
  tenantId: (typeof surveyResponses.$inferSelect)["tenantId"],
  id: (typeof surveyResponses.$inferSelect)["id"],
) {
  return await db
    .update(surveyResponses)
    .set({ deletedAt: new Date() })
    .where(and(eq(surveyResponses.tenantId, tenantId), eq(surveyResponses.id, id)));
}

export async function archiveSurveyResponsesGuarded(
  db: Database,
  tenantId: (typeof surveyResponses.$inferSelect)["tenantId"],
  id: (typeof surveyResponses.$inferSelect)["id"],
) {
  await assertGraphGuardrailAllowsRead();
  return archiveSurveyResponses(db, tenantId, id);
}


/** Safe by ID: tenant + not soft-deleted. */
export async function getSurveyInvitationsByIdSafe(
  db: Database,
  tenantId: (typeof surveyInvitations.$inferSelect)["tenantId"],
  id: (typeof surveyInvitations.$inferSelect)["id"],
) {
  const rows = await db
    .select()
    .from(surveyInvitations)
    .where(
      and(
        eq(surveyInvitations.tenantId, tenantId),
        eq(surveyInvitations.id, id),
        isNull(surveyInvitations.deletedAt),
      ),
    )
    .limit(1);
  return rows[0] ?? null;
}

/** Same as getSurveyInvitationsByIdSafe; asserts graph-validation policy when GRAPH_VALIDATION_POLICY_JSON is set. */
export async function getSurveyInvitationsByIdSafeGuarded(
  db: Database,
  tenantId: (typeof surveyInvitations.$inferSelect)["tenantId"],
  id: (typeof surveyInvitations.$inferSelect)["id"],
) {
  await assertGraphGuardrailAllowsRead();
  return getSurveyInvitationsByIdSafe(db, tenantId, id);
}

/** List rows for tenant excluding soft-deleted. */
export async function listSurveyInvitationsActive(
  db: Database,
  tenantId: (typeof surveyInvitations.$inferSelect)["tenantId"],
) {
  return await db
    .select()
    .from(surveyInvitations)
    .where(and(eq(surveyInvitations.tenantId, tenantId), isNull(surveyInvitations.deletedAt)));
}

export async function listSurveyInvitationsActiveGuarded(
  db: Database,
  tenantId: (typeof surveyInvitations.$inferSelect)["tenantId"],
) {
  await assertGraphGuardrailAllowsRead();
  return listSurveyInvitationsActive(db, tenantId);
}

/** List all rows for tenant including soft-deleted. */
export async function listSurveyInvitationsAll(
  db: Database,
  tenantId: (typeof surveyInvitations.$inferSelect)["tenantId"],
) {
  return await db.select().from(surveyInvitations).where(eq(surveyInvitations.tenantId, tenantId));
}

export async function listSurveyInvitationsAllGuarded(
  db: Database,
  tenantId: (typeof surveyInvitations.$inferSelect)["tenantId"],
) {
  await assertGraphGuardrailAllowsRead();
  return listSurveyInvitationsAll(db, tenantId);
}

/** Soft-archive (mechanical delete flag). */
export async function archiveSurveyInvitations(
  db: Database,
  tenantId: (typeof surveyInvitations.$inferSelect)["tenantId"],
  id: (typeof surveyInvitations.$inferSelect)["id"],
) {
  return await db
    .update(surveyInvitations)
    .set({ deletedAt: new Date() })
    .where(and(eq(surveyInvitations.tenantId, tenantId), eq(surveyInvitations.id, id)));
}

export async function archiveSurveyInvitationsGuarded(
  db: Database,
  tenantId: (typeof surveyInvitations.$inferSelect)["tenantId"],
  id: (typeof surveyInvitations.$inferSelect)["id"],
) {
  await assertGraphGuardrailAllowsRead();
  return archiveSurveyInvitations(db, tenantId, id);
}


/** Safe by ID: tenant + not soft-deleted. */
export async function getEmployeePushEndpointsByIdSafe(
  db: Database,
  tenantId: (typeof employeePushEndpoints.$inferSelect)["tenantId"],
  id: (typeof employeePushEndpoints.$inferSelect)["id"],
) {
  const rows = await db
    .select()
    .from(employeePushEndpoints)
    .where(
      and(
        eq(employeePushEndpoints.tenantId, tenantId),
        eq(employeePushEndpoints.id, id),
        isNull(employeePushEndpoints.deletedAt),
      ),
    )
    .limit(1);
  return rows[0] ?? null;
}

/** Same as getEmployeePushEndpointsByIdSafe; asserts graph-validation policy when GRAPH_VALIDATION_POLICY_JSON is set. */
export async function getEmployeePushEndpointsByIdSafeGuarded(
  db: Database,
  tenantId: (typeof employeePushEndpoints.$inferSelect)["tenantId"],
  id: (typeof employeePushEndpoints.$inferSelect)["id"],
) {
  await assertGraphGuardrailAllowsRead();
  return getEmployeePushEndpointsByIdSafe(db, tenantId, id);
}

/** List rows for tenant excluding soft-deleted. */
export async function listEmployeePushEndpointsActive(
  db: Database,
  tenantId: (typeof employeePushEndpoints.$inferSelect)["tenantId"],
) {
  return await db
    .select()
    .from(employeePushEndpoints)
    .where(and(eq(employeePushEndpoints.tenantId, tenantId), isNull(employeePushEndpoints.deletedAt)));
}

export async function listEmployeePushEndpointsActiveGuarded(
  db: Database,
  tenantId: (typeof employeePushEndpoints.$inferSelect)["tenantId"],
) {
  await assertGraphGuardrailAllowsRead();
  return listEmployeePushEndpointsActive(db, tenantId);
}

/** List all rows for tenant including soft-deleted. */
export async function listEmployeePushEndpointsAll(
  db: Database,
  tenantId: (typeof employeePushEndpoints.$inferSelect)["tenantId"],
) {
  return await db.select().from(employeePushEndpoints).where(eq(employeePushEndpoints.tenantId, tenantId));
}

export async function listEmployeePushEndpointsAllGuarded(
  db: Database,
  tenantId: (typeof employeePushEndpoints.$inferSelect)["tenantId"],
) {
  await assertGraphGuardrailAllowsRead();
  return listEmployeePushEndpointsAll(db, tenantId);
}

/** Soft-archive (mechanical delete flag). */
export async function archiveEmployeePushEndpoints(
  db: Database,
  tenantId: (typeof employeePushEndpoints.$inferSelect)["tenantId"],
  id: (typeof employeePushEndpoints.$inferSelect)["id"],
) {
  return await db
    .update(employeePushEndpoints)
    .set({ deletedAt: new Date() })
    .where(and(eq(employeePushEndpoints.tenantId, tenantId), eq(employeePushEndpoints.id, id)));
}

export async function archiveEmployeePushEndpointsGuarded(
  db: Database,
  tenantId: (typeof employeePushEndpoints.$inferSelect)["tenantId"],
  id: (typeof employeePushEndpoints.$inferSelect)["id"],
) {
  await assertGraphGuardrailAllowsRead();
  return archiveEmployeePushEndpoints(db, tenantId, id);
}


/** Safe by ID: tenant + not soft-deleted. */
export async function getEssEventTypesByIdSafe(
  db: Database,
  tenantId: (typeof essEventTypes.$inferSelect)["tenantId"],
  id: (typeof essEventTypes.$inferSelect)["id"],
) {
  const rows = await db
    .select()
    .from(essEventTypes)
    .where(
      and(
        eq(essEventTypes.tenantId, tenantId),
        eq(essEventTypes.id, id),
        isNull(essEventTypes.deletedAt),
      ),
    )
    .limit(1);
  return rows[0] ?? null;
}

/** Same as getEssEventTypesByIdSafe; asserts graph-validation policy when GRAPH_VALIDATION_POLICY_JSON is set. */
export async function getEssEventTypesByIdSafeGuarded(
  db: Database,
  tenantId: (typeof essEventTypes.$inferSelect)["tenantId"],
  id: (typeof essEventTypes.$inferSelect)["id"],
) {
  await assertGraphGuardrailAllowsRead();
  return getEssEventTypesByIdSafe(db, tenantId, id);
}

/** List rows for tenant excluding soft-deleted. */
export async function listEssEventTypesActive(
  db: Database,
  tenantId: (typeof essEventTypes.$inferSelect)["tenantId"],
) {
  return await db
    .select()
    .from(essEventTypes)
    .where(and(eq(essEventTypes.tenantId, tenantId), isNull(essEventTypes.deletedAt)));
}

export async function listEssEventTypesActiveGuarded(
  db: Database,
  tenantId: (typeof essEventTypes.$inferSelect)["tenantId"],
) {
  await assertGraphGuardrailAllowsRead();
  return listEssEventTypesActive(db, tenantId);
}

/** List all rows for tenant including soft-deleted. */
export async function listEssEventTypesAll(
  db: Database,
  tenantId: (typeof essEventTypes.$inferSelect)["tenantId"],
) {
  return await db.select().from(essEventTypes).where(eq(essEventTypes.tenantId, tenantId));
}

export async function listEssEventTypesAllGuarded(
  db: Database,
  tenantId: (typeof essEventTypes.$inferSelect)["tenantId"],
) {
  await assertGraphGuardrailAllowsRead();
  return listEssEventTypesAll(db, tenantId);
}

/** Soft-archive (mechanical delete flag). */
export async function archiveEssEventTypes(
  db: Database,
  tenantId: (typeof essEventTypes.$inferSelect)["tenantId"],
  id: (typeof essEventTypes.$inferSelect)["id"],
) {
  return await db
    .update(essEventTypes)
    .set({ deletedAt: new Date() })
    .where(and(eq(essEventTypes.tenantId, tenantId), eq(essEventTypes.id, id)));
}

export async function archiveEssEventTypesGuarded(
  db: Database,
  tenantId: (typeof essEventTypes.$inferSelect)["tenantId"],
  id: (typeof essEventTypes.$inferSelect)["id"],
) {
  await assertGraphGuardrailAllowsRead();
  return archiveEssEventTypes(db, tenantId, id);
}


/** By ID for tenant (no soft-delete column on table). */
export async function getEssDomainEventsById(
  db: Database,
  tenantId: (typeof essDomainEvents.$inferSelect)["tenantId"],
  id: (typeof essDomainEvents.$inferSelect)["id"],
) {
  const rows = await db
    .select()
    .from(essDomainEvents)
    .where(and(eq(essDomainEvents.tenantId, tenantId), eq(essDomainEvents.id, id)))
    .limit(1);
  return rows[0] ?? null;
}

export async function getEssDomainEventsByIdGuarded(
  db: Database,
  tenantId: (typeof essDomainEvents.$inferSelect)["tenantId"],
  id: (typeof essDomainEvents.$inferSelect)["id"],
) {
  await assertGraphGuardrailAllowsRead();
  return getEssDomainEventsById(db, tenantId, id);
}

/** List rows for tenant. */
export async function listEssDomainEvents(
  db: Database,
  tenantId: (typeof essDomainEvents.$inferSelect)["tenantId"],
) {
  return await db.select().from(essDomainEvents).where(eq(essDomainEvents.tenantId, tenantId));
}

export async function listEssDomainEventsGuarded(
  db: Database,
  tenantId: (typeof essDomainEvents.$inferSelect)["tenantId"],
) {
  await assertGraphGuardrailAllowsRead();
  return listEssDomainEvents(db, tenantId);
}


/** Safe by ID: tenant + not soft-deleted. */
export async function getEssOutboxByIdSafe(
  db: Database,
  tenantId: (typeof essOutbox.$inferSelect)["tenantId"],
  id: (typeof essOutbox.$inferSelect)["id"],
) {
  const rows = await db
    .select()
    .from(essOutbox)
    .where(
      and(
        eq(essOutbox.tenantId, tenantId),
        eq(essOutbox.id, id),
        isNull(essOutbox.deletedAt),
      ),
    )
    .limit(1);
  return rows[0] ?? null;
}

/** Same as getEssOutboxByIdSafe; asserts graph-validation policy when GRAPH_VALIDATION_POLICY_JSON is set. */
export async function getEssOutboxByIdSafeGuarded(
  db: Database,
  tenantId: (typeof essOutbox.$inferSelect)["tenantId"],
  id: (typeof essOutbox.$inferSelect)["id"],
) {
  await assertGraphGuardrailAllowsRead();
  return getEssOutboxByIdSafe(db, tenantId, id);
}

/** List rows for tenant excluding soft-deleted. */
export async function listEssOutboxActive(
  db: Database,
  tenantId: (typeof essOutbox.$inferSelect)["tenantId"],
) {
  return await db
    .select()
    .from(essOutbox)
    .where(and(eq(essOutbox.tenantId, tenantId), isNull(essOutbox.deletedAt)));
}

export async function listEssOutboxActiveGuarded(
  db: Database,
  tenantId: (typeof essOutbox.$inferSelect)["tenantId"],
) {
  await assertGraphGuardrailAllowsRead();
  return listEssOutboxActive(db, tenantId);
}

/** List all rows for tenant including soft-deleted. */
export async function listEssOutboxAll(
  db: Database,
  tenantId: (typeof essOutbox.$inferSelect)["tenantId"],
) {
  return await db.select().from(essOutbox).where(eq(essOutbox.tenantId, tenantId));
}

export async function listEssOutboxAllGuarded(
  db: Database,
  tenantId: (typeof essOutbox.$inferSelect)["tenantId"],
) {
  await assertGraphGuardrailAllowsRead();
  return listEssOutboxAll(db, tenantId);
}

/** Soft-archive (mechanical delete flag). */
export async function archiveEssOutbox(
  db: Database,
  tenantId: (typeof essOutbox.$inferSelect)["tenantId"],
  id: (typeof essOutbox.$inferSelect)["id"],
) {
  return await db
    .update(essOutbox)
    .set({ deletedAt: new Date() })
    .where(and(eq(essOutbox.tenantId, tenantId), eq(essOutbox.id, id)));
}

export async function archiveEssOutboxGuarded(
  db: Database,
  tenantId: (typeof essOutbox.$inferSelect)["tenantId"],
  id: (typeof essOutbox.$inferSelect)["id"],
) {
  await assertGraphGuardrailAllowsRead();
  return archiveEssOutbox(db, tenantId, id);
}


/** Safe by ID: tenant + not soft-deleted. */
export async function getEssWorkflowDefinitionsByIdSafe(
  db: Database,
  tenantId: (typeof essWorkflowDefinitions.$inferSelect)["tenantId"],
  id: (typeof essWorkflowDefinitions.$inferSelect)["id"],
) {
  const rows = await db
    .select()
    .from(essWorkflowDefinitions)
    .where(
      and(
        eq(essWorkflowDefinitions.tenantId, tenantId),
        eq(essWorkflowDefinitions.id, id),
        isNull(essWorkflowDefinitions.deletedAt),
      ),
    )
    .limit(1);
  return rows[0] ?? null;
}

/** Same as getEssWorkflowDefinitionsByIdSafe; asserts graph-validation policy when GRAPH_VALIDATION_POLICY_JSON is set. */
export async function getEssWorkflowDefinitionsByIdSafeGuarded(
  db: Database,
  tenantId: (typeof essWorkflowDefinitions.$inferSelect)["tenantId"],
  id: (typeof essWorkflowDefinitions.$inferSelect)["id"],
) {
  await assertGraphGuardrailAllowsRead();
  return getEssWorkflowDefinitionsByIdSafe(db, tenantId, id);
}

/** List rows for tenant excluding soft-deleted. */
export async function listEssWorkflowDefinitionsActive(
  db: Database,
  tenantId: (typeof essWorkflowDefinitions.$inferSelect)["tenantId"],
) {
  return await db
    .select()
    .from(essWorkflowDefinitions)
    .where(and(eq(essWorkflowDefinitions.tenantId, tenantId), isNull(essWorkflowDefinitions.deletedAt)));
}

export async function listEssWorkflowDefinitionsActiveGuarded(
  db: Database,
  tenantId: (typeof essWorkflowDefinitions.$inferSelect)["tenantId"],
) {
  await assertGraphGuardrailAllowsRead();
  return listEssWorkflowDefinitionsActive(db, tenantId);
}

/** List all rows for tenant including soft-deleted. */
export async function listEssWorkflowDefinitionsAll(
  db: Database,
  tenantId: (typeof essWorkflowDefinitions.$inferSelect)["tenantId"],
) {
  return await db.select().from(essWorkflowDefinitions).where(eq(essWorkflowDefinitions.tenantId, tenantId));
}

export async function listEssWorkflowDefinitionsAllGuarded(
  db: Database,
  tenantId: (typeof essWorkflowDefinitions.$inferSelect)["tenantId"],
) {
  await assertGraphGuardrailAllowsRead();
  return listEssWorkflowDefinitionsAll(db, tenantId);
}

/** Soft-archive (mechanical delete flag). */
export async function archiveEssWorkflowDefinitions(
  db: Database,
  tenantId: (typeof essWorkflowDefinitions.$inferSelect)["tenantId"],
  id: (typeof essWorkflowDefinitions.$inferSelect)["id"],
) {
  return await db
    .update(essWorkflowDefinitions)
    .set({ deletedAt: new Date() })
    .where(and(eq(essWorkflowDefinitions.tenantId, tenantId), eq(essWorkflowDefinitions.id, id)));
}

export async function archiveEssWorkflowDefinitionsGuarded(
  db: Database,
  tenantId: (typeof essWorkflowDefinitions.$inferSelect)["tenantId"],
  id: (typeof essWorkflowDefinitions.$inferSelect)["id"],
) {
  await assertGraphGuardrailAllowsRead();
  return archiveEssWorkflowDefinitions(db, tenantId, id);
}


/** Safe by ID: tenant + not soft-deleted. */
export async function getEssWorkflowStepsByIdSafe(
  db: Database,
  tenantId: (typeof essWorkflowSteps.$inferSelect)["tenantId"],
  id: (typeof essWorkflowSteps.$inferSelect)["id"],
) {
  const rows = await db
    .select()
    .from(essWorkflowSteps)
    .where(
      and(
        eq(essWorkflowSteps.tenantId, tenantId),
        eq(essWorkflowSteps.id, id),
        isNull(essWorkflowSteps.deletedAt),
      ),
    )
    .limit(1);
  return rows[0] ?? null;
}

/** Same as getEssWorkflowStepsByIdSafe; asserts graph-validation policy when GRAPH_VALIDATION_POLICY_JSON is set. */
export async function getEssWorkflowStepsByIdSafeGuarded(
  db: Database,
  tenantId: (typeof essWorkflowSteps.$inferSelect)["tenantId"],
  id: (typeof essWorkflowSteps.$inferSelect)["id"],
) {
  await assertGraphGuardrailAllowsRead();
  return getEssWorkflowStepsByIdSafe(db, tenantId, id);
}

/** List rows for tenant excluding soft-deleted. */
export async function listEssWorkflowStepsActive(
  db: Database,
  tenantId: (typeof essWorkflowSteps.$inferSelect)["tenantId"],
) {
  return await db
    .select()
    .from(essWorkflowSteps)
    .where(and(eq(essWorkflowSteps.tenantId, tenantId), isNull(essWorkflowSteps.deletedAt)));
}

export async function listEssWorkflowStepsActiveGuarded(
  db: Database,
  tenantId: (typeof essWorkflowSteps.$inferSelect)["tenantId"],
) {
  await assertGraphGuardrailAllowsRead();
  return listEssWorkflowStepsActive(db, tenantId);
}

/** List all rows for tenant including soft-deleted. */
export async function listEssWorkflowStepsAll(
  db: Database,
  tenantId: (typeof essWorkflowSteps.$inferSelect)["tenantId"],
) {
  return await db.select().from(essWorkflowSteps).where(eq(essWorkflowSteps.tenantId, tenantId));
}

export async function listEssWorkflowStepsAllGuarded(
  db: Database,
  tenantId: (typeof essWorkflowSteps.$inferSelect)["tenantId"],
) {
  await assertGraphGuardrailAllowsRead();
  return listEssWorkflowStepsAll(db, tenantId);
}

/** Soft-archive (mechanical delete flag). */
export async function archiveEssWorkflowSteps(
  db: Database,
  tenantId: (typeof essWorkflowSteps.$inferSelect)["tenantId"],
  id: (typeof essWorkflowSteps.$inferSelect)["id"],
) {
  return await db
    .update(essWorkflowSteps)
    .set({ deletedAt: new Date() })
    .where(and(eq(essWorkflowSteps.tenantId, tenantId), eq(essWorkflowSteps.id, id)));
}

export async function archiveEssWorkflowStepsGuarded(
  db: Database,
  tenantId: (typeof essWorkflowSteps.$inferSelect)["tenantId"],
  id: (typeof essWorkflowSteps.$inferSelect)["id"],
) {
  await assertGraphGuardrailAllowsRead();
  return archiveEssWorkflowSteps(db, tenantId, id);
}

