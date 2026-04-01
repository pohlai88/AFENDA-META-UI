/**
 * Load Tests: Graph Validation
 * ============================
 * Keeps performance tests deterministic while validating behavior at scale.
 *
 * CI: keep `graph-validation` workflow `timeout-minutes` above worst-case orphan scan
 * for your FK count; prefer scheduled jobs for full prod graphs if needed.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import type { FkRelationship, FkValidationCatalog } from "../fk-catalog.js";
import { detectAllOrphans, type OrphanDetectionResults } from "../orphan-detection.js";
import { calculateHealthScore, type ValidationInputs } from "../health-scoring.js";

const createMockDbWithLatency = (latencyMs = 1) => {
  const executeMock = vi.fn(async () => {
    await new Promise((resolve) => setTimeout(resolve, latencyMs));
    return { rows: [] };
  });

  return {
    execute: executeMock,
    _executeMock: executeMock,
  } as any;
};

const createRelationship = (i: number): FkRelationship => ({
  constraintName: `fk_${i}`,
  childTableSchema: "sales",
  childTableName: `child_table_${i % 100}`,
  childColumnName: "parent_id",
  parentTableSchema: "sales",
  parentTableName: `parent_table_${i % 50}`,
  parentColumnName: "id",
  deleteRule: "CASCADE",
  updateRule: "CASCADE",
  relationshipType: "many-to-one",
  validationPriority: (["P0", "P1", "P2", "P3"] as const)[i % 4],
  isOptional: i % 5 === 0,
  tenantIsolated: i % 2 === 0,
});

const createLargeCatalog = (relationshipCount: number): FkValidationCatalog => {
  const relationships = Array.from({ length: relationshipCount }, (_, i) => createRelationship(i));

  return {
    schemasCovered: ["sales"],
    relationships,
    tables: [],
    byPriority: {
      P0: relationships.filter((r) => r.validationPriority === "P0"),
      P1: relationships.filter((r) => r.validationPriority === "P1"),
      P2: relationships.filter((r) => r.validationPriority === "P2"),
      P3: relationships.filter((r) => r.validationPriority === "P3"),
    },
  };
};

describe("Load Tests: Graph Validation", () => {
  describe("Catalog scale", () => {
    it("handles 279 relationships", () => {
      const catalog = createLargeCatalog(279);
      expect(catalog.relationships).toHaveLength(279);
      expect(catalog.byPriority.P0.length).toBeGreaterThan(0);
    });

    it("handles 1000 relationships", () => {
      const catalog = createLargeCatalog(1000);
      expect(catalog.relationships).toHaveLength(1000);
      expect(catalog.byPriority.P0).toHaveLength(250);
      expect(catalog.byPriority.P1).toHaveLength(250);
      expect(catalog.byPriority.P2).toHaveLength(250);
      expect(catalog.byPriority.P3).toHaveLength(250);
    });
  });

  describe("Orphan detection throughput", () => {
    let mockDb: ReturnType<typeof createMockDbWithLatency>;

    beforeEach(() => {
      mockDb = createMockDbWithLatency(1);
    });

    it("processes 279 checks in bounded time", async () => {
      const catalog = createLargeCatalog(279);
      const start = Date.now();
      const result = await detectAllOrphans(mockDb, catalog.relationships);
      const duration = Date.now() - start;

      expect(mockDb._executeMock).toHaveBeenCalledTimes(279);
      expect(result.total).toBe(0);
      expect(duration).toBeLessThan(2000);
    });

    it("filters by priority efficiently", async () => {
      const catalog = createLargeCatalog(1000);
      await detectAllOrphans(mockDb, catalog.relationships, "P0");
      expect(mockDb._executeMock).toHaveBeenCalledTimes(250);
    });

    it("handles large orphan totals with bounded sample memory", async () => {
      const relationships = Array.from({ length: 20 }, (_, i) => createRelationship(i));
      mockDb._executeMock.mockResolvedValue({
        rows: [
          {
            child_table_schema: "sales",
            parent_table_schema: "sales",
            child_table: "child_table_0",
            parent_table: "parent_table_0",
            fk_column: "parent_id",
            parent_column: "id",
            orphan_count: 50000,
            sample_ids: Array.from({ length: 10 }, (_, i) => String(i + 1)),
          },
        ],
      });

      const result = await detectAllOrphans(mockDb, relationships);
      const samples = Array.from(result.byTable.values()).flat().flatMap((r) => r.sampleIds);

      expect(result.total).toBe(1000000);
      expect(samples.length).toBeLessThanOrEqual(200);
    });
  });

  describe("Health scoring at scale", () => {
    it("scores quickly for 1M-orphan synthetic dataset", () => {
      const catalog = createLargeCatalog(1000);
      const orphans: OrphanDetectionResults = {
        total: 1000000,
        byTable: new Map(),
        byPriority: {
          P0: Array.from({ length: 250 }, () => ({
            childTableSchema: "sales",
            childTableName: "a",
            parentTableSchema: "sales",
            parentTableName: "b",
            childTable: "sales.a",
            parentTable: "sales.b",
            fkColumn: "parent_id",
            parentColumn: "id",
            orphanCount: 1000,
            sampleIds: [],
          })),
          P1: [],
          P2: [],
          P3: [],
        },
        criticalViolations: Array.from({ length: 250 }, () => ({
          childTableSchema: "sales",
          childTableName: "a",
          parentTableSchema: "sales",
          parentTableName: "b",
          childTable: "sales.a",
          parentTable: "sales.b",
          fkColumn: "parent_id",
          parentColumn: "id",
          orphanCount: 1000,
          sampleIds: [],
        })),
      };

      const inputs: ValidationInputs = {
        orphans,
        tenantLeaks: { totalLeaks: 0, byTable: new Map(), allViolations: [], isSecure: true },
        catalog,
        indexCoverage: { covered: 1000, total: 1000 },
        cascadeErrors: 0,
      };

      const start = Date.now();
      const score = calculateHealthScore(inputs);
      const duration = Date.now() - start;

      expect(score.overall).toBeGreaterThanOrEqual(0);
      expect(score.overall).toBeLessThanOrEqual(100);
      expect(duration).toBeLessThan(200);
    });
  });

  describe("Concurrent execution", () => {
    it("runs independent priority checks in parallel", async () => {
      const catalog = createLargeCatalog(400);
      const mockDb = createMockDbWithLatency(2);

      await Promise.all([
        detectAllOrphans(mockDb, catalog.relationships, "P0"),
        detectAllOrphans(mockDb, catalog.relationships, "P1"),
      ]);

      expect(mockDb._executeMock).toHaveBeenCalledTimes(200);
    });
  });
});
