/**
 * Integration Tests: Index Remediation
 * =====================================
 * Tests public index-remediation API against current implementation:
 * - detectMissingFkIndexes
 * - generateCreateIndexSQL
 * - generateRemediationScript
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  detectMissingFkIndexes,
  generateCreateIndexSQL,
  generateRemediationScript,
  type MissingIndexResult,
} from "../index-remediation.js";
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

describe("Index Remediation", () => {
  let mockDb: ReturnType<typeof createMockDb>;

  beforeEach(() => {
    mockDb = createMockDb();
  });

  describe("detectMissingFkIndexes", () => {
    it("identifies all FK columns regardless of index status", async () => {
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
        .mockResolvedValueOnce({ rows: [{ hasIndex: 1 }] }) // order_id exists
        .mockResolvedValueOnce({ rows: [{ hasIndex: 0 }] }) // country_id missing
        .mockResolvedValueOnce({ rows: [{ hasIndex: 1 }] }); // category_id exists

      const result = await detectMissingFkIndexes(mockDb, relationships);

      expect(result.total).toBe(3);
      expect(result.missing).toBe(1);
      expect(result.allResults).toHaveLength(3);
      expect(result.byPriority.P0).toHaveLength(0);
      expect(result.byPriority.P1).toHaveLength(1);
      expect(result.byPriority.P2).toHaveLength(0);
    });

    it("respects priority filtering", async () => {
      const relationships: FkRelationship[] = [
        createMockRelationship({ constraintName: "fk_p0", validationPriority: "P0" }),
        createMockRelationship({ constraintName: "fk_p1", validationPriority: "P1" }),
        createMockRelationship({ constraintName: "fk_p2", validationPriority: "P2" }),
      ];

      mockDb._executeMock.mockResolvedValueOnce({
        rows: [{ hasIndex: 0 }],
      });

      const result = await detectMissingFkIndexes(mockDb, relationships, "P0");

      expect(mockDb._executeMock).toHaveBeenCalledTimes(1);
      expect(result.total).toBe(1);
      expect(result.missing).toBe(1);
    });

    it("groups results by table", async () => {
      const relationships: FkRelationship[] = [
        createMockRelationship({
          childTableName: "sales_order_lines",
          childColumnName: "order_id",
        }),
        createMockRelationship({
          childTableName: "sales_order_lines",
          childColumnName: "product_id",
          constraintName: "fk_sol_product_id",
        }),
        createMockRelationship({
          childTableName: "partners",
          childColumnName: "country_id",
          constraintName: "fk_partner_country",
        }),
      ];

      mockDb._executeMock.mockResolvedValue({ rows: [{ hasIndex: 0 }] });

      const result = await detectMissingFkIndexes(mockDb, relationships);

      expect(result.byTable.get("sales.sales_order_lines")).toHaveLength(2);
      expect(result.byTable.get("sales.partners")).toHaveLength(1);
    });

    it("generates correct index names following naming convention", async () => {
      const relationships: FkRelationship[] = [
        createMockRelationship({
          childTableName: "sales_order_lines",
          childColumnName: "order_id",
        }),
      ];

      mockDb._executeMock.mockResolvedValueOnce({ rows: [{ hasIndex: 0 }] });

      const result = await detectMissingFkIndexes(mockDb, relationships);
      const firstResult = result.allResults[0];

      expect(firstResult.indexName).toBe("idx_sales_order_lines_order_id");
    });

    it("throws error when database query fails", async () => {
      const relationships: FkRelationship[] = [
        createMockRelationship({ constraintName: "fk_1" }),
      ];

      mockDb._executeMock.mockRejectedValueOnce(new Error("Query error"));

      await expect(detectMissingFkIndexes(mockDb, relationships)).rejects.toThrow(
        "Query error"
      );
    });
  });

  describe("generateCreateIndexSQL", () => {
    it("generates valid CREATE INDEX statement", () => {
      const result: MissingIndexResult = {
        childTable: "sales.sales_order_lines",
        childColumn: "order_id",
        priority: "P0",
        indexName: "idx_sales_order_lines_order_id",
        hasIndex: false,
      };

      const sql = generateCreateIndexSQL(result);

      expect(sql).toBe(
        "CREATE INDEX CONCURRENTLY idx_sales_order_lines_order_id ON sales.sales_order_lines (order_id);"
      );
    });

    it("supports schema-qualified table names", () => {
      const result: MissingIndexResult = {
        childTable: "public.users",
        childColumn: "tenant_id",
        priority: "P1",
        indexName: "idx_users_tenant_id",
        hasIndex: false,
      };

      const sql = generateCreateIndexSQL(result);

      expect(sql).toContain("ON public.users (tenant_id)");
    });

    it("generates concurrent index creation for safe concurrency", () => {
      const result: MissingIndexResult = {
        childTable: "sales.products",
        childColumn: "category_id",
        priority: "P2",
        indexName: "idx_products_category_id",
        hasIndex: false,
      };

      const sql = generateCreateIndexSQL(result);

      expect(sql).toContain("CREATE INDEX CONCURRENTLY");
    });
  });

  describe("generateRemediationScript", () => {
    it("generates script with comments and summaries", () => {
      const results: MissingIndexResult[] = [
        {
          childTable: "sales.sales_order_lines",
          childColumn: "order_id",
          priority: "P0",
          indexName: "idx_sales_order_lines_order_id",
          hasIndex: false,
        },
        {
          childTable: "sales.partners",
          childColumn: "country_id",
          priority: "P1",
          indexName: "idx_partners_country_id",
          hasIndex: false,
        },
      ];

      const script = generateRemediationScript(results, true);

      expect(script).toContain("-- Missing Index Remediation Script");
      expect(script).toContain("Generated:");
      expect(script).toContain("Total FK columns: 2");
      expect(script).toContain("Missing indexes: 2");
      expect(script).toContain("P0 (Critical):  1 missing");
      expect(script).toContain("P1 (High):      1 missing");
    });

    it("groups indexes by priority", () => {
      const results: MissingIndexResult[] = [
        {
          childTable: "sales.table1",
          childColumn: "col1",
          priority: "P0",
          indexName: "idx_table1_col1",
          hasIndex: false,
        },
        {
          childTable: "sales.table2",
          childColumn: "col2",
          priority: "P1",
          indexName: "idx_table2_col2",
          hasIndex: false,
        },
        {
          childTable: "sales.table3",
          childColumn: "col3",
          priority: "P1",
          indexName: "idx_table3_col3",
          hasIndex: false,
        },
      ];

      const script = generateRemediationScript(results, true);

      const p0Index = script.indexOf("-- P0 (Critical)");
      const p1Index = script.indexOf("-- P1 (High)");

      expect(p0Index).toBeGreaterThan(-1);
      expect(p1Index).toBeGreaterThan(-1);
      expect(p1Index).toBeGreaterThan(p0Index);
    });

    it("returns placeholder when no missing indexes", () => {
      const resultsWithIndexes: MissingIndexResult[] = [
        {
          childTable: "sales.table1",
          childColumn: "col1",
          priority: "P0",
          indexName: "idx_table1_col1",
          hasIndex: true,
        },
      ];

      const script = generateRemediationScript(resultsWithIndexes, true);

      expect(script).toBe("-- No missing indexes on FK columns");
    });

    it("includes CREATE INDEX statements for all missing indexes", () => {
      const results: MissingIndexResult[] = [
        {
          childTable: "sales.sales_order_lines",
          childColumn: "order_id",
          priority: "P0",
          indexName: "idx_sales_order_lines_order_id",
          hasIndex: false,
        },
        {
          childTable: "sales.partners",
          childColumn: "country_id",
          priority: "P1",
          indexName: "idx_partners_country_id",
          hasIndex: false,
        },
      ];

      const script = generateRemediationScript(results, true);

      expect(script).toContain("CREATE INDEX CONCURRENTLY idx_sales_order_lines_order_id");
      expect(script).toContain("CREATE INDEX CONCURRENTLY idx_partners_country_id");
    });

    it("only includes missing indexes in script, not existing ones", () => {
      const results: MissingIndexResult[] = [
        {
          childTable: "sales.table1",
          childColumn: "col1",
          priority: "P0",
          indexName: "idx_table1_col1",
          hasIndex: true, // already has index
        },
        {
          childTable: "sales.table2",
          childColumn: "col2",
          priority: "P1",
          indexName: "idx_table2_col2",
          hasIndex: false, // missing index
        },
      ];

      const script = generateRemediationScript(results, true);

      expect(script).not.toContain("idx_table1_col1");
      expect(script).toContain("idx_table2_col2");
      expect(script).toContain("Missing indexes: 1");
    });
  });
});
