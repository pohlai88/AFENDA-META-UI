import { describe, expect, it } from "vitest";

import { buildPartitionPlan } from "../partition/partitionPlan.js";

describe("buildPartitionPlan", () => {
  it("builds default yearly windows for current and next years", () => {
    const plan = buildPartitionPlan({
      now: new Date("2026-03-27T00:00:00Z"),
      schemaName: "sales",
      parentTable: "sales_orders",
      partitionColumn: "order_date",
      yearsAhead: 2,
    });

    expect(plan.years).toEqual([2026, 2027, 2028]);
  });

  it("includes partition preflight and default partition actions", () => {
    const plan = buildPartitionPlan({
      schemaName: "sales",
      parentTable: "sales_orders",
      partitionColumn: "order_date",
      yearsAhead: 1,
    });
    const ids = new Set(plan.actions.map((action) => action.id));

    expect(ids.has("preflight-parent-table-exists")).toBe(true);
    expect(ids.has("preflight-parent-partitioned")).toBe(true);
    expect(ids.has("guard-parent-table-exists")).toBe(true);
    expect(ids.has("ensure-parent-partitioned")).toBe(true);
    expect(ids.has("ensure-default-partition")).toBe(true);
  });

  it("blocks implicit parent conversion by default", () => {
    const plan = buildPartitionPlan({
      schemaName: "sales",
      parentTable: "sales_orders",
      partitionColumn: "order_date",
      yearsAhead: 1,
    });
    const action = plan.actions.find((item) => item.id === "ensure-parent-partitioned");

    expect(action?.statement).toContain("--allow-parent-conversion");
    expect(action?.statement).toContain("is not partitioned");
    expect(action?.statement).not.toContain("ALTER TABLE %I.%I RENAME TO %I");
  });

  it("includes conversion DDL when allowParentConversion is true", () => {
    const plan = buildPartitionPlan({
      schemaName: "sales",
      parentTable: "sales_orders",
      partitionColumn: "order_date",
      yearsAhead: 1,
      allowParentConversion: true,
    });
    const action = plan.actions.find((item) => item.id === "ensure-parent-partitioned");

    expect(action?.statement).toContain("ALTER TABLE %I.%I RENAME TO %I");
    expect(action?.statement).toContain("PARTITION BY RANGE (order_date)");
  });
});
