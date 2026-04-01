// @generated
// Full access scaffold — tools/ci-gate/db-access-layer (emit-full).
// Human-owned reporting: use separate modules (not *.access.ts).

import { and, eq, isNull } from "drizzle-orm";
import type { Database } from "../../drizzle/db.js";
import { assertGraphGuardrailAllowsRead } from "../_shared/graph-guardrail.js";
import {
  employeeSalaries,
  paymentDistributions,
  payrollAdjustments,
  payrollEntries,
  payrollLines,
  payrollPeriods,
  payslips,
  salaryComponents,
  statutoryDeductions,
  taxBrackets,
} from "../../schema/hr/payroll.js";

/** Safe by ID: tenant + not soft-deleted. */
export async function getSalaryComponentsByIdSafe(
  db: Database,
  tenantId: (typeof salaryComponents.$inferSelect)["tenantId"],
  id: (typeof salaryComponents.$inferSelect)["id"],
) {
  const rows = await db
    .select()
    .from(salaryComponents)
    .where(
      and(
        eq(salaryComponents.tenantId, tenantId),
        eq(salaryComponents.id, id),
        isNull(salaryComponents.deletedAt),
      ),
    )
    .limit(1);
  return rows[0] ?? null;
}

/** Same as getSalaryComponentsByIdSafe; asserts graph-validation policy when GRAPH_VALIDATION_POLICY_JSON is set. */
export async function getSalaryComponentsByIdSafeGuarded(
  db: Database,
  tenantId: (typeof salaryComponents.$inferSelect)["tenantId"],
  id: (typeof salaryComponents.$inferSelect)["id"],
) {
  await assertGraphGuardrailAllowsRead();
  return getSalaryComponentsByIdSafe(db, tenantId, id);
}

/** List rows for tenant excluding soft-deleted. */
export async function listSalaryComponentsActive(
  db: Database,
  tenantId: (typeof salaryComponents.$inferSelect)["tenantId"],
) {
  return await db
    .select()
    .from(salaryComponents)
    .where(and(eq(salaryComponents.tenantId, tenantId), isNull(salaryComponents.deletedAt)));
}

export async function listSalaryComponentsActiveGuarded(
  db: Database,
  tenantId: (typeof salaryComponents.$inferSelect)["tenantId"],
) {
  await assertGraphGuardrailAllowsRead();
  return listSalaryComponentsActive(db, tenantId);
}

/** List all rows for tenant including soft-deleted. */
export async function listSalaryComponentsAll(
  db: Database,
  tenantId: (typeof salaryComponents.$inferSelect)["tenantId"],
) {
  return await db.select().from(salaryComponents).where(eq(salaryComponents.tenantId, tenantId));
}

export async function listSalaryComponentsAllGuarded(
  db: Database,
  tenantId: (typeof salaryComponents.$inferSelect)["tenantId"],
) {
  await assertGraphGuardrailAllowsRead();
  return listSalaryComponentsAll(db, tenantId);
}

/** Soft-archive (mechanical delete flag). */
export async function archiveSalaryComponents(
  db: Database,
  tenantId: (typeof salaryComponents.$inferSelect)["tenantId"],
  id: (typeof salaryComponents.$inferSelect)["id"],
) {
  return await db
    .update(salaryComponents)
    .set({ deletedAt: new Date() })
    .where(and(eq(salaryComponents.tenantId, tenantId), eq(salaryComponents.id, id)));
}

export async function archiveSalaryComponentsGuarded(
  db: Database,
  tenantId: (typeof salaryComponents.$inferSelect)["tenantId"],
  id: (typeof salaryComponents.$inferSelect)["id"],
) {
  await assertGraphGuardrailAllowsRead();
  return archiveSalaryComponents(db, tenantId, id);
}


