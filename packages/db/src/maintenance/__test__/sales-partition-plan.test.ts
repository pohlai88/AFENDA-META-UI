import { describe, expect, it } from "vitest";

import { buildSalesPartitionPlan } from "../sales-partition-plan.js";

describe("buildSalesPartitionPlan", () => {
  it("builds default yearly windows for current and next years", () => {
    const plan = buildSalesPartitionPlan({
      now: new Date("2026-03-27T00:00:00Z"),
      yearsAhead: 2,
    });

    expect(plan.years).toEqual([2026, 2027, 2028]);
  });

  it("includes partition preflight and default partition actions", () => {
    const plan = buildSalesPartitionPlan({ yearsAhead: 1 });
    const ids = new Set(plan.actions.map((action) => action.id));

    expect(ids.has("preflight-parent-table-exists")).toBe(true);
    expect(ids.has("preflight-parent-partitioned")).toBe(true);
    expect(ids.has("guard-parent-table-exists")).toBe(true);
    expect(ids.has("ensure-parent-partitioned")).toBe(true);
    expect(ids.has("ensure-default-partition")).toBe(true);
  });

  it("blocks implicit parent conversion by default", () => {
    const plan = buildSalesPartitionPlan({ yearsAhead: 1 });
    const action = plan.actions.find((item) => item.id === "ensure-parent-partitioned");

    expect(action?.statement).toContain("--allow-parent-conversion");
    expect(action?.statement).toContain("is not partitioned");
    expect(action?.statement).not.toContain("ALTER TABLE %I.%I RENAME TO %I");
  });

  it("includes conversion DDL when allowParentConversion is true", () => {
    const plan = buildSalesPartitionPlan({ yearsAhead: 1, allowParentConversion: true });
    const action = plan.actions.find((item) => item.id === "ensure-parent-partitioned");

    expect(action?.statement).toContain("ALTER TABLE %I.%I RENAME TO %I");
    expect(action?.statement).toContain("PARTITION BY RANGE (order_date)");
  });

  it("generates per-year partition DDL statements", () => {
    const plan = buildSalesPartitionPlan({
      now: new Date("2026-03-27T00:00:00Z"),
      yearsAhead: 1,
    });

    const action2026 = plan.actions.find((action) => action.id === "ensure-partition-2026");
    const action2027 = plan.actions.find((action) => action.id === "ensure-partition-2027");

    expect(action2026?.statement).toContain("sales_orders_2026");
    expect(action2026?.statement).toContain("2026-01-01");
    expect(action2026?.statement).toContain("2027-01-01");
    expect(action2027?.statement).toContain("sales_orders_2027");
  });
});
