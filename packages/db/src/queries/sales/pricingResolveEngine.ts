/**
 * Deterministic pricing resolution — pure functions over loaded pricelist rules + product facts.
 *
 * Callers load `rules` (e.g. `pricelist_items` for tenant) and pass `ResolvePriceContext`.
 * Persist outputs via `persistLineResolution` using `appliedRuleIds`, `basePrice` / `finalPrice`,
 * `input_snapshot.pricing_snapshot` from {@link buildPricingSnapshot}.
 *
 * ## Determinism
 * - Rule order: `PRICELIST_APPLIED_ON_PRECEDENCE` → `sequence` ASC → `id` ASC
 * - Recursion: visited-pricelist set + max depth (default 5)
 * - Discounts: sorted by `sequence` ASC; percents multiplicative in order, then amount ÷ quantity
 *
 * ## Locking
 * Immutability after truth lock is enforced by DB (`price_resolutions.locked_at`); use {@link assertPricingResolutionUnlocked}
 * before recomputation in application code.
 */
import { Decimal } from "decimal.js";

import type { PricelistAppliedOn } from "../../schema/sales/_enums.js";
import type { PricelistItem } from "../../schema/sales/pricing.js";
import { PRICELIST_APPLIED_ON_PRECEDENCE } from "../../schema/sales/pricingTruth.js";

export const PRICING_RESOLVE_ENGINE_VERSION = "v2-pricing-resolve-engine";

export const DEFAULT_MAX_PRICELIST_DEPTH = 5;

export type PricelistComputePrice = "fixed" | "percentage" | "formula";
export type PricelistBaseType = "list_price" | "standard_price" | "pricelist";

/** Normalized pricelist line — map from `sales.pricelist_items` (numeric columns as decimal strings). */
export type PricelistItemRuleInput = {
  id: string;
  pricelistId: string;
  appliedOn: PricelistAppliedOn;
  productTmplId: string | null;
  productId: string | null;
  categId: string | null;
  minQuantity: string;
  dateStart: Date | null;
  dateEnd: Date | null;
  effectiveFrom: Date;
  effectiveTo: Date | null;
  supersededBy: string | null;
  computePrice: PricelistComputePrice;
  fixedPrice: string | null;
  percentPrice: string | null;
  base: PricelistBaseType;
  basePricelistId: string | null;
  priceSurcharge: string;
  priceDiscount: string;
  priceRound: string | null;
  sequence: number;
  isActive: boolean;
};

export type ProductPricingFacts = {
  listPrice: string;
  standardPrice: string;
};

export type LineDiscountInput = {
  id?: string;
  sequence: number;
  discountPercent: string | null;
  discountAmount: string | null;
};

export type RoundingPolicyInput = {
  roundingMethod: "round" | "ceil" | "floor" | "truncate";
  roundingPrecision: number;
  roundingUnit: string | null;
};

export type ResolvePriceContext = {
  tenantId: number;
  pricelistId: string;
  productId: string;
  productTemplateId: string;
  categoryIds: readonly string[];
  quantity: string;
  asOf: Date;
  currencyId: number;
  /** All relevant `pricelist_items` rows (any pricelist) the engine may recurse into. */
  rules: readonly PricelistItemRuleInput[];
  productFacts: ProductPricingFacts;
  lineDiscounts?: readonly LineDiscountInput[];
  discountPolicy?: "with_discount" | "without_discount";
  roundingPolicy?: RoundingPolicyInput | null;
  maxPricelistDepth?: number;
};

export type PricingTraceStep = {
  kind: string;
  detail: Record<string, unknown>;
};

export type DiscountBreakdownEntry = {
  discountId?: string;
  sequence: number;
  kind: "percent" | "amount";
  before: string;
  after: string;
  appliedValue: string;
};

export type PricingResolutionSuccess = {
  ok: true;
  /** Unit price after rule + line discounts + global rounding. */
  finalUnitPrice: string;
  /** Unit price after rule arithmetic (before document line discounts). */
  unitPriceAfterRule: string;
  /** Base amount the winning rule used (list/standard/recursive pricelist). */
  basePrice: string;
  winningRuleId: string | null;
  appliedRuleIds: string[];
  rulePath: string[];
  discountBreakdown: DiscountBreakdownEntry[];
  roundingApplied: {
    method: string;
    precision: number;
    unit: string | null;
  } | null;
  trace: PricingTraceStep[];
};

