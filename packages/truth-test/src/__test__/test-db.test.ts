import { beforeEach, describe, expect, it, vi } from "vitest";

const mockState = vi.hoisted(() => {
  const salesOrders = {
    id: { name: "id" },
    status: { name: "status" },
    tenantId: { name: "tenantId" },
    __config: { schema: "sales", name: "sales_orders" },
  };

  const partners = {
    id: { name: "id" },
    name: { name: "name" },
    __config: { schema: "core", name: "partners" },
  };

  return {
    schema: {
      salesOrders,
      partners,
      unknownEntities: undefined,
      _privateThing: {},
      notATable: "nope",
    },
    eq: vi.fn((column, value) => ({ kind: "eq", column, value })),
    and: vi.fn((...conditions) => ({ kind: "and", conditions })),
    sqlRaw: vi.fn((query: string) => ({ raw: query })),
    getTableConfig: vi.fn((obj: any) => {
      if (obj && obj.__config) return obj.__config;
      throw new Error("not a table");
    }),
    db: {
      select: vi.fn(),
      insert: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      execute: vi.fn(),
    },
  };
});

vi.mock("drizzle-orm", () => ({
  eq: mockState.eq,
  and: mockState.and,
  or: vi.fn(),
  inArray: vi.fn(),
  sql: {
    raw: mockState.sqlRaw,
  },
}));

vi.mock("drizzle-orm/pg-core", () => ({
  getTableConfig: mockState.getTableConfig,
}));

vi.mock("@afenda/db", () => ({
  db: mockState.db,
}));

vi.mock("@afenda/db/schema", () => mockState.schema);

let createTestDB: typeof import("../harness/test-db.js").createTestDB;

