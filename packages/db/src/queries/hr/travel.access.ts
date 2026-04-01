// @generated
// Full access scaffold — tools/ci-gate/db-access-layer (emit-full).
// Human-owned reporting: use separate modules (not *.access.ts).

import { and, eq, isNull } from "drizzle-orm";
import type { Database } from "../../drizzle/db.js";
import { assertGraphGuardrailAllowsRead } from "../_shared/graph-guardrail.js";
import {
  companyVehicles,
  travelItineraries,
  travelRequests,
  vehicleLogs,
} from "../../schema/hr/travel.js";

/** Safe by ID: tenant + not soft-deleted. */
export async function getTravelRequestsByIdSafe(
  db: Database,
  tenantId: (typeof travelRequests.$inferSelect)["tenantId"],
  id: (typeof travelRequests.$inferSelect)["id"],
) {
  const rows = await db
    .select()
    .from(travelRequests)
    .where(
      and(
        eq(travelRequests.tenantId, tenantId),
        eq(travelRequests.id, id),
        isNull(travelRequests.deletedAt),
      ),
    )
    .limit(1);
  return rows[0] ?? null;
}

/** Same as getTravelRequestsByIdSafe; asserts graph-validation policy when GRAPH_VALIDATION_POLICY_JSON is set. */
export async function getTravelRequestsByIdSafeGuarded(
  db: Database,
  tenantId: (typeof travelRequests.$inferSelect)["tenantId"],
  id: (typeof travelRequests.$inferSelect)["id"],
) {
  await assertGraphGuardrailAllowsRead();
  return getTravelRequestsByIdSafe(db, tenantId, id);
}

/** List rows for tenant excluding soft-deleted. */
export async function listTravelRequestsActive(
  db: Database,
  tenantId: (typeof travelRequests.$inferSelect)["tenantId"],
) {
  return await db
    .select()
    .from(travelRequests)
    .where(and(eq(travelRequests.tenantId, tenantId), isNull(travelRequests.deletedAt)));
}

export async function listTravelRequestsActiveGuarded(
  db: Database,
  tenantId: (typeof travelRequests.$inferSelect)["tenantId"],
) {
  await assertGraphGuardrailAllowsRead();
  return listTravelRequestsActive(db, tenantId);
}

/** List all rows for tenant including soft-deleted. */
export async function listTravelRequestsAll(
  db: Database,
  tenantId: (typeof travelRequests.$inferSelect)["tenantId"],
) {
  return await db.select().from(travelRequests).where(eq(travelRequests.tenantId, tenantId));
}

export async function listTravelRequestsAllGuarded(
  db: Database,
  tenantId: (typeof travelRequests.$inferSelect)["tenantId"],
) {
  await assertGraphGuardrailAllowsRead();
  return listTravelRequestsAll(db, tenantId);
}

/** Soft-archive (mechanical delete flag). */
export async function archiveTravelRequests(
  db: Database,
  tenantId: (typeof travelRequests.$inferSelect)["tenantId"],
  id: (typeof travelRequests.$inferSelect)["id"],
) {
  return await db
    .update(travelRequests)
    .set({ deletedAt: new Date() })
    .where(and(eq(travelRequests.tenantId, tenantId), eq(travelRequests.id, id)));
}

export async function archiveTravelRequestsGuarded(
  db: Database,
  tenantId: (typeof travelRequests.$inferSelect)["tenantId"],
  id: (typeof travelRequests.$inferSelect)["id"],
) {
  await assertGraphGuardrailAllowsRead();
  return archiveTravelRequests(db, tenantId, id);
}


/** Safe by ID: tenant + not soft-deleted. */
export async function getTravelItinerariesByIdSafe(
  db: Database,
  tenantId: (typeof travelItineraries.$inferSelect)["tenantId"],
  id: (typeof travelItineraries.$inferSelect)["id"],
) {
  const rows = await db
    .select()
    .from(travelItineraries)
    .where(
      and(
        eq(travelItineraries.tenantId, tenantId),
        eq(travelItineraries.id, id),
        isNull(travelItineraries.deletedAt),
      ),
    )
    .limit(1);
  return rows[0] ?? null;
}

