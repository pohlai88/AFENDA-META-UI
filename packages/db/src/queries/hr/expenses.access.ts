// @generated
// Full access scaffold — tools/ci-gate/db-access-layer (emit-full).
// Human-owned reporting: use separate modules (not *.access.ts).

import { and, eq, isNull } from "drizzle-orm";
import type { Database } from "../../db.js";
import {
  cashAdvances,
  expenseApprovals,
  expenseClaims,
  expensePolicies,
  expenseReports,
  hrExpenseCategories,
  hrExpenseLines,
} from "../../schema/hr/expenses.js";

/** Safe by ID: tenant + not soft-deleted. */
export async function getHrExpenseCategoriesByIdSafe(
  db: Database,
  tenantId: (typeof hrExpenseCategories.$inferSelect)["tenantId"],
  id: (typeof hrExpenseCategories.$inferSelect)["id"],
) {
  const rows = await db
    .select()
    .from(hrExpenseCategories)
    .where(
      and(
        eq(hrExpenseCategories.tenantId, tenantId),
        eq(hrExpenseCategories.id, id),
        isNull(hrExpenseCategories.deletedAt),
      ),
    )
    .limit(1);
  return rows[0] ?? null;
}

/** List rows for tenant excluding soft-deleted. */
export async function listHrExpenseCategoriesActive(
  db: Database,
  tenantId: (typeof hrExpenseCategories.$inferSelect)["tenantId"],
) {
  return await db
    .select()
    .from(hrExpenseCategories)
    .where(and(eq(hrExpenseCategories.tenantId, tenantId), isNull(hrExpenseCategories.deletedAt)));
}

/** List all rows for tenant including soft-deleted. */
export async function listHrExpenseCategoriesAll(
  db: Database,
  tenantId: (typeof hrExpenseCategories.$inferSelect)["tenantId"],
) {
  return await db.select().from(hrExpenseCategories).where(eq(hrExpenseCategories.tenantId, tenantId));
}

/** Soft-archive (mechanical delete flag). */
export async function archiveHrExpenseCategories(
  db: Database,
  tenantId: (typeof hrExpenseCategories.$inferSelect)["tenantId"],
  id: (typeof hrExpenseCategories.$inferSelect)["id"],
) {
  return await db
    .update(hrExpenseCategories)
    .set({ deletedAt: new Date() })
    .where(and(eq(hrExpenseCategories.tenantId, tenantId), eq(hrExpenseCategories.id, id)));
}


/** Safe by ID: tenant + not soft-deleted. */
export async function getExpensePoliciesByIdSafe(
  db: Database,
  tenantId: (typeof expensePolicies.$inferSelect)["tenantId"],
  id: (typeof expensePolicies.$inferSelect)["id"],
) {
  const rows = await db
    .select()
    .from(expensePolicies)
    .where(
      and(
        eq(expensePolicies.tenantId, tenantId),
        eq(expensePolicies.id, id),
        isNull(expensePolicies.deletedAt),
      ),
    )
    .limit(1);
  return rows[0] ?? null;
}

/** List rows for tenant excluding soft-deleted. */
export async function listExpensePoliciesActive(
  db: Database,
  tenantId: (typeof expensePolicies.$inferSelect)["tenantId"],
) {
  return await db
    .select()
    .from(expensePolicies)
    .where(and(eq(expensePolicies.tenantId, tenantId), isNull(expensePolicies.deletedAt)));
}

/** List all rows for tenant including soft-deleted. */
export async function listExpensePoliciesAll(
  db: Database,
  tenantId: (typeof expensePolicies.$inferSelect)["tenantId"],
) {
  return await db.select().from(expensePolicies).where(eq(expensePolicies.tenantId, tenantId));
}

/** Soft-archive (mechanical delete flag). */
export async function archiveExpensePolicies(
  db: Database,
  tenantId: (typeof expensePolicies.$inferSelect)["tenantId"],
  id: (typeof expensePolicies.$inferSelect)["id"],
) {
  return await db
    .update(expensePolicies)
    .set({ deletedAt: new Date() })
    .where(and(eq(expensePolicies.tenantId, tenantId), eq(expensePolicies.id, id)));
}


