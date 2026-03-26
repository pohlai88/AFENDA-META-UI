import { Decimal } from "decimal.js";

// ── Types ──────────────────────────────────────────────────────────────────

export type CreateVariantPolicy = "always" | "dynamic" | "no_variant";

export interface AttributeValue {
  id: string;
  name: string;
  /** Price surcharge added when this value is selected (from product_template_attribute_values). */
  priceExtra: Decimal | string | number;
}

export interface AttributeLine {
  /** FK to product_attributes.id */
  attributeId: string;
  /** Controls display order in Cartesian product generation. */
  sequence: number;
  values: AttributeValue[];
}

export interface VariantCombination {
  /** Sorted list of attribute value IDs that uniquely identify this variant. */
  attributeValueIds: string[];
  /** Sum of all price_extra values for this combination. */
  priceExtra: Decimal;
}

export interface PricedVariant {
  /** Canonical sorted combination indices string (matches product_variants.combination_indices). */
  combinationIndices: string;
  /** Final computed price = template.list_price + sum(price_extra). */
  unitPrice: Decimal;
}

// ── generateVariantMatrix ──────────────────────────────────────────────────

/**
 * Produces a full Cartesian product of all attribute value combinations for a
 * product template. Each element represents one concrete variant that should
 * be persisted as a product_variants row.
 *
 * Attribute lines are sorted by `sequence` before expansion so that the
 * resulting `attributeValueIds` array (and derived `combinationIndices`) is
 * fully deterministic regardless of input order.
 *
 * A template with no attribute lines returns a single empty combination
 * (representing a non-configurable product with a single implicit variant).
 */
export function generateVariantMatrix(attributeLines: AttributeLine[]): VariantCombination[] {
  if (attributeLines.length === 0) {
    return [{ attributeValueIds: [], priceExtra: new Decimal(0) }];
  }

  const sorted = [...attributeLines].sort((a, b) => a.sequence - b.sequence);

  let combinations: VariantCombination[] = [{ attributeValueIds: [], priceExtra: new Decimal(0) }];

  for (const line of sorted) {
    const expanded: VariantCombination[] = [];
    for (const existing of combinations) {
      for (const val of line.values) {
        expanded.push({
          attributeValueIds: [...existing.attributeValueIds, val.id],
          priceExtra: existing.priceExtra.plus(new Decimal(String(val.priceExtra))),
        });
      }
    }
    combinations = expanded;
  }

  return combinations;
}

// ── getVariantPrice ────────────────────────────────────────────────────────

/**
 * Computes the effective unit price for a product variant.
 *
 * Calculation: `template.list_price + Σ(price_extra for all selected attribute values)`
 *
 * All inputs are accepted as Decimal-compatible strings, numbers, or Decimal
 * instances to avoid floating-point precision loss on financial amounts.
 */
export function getVariantPrice(
  templateListPrice: Decimal | string | number,
  priceExtras: Array<Decimal | string | number>
): Decimal {
  const base = new Decimal(String(templateListPrice));
  const extras = priceExtras.reduce<Decimal>(
    (acc, extra) => acc.plus(new Decimal(String(extra))),
    new Decimal(0)
  );
  return base.plus(extras);
}

// ── buildCombinationIndices ────────────────────────────────────────────────

/**
 * Builds a canonical, sorted combination-indices string from a set of
 * attribute value IDs. The result matches the format stored in
 * `product_variants.combination_indices`.
 *
 * Sorting is alphabetical (UUID lexicographic) to guarantee uniqueness
 * regardless of attribute line ordering.
 */
export function buildCombinationIndices(attributeValueIds: string[]): string {
  return [...attributeValueIds].sort().join(",");
}

// ── validateVariantCombination ─────────────────────────────────────────────

export type ValidationResult = { valid: true } | { valid: false; reason: string };

/**
 * Validates that a set of selected attribute value IDs forms a complete,
 * non-duplicate, fully-covered combination for the given template.
 *
 * Rules enforced:
 * 1. Each selected value must belong to a known attribute line on the template.
 * 2. No attribute may appear more than once (no duplicate selections).
 * 3. Every attribute line must be covered (no missing attributes).
 */
export function validateVariantCombination(
  attributeLines: AttributeLine[],
  selectedValueIds: string[]
): ValidationResult {
  const coveredAttributeIds = new Set<string>();

  // Rule 1 + 2: verify membership and uniqueness
  for (const valueId of selectedValueIds) {
    const line = attributeLines.find((l) => l.values.some((v) => v.id === valueId));
    if (!line) {
      return {
        valid: false,
        reason: `Value "${valueId}" does not belong to any attribute line on this template`,
      };
    }
    if (coveredAttributeIds.has(line.attributeId)) {
      return {
        valid: false,
        reason: `Duplicate attribute: attribute "${line.attributeId}" is represented more than once in the selection`,
      };
    }
    coveredAttributeIds.add(line.attributeId);
  }

  // Rule 3: all attribute lines must be covered
  for (const line of attributeLines) {
    if (!coveredAttributeIds.has(line.attributeId)) {
      return {
        valid: false,
        reason: `Missing attribute "${line.attributeId}" — every attribute line must have exactly one value selected`,
      };
    }
  }

  return { valid: true };
}
