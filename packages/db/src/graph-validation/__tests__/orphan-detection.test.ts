/**
 * Integration Tests: Orphan Detection
 * ====================================
 * Tests public orphan-detection API against current implementation:
 * - detectAllOrphans
 * - generateCleanupSQL
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  detectAllOrphans,
  generateCleanupSQL,
  generateDeleteSQL,
  type OrphanQueryResult,
} from "../orphan-detection.js";
import type { FkRelationship } from "../fk-catalog.js";

const createMockDb = () => {
  const executeMock = vi.fn();
  return {
    execute: executeMock,
    _executeMock: executeMock,
  } as any;
};

const createMockRelationship = (overrides?: Partial<FkRelationship>): FkRelationship => ({
  constraintName: "fk_sales_order_lines_order_id",
  childTableSchema: "sales",
  childTableName: "sales_order_lines",
  childColumnName: "order_id",
  parentTableSchema: "sales",
  parentTableName: "sales_orders",
  parentColumnName: "id",
  deleteRule: "CASCADE",
  updateRule: "CASCADE",
  relationshipType: "many-to-one",
  validationPriority: "P0",
  isOptional: false,
  tenantIsolated: true,
  ...overrides,
});

describe("Orphan Detection", () => {
  let mockDb: ReturnType<typeof createMockDb>;

  beforeEach(() => {
    mockDb = createMockDb();
  });

  describe("detectAllOrphans", () => {
    it("aggregates totals and groups by priority", async () => {
      const relationships: FkRelationship[] = [
        createMockRelationship({ validationPriority: "P0" }),
        createMockRelationship({
          constraintName: "fk_partner_country",
          childTableName: "partners",
          childColumnName: "country_id",
          parentTableName: "countries",
          validationPriority: "P1",
        }),
        createMockRelationship({
          constraintName: "fk_product_category",
          childTableName: "products",
          childColumnName: "category_id",
          parentTableName: "categories",
          validationPriority: "P2",
        }),
      ];

      mockDb._executeMock
        .mockResolvedValueOnce({
          rows: [
            {
              child_table: "sales_order_lines",
              parent_table: "sales_orders",
              fk_column: "order_id",
              orphan_count: 150,
              sample_ids: [1, 2, 3],
            },
          ],
        })
        .mockResolvedValueOnce({
          rows: [
            {
              child_table: "partners",
              parent_table: "countries",
              fk_column: "country_id",
              orphan_count: 45,
              sample_ids: [10, 11],
            },
          ],
        })
        .mockResolvedValueOnce({ rows: [] });

      const result = await detectAllOrphans(mockDb, relationships);

      expect(result.total).toBe(195);
      expect(result.byPriority.P0).toHaveLength(1);
      expect(result.byPriority.P1).toHaveLength(1);
      expect(result.byPriority.P2).toHaveLength(0);
      expect(result.criticalViolations).toHaveLength(2);
    });

    it("respects priority filtering", async () => {
      const relationships: FkRelationship[] = [
        createMockRelationship({ constraintName: "fk_p0", validationPriority: "P0" }),
        createMockRelationship({ constraintName: "fk_p1", validationPriority: "P1" }),
        createMockRelationship({ constraintName: "fk_p2", validationPriority: "P2" }),
      ];

      mockDb._executeMock.mockResolvedValueOnce({
        rows: [
          {
            child_table: "sales_order_lines",
            parent_table: "sales_orders",
            fk_column: "order_id",
            orphan_count: 10,
            sample_ids: [1],
          },
        ],
      });

      const result = await detectAllOrphans(mockDb, relationships, "P0");

      expect(mockDb._executeMock).toHaveBeenCalledTimes(1);
      expect(result.total).toBe(10);
      expect(result.byPriority.P0).toHaveLength(1);
      expect(result.byPriority.P1).toHaveLength(0);
    });

    it("continues processing when one query errors", async () => {
      const relationships: FkRelationship[] = [
        createMockRelationship({ constraintName: "fk_1" }),
        createMockRelationship({ constraintName: "fk_2" }),
        createMockRelationship({ constraintName: "fk_3" }),
      ];

      mockDb._executeMock
        .mockResolvedValueOnce({
          rows: [
            {
              child_table: "sales_order_lines",
              parent_table: "sales_orders",
              fk_column: "order_id",
              orphan_count: 10,
              sample_ids: [],
            },
          ],
        })
        .mockRejectedValueOnce(new Error("Query timeout"))
        .mockResolvedValueOnce({
          rows: [
            {
              child_table: "sales_order_lines",
              parent_table: "sales_orders",
              fk_column: "order_id",
              orphan_count: 20,
              sample_ids: [],
            },
          ],
        });

      const result = await detectAllOrphans(mockDb, relationships);

      expect(result.total).toBe(30);
      expect(mockDb._executeMock).toHaveBeenCalledTimes(3);
    });

    it("defaults sampleIds to empty array when database returns null sample_ids", async () => {
      const relationships: FkRelationship[] = [createMockRelationship()];

      mockDb._executeMock.mockResolvedValueOnce({
        rows: [
          {
            child_table: "sales_order_lines",
            parent_table: "sales_orders",
            fk_column: "order_id",
            orphan_count: 5,
            sample_ids: null,
          },
        ],
      });

      const result = await detectAllOrphans(mockDb, relationships);

      expect(result.total).toBe(5);
      expect(result.byPriority.P0).toHaveLength(1);
      expect(result.byPriority.P0[0]?.sampleIds).toEqual([]);
    });

    it("does not assign priority bucket when returned FK identity has no relationship match", async () => {
      const relationships: FkRelationship[] = [
        createMockRelationship({ validationPriority: "P0" }),
      ];

      mockDb._executeMock.mockResolvedValueOnce({
        rows: [
          {
            child_table: "unmapped_child",
            parent_table: "unmapped_parent",
            fk_column: "unmapped_fk",
            orphan_count: 7,
            sample_ids: [1],
          },
        ],
      });

      const result = await detectAllOrphans(mockDb, relationships);

      expect(result.total).toBe(7);
      expect(result.byPriority.P0).toHaveLength(0);
      expect(result.criticalViolations).toHaveLength(0);
    });

    it("returns empty structures for empty relationship list", async () => {
      const result = await detectAllOrphans(mockDb, []);

      expect(result.total).toBe(0);
      expect(result.byPriority.P0).toHaveLength(0);
      expect(result.byPriority.P1).toHaveLength(0);
      expect(result.byPriority.P2).toHaveLength(0);
      expect(result.byPriority.P3).toHaveLength(0);
      expect(result.byTable.size).toBe(0);
      expect(mockDb._executeMock).not.toHaveBeenCalled();
    });

    it("handles post-migration mixed-priority orphan scenario", async () => {
      const relationships: FkRelationship[] = [
        createMockRelationship({ validationPriority: "P0" }),
        createMockRelationship({
          constraintName: "fk_p1",
          childTableName: "partners_history",
          childColumnName: "partner_id",
          parentTableName: "partners",
          validationPriority: "P1",
        }),
        createMockRelationship({
          constraintName: "fk_p2",
          childTableName: "tax_assignments",
          childColumnName: "tax_code",
          parentTableName: "tax_codes",
          validationPriority: "P2",
        }),
        createMockRelationship({
          constraintName: "fk_p3",
          childTableName: "currency_rates",
          childColumnName: "currency_code",
          parentTableName: "currencies",
          validationPriority: "P3",
        }),
      ];

      mockDb._executeMock
        .mockResolvedValueOnce({
          rows: [
            {
              child_table: "sales_order_lines",
              parent_table: "sales_orders",
              fk_column: "order_id",
              orphan_count: 14,
              sample_ids: [1, 2],
            },
          ],
        })
        .mockResolvedValueOnce({
          rows: [
            {
              child_table: "partners_history",
              parent_table: "partners",
              fk_column: "partner_id",
              orphan_count: 50,
              sample_ids: [10, 11],
            },
          ],
        })
        .mockResolvedValueOnce({
          rows: [
            {
              child_table: "tax_assignments",
              parent_table: "tax_codes",
              fk_column: "tax_code",
              orphan_count: 1200,
              sample_ids: [100, 101],
            },
          ],
        })
        .mockResolvedValueOnce({
          rows: [
            {
              child_table: "currency_rates",
              parent_table: "currencies",
              fk_column: "currency_code",
              orphan_count: 500,
              sample_ids: [200, 201],
            },
          ],
        });

      const result = await detectAllOrphans(mockDb, relationships);

      expect(result.total).toBe(1764);
      expect(result.criticalViolations).toHaveLength(2);
      expect(result.byPriority.P0).toHaveLength(1);
      expect(result.byPriority.P1).toHaveLength(1);
      expect(result.byPriority.P2).toHaveLength(1);
      expect(result.byPriority.P3).toHaveLength(1);
    });
  });

  describe("generateCleanupSQL", () => {
    it("generates apply SQL for cleanup", () => {
      const orphanResult: OrphanQueryResult = {
        childTable: "sales_order_lines",
        parentTable: "sales_orders",
        fkColumn: "order_id",
        orphanCount: 150,
        sampleIds: ["1001", "1002", "1003"],
      };

      const sql = generateCleanupSQL(orphanResult, false);

      expect(sql).toContain("-- CLEANUP: Delete orphaned records from sales_order_lines");
      expect(sql).toContain("DELETE FROM sales.sales_order_lines");
      expect(sql).toContain("WHERE order_id NOT IN");
      expect(sql).toContain("SELECT id FROM sales.sales_orders");
      expect(sql).toContain("Expected to delete: 150 records");
    });

    it("generates dry-run SQL with sample IDs", () => {
      const orphanResult: OrphanQueryResult = {
        childTable: "sales_order_lines",
        parentTable: "sales_orders",
        fkColumn: "order_id",
        orphanCount: 150,
        sampleIds: ["1001", "1002", "1003"],
      };

      const sql = generateCleanupSQL(orphanResult, true);

      expect(sql).toContain("-- DRY RUN: Orphaned records in sales_order_lines (150 total)");
      expect(sql).toContain("-- Sample IDs: 1001, 1002, 1003");
      expect(sql).toContain("-- DELETE FROM sales.sales_order_lines");
      expect(sql).toContain("--   SELECT id FROM sales.sales_orders");
    });

    it("supports schema-qualified table names", () => {
      const orphanResult: OrphanQueryResult = {
        childTable: "sales.sales_order_lines",
        parentTable: "sales.sales_orders",
        fkColumn: "order_id",
        orphanCount: 10,
        sampleIds: [],
      };

      const sql = generateCleanupSQL(orphanResult, false);

      expect(sql).toContain("DELETE FROM sales.sales_order_lines");
      expect(sql).toContain("SELECT id FROM sales.sales_orders");
    });
  });

  describe("generateDeleteSQL", () => {
    it("adds sales schema when table names are unqualified", () => {
      const orphanResult: OrphanQueryResult = {
        childTable: "sales_order_lines",
        parentTable: "sales_orders",
        fkColumn: "order_id",
        orphanCount: 5,
        sampleIds: [],
      };

      const sql = generateDeleteSQL(orphanResult);

      expect(sql).toContain("DELETE FROM sales.sales_order_lines");
      expect(sql).toContain("SELECT id FROM sales.sales_orders");
    });

    it("preserves schema-qualified table names", () => {
      const orphanResult: OrphanQueryResult = {
        childTable: "sales.sales_order_lines",
        parentTable: "sales.sales_orders",
        fkColumn: "order_id",
        orphanCount: 5,
        sampleIds: [],
      };

      const sql = generateDeleteSQL(orphanResult);

      expect(sql).toContain("DELETE FROM sales.sales_order_lines");
      expect(sql).toContain("SELECT id FROM sales.sales_orders");
    });
  });
});