describe("test-db", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    vi.resetModules();
    ({ createTestDB } = await import("../harness/test-db.js"));
  });

  it("findOne resolves records using alias mapping", async () => {
    const dbApi = createTestDB();

    const limit = vi.fn().mockResolvedValue([{ id: 1, name: "Acme" }]);
    const where = vi.fn(() => ({ limit }));
    const from = vi.fn(() => ({ where }));
    mockState.db.select.mockReturnValue({ from });

    const result = await dbApi.findOne("customer", { id: 1 });

    expect(mockState.db.select).toHaveBeenCalledTimes(1);
    expect(from).toHaveBeenCalledWith(mockState.schema.partners);
    expect(mockState.eq).toHaveBeenCalledTimes(1);
    expect(limit).toHaveBeenCalledWith(1);
    expect(result).toEqual({ id: 1, name: "Acme" });
  });

  it("findOne throws for unknown table", async () => {
    const dbApi = createTestDB();

    await expect(dbApi.findOne("unknownEntity", { id: 1 })).rejects.toThrow(
      'Table "unknownEntity" → schema key "unknownEntities" not found in schema'
    );
  });

  it("findOne throws when filter is empty", async () => {
    const dbApi = createTestDB();

    await expect(dbApi.findOne("salesOrder", {})).rejects.toThrow(
      "findOne requires at least one filter condition"
    );
  });

  it("findOne throws when column does not exist", async () => {
    const dbApi = createTestDB();

    await expect(dbApi.findOne("salesOrder", { missingCol: 1 } as any)).rejects.toThrow(
      'Column "missingCol" not found in table "salesOrder"'
    );
  });

  it("find without filters returns all records", async () => {
    const dbApi = createTestDB();

    const from = vi.fn().mockResolvedValue([{ id: 1 }, { id: 2 }]);
    mockState.db.select.mockReturnValue({ from });

    const result = await dbApi.find("salesOrder");

    expect(from).toHaveBeenCalledWith(mockState.schema.salesOrders);
    expect(result).toEqual([{ id: 1 }, { id: 2 }]);
  });

  it("find with multi-field filter uses AND conditions", async () => {
    const dbApi = createTestDB();

    const where = vi.fn().mockResolvedValue([{ id: 1 }]);
    const from = vi.fn(() => ({ where }));
    mockState.db.select.mockReturnValue({ from });

    const result = await dbApi.find("salesOrder", { id: 1, status: "draft" });

    expect(mockState.eq).toHaveBeenCalledTimes(2);
    expect(mockState.and).toHaveBeenCalledTimes(1);
    expect(result).toEqual([{ id: 1 }]);
  });

  it("insert returns created row and throws if none is returned", async () => {
    const dbApi = createTestDB();

    const returningOk = vi.fn().mockResolvedValue([{ id: 7, status: "draft" }]);
    const valuesOk = vi.fn(() => ({ returning: returningOk }));
    mockState.db.insert.mockReturnValue({ values: valuesOk });

    const result = await dbApi.insert("salesOrder", { status: "draft" });

    expect(result).toEqual({ id: 7, status: "draft" });

    const returningEmpty = vi.fn().mockResolvedValue([]);
    const valuesEmpty = vi.fn(() => ({ returning: returningEmpty }));
    mockState.db.insert.mockReturnValue({ values: valuesEmpty });

    await expect(dbApi.insert("salesOrder", { status: "draft" })).rejects.toThrow(
      'Insert into "salesOrder" failed: no record returned'
    );
  });

  it("update and delete enforce safe filters and return affected counts", async () => {
    const dbApi = createTestDB();

    const updateReturning = vi.fn().mockResolvedValue([{ id: 1 }, { id: 2 }]);
    const updateWhere = vi.fn(() => ({ returning: updateReturning }));
    const updateSet = vi.fn(() => ({ where: updateWhere }));
    mockState.db.update.mockReturnValue({ set: updateSet });

    const updatedCount = await dbApi.update("salesOrder", { status: "draft" }, { status: "approved" });
    expect(updatedCount).toBe(2);

    const deleteReturning = vi.fn().mockResolvedValue([{ id: 1 }]);
    const deleteWhere = vi.fn(() => ({ returning: deleteReturning }));
    mockState.db.delete.mockReturnValue({ where: deleteWhere });

    const deletedCount = await dbApi.delete("salesOrder", { status: "approved" });
    expect(deletedCount).toBe(1);

    await expect(dbApi.update("salesOrder", {}, { status: "x" })).rejects.toThrow(
      "update requires at least one filter condition"
    );
    await expect(dbApi.delete("salesOrder", {})).rejects.toThrow(
      "delete requires at least one filter condition"
    );
  });

  it("sql executes raw queries and returns result rows", async () => {
    const dbApi = createTestDB();
    mockState.db.execute.mockResolvedValue({ rows: [{ count: "2" }] });

    const rows = await dbApi.sql<{ count: string }>("SELECT COUNT(*) as count FROM sales.sales_orders");

    expect(mockState.sqlRaw).toHaveBeenCalledWith("SELECT COUNT(*) as count FROM sales.sales_orders");
    expect(rows).toEqual([{ count: "2" }]);
  });

  it("reset enforces test-only safety guard", async () => {
    const dbApi = createTestDB();

    const oldNodeEnv = process.env.NODE_ENV;
    const oldVitest = process.env.VITEST;

    process.env.NODE_ENV = "production";
    delete process.env.VITEST;

    await expect(dbApi.reset()).rejects.toThrow("TestDB.reset() is only allowed in test environments");

    process.env.NODE_ENV = oldNodeEnv;
    if (oldVitest) process.env.VITEST = oldVitest;
  });

  it("reset truncates all discovered tables in reverse order", async () => {
    const dbApi = createTestDB();

    const oldNodeEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = "test";

    mockState.db.execute.mockResolvedValue({ rows: [] });

    await dbApi.reset();

    expect(mockState.db.execute).toHaveBeenCalled();
    const queries = mockState.db.execute.mock.calls.map((c) => c[0]?.raw);
    expect(queries).toContain('TRUNCATE TABLE "core"."partners" CASCADE');
    expect(queries).toContain('TRUNCATE TABLE "sales"."sales_orders" CASCADE');

    process.env.NODE_ENV = oldNodeEnv;
  });

  it("getEvents returns an empty array", () => {
    const dbApi = createTestDB();
    expect(dbApi.getEvents()).toEqual([]);
  });
});
