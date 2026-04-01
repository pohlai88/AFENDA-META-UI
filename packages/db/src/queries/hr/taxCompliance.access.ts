// @generated
// Full access scaffold — tools/ci-gate/db-access-layer (emit-full).
// Human-owned reporting: use separate modules (not *.access.ts).

import { and, eq, isNull } from "drizzle-orm";
import type { Database } from "../../drizzle/db.js";
import { assertGraphGuardrailAllowsRead } from "../_shared/graph-guardrail.js";
import {
  employeeTaxDeclarations,
  taxDeclarationItems,
  taxExemptionCategories,
  taxExemptionProofs,
  taxExemptionSubCategories,
} from "../../schema/hr/taxCompliance.js";

/** Safe by ID: tenant + not soft-deleted. */
export async function getTaxExemptionCategoriesByIdSafe(
  db: Database,
  tenantId: (typeof taxExemptionCategories.$inferSelect)["tenantId"],
  id: (typeof taxExemptionCategories.$inferSelect)["id"],
) {
  const rows = await db
    .select()
    .from(taxExemptionCategories)
    .where(
      and(
        eq(taxExemptionCategories.tenantId, tenantId),
        eq(taxExemptionCategories.id, id),
        isNull(taxExemptionCategories.deletedAt),
      ),
    )
    .limit(1);
  return rows[0] ?? null;
}

/** Same as getTaxExemptionCategoriesByIdSafe; asserts graph-validation policy when GRAPH_VALIDATION_POLICY_JSON is set. */
export async function getTaxExemptionCategoriesByIdSafeGuarded(
  db: Database,
  tenantId: (typeof taxExemptionCategories.$inferSelect)["tenantId"],
  id: (typeof taxExemptionCategories.$inferSelect)["id"],
) {
  await assertGraphGuardrailAllowsRead();
  return getTaxExemptionCategoriesByIdSafe(db, tenantId, id);
}

/** List rows for tenant excluding soft-deleted. */
export async function listTaxExemptionCategoriesActive(
  db: Database,
  tenantId: (typeof taxExemptionCategories.$inferSelect)["tenantId"],
) {
  return await db
    .select()
    .from(taxExemptionCategories)
    .where(and(eq(taxExemptionCategories.tenantId, tenantId), isNull(taxExemptionCategories.deletedAt)));
}

export async function listTaxExemptionCategoriesActiveGuarded(
  db: Database,
  tenantId: (typeof taxExemptionCategories.$inferSelect)["tenantId"],
) {
  await assertGraphGuardrailAllowsRead();
  return listTaxExemptionCategoriesActive(db, tenantId);
}

/** List all rows for tenant including soft-deleted. */
export async function listTaxExemptionCategoriesAll(
  db: Database,
  tenantId: (typeof taxExemptionCategories.$inferSelect)["tenantId"],
) {
  return await db.select().from(taxExemptionCategories).where(eq(taxExemptionCategories.tenantId, tenantId));
}

export async function listTaxExemptionCategoriesAllGuarded(
  db: Database,
  tenantId: (typeof taxExemptionCategories.$inferSelect)["tenantId"],
) {
  await assertGraphGuardrailAllowsRead();
  return listTaxExemptionCategoriesAll(db, tenantId);
}

/** Soft-archive (mechanical delete flag). */
export async function archiveTaxExemptionCategories(
  db: Database,
  tenantId: (typeof taxExemptionCategories.$inferSelect)["tenantId"],
  id: (typeof taxExemptionCategories.$inferSelect)["id"],
) {
  return await db
    .update(taxExemptionCategories)
    .set({ deletedAt: new Date() })
    .where(and(eq(taxExemptionCategories.tenantId, tenantId), eq(taxExemptionCategories.id, id)));
}

export async function archiveTaxExemptionCategoriesGuarded(
  db: Database,
  tenantId: (typeof taxExemptionCategories.$inferSelect)["tenantId"],
  id: (typeof taxExemptionCategories.$inferSelect)["id"],
) {
  await assertGraphGuardrailAllowsRead();
  return archiveTaxExemptionCategories(db, tenantId, id);
}


/** Safe by ID: tenant + not soft-deleted. */
export async function getTaxExemptionSubCategoriesByIdSafe(
  db: Database,
  tenantId: (typeof taxExemptionSubCategories.$inferSelect)["tenantId"],
  id: (typeof taxExemptionSubCategories.$inferSelect)["id"],
) {
  const rows = await db
    .select()
    .from(taxExemptionSubCategories)
    .where(
      and(
        eq(taxExemptionSubCategories.tenantId, tenantId),
        eq(taxExemptionSubCategories.id, id),
        isNull(taxExemptionSubCategories.deletedAt),
      ),
    )
    .limit(1);
  return rows[0] ?? null;
}

