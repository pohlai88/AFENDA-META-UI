// @generated
// Full access scaffold — tools/ci-gate/db-access-layer (emit-full).
// Human-owned reporting: use separate modules (not *.access.ts).

import { and, eq, isNull } from "drizzle-orm";
import type { Database } from "../../drizzle/db.js";
import { assertGraphGuardrailAllowsRead } from "../_shared/graph-guardrail.js";
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

/** Same as getHrExpenseCategoriesByIdSafe; asserts graph-validation policy when GRAPH_VALIDATION_POLICY_JSON is set. */
export async function getHrExpenseCategoriesByIdSafeGuarded(
  db: Database,
  tenantId: (typeof hrExpenseCategories.$inferSelect)["tenantId"],
  id: (typeof hrExpenseCategories.$inferSelect)["id"],
) {
  await assertGraphGuardrailAllowsRead();
  return getHrExpenseCategoriesByIdSafe(db, tenantId, id);
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

export async function listHrExpenseCategoriesActiveGuarded(
  db: Database,
  tenantId: (typeof hrExpenseCategories.$inferSelect)["tenantId"],
) {
  await assertGraphGuardrailAllowsRead();
  return listHrExpenseCategoriesActive(db, tenantId);
}

/** List all rows for tenant including soft-deleted. */
export async function listHrExpenseCategoriesAll(
  db: Database,
  tenantId: (typeof hrExpenseCategories.$inferSelect)["tenantId"],
) {
  return await db.select().from(hrExpenseCategories).where(eq(hrExpenseCategories.tenantId, tenantId));
}

export async function listHrExpenseCategoriesAllGuarded(
  db: Database,
  tenantId: (typeof hrExpenseCategories.$inferSelect)["tenantId"],
) {
  await assertGraphGuardrailAllowsRead();
  return listHrExpenseCategoriesAll(db, tenantId);
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

export async function archiveHrExpenseCategoriesGuarded(
  db: Database,
  tenantId: (typeof hrExpenseCategories.$inferSelect)["tenantId"],
  id: (typeof hrExpenseCategories.$inferSelect)["id"],
) {
  await assertGraphGuardrailAllowsRead();
  return archiveHrExpenseCategories(db, tenantId, id);
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

/** Same as getExpensePoliciesByIdSafe; asserts graph-validation policy when GRAPH_VALIDATION_POLICY_JSON is set. */
export async function getExpensePoliciesByIdSafeGuarded(
  db: Database,
  tenantId: (typeof expensePolicies.$inferSelect)["tenantId"],
  id: (typeof expensePolicies.$inferSelect)["id"],
) {
  await assertGraphGuardrailAllowsRead();
  return getExpensePoliciesByIdSafe(db, tenantId, id);
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

export async function listExpensePoliciesActiveGuarded(
  db: Database,
  tenantId: (typeof expensePolicies.$inferSelect)["tenantId"],
) {
  await assertGraphGuardrailAllowsRead();
  return listExpensePoliciesActive(db, tenantId);
}

/** List all rows for tenant including soft-deleted. */
export async function listExpensePoliciesAll(
  db: Database,
  tenantId: (typeof expensePolicies.$inferSelect)["tenantId"],
) {
  return await db.select().from(expensePolicies).where(eq(expensePolicies.tenantId, tenantId));
}

export async function listExpensePoliciesAllGuarded(
  db: Database,
  tenantId: (typeof expensePolicies.$inferSelect)["tenantId"],
) {
  await assertGraphGuardrailAllowsRead();
  return listExpensePoliciesAll(db, tenantId);
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

export async function archiveExpensePoliciesGuarded(
  db: Database,
  tenantId: (typeof expensePolicies.$inferSelect)["tenantId"],
  id: (typeof expensePolicies.$inferSelect)["id"],
) {
  await assertGraphGuardrailAllowsRead();
  return archiveExpensePolicies(db, tenantId, id);
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

/** Same as getExpenseClaimsByIdSafe; asserts graph-validation policy when GRAPH_VALIDATION_POLICY_JSON is set. */
export async function getExpenseClaimsByIdSafeGuarded(
  db: Database,
  tenantId: (typeof expenseClaims.$inferSelect)["tenantId"],
  id: (typeof expenseClaims.$inferSelect)["id"],
) {
  await assertGraphGuardrailAllowsRead();
  return getExpenseClaimsByIdSafe(db, tenantId, id);
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

export async function listExpenseClaimsActiveGuarded(
  db: Database,
  tenantId: (typeof expenseClaims.$inferSelect)["tenantId"],
) {
  await assertGraphGuardrailAllowsRead();
  return listExpenseClaimsActive(db, tenantId);
}

/** List all rows for tenant including soft-deleted. */
export async function listExpenseClaimsAll(
  db: Database,
  tenantId: (typeof expenseClaims.$inferSelect)["tenantId"],
) {
  return await db.select().from(expenseClaims).where(eq(expenseClaims.tenantId, tenantId));
}

export async function listExpenseClaimsAllGuarded(
  db: Database,
  tenantId: (typeof expenseClaims.$inferSelect)["tenantId"],
) {
  await assertGraphGuardrailAllowsRead();
  return listExpenseClaimsAll(db, tenantId);
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

export async function archiveExpenseClaimsGuarded(
  db: Database,
  tenantId: (typeof expenseClaims.$inferSelect)["tenantId"],
  id: (typeof expenseClaims.$inferSelect)["id"],
) {
  await assertGraphGuardrailAllowsRead();
  return archiveExpenseClaims(db, tenantId, id);
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

/** Same as getExpenseReportsByIdSafe; asserts graph-validation policy when GRAPH_VALIDATION_POLICY_JSON is set. */
export async function getExpenseReportsByIdSafeGuarded(
  db: Database,
  tenantId: (typeof expenseReports.$inferSelect)["tenantId"],
  id: (typeof expenseReports.$inferSelect)["id"],
) {
  await assertGraphGuardrailAllowsRead();
  return getExpenseReportsByIdSafe(db, tenantId, id);
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

export async function listExpenseReportsActiveGuarded(
  db: Database,
  tenantId: (typeof expenseReports.$inferSelect)["tenantId"],
) {
  await assertGraphGuardrailAllowsRead();
  return listExpenseReportsActive(db, tenantId);
}

/** List all rows for tenant including soft-deleted. */
export async function listExpenseReportsAll(
  db: Database,
  tenantId: (typeof expenseReports.$inferSelect)["tenantId"],
) {
  return await db.select().from(expenseReports).where(eq(expenseReports.tenantId, tenantId));
}

export async function listExpenseReportsAllGuarded(
  db: Database,
  tenantId: (typeof expenseReports.$inferSelect)["tenantId"],
) {
  await assertGraphGuardrailAllowsRead();
  return listExpenseReportsAll(db, tenantId);
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

export async function archiveExpenseReportsGuarded(
  db: Database,
  tenantId: (typeof expenseReports.$inferSelect)["tenantId"],
  id: (typeof expenseReports.$inferSelect)["id"],
) {
  await assertGraphGuardrailAllowsRead();
  return archiveExpenseReports(db, tenantId, id);
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

/** Same as getCashAdvancesByIdSafe; asserts graph-validation policy when GRAPH_VALIDATION_POLICY_JSON is set. */
export async function getCashAdvancesByIdSafeGuarded(
  db: Database,
  tenantId: (typeof cashAdvances.$inferSelect)["tenantId"],
  id: (typeof cashAdvances.$inferSelect)["id"],
) {
  await assertGraphGuardrailAllowsRead();
  return getCashAdvancesByIdSafe(db, tenantId, id);
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

export async function listCashAdvancesActiveGuarded(
  db: Database,
  tenantId: (typeof cashAdvances.$inferSelect)["tenantId"],
) {
  await assertGraphGuardrailAllowsRead();
  return listCashAdvancesActive(db, tenantId);
}

/** List all rows for tenant including soft-deleted. */
export async function listCashAdvancesAll(
  db: Database,
  tenantId: (typeof cashAdvances.$inferSelect)["tenantId"],
) {
  return await db.select().from(cashAdvances).where(eq(cashAdvances.tenantId, tenantId));
}

export async function listCashAdvancesAllGuarded(
  db: Database,
  tenantId: (typeof cashAdvances.$inferSelect)["tenantId"],
) {
  await assertGraphGuardrailAllowsRead();
  return listCashAdvancesAll(db, tenantId);
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

export async function archiveCashAdvancesGuarded(
  db: Database,
  tenantId: (typeof cashAdvances.$inferSelect)["tenantId"],
  id: (typeof cashAdvances.$inferSelect)["id"],
) {
  await assertGraphGuardrailAllowsRead();
  return archiveCashAdvances(db, tenantId, id);
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

/** Same as getHrExpenseLinesByIdSafe; asserts graph-validation policy when GRAPH_VALIDATION_POLICY_JSON is set. */
export async function getHrExpenseLinesByIdSafeGuarded(
  db: Database,
  tenantId: (typeof hrExpenseLines.$inferSelect)["tenantId"],
  id: (typeof hrExpenseLines.$inferSelect)["id"],
) {
  await assertGraphGuardrailAllowsRead();
  return getHrExpenseLinesByIdSafe(db, tenantId, id);
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

export async function listHrExpenseLinesActiveGuarded(
  db: Database,
  tenantId: (typeof hrExpenseLines.$inferSelect)["tenantId"],
) {
  await assertGraphGuardrailAllowsRead();
  return listHrExpenseLinesActive(db, tenantId);
}

/** List all rows for tenant including soft-deleted. */
export async function listHrExpenseLinesAll(
  db: Database,
  tenantId: (typeof hrExpenseLines.$inferSelect)["tenantId"],
) {
  return await db.select().from(hrExpenseLines).where(eq(hrExpenseLines.tenantId, tenantId));
}

export async function listHrExpenseLinesAllGuarded(
  db: Database,
  tenantId: (typeof hrExpenseLines.$inferSelect)["tenantId"],
) {
  await assertGraphGuardrailAllowsRead();
  return listHrExpenseLinesAll(db, tenantId);
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

export async function archiveHrExpenseLinesGuarded(
  db: Database,
  tenantId: (typeof hrExpenseLines.$inferSelect)["tenantId"],
  id: (typeof hrExpenseLines.$inferSelect)["id"],
) {
  await assertGraphGuardrailAllowsRead();
  return archiveHrExpenseLines(db, tenantId, id);
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

/** Same as getExpenseApprovalsByIdSafe; asserts graph-validation policy when GRAPH_VALIDATION_POLICY_JSON is set. */
export async function getExpenseApprovalsByIdSafeGuarded(
  db: Database,
  tenantId: (typeof expenseApprovals.$inferSelect)["tenantId"],
  id: (typeof expenseApprovals.$inferSelect)["id"],
) {
  await assertGraphGuardrailAllowsRead();
  return getExpenseApprovalsByIdSafe(db, tenantId, id);
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

export async function listExpenseApprovalsActiveGuarded(
  db: Database,
  tenantId: (typeof expenseApprovals.$inferSelect)["tenantId"],
) {
  await assertGraphGuardrailAllowsRead();
  return listExpenseApprovalsActive(db, tenantId);
}

/** List all rows for tenant including soft-deleted. */
export async function listExpenseApprovalsAll(
  db: Database,
  tenantId: (typeof expenseApprovals.$inferSelect)["tenantId"],
) {
  return await db.select().from(expenseApprovals).where(eq(expenseApprovals.tenantId, tenantId));
}

export async function listExpenseApprovalsAllGuarded(
  db: Database,
  tenantId: (typeof expenseApprovals.$inferSelect)["tenantId"],
) {
  await assertGraphGuardrailAllowsRead();
  return listExpenseApprovalsAll(db, tenantId);
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

export async function archiveExpenseApprovalsGuarded(
  db: Database,
  tenantId: (typeof expenseApprovals.$inferSelect)["tenantId"],
  id: (typeof expenseApprovals.$inferSelect)["id"],
) {
  await assertGraphGuardrailAllowsRead();
  return archiveExpenseApprovals(db, tenantId, id);
}

