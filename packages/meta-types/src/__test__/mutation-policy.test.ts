import { describe, expect, it } from "vitest";

import {
  assertDirectMutationAllowed,
  isDirectMutationAllowed,
  resolveMutationPolicy,
} from "../mutation-policy.js";
import type { MutationPolicyDefinition } from "../truth-model.js";

const policies: MutationPolicyDefinition[] = [
  {
    id: "sales.orders.event_only",
    mutationPolicy: "event-only",
    appliesTo: ["sales_order"],
    directMutationOperations: ["update", "delete"],
  },
  {
    id: "sales.subscription.dual_write",
    mutationPolicy: "dual-write",
    appliesTo: ["subscription"],
  },
];

describe("mutation policy runtime helpers", () => {
  it("resolves the policy configured for a model", () => {
    expect(resolveMutationPolicy({ model: "sales_order", policies })?.id).toBe(
      "sales.orders.event_only"
    );
    expect(resolveMutationPolicy({ model: "consignment_agreement", policies })).toBeUndefined();
  });

  it("blocks configured direct mutations for event-only models", () => {
    expect(isDirectMutationAllowed({ model: "sales_order", operation: "update", policies })).toEqual(
      expect.objectContaining({
        allowed: false,
        policy: expect.objectContaining({ id: "sales.orders.event_only" }),
      })
    );

    expect(isDirectMutationAllowed({ model: "sales_order", operation: "create", policies })).toEqual(
      expect.objectContaining({ allowed: true })
    );
  });

  it("throws with a stable message when direct mutation is blocked", () => {
    expect(() =>
      assertDirectMutationAllowed({ model: "sales_order", operation: "delete", policies })
    ).toThrow(/event-only mutation policy/i);
  });
});