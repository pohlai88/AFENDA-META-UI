import type { CommissionPlan, CommissionPlanTier } from "../schema/sales/commission.js";
import type { commissionBases } from "../schema/sales/_enums.js";

type CommissionBase = (typeof commissionBases)[number];

type DecimalLike = number | string;

/** ISO calendar date `YYYY-MM-DD` in UTC derived from an instant. */
export function formatDateOnlyUtc(d: Date): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function addCalendarDaysUtc(isoDate: string, days: number): string {
  const [ys, ms, ds] = isoDate.split("-").map((s) => Number(s));
  const d = new Date(Date.UTC(ys!, ms! - 1, ds!));
  d.setUTCDate(d.getUTCDate() + days);
  return formatDateOnlyUtc(d);
}

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
  plan: Pick<
    CommissionPlan,
    "id" | "tenantId" | "type" | "base" | "isActive" | "calculationMode"
  >;
  tiers: Array<
    Pick<CommissionPlanTier, "id" | "planId" | "minAmount" | "maxAmount" | "rate" | "sequence">
  >;
  metrics: CommissionMetrics;
}

export class CommissionEngineError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CommissionEngineError";
  }
}

type EngineTier = CommissionCalculationInput["tiers"][number];

export function calculateCommission(
  input: CommissionCalculationInput
): CommissionCalculationResult {
  if (!input.plan.isActive) {
    throw new CommissionEngineError("Commission plan is inactive.");
  }

  const baseAmount = resolveCommissionBaseAmount(input.plan.base, input.metrics);
  const tiers = sortTiers(input.tiers, input.plan.id);

  if (input.plan.type === "tiered") {
    if (input.plan.calculationMode === "tiered_step") {
      return calculateTieredStep(input.plan.base, baseAmount, tiers);
    }
    return calculateTieredCumulative(input.plan.base, baseAmount, tiers);
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

/** Progressive brackets: each tier earns rate × overlap of base within [min, max). */
function calculateTieredCumulative(
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

/**
 * Step / flat-bracket: the single tier whose range contains the entire base applies its rate to
 * the **full** base (not marginal slices).
 */
function calculateTieredStep(
  base: CommissionBase,
  baseAmount: number,
  tiers: EngineTier[]
): CommissionCalculationResult {
  const tier = tiers.find((t) => tierContainsBase(baseAmount, t));
  if (!tier) {
    throw new CommissionEngineError("No commission tier contains the calculated base amount.");
  }

  const rate = parseDecimal(tier.rate, "tier rate");
  const commissionAmount = roundCurrency(baseAmount * (rate / 100));
  const minAmount = parseDecimal(tier.minAmount, "tier minimum");
  const maxAmount =
    tier.maxAmount === null ? null : parseDecimal(tier.maxAmount, "tier maximum");

  return {
    base,
    baseAmount: formatCurrency(baseAmount),
    commissionAmount: formatCurrency(commissionAmount),
    effectiveRate:
      baseAmount === 0 ? null : roundRate((commissionAmount / baseAmount) * 100).toFixed(4),
    matchedTierIds: [tier.id],
    breakdown: [
      {
        tierId: tier.id,
        minAmount: formatCurrency(minAmount),
        maxAmount: maxAmount === null ? null : formatCurrency(maxAmount),
        rate: roundRate(rate).toFixed(4),
        matchedBaseAmount: formatCurrency(baseAmount),
        commissionAmount: formatCurrency(commissionAmount),
      },
    ],
  };
}

function tierContainsBase(baseAmount: number, tier: EngineTier): boolean {
  const minAmount = parseDecimal(tier.minAmount, "tier minimum");
  const maxAmount =
    tier.maxAmount === null
      ? Number.POSITIVE_INFINITY
      : parseDecimal(tier.maxAmount, "tier maximum");
  return baseAmount >= minAmount && baseAmount <= maxAmount;
}

export type PaymentTermLineSlice = {
  sequence: number;
  valueType: "balance" | "percent" | "fixed";
  value: string;
  days: number;
};

export interface ProjectedCommissionLiability {
  installmentSeq: number;
  amount: string;
  dueDate: string;
  status: "accrued";
}

/**
 * Split commission cash across payment-term lines (percent/fixed/balance) and shift due dates by
 * each line’s `days` from `recognitionDate` (UTC calendar).
 */
export function projectCommissionLiabilitiesFromPaymentTerm(input: {
  commissionAmount: string;
  recognitionIsoDate: string;
  lines: PaymentTermLineSlice[];
}): ProjectedCommissionLiability[] {
  const total = parseDecimal(input.commissionAmount, "commissionAmount");
  if (total < 0) {
    throw new CommissionEngineError("commissionAmount cannot be negative.");
  }

  const sorted = [...input.lines].sort((a, b) => a.sequence - b.sequence);
  if (sorted.length === 0) {
    return [
      {
        installmentSeq: 1,
        amount: formatCurrency(total),
        dueDate: input.recognitionIsoDate,
        status: "accrued",
      },
    ];
  }

  const result: ProjectedCommissionLiability[] = [];
  let allocated = 0;
  let seq = 0;

  for (const line of sorted) {
    seq += 1;
    let slice: number;
    if (line.valueType === "percent") {
      slice = roundCurrency((total * parseDecimal(line.value, "percent")) / 100);
    } else if (line.valueType === "fixed") {
      slice = parseDecimal(line.value, "fixed slice");
    } else {
      slice = roundCurrency(total - allocated);
      if (slice < 0) {
        slice = 0;
      }
    }

    slice = Math.min(slice, roundCurrency(total - allocated));
    if (slice < 0) {
      slice = 0;
    }

    allocated = roundCurrency(allocated + slice);
    result.push({
      installmentSeq: seq,
      amount: formatCurrency(slice),
      dueDate: addCalendarDaysUtc(input.recognitionIsoDate, line.days),
      status: "accrued",
    });
  }

  const drift = roundCurrency(total - allocated);
  if (Math.abs(drift) > 0.01) {
    const last = result[result.length - 1]!;
    last.amount = formatCurrency(parseDecimal(last.amount, "installment") + drift);
  }

  return result;
}

function resolveCommissionBaseAmount(base: CommissionBase, metrics: CommissionMetrics): number {
  const rawValue =
    base === "revenue" ? metrics.revenue : base === "profit" ? metrics.profit : metrics.margin;

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
  return tiers.find((tier) => tierContainsBase(baseAmount, tier));
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
