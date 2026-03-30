// @generated
// Full access scaffold — tools/ci-gate/db-access-layer (emit-full).
// Human-owned reporting: use separate modules (not *.access.ts).

import { and, eq, isNull } from "drizzle-orm";
import type { Database } from "../../db.js";
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

/** List all rows for tenant including soft-deleted. */
export async function listSalaryComponentsAll(
  db: Database,
  tenantId: (typeof salaryComponents.$inferSelect)["tenantId"],
) {
  return await db.select().from(salaryComponents).where(eq(salaryComponents.tenantId, tenantId));
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

/** List all rows for tenant including soft-deleted. */
export async function listEmployeeSalariesAll(
  db: Database,
  tenantId: (typeof employeeSalaries.$inferSelect)["tenantId"],
) {
  return await db.select().from(employeeSalaries).where(eq(employeeSalaries.tenantId, tenantId));
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

/** List all rows for tenant including soft-deleted. */
export async function listPayrollPeriodsAll(
  db: Database,
  tenantId: (typeof payrollPeriods.$inferSelect)["tenantId"],
) {
  return await db.select().from(payrollPeriods).where(eq(payrollPeriods.tenantId, tenantId));
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

/** List all rows for tenant including soft-deleted. */
export async function listPayrollEntriesAll(
  db: Database,
  tenantId: (typeof payrollEntries.$inferSelect)["tenantId"],
) {
  return await db.select().from(payrollEntries).where(eq(payrollEntries.tenantId, tenantId));
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


/** By ID for tenant (no soft-delete column on table). */
export async function getPayrollLinesById(
  db: Database,
  tenantId: (typeof payrollLines.$inferSelect)["tenantId"],
  id: (typeof payrollLines.$inferSelect)["id"],
) {
  const rows = await db
    .select()
    .from(payrollLines)
    .where(and(eq(payrollLines.tenantId, tenantId), eq(payrollLines.id, id)))
    .limit(1);
  return rows[0] ?? null;
}

/** List rows for tenant. */
export async function listPayrollLines(
  db: Database,
  tenantId: (typeof payrollLines.$inferSelect)["tenantId"],
) {
  return await db.select().from(payrollLines).where(eq(payrollLines.tenantId, tenantId));
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

/** List all rows for tenant including soft-deleted. */
export async function listTaxBracketsAll(
  db: Database,
  tenantId: (typeof taxBrackets.$inferSelect)["tenantId"],
) {
  return await db.select().from(taxBrackets).where(eq(taxBrackets.tenantId, tenantId));
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

/** List all rows for tenant including soft-deleted. */
export async function listStatutoryDeductionsAll(
  db: Database,
  tenantId: (typeof statutoryDeductions.$inferSelect)["tenantId"],
) {
  return await db.select().from(statutoryDeductions).where(eq(statutoryDeductions.tenantId, tenantId));
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

/** List all rows for tenant including soft-deleted. */
export async function listPayrollAdjustmentsAll(
  db: Database,
  tenantId: (typeof payrollAdjustments.$inferSelect)["tenantId"],
) {
  return await db.select().from(payrollAdjustments).where(eq(payrollAdjustments.tenantId, tenantId));
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

/** List all rows for tenant including soft-deleted. */
export async function listPayslipsAll(
  db: Database,
  tenantId: (typeof payslips.$inferSelect)["tenantId"],
) {
  return await db.select().from(payslips).where(eq(payslips.tenantId, tenantId));
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


/** By ID for tenant (no soft-delete column on table). */
export async function getPaymentDistributionsById(
  db: Database,
  tenantId: (typeof paymentDistributions.$inferSelect)["tenantId"],
  id: (typeof paymentDistributions.$inferSelect)["id"],
) {
  const rows = await db
    .select()
    .from(paymentDistributions)
    .where(and(eq(paymentDistributions.tenantId, tenantId), eq(paymentDistributions.id, id)))
    .limit(1);
  return rows[0] ?? null;
}

/** List rows for tenant. */
export async function listPaymentDistributions(
  db: Database,
  tenantId: (typeof paymentDistributions.$inferSelect)["tenantId"],
) {
  return await db.select().from(paymentDistributions).where(eq(paymentDistributions.tenantId, tenantId));
}