export type PricingResolutionFailure = {
  ok: false;
  code:
    | "PRICELIST_CYCLE"
    | "PRICELIST_DEPTH_EXCEEDED"
    | "MISSING_BASE_PRICELIST"
    | "MISSING_FIXED_PRICE"
    | "MISSING_PERCENT_PRICE"
    | "INVALID_FORMULA"
    | "NEGATIVE_PRICE";
  message: string;
  trace: PricingTraceStep[];
};

export type PricingResolutionResult = PricingResolutionSuccess | PricingResolutionFailure;

export class PricingResolutionLockedError extends Error {
  constructor(message = "Price resolution is locked; mutation or recompute is not allowed") {
    super(message);
    this.name = "PricingResolutionLockedError";
  }
}

export function assertPricingResolutionUnlocked(resolution: {
  lockedAt: Date | null | undefined;
  truthBindingId: string | null | undefined;
}): void {
  if (resolution.lockedAt != null || resolution.truthBindingId != null) {
    throw new PricingResolutionLockedError();
  }
}

function moneyString(d: Decimal): string {
  return d.toDecimalPlaces(2, Decimal.ROUND_HALF_UP).toFixed(2);
}

function snapToStep(u: Decimal, stepStr: string): Decimal {
  const step = new Decimal(stepStr);
  if (step.lte(0)) return u;
  const q = u.div(step);
  const rounded = q.toDecimalPlaces(0, Decimal.ROUND_HALF_UP);
  return rounded.times(step);
}

export function applyRoundingPolicy(price: Decimal, policy: RoundingPolicyInput | null | undefined): Decimal {
  if (policy == null) {
    return price.toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
  }
  const prec = policy.roundingPrecision;
  const unit = policy.roundingUnit != null && policy.roundingUnit !== "" ? new Decimal(policy.roundingUnit) : null;

  if (unit != null && unit.gt(0)) {
    const q = price.div(unit);
    let n: Decimal;
    switch (policy.roundingMethod) {
      case "ceil":
        n = q.ceil();
        break;
      case "floor":
        n = q.floor();
        break;
      case "truncate":
        n = q.toDecimalPlaces(0, Decimal.ROUND_DOWN);
        break;
      default:
        n = q.toDecimalPlaces(0, Decimal.ROUND_HALF_UP);
    }
    return n.times(unit);
  }

  const mode =
    policy.roundingMethod === "ceil"
      ? Decimal.ROUND_CEIL
      : policy.roundingMethod === "floor"
        ? Decimal.ROUND_FLOOR
        : policy.roundingMethod === "truncate"
          ? Decimal.ROUND_DOWN
          : Decimal.ROUND_HALF_UP;

  return price.toDecimalPlaces(prec, mode);
}

function isRuleEligible(rule: PricelistItemRuleInput, ctx: ResolvePriceContext): boolean {
  if (!rule.isActive) return false;
  if (rule.supersededBy != null) return false;
  const t = ctx.asOf.getTime();
  if (rule.effectiveFrom.getTime() > t) return false;
  if (rule.effectiveTo != null && rule.effectiveTo.getTime() < t) return false;
  if (rule.dateStart != null && rule.dateStart.getTime() > t) return false;
  if (rule.dateEnd != null && rule.dateEnd.getTime() < t) return false;
  return new Decimal(ctx.quantity).gte(rule.minQuantity);
}

function ruleMatchesScope(rule: PricelistItemRuleInput, ctx: ResolvePriceContext): boolean {
  switch (rule.appliedOn) {
    case "global":
      return true;
    case "product_variant":
      return rule.productId === ctx.productId;
    case "product_template":
      return rule.productTmplId === ctx.productTemplateId;
    case "product_category":
      return rule.categId != null && ctx.categoryIds.includes(rule.categId);
    default:
      return false;
  }
}

function sortRulesForDeterminism(a: PricelistItemRuleInput, b: PricelistItemRuleInput): number {
  const pa = PRICELIST_APPLIED_ON_PRECEDENCE[a.appliedOn];
  const pb = PRICELIST_APPLIED_ON_PRECEDENCE[b.appliedOn];
  if (pa !== pb) return pa - pb;
  if (a.sequence !== b.sequence) return a.sequence - b.sequence;
  return a.id.localeCompare(b.id);
}