/** Same as getTaxExemptionSubCategoriesByIdSafe; asserts graph-validation policy when GRAPH_VALIDATION_POLICY_JSON is set. */
export async function getTaxExemptionSubCategoriesByIdSafeGuarded(
  db: Database,
  tenantId: (typeof taxExemptionSubCategories.$inferSelect)["tenantId"],
  id: (typeof taxExemptionSubCategories.$inferSelect)["id"],
) {
  await assertGraphGuardrailAllowsRead();
  return getTaxExemptionSubCategoriesByIdSafe(db, tenantId, id);
}

/** List rows for tenant excluding soft-deleted. */
export async function listTaxExemptionSubCategoriesActive(
  db: Database,
  tenantId: (typeof taxExemptionSubCategories.$inferSelect)["tenantId"],
) {
  return await db
    .select()
    .from(taxExemptionSubCategories)
    .where(and(eq(taxExemptionSubCategories.tenantId, tenantId), isNull(taxExemptionSubCategories.deletedAt)));
}

export async function listTaxExemptionSubCategoriesActiveGuarded(
  db: Database,
  tenantId: (typeof taxExemptionSubCategories.$inferSelect)["tenantId"],
) {
  await assertGraphGuardrailAllowsRead();
  return listTaxExemptionSubCategoriesActive(db, tenantId);
}

/** List all rows for tenant including soft-deleted. */
export async function listTaxExemptionSubCategoriesAll(
  db: Database,
  tenantId: (typeof taxExemptionSubCategories.$inferSelect)["tenantId"],
) {
  return await db.select().from(taxExemptionSubCategories).where(eq(taxExemptionSubCategories.tenantId, tenantId));
}

export async function listTaxExemptionSubCategoriesAllGuarded(
  db: Database,
  tenantId: (typeof taxExemptionSubCategories.$inferSelect)["tenantId"],
) {
  await assertGraphGuardrailAllowsRead();
  return listTaxExemptionSubCategoriesAll(db, tenantId);
}

/** Soft-archive (mechanical delete flag). */
export async function archiveTaxExemptionSubCategories(
  db: Database,
  tenantId: (typeof taxExemptionSubCategories.$inferSelect)["tenantId"],
  id: (typeof taxExemptionSubCategories.$inferSelect)["id"],
) {
  return await db
    .update(taxExemptionSubCategories)
    .set({ deletedAt: new Date() })
    .where(and(eq(taxExemptionSubCategories.tenantId, tenantId), eq(taxExemptionSubCategories.id, id)));
}

export async function archiveTaxExemptionSubCategoriesGuarded(
  db: Database,
  tenantId: (typeof taxExemptionSubCategories.$inferSelect)["tenantId"],
  id: (typeof taxExemptionSubCategories.$inferSelect)["id"],
) {
  await assertGraphGuardrailAllowsRead();
  return archiveTaxExemptionSubCategories(db, tenantId, id);
}


/** Safe by ID: tenant + not soft-deleted. */
export async function getEmployeeTaxDeclarationsByIdSafe(
  db: Database,
  tenantId: (typeof employeeTaxDeclarations.$inferSelect)["tenantId"],
  id: (typeof employeeTaxDeclarations.$inferSelect)["id"],
) {
  const rows = await db
    .select()
    .from(employeeTaxDeclarations)
    .where(
      and(
        eq(employeeTaxDeclarations.tenantId, tenantId),
        eq(employeeTaxDeclarations.id, id),
        isNull(employeeTaxDeclarations.deletedAt),
      ),
    )
    .limit(1);
  return rows[0] ?? null;
}

/** Same as getEmployeeTaxDeclarationsByIdSafe; asserts graph-validation policy when GRAPH_VALIDATION_POLICY_JSON is set. */
export async function getEmployeeTaxDeclarationsByIdSafeGuarded(
  db: Database,
  tenantId: (typeof employeeTaxDeclarations.$inferSelect)["tenantId"],
  id: (typeof employeeTaxDeclarations.$inferSelect)["id"],
) {
  await assertGraphGuardrailAllowsRead();
  return getEmployeeTaxDeclarationsByIdSafe(db, tenantId, id);
}

