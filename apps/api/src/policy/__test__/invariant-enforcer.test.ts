import type { InvariantRegistry } from "@afenda/meta-types";
import { describe, expect, it } from "vitest";

import { evaluateInvariants } from "../invariant-enforcer.js";

describe("invariant-enforcer", () => {
  it("passes when no registry exists for the model", () => {
    const result = evaluateInvariants({
      model: "unknown_model",
      operation: "create",
      record: { status: "draft" },
    });

    expect(result.passed).toBe(true);
    expect(result.violations).toHaveLength(0);
  });

  it("fails a consignment agreement invariant on create", () => {
    const result = evaluateInvariants({
      model: "consignment_agreement",
      operation: "create",
      record: { status: "active", partner_id: null },
    });

    expect(result.passed).toBe(false);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].invariantId).toBe("sales.consignment_agreement.active_has_partner");
  });

  it("fails a sales order invariant on update when a confirmed order has no amount", () => {
    const result = evaluateInvariants({
      model: "sales_order",
      operation: "update",
      record: { status: "sale", amount_total: 0 },
    });

    expect(result.passed).toBe(false);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].invariantId).toBe("sales.sales_order.confirmed_amount_positive");
  });

  it("collects warnings without blocking writes", () => {
    const registries: InvariantRegistry[] = [
      {
        model: "subscription",
        invariants: [
          {
            id: "subscription.warning.sample",
            description: "Sample warning invariant",
            targetModel: "subscription",
            scope: "entity",
            severity: "warning",
            condition: { field: "status", operator: "eq", value: "active" },
            triggerOn: ["update"],
            tenantOverridable: false,
          },
        ],
      },
    ];

    const result = evaluateInvariants({
      model: "subscription",
      operation: "update",
      record: { status: "paused" },
      registries,
    });

    expect(result.passed).toBe(true);
    expect(result.warnings).toHaveLength(1);
    expect(result.errors).toHaveLength(0);
  });
});
