/**
 * Unit Tests: Health Scoring Algorithm
 * =====================================
 * Tests the 0-100 health scoring system with weighted dimensions,
 * grade assignment, status thresholds, and recommendation generation.
 */

import { describe, it, expect } from "vitest";
import {
  calculateHealthScore,
  formatHealthReport,
  type ValidationInputs,
  type GraphHealthScore,
} from "../health-scoring.js";
import type { OrphanDetectionResults } from "../orphan-detection.js";
import type { TenantIsolationResults } from "../tenant-isolation.js";
import type { FkValidationCatalog } from "../fk-catalog.js";

// Test fixtures
const createMockCatalog = (totalRelationships = 279): FkValidationCatalog => ({
  relationships: Array(totalRelationships)
    .fill(null)
    .map((_, i) => ({
      constraintName: `fk_test_${i}`,
      childTableSchema: "sales",
      childTableName: "test_child",
      childColumnName: "parent_id",
      parentTableSchema: "sales",
      parentTableName: "test_parent",
      parentColumnName: "id",
      deleteRule: "CASCADE",
      updateRule: "CASCADE",
      relationshipType: "many-to-one",
      validationPriority: "P0",
      isOptional: false,
      tenantIsolated: true,
    })),
  tables: [],
  byPriority: {
    P0: [],
    P1: [],
    P2: [],
    P3: [],
  },
});

const createMockOrphans = (
  p0Count = 0,
  p1Count = 0,
  p2Count = 0,
  p3Count = 0
): OrphanDetectionResults => {
  const p0 = Array.from({ length: p0Count }, () => ({
    childTable: "test_child",
    parentTable: "test_parent",
    fkColumn: "id",
    orphanCount: 1,
    sampleIds: [],
  }));
  const p1 = Array.from({ length: p1Count }, () => ({
    childTable: "test_child",
    parentTable: "test_parent",
    fkColumn: "id",
    orphanCount: 1,
    sampleIds: [],
  }));
  const p2 = Array.from({ length: p2Count }, () => ({
    childTable: "test_child",
    parentTable: "test_parent",
    fkColumn: "id",
    orphanCount: 1,
    sampleIds: [],
  }));
  const p3 = Array.from({ length: p3Count }, () => ({
    childTable: "test_child",
    parentTable: "test_parent",
    fkColumn: "id",
    orphanCount: 1,
    sampleIds: [],
  }));

  return {
    total: p0Count + p1Count + p2Count + p3Count,
    byTable: new Map(),
    byPriority: {
      P0: p0,
      P1: p1,
      P2: p2,
      P3: p3,
    },
    criticalViolations: [...p0, ...p1],
  };
};

const createMockTenantLeaks = (leakCount = 0): TenantIsolationResults => ({
  totalLeaks: leakCount,
  byTable: new Map(),
  allViolations: [],
  isSecure: leakCount === 0,
});