export function selectApplicableRules(
  pricelistId: string,
  ctx: ResolvePriceContext
): PricelistItemRuleInput[] {
  const candidates = ctx.rules.filter(
    (r) => r.pricelistId === pricelistId && isRuleEligible(r, ctx) && ruleMatchesScope(r, ctx)
  );
  candidates.sort(sortRulesForDeterminism);
  return candidates;
}

export function pickWinningRule(
  pricelistId: string,
  ctx: ResolvePriceContext
): PricelistItemRuleInput | null {
  const sorted = selectApplicableRules(pricelistId, ctx);
  return sorted[0] ?? null;
}

/** Map a Drizzle `pricelist_items` row into engine input (caller filters `deleted_at` / tenant). */
export function pricelistItemRowToRuleInput(row: PricelistItem): PricelistItemRuleInput {
  return {
    id: row.id,
    pricelistId: row.pricelistId,
    appliedOn: row.appliedOn,
    productTmplId: row.productTmplId,
    productId: row.productId,
    categId: row.categId,
    minQuantity: String(row.minQuantity),
    dateStart: row.dateStart,
    dateEnd: row.dateEnd,
    effectiveFrom: row.effectiveFrom,
    effectiveTo: row.effectiveTo,
    supersededBy: row.supersededBy,
    computePrice: row.computePrice,
    fixedPrice: row.fixedPrice != null ? String(row.fixedPrice) : null,
    percentPrice: row.percentPrice != null ? String(row.percentPrice) : null,
    base: row.base,
    basePricelistId: row.basePricelistId,
    priceSurcharge: String(row.priceSurcharge),
    priceDiscount: String(row.priceDiscount),
    priceRound: row.priceRound != null ? String(row.priceRound) : null,
    sequence: row.sequence,
    isActive: row.isActive,
  };
}

function isPricingFailure(x: Decimal | PricingResolutionFailure): x is PricingResolutionFailure {
  return (x as PricingResolutionFailure).ok === false;
}

function applyComputeAndAdjustments(rule: PricelistItemRuleInput, base: Decimal): Decimal | PricingResolutionFailure {
  let u: Decimal;
  switch (rule.computePrice) {
    case "fixed": {
      if (rule.fixedPrice == null) {
        return {
          ok: false,
          code: "MISSING_FIXED_PRICE",
          message: "computePrice fixed requires fixedPrice",
          trace: [],
        };
      }
      u = new Decimal(rule.fixedPrice);
      break;
    }
    case "percentage": {
      if (rule.percentPrice == null) {
        return {
          ok: false,
          code: "MISSING_PERCENT_PRICE",
          message: "computePrice percentage requires percentPrice",
          trace: [],
        };
      }
      u = base.times(new Decimal(rule.percentPrice).div(100));
      break;
    }
    case "formula": {
      const p =
        rule.percentPrice != null ? new Decimal(rule.percentPrice).div(100) : new Decimal(1);
      const f = rule.fixedPrice != null ? new Decimal(rule.fixedPrice) : new Decimal(0);
      u = base.times(p).plus(f);
      break;
    }
    default:
      return {
        ok: false,
        code: "INVALID_FORMULA",
        message: `unsupported computePrice: ${String(rule.computePrice)}`,
        trace: [],
      };
  }

  u = u.plus(new Decimal(rule.priceSurcharge));
  const disc = new Decimal(rule.priceDiscount);
  u = u.times(new Decimal(1).minus(disc.div(100)));

  if (rule.priceRound != null && rule.priceRound !== "") {
    u = snapToStep(u, rule.priceRound);
  }

  if (u.lt(0)) {
    return {
      ok: false,
      code: "NEGATIVE_PRICE",
      message: "computed unit price is negative after rule adjustments",
      trace: [],
    };
  }
  return u;
}

type InnerOk = {
  ok: true;
  unitAfterRule: string;
  winningRuleId: string | null;
  appliedRuleIds: string[];
  /** Base fed into the winning rule's compute (for `price_resolutions.base_price`). */
  ruleInputBase: string;
};