/** Safe by ID: tenant + not soft-deleted. */
export async function getEmployeeSalariesByIdSafe(
  db: Database,
  tenantId: (typeof employeeSalaries.$inferSelect)["tenantId"],
  id: (typeof employeeSalaries.$inferSelect)["id"],
) {
  const rows = await db
    .select()
    .from(employeeSalaries)
    .where(
      and(
        eq(employeeSalaries.tenantId, tenantId),
        eq(employeeSalaries.id, id),
        isNull(employeeSalaries.deletedAt),
      ),
    )
    .limit(1);
  return rows[0] ?? null;
}

/** Same as getEmployeeSalariesByIdSafe; asserts graph-validation policy when GRAPH_VALIDATION_POLICY_JSON is set. */
export async function getEmployeeSalariesByIdSafeGuarded(
  db: Database,
  tenantId: (typeof employeeSalaries.$inferSelect)["tenantId"],
  id: (typeof employeeSalaries.$inferSelect)["id"],
) {
  await assertGraphGuardrailAllowsRead();
  return getEmployeeSalariesByIdSafe(db, tenantId, id);
}

/** List rows for tenant excluding soft-deleted. */
export async function listEmployeeSalariesActive(
  db: Database,
  tenantId: (typeof employeeSalaries.$inferSelect)["tenantId"],
) {
  return await db
    .select()
    .from(employeeSalaries)
    .where(and(eq(employeeSalaries.tenantId, tenantId), isNull(employeeSalaries.deletedAt)));
}

export async function listEmployeeSalariesActiveGuarded(
  db: Database,
  tenantId: (typeof employeeSalaries.$inferSelect)["tenantId"],
) {
  await assertGraphGuardrailAllowsRead();
  return listEmployeeSalariesActive(db, tenantId);
}

/** List all rows for tenant including soft-deleted. */
export async function listEmployeeSalariesAll(
  db: Database,
  tenantId: (typeof employeeSalaries.$inferSelect)["tenantId"],
) {
  return await db.select().from(employeeSalaries).where(eq(employeeSalaries.tenantId, tenantId));
}

export async function listEmployeeSalariesAllGuarded(
  db: Database,
  tenantId: (typeof employeeSalaries.$inferSelect)["tenantId"],
) {
  await assertGraphGuardrailAllowsRead();
  return listEmployeeSalariesAll(db, tenantId);
}

/** Soft-archive (mechanical delete flag). */
export async function archiveEmployeeSalaries(
  db: Database,
  tenantId: (typeof employeeSalaries.$inferSelect)["tenantId"],
  id: (typeof employeeSalaries.$inferSelect)["id"],
) {
  return await db
    .update(employeeSalaries)
    .set({ deletedAt: new Date() })
    .where(and(eq(employeeSalaries.tenantId, tenantId), eq(employeeSalaries.id, id)));
}

export async function archiveEmployeeSalariesGuarded(
  db: Database,
  tenantId: (typeof employeeSalaries.$inferSelect)["tenantId"],
  id: (typeof employeeSalaries.$inferSelect)["id"],
) {
  await assertGraphGuardrailAllowsRead();
  return archiveEmployeeSalaries(db, tenantId, id);
}


/** Safe by ID: tenant + not soft-deleted. */
export async function getPayrollPeriodsByIdSafe(
  db: Database,
  tenantId: (typeof payrollPeriods.$inferSelect)["tenantId"],
  id: (typeof payrollPeriods.$inferSelect)["id"],
) {
  const rows = await db
    .select()
    .from(payrollPeriods)
    .where(
      and(
        eq(payrollPeriods.tenantId, tenantId),
        eq(payrollPeriods.id, id),
        isNull(payrollPeriods.deletedAt),
      ),
    )
    .limit(1);
  return rows[0] ?? null;
}

/** Same as getPayrollPeriodsByIdSafe; asserts graph-validation policy when GRAPH_VALIDATION_POLICY_JSON is set. */
export async function getPayrollPeriodsByIdSafeGuarded(
  db: Database,
  tenantId: (typeof payrollPeriods.$inferSelect)["tenantId"],
  id: (typeof payrollPeriods.$inferSelect)["id"],
) {
  await assertGraphGuardrailAllowsRead();
  return getPayrollPeriodsByIdSafe(db, tenantId, id);
}

