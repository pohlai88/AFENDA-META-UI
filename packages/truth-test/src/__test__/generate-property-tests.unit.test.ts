import { expect } from "vitest";
import fc from "fast-check";
import { generatePropertyBasedTests } from "../auto/generate-property-tests.js";

const propertyDefs = [
  {
    name: "add",
    fn: (a: unknown, b: unknown) => Number(a) + Number(b),
    domain: [fc.integer({ min: -100, max: 100 }), fc.integer({ min: -100, max: 100 })],
    properties: ["commutative", "associative", "identity"] as const,
    identityValue: 0,
  },
  {
    name: "round",
    fn: (x: unknown) => Math.round(Number(x)),
    domain: [fc.double({ min: -100, max: 100, noNaN: true, noDefaultInfinity: true })],
    properties: ["idempotent"] as const,
  },
  {
    name: "clampPercent",
    fn: (x: unknown) => Math.max(0, Math.min(100, Number(x))),
    domain: [fc.double({ min: -500, max: 500, noNaN: true, noDefaultInfinity: true })],
    properties: ["bounded", "monotonic"] as const,
    bounds: { min: 0, max: 100 },
  },
  {
    name: "offsetByOne",
    fn: (x: unknown) => Number(x) + 1,
    inverseFn: (x: unknown) => Number(x) - 1,
    domain: [fc.integer({ min: -100, max: 100 })],
    properties: ["inverse"] as const,
  },
  {
    name: "decimalLikeProjection",
    fn: (x: unknown) => ({ toNumber: () => Number(x) }),
    domain: [fc.double({ min: 0, max: 100, noNaN: true, noDefaultInfinity: true })],
    properties: ["bounded"] as const,
    bounds: { min: 0, max: 100 },
    projectResult: (v: unknown) => (v as { toNumber: () => number }).toNumber(),
    customProperties: [
      {
        name: "custom deterministic check",
        assert: () => {
          expect(1 + 1).toBe(2);
        },
      },
      {
        name: "custom generated check",
        domain: [fc.integer({ min: 1, max: 10 })] as any,
        assert: (x: unknown) => {
          expect(Number(x)).toBeGreaterThan(0);
        },
      },
    ],
  },
  {
    name: "boundedBigintResult",
    fn: (x: unknown) => BigInt(Number(x)),
    domain: [fc.integer({ min: 0, max: 10 })],
    properties: ["bounded"] as const,
    bounds: { min: 0, max: 10 },
  },
] as any;

generatePropertyBasedTests(propertyDefs, {
  fastCheck: {
    seed: 11,
    numRuns: 8,
    verbose: false,
  },
});

const oldSeed = process.env.FASTCHECK_SEED;
const oldRuns = process.env.FASTCHECK_RUNS;
const oldVerbose = process.env.FASTCHECK_VERBOSE;

process.env.FASTCHECK_SEED = "42";
process.env.FASTCHECK_RUNS = "7";
process.env.FASTCHECK_VERBOSE = "1";

generatePropertyBasedTests(
  [
    {
      name: "envConfiguredMonotonic",
      fn: (x: unknown) => Number(x) * 2,
      domain: [fc.integer({ min: -20, max: 20 })],
      properties: ["monotonic", "bounded"] as const,
      bounds: { min: -100, max: 100 },
    },
    {
      name: "boundedWithoutLimits",
      fn: (x: unknown) => Number(x),
      domain: [fc.integer({ min: -2, max: 2 })],
      properties: ["bounded", "idempotent"] as const,
    },
  ] as any,
);

process.env.FASTCHECK_SEED = "not-a-number";
process.env.FASTCHECK_RUNS = "-3";
process.env.FASTCHECK_VERBOSE = "false";

generatePropertyBasedTests([
  {
    name: "envInvalidNumericConfig",
    fn: (x: unknown) => Number(x),
    domain: [fc.integer({ min: -5, max: 5 })],
    properties: ["idempotent"] as const,
  },
] as any);

process.env.FASTCHECK_SEED = "101";
process.env.FASTCHECK_RUNS = "3";
process.env.FASTCHECK_VERBOSE = "1";

generatePropertyBasedTests(
  [
    {
      name: "envOverriddenByOptions",
      fn: (x: unknown) => Number(x),
      domain: [fc.integer({ min: -10, max: 10 })],
      properties: ["idempotent"] as const,
    },
  ] as any,
  {
    fastCheck: {
      seed: 999,
      numRuns: 4,
      verbose: false,
    },
  },
);

if (oldSeed === undefined) delete process.env.FASTCHECK_SEED;
else process.env.FASTCHECK_SEED = oldSeed;

if (oldRuns === undefined) delete process.env.FASTCHECK_RUNS;
else process.env.FASTCHECK_RUNS = oldRuns;

if (oldVerbose === undefined) delete process.env.FASTCHECK_VERBOSE;
else process.env.FASTCHECK_VERBOSE = oldVerbose;
