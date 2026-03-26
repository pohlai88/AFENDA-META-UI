import type {
  CommissionBase,
  CommissionEntry,
  CommissionEntryStatus,
  CommissionPlan,
  CommissionPlanTier,
  NewCommissionEntry,
} from "@afenda/db/schema-domain";

type DecimalLike = number | string;

export interface CommissionMetrics {
  revenue?: DecimalLike;
  profit?: DecimalLike;
  margin?: DecimalLike;
}

export interface CommissionBreakdownLine {
  tierId: CommissionPlanTier["id"];
  minAmount: string;
  maxAmount: string | null;
  rate: string;
  matchedBaseAmount: string;
  commissionAmount: string;
}

export interface CommissionCalculationResult {
  base: CommissionBase;
  baseAmount: string;
  commissionAmount: string;
  effectiveRate: string | null;
  matchedTierIds: Array<CommissionPlanTier["id"]>;
  breakdown: CommissionBreakdownLine[];
}

export interface CommissionCalculationInput {
  plan: Pick<CommissionPlan, "id" | "tenantId" | "type" | "base" | "isActive">;
  tiers: Array<
    Pick<CommissionPlanTier, "id" | "planId" | "minAmount" | "maxAmount" | "rate" | "sequence">
  >;
  metrics: CommissionMetrics;
}

export interface BuildCommissionEntryDraftInput extends CommissionCalculationInput {
  tenantId: NewCommissionEntry["tenantId"];
  orderId: NewCommissionEntry["orderId"];
  salespersonId: NewCommissionEntry["salespersonId"];
  createdBy?: NewCommissionEntry["createdBy"];
  updatedBy?: NewCommissionEntry["updatedBy"];
  periodStart: NewCommissionEntry["periodStart"];
  periodEnd: NewCommissionEntry["periodEnd"];
  notes?: NewCommissionEntry["notes"];
  status?: Extract<CommissionEntryStatus, "draft" | "approved">;
}

export interface CommissionSummary {
  count: number;
  baseAmountTotal: string;
  commissionAmountTotal: string;
  byStatus: Record<CommissionEntryStatus, { count: number; commissionAmountTotal: string }>;
}

type EngineTier = CommissionCalculationInput["tiers"][number];

export class CommissionEngineError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CommissionEngineError";
  }
}

export function calculateCommission(
  input: CommissionCalculationInput
): CommissionCalculationResult {
  if (!input.plan.isActive) {
    throw new CommissionEngineError("Commission plan is inactive.");
  }

  const baseAmount = resolveCommissionBaseAmount(input.plan.base, input.metrics);
  const tiers = sortTiers(input.tiers, input.plan.id);

  if (input.plan.type === "tiered") {
    return calculateTieredCommission(input.plan.base, baseAmount, tiers);
  }

  const matchedTier = findMatchingTier(baseAmount, tiers);
  if (!matchedTier) {
    throw new CommissionEngineError("No commission tier matches the calculated base amount.");
  }

  const rate = parseDecimal(matchedTier.rate, "tier rate");
  const commissionAmount =
    input.plan.type === "flat" ? rate : roundCurrency(baseAmount * (rate / 100));
  const effectiveRate =
    baseAmount === 0 ? null : roundRate((commissionAmount / baseAmount) * 100).toFixed(4);

  return {
    base: input.plan.base,
    baseAmount: formatCurrency(baseAmount),
    commissionAmount: formatCurrency(commissionAmount),
    effectiveRate,
    matchedTierIds: [matchedTier.id],
    breakdown: [
      {
        tierId: matchedTier.id,
        minAmount: formatCurrency(parseDecimal(matchedTier.minAmount, "tier minimum")),
        maxAmount:
          matchedTier.maxAmount === null
            ? null
            : formatCurrency(parseDecimal(matchedTier.maxAmount, "tier maximum")),
        rate: roundRate(rate).toFixed(4),
        matchedBaseAmount: formatCurrency(baseAmount),
        commissionAmount: formatCurrency(commissionAmount),
      },
    ],
  };
}