describe("Health Scoring Algorithm", () => {
  describe("Perfect Health (100 points)", () => {
    it("should score 100 with zero orphans, zero leaks, perfect indexes, perfect cascades", () => {
      const inputs: ValidationInputs = {
        orphans: createMockOrphans(0, 0, 0, 0),
        tenantLeaks: createMockTenantLeaks(0),
        catalog: createMockCatalog(279),
        indexCoverage: { covered: 279, total: 279 },
        cascadeErrors: 0,
      };

      const score = calculateHealthScore(inputs);

      expect(score.overall).toBe(100);
      expect(score.grade).toBe("A+");
      expect(score.status).toBe("HEALTHY");
      expect(score.dimensions.orphanScore).toBe(40);
      expect(score.dimensions.indexScore).toBe(25);
      expect(score.dimensions.tenantScore).toBe(25);
      expect(score.dimensions.cascadeScore).toBe(10);
    });
  });

  describe("Orphan Score Calculation (40% weight)", () => {
    it("should deduct 1 point per P0 orphan (critical)", () => {
      const inputs: ValidationInputs = {
        orphans: createMockOrphans(5, 0, 0, 0), // 5 P0 orphans
        tenantLeaks: createMockTenantLeaks(0),
        catalog: createMockCatalog(279),
      };

      const score = calculateHealthScore(inputs);

      expect(score.dimensions.orphanScore).toBe(35); // 40 - (5 × 1.0) = 35
      expect(score.overall).toBe(95); // 35 + 25 + 25 + 10
    });

    it("should deduct 1 point per P1 orphan (high)", () => {
      const inputs: ValidationInputs = {
        orphans: createMockOrphans(0, 10, 0, 0), // 10 P1 orphans
        tenantLeaks: createMockTenantLeaks(0),
        catalog: createMockCatalog(279),
      };

      const score = calculateHealthScore(inputs);

      expect(score.dimensions.orphanScore).toBe(30); // 40 - (10 × 1.0) = 30
    });

    it("should deduct 0.1 points per P2 orphan (medium)", () => {
      const inputs: ValidationInputs = {
        orphans: createMockOrphans(0, 0, 100, 0), // 100 P2 orphans
        tenantLeaks: createMockTenantLeaks(0),
        catalog: createMockCatalog(279),
      };

      const score = calculateHealthScore(inputs);

      expect(score.dimensions.orphanScore).toBe(30); // 40 - (100 × 0.1) = 30
    });

    it("should deduct 0.1 points per P3 orphan (low)", () => {
      const inputs: ValidationInputs = {
        orphans: createMockOrphans(0, 0, 0, 200), // 200 P3 orphans
        tenantLeaks: createMockTenantLeaks(0),
        catalog: createMockCatalog(279),
      };

      const score = calculateHealthScore(inputs);

      expect(score.dimensions.orphanScore).toBe(20); // 40 - (200 × 0.1) = 20
    });

    it("should floor orphan score at 0 (never negative)", () => {
      const inputs: ValidationInputs = {
        orphans: createMockOrphans(50, 0, 0, 0), // 50 P0 orphans (exceeds 40pts)
        tenantLeaks: createMockTenantLeaks(0),
        catalog: createMockCatalog(279),
      };

      const score = calculateHealthScore(inputs);

      expect(score.dimensions.orphanScore).toBe(0); // Floor at 0, not -10
    });

    it("should combine penalties across priority tiers", () => {
      const inputs: ValidationInputs = {
        orphans: createMockOrphans(5, 10, 100, 200), // Mix of all priorities
        tenantLeaks: createMockTenantLeaks(0),
        catalog: createMockCatalog(279),
      };

      const score = calculateHealthScore(inputs);

      // 40 - (5×1.0 + 10×1.0 + 100×0.1 + 200×0.1) = 40 - (5 + 10 + 10 + 20) = -5 → floor to 0
      expect(score.dimensions.orphanScore).toBe(0);
    });
  });

  describe("Tenant Score Calculation (25% weight)", () => {
    it("should award 25 points with 0 tenant leaks (SECURE)", () => {
      const inputs: ValidationInputs = {
        orphans: createMockOrphans(0, 0, 0, 0),
        tenantLeaks: createMockTenantLeaks(0), // SECURE
        catalog: createMockCatalog(279),
      };

      const score = calculateHealthScore(inputs);

      expect(score.dimensions.tenantScore).toBe(25);
    });

    it("should award 0 points with ANY tenant leaks (CRITICAL SECURITY)", () => {
      const inputs: ValidationInputs = {
        orphans: createMockOrphans(0, 0, 0, 0),
        tenantLeaks: createMockTenantLeaks(1), // 1 leak = CRITICAL
        catalog: createMockCatalog(279),
      };

      const score = calculateHealthScore(inputs);

      expect(score.dimensions.tenantScore).toBe(0); // Binary: any leak = 0 pts
    });

    it("should award 0 points with 100 tenant leaks (same as 1 leak)", () => {
      const inputs: ValidationInputs = {
        orphans: createMockOrphans(0, 0, 0, 0),
        tenantLeaks: createMockTenantLeaks(100), // Many leaks
        catalog: createMockCatalog(279),
      };

      const score = calculateHealthScore(inputs);

      expect(score.dimensions.tenantScore).toBe(0); // Binary scoring
    });
  });

  describe("Index Score Calculation (25% weight)", () => {
    it("should award 25 points with 100% index coverage", () => {
      const inputs: ValidationInputs = {
        orphans: createMockOrphans(0, 0, 0, 0),
        tenantLeaks: createMockTenantLeaks(0),
        catalog: createMockCatalog(279),
        indexCoverage: { covered: 279, total: 279 },
      };

      const score = calculateHealthScore(inputs);

      expect(score.dimensions.indexScore).toBe(25);
    });

    it("should calculate proportional score for partial coverage", () => {
      const inputs: ValidationInputs = {
        orphans: createMockOrphans(0, 0, 0, 0),
        tenantLeaks: createMockTenantLeaks(0),
        catalog: createMockCatalog(279),
        indexCoverage: { covered: 200, total: 279 }, // 71.7% coverage
      };

      const score = calculateHealthScore(inputs);

      expect(score.dimensions.indexScore).toBeCloseTo(17.9, 1); // (200/279) × 25 ≈ 17.9
    });

    it("should award 0 points with 0% index coverage", () => {
      const inputs: ValidationInputs = {
        orphans: createMockOrphans(0, 0, 0, 0),
        tenantLeaks: createMockTenantLeaks(0),
        catalog: createMockCatalog(279),
        indexCoverage: { covered: 0, total: 279 },
      };

      const score = calculateHealthScore(inputs);

      expect(score.dimensions.indexScore).toBe(0);
    });

    it("should default to 25 points if index coverage not provided (assume perfect)", () => {
      const inputs: ValidationInputs = {
        orphans: createMockOrphans(0, 0, 0, 0),
        tenantLeaks: createMockTenantLeaks(0),
        catalog: createMockCatalog(279),
        // indexCoverage omitted
      };

      const score = calculateHealthScore(inputs);

      expect(score.dimensions.indexScore).toBe(25); // Default assumption
    });
  });

  describe("Cascade Score Calculation (10% weight)", () => {
    it("should award 10 points with 0 incorrect cascades", () => {
      const inputs: ValidationInputs = {
        orphans: createMockOrphans(0, 0, 0, 0),
        tenantLeaks: createMockTenantLeaks(0),
        catalog: createMockCatalog(279),
        cascadeErrors: 0,
      };

      const score = calculateHealthScore(inputs);

      expect(score.dimensions.cascadeScore).toBe(10);
    });

    it("should deduct 2 points per incorrect cascade rule", () => {
      const inputs: ValidationInputs = {
        orphans: createMockOrphans(0, 0, 0, 0),
        tenantLeaks: createMockTenantLeaks(0),
        catalog: createMockCatalog(279),
        cascadeErrors: 3, // 3 errors
      };

      const score = calculateHealthScore(inputs);

      expect(score.dimensions.cascadeScore).toBe(4); // 10 - (3 × 2) = 4
    });

    it("should floor cascade score at 0 (never negative)", () => {
      const inputs: ValidationInputs = {
        orphans: createMockOrphans(0, 0, 0, 0),
        tenantLeaks: createMockTenantLeaks(0),
        catalog: createMockCatalog(279),
        cascadeErrors: 10, // 10 errors
      };

      const score = calculateHealthScore(inputs);

      expect(score.dimensions.cascadeScore).toBe(0); // Floor at 0, not -10
    });

    it("should default to 10 points if cascade errors not provided (assume perfect)", () => {
      const inputs: ValidationInputs = {
        orphans: createMockOrphans(0, 0, 0, 0),
        tenantLeaks: createMockTenantLeaks(0),
        catalog: createMockCatalog(279),
        // cascadeErrors omitted
      };

      const score = calculateHealthScore(inputs);

      expect(score.dimensions.cascadeScore).toBe(10); // Default assumption
    });
  });

  describe("Grade Assignment", () => {
    it("should assign A+ for 98-100 points", () => {
      const inputs: ValidationInputs = {
        orphans: createMockOrphans(0, 0, 20, 0), // 98 pts (40-2 + 25 + 25 + 10)
        tenantLeaks: createMockTenantLeaks(0),
        catalog: createMockCatalog(279),
        indexCoverage: { covered: 279, total: 279 },
        cascadeErrors: 0,
      };

      const score = calculateHealthScore(inputs);

      expect(score.overall).toBe(98);
      expect(score.grade).toBe("A+");
    });

    it("should assign A for 90-97 points", () => {
      const inputs: ValidationInputs = {
        orphans: createMockOrphans(0, 0, 100, 0), // 90 pts (40-10 + 25 + 25 + 10)
        tenantLeaks: createMockTenantLeaks(0),
        catalog: createMockCatalog(279),
        indexCoverage: { covered: 279, total: 279 },
        cascadeErrors: 0,
      };

      const score = calculateHealthScore(inputs);

      expect(score.overall).toBe(90);
      expect(score.grade).toBe("A");
    });

    it("should assign B for 80-89 points", () => {
      const inputs: ValidationInputs = {
        orphans: createMockOrphans(0, 0, 200, 0), // 80 pts (40-20 + 25 + 25 + 10)
        tenantLeaks: createMockTenantLeaks(0),
        catalog: createMockCatalog(279),
        indexCoverage: { covered: 279, total: 279 },
        cascadeErrors: 0,
      };

      const score = calculateHealthScore(inputs);

      expect(score.overall).toBe(80);
      expect(score.grade).toBe("B");
    });

    it("should assign C for 70-79 points", () => {
      const inputs: ValidationInputs = {
        orphans: createMockOrphans(0, 0, 300, 0), // 70 pts (40-30 + 25 + 25 + 10)
        tenantLeaks: createMockTenantLeaks(0),
        catalog: createMockCatalog(279),
        indexCoverage: { covered: 279, total: 279 },
        cascadeErrors: 0,
      };

      const score = calculateHealthScore(inputs);

      expect(score.overall).toBe(70);
      expect(score.grade).toBe("C");
    });

    it("should assign D for 60-69 points", () => {
      const inputs: ValidationInputs = {
        orphans: createMockOrphans(0, 0, 400, 0), // 60 pts (40-40 + 25 + 25 + 10)
        tenantLeaks: createMockTenantLeaks(0),
        catalog: createMockCatalog(279),
        indexCoverage: { covered: 279, total: 279 },
        cascadeErrors: 0,
      };

      const score = calculateHealthScore(inputs);

      expect(score.overall).toBe(60);
      expect(score.grade).toBe("D");
    });

    it("should assign F for 0-59 points", () => {
      const inputs: ValidationInputs = {
        orphans: createMockOrphans(50, 0, 0, 0), // 59 pts (0 + 25 + 25 + 10 - 1)
        tenantLeaks: createMockTenantLeaks(0),
        catalog: createMockCatalog(279),
        indexCoverage: { covered: 250, total: 279 },
        cascadeErrors: 0,
      };

      const score = calculateHealthScore(inputs);

      expect(score.grade).toBe("F");
    });
  });

  describe("Status Assignment", () => {
    it("should assign HEALTHY for score >= 95", () => {
      const inputs: ValidationInputs = {
        orphans: createMockOrphans(0, 0, 50, 0), // 95 pts
        tenantLeaks: createMockTenantLeaks(0),
        catalog: createMockCatalog(279),
        indexCoverage: { covered: 279, total: 279 },
        cascadeErrors: 0,
      };

      const score = calculateHealthScore(inputs);

      expect(score.overall).toBe(95);
      expect(score.status).toBe("HEALTHY");
    });

    it("should assign WARNING for score 70-94", () => {
      const inputs: ValidationInputs = {
        orphans: createMockOrphans(0, 0, 250, 0), // 75 pts
        tenantLeaks: createMockTenantLeaks(0),
        catalog: createMockCatalog(279),
        indexCoverage: { covered: 279, total: 279 },
        cascadeErrors: 0,
      };

      const score = calculateHealthScore(inputs);

      expect(score.overall).toBe(75);
      expect(score.status).toBe("WARNING");
    });

    it("should assign CRITICAL for score < 70", () => {
      const inputs: ValidationInputs = {
        orphans: createMockOrphans(50, 0, 0, 0), // 60 pts
        tenantLeaks: createMockTenantLeaks(0),
        catalog: createMockCatalog(279),
        indexCoverage: { covered: 200, total: 279 },
        cascadeErrors: 0,
      };

      const score = calculateHealthScore(inputs);

      expect(score.status).toBe("CRITICAL");
    });
  });

  describe("Recommendation Generation", () => {
    it("should recommend cleanup for critical orphans", () => {
      const inputs: ValidationInputs = {
        orphans: createMockOrphans(14, 0, 0, 0), // 14 P0 orphans
        tenantLeaks: createMockTenantLeaks(0),
        catalog: createMockCatalog(279),
      };

      const score = calculateHealthScore(inputs);

      expect(score.recommendations.some((r) => /CRITICAL.*14.*P0.*P1/i.test(r))).toBe(true);
    });

    it("should recommend security escalation for tenant leaks", () => {
      const inputs: ValidationInputs = {
        orphans: createMockOrphans(0, 0, 0, 0),
        tenantLeaks: createMockTenantLeaks(14), // 14 leaks
        catalog: createMockCatalog(279),
      };

      const score = calculateHealthScore(inputs);

      expect(score.recommendations.some((r) => /SECURITY.*14.*cross-tenant/i.test(r))).toBe(true);
    });

    it("should recommend index creation for missing indexes", () => {
      const inputs: ValidationInputs = {
        orphans: createMockOrphans(0, 0, 0, 0),
        tenantLeaks: createMockTenantLeaks(0),
        catalog: createMockCatalog(279),
        indexCoverage: { covered: 270, total: 279 }, // 9 missing
      };

      const score = calculateHealthScore(inputs);

      expect(score.recommendations.some((r) => /9.*FK.*lack.*indexes/i.test(r))).toBe(true);
    });

    it("should recommend cascade review for incorrect rules", () => {
      const inputs: ValidationInputs = {
        orphans: createMockOrphans(0, 0, 0, 0),
        tenantLeaks: createMockTenantLeaks(0),
        catalog: createMockCatalog(279),
        cascadeErrors: 4,
      };

      const score = calculateHealthScore(inputs);

      expect(score.recommendations.some((r) => /4.*FK.*incorrect.*CASCADE/i.test(r))).toBe(true);
    });

    it("should recommend deployment block for CRITICAL status", () => {
      const inputs: ValidationInputs = {
        orphans: createMockOrphans(50, 0, 0, 0), // CRITICAL score
        tenantLeaks: createMockTenantLeaks(0),
        catalog: createMockCatalog(279),
      };

      const score = calculateHealthScore(inputs);

      expect(score.status).toBe("CRITICAL");
      expect(score.recommendations.some((r) => /deployment.*blocked/i.test(r))).toBe(true);
    });

    it("should recommend routine monitoring for HEALTHY status", () => {
      const inputs: ValidationInputs = {
        orphans: createMockOrphans(0, 0, 0, 0),
        tenantLeaks: createMockTenantLeaks(0),
        catalog: createMockCatalog(279),
        indexCoverage: { covered: 279, total: 279 },
        cascadeErrors: 0,
      };

      const score = calculateHealthScore(inputs);

      expect(score.status).toBe("HEALTHY");
      expect(score.recommendations.some((r) => /routine.*monitoring/i.test(r))).toBe(true);
    });
  });

  describe("Edge Cases", () => {
    it("should handle empty catalog (0 relationships)", () => {
      const inputs: ValidationInputs = {
        orphans: createMockOrphans(0, 0, 0, 0),
        tenantLeaks: createMockTenantLeaks(0),
        catalog: createMockCatalog(0),
      };

      const score = calculateHealthScore(inputs);

      expect(score.overall).toBeGreaterThanOrEqual(0);
      expect(score.overall).toBeLessThanOrEqual(100);
    });

    it("should handle extremely large orphan counts (stress test)", () => {
      const inputs: ValidationInputs = {
        orphans: createMockOrphans(1000, 2000, 5000, 10000), // 18,000 orphans
        tenantLeaks: createMockTenantLeaks(0),
        catalog: createMockCatalog(279),
      };

      const score = calculateHealthScore(inputs);

      expect(score.dimensions.orphanScore).toBe(0); // Floor at 0
      expect(score.overall).toBeGreaterThanOrEqual(0); // Never negative
    });

    it("should handle all defaults (minimal inputs)", () => {
      const inputs: ValidationInputs = {
        orphans: createMockOrphans(0, 0, 0, 0),
        tenantLeaks: createMockTenantLeaks(0),
        catalog: createMockCatalog(279),
        // No indexCoverage, no cascadeErrors
      };

      const score = calculateHealthScore(inputs);

      expect(score.overall).toBe(100); // Assume perfect for missing data
      expect(score.dimensions.indexScore).toBe(25);
      expect(score.dimensions.cascadeScore).toBe(10);
    });
  });

  describe("Real-World Scenarios", () => {
    it("Scenario 1: Production database (good health, minor cleanup needed)", () => {
      const inputs: ValidationInputs = {
        orphans: createMockOrphans(0, 0, 35, 12), // 35 P2 + 12 P3
        tenantLeaks: createMockTenantLeaks(0),
        catalog: createMockCatalog(279),
        indexCoverage: { covered: 270, total: 279 }, // 96.8% coverage
        cascadeErrors: 0,
      };

      const score = calculateHealthScore(inputs);

      // 40 - (35×0.1 + 12×0.1) = 40 - 4.7 = 35.3
      // 25 × (270/279) = 24.2
      // 25 (tenant secure)
      // 10 (cascade perfect)
      // Total: 35.3 + 24.2 + 25 + 10 = 94.5
      expect(score.overall).toBeCloseTo(94.5, 1);
      expect(score.grade).toBe("A");
      expect(score.status).toBe("WARNING"); // < 95
    });

    it("Scenario 2: Post-migration database (high orphan count, poor indexes)", () => {
      const inputs: ValidationInputs = {
        orphans: createMockOrphans(14, 50, 1200, 500), // Many orphans
        tenantLeaks: createMockTenantLeaks(0),
        catalog: createMockCatalog(279),
        indexCoverage: { covered: 150, total: 279 }, // 53.8% coverage
        cascadeErrors: 2,
      };

      const score = calculateHealthScore(inputs);

      // Orphan: 40 - (14×1.0 + 50×1.0 + 1200×0.1 + 500×0.1) = 40 - 234 = 0 (floor)
      // Index: 25 × (150/279) = 13.4
      // Tenant: 25
      // Cascade: 10 - (2×2) = 6
      // Total: 0 + 13.4 + 25 + 6 = 44.4
      expect(score.overall).toBeCloseTo(44.4, 1);
      expect(score.grade).toBe("F");
      expect(score.status).toBe("CRITICAL");
    });

    it("Scenario 3: Security incident (tenant leaks detected)", () => {
      const inputs: ValidationInputs = {
        orphans: createMockOrphans(0, 0, 50, 20),
        tenantLeaks: createMockTenantLeaks(14), // CRITICAL SECURITY
        catalog: createMockCatalog(279),
        indexCoverage: { covered: 270, total: 279 },
        cascadeErrors: 0,
      };

      const score = calculateHealthScore(inputs);

      // Orphan: 40 - (50×0.1 + 20×0.1) = 40 - 7 = 33
      // Index: 24.2
      // Tenant: 0 (ANY leak = 0)
      // Cascade: 10
      // Total: 33 + 24.2 + 0 + 10 = 67.2
      expect(score.overall).toBeCloseTo(67.2, 1);
      expect(score.grade).toBe("D");
      expect(score.status).toBe("CRITICAL"); // < 70
      expect(score.dimensions.tenantScore).toBe(0); // Security failure
    });
  });
});