/** Same as getTravelItinerariesByIdSafe; asserts graph-validation policy when GRAPH_VALIDATION_POLICY_JSON is set. */
export async function getTravelItinerariesByIdSafeGuarded(
  db: Database,
  tenantId: (typeof travelItineraries.$inferSelect)["tenantId"],
  id: (typeof travelItineraries.$inferSelect)["id"],
) {
  await assertGraphGuardrailAllowsRead();
  return getTravelItinerariesByIdSafe(db, tenantId, id);
}

/** List rows for tenant excluding soft-deleted. */
export async function listTravelItinerariesActive(
  db: Database,
  tenantId: (typeof travelItineraries.$inferSelect)["tenantId"],
) {
  return await db
    .select()
    .from(travelItineraries)
    .where(and(eq(travelItineraries.tenantId, tenantId), isNull(travelItineraries.deletedAt)));
}

export async function listTravelItinerariesActiveGuarded(
  db: Database,
  tenantId: (typeof travelItineraries.$inferSelect)["tenantId"],
) {
  await assertGraphGuardrailAllowsRead();
  return listTravelItinerariesActive(db, tenantId);
}

/** List all rows for tenant including soft-deleted. */
export async function listTravelItinerariesAll(
  db: Database,
  tenantId: (typeof travelItineraries.$inferSelect)["tenantId"],
) {
  return await db.select().from(travelItineraries).where(eq(travelItineraries.tenantId, tenantId));
}

export async function listTravelItinerariesAllGuarded(
  db: Database,
  tenantId: (typeof travelItineraries.$inferSelect)["tenantId"],
) {
  await assertGraphGuardrailAllowsRead();
  return listTravelItinerariesAll(db, tenantId);
}

/** Soft-archive (mechanical delete flag). */
export async function archiveTravelItineraries(
  db: Database,
  tenantId: (typeof travelItineraries.$inferSelect)["tenantId"],
  id: (typeof travelItineraries.$inferSelect)["id"],
) {
  return await db
    .update(travelItineraries)
    .set({ deletedAt: new Date() })
    .where(and(eq(travelItineraries.tenantId, tenantId), eq(travelItineraries.id, id)));
}

export async function archiveTravelItinerariesGuarded(
  db: Database,
  tenantId: (typeof travelItineraries.$inferSelect)["tenantId"],
  id: (typeof travelItineraries.$inferSelect)["id"],
) {
  await assertGraphGuardrailAllowsRead();
  return archiveTravelItineraries(db, tenantId, id);
}


/** Safe by ID: tenant + not soft-deleted. */
export async function getCompanyVehiclesByIdSafe(
  db: Database,
  tenantId: (typeof companyVehicles.$inferSelect)["tenantId"],
  id: (typeof companyVehicles.$inferSelect)["id"],
) {
  const rows = await db
    .select()
    .from(companyVehicles)
    .where(
      and(
        eq(companyVehicles.tenantId, tenantId),
        eq(companyVehicles.id, id),
        isNull(companyVehicles.deletedAt),
      ),
    )
    .limit(1);
  return rows[0] ?? null;
}

/** Same as getCompanyVehiclesByIdSafe; asserts graph-validation policy when GRAPH_VALIDATION_POLICY_JSON is set. */
export async function getCompanyVehiclesByIdSafeGuarded(
  db: Database,
  tenantId: (typeof companyVehicles.$inferSelect)["tenantId"],
  id: (typeof companyVehicles.$inferSelect)["id"],
) {
  await assertGraphGuardrailAllowsRead();
  return getCompanyVehiclesByIdSafe(db, tenantId, id);
}

/** List rows for tenant excluding soft-deleted. */
export async function listCompanyVehiclesActive(
  db: Database,
  tenantId: (typeof companyVehicles.$inferSelect)["tenantId"],
) {
  return await db
    .select()
    .from(companyVehicles)
    .where(and(eq(companyVehicles.tenantId, tenantId), isNull(companyVehicles.deletedAt)));
}

export async function listCompanyVehiclesActiveGuarded(
  db: Database,
  tenantId: (typeof companyVehicles.$inferSelect)["tenantId"],
) {
  await assertGraphGuardrailAllowsRead();
  return listCompanyVehiclesActive(db, tenantId);
}

/** List all rows for tenant including soft-deleted. */
export async function listCompanyVehiclesAll(
  db: Database,
  tenantId: (typeof companyVehicles.$inferSelect)["tenantId"],
) {
  return await db.select().from(companyVehicles).where(eq(companyVehicles.tenantId, tenantId));
}

