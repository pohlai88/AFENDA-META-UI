// @generated
// Full access scaffold — tools/ci-gate/db-access-layer (emit-full).
// Human-owned reporting: use separate modules (not *.access.ts).

import { and, eq, isNull } from "drizzle-orm";
import type { Database } from "../../drizzle/db.js";
import { assertGraphGuardrailAllowsRead } from "../_shared/graph-guardrail.js";
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

/** Same as getHrPolicyDocumentsByIdSafe; asserts graph-validation policy when GRAPH_VALIDATION_POLICY_JSON is set. */
export async function getHrPolicyDocumentsByIdSafeGuarded(
  db: Database,
  tenantId: (typeof hrPolicyDocuments.$inferSelect)["tenantId"],
  id: (typeof hrPolicyDocuments.$inferSelect)["id"],
) {
  await assertGraphGuardrailAllowsRead();
  return getHrPolicyDocumentsByIdSafe(db, tenantId, id);
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

export async function listHrPolicyDocumentsActiveGuarded(
  db: Database,
  tenantId: (typeof hrPolicyDocuments.$inferSelect)["tenantId"],
) {
  await assertGraphGuardrailAllowsRead();
  return listHrPolicyDocumentsActive(db, tenantId);
}

/** List all rows for tenant including soft-deleted. */
export async function listHrPolicyDocumentsAll(
  db: Database,
  tenantId: (typeof hrPolicyDocuments.$inferSelect)["tenantId"],
) {
  return await db.select().from(hrPolicyDocuments).where(eq(hrPolicyDocuments.tenantId, tenantId));
}

export async function listHrPolicyDocumentsAllGuarded(
  db: Database,
  tenantId: (typeof hrPolicyDocuments.$inferSelect)["tenantId"],
) {
  await assertGraphGuardrailAllowsRead();
  return listHrPolicyDocumentsAll(db, tenantId);
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

export async function archiveHrPolicyDocumentsGuarded(
  db: Database,
  tenantId: (typeof hrPolicyDocuments.$inferSelect)["tenantId"],
  id: (typeof hrPolicyDocuments.$inferSelect)["id"],
) {
  await assertGraphGuardrailAllowsRead();
  return archiveHrPolicyDocuments(db, tenantId, id);
}


/** Safe by ID: tenant + not soft-deleted. */
export async function getEmployeePolicyAcknowledgmentsByIdSafe(
  db: Database,
  tenantId: (typeof employeePolicyAcknowledgments.$inferSelect)["tenantId"],
  id: (typeof employeePolicyAcknowledgments.$inferSelect)["id"],
) {
  const rows = await db
    .select()
    .from(employeePolicyAcknowledgments)
    .where(
      and(
        eq(employeePolicyAcknowledgments.tenantId, tenantId),
        eq(employeePolicyAcknowledgments.id, id),
        isNull(employeePolicyAcknowledgments.deletedAt),
      ),
    )
    .limit(1);
  return rows[0] ?? null;
}

/** Same as getEmployeePolicyAcknowledgmentsByIdSafe; asserts graph-validation policy when GRAPH_VALIDATION_POLICY_JSON is set. */
export async function getEmployeePolicyAcknowledgmentsByIdSafeGuarded(
  db: Database,
  tenantId: (typeof employeePolicyAcknowledgments.$inferSelect)["tenantId"],
  id: (typeof employeePolicyAcknowledgments.$inferSelect)["id"],
) {
  await assertGraphGuardrailAllowsRead();
  return getEmployeePolicyAcknowledgmentsByIdSafe(db, tenantId, id);
}

/** List rows for tenant excluding soft-deleted. */
export async function listEmployeePolicyAcknowledgmentsActive(
  db: Database,
  tenantId: (typeof employeePolicyAcknowledgments.$inferSelect)["tenantId"],
) {
  return await db
    .select()
    .from(employeePolicyAcknowledgments)
    .where(and(eq(employeePolicyAcknowledgments.tenantId, tenantId), isNull(employeePolicyAcknowledgments.deletedAt)));
}

export async function listEmployeePolicyAcknowledgmentsActiveGuarded(
  db: Database,
  tenantId: (typeof employeePolicyAcknowledgments.$inferSelect)["tenantId"],
) {
  await assertGraphGuardrailAllowsRead();
  return listEmployeePolicyAcknowledgmentsActive(db, tenantId);
}

/** List all rows for tenant including soft-deleted. */
export async function listEmployeePolicyAcknowledgmentsAll(
  db: Database,
  tenantId: (typeof employeePolicyAcknowledgments.$inferSelect)["tenantId"],
) {
  return await db.select().from(employeePolicyAcknowledgments).where(eq(employeePolicyAcknowledgments.tenantId, tenantId));
}

export async function listEmployeePolicyAcknowledgmentsAllGuarded(
  db: Database,
  tenantId: (typeof employeePolicyAcknowledgments.$inferSelect)["tenantId"],
) {
  await assertGraphGuardrailAllowsRead();
  return listEmployeePolicyAcknowledgmentsAll(db, tenantId);
}

/** Soft-archive (mechanical delete flag). */
export async function archiveEmployeePolicyAcknowledgments(
  db: Database,
  tenantId: (typeof employeePolicyAcknowledgments.$inferSelect)["tenantId"],
  id: (typeof employeePolicyAcknowledgments.$inferSelect)["id"],
) {
  return await db
    .update(employeePolicyAcknowledgments)
    .set({ deletedAt: new Date() })
    .where(and(eq(employeePolicyAcknowledgments.tenantId, tenantId), eq(employeePolicyAcknowledgments.id, id)));
}

export async function archiveEmployeePolicyAcknowledgmentsGuarded(
  db: Database,
  tenantId: (typeof employeePolicyAcknowledgments.$inferSelect)["tenantId"],
  id: (typeof employeePolicyAcknowledgments.$inferSelect)["id"],
) {
  await assertGraphGuardrailAllowsRead();
  return archiveEmployeePolicyAcknowledgments(db, tenantId, id);
}

