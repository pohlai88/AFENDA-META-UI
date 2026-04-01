// @generated
// Full access scaffold — tools/ci-gate/db-access-layer (emit-full).
// Human-owned reporting: use separate modules (not *.access.ts).

import { and, eq, isNull } from "drizzle-orm";
import type { Database } from "../../drizzle/db.js";
import { assertGraphGuardrailAllowsRead } from "../_shared/graph-guardrail.js";
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

/** Same as getLoanTypesByIdSafe; asserts graph-validation policy when GRAPH_VALIDATION_POLICY_JSON is set. */
export async function getLoanTypesByIdSafeGuarded(
  db: Database,
  tenantId: (typeof loanTypes.$inferSelect)["tenantId"],
  id: (typeof loanTypes.$inferSelect)["id"],
) {
  await assertGraphGuardrailAllowsRead();
  return getLoanTypesByIdSafe(db, tenantId, id);
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

export async function listLoanTypesActiveGuarded(
  db: Database,
  tenantId: (typeof loanTypes.$inferSelect)["tenantId"],
) {
  await assertGraphGuardrailAllowsRead();
  return listLoanTypesActive(db, tenantId);
}

/** List all rows for tenant including soft-deleted. */
export async function listLoanTypesAll(
  db: Database,
  tenantId: (typeof loanTypes.$inferSelect)["tenantId"],
) {
  return await db.select().from(loanTypes).where(eq(loanTypes.tenantId, tenantId));
}

export async function listLoanTypesAllGuarded(
  db: Database,
  tenantId: (typeof loanTypes.$inferSelect)["tenantId"],
) {
  await assertGraphGuardrailAllowsRead();
  return listLoanTypesAll(db, tenantId);
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

export async function archiveLoanTypesGuarded(
  db: Database,
  tenantId: (typeof loanTypes.$inferSelect)["tenantId"],
  id: (typeof loanTypes.$inferSelect)["id"],
) {
  await assertGraphGuardrailAllowsRead();
  return archiveLoanTypes(db, tenantId, id);
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

/** Same as getEmployeeLoansByIdSafe; asserts graph-validation policy when GRAPH_VALIDATION_POLICY_JSON is set. */
export async function getEmployeeLoansByIdSafeGuarded(
  db: Database,
  tenantId: (typeof employeeLoans.$inferSelect)["tenantId"],
  id: (typeof employeeLoans.$inferSelect)["id"],
) {
  await assertGraphGuardrailAllowsRead();
  return getEmployeeLoansByIdSafe(db, tenantId, id);
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

export async function listEmployeeLoansActiveGuarded(
  db: Database,
  tenantId: (typeof employeeLoans.$inferSelect)["tenantId"],
) {
  await assertGraphGuardrailAllowsRead();
  return listEmployeeLoansActive(db, tenantId);
}

/** List all rows for tenant including soft-deleted. */
export async function listEmployeeLoansAll(
  db: Database,
  tenantId: (typeof employeeLoans.$inferSelect)["tenantId"],
) {
  return await db.select().from(employeeLoans).where(eq(employeeLoans.tenantId, tenantId));
}

export async function listEmployeeLoansAllGuarded(
  db: Database,
  tenantId: (typeof employeeLoans.$inferSelect)["tenantId"],
) {
  await assertGraphGuardrailAllowsRead();
  return listEmployeeLoansAll(db, tenantId);
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

export async function archiveEmployeeLoansGuarded(
  db: Database,
  tenantId: (typeof employeeLoans.$inferSelect)["tenantId"],
  id: (typeof employeeLoans.$inferSelect)["id"],
) {
  await assertGraphGuardrailAllowsRead();
  return archiveEmployeeLoans(db, tenantId, id);
}


/** Safe by ID: tenant + not soft-deleted. */
export async function getEmployeeLoanInstallmentsByIdSafe(
  db: Database,
  tenantId: (typeof employeeLoanInstallments.$inferSelect)["tenantId"],
  id: (typeof employeeLoanInstallments.$inferSelect)["id"],
) {
  const rows = await db
    .select()
    .from(employeeLoanInstallments)
    .where(
      and(
        eq(employeeLoanInstallments.tenantId, tenantId),
        eq(employeeLoanInstallments.id, id),
        isNull(employeeLoanInstallments.deletedAt),
      ),
    )
    .limit(1);
  return rows[0] ?? null;
}

/** Same as getEmployeeLoanInstallmentsByIdSafe; asserts graph-validation policy when GRAPH_VALIDATION_POLICY_JSON is set. */
export async function getEmployeeLoanInstallmentsByIdSafeGuarded(
  db: Database,
  tenantId: (typeof employeeLoanInstallments.$inferSelect)["tenantId"],
  id: (typeof employeeLoanInstallments.$inferSelect)["id"],
) {
  await assertGraphGuardrailAllowsRead();
  return getEmployeeLoanInstallmentsByIdSafe(db, tenantId, id);
}

/** List rows for tenant excluding soft-deleted. */
export async function listEmployeeLoanInstallmentsActive(
  db: Database,
  tenantId: (typeof employeeLoanInstallments.$inferSelect)["tenantId"],
) {
  return await db
    .select()
    .from(employeeLoanInstallments)
    .where(and(eq(employeeLoanInstallments.tenantId, tenantId), isNull(employeeLoanInstallments.deletedAt)));
}

export async function listEmployeeLoanInstallmentsActiveGuarded(
  db: Database,
  tenantId: (typeof employeeLoanInstallments.$inferSelect)["tenantId"],
) {
  await assertGraphGuardrailAllowsRead();
  return listEmployeeLoanInstallmentsActive(db, tenantId);
}

/** List all rows for tenant including soft-deleted. */
export async function listEmployeeLoanInstallmentsAll(
  db: Database,
  tenantId: (typeof employeeLoanInstallments.$inferSelect)["tenantId"],
) {
  return await db.select().from(employeeLoanInstallments).where(eq(employeeLoanInstallments.tenantId, tenantId));
}

export async function listEmployeeLoanInstallmentsAllGuarded(
  db: Database,
  tenantId: (typeof employeeLoanInstallments.$inferSelect)["tenantId"],
) {
  await assertGraphGuardrailAllowsRead();
  return listEmployeeLoanInstallmentsAll(db, tenantId);
}

/** Soft-archive (mechanical delete flag). */
export async function archiveEmployeeLoanInstallments(
  db: Database,
  tenantId: (typeof employeeLoanInstallments.$inferSelect)["tenantId"],
  id: (typeof employeeLoanInstallments.$inferSelect)["id"],
) {
  return await db
    .update(employeeLoanInstallments)
    .set({ deletedAt: new Date() })
    .where(and(eq(employeeLoanInstallments.tenantId, tenantId), eq(employeeLoanInstallments.id, id)));
}

export async function archiveEmployeeLoanInstallmentsGuarded(
  db: Database,
  tenantId: (typeof employeeLoanInstallments.$inferSelect)["tenantId"],
  id: (typeof employeeLoanInstallments.$inferSelect)["id"],
) {
  await assertGraphGuardrailAllowsRead();
  return archiveEmployeeLoanInstallments(db, tenantId, id);
}