/** List rows for tenant excluding soft-deleted. */
export async function listPayrollPeriodsActive(
  db: Database,
  tenantId: (typeof payrollPeriods.$inferSelect)["tenantId"],
) {
  return await db
    .select()
    .from(payrollPeriods)
    .where(and(eq(payrollPeriods.tenantId, tenantId), isNull(payrollPeriods.deletedAt)));
}

export async function listPayrollPeriodsActiveGuarded(
  db: Database,
  tenantId: (typeof payrollPeriods.$inferSelect)["tenantId"],
) {
  await assertGraphGuardrailAllowsRead();
  return listPayrollPeriodsActive(db, tenantId);
}

/** List all rows for tenant including soft-deleted. */
export async function listPayrollPeriodsAll(
  db: Database,
  tenantId: (typeof payrollPeriods.$inferSelect)["tenantId"],
) {
  return await db.select().from(payrollPeriods).where(eq(payrollPeriods.tenantId, tenantId));
}

export async function listPayrollPeriodsAllGuarded(
  db: Database,
  tenantId: (typeof payrollPeriods.$inferSelect)["tenantId"],
) {
  await assertGraphGuardrailAllowsRead();
  return listPayrollPeriodsAll(db, tenantId);
}

/** Soft-archive (mechanical delete flag). */
export async function archivePayrollPeriods(
  db: Database,
  tenantId: (typeof payrollPeriods.$inferSelect)["tenantId"],
  id: (typeof payrollPeriods.$inferSelect)["id"],
) {
  return await db
    .update(payrollPeriods)
    .set({ deletedAt: new Date() })
    .where(and(eq(payrollPeriods.tenantId, tenantId), eq(payrollPeriods.id, id)));
}

export async function archivePayrollPeriodsGuarded(
  db: Database,
  tenantId: (typeof payrollPeriods.$inferSelect)["tenantId"],
  id: (typeof payrollPeriods.$inferSelect)["id"],
) {
  await assertGraphGuardrailAllowsRead();
  return archivePayrollPeriods(db, tenantId, id);
}


/** Safe by ID: tenant + not soft-deleted. */
export async function getPayrollEntriesByIdSafe(
  db: Database,
  tenantId: (typeof payrollEntries.$inferSelect)["tenantId"],
  id: (typeof payrollEntries.$inferSelect)["id"],
) {
  const rows = await db
    .select()
    .from(payrollEntries)
    .where(
      and(
        eq(payrollEntries.tenantId, tenantId),
        eq(payrollEntries.id, id),
        isNull(payrollEntries.deletedAt),
      ),
    )
    .limit(1);
  return rows[0] ?? null;
}

/** Same as getPayrollEntriesByIdSafe; asserts graph-validation policy when GRAPH_VALIDATION_POLICY_JSON is set. */
export async function getPayrollEntriesByIdSafeGuarded(
  db: Database,
  tenantId: (typeof payrollEntries.$inferSelect)["tenantId"],
  id: (typeof payrollEntries.$inferSelect)["id"],
) {
  await assertGraphGuardrailAllowsRead();
  return getPayrollEntriesByIdSafe(db, tenantId, id);
}

/** List rows for tenant excluding soft-deleted. */
export async function listPayrollEntriesActive(
  db: Database,
  tenantId: (typeof payrollEntries.$inferSelect)["tenantId"],
) {
  return await db
    .select()
    .from(payrollEntries)
    .where(and(eq(payrollEntries.tenantId, tenantId), isNull(payrollEntries.deletedAt)));
}

export async function listPayrollEntriesActiveGuarded(
  db: Database,
  tenantId: (typeof payrollEntries.$inferSelect)["tenantId"],
) {
  await assertGraphGuardrailAllowsRead();
  return listPayrollEntriesActive(db, tenantId);
}

