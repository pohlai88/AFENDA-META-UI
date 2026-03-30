// @generated
// Full access scaffold — tools/ci-gate/db-access-layer (emit-full).
// Human-owned reporting: use separate modules (not *.access.ts).

import { and, eq, isNull } from "drizzle-orm";
import type { Database } from "../../db.js";
import {
  employeeLoanInstallments,
  employeeLoans,
  loanTypes,
} from "../../schema/hr/loans.js";

/** Safe by ID: tenant + not soft-deleted. */
export async function getLoanTypesByIdSafe(
  db: Database,
  tenantId: (typeof loanTypes.$inferSelect)["tenantId"],
  id: (typeof loanTypes.$inferSelect)["id"],
) {
  const rows = await db
    .select()
    .from(loanTypes)
    .where(
      and(
        eq(loanTypes.tenantId, tenantId),
        eq(loanTypes.id, id),
        isNull(loanTypes.deletedAt),
      ),
    )
    .limit(1);
  return rows[0] ?? null;
}

/** List rows for tenant excluding soft-deleted. */
export async function listLoanTypesActive(
  db: Database,
  tenantId: (typeof loanTypes.$inferSelect)["tenantId"],
) {
  return await db
    .select()
    .from(loanTypes)
    .where(and(eq(loanTypes.tenantId, tenantId), isNull(loanTypes.deletedAt)));
}

/** List all rows for tenant including soft-deleted. */
export async function listLoanTypesAll(
  db: Database,
  tenantId: (typeof loanTypes.$inferSelect)["tenantId"],
) {
  return await db.select().from(loanTypes).where(eq(loanTypes.tenantId, tenantId));
}

/** Soft-archive (mechanical delete flag). */
export async function archiveLoanTypes(
  db: Database,
  tenantId: (typeof loanTypes.$inferSelect)["tenantId"],
  id: (typeof loanTypes.$inferSelect)["id"],
) {
  return await db
    .update(loanTypes)
    .set({ deletedAt: new Date() })
    .where(and(eq(loanTypes.tenantId, tenantId), eq(loanTypes.id, id)));
}


/** Safe by ID: tenant + not soft-deleted. */
export async function getEmployeeLoansByIdSafe(
  db: Database,
  tenantId: (typeof employeeLoans.$inferSelect)["tenantId"],
  id: (typeof employeeLoans.$inferSelect)["id"],
) {
  const rows = await db
    .select()
    .from(employeeLoans)
    .where(
      and(
        eq(employeeLoans.tenantId, tenantId),
        eq(employeeLoans.id, id),
        isNull(employeeLoans.deletedAt),
      ),
    )
    .limit(1);
  return rows[0] ?? null;
}

/** List rows for tenant excluding soft-deleted. */
export async function listEmployeeLoansActive(
  db: Database,
  tenantId: (typeof employeeLoans.$inferSelect)["tenantId"],
) {
  return await db
    .select()
    .from(employeeLoans)
    .where(and(eq(employeeLoans.tenantId, tenantId), isNull(employeeLoans.deletedAt)));
}

/** List all rows for tenant including soft-deleted. */
export async function listEmployeeLoansAll(
  db: Database,
  tenantId: (typeof employeeLoans.$inferSelect)["tenantId"],
) {
  return await db.select().from(employeeLoans).where(eq(employeeLoans.tenantId, tenantId));
}

/** Soft-archive (mechanical delete flag). */
export async function archiveEmployeeLoans(
  db: Database,
  tenantId: (typeof employeeLoans.$inferSelect)["tenantId"],
  id: (typeof employeeLoans.$inferSelect)["id"],
) {
  return await db
    .update(employeeLoans)
    .set({ deletedAt: new Date() })
    .where(and(eq(employeeLoans.tenantId, tenantId), eq(employeeLoans.id, id)));
}


/** By ID for tenant (no soft-delete column on table). */
export async function getEmployeeLoanInstallmentsById(
  db: Database,
  tenantId: (typeof employeeLoanInstallments.$inferSelect)["tenantId"],
  id: (typeof employeeLoanInstallments.$inferSelect)["id"],
) {
  const rows = await db
    .select()
    .from(employeeLoanInstallments)
    .where(and(eq(employeeLoanInstallments.tenantId, tenantId), eq(employeeLoanInstallments.id, id)))
    .limit(1);
  return rows[0] ?? null;
}

/** List rows for tenant. */
export async function listEmployeeLoanInstallments(
  db: Database,
  tenantId: (typeof employeeLoanInstallments.$inferSelect)["tenantId"],
) {
  return await db.select().from(employeeLoanInstallments).where(eq(employeeLoanInstallments.tenantId, tenantId));
}

