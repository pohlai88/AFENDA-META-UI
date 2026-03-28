import { describe, expect, it } from "vitest";

import type { NormalizedTruthModel } from "../types.js";

import { compareTruthToSchema, formatSchemaCompareReport } from "../schema-compiler.js";

const NORMALIZED_FIXTURE: NormalizedTruthModel = {
  entities: [
    {
      name: "sales_order",
      table: "sales_orders",
      fields: {
        id: { type: "uuid", primary: true },
      },
    },
    {
      name: "subscription",
      table: "subscriptions",
      fields: {
        id: { type: "uuid", primary: true },
      },
    },
  ],
  invariants: [],
  crossInvariants: [],
  mutationPolicies: [],
  stateMachines: [],
  events: [],
  namespace: "sales",
};

describe("schema compiler compare mode", () => {
  it("returns deterministic sorted table sets and detects missing tables", () => {
    const result = compareTruthToSchema(NORMALIZED_FIXTURE, {
      drizzleQualifiedTables: [
        "sales.subscriptions",
        "sales.subscriptions",
        "sales.partners",
        "sales.z_table",
      ],
    });

    expect(result.truthTables).toEqual(["sales.sales_orders", "sales.subscriptions"]);
    expect(result.drizzleTables).toEqual([
      "sales.partners",
      "sales.subscriptions",
      "sales.z_table",
    ]);
    expect(result.missingInDrizzle).toEqual(["sales.sales_orders"]);
    expect(result.status).toBe("drift");
  });

  it("supports strict unmanaged-table failure behavior", () => {
    const result = compareTruthToSchema(NORMALIZED_FIXTURE, {
      drizzleQualifiedTables: ["sales.sales_orders", "sales.subscriptions", "sales.partners"],
      failOnUnmanagedTables: true,
    });

    expect(result.missingInDrizzle).toEqual([]);
    expect(result.unmanagedInDrizzle).toEqual(["sales.partners"]);
    expect(result.status).toBe("drift");
  });

  it("formats a stable human-readable drift report", () => {
    const result = compareTruthToSchema(NORMALIZED_FIXTURE, {
      drizzleQualifiedTables: ["sales.subscriptions"],
    });

    const report = formatSchemaCompareReport(result);

    expect(report).toContain("truth:schema:compare DRIFT");
    expect(report).toContain("- missing in drizzle:");
    expect(report).toContain("sales.sales_orders");
  });
});