/** List all rows for tenant including soft-deleted. */
export async function listPayrollEntriesAll(
  db: Database,
  tenantId: (typeof payrollEntries.$inferSelect)["tenantId"],
) {
  return await db.select().from(payrollEntries).where(eq(payrollEntries.tenantId, tenantId));
}

export async function listPayrollEntriesAllGuarded(
  db: Database,
  tenantId: (typeof payrollEntries.$inferSelect)["tenantId"],
) {
  await assertGraphGuardrailAllowsRead();
  return listPayrollEntriesAll(db, tenantId);
}

/** Soft-archive (mechanical delete flag). */
export async function archivePayrollEntries(
  db: Database,
  tenantId: (typeof payrollEntries.$inferSelect)["tenantId"],
  id: (typeof payrollEntries.$inferSelect)["id"],
) {
  return await db
    .update(payrollEntries)
    .set({ deletedAt: new Date() })
    .where(and(eq(payrollEntries.tenantId, tenantId), eq(payrollEntries.id, id)));
}

export async function archivePayrollEntriesGuarded(
  db: Database,
  tenantId: (typeof payrollEntries.$inferSelect)["tenantId"],
  id: (typeof payrollEntries.$inferSelect)["id"],
) {
  await assertGraphGuardrailAllowsRead();
  return archivePayrollEntries(db, tenantId, id);
}


/** Safe by ID: tenant + not soft-deleted. */
export async function getPayrollLinesByIdSafe(
  db: Database,
  tenantId: (typeof payrollLines.$inferSelect)["tenantId"],
  id: (typeof payrollLines.$inferSelect)["id"],
) {
  const rows = await db
    .select()
    .from(payrollLines)
    .where(
      and(
        eq(payrollLines.tenantId, tenantId),
        eq(payrollLines.id, id),
        isNull(payrollLines.deletedAt),
      ),
    )
    .limit(1);
  return rows[0] ?? null;
}

/** Same as getPayrollLinesByIdSafe; asserts graph-validation policy when GRAPH_VALIDATION_POLICY_JSON is set. */
export async function getPayrollLinesByIdSafeGuarded(
  db: Database,
  tenantId: (typeof payrollLines.$inferSelect)["tenantId"],
  id: (typeof payrollLines.$inferSelect)["id"],
) {
  await assertGraphGuardrailAllowsRead();
  return getPayrollLinesByIdSafe(db, tenantId, id);
}

/** List rows for tenant excluding soft-deleted. */
export async function listPayrollLinesActive(
  db: Database,
  tenantId: (typeof payrollLines.$inferSelect)["tenantId"],
) {
  return await db
    .select()
    .from(payrollLines)
    .where(and(eq(payrollLines.tenantId, tenantId), isNull(payrollLines.deletedAt)));
}

export async function listPayrollLinesActiveGuarded(
  db: Database,
  tenantId: (typeof payrollLines.$inferSelect)["tenantId"],
) {
  await assertGraphGuardrailAllowsRead();
  return listPayrollLinesActive(db, tenantId);
}

/** List all rows for tenant including soft-deleted. */
export async function listPayrollLinesAll(
  db: Database,
  tenantId: (typeof payrollLines.$inferSelect)["tenantId"],
) {
  return await db.select().from(payrollLines).where(eq(payrollLines.tenantId, tenantId));
}

export async function listPayrollLinesAllGuarded(
  db: Database,
  tenantId: (typeof payrollLines.$inferSelect)["tenantId"],
) {
  await assertGraphGuardrailAllowsRead();
  return listPayrollLinesAll(db, tenantId);
}

/** Soft-archive (mechanical delete flag). */
export async function archivePayrollLines(
  db: Database,
  tenantId: (typeof payrollLines.$inferSelect)["tenantId"],
  id: (typeof payrollLines.$inferSelect)["id"],
) {
  return await db
    .update(payrollLines)
    .set({ deletedAt: new Date() })
    .where(and(eq(payrollLines.tenantId, tenantId), eq(payrollLines.id, id)));
}

