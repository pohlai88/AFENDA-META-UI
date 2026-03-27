import { describe, expect, it } from "vitest";

import { emit } from "../emitter.js";
import { compileEvents } from "../event-compiler.js";
import { compileInvariants } from "../invariant-compiler.js";
import { normalize } from "../normalizer.js";
import { COMPILER_INPUT } from "../truth-config.js";
import { compileTransitions } from "../transition-compiler.js";

describe("truth event compiler", () => {
  const normalized = normalize(COMPILER_INPUT);

  it("emits append-only hooks for each registered truth event contract", () => {
    const segments = compileEvents(normalized);

    expect(segments).toHaveLength(6);

    const salesOrderFunction = segments.find(
      (segment) =>
        segment.kind === "function" &&
        segment.model === "sales_order" &&
        segment.sql.includes('CREATE OR REPLACE FUNCTION "sales"."emit_sales_order_event"()')
    );

    expect(salesOrderFunction).toBeDefined();
    expect(salesOrderFunction?.sql).toContain(`'ORDER_MUTATED'`);
    expect(salesOrderFunction?.sql).toContain(`'ORDER_DELETED'`);
    expect(salesOrderFunction?.sql).toContain(
      `jsonb_build_array('sales_order.cancelled', 'sales_order.confirmed', 'sales_order.submitted')`
    );
    expect(salesOrderFunction?.sql).toContain(`'state_field', 'status'`);
    expect(salesOrderFunction?.sql).toContain(`'state_value', NEW."status"`);
    expect(salesOrderFunction?.sql).toContain(`PERFORM "sales"."emit_domain_event"(`);

    const consignmentTrigger = segments.find(
      (segment) =>
        segment.kind === "trigger" &&
        segment.model === "consignment_agreement" &&
        segment.sql.includes('CREATE TRIGGER "trg_emit_consignment_agreement_event"')
    );

    expect(consignmentTrigger?.sql).toContain(
      'AFTER INSERT OR UPDATE OR DELETE ON "sales"."consignment_agreements"'
    );
  });

  it("includes stable generated event trigger names in the final SQL bundle", () => {
    const sql = emit(
      [
        ...compileInvariants(normalized),
        ...compileTransitions(normalized),
        ...compileEvents(normalized),
      ],
      new Date("2026-03-27T00:00:00.000Z")
    );

    expect(sql).toContain('CREATE OR REPLACE FUNCTION "sales"."emit_sales_order_event"()');
    expect(sql).toContain('DROP TRIGGER IF EXISTS "trg_emit_sales_order_event" ON "sales"."sales_orders";');
    expect(sql).toContain('CREATE TRIGGER "trg_emit_subscription_event"');
    expect(sql).not.toContain("TODO Phase 3.6.5");
  });
});