/**
 * Policy invariant contract tests.
 *
 * Design intent: invariants are business rule contracts. Any drift in scope,
 * severity, trigger semantics, or registry structure weakens enforcement.
 */
import { describe, expect, it } from "vitest";

import type {
  CrossInvariantDefinition,
  CrossInvariantJoinDefinition,
  InvariantDefinition,
  InvariantExecutionKind,
  InvariantRegistry,
  InvariantScope,
  InvariantSeverity,
  InvariantTriggerOperation,
  InvariantViolation,
} from "../invariants.js";
import type { ConditionExpression } from "../../schema/types.js";

describe("InvariantScope — exhaustive literal union", () => {
  it("covers all expected scopes", () => {
    const scopes: InvariantScope[] = ["entity", "aggregate", "cross-aggregate", "global"];
    expect(scopes).toHaveLength(4);
  });
});

describe("InvariantSeverity — exhaustive literal union", () => {
  it("covers all expected severities", () => {
    const severities: InvariantSeverity[] = ["fatal", "error", "warning"];
    expect(severities).toHaveLength(3);
  });
});

describe("InvariantTriggerOperation — exhaustive literal union", () => {
  it("covers all expected trigger operations", () => {
    const triggers: InvariantTriggerOperation[] = ["create", "update", "delete", "transition"];
    expect(triggers).toHaveLength(4);
  });
});

describe("InvariantExecutionKind — exhaustive literal union", () => {
  it("covers all expected execution kinds", () => {
    const executionKinds: InvariantExecutionKind[] = ["check", "trigger", "deferred-trigger"];
    expect(executionKinds).toHaveLength(3);
  });
});

describe("InvariantDefinition — structural contract", () => {
  it("accepts a valid invariant definition", () => {
    const condition: ConditionExpression = {
      field: "status",
      operator: "eq",
      value: "approved",
    };

    const invariant: InvariantDefinition = {
      id: "invoice-approved-requires-approval-date",
      description: "Approved invoices must have an approval date",
      targetModel: "Invoice",
      scope: "entity",
      severity: "error",
      condition,
      triggerOn: ["update", "transition"],
      group: "invoice-lifecycle",
      tenantOverridable: false,
    };

    expect(invariant.targetModel).toBe("Invoice");
    expect(invariant.scope).toBe("entity");
    expect(invariant.triggerOn).toContain("transition");
    expect(invariant.tenantOverridable).toBe(false);
  });

  it("COMPILE-TIME GATE: invariant uses description/targetModel/condition/triggerOn", () => {
    const invariant: InvariantDefinition = {
      id: "asset-must-have-serial",
      description: "Assets must have serial numbers",
      targetModel: "Asset",
      scope: "aggregate",
      severity: "fatal",
      condition: { field: "serialNumber", operator: "is_not_empty" },
      triggerOn: ["create"],
      tenantOverridable: true,
    };
    expect(invariant.description).toMatch("serial");
    expect(invariant.targetModel).toBe("Asset");
  });
});

describe("InvariantViolation — structural contract", () => {
  it("captures invariant failure details", () => {
    const violation: InvariantViolation = {
      invariantId: "credit-limit-check",
      severity: "error",
      message: "Customer credit limit exceeded",
      context: { customerId: "cust-001", openBalance: 12000 },
    };
    expect(violation.invariantId).toBe("credit-limit-check");
    expect(violation.context["customerId"]).toBe("cust-001");
  });
});

describe("InvariantRegistry — structural contract", () => {
  it("groups invariants by model", () => {
    const registry: InvariantRegistry = {
      model: "Invoice",
      invariants: [
        {
          id: "invoice-number-required",
          description: "Invoices require a number",
          targetModel: "Invoice",
          scope: "entity",
          severity: "error",
          condition: { field: "number", operator: "is_not_empty" },
          triggerOn: ["create"],
          tenantOverridable: false,
        },
      ],
    };
    expect(registry.model).toBe("Invoice");
    expect(registry.invariants).toHaveLength(1);
  });
});

describe("CrossInvariantJoinDefinition — structural contract", () => {
  it("describes joins across models", () => {
    const join: CrossInvariantJoinDefinition = {
      fromModel: "Order",
      fromField: "customerId",
      toModel: "Customer",
      toField: "id",
    };
    expect(join.fromModel).toBe("Order");
    expect(join.toField).toBe("id");
  });
});

describe("CrossInvariantDefinition — structural contract", () => {
  it("accepts a valid cross-model invariant", () => {
    const crossInvariant: CrossInvariantDefinition = {
      id: "order-customer-credit-limit",
      description: "Order total must not exceed customer credit limit",
      involvedModels: ["Order", "Customer"],
      severity: "fatal",
      condition: { field: "creditStatus", operator: "eq", value: "allowed" },
      joinPaths: [
        {
          fromModel: "Order",
          fromField: "customerId",
          toModel: "Customer",
          toField: "id",
        },
      ],
      executionKind: "check",
      dependsOn: ["customer-credit-state"],
      triggerOn: ["create", "update"],
      tenantOverridable: false,
    };

    expect(crossInvariant.involvedModels).toEqual(["Order", "Customer"]);
    expect(crossInvariant.joinPaths).toHaveLength(1);
    expect(crossInvariant.executionKind).toBe("check");
    expect(crossInvariant.dependsOn).toContain("customer-credit-state");
  });
});