export async function archivePayrollLinesGuarded(
  db: Database,
  tenantId: (typeof payrollLines.$inferSelect)["tenantId"],
  id: (typeof payrollLines.$inferSelect)["id"],
) {
  await assertGraphGuardrailAllowsRead();
  return archivePayrollLines(db, tenantId, id);
}


/** Safe by ID: tenant + not soft-deleted. */
export async function getTaxBracketsByIdSafe(
  db: Database,
  tenantId: (typeof taxBrackets.$inferSelect)["tenantId"],
  id: (typeof taxBrackets.$inferSelect)["id"],
) {
  const rows = await db
    .select()
    .from(taxBrackets)
    .where(
      and(
        eq(taxBrackets.tenantId, tenantId),
        eq(taxBrackets.id, id),
        isNull(taxBrackets.deletedAt),
      ),
    )
    .limit(1);
  return rows[0] ?? null;
}

/** Same as getTaxBracketsByIdSafe; asserts graph-validation policy when GRAPH_VALIDATION_POLICY_JSON is set. */
export async function getTaxBracketsByIdSafeGuarded(
  db: Database,
  tenantId: (typeof taxBrackets.$inferSelect)["tenantId"],
  id: (typeof taxBrackets.$inferSelect)["id"],
) {
  await assertGraphGuardrailAllowsRead();
  return getTaxBracketsByIdSafe(db, tenantId, id);
}

/** List rows for tenant excluding soft-deleted. */
export async function listTaxBracketsActive(
  db: Database,
  tenantId: (typeof taxBrackets.$inferSelect)["tenantId"],
) {
  return await db
    .select()
    .from(taxBrackets)
    .where(and(eq(taxBrackets.tenantId, tenantId), isNull(taxBrackets.deletedAt)));
}

export async function listTaxBracketsActiveGuarded(
  db: Database,
  tenantId: (typeof taxBrackets.$inferSelect)["tenantId"],
) {
  await assertGraphGuardrailAllowsRead();
  return listTaxBracketsActive(db, tenantId);
}

/** List all rows for tenant including soft-deleted. */
export async function listTaxBracketsAll(
  db: Database,
  tenantId: (typeof taxBrackets.$inferSelect)["tenantId"],
) {
  return await db.select().from(taxBrackets).where(eq(taxBrackets.tenantId, tenantId));
}

export async function listTaxBracketsAllGuarded(
  db: Database,
  tenantId: (typeof taxBrackets.$inferSelect)["tenantId"],
) {
  await assertGraphGuardrailAllowsRead();
  return listTaxBracketsAll(db, tenantId);
}

/** Soft-archive (mechanical delete flag). */
export async function archiveTaxBrackets(
  db: Database,
  tenantId: (typeof taxBrackets.$inferSelect)["tenantId"],
  id: (typeof taxBrackets.$inferSelect)["id"],
) {
  return await db
    .update(taxBrackets)
    .set({ deletedAt: new Date() })
    .where(and(eq(taxBrackets.tenantId, tenantId), eq(taxBrackets.id, id)));
}

export async function archiveTaxBracketsGuarded(
  db: Database,
  tenantId: (typeof taxBrackets.$inferSelect)["tenantId"],
  id: (typeof taxBrackets.$inferSelect)["id"],
) {
  await assertGraphGuardrailAllowsRead();
  return archiveTaxBrackets(db, tenantId, id);
}


/** Safe by ID: tenant + not soft-deleted. */
export async function getStatutoryDeductionsByIdSafe(
  db: Database,
  tenantId: (typeof statutoryDeductions.$inferSelect)["tenantId"],
  id: (typeof statutoryDeductions.$inferSelect)["id"],
) {
  const rows = await db
    .select()
    .from(statutoryDeductions)
    .where(
      and(
        eq(statutoryDeductions.tenantId, tenantId),
        eq(statutoryDeductions.id, id),
        isNull(statutoryDeductions.deletedAt),
      ),
    )
    .limit(1);
  return rows[0] ?? null;
}

