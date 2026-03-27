import { describe, expect, it } from "vitest";

import type { MutationPolicyDefinition } from "@afenda/meta-types";

import { compileMutationPolicies } from "../mutation-policy-compiler.js";
import { normalize } from "../normalizer.js";
import { COMPILER_INPUT } from "../truth-config.js";

describe("mutation policy compiler", () => {
  it("emits event-only direct mutation blockers", () => {
    const policy: MutationPolicyDefinition = {
      id: "sales.subscription.event_only",
      mutationPolicy: "event-only",
      appliesTo: ["subscription"],
      requiredEvents: [
        "subscription.activated",
        "subscription.paused",
        "subscription.renewed",
        "subscription.cancelled",
      ],
      directMutationOperations: ["update", "delete"],
    };

    const normalized = normalize({
      ...COMPILER_INPUT,
      mutationPolicies: [policy],
    });

    const segments = compileMutationPolicies(normalized, { strict: true });
    const trigger = segments.find((segment) => segment.kind === "trigger");
    const fn = segments.find((segment) => segment.kind === "function");

    expect(fn?.sql).toContain('CREATE OR REPLACE FUNCTION "sales"."enforce_event_only_subscription_writes"()');
    expect(fn?.sql).toContain("Route writes through the append-only command/event gateway");
    expect(trigger?.sql).toContain('BEFORE DELETE OR UPDATE ON "sales"."subscriptions"');
  });

  it("rejects non-direct policies when event contracts are missing", () => {
    const policy: MutationPolicyDefinition = {
      id: "sales.unknown.event_only",
      mutationPolicy: "event-only",
      appliesTo: ["consignment_agreement"],
      requiredEvents: ["consignment_agreement.missing"],
    };

    const normalized = normalize({
      ...COMPILER_INPUT,
      mutationPolicies: [policy],
    });

    expect(() => compileMutationPolicies(normalized, { strict: true })).toThrow(/missing required event/i);
  });
});