/** Recursive resolution for nested base pricelists — merges applied ids from inner wins. */
function resolveRuleUnitOnPricelistWithApplied(
  pricelistId: string,
  ctx: ResolvePriceContext,
  depth: number,
  visited: Set<string>,
  trace: PricingTraceStep[],
  maxDepth: number
): InnerOk | PricingResolutionFailure {
  const rule = pickWinningRule(pricelistId, ctx);
  if (rule == null) {
    const fb = new Decimal(ctx.productFacts.listPrice);
    trace.push({
      kind: "fallback:list_price",
      detail: { pricelistId, value: moneyString(fb) },
    });
    return {
      ok: true,
      unitAfterRule: moneyString(fb),
      winningRuleId: null,
      appliedRuleIds: [],
      ruleInputBase: moneyString(fb),
    };
  }

  let baseAmount: Decimal;
  const appliedIds: string[] = [];

  if (rule.base === "list_price") {
    baseAmount = new Decimal(ctx.productFacts.listPrice);
    trace.push({ kind: "base:list_price", detail: { value: moneyString(baseAmount) } });
  } else if (rule.base === "standard_price") {
    baseAmount = new Decimal(ctx.productFacts.standardPrice);
    trace.push({ kind: "base:standard_price", detail: { value: moneyString(baseAmount) } });
  } else if (rule.base === "pricelist") {
    if (rule.basePricelistId == null) {
      return {
        ok: false,
        code: "MISSING_BASE_PRICELIST",
        message: "base is pricelist but basePricelistId is null",
        trace,
      };
    }
    if (visited.has(rule.basePricelistId)) {
      return {
        ok: false,
        code: "PRICELIST_CYCLE",
        message: `pricelist recursion cycle at ${rule.basePricelistId}`,
        trace,
      };
    }
    if (depth >= maxDepth) {
      return {
        ok: false,
        code: "PRICELIST_DEPTH_EXCEEDED",
        message: `max pricelist depth ${maxDepth} exceeded`,
        trace,
      };
    }
    visited.add(rule.basePricelistId);
    trace.push({
      kind: "base:pricelist_recurse",
      detail: { basePricelistId: rule.basePricelistId, depth: depth + 1 },
    });
    const inner = resolveRuleUnitOnPricelistWithApplied(
      rule.basePricelistId,
      ctx,
      depth + 1,
      visited,
      trace,
      maxDepth
    );
    visited.delete(rule.basePricelistId);
    if (!inner.ok) return inner;
    baseAmount = new Decimal(inner.unitAfterRule);
    appliedIds.push(...inner.appliedRuleIds);
  } else {
    return {
      ok: false,
      code: "INVALID_FORMULA",
      message: `unknown base type: ${String(rule.base)}`,
      trace,
    };
  }

  const computed = applyComputeAndAdjustments(rule, baseAmount);
  if (isPricingFailure(computed)) {
    return { ...computed, trace: [...trace, ...computed.trace] };
  }
  const u = computed;

  trace.push({
    kind: "rule_applied",
    detail: {
      ruleId: rule.id,
      pricelistId,
      base: moneyString(baseAmount),
      unitAfterRule: moneyString(u),
    },
  });

  appliedIds.push(rule.id);
  return {
    ok: true,
    unitAfterRule: moneyString(u),
    winningRuleId: rule.id,
    appliedRuleIds: appliedIds,
    ruleInputBase: moneyString(baseAmount),
  };
}