export async function listCompanyVehiclesAllGuarded(
  db: Database,
  tenantId: (typeof companyVehicles.$inferSelect)["tenantId"],
) {
  await assertGraphGuardrailAllowsRead();
  return listCompanyVehiclesAll(db, tenantId);
}

/** Soft-archive (mechanical delete flag). */
export async function archiveCompanyVehicles(
  db: Database,
  tenantId: (typeof companyVehicles.$inferSelect)["tenantId"],
  id: (typeof companyVehicles.$inferSelect)["id"],
) {
  return await db
    .update(companyVehicles)
    .set({ deletedAt: new Date() })
    .where(and(eq(companyVehicles.tenantId, tenantId), eq(companyVehicles.id, id)));
}

export async function archiveCompanyVehiclesGuarded(
  db: Database,
  tenantId: (typeof companyVehicles.$inferSelect)["tenantId"],
  id: (typeof companyVehicles.$inferSelect)["id"],
) {
  await assertGraphGuardrailAllowsRead();
  return archiveCompanyVehicles(db, tenantId, id);
}


/** Safe by ID: tenant + not soft-deleted. */
export async function getVehicleLogsByIdSafe(
  db: Database,
  tenantId: (typeof vehicleLogs.$inferSelect)["tenantId"],
  id: (typeof vehicleLogs.$inferSelect)["id"],
) {
  const rows = await db
    .select()
    .from(vehicleLogs)
    .where(
      and(
        eq(vehicleLogs.tenantId, tenantId),
        eq(vehicleLogs.id, id),
        isNull(vehicleLogs.deletedAt),
      ),
    )
    .limit(1);
  return rows[0] ?? null;
}

/** Same as getVehicleLogsByIdSafe; asserts graph-validation policy when GRAPH_VALIDATION_POLICY_JSON is set. */
export async function getVehicleLogsByIdSafeGuarded(
  db: Database,
  tenantId: (typeof vehicleLogs.$inferSelect)["tenantId"],
  id: (typeof vehicleLogs.$inferSelect)["id"],
) {
  await assertGraphGuardrailAllowsRead();
  return getVehicleLogsByIdSafe(db, tenantId, id);
}

/** List rows for tenant excluding soft-deleted. */
export async function listVehicleLogsActive(
  db: Database,
  tenantId: (typeof vehicleLogs.$inferSelect)["tenantId"],
) {
  return await db
    .select()
    .from(vehicleLogs)
    .where(and(eq(vehicleLogs.tenantId, tenantId), isNull(vehicleLogs.deletedAt)));
}

export async function listVehicleLogsActiveGuarded(
  db: Database,
  tenantId: (typeof vehicleLogs.$inferSelect)["tenantId"],
) {
  await assertGraphGuardrailAllowsRead();
  return listVehicleLogsActive(db, tenantId);
}

/** List all rows for tenant including soft-deleted. */
export async function listVehicleLogsAll(
  db: Database,
  tenantId: (typeof vehicleLogs.$inferSelect)["tenantId"],
) {
  return await db.select().from(vehicleLogs).where(eq(vehicleLogs.tenantId, tenantId));
}

export async function listVehicleLogsAllGuarded(
  db: Database,
  tenantId: (typeof vehicleLogs.$inferSelect)["tenantId"],
) {
  await assertGraphGuardrailAllowsRead();
  return listVehicleLogsAll(db, tenantId);
}

/** Soft-archive (mechanical delete flag). */
export async function archiveVehicleLogs(
  db: Database,
  tenantId: (typeof vehicleLogs.$inferSelect)["tenantId"],
  id: (typeof vehicleLogs.$inferSelect)["id"],
) {
  return await db
    .update(vehicleLogs)
    .set({ deletedAt: new Date() })
    .where(and(eq(vehicleLogs.tenantId, tenantId), eq(vehicleLogs.id, id)));
}

export async function archiveVehicleLogsGuarded(
  db: Database,
  tenantId: (typeof vehicleLogs.$inferSelect)["tenantId"],
  id: (typeof vehicleLogs.$inferSelect)["id"],
) {
  await assertGraphGuardrailAllowsRead();
  return archiveVehicleLogs(db, tenantId, id);
}

