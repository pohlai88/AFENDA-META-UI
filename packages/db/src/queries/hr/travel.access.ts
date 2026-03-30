// @generated
// Full access scaffold — tools/ci-gate/db-access-layer (emit-full).
// Human-owned reporting: use separate modules (not *.access.ts).

import { and, eq, isNull } from "drizzle-orm";
import type { Database } from "../../db.js";
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

/** List all rows for tenant including soft-deleted. */
export async function listTravelRequestsAll(
  db: Database,
  tenantId: (typeof travelRequests.$inferSelect)["tenantId"],
) {
  return await db.select().from(travelRequests).where(eq(travelRequests.tenantId, tenantId));
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

/** List all rows for tenant including soft-deleted. */
export async function listTravelItinerariesAll(
  db: Database,
  tenantId: (typeof travelItineraries.$inferSelect)["tenantId"],
) {
  return await db.select().from(travelItineraries).where(eq(travelItineraries.tenantId, tenantId));
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

/** List all rows for tenant including soft-deleted. */
export async function listCompanyVehiclesAll(
  db: Database,
  tenantId: (typeof companyVehicles.$inferSelect)["tenantId"],
) {
  return await db.select().from(companyVehicles).where(eq(companyVehicles.tenantId, tenantId));
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

/** List all rows for tenant including soft-deleted. */
export async function listVehicleLogsAll(
  db: Database,
  tenantId: (typeof vehicleLogs.$inferSelect)["tenantId"],
) {
  return await db.select().from(vehicleLogs).where(eq(vehicleLogs.tenantId, tenantId));
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

