/**
 * Property-Based Test Generator
 * ==============================
 * Auto-generates property-based tests for pure functions using fast-check.
 *
 * Strategy:
 * - Identify pure functions (no side effects, deterministic)
 * - Generate property tests based on mathematical properties
 * - Use fast-check to generate random inputs
 *
 * Supported properties:
 * - Commutativity: f(a, b) === f(b, a)
 * - Associativity: f(f(a, b), c) === f(a, f(b, c))
 * - Identity: f(x, identity) === x
 * - Idempotence: f(f(x)) === f(x)
 * - Bounds: output always within valid range
 * - Inverse: decode(encode(x)) === x
 * - Monotonicity: a < b => f(a) <= f(b)
 */

import { describe, test, expect } from "vitest";
import fc from "fast-check";

type ArbitraryTuple = [fc.Arbitrary<unknown>, ...fc.Arbitrary<unknown>[]];

interface FastCheckConfig {
  seed?: number;
  numRuns?: number;
  verbose?: boolean;
}

export interface CustomPropertyDef {
  name: string;
  domain?: ArbitraryTuple;
  assert: (...args: unknown[]) => void;
}

/**
 * Function metadata for property generation
 */
export interface PureFunctionDef {
  name: string;
  fn: (...args: unknown[]) => unknown;
  domain: ArbitraryTuple; // Input generators
  properties: PropertyType[];
  inverseFn?: (value: unknown) => unknown;

  // Optional property parameters
  identityValue?: unknown;
  bounds?: { min: number; max: number };

  // Optional result projection for numeric assertions (e.g. Decimal -> number)
  projectResult?: (value: unknown) => number;

  // Optional custom property-based or deterministic tests for domain-specific invariants
  customProperties?: CustomPropertyDef[];
}

export type PropertyType =
  | "commutative"
  | "associative"
  | "identity"
  | "idempotent"
  | "bounded"
  | "inverse"
  | "monotonic";

export interface PropertyGeneratorOptions {
  fastCheck?: FastCheckConfig;
}

/**
 * Parse environment-driven fast-check controls for CI reproducibility.
 *
 * Environment variables:
 * - FASTCHECK_SEED: Random seed for reproducible test runs
 * - FASTCHECK_RUNS: Number of test cases per property (default: 100)
 * - FASTCHECK_VERBOSE: Enable verbose output (true/false)
 *
 * @example
 * ```bash
 * FASTCHECK_SEED=42 FASTCHECK_RUNS=1000 pnpm test
 * ```
 */
function parseEnvironmentConfig(): FastCheckConfig | undefined {
  const seed = process.env.FASTCHECK_SEED;
  const runs = process.env.FASTCHECK_RUNS;
  const verbose = process.env.FASTCHECK_VERBOSE;

  // Only return config if at least one env var is set
  if (!seed && !runs && !verbose) {
    return undefined;
  }

  const config: FastCheckConfig = {};

  if (seed) {
    const parsed = parseInt(seed, 10);
    if (!isNaN(parsed)) {
      config.seed = parsed;
    }
  }

  if (runs) {
    const parsed = parseInt(runs, 10);
    if (!isNaN(parsed) && parsed > 0) {
      config.numRuns = parsed;
    }
  }

  if (verbose) {
    config.verbose = verbose.toLowerCase() === "true" || verbose === "1";
  }

  return Object.keys(config).length > 0 ? config : undefined;
}

/**
 * Merge environment config with user-provided options.
 * User options take precedence over environment variables.
 */
function buildFastCheckConfig(options?: PropertyGeneratorOptions): FastCheckConfig | undefined {
  const envConfig = parseEnvironmentConfig();
  const userConfig = options?.fastCheck;

  if (!envConfig && !userConfig) {
    return undefined;
  }

  return { ...envConfig, ...userConfig };
}

/**
 * Generate commutativity test: f(a, b) === f(b, a)
 */
function generateCommutativeTest(def: PureFunctionDef, options?: PropertyGeneratorOptions): void {
  if (def.domain.length !== 2) return;

  const fastCheckConfig = buildFastCheckConfig(options);

  test(`${def.name} is commutative: f(a, b) === f(b, a)`, () => {
    fc.assert(
      fc.property(def.domain[0], def.domain[1], (a, b) => {
        const result1 = def.fn(a, b);
        const result2 = def.fn(b, a);
        expect(result1).toEqual(result2);
      }),
      fastCheckConfig as never
    );
  });
}

/**
 * Generate idempotence test: f(f(x)) === f(x)
 */
function generateIdempotentTest(def: PureFunctionDef, options?: PropertyGeneratorOptions): void {
  if (def.domain.length !== 1) return;

  const fastCheckConfig = buildFastCheckConfig(options);

  test(`${def.name} is idempotent: f(f(x)) === f(x)`, () => {
    fc.assert(
      fc.property(def.domain[0], (x) => {
        const once = def.fn(x);
        const twice = def.fn(once);
        expect(twice).toEqual(once);
      }),
      fastCheckConfig as never
    );
  });
}

/**
 * Generate associativity test: f(f(a, b), c) === f(a, f(b, c))
 */
function generateAssociativeTest(def: PureFunctionDef, options?: PropertyGeneratorOptions): void {
  if (def.domain.length !== 2) return;

  const fastCheckConfig = buildFastCheckConfig(options);

  test(`${def.name} is associative: f(f(a, b), c) === f(a, f(b, c))`, () => {
    fc.assert(
      fc.property(def.domain[0], def.domain[1], def.domain[1], (a, b, c) => {
        const left = def.fn(def.fn(a, b), c);
        const right = def.fn(a, def.fn(b, c));
        expect(left).toEqual(right);
      }),
      fastCheckConfig as never
    );
  });
}