/** Safe by ID: tenant + not soft-deleted. */
export async function getExpenseClaimsByIdSafe(
  db: Database,
  tenantId: (typeof expenseClaims.$inferSelect)["tenantId"],
  id: (typeof expenseClaims.$inferSelect)["id"],
) {
  const rows = await db
    .select()
    .from(expenseClaims)
    .where(
      and(
        eq(expenseClaims.tenantId, tenantId),
        eq(expenseClaims.id, id),
        isNull(expenseClaims.deletedAt),
      ),
    )
    .limit(1);
  return rows[0] ?? null;
}

/** List rows for tenant excluding soft-deleted. */
export async function listExpenseClaimsActive(
  db: Database,
  tenantId: (typeof expenseClaims.$inferSelect)["tenantId"],
) {
  return await db
    .select()
    .from(expenseClaims)
    .where(and(eq(expenseClaims.tenantId, tenantId), isNull(expenseClaims.deletedAt)));
}

/** List all rows for tenant including soft-deleted. */
export async function listExpenseClaimsAll(
  db: Database,
  tenantId: (typeof expenseClaims.$inferSelect)["tenantId"],
) {
  return await db.select().from(expenseClaims).where(eq(expenseClaims.tenantId, tenantId));
}

/** Soft-archive (mechanical delete flag). */
export async function archiveExpenseClaims(
  db: Database,
  tenantId: (typeof expenseClaims.$inferSelect)["tenantId"],
  id: (typeof expenseClaims.$inferSelect)["id"],
) {
  return await db
    .update(expenseClaims)
    .set({ deletedAt: new Date() })
    .where(and(eq(expenseClaims.tenantId, tenantId), eq(expenseClaims.id, id)));
}


/** Safe by ID: tenant + not soft-deleted. */
export async function getExpenseReportsByIdSafe(
  db: Database,
  tenantId: (typeof expenseReports.$inferSelect)["tenantId"],
  id: (typeof expenseReports.$inferSelect)["id"],
) {
  const rows = await db
    .select()
    .from(expenseReports)
    .where(
      and(
        eq(expenseReports.tenantId, tenantId),
        eq(expenseReports.id, id),
        isNull(expenseReports.deletedAt),
      ),
    )
    .limit(1);
  return rows[0] ?? null;
}

/** List rows for tenant excluding soft-deleted. */
export async function listExpenseReportsActive(
  db: Database,
  tenantId: (typeof expenseReports.$inferSelect)["tenantId"],
) {
  return await db
    .select()
    .from(expenseReports)
    .where(and(eq(expenseReports.tenantId, tenantId), isNull(expenseReports.deletedAt)));
}

/** List all rows for tenant including soft-deleted. */
export async function listExpenseReportsAll(
  db: Database,
  tenantId: (typeof expenseReports.$inferSelect)["tenantId"],
) {
  return await db.select().from(expenseReports).where(eq(expenseReports.tenantId, tenantId));
}

/** Soft-archive (mechanical delete flag). */
export async function archiveExpenseReports(
  db: Database,
  tenantId: (typeof expenseReports.$inferSelect)["tenantId"],
  id: (typeof expenseReports.$inferSelect)["id"],
) {
  return await db
    .update(expenseReports)
    .set({ deletedAt: new Date() })
    .where(and(eq(expenseReports.tenantId, tenantId), eq(expenseReports.id, id)));
}


/** Safe by ID: tenant + not soft-deleted. */
export async function getCashAdvancesByIdSafe(
  db: Database,
  tenantId: (typeof cashAdvances.$inferSelect)["tenantId"],
  id: (typeof cashAdvances.$inferSelect)["id"],
) {
  const rows = await db
    .select()
    .from(cashAdvances)
    .where(
      and(
        eq(cashAdvances.tenantId, tenantId),
        eq(cashAdvances.id, id),
        isNull(cashAdvances.deletedAt),
      ),
    )
    .limit(1);
  return rows[0] ?? null;
}

/** List rows for tenant excluding soft-deleted. */
export async function listCashAdvancesActive(
  db: Database,
  tenantId: (typeof cashAdvances.$inferSelect)["tenantId"],
) {
  return await db
    .select()
    .from(cashAdvances)
    .where(and(eq(cashAdvances.tenantId, tenantId), isNull(cashAdvances.deletedAt)));
}