/** List rows for tenant excluding soft-deleted. */
export async function listEmployeeTaxDeclarationsActive(
  db: Database,
  tenantId: (typeof employeeTaxDeclarations.$inferSelect)["tenantId"],
) {
  return await db
    .select()
    .from(employeeTaxDeclarations)
    .where(and(eq(employeeTaxDeclarations.tenantId, tenantId), isNull(employeeTaxDeclarations.deletedAt)));
}

export async function listEmployeeTaxDeclarationsActiveGuarded(
  db: Database,
  tenantId: (typeof employeeTaxDeclarations.$inferSelect)["tenantId"],
) {
  await assertGraphGuardrailAllowsRead();
  return listEmployeeTaxDeclarationsActive(db, tenantId);
}

/** List all rows for tenant including soft-deleted. */
export async function listEmployeeTaxDeclarationsAll(
  db: Database,
  tenantId: (typeof employeeTaxDeclarations.$inferSelect)["tenantId"],
) {
  return await db.select().from(employeeTaxDeclarations).where(eq(employeeTaxDeclarations.tenantId, tenantId));
}

export async function listEmployeeTaxDeclarationsAllGuarded(
  db: Database,
  tenantId: (typeof employeeTaxDeclarations.$inferSelect)["tenantId"],
) {
  await assertGraphGuardrailAllowsRead();
  return listEmployeeTaxDeclarationsAll(db, tenantId);
}

/** Soft-archive (mechanical delete flag). */
export async function archiveEmployeeTaxDeclarations(
  db: Database,
  tenantId: (typeof employeeTaxDeclarations.$inferSelect)["tenantId"],
  id: (typeof employeeTaxDeclarations.$inferSelect)["id"],
) {
  return await db
    .update(employeeTaxDeclarations)
    .set({ deletedAt: new Date() })
    .where(and(eq(employeeTaxDeclarations.tenantId, tenantId), eq(employeeTaxDeclarations.id, id)));
}

export async function archiveEmployeeTaxDeclarationsGuarded(
  db: Database,
  tenantId: (typeof employeeTaxDeclarations.$inferSelect)["tenantId"],
  id: (typeof employeeTaxDeclarations.$inferSelect)["id"],
) {
  await assertGraphGuardrailAllowsRead();
  return archiveEmployeeTaxDeclarations(db, tenantId, id);
}


/** Safe by ID: tenant + not soft-deleted. */
export async function getTaxDeclarationItemsByIdSafe(
  db: Database,
  tenantId: (typeof taxDeclarationItems.$inferSelect)["tenantId"],
  id: (typeof taxDeclarationItems.$inferSelect)["id"],
) {
  const rows = await db
    .select()
    .from(taxDeclarationItems)
    .where(
      and(
        eq(taxDeclarationItems.tenantId, tenantId),
        eq(taxDeclarationItems.id, id),
        isNull(taxDeclarationItems.deletedAt),
      ),
    )
    .limit(1);
  return rows[0] ?? null;
}

/** Same as getTaxDeclarationItemsByIdSafe; asserts graph-validation policy when GRAPH_VALIDATION_POLICY_JSON is set. */
export async function getTaxDeclarationItemsByIdSafeGuarded(
  db: Database,
  tenantId: (typeof taxDeclarationItems.$inferSelect)["tenantId"],
  id: (typeof taxDeclarationItems.$inferSelect)["id"],
) {
  await assertGraphGuardrailAllowsRead();
  return getTaxDeclarationItemsByIdSafe(db, tenantId, id);
}

/** List rows for tenant excluding soft-deleted. */
export async function listTaxDeclarationItemsActive(
  db: Database,
  tenantId: (typeof taxDeclarationItems.$inferSelect)["tenantId"],
) {
  return await db
    .select()
    .from(taxDeclarationItems)
    .where(and(eq(taxDeclarationItems.tenantId, tenantId), isNull(taxDeclarationItems.deletedAt)));
}

export async function listTaxDeclarationItemsActiveGuarded(
  db: Database,
  tenantId: (typeof taxDeclarationItems.$inferSelect)["tenantId"],
) {
  await assertGraphGuardrailAllowsRead();
  return listTaxDeclarationItemsActive(db, tenantId);
}

/** List all rows for tenant including soft-deleted. */
export async function listTaxDeclarationItemsAll(
  db: Database,
  tenantId: (typeof taxDeclarationItems.$inferSelect)["tenantId"],
) {
  return await db.select().from(taxDeclarationItems).where(eq(taxDeclarationItems.tenantId, tenantId));
}

