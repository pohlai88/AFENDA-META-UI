import { getTableColumns } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import {
  partners,
  productCategories,
  products,
  salesOrders,
  salesOrderLines,
} from "../schema/index.js";

describe("sales domain schema contracts", () => {
  it("partners table keeps identity and contact columns", () => {
    const cols = getTableColumns(partners);

    expect(cols.id).toBeDefined();
    expect(cols.name).toBeDefined();
    expect(cols.type).toBeDefined();
    expect(cols.email).toBeDefined();
    expect(cols.phone).toBeDefined();
    expect(cols.isActive).toBeDefined();
  });

  it("products table keeps catalog and pricing columns", () => {
    const cols = getTableColumns(products);

    expect(cols.id).toBeDefined();
    expect(cols.name).toBeDefined();
    expect(cols.categoryId).toBeDefined();
    expect(cols.unitPrice).toBeDefined();
    expect(cols.isActive).toBeDefined();
  });

  it("sales orders track status, customer assignment, and totals", () => {
    const cols = getTableColumns(salesOrders);

    expect(cols.id).toBeDefined();
    expect(cols.partnerId).toBeDefined();
    expect(cols.assignedToId).toBeDefined();
    expect(cols.status).toBeDefined();
    expect(cols.amountTotal).toBeDefined();
    expect(cols.orderDate).toBeDefined();
  });

  it("sales order lines reference order and product with quantity", () => {
    const cols = getTableColumns(salesOrderLines);

    expect(cols.id).toBeDefined();
    expect(cols.orderId).toBeDefined();
    expect(cols.productId).toBeDefined();
    expect(cols.quantity).toBeDefined();
    expect(cols.priceUnit).toBeDefined();
    expect(cols.subtotal).toBeDefined();
  });

  it("product categories have a name column", () => {
    const cols = getTableColumns(productCategories);

    expect(cols.id).toBeDefined();
    expect(cols.name).toBeDefined();
  });
});