export function applyLineDiscountsSequential(
  unit: Decimal,
  quantity: string,
  discounts: readonly LineDiscountInput[] | undefined,
  discountPolicy: "with_discount" | "without_discount" | undefined,
  trace: PricingTraceStep[]
): { price: Decimal; breakdown: DiscountBreakdownEntry[] } {
  if (discountPolicy === "without_discount" || discounts == null || discounts.length === 0) {
    return { price: unit, breakdown: [] };
  }

  const sorted = [...discounts].sort((a, b) => a.sequence - b.sequence);
  const breakdown: DiscountBreakdownEntry[] = [];
  let p = unit;
  const q = new Decimal(quantity);

  for (const d of sorted) {
    const before = moneyString(p);
    if (d.discountPercent != null && d.discountPercent !== "") {
      const pct = new Decimal(d.discountPercent);
      p = p.times(new Decimal(1).minus(pct.div(100)));
      trace.push({
        kind: "discount:percent",
        detail: { sequence: d.sequence, percent: d.discountPercent },
      });
      breakdown.push({
        discountId: d.id,
        sequence: d.sequence,
        kind: "percent",
        before,
        after: moneyString(p),
        appliedValue: d.discountPercent,
      });
    } else if (d.discountAmount != null && d.discountAmount !== "") {
      const perUnit = new Decimal(d.discountAmount).div(q);
      p = p.minus(perUnit);
      trace.push({
        kind: "discount:amount",
        detail: { sequence: d.sequence, amount: d.discountAmount, quantity },
      });
      breakdown.push({
        discountId: d.id,
        sequence: d.sequence,
        kind: "amount",
        before,
        after: moneyString(p),
        appliedValue: d.discountAmount,
      });
    }
    if (p.lt(0)) {
      p = new Decimal(0);
    }
  }

  return { price: p, breakdown };
}

/**
 * Full deterministic path for one product line on a pricelist at `asOf`.
 */
export function resolvePrice(ctx: ResolvePriceContext): PricingResolutionResult {
  const maxDepth = ctx.maxPricelistDepth ?? DEFAULT_MAX_PRICELIST_DEPTH;
  const trace: PricingTraceStep[] = [];
  const visited = new Set<string>();
  visited.add(ctx.pricelistId);

  const core = resolveRuleUnitOnPricelistWithApplied(
    ctx.pricelistId,
    ctx,
    0,
    visited,
    trace,
    maxDepth
  );
  if (!core.ok) return core;

  const unitAfterRule = new Decimal(core.unitAfterRule);
  const { price: afterDiscounts, breakdown } = applyLineDiscountsSequential(
    unitAfterRule,
    ctx.quantity,
    ctx.lineDiscounts,
    ctx.discountPolicy ?? "with_discount",
    trace
  );

  if (afterDiscounts.lt(0)) {
    return {
      ok: false,
      code: "NEGATIVE_PRICE",
      message: "final unit price negative after discounts",
      trace,
    };
  }

  const rounded = applyRoundingPolicy(afterDiscounts, ctx.roundingPolicy ?? null);
  const finalUnitPrice = moneyString(rounded);

  const roundingApplied =
    ctx.roundingPolicy != null
      ? {
          method: ctx.roundingPolicy.roundingMethod,
          precision: ctx.roundingPolicy.roundingPrecision,
          unit: ctx.roundingPolicy.roundingUnit,
        }
      : { method: "round", precision: 2, unit: null as string | null };

  return {
    ok: true,
    finalUnitPrice,
    unitPriceAfterRule: moneyString(unitAfterRule),
    basePrice: core.ruleInputBase,
    winningRuleId: core.winningRuleId,
    appliedRuleIds: core.appliedRuleIds,
    rulePath: core.appliedRuleIds.map((id) => `pricelist_item:${id}`),
    discountBreakdown: breakdown,
    roundingApplied: ctx.roundingPolicy != null ? roundingApplied : null,
    trace,
  };
}

/** JSON-safe snapshot for `price_resolutions.input_snapshot.pricing_snapshot`. */
export function buildPricingSnapshot(result: PricingResolutionSuccess): Record<string, unknown> {
  return {
    engine_version: PRICING_RESOLVE_ENGINE_VERSION,
    winning_rule_id: result.winningRuleId,
    applied_rule_ids: result.appliedRuleIds,
    rule_path: result.rulePath,
    base_price: result.basePrice,
    unit_price_after_rule: result.unitPriceAfterRule,
    final_unit_price: result.finalUnitPrice,
    discount_breakdown: result.discountBreakdown,
    rounding: result.roundingApplied,
    trace: result.trace,
  };
}

/**
 * Resolve many lines sharing the same rules catalog (single fetch). Keys are caller-supplied `lineId`.
 */
export function resolveOrderPricing(
  lines: ReadonlyArray<{ lineId: string; context: ResolvePriceContext }>
): Map<string, PricingResolutionResult> {
  const out = new Map<string, PricingResolutionResult>();
  for (const row of lines) {
    out.set(row.lineId, resolvePrice(row.context));
  }
  return out;
}
