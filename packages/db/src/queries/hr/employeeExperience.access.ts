// @generated
// Full access scaffold — tools/ci-gate/db-access-layer (emit-full).
// Human-owned reporting: use separate modules (not *.access.ts).

import { and, desc, eq, isNull } from "drizzle-orm";
import type { Database } from "../../db.js";
import {
  employeeNotifications,
  employeePreferences,
  employeeRequestHistory,
  employeeRequests,
  employeeSelfServiceProfiles,
  employeeSurveys,
  surveyResponses,
} from "../../schema/hr/employeeExperience.js";

/** By ID for tenant (no soft-delete column on table). */
export async function getEmployeeSelfServiceProfilesById(
  db: Database,
  tenantId: (typeof employeeSelfServiceProfiles.$inferSelect)["tenantId"],
  id: (typeof employeeSelfServiceProfiles.$inferSelect)["id"],
) {
  const rows = await db
    .select()
    .from(employeeSelfServiceProfiles)
    .where(and(eq(employeeSelfServiceProfiles.tenantId, tenantId), eq(employeeSelfServiceProfiles.id, id)))
    .limit(1);
  return rows[0] ?? null;
}

/** List rows for tenant. */
export async function listEmployeeSelfServiceProfiles(
  db: Database,
  tenantId: (typeof employeeSelfServiceProfiles.$inferSelect)["tenantId"],
) {
  return await db.select().from(employeeSelfServiceProfiles).where(eq(employeeSelfServiceProfiles.tenantId, tenantId));
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

/** List all rows for tenant including soft-deleted. */
export async function listEmployeeRequestsAll(
  db: Database,
  tenantId: (typeof employeeRequests.$inferSelect)["tenantId"],
) {
  return await db.select().from(employeeRequests).where(eq(employeeRequests.tenantId, tenantId));
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

/** By ID for tenant (append-only history rows). */
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

/** Status transitions for one request, newest first. */
export async function listEmployeeRequestHistoryForRequest(
  db: Database,
  tenantId: (typeof employeeRequestHistory.$inferSelect)["tenantId"],
  employeeRequestId: (typeof employeeRequestHistory.$inferSelect)["employeeRequestId"],
) {
  return await db
    .select()
    .from(employeeRequestHistory)
    .where(
      and(
        eq(employeeRequestHistory.tenantId, tenantId),
        eq(employeeRequestHistory.employeeRequestId, employeeRequestId),
      ),
    )
    .orderBy(desc(employeeRequestHistory.createdAt));
}

/** By ID for tenant (no soft-delete column on table). */
export async function getEmployeeNotificationsById(
  db: Database,
  tenantId: (typeof employeeNotifications.$inferSelect)["tenantId"],
  id: (typeof employeeNotifications.$inferSelect)["id"],
) {
  const rows = await db
    .select()
    .from(employeeNotifications)
    .where(and(eq(employeeNotifications.tenantId, tenantId), eq(employeeNotifications.id, id)))
    .limit(1);
  return rows[0] ?? null;
}

/** List rows for tenant. */
export async function listEmployeeNotifications(
  db: Database,
  tenantId: (typeof employeeNotifications.$inferSelect)["tenantId"],
) {
  return await db.select().from(employeeNotifications).where(eq(employeeNotifications.tenantId, tenantId));
}


/** By ID for tenant (no soft-delete column on table). */
export async function getEmployeePreferencesById(
  db: Database,
  tenantId: (typeof employeePreferences.$inferSelect)["tenantId"],
  id: (typeof employeePreferences.$inferSelect)["id"],
) {
  const rows = await db
    .select()
    .from(employeePreferences)
    .where(and(eq(employeePreferences.tenantId, tenantId), eq(employeePreferences.id, id)))
    .limit(1);
  return rows[0] ?? null;
}

/** List rows for tenant. */
export async function listEmployeePreferences(
  db: Database,
  tenantId: (typeof employeePreferences.$inferSelect)["tenantId"],
) {
  return await db.select().from(employeePreferences).where(eq(employeePreferences.tenantId, tenantId));
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

/** List all rows for tenant including soft-deleted. */
export async function listEmployeeSurveysAll(
  db: Database,
  tenantId: (typeof employeeSurveys.$inferSelect)["tenantId"],
) {
  return await db.select().from(employeeSurveys).where(eq(employeeSurveys.tenantId, tenantId));
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


/** By ID for tenant (no soft-delete column on table). */
export async function getSurveyResponsesById(
  db: Database,
  tenantId: (typeof surveyResponses.$inferSelect)["tenantId"],
  id: (typeof surveyResponses.$inferSelect)["id"],
) {
  const rows = await db
    .select()
    .from(surveyResponses)
    .where(and(eq(surveyResponses.tenantId, tenantId), eq(surveyResponses.id, id)))
    .limit(1);
  return rows[0] ?? null;
}

/** List rows for tenant. */
export async function listSurveyResponses(
  db: Database,
  tenantId: (typeof surveyResponses.$inferSelect)["tenantId"],
) {
  return await db.select().from(surveyResponses).where(eq(surveyResponses.tenantId, tenantId));
}