export async function listTaxDeclarationItemsAllGuarded(
  db: Database,
  tenantId: (typeof taxDeclarationItems.$inferSelect)["tenantId"],
) {
  await assertGraphGuardrailAllowsRead();
  return listTaxDeclarationItemsAll(db, tenantId);
}

/** Soft-archive (mechanical delete flag). */
export async function archiveTaxDeclarationItems(
  db: Database,
  tenantId: (typeof taxDeclarationItems.$inferSelect)["tenantId"],
  id: (typeof taxDeclarationItems.$inferSelect)["id"],
) {
  return await db
    .update(taxDeclarationItems)
    .set({ deletedAt: new Date() })
    .where(and(eq(taxDeclarationItems.tenantId, tenantId), eq(taxDeclarationItems.id, id)));
}

export async function archiveTaxDeclarationItemsGuarded(
  db: Database,
  tenantId: (typeof taxDeclarationItems.$inferSelect)["tenantId"],
  id: (typeof taxDeclarationItems.$inferSelect)["id"],
) {
  await assertGraphGuardrailAllowsRead();
  return archiveTaxDeclarationItems(db, tenantId, id);
}


/** Safe by ID: tenant + not soft-deleted. */
export async function getTaxExemptionProofsByIdSafe(
  db: Database,
  tenantId: (typeof taxExemptionProofs.$inferSelect)["tenantId"],
  id: (typeof taxExemptionProofs.$inferSelect)["id"],
) {
  const rows = await db
    .select()
    .from(taxExemptionProofs)
    .where(
      and(
        eq(taxExemptionProofs.tenantId, tenantId),
        eq(taxExemptionProofs.id, id),
        isNull(taxExemptionProofs.deletedAt),
      ),
    )
    .limit(1);
  return rows[0] ?? null;
}

/** Same as getTaxExemptionProofsByIdSafe; asserts graph-validation policy when GRAPH_VALIDATION_POLICY_JSON is set. */
export async function getTaxExemptionProofsByIdSafeGuarded(
  db: Database,
  tenantId: (typeof taxExemptionProofs.$inferSelect)["tenantId"],
  id: (typeof taxExemptionProofs.$inferSelect)["id"],
) {
  await assertGraphGuardrailAllowsRead();
  return getTaxExemptionProofsByIdSafe(db, tenantId, id);
}

/** List rows for tenant excluding soft-deleted. */
export async function listTaxExemptionProofsActive(
  db: Database,
  tenantId: (typeof taxExemptionProofs.$inferSelect)["tenantId"],
) {
  return await db
    .select()
    .from(taxExemptionProofs)
    .where(and(eq(taxExemptionProofs.tenantId, tenantId), isNull(taxExemptionProofs.deletedAt)));
}

export async function listTaxExemptionProofsActiveGuarded(
  db: Database,
  tenantId: (typeof taxExemptionProofs.$inferSelect)["tenantId"],
) {
  await assertGraphGuardrailAllowsRead();
  return listTaxExemptionProofsActive(db, tenantId);
}

/** List all rows for tenant including soft-deleted. */
export async function listTaxExemptionProofsAll(
  db: Database,
  tenantId: (typeof taxExemptionProofs.$inferSelect)["tenantId"],
) {
  return await db.select().from(taxExemptionProofs).where(eq(taxExemptionProofs.tenantId, tenantId));
}

export async function listTaxExemptionProofsAllGuarded(
  db: Database,
  tenantId: (typeof taxExemptionProofs.$inferSelect)["tenantId"],
) {
  await assertGraphGuardrailAllowsRead();
  return listTaxExemptionProofsAll(db, tenantId);
}

/** Soft-archive (mechanical delete flag). */
export async function archiveTaxExemptionProofs(
  db: Database,
  tenantId: (typeof taxExemptionProofs.$inferSelect)["tenantId"],
  id: (typeof taxExemptionProofs.$inferSelect)["id"],
) {
  return await db
    .update(taxExemptionProofs)
    .set({ deletedAt: new Date() })
    .where(and(eq(taxExemptionProofs.tenantId, tenantId), eq(taxExemptionProofs.id, id)));
}

export async function archiveTaxExemptionProofsGuarded(
  db: Database,
  tenantId: (typeof taxExemptionProofs.$inferSelect)["tenantId"],
  id: (typeof taxExemptionProofs.$inferSelect)["id"],
) {
  await assertGraphGuardrailAllowsRead();
  return archiveTaxExemptionProofs(db, tenantId, id);
}