/** Same as getStatutoryDeductionsByIdSafe; asserts graph-validation policy when GRAPH_VALIDATION_POLICY_JSON is set. */
export async function getStatutoryDeductionsByIdSafeGuarded(
  db: Database,
  tenantId: (typeof statutoryDeductions.$inferSelect)["tenantId"],
  id: (typeof statutoryDeductions.$inferSelect)["id"],
) {
  await assertGraphGuardrailAllowsRead();
  return getStatutoryDeductionsByIdSafe(db, tenantId, id);
}

/** List rows for tenant excluding soft-deleted. */
export async function listStatutoryDeductionsActive(
  db: Database,
  tenantId: (typeof statutoryDeductions.$inferSelect)["tenantId"],
) {
  return await db
    .select()
    .from(statutoryDeductions)
    .where(and(eq(statutoryDeductions.tenantId, tenantId), isNull(statutoryDeductions.deletedAt)));
}

export async function listStatutoryDeductionsActiveGuarded(
  db: Database,
  tenantId: (typeof statutoryDeductions.$inferSelect)["tenantId"],
) {
  await assertGraphGuardrailAllowsRead();
  return listStatutoryDeductionsActive(db, tenantId);
}

/** List all rows for tenant including soft-deleted. */
export async function listStatutoryDeductionsAll(
  db: Database,
  tenantId: (typeof statutoryDeductions.$inferSelect)["tenantId"],
) {
  return await db.select().from(statutoryDeductions).where(eq(statutoryDeductions.tenantId, tenantId));
}

export async function listStatutoryDeductionsAllGuarded(
  db: Database,
  tenantId: (typeof statutoryDeductions.$inferSelect)["tenantId"],
) {
  await assertGraphGuardrailAllowsRead();
  return listStatutoryDeductionsAll(db, tenantId);
}

/** Soft-archive (mechanical delete flag). */
export async function archiveStatutoryDeductions(
  db: Database,
  tenantId: (typeof statutoryDeductions.$inferSelect)["tenantId"],
  id: (typeof statutoryDeductions.$inferSelect)["id"],
) {
  return await db
    .update(statutoryDeductions)
    .set({ deletedAt: new Date() })
    .where(and(eq(statutoryDeductions.tenantId, tenantId), eq(statutoryDeductions.id, id)));
}

export async function archiveStatutoryDeductionsGuarded(
  db: Database,
  tenantId: (typeof statutoryDeductions.$inferSelect)["tenantId"],
  id: (typeof statutoryDeductions.$inferSelect)["id"],
) {
  await assertGraphGuardrailAllowsRead();
  return archiveStatutoryDeductions(db, tenantId, id);
}


/** Safe by ID: tenant + not soft-deleted. */
export async function getPayrollAdjustmentsByIdSafe(
  db: Database,
  tenantId: (typeof payrollAdjustments.$inferSelect)["tenantId"],
  id: (typeof payrollAdjustments.$inferSelect)["id"],
) {
  const rows = await db
    .select()
    .from(payrollAdjustments)
    .where(
      and(
        eq(payrollAdjustments.tenantId, tenantId),
        eq(payrollAdjustments.id, id),
        isNull(payrollAdjustments.deletedAt),
      ),
    )
    .limit(1);
  return rows[0] ?? null;
}

/** Same as getPayrollAdjustmentsByIdSafe; asserts graph-validation policy when GRAPH_VALIDATION_POLICY_JSON is set. */
export async function getPayrollAdjustmentsByIdSafeGuarded(
  db: Database,
  tenantId: (typeof payrollAdjustments.$inferSelect)["tenantId"],
  id: (typeof payrollAdjustments.$inferSelect)["id"],
) {
  await assertGraphGuardrailAllowsRead();
  return getPayrollAdjustmentsByIdSafe(db, tenantId, id);
}