/**
 * Generate bounds test: output always within valid range
 */
function generateBoundsTest(
  def: PureFunctionDef,
  minBound: number,
  maxBound: number,
  options?: PropertyGeneratorOptions,
): void {
  const fastCheckConfig = buildFastCheckConfig(options);

  test(`${def.name} output is bounded: [${minBound}, ${maxBound}]`, () => {
    fc.assert(
      fc.property(...(def.domain as ArbitraryTuple), (...args) => {
        const raw = def.fn(...args);
        const result = def.projectResult ? def.projectResult(raw) : toComparableNumber(raw);
        expect(result).toBeGreaterThanOrEqual(minBound);
        expect(result).toBeLessThanOrEqual(maxBound);
      }),
      fastCheckConfig as never
    );
  });
}

function toComparableNumber(value: unknown): number {
  if (typeof value === "number") return value;
  if (typeof value === "bigint") return Number(value);
  if (value && typeof value === "object") {
    const maybeToNumber = (value as { toNumber?: () => number }).toNumber;
    if (typeof maybeToNumber === "function") {
      return maybeToNumber.call(value);
    }
  }
  return Number(value);
}

/**
 * Generate inverse test: decode(encode(x)) === x
 */
function generateInverseTest(def: PureFunctionDef, options?: PropertyGeneratorOptions): void {
  if (def.domain.length !== 1 || !def.inverseFn) return;

  const fastCheckConfig = buildFastCheckConfig(options);

  test(`${def.name} has inverse: inverse(f(x)) === x`, () => {
    fc.assert(
      fc.property(def.domain[0], (x) => {
        const encoded = def.fn(x);
        const decoded = def.inverseFn!(encoded);
        expect(decoded).toEqual(x);
      }),
      fastCheckConfig as never
    );
  });
}

/**
 * Generate monotonicity test: a < b => f(a) <= f(b)
 */
function generateMonotonicTest(def: PureFunctionDef, options?: PropertyGeneratorOptions): void {
  if (def.domain.length !== 1) return;

  const fastCheckConfig = buildFastCheckConfig(options);

  test(`${def.name} is monotonic: a < b => f(a) <= f(b)`, () => {
    fc.assert(
      fc.property(
        fc.tuple(def.domain[0], def.domain[0]).filter(([a, b]) => (a as number) < (b as number)),
        ([a, b]) => {
          const resultA = def.fn(a) as number;
          const resultB = def.fn(b) as number;
          expect(resultA).toBeLessThanOrEqual(resultB);
        }
      ),
      fastCheckConfig as never
    );
  });
}

/**
 * Generate identity test: f(x, identity) === x
 */
function generateIdentityTest(def: PureFunctionDef, options?: PropertyGeneratorOptions): void {
  if (def.domain.length !== 2 || def.identityValue === undefined) return;

  const fastCheckConfig = buildFastCheckConfig(options);

  test(`${def.name} has identity element`, () => {
    fc.assert(
      fc.property(def.domain[0], (x) => {
        const result = def.fn(x, def.identityValue);
        expect(result).toEqual(x);
      }),
      fastCheckConfig as never
    );
  });
}

function generateCustomPropertyTest(
  def: PureFunctionDef,
  customProperty: CustomPropertyDef,
  options?: PropertyGeneratorOptions,
): void {
  const fastCheckConfig = buildFastCheckConfig(options);
  const customDomain = customProperty.domain ?? [];

  test(customProperty.name, () => {
    if (customDomain.length === 0) {
      customProperty.assert();
      return;
    }

    fc.assert(
      fc.property(...(customDomain as ArbitraryTuple), (...args) => {
        customProperty.assert(...args);
      }),
      fastCheckConfig as never,
    );
  });
}

/**
 * Main generator: Create property-based tests
 */
export function generatePropertyBasedTests(
  functions: PureFunctionDef[],
  options?: PropertyGeneratorOptions,
): void {
  describe("Property-Based Tests (Auto-Generated)", () => {
    for (const fn of functions) {
      describe(fn.name, () => {
        for (const property of fn.properties) {
          switch (property) {
            case "commutative":
              generateCommutativeTest(fn, options);
              break;
            case "associative":
              generateAssociativeTest(fn, options);
              break;
            case "identity":
              generateIdentityTest(fn, options);
              break;
            case "idempotent":
              generateIdempotentTest(fn, options);
              break;
            case "bounded": {
              const min = fn.bounds?.min;
              const max = fn.bounds?.max;
              if (typeof min === "number" && typeof max === "number") {
                generateBoundsTest(fn, min, max, options);
              }
              break;
            }
            case "inverse":
              generateInverseTest(fn, options);
              break;
            case "monotonic":
              generateMonotonicTest(fn, options);
              break;
            // Add other properties as needed
          }
        }

        for (const customProperty of fn.customProperties ?? []) {
          generateCustomPropertyTest(fn, customProperty, options);
        }
      });
    }
  });
}

/**
 * Common arbitrary generators for domain-specific types
 */
export const domainArbitraries = {
  /** Positive decimal amount (e.g., prices, totals) */
  positiveAmount: fc.double({ min: 0.01, max: 1_000_000, noNaN: true, noDefaultInfinity: true }),

  /** Tax rate (0-100%) */
  taxRate: fc.double({ min: 0, max: 1, noNaN: true, noDefaultInfinity: true }),

  /** Quantity (integer) */
  quantity: fc.integer({ min: 1, max: 10_000 }),

  /** Discount percentage (0-100%) */
  discountPercent: fc.double({ min: 0, max: 100, noNaN: true, noDefaultInfinity: true }),
};