describe("Health Report Formatting", () => {
  it("should format health report with all sections", () => {
    const score: GraphHealthScore = {
      overall: 96,
      grade: "A",
      status: "HEALTHY",
      dimensions: {
        orphanScore: 36.5,
        indexScore: 24.2,
        tenantScore: 25,
        cascadeScore: 10,
      },
      recommendations: [
        "✅ Overall health HEALTHY. Continue routine monitoring.",
        "🟡 35 total orphaned records. Review and schedule cleanup.",
      ],
    };

    const report = formatHealthReport(score);

    expect(report).toContain("AFENDA Graph Validation Health Check");
    expect(report).toContain("Overall Health Score: 96/100");
    expect(report).toContain("Grade: A");
    expect(report).toContain("Status: ✅ HEALTHY");
    expect(report).toContain("Orphan Count:");
    expect(report).toContain("Index Coverage:");
    expect(report).toContain("Tenant Isolation:");
    expect(report).toContain("Cascade Behavior:");
    expect(report).toContain("Recommendations:");
  });

  it("should format CRITICAL status with warning emoji", () => {
    const score: GraphHealthScore = {
      overall: 45,
      grade: "F",
      status: "CRITICAL",
      dimensions: {
        orphanScore: 0,
        indexScore: 20,
        tenantScore: 25,
        cascadeScore: 0,
      },
      recommendations: ["❌ Overall health CRITICAL. Block deployment."],
    };

    const report = formatHealthReport(score);

    expect(report).toContain("Status: ❌ CRITICAL");
  });

  it("should format WARNING status for grade B reports", () => {
    const score: GraphHealthScore = {
      overall: 84,
      grade: "B",
      status: "WARNING",
      dimensions: {
        orphanScore: 30,
        indexScore: 19,
        tenantScore: 25,
        cascadeScore: 10,
      },
      recommendations: [
        "⚠️  Overall health WARNING. Schedule cleanup within 1 week to prevent degradation.",
      ],
    };

    const report = formatHealthReport(score);

    expect(report).toContain("Grade: B");
    expect(report).toContain("Status: ⚠️ WARNING");
  });
});