/** List rows for tenant excluding soft-deleted. */
export async function listPayrollAdjustmentsActive(
  db: Database,
  tenantId: (typeof payrollAdjustments.$inferSelect)["tenantId"],
) {
  return await db
    .select()
    .from(payrollAdjustments)
    .where(and(eq(payrollAdjustments.tenantId, tenantId), isNull(payrollAdjustments.deletedAt)));
}

export async function listPayrollAdjustmentsActiveGuarded(
  db: Database,
  tenantId: (typeof payrollAdjustments.$inferSelect)["tenantId"],
) {
  await assertGraphGuardrailAllowsRead();
  return listPayrollAdjustmentsActive(db, tenantId);
}

/** List all rows for tenant including soft-deleted. */
export async function listPayrollAdjustmentsAll(
  db: Database,
  tenantId: (typeof payrollAdjustments.$inferSelect)["tenantId"],
) {
  return await db.select().from(payrollAdjustments).where(eq(payrollAdjustments.tenantId, tenantId));
}

export async function listPayrollAdjustmentsAllGuarded(
  db: Database,
  tenantId: (typeof payrollAdjustments.$inferSelect)["tenantId"],
) {
  await assertGraphGuardrailAllowsRead();
  return listPayrollAdjustmentsAll(db, tenantId);
}

/** Soft-archive (mechanical delete flag). */
export async function archivePayrollAdjustments(
  db: Database,
  tenantId: (typeof payrollAdjustments.$inferSelect)["tenantId"],
  id: (typeof payrollAdjustments.$inferSelect)["id"],
) {
  return await db
    .update(payrollAdjustments)
    .set({ deletedAt: new Date() })
    .where(and(eq(payrollAdjustments.tenantId, tenantId), eq(payrollAdjustments.id, id)));
}

export async function archivePayrollAdjustmentsGuarded(
  db: Database,
  tenantId: (typeof payrollAdjustments.$inferSelect)["tenantId"],
  id: (typeof payrollAdjustments.$inferSelect)["id"],
) {
  await assertGraphGuardrailAllowsRead();
  return archivePayrollAdjustments(db, tenantId, id);
}


/** Safe by ID: tenant + not soft-deleted. */
export async function getPayslipsByIdSafe(
  db: Database,
  tenantId: (typeof payslips.$inferSelect)["tenantId"],
  id: (typeof payslips.$inferSelect)["id"],
) {
  const rows = await db
    .select()
    .from(payslips)
    .where(
      and(
        eq(payslips.tenantId, tenantId),
        eq(payslips.id, id),
        isNull(payslips.deletedAt),
      ),
    )
    .limit(1);
  return rows[0] ?? null;
}

/** Same as getPayslipsByIdSafe; asserts graph-validation policy when GRAPH_VALIDATION_POLICY_JSON is set. */
export async function getPayslipsByIdSafeGuarded(
  db: Database,
  tenantId: (typeof payslips.$inferSelect)["tenantId"],
  id: (typeof payslips.$inferSelect)["id"],
) {
  await assertGraphGuardrailAllowsRead();
  return getPayslipsByIdSafe(db, tenantId, id);
}

/** List rows for tenant excluding soft-deleted. */
export async function listPayslipsActive(
  db: Database,
  tenantId: (typeof payslips.$inferSelect)["tenantId"],
) {
  return await db
    .select()
    .from(payslips)
    .where(and(eq(payslips.tenantId, tenantId), isNull(payslips.deletedAt)));
}

export async function listPayslipsActiveGuarded(
  db: Database,
  tenantId: (typeof payslips.$inferSelect)["tenantId"],
) {
  await assertGraphGuardrailAllowsRead();
  return listPayslipsActive(db, tenantId);
}

/** List all rows for tenant including soft-deleted. */
export async function listPayslipsAll(
  db: Database,
  tenantId: (typeof payslips.$inferSelect)["tenantId"],
) {
  return await db.select().from(payslips).where(eq(payslips.tenantId, tenantId));
}

export async function listPayslipsAllGuarded(
  db: Database,
  tenantId: (typeof payslips.$inferSelect)["tenantId"],
) {
  await assertGraphGuardrailAllowsRead();
  return listPayslipsAll(db, tenantId);
}

