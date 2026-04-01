/**
 * Contract tests for versioned graph-validation JSON report.
 */

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { describe, expect, it } from "vitest";
import { GRAPH_VALIDATION_REPORT_VERSION } from "../types.js";
import { parseGraphValidationReportJson } from "../policy-from-report.js";
import { stringifyReportDeterministic } from "../report-dto.js";

const minimalHealthScore = {
  overall: 95,
  dimensions: {
    orphanScore: 40,
    indexScore: 25,
    tenantScore: 25,
    cascadeScore: 10,
  },
  grade: "A" as const,
  status: "HEALTHY" as const,
  recommendations: ["ok"],
};

describe("Graph validation report contract (v1)", () => {
  it("parses a minimal valid v1 report", () => {
    const raw = {
      reportVersion: GRAPH_VALIDATION_REPORT_VERSION,
      generatedAt: "2026-01-01T00:00:00.000Z",
      schemasCovered: ["sales"],
      policy: {
        isSecurityBlocking: false,
        isOperationalWarning: false,
        confidenceLevel: "high",
      },
      healthScore: minimalHealthScore,
      indexCoverage: { covered: 10, total: 10, missing: 0 },
      orphans: {
        total: 0,
        byPriority: { P0: 0, P1: 0, P2: 0, P3: 0 },
        details: [],
      },
      tenantLeaks: { totalLeaks: 0, isSecure: true, details: [] },
      catalog: {
        schemasCovered: ["sales"],
        totalRelationships: 1,
        byPriority: { P0: 0, P1: 0, P2: 0, P3: 1 },
      },
    };

    const parsed = parseGraphValidationReportJson(raw);
    expect(parsed.policy.isSecurityBlocking).toBe(false);
    expect(parsed.reportVersion).toBe(1);
  });

  it("rejects report missing top-level schemasCovered", () => {
    expect(() =>
      parseGraphValidationReportJson({
        reportVersion: GRAPH_VALIDATION_REPORT_VERSION,
        generatedAt: "2026-01-01T00:00:00.000Z",
        policy: {
          isSecurityBlocking: false,
          isOperationalWarning: false,
          confidenceLevel: "high",
        },
        healthScore: minimalHealthScore,
        indexCoverage: { covered: 1, total: 1, missing: 0 },
        orphans: {
          total: 0,
          byPriority: { P0: 0, P1: 0, P2: 0, P3: 0 },
          details: [],
        },
        tenantLeaks: { totalLeaks: 0, isSecure: true, details: [] },
        catalog: {
          schemasCovered: ["sales"],
          totalRelationships: 1,
          byPriority: { P0: 0, P1: 0, P2: 0, P3: 1 },
        },
      })
    ).toThrow(/schemasCovered/);
  });

  it("rejects invalid policy.decision.severity", () => {
    expect(() =>
      parseGraphValidationReportJson({
        reportVersion: GRAPH_VALIDATION_REPORT_VERSION,
        generatedAt: "2026-01-01T00:00:00.000Z",
        schemasCovered: ["sales"],
        policy: {
          isSecurityBlocking: false,
          isOperationalWarning: false,
          confidenceLevel: "high",
          decision: { severity: "INVALID", action: "ALLOW" },
        },
        healthScore: minimalHealthScore,
        indexCoverage: { covered: 1, total: 1, missing: 0 },
        orphans: {
          total: 0,
          byPriority: { P0: 0, P1: 0, P2: 0, P3: 0 },
          details: [],
        },
        tenantLeaks: { totalLeaks: 0, isSecure: true, details: [] },
        catalog: {
          schemasCovered: ["sales"],
          totalRelationships: 1,
          byPriority: { P0: 0, P1: 0, P2: 0, P3: 1 },
        },
      })
    ).toThrow(/severity invalid/);
  });

  it("rejects wrong reportVersion", () => {
    expect(() =>
      parseGraphValidationReportJson({
        reportVersion: 999,
        generatedAt: "x",
        policy: {
          isSecurityBlocking: false,
          isOperationalWarning: false,
          confidenceLevel: "high",
        },
        healthScore: minimalHealthScore,
      })
    ).toThrow(/Unsupported reportVersion/);
  });

  it("stringifyReportDeterministic sorts keys recursively", () => {
    const obj = { z: 1, a: { m: 2, b: 1 } };
    const s = stringifyReportDeterministic(obj);
    expect(s.indexOf('"a"')).toBeLessThan(s.indexOf('"z"'));
  });

  it("parses multi-schema catalog (HR, Sales, Core, Security, Reference, Meta)", () => {
    const schemas = ["core", "hr", "sales", "security", "reference", "meta"];
    const raw = {
      reportVersion: GRAPH_VALIDATION_REPORT_VERSION,
      generatedAt: "2026-01-01T00:00:00.000Z",
      schemasCovered: schemas,
      policy: {
        isSecurityBlocking: false,
        isOperationalWarning: false,
        confidenceLevel: "high" as const,
      },
      healthScore: minimalHealthScore,
      indexCoverage: { covered: 100, total: 100, missing: 0 },
      orphans: {
        total: 0,
        byPriority: { P0: 0, P1: 0, P2: 0, P3: 0 },
        details: [],
      },
      tenantLeaks: { totalLeaks: 0, isSecure: true, details: [] },
      catalog: {
        schemasCovered: schemas,
        totalRelationships: 500,
        byPriority: { P0: 10, P1: 20, P2: 30, P3: 440 },
      },
    };
    const parsed = parseGraphValidationReportJson(raw);
    expect(parsed.schemasCovered).toEqual(schemas);
    expect(parsed.catalog.schemasCovered).toEqual(schemas);
  });

  it("parses golden fixture report-v1.min.json", () => {
    const dir = dirname(fileURLToPath(import.meta.url));
    const raw = JSON.parse(readFileSync(join(dir, "fixtures", "report-v1.min.json"), "utf-8"));
    const parsed = parseGraphValidationReportJson(raw);
    expect(parsed.reportVersion).toBe(1);
    expect(parsed.policy.isSecurityBlocking).toBe(false);
  });
});
