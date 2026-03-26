import { Decimal } from "decimal.js";

// ── Types ──────────────────────────────────────────────────────────────────

export type PricelistAppliedOn =
  | "global"
  | "product_template"
  | "product_variant"
  | "product_category";

export type PricelistComputeType = "fixed" | "percentage" | "formula";
export type PricelistBaseType = "list_price" | "standard_price" | "pricelist";
export type DiscountPolicy = "with_discount" | "without_discount";

export interface PricelistItem {
  id: string;
  appliedOn: PricelistAppliedOn;
  productTmplId: string | null;
  productId: string | null;
  categId: string | null;
  minQuantity: Decimal | string | number;
  dateStart: Date | null;
  dateEnd: Date | null;
  computePrice: PricelistComputeType;
  fixedPrice: Decimal | string | number | null;
  percentPrice: Decimal | string | number | null;
  base: PricelistBaseType;
  basePricelistId: string | null;
  priceSurcharge: Decimal | string | number;
  priceDiscount: Decimal | string | number;
  priceRound: Decimal | string | number | null;
  priceMinMargin: Decimal | string | number;
  priceMaxMargin: Decimal | string | number;
  sequence: number;
  isActive: boolean;
}

export interface Pricelist {
  id: string;
  discountPolicy: DiscountPolicy;
  isActive: boolean;
  items: PricelistItem[];
}

export interface PricedProduct {
  id: string;
  productTmplId?: string | null;
  categoryId?: string | null;
  /** Sales price / list price (unitPrice in DB). */
  listPrice: Decimal | string | number;
  /** Cost price. Required for margin clamping. */
  standardPrice?: Decimal | string | number | null;
}

export interface PriceResolutionContext {
  pricelist: Pricelist;
  product: PricedProduct;
  quantity?: Decimal | string | number;
  priceDate?: Date | null;
  /**
   * Resolver for chained pricelists (base = "pricelist").
   * Return null if the pricelist cannot be found; the engine falls back to list_price.
   */
  resolveBasePricelist?: (pricelistId: string) => Pricelist | null;
}

export interface PriceResult {
  price: Decimal;
  matchedItem: PricelistItem | null;
  appliedOn: PricelistAppliedOn | "no_rule";
}

// ── Specificity ranking ────────────────────────────────────────────────────

const SPECIFICITY_RANK: Record<PricelistAppliedOn, number> = {
  product_variant: 4,
  product_template: 3,
  product_category: 2,
  global: 1,
};

// ── Internal helpers ───────────────────────────────────────────────────────

function toDecimal(value: Decimal | string | number | null | undefined): Decimal {
  if (value == null) return new Decimal(0);
  return new Decimal(value);
}

function itemMatchesProduct(item: PricelistItem, product: PricedProduct): boolean {
  switch (item.appliedOn) {
    case "global":
      return true;
    case "product_variant":
      return item.productId != null && item.productId === product.id;
    case "product_template":
      return item.productTmplId != null && item.productTmplId === product.productTmplId;
    case "product_category":
      return item.categId != null && item.categId === product.categoryId;
    default:
      return false;
  }
}

function itemInDateRange(item: PricelistItem, date: Date): boolean {
  if (item.dateStart != null && date < item.dateStart) return false;
  if (item.dateEnd != null && date > item.dateEnd) return false;
  return true;
}

// ── Public helpers ─────────────────────────────────────────────────────────

/**
 * Filter and sort pricelist items for a given product, quantity, and date.
 * Returns items sorted by specificity (most specific first), then by sequence ascending.
 */
export function filterItemsForProduct(
  items: PricelistItem[],
  product: PricedProduct,
  quantity: Decimal | string | number,
  date: Date | null
): PricelistItem[] {
  const qty = toDecimal(quantity);
  const effectiveDate = date ?? new Date();

  return items
    .filter((item) => {
      if (!item.isActive) return false;
      if (!itemMatchesProduct(item, product)) return false;
      if (!itemInDateRange(item, effectiveDate)) return false;
      if (qty.lt(toDecimal(item.minQuantity))) return false;
      return true;
    })
    .sort((a, b) => {
      const rankDiff = SPECIFICITY_RANK[b.appliedOn] - SPECIFICITY_RANK[a.appliedOn];
      if (rankDiff !== 0) return rankDiff;
      return a.sequence - b.sequence;
    });
}