export function buildCommissionEntryDraft(
  input: BuildCommissionEntryDraftInput
): Omit<NewCommissionEntry, "id"> {
  const calculation = calculateCommission(input);
  const actorId = input.createdBy ?? input.updatedBy ?? input.salespersonId;

  return {
    tenantId: input.tenantId,
    createdBy: input.createdBy ?? actorId,
    updatedBy: input.updatedBy ?? actorId,
    orderId: input.orderId,
    salespersonId: input.salespersonId,
    planId: input.plan.id,
    baseAmount: calculation.baseAmount,
    commissionAmount: calculation.commissionAmount,
    status: input.status ?? "draft",
    paidDate: null,
    periodStart: input.periodStart,
    periodEnd: input.periodEnd,
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
): Omit<TEntry, "status" | "paidDate"> & { status: "paid"; paidDate: Date } {
  if (entry.status === "draft") {
    throw new CommissionEngineError("Draft commission entries must be approved before payment.");
  }

  return {
    ...entry,
    status: "paid",
    paidDate,
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

function calculateTieredCommission(
  base: CommissionBase,
  baseAmount: number,
  tiers: EngineTier[]
): CommissionCalculationResult {
  const breakdown: CommissionBreakdownLine[] = [];
  let commissionAmount = 0;

  for (const tier of tiers) {
    const minAmount = parseDecimal(tier.minAmount, "tier minimum");
    const maxAmount =
      tier.maxAmount === null
        ? Number.POSITIVE_INFINITY
        : parseDecimal(tier.maxAmount, "tier maximum");

    if (baseAmount <= minAmount) {
      continue;
    }

    const matchedBaseAmount = Math.max(0, Math.min(baseAmount, maxAmount) - minAmount);
    if (matchedBaseAmount <= 0) {
      continue;
    }

    const rate = parseDecimal(tier.rate, "tier rate");
    const tierCommissionAmount = roundCurrency(matchedBaseAmount * (rate / 100));
    commissionAmount += tierCommissionAmount;

    breakdown.push({
      tierId: tier.id,
      minAmount: formatCurrency(minAmount),
      maxAmount: Number.isFinite(maxAmount) ? formatCurrency(maxAmount) : null,
      rate: roundRate(rate).toFixed(4),
      matchedBaseAmount: formatCurrency(matchedBaseAmount),
      commissionAmount: formatCurrency(tierCommissionAmount),
    });
  }

  if (breakdown.length === 0) {
    throw new CommissionEngineError(
      "No commission tiers contribute to the calculated base amount."
    );
  }

  return {
    base,
    baseAmount: formatCurrency(baseAmount),
    commissionAmount: formatCurrency(commissionAmount),
    effectiveRate:
      baseAmount === 0 ? null : roundRate((commissionAmount / baseAmount) * 100).toFixed(4),
    matchedTierIds: breakdown.map((line) => line.tierId),
    breakdown,
  };
}

function resolveCommissionBaseAmount(base: CommissionBase, metrics: CommissionMetrics): number {
  const rawValue = metrics[base];

  if (rawValue === undefined || rawValue === null) {
    throw new CommissionEngineError(`Missing ${base} metric for commission calculation.`);
  }

  const amount = parseDecimal(rawValue, `${base} metric`);
  if (amount < 0) {
    throw new CommissionEngineError(`Commission base ${base} cannot be negative.`);
  }

  return amount;
}

function sortTiers(
  tiers: CommissionCalculationInput["tiers"],
  planId: CommissionPlan["id"]
): EngineTier[] {
  if (tiers.length === 0) {
    throw new CommissionEngineError("Commission plan requires at least one tier.");
  }

  return [...tiers]
    .map((tier) => {
      if (tier.planId !== planId) {
        throw new CommissionEngineError("Commission tier does not belong to the selected plan.");
      }

      return tier;
    })
    .sort((left, right) => {
      if (left.sequence !== right.sequence) {
        return left.sequence - right.sequence;
      }

      return (
        parseDecimal(left.minAmount, "tier minimum") - parseDecimal(right.minAmount, "tier minimum")
      );
    });
}

function findMatchingTier(baseAmount: number, tiers: EngineTier[]): EngineTier | undefined {
  return tiers.find((tier) => {
    const minAmount = parseDecimal(tier.minAmount, "tier minimum");
    const maxAmount =
      tier.maxAmount === null
        ? Number.POSITIVE_INFINITY
        : parseDecimal(tier.maxAmount, "tier maximum");

    return baseAmount >= minAmount && baseAmount <= maxAmount;
  });
}

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

function roundRate(value: number): number {
  return Math.round((value + Number.EPSILON) * 10000) / 10000;
}

function formatCurrency(value: number): string {
  return roundCurrency(value).toFixed(2);
}
