import {
  calculateCommission as calculateCommissionCore,
  CommissionEngineError,
  formatDateOnlyUtc,
  type CommissionCalculationInput,
  type CommissionCalculationResult,
  type CommissionMetrics,
} from "@afenda/db";
import type {
  CommissionEntry,
  CommissionEntryStatus,
  CommissionPlan,
  CommissionPlanTier,
  NewCommissionEntry,
} from "@afenda/db/schema/sales";

export { formatDateOnlyUtc };

export type { CommissionMetrics, CommissionCalculationResult, CommissionCalculationInput };
export { CommissionEngineError };

export interface CommissionBreakdownLine {
  tierId: CommissionPlanTier["id"];
  minAmount: string;
  maxAmount: string | null;
  rate: string;
  matchedBaseAmount: string;
  commissionAmount: string;
}

export function calculateCommission(
  input: CommissionCalculationInput
): CommissionCalculationResult {
  return calculateCommissionCore(input);
}

export interface BuildCommissionEntryDraftInput extends CommissionCalculationInput {
  id?: NewCommissionEntry["id"];
  tenantId: NewCommissionEntry["tenantId"];
  orderId: NewCommissionEntry["orderId"];
  salespersonId: NewCommissionEntry["salespersonId"];
  createdBy?: NewCommissionEntry["createdBy"];
  updatedBy?: NewCommissionEntry["updatedBy"];
  periodStart: Date | string;
  periodEnd: Date | string;
  notes?: NewCommissionEntry["notes"];
  status?: Extract<CommissionEntryStatus, "draft" | "approved">;
  currencyId?: number | null;
  entryVersion?: number;
  priceResolutionId?: NewCommissionEntry["priceResolutionId"];
}

export interface CommissionSummary {
  count: number;
  baseAmountTotal: string;
  commissionAmountTotal: string;
  byStatus: Record<CommissionEntryStatus, { count: number; commissionAmountTotal: string }>;
}

function toDate(value: Date | string): Date {
  return value instanceof Date ? value : new Date(value);
}

export function buildCommissionEntryDraft(input: BuildCommissionEntryDraftInput): NewCommissionEntry {
  const calculation = calculateCommissionCore(input);
  const actorId = input.createdBy ?? input.updatedBy ?? input.salespersonId;

  return {
    id: input.id,
    tenantId: input.tenantId,
    entryVersion: input.entryVersion ?? 1,
    createdBy: input.createdBy ?? actorId,
    updatedBy: input.updatedBy ?? actorId,
    orderId: input.orderId,
    salespersonId: input.salespersonId,
    planId: input.plan.id,
    priceResolutionId: input.priceResolutionId ?? null,
    truthBindingId: null,
    currencyId: input.currencyId ?? null,
    baseAmount: calculation.baseAmount,
    commissionAmount: calculation.commissionAmount,
    status: input.status ?? "draft",
    paidDate: null,
    periodStart: formatDateOnlyUtc(toDate(input.periodStart)),
    periodEnd: formatDateOnlyUtc(toDate(input.periodEnd)),
    lockedAt: null,
    notes: input.notes ?? null,
  };
}

export function approveCommissionEntry<TEntry extends Pick<CommissionEntry, "status" | "paidDate">>(
  entry: TEntry
): Omit<TEntry, "status" | "paidDate"> & { status: "approved"; paidDate: null } {
  if (entry.status === "paid") {
    throw new CommissionEngineError("Paid commission entries cannot be moved back to approved.");
  }

  return {
    ...entry,
    status: "approved",
    paidDate: null,
  };
}

export function markCommissionEntryPaid<
  TEntry extends Pick<CommissionEntry, "status" | "paidDate">,
>(
  entry: TEntry,
  paidDate: Date = new Date()
): Omit<TEntry, "status" | "paidDate"> & { status: "paid"; paidDate: string } {
  if (entry.status === "draft") {
    throw new CommissionEngineError("Draft commission entries must be approved before payment.");
  }

  return {
    ...entry,
    status: "paid",
    paidDate: formatDateOnlyUtc(paidDate),
  };
}

export function summarizeCommissionEntries(
  entries: Array<Pick<CommissionEntry, "status" | "baseAmount" | "commissionAmount">>
): CommissionSummary {
  const seed = {
    draft: { count: 0, commissionAmountTotal: "0.00" },
    approved: { count: 0, commissionAmountTotal: "0.00" },
    paid: { count: 0, commissionAmountTotal: "0.00" },
  } satisfies Record<CommissionEntryStatus, { count: number; commissionAmountTotal: string }>;

  let baseAmountTotal = 0;
  let commissionAmountTotal = 0;

  for (const entry of entries) {
    const baseAmount = parseDecimal(entry.baseAmount, "entry base amount");
    const commissionAmount = parseDecimal(entry.commissionAmount, "entry commission amount");

    baseAmountTotal += baseAmount;
    commissionAmountTotal += commissionAmount;

    seed[entry.status] = {
      count: seed[entry.status].count + 1,
      commissionAmountTotal: formatCurrency(
        parseDecimal(seed[entry.status].commissionAmountTotal, "status total") + commissionAmount
      ),
    };
  }

  return {
    count: entries.length,
    baseAmountTotal: formatCurrency(baseAmountTotal),
    commissionAmountTotal: formatCurrency(commissionAmountTotal),
    byStatus: seed,
  };
}

type DecimalLike = number | string;

function parseDecimal(value: DecimalLike | null, label: string): number {
  if (value === null) {
    throw new CommissionEngineError(`${label} is required.`);
  }

  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(parsed)) {
    throw new CommissionEngineError(`${label} must be a finite number.`);
  }

  return parsed;
}

function roundCurrency(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function formatCurrency(value: number): string {
  return roundCurrency(value).toFixed(2);
}
