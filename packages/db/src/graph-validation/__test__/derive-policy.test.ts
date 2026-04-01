import { describe, expect, it } from "vitest";
import { deriveGraphValidationPolicy, calculateHealthScore } from "../health-scoring.js";
import type { ValidationInputs } from "../health-scoring.js";

const emptyOrphans = {
  total: 0,
  byTable: new Map(),
  byPriority: { P0: [], P1: [], P2: [], P3: [] },
  criticalViolations: [],
};

const secureTenants = {
  totalLeaks: 0,
  byTable: new Map(),
  allViolations: [],
  isSecure: true,
};

const catalog = {
  schemasCovered: ["sales"],
  relationships: [],
  tables: [],
  byPriority: { P0: [], P1: [], P2: [], P3: [] },
};

describe("deriveGraphValidationPolicy", () => {
  it("blocks security when tenant leaks", () => {
    const inputs: ValidationInputs = {
      orphans: emptyOrphans,
      tenantLeaks: {
        totalLeaks: 3,
        isSecure: false,
        byTable: new Map(),
        allViolations: [],
      },
      catalog,
      indexCoverage: { covered: 1, total: 1 },
    };
    const score = calculateHealthScore(inputs);
    const policy = deriveGraphValidationPolicy(inputs, score);
    expect(policy.isSecurityBlocking).toBe(true);
    expect(policy.securityReason).toMatch(/leak/i);
    expect(policy.decision?.severity).toBe("P0_SECURITY");
    expect(policy.decision?.action).toBe("BLOCK");
  });

  it("does not block security when secure", () => {
    const inputs: ValidationInputs = {
      orphans: emptyOrphans,
      tenantLeaks: secureTenants,
      catalog,
      indexCoverage: { covered: 10, total: 10 },
    };
    const score = calculateHealthScore(inputs);
    const policy = deriveGraphValidationPolicy(inputs, score);
    expect(policy.isSecurityBlocking).toBe(false);
    expect(policy.decision?.action).toBe("ALLOW");
    expect(policy.decision?.severity).toBe("P3_OBSERVABILITY");
  });

  it("grades P1 WARN when critical orphans exist but tenant secure", () => {
    const criticalRow = {
      childTableSchema: "sales",
      childTableName: "c",
      parentTableSchema: "sales",
      parentTableName: "p",
      childTable: "sales.c",
      parentTable: "sales.p",
      fkColumn: "pid",
      parentColumn: "id",
      orphanCount: 1,
      sampleIds: ["1"],
    };
    const inputs: ValidationInputs = {
      orphans: {
        total: 1,
        byTable: new Map(),
        byPriority: { P0: [criticalRow], P1: [], P2: [], P3: [] },
        criticalViolations: [criticalRow],
      },
      tenantLeaks: secureTenants,
      catalog,
      indexCoverage: { covered: 10, total: 10 },
    };
    const score = calculateHealthScore(inputs);
    const policy = deriveGraphValidationPolicy(inputs, score);
    expect(policy.isSecurityBlocking).toBe(false);
    expect(policy.decision?.severity).toBe("P1_DATA_CORRUPTION");
    expect(policy.decision?.action).toBe("WARN");
  });
});
