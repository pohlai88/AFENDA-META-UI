import { describe, it, expect } from "vitest";
import {
  entityToSchemaKey,
  entityToTableName,
  tableNameToSchemaKey,
} from "../harness/table-names.js";

describe("table-names utilities", () => {
  it("maps business aliases to schema keys", () => {
    expect(entityToSchemaKey("customer")).toBe("partners");
    expect(entityToSchemaKey("vendor")).toBe("partners");
    expect(entityToSchemaKey("supplier")).toBe("partners");
  });

  it("applies pluralization heuristics for schema keys", () => {
    expect(entityToSchemaKey("category")).toBe("categories");
    expect(entityToSchemaKey("sales")).toBe("sales");
    expect(entityToSchemaKey("product")).toBe("products");
    expect(entityToSchemaKey("salesOrder")).toBe("salesOrders");
  });

  it("converts entities to table names", () => {
    expect(entityToTableName("customer")).toBe("partner");
    expect(entityToTableName("vendor")).toBe("partner");
    expect(entityToTableName("salesOrder")).toBe("sales_order");
    expect(entityToTableName("productCategory")).toBe("product_category");
  });

  it("converts snake_case table names back to schema keys", () => {
    expect(tableNameToSchemaKey("sales_orders")).toBe("salesOrders");
    expect(tableNameToSchemaKey("product_categories")).toBe("productCategories");
    expect(tableNameToSchemaKey("partners")).toBe("partners");
  });
});
