// @generated
// Full access scaffold — tools/ci-gate/db-access-layer (emit-full).
// Human-owned reporting: use separate modules (not *.access.ts).

import { and, eq, isNull } from "drizzle-orm";
import type { Database } from "../../db.js";
import {
  employeePolicyAcknowledgments,
  hrPolicyDocuments,
} from "../../schema/hr/policyAcknowledgments.js";

/** Safe by ID: tenant + not soft-deleted. */
export async function getHrPolicyDocumentsByIdSafe(
  db: Database,
  tenantId: (typeof hrPolicyDocuments.$inferSelect)["tenantId"],
  id: (typeof hrPolicyDocuments.$inferSelect)["id"],
) {
  const rows = await db
    .select()
    .from(hrPolicyDocuments)
    .where(
      and(
        eq(hrPolicyDocuments.tenantId, tenantId),
        eq(hrPolicyDocuments.id, id),
        isNull(hrPolicyDocuments.deletedAt),
      ),
    )
    .limit(1);
  return rows[0] ?? null;
}

/** List rows for tenant excluding soft-deleted. */
export async function listHrPolicyDocumentsActive(
  db: Database,
  tenantId: (typeof hrPolicyDocuments.$inferSelect)["tenantId"],
) {
  return await db
    .select()
    .from(hrPolicyDocuments)
    .where(and(eq(hrPolicyDocuments.tenantId, tenantId), isNull(hrPolicyDocuments.deletedAt)));
}

/** List all rows for tenant including soft-deleted. */
export async function listHrPolicyDocumentsAll(
  db: Database,
  tenantId: (typeof hrPolicyDocuments.$inferSelect)["tenantId"],
) {
  return await db.select().from(hrPolicyDocuments).where(eq(hrPolicyDocuments.tenantId, tenantId));
}

/** Soft-archive (mechanical delete flag). */
export async function archiveHrPolicyDocuments(
  db: Database,
  tenantId: (typeof hrPolicyDocuments.$inferSelect)["tenantId"],
  id: (typeof hrPolicyDocuments.$inferSelect)["id"],
) {
  return await db
    .update(hrPolicyDocuments)
    .set({ deletedAt: new Date() })
    .where(and(eq(hrPolicyDocuments.tenantId, tenantId), eq(hrPolicyDocuments.id, id)));
}


/** By ID for tenant (no soft-delete column on table). */
export async function getEmployeePolicyAcknowledgmentsById(
  db: Database,
  tenantId: (typeof employeePolicyAcknowledgments.$inferSelect)["tenantId"],
  id: (typeof employeePolicyAcknowledgments.$inferSelect)["id"],
) {
  const rows = await db
    .select()
    .from(employeePolicyAcknowledgments)
    .where(and(eq(employeePolicyAcknowledgments.tenantId, tenantId), eq(employeePolicyAcknowledgments.id, id)))
    .limit(1);
  return rows[0] ?? null;
}

/** List rows for tenant. */
export async function listEmployeePolicyAcknowledgments(
  db: Database,
  tenantId: (typeof employeePolicyAcknowledgments.$inferSelect)["tenantId"],
) {
  return await db.select().from(employeePolicyAcknowledgments).where(eq(employeePolicyAcknowledgments.tenantId, tenantId));
}

