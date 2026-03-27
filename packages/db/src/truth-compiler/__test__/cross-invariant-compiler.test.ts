import { describe, expect, it } from "vitest";

import type { CrossInvariantDefinition } from "@afenda/meta-types";

import { compileCrossInvariants } from "../cross-invariant-compiler.js";
import { normalize } from "../normalizer.js";
import { COMPILER_INPUT } from "../truth-config.js";

describe("cross invariant compiler", () => {
  it("rejects ambiguous check cross invariants in strict mode", () => {
    const crossInvariant: CrossInvariantDefinition = {
      id: "sales.cross.sales_order_subscription_consistency",
      description: "order and subscription status must remain compatible",
      involvedModels: ["sales_order", "subscription"],
      severity: "error",
      condition: {
        logic: "or",
        conditions: [
          { field: "status", operator: "neq", value: "sale" },
          { field: "status", operator: "eq", value: "active" },
        ],
      },
      executionKind: "check",
      dependsOn: [],
      triggerOn: ["update"],
      tenantOverridable: false,
    };

    const normalized = normalize({
      ...COMPILER_INPUT,
      crossInvariantDefinitions: [crossInvariant],
    });

    expect(() => compileCrossInvariants(normalized, { strict: true })).toThrow(
      /executionKind=check/i
    );
  });

  it("rejects ambiguous multi-model trigger invariants without join paths in strict mode", () => {
    const crossInvariant: CrossInvariantDefinition = {
      id: "sales.cross.subscription_requires_order_reference",
      description: "subscription changes require matching order context",
      involvedModels: ["subscription", "sales_order"],
      severity: "warning",
      condition: {
        field: "status",
        operator: "neq",
        value: "draft",
      },
      executionKind: "trigger",
      dependsOn: [],
      triggerOn: ["transition"],
      tenantOverridable: false,
    };

    const normalized = normalize({
      ...COMPILER_INPUT,
      crossInvariantDefinitions: [crossInvariant],
    });

    expect(() => compileCrossInvariants(normalized, { strict: true })).toThrow(/joinPaths/i);
  });

  it("emits join-backed guard functions and triggers for trigger cross invariants", () => {
    const normalized = normalize({
      ...COMPILER_INPUT,
      entityDefs: [
        {
          name: "sales_order",
          table: "sales_orders",
          fields: {
            id: { type: "uuid", primary: true },
            status: { type: "text", nullable: false },
          },
        },
        {
          name: "subscription",
          table: "subscriptions",
          fields: {
            id: { type: "uuid", primary: true },
            status: { type: "text", nullable: false },
            sales_order_id: {
              type: "uuid",
              nullable: false,
              references: { table: "sales_orders", column: "id" },
            },
          },
        },
      ],
      crossInvariantDefinitions: [
        {
          id: "sales.cross.active_subscription_requires_sale_order",
          description: "active subscriptions require a related sale order",
          involvedModels: ["subscription", "sales_order"],
          severity: "warning",
          condition: {
            logic: "or",
            conditions: [
              { field: "subscription.status", operator: "neq", value: "active" },
              { field: "sales_order.status", operator: "eq", value: "sale" },
            ],
          },
          joinPaths: [
            {
              fromModel: "subscription",
              fromField: "sales_order_id",
              toModel: "sales_order",
              toField: "id",
            },
          ],
          executionKind: "trigger",
          dependsOn: [],
          triggerOn: ["transition"],
          tenantOverridable: false,
        },
      ],
    });

    const segments = compileCrossInvariants(normalized, { strict: true });

    expect(segments).toHaveLength(4);
    expect(
      segments.every(
        (segment) =>
          segment.nodeId === "cross-invariant:sales.cross.active_subscription_requires_sale_order"
      )
    ).toBe(true);

    const subscriptionFunction = segments.find(
      (segment) =>
        segment.kind === "function" &&
        segment.model === "subscription" &&
        segment.sql.includes(
          'CREATE OR REPLACE FUNCTION "sales"."enforce_xinv_sales_cross_active_subscription_requires_sale_order_on_subscription"()'
        )
    );

    expect(subscriptionFunction?.sql).toContain("IF NOT EXISTS (");
    expect(subscriptionFunction?.sql).toContain('NEW."sales_order_id" AS "sales_order_id"');
    expect(subscriptionFunction?.sql).toContain('JOIN "sales"."sales_orders" AS "m_sales_order"');
    expect(subscriptionFunction?.sql).toContain(
      'ON "m_subscription"."sales_order_id" = "m_sales_order"."id"'
    );
    expect(subscriptionFunction?.sql).toContain(
      'WHERE ("m_subscription"."status" <> \'active\' OR "m_sales_order"."status" = \'sale\')'
    );
    expect(subscriptionFunction?.sql).toContain(
      "RAISE WARNING 'Cross invariant sales.cross.active_subscription_requires_sale_order violated during direct mutation of subscription.';"
    );

    const salesOrderTrigger = segments.find(
      (segment) =>
        segment.kind === "trigger" &&
        segment.model === "sales_order" &&
        segment.sql.includes(
          'CREATE TRIGGER "trg_xinv_sales_cross_active_subscription_requires_sale_order_sales_order"'
        )
    );

    expect(salesOrderTrigger?.sql).toContain(
      'BEFORE INSERT OR UPDATE OR DELETE ON "sales"."sales_orders"'
    );
  });

  it("emits deferred constraint triggers for deferred-trigger cross invariants", () => {
    const crossInvariant: CrossInvariantDefinition = {
      id: "sales.cross.sales_order_must_stay_sale_after_submit",
      description: "submitted sales orders must not revert from sale status",
      involvedModels: ["sales_order"],
      severity: "error",
      condition: {
        field: "status",
        operator: "eq",
        value: "sale",
      },
      executionKind: "deferred-trigger",
      dependsOn: [],
      triggerOn: ["update"],
      tenantOverridable: false,
    };

    const normalized = normalize({
      ...COMPILER_INPUT,
      crossInvariantDefinitions: [crossInvariant],
    });

    const segments = compileCrossInvariants(normalized, { strict: true });
    const deferredTrigger = segments.find((segment) => segment.kind === "trigger");

    expect(deferredTrigger?.sql).toContain("CREATE CONSTRAINT TRIGGER");
    expect(deferredTrigger?.sql).toContain("DEFERRABLE INITIALLY DEFERRED");
  });
});
