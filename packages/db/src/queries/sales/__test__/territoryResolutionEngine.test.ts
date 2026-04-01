import { describe, expect, it } from "vitest";

import {
  parsePostalCodeToZipNumeric,
  resolveTerritoryFromRules,
  territoryRuleMatches,
  type TerritoryRuleCandidate,
} from "../territoryResolutionEngine.js";

const base = (overrides: Partial<TerritoryRuleCandidate>): TerritoryRuleCandidate => ({
  id: "00000000-0000-4000-8000-000000000001",
  territoryId: "00000000-0000-4000-8000-0000000000a1",
  countryId: 1,
  stateId: 5,
  zipFrom: 90_000,
  zipTo: 90_999,
  matchType: "range",
  priority: 10,
  effectiveFrom: new Date("2020-01-01T00:00:00Z"),
  effectiveTo: null,
  createdAt: new Date("2020-06-01T00:00:00Z"),
  ...overrides,
});

describe("territoryResolutionEngine", () => {
  it("orders by lower priority first, then specificity, then createdAt", () => {
    const rLate = base({
      id: "00000000-0000-4000-8000-000000000002",
      priority: 5,
      createdAt: new Date("2021-01-01T00:00:00Z"),
    });
    const rEarly = base({
      id: "00000000-0000-4000-8000-000000000003",
      priority: 5,
      countryId: 1,
      stateId: 5,
      zipFrom: 90_000,
      zipTo: 90_999,
      createdAt: new Date("2020-01-01T00:00:00Z"),
    });
    const rHigherPrioNumber = base({
      id: "00000000-0000-4000-8000-000000000004",
      priority: 20,
      territoryId: "00000000-0000-4000-8000-0000000000b1",
    });

    const out = resolveTerritoryFromRules({
      asOf: new Date("2024-01-15T00:00:00Z"),
      geo: { countryId: 1, stateId: 5, zipNumeric: 90_100 },
      rules: [rHigherPrioNumber, rLate, rEarly],
      defaultTerritoryId: null,
    });

    expect(out.matchedRuleId).toBe(rEarly.id);
    expect(out.resolutionStrategy).toBe("priority");
  });

  it("prefers higher specificity when priority ties", () => {
    const broad = base({
      id: "00000000-0000-4000-8000-000000000010",
      priority: 1,
      stateId: null,
      zipFrom: null,
      zipTo: null,
      territoryId: "00000000-0000-4000-8000-0000000000c1",
      createdAt: new Date("2019-01-01T00:00:00Z"),
    });
    const narrow = base({
      id: "00000000-0000-4000-8000-000000000011",
      priority: 1,
      stateId: 5,
      zipFrom: 90_000,
      zipTo: 90_999,
      territoryId: "00000000-0000-4000-8000-0000000000d1",
      createdAt: new Date("2020-01-01T00:00:00Z"),
    });

    const out = resolveTerritoryFromRules({
      asOf: new Date("2024-01-15T00:00:00Z"),
      geo: { countryId: 1, stateId: 5, zipNumeric: 90_100 },
      rules: [broad, narrow],
      defaultTerritoryId: null,
    });

    expect(out.matchedRuleId).toBe(narrow.id);
    expect(out.resolvedTerritoryId).toBe(narrow.territoryId);
  });

  it("uses default territory when no rule matches", () => {
    const out = resolveTerritoryFromRules({
      asOf: new Date("2024-01-15T00:00:00Z"),
      geo: { countryId: 2, stateId: 5, zipNumeric: 90_100 },
      rules: [base({})],
      defaultTerritoryId: "00000000-0000-4000-8000-0000000000e1",
    });

    expect(out.resolutionStrategy).toBe("default");
    expect(out.resolvedTerritoryId).toBe("00000000-0000-4000-8000-0000000000e1");
    expect(out.matchedRuleId).toBeNull();
  });

  it("returns none when unmatched and no default", () => {
    const out = resolveTerritoryFromRules({
      asOf: new Date("2024-01-15T00:00:00Z"),
      geo: { countryId: 2, stateId: null, zipNumeric: null },
      rules: [base({})],
      defaultTerritoryId: null,
    });

    expect(out.resolutionStrategy).toBe("none");
    expect(out.resolvedTerritoryId).toBeNull();
  });

  it("respects effective window", () => {
    const expired = base({
      effectiveTo: new Date("2020-12-31T23:59:59Z"),
    });
    const { ok } = territoryRuleMatches(
      expired,
      { countryId: 1, stateId: 5, zipNumeric: 90_100 },
      new Date("2024-01-01T00:00:00Z")
    );
    expect(ok).toBe(false);
  });

  it("parsePostalCodeToZipNumeric normalizes US ZIP+4", () => {
    expect(parsePostalCodeToZipNumeric("94107-1234")).toBe(94_107);
    expect(parsePostalCodeToZipNumeric("")).toBeNull();
  });
});
