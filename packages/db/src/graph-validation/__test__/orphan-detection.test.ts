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

/** Simulates a row returned by `generateOrphanQuery` against Postgres. */
function orphanDbRow(opts: {
  childSchema?: string;
  parentSchema?: string;
  childTable: string;
  parentTable: string;
  fkColumn: string;
  parentColumn?: string;
  orphanCount: number;
  sampleIds?: (string | number)[] | null;
}) {
  return {
    child_table_schema: opts.childSchema ?? "sales",
    parent_table_schema: opts.parentSchema ?? "sales",
    child_table: opts.childTable,
    parent_table: opts.parentTable,
    fk_column: opts.fkColumn,
    parent_column: opts.parentColumn ?? "id",
    orphan_count: opts.orphanCount,
    sample_ids: opts.sampleIds == null ? null : opts.sampleIds.map(String),
  };
}

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
            orphanDbRow({
              childTable: "sales_order_lines",
              parentTable: "sales_orders",
              fkColumn: "order_id",
              orphanCount: 150,
              sampleIds: [1, 2, 3],
            }),
          ],
        })
        .mockResolvedValueOnce({
          rows: [
            orphanDbRow({
              childTable: "partners",
              parentTable: "countries",
              fkColumn: "country_id",
              orphanCount: 45,
              sampleIds: [10, 11],
            }),
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
          orphanDbRow({
            childTable: "sales_order_lines",
            parentTable: "sales_orders",
            fkColumn: "order_id",
            orphanCount: 10,
            sampleIds: [1],
          }),
        ],
      });

      const result = await detectAllOrphans(mockDb, relationships, "P0");

      expect(mockDb._executeMock).toHaveBeenCalledTimes(1);
      expect(result.total).toBe(10);
      expect(result.byPriority.P0).toHaveLength(1);
      expect(result.byPriority.P1).toHaveLength(0);
    });

    it("fails when a query errors (fail-closed; no silent skip)", async () => {
      const relationships: FkRelationship[] = [createMockRelationship({ constraintName: "fk_1" })];
      mockDb._executeMock.mockRejectedValueOnce(new Error("Query timeout"));

      await expect(detectAllOrphans(mockDb, relationships)).rejects.toThrow(/Orphan detection failed/);
      expect(mockDb._executeMock).toHaveBeenCalledTimes(1);
    });

    it("defaults sampleIds to empty array when database returns null sample_ids", async () => {
      const relationships: FkRelationship[] = [createMockRelationship()];

      mockDb._executeMock.mockResolvedValueOnce({
        rows: [
          orphanDbRow({
            childTable: "sales_order_lines",
            parentTable: "sales_orders",
            fkColumn: "order_id",
            orphanCount: 5,
            sampleIds: null,
          }),
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
          orphanDbRow({
            childTable: "unmapped_child",
            parentTable: "unmapped_parent",
            fkColumn: "unmapped_fk",
            parentColumn: "id",
            orphanCount: 7,
            sampleIds: [1],
          }),
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
            orphanDbRow({
              childTable: "sales_order_lines",
              parentTable: "sales_orders",
              fkColumn: "order_id",
              orphanCount: 14,
              sampleIds: [1, 2],
            }),
          ],
        })
        .mockResolvedValueOnce({
          rows: [
            orphanDbRow({
              childTable: "partners_history",
              parentTable: "partners",
              fkColumn: "partner_id",
              orphanCount: 50,
              sampleIds: [10, 11],
            }),
          ],
        })
        .mockResolvedValueOnce({
          rows: [
            orphanDbRow({
              childTable: "tax_assignments",
              parentTable: "tax_codes",
              fkColumn: "tax_code",
              orphanCount: 1200,
              sampleIds: [100, 101],
            }),
          ],
        })
        .mockResolvedValueOnce({
          rows: [
            orphanDbRow({
              childTable: "currency_rates",
              parentTable: "currencies",
              fkColumn: "currency_code",
              parentColumn: "code",
              orphanCount: 500,
              sampleIds: [200, 201],
            }),
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
    const salesOrderLineOrphan = (): OrphanQueryResult => ({
      childTableSchema: "sales",
      childTableName: "sales_order_lines",
      parentTableSchema: "sales",
      parentTableName: "sales_orders",
      childTable: "sales.sales_order_lines",
      parentTable: "sales.sales_orders",
      fkColumn: "order_id",
      parentColumn: "id",
      orphanCount: 150,
      sampleIds: ["1001", "1002", "1003"],
    });

    it("generates apply SQL for cleanup", () => {
      const orphanResult = salesOrderLineOrphan();

      const sql = generateCleanupSQL(orphanResult, false);

      expect(sql).toContain("-- CLEANUP: Delete orphaned records from sales.sales_order_lines");
      expect(sql).toContain("DELETE FROM sales.sales_order_lines c");
      expect(sql).toContain("NOT EXISTS");
      expect(sql).toContain("p.id = c.order_id");
      expect(sql).toContain("Expected to delete: 150 records");
    });

    it("generates dry-run SQL with sample FK values", () => {
      const orphanResult = salesOrderLineOrphan();

      const sql = generateCleanupSQL(orphanResult, true);

      expect(sql).toContain("-- DRY RUN: Orphaned records in sales.sales_order_lines (150 total)");
      expect(sql).toContain("-- Sample FK values: 1001, 1002, 1003");
      expect(sql).toContain("-- DELETE FROM sales.sales_order_lines c");
      expect(sql).toContain("NOT EXISTS");
    });

    it("supports non-id parent keys", () => {
      const orphanResult: OrphanQueryResult = {
        childTableSchema: "sales",
        childTableName: "currency_rates",
        parentTableSchema: "sales",
        parentTableName: "currencies",
        childTable: "sales.currency_rates",
        parentTable: "sales.currencies",
        fkColumn: "currency_code",
        parentColumn: "code",
        orphanCount: 10,
        sampleIds: [],
      };

      const sql = generateCleanupSQL(orphanResult, false);

      expect(sql).toContain("DELETE FROM sales.currency_rates c");
      expect(sql).toContain("p.code = c.currency_code");
    });
  });

  describe("generateDeleteSQL", () => {
    it("uses NOT EXISTS with explicit schemas and parent key column", () => {
      const orphanResult: OrphanQueryResult = {
        childTableSchema: "sales",
        childTableName: "sales_order_lines",
        parentTableSchema: "sales",
        parentTableName: "sales_orders",
        childTable: "sales.sales_order_lines",
        parentTable: "sales.sales_orders",
        fkColumn: "order_id",
        parentColumn: "id",
        orphanCount: 5,
        sampleIds: [],
      };

      const sql = generateDeleteSQL(orphanResult);

      expect(sql).toContain("DELETE FROM sales.sales_order_lines c");
      expect(sql).toContain("FROM sales.sales_orders p");
      expect(sql).toContain("NOT EXISTS");
      expect(sql).toContain("p.id = c.order_id");
    });

    it("supports cross-schema FK cleanup SQL", () => {
      const orphanResult: OrphanQueryResult = {
        childTableSchema: "hr",
        childTableName: "employees",
        parentTableSchema: "core",
        parentTableName: "tenants",
        childTable: "hr.employees",
        parentTable: "core.tenants",
        fkColumn: "tenant_id",
        parentColumn: "id",
        orphanCount: 5,
        sampleIds: [],
      };

      const sql = generateDeleteSQL(orphanResult);

      expect(sql).toContain("DELETE FROM hr.employees c");
      expect(sql).toContain("FROM core.tenants p");
      expect(sql).toContain("p.id = c.tenant_id");
    });
  });
});