/**
 * Compute the base price for a pricelist item.
 * Handles list_price, standard_price, and recursive pricelist chaining (depth-limited to 5).
 */
export function getBasePrice(
  item: PricelistItem,
  product: PricedProduct,
  resolvePricelist: (id: string) => Pricelist | null,
  depth: number
): Decimal {
  if (depth > 5) {
    // Guard against infinite pricelist chains
    return toDecimal(product.listPrice);
  }

  switch (item.base) {
    case "list_price":
      return toDecimal(product.listPrice);
    case "standard_price":
      return toDecimal(product.standardPrice ?? product.listPrice);
    case "pricelist": {
      if (!item.basePricelistId) return toDecimal(product.listPrice);
      const basePl = resolvePricelist(item.basePricelistId);
      if (!basePl) return toDecimal(product.listPrice);
      return _resolvePrice(
        { pricelist: basePl, product, quantity: 1, priceDate: null, resolveBasePricelist: resolvePricelist },
        depth + 1
      ).price;
    }
    default:
      return toDecimal(product.listPrice);
  }
}

/**
 * Apply a pricelist item's formula to a base price.
 *
 * - fixed:      price = fixedPrice
 * - percentage: price = basePrice × (1 − percentPrice / 100)
 * - formula:    price = basePrice × (1 − priceDiscount / 100) + priceSurcharge
 *
 * Then: optional rounding → margin clamping → floor at zero.
 */
export function applyPriceFormula(
  item: PricelistItem,
  basePrice: Decimal,
  product: PricedProduct
): Decimal {
  let price: Decimal;

  switch (item.computePrice) {
    case "fixed":
      price = toDecimal(item.fixedPrice);
      break;
    case "percentage": {
      const pct = toDecimal(item.percentPrice);
      price = basePrice.mul(new Decimal(1).sub(pct.div(100)));
      break;
    }
    case "formula": {
      const discount = toDecimal(item.priceDiscount);
      const surcharge = toDecimal(item.priceSurcharge);
      price = basePrice.mul(new Decimal(1).sub(discount.div(100))).add(surcharge);
      break;
    }
    default:
      price = basePrice;
  }

  // Apply rounding step (round to nearest multiple of priceRound)
  if (item.priceRound != null) {
    const round = toDecimal(item.priceRound);
    if (round.gt(0)) {
      price = price.toNearest(round);
    }
  }

  // Apply margin clamping relative to cost (only when margins are non-zero)
  const cost = toDecimal(product.standardPrice);
  const minMargin = toDecimal(item.priceMinMargin);
  const maxMargin = toDecimal(item.priceMaxMargin);

  if (minMargin.gt(0)) {
    const floor = cost.add(minMargin);
    if (price.lt(floor)) price = floor;
  }
  if (maxMargin.gt(0)) {
    const ceiling = cost.add(maxMargin);
    if (price.gt(ceiling)) price = ceiling;
  }

  // Price cannot be negative
  if (price.lt(0)) price = new Decimal(0);

  return price;
}

// ── Core resolution ────────────────────────────────────────────────────────

function _resolvePrice(context: PriceResolutionContext, depth: number): PriceResult {
  const {
    pricelist,
    product,
    quantity = 1,
    priceDate = null,
    resolveBasePricelist = () => null,
  } = context;

  const matchedItems = filterItemsForProduct(pricelist.items, product, quantity, priceDate);

  if (matchedItems.length === 0) {
    return {
      price: toDecimal(product.listPrice),
      matchedItem: null,
      appliedOn: "no_rule",
    };
  }

  const bestItem = matchedItems[0]!;
  const basePrice = getBasePrice(bestItem, product, resolveBasePricelist, depth);
  const price = applyPriceFormula(bestItem, basePrice, product);

  return {
    price,
    matchedItem: bestItem,
    appliedOn: bestItem.appliedOn,
  };
}

/**
 * Resolve the final price for a product against a pricelist.
 *
 * Specificity priority: product_variant > product_template > product_category > global
 * Falls back to product.listPrice when no rule matches.
 */
export function resolvePrice(context: PriceResolutionContext): PriceResult {
  return _resolvePrice(context, 0);
}