/** Soft-archive (mechanical delete flag). */
export async function archivePayslips(
  db: Database,
  tenantId: (typeof payslips.$inferSelect)["tenantId"],
  id: (typeof payslips.$inferSelect)["id"],
) {
  return await db
    .update(payslips)
    .set({ deletedAt: new Date() })
    .where(and(eq(payslips.tenantId, tenantId), eq(payslips.id, id)));
}

export async function archivePayslipsGuarded(
  db: Database,
  tenantId: (typeof payslips.$inferSelect)["tenantId"],
  id: (typeof payslips.$inferSelect)["id"],
) {
  await assertGraphGuardrailAllowsRead();
  return archivePayslips(db, tenantId, id);
}


/** Safe by ID: tenant + not soft-deleted. */
export async function getPaymentDistributionsByIdSafe(
  db: Database,
  tenantId: (typeof paymentDistributions.$inferSelect)["tenantId"],
  id: (typeof paymentDistributions.$inferSelect)["id"],
) {
  const rows = await db
    .select()
    .from(paymentDistributions)
    .where(
      and(
        eq(paymentDistributions.tenantId, tenantId),
        eq(paymentDistributions.id, id),
        isNull(paymentDistributions.deletedAt),
      ),
    )
    .limit(1);
  return rows[0] ?? null;
}

/** Same as getPaymentDistributionsByIdSafe; asserts graph-validation policy when GRAPH_VALIDATION_POLICY_JSON is set. */
export async function getPaymentDistributionsByIdSafeGuarded(
  db: Database,
  tenantId: (typeof paymentDistributions.$inferSelect)["tenantId"],
  id: (typeof paymentDistributions.$inferSelect)["id"],
) {
  await assertGraphGuardrailAllowsRead();
  return getPaymentDistributionsByIdSafe(db, tenantId, id);
}

/** List rows for tenant excluding soft-deleted. */
export async function listPaymentDistributionsActive(
  db: Database,
  tenantId: (typeof paymentDistributions.$inferSelect)["tenantId"],
) {
  return await db
    .select()
    .from(paymentDistributions)
    .where(and(eq(paymentDistributions.tenantId, tenantId), isNull(paymentDistributions.deletedAt)));
}

export async function listPaymentDistributionsActiveGuarded(
  db: Database,
  tenantId: (typeof paymentDistributions.$inferSelect)["tenantId"],
) {
  await assertGraphGuardrailAllowsRead();
  return listPaymentDistributionsActive(db, tenantId);
}

/** List all rows for tenant including soft-deleted. */
export async function listPaymentDistributionsAll(
  db: Database,
  tenantId: (typeof paymentDistributions.$inferSelect)["tenantId"],
) {
  return await db.select().from(paymentDistributions).where(eq(paymentDistributions.tenantId, tenantId));
}

export async function listPaymentDistributionsAllGuarded(
  db: Database,
  tenantId: (typeof paymentDistributions.$inferSelect)["tenantId"],
) {
  await assertGraphGuardrailAllowsRead();
  return listPaymentDistributionsAll(db, tenantId);
}

/** Soft-archive (mechanical delete flag). */
export async function archivePaymentDistributions(
  db: Database,
  tenantId: (typeof paymentDistributions.$inferSelect)["tenantId"],
  id: (typeof paymentDistributions.$inferSelect)["id"],
) {
  return await db
    .update(paymentDistributions)
    .set({ deletedAt: new Date() })
    .where(and(eq(paymentDistributions.tenantId, tenantId), eq(paymentDistributions.id, id)));
}

export async function archivePaymentDistributionsGuarded(
  db: Database,
  tenantId: (typeof paymentDistributions.$inferSelect)["tenantId"],
  id: (typeof paymentDistributions.$inferSelect)["id"],
) {
  await assertGraphGuardrailAllowsRead();
  return archivePaymentDistributions(db, tenantId, id);
}

