// @generated
// Full access scaffold — tools/ci-gate/db-access-layer (emit-full).
// Human-owned reporting: use separate modules (not *.access.ts).

import { and, eq, isNull } from "drizzle-orm";
import type { Database } from "../../db.js";
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

/** List all rows for tenant including soft-deleted. */
export async function listTaxExemptionCategoriesAll(
  db: Database,
  tenantId: (typeof taxExemptionCategories.$inferSelect)["tenantId"],
) {
  return await db.select().from(taxExemptionCategories).where(eq(taxExemptionCategories.tenantId, tenantId));
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

/** List all rows for tenant including soft-deleted. */
export async function listTaxExemptionSubCategoriesAll(
  db: Database,
  tenantId: (typeof taxExemptionSubCategories.$inferSelect)["tenantId"],
) {
  return await db.select().from(taxExemptionSubCategories).where(eq(taxExemptionSubCategories.tenantId, tenantId));
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

/** List all rows for tenant including soft-deleted. */
export async function listEmployeeTaxDeclarationsAll(
  db: Database,
  tenantId: (typeof employeeTaxDeclarations.$inferSelect)["tenantId"],
) {
  return await db.select().from(employeeTaxDeclarations).where(eq(employeeTaxDeclarations.tenantId, tenantId));
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

/** List all rows for tenant including soft-deleted. */
export async function listTaxDeclarationItemsAll(
  db: Database,
  tenantId: (typeof taxDeclarationItems.$inferSelect)["tenantId"],
) {
  return await db.select().from(taxDeclarationItems).where(eq(taxDeclarationItems.tenantId, tenantId));
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

/** List all rows for tenant including soft-deleted. */
export async function listTaxExemptionProofsAll(
  db: Database,
  tenantId: (typeof taxExemptionProofs.$inferSelect)["tenantId"],
) {
  return await db.select().from(taxExemptionProofs).where(eq(taxExemptionProofs.tenantId, tenantId));
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