/** List all rows for tenant including soft-deleted. */
export async function listCashAdvancesAll(
  db: Database,
  tenantId: (typeof cashAdvances.$inferSelect)["tenantId"],
) {
  return await db.select().from(cashAdvances).where(eq(cashAdvances.tenantId, tenantId));
}

/** Soft-archive (mechanical delete flag). */
export async function archiveCashAdvances(
  db: Database,
  tenantId: (typeof cashAdvances.$inferSelect)["tenantId"],
  id: (typeof cashAdvances.$inferSelect)["id"],
) {
  return await db
    .update(cashAdvances)
    .set({ deletedAt: new Date() })
    .where(and(eq(cashAdvances.tenantId, tenantId), eq(cashAdvances.id, id)));
}


/** Safe by ID: tenant + not soft-deleted. */
export async function getHrExpenseLinesByIdSafe(
  db: Database,
  tenantId: (typeof hrExpenseLines.$inferSelect)["tenantId"],
  id: (typeof hrExpenseLines.$inferSelect)["id"],
) {
  const rows = await db
    .select()
    .from(hrExpenseLines)
    .where(
      and(
        eq(hrExpenseLines.tenantId, tenantId),
        eq(hrExpenseLines.id, id),
        isNull(hrExpenseLines.deletedAt),
      ),
    )
    .limit(1);
  return rows[0] ?? null;
}

/** List rows for tenant excluding soft-deleted. */
export async function listHrExpenseLinesActive(
  db: Database,
  tenantId: (typeof hrExpenseLines.$inferSelect)["tenantId"],
) {
  return await db
    .select()
    .from(hrExpenseLines)
    .where(and(eq(hrExpenseLines.tenantId, tenantId), isNull(hrExpenseLines.deletedAt)));
}

/** List all rows for tenant including soft-deleted. */
export async function listHrExpenseLinesAll(
  db: Database,
  tenantId: (typeof hrExpenseLines.$inferSelect)["tenantId"],
) {
  return await db.select().from(hrExpenseLines).where(eq(hrExpenseLines.tenantId, tenantId));
}

/** Soft-archive (mechanical delete flag). */
export async function archiveHrExpenseLines(
  db: Database,
  tenantId: (typeof hrExpenseLines.$inferSelect)["tenantId"],
  id: (typeof hrExpenseLines.$inferSelect)["id"],
) {
  return await db
    .update(hrExpenseLines)
    .set({ deletedAt: new Date() })
    .where(and(eq(hrExpenseLines.tenantId, tenantId), eq(hrExpenseLines.id, id)));
}


/** Safe by ID: tenant + not soft-deleted. */
export async function getExpenseApprovalsByIdSafe(
  db: Database,
  tenantId: (typeof expenseApprovals.$inferSelect)["tenantId"],
  id: (typeof expenseApprovals.$inferSelect)["id"],
) {
  const rows = await db
    .select()
    .from(expenseApprovals)
    .where(
      and(
        eq(expenseApprovals.tenantId, tenantId),
        eq(expenseApprovals.id, id),
        isNull(expenseApprovals.deletedAt),
      ),
    )
    .limit(1);
  return rows[0] ?? null;
}

/** List rows for tenant excluding soft-deleted. */
export async function listExpenseApprovalsActive(
  db: Database,
  tenantId: (typeof expenseApprovals.$inferSelect)["tenantId"],
) {
  return await db
    .select()
    .from(expenseApprovals)
    .where(and(eq(expenseApprovals.tenantId, tenantId), isNull(expenseApprovals.deletedAt)));
}

/** List all rows for tenant including soft-deleted. */
export async function listExpenseApprovalsAll(
  db: Database,
  tenantId: (typeof expenseApprovals.$inferSelect)["tenantId"],
) {
  return await db.select().from(expenseApprovals).where(eq(expenseApprovals.tenantId, tenantId));
}

/** Soft-archive (mechanical delete flag). */
export async function archiveExpenseApprovals(
  db: Database,
  tenantId: (typeof expenseApprovals.$inferSelect)["tenantId"],
  id: (typeof expenseApprovals.$inferSelect)["id"],
) {
  return await db
    .update(expenseApprovals)
    .set({ deletedAt: new Date() })
    .where(and(eq(expenseApprovals.tenantId, tenantId), eq(expenseApprovals.id, id)));
}

