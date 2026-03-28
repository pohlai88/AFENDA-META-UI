import { describe, expect, it } from "vitest";

import {
  getMutationPolicyById,
  requireMutationPolicyById,
  MUTATION_POLICIES,
} from "../truth-config.js";

describe("truth config mutation policy helpers", () => {
  it("returns canonical policy by id", () => {
    const policy = getMutationPolicyById("sales.sales_order.command_projection");

    expect(policy).toBeDefined();
    expect(policy).toBe(MUTATION_POLICIES[0]);
  });

  it("returns undefined when policy id does not exist", () => {
    const policy = getMutationPolicyById("sales.unknown.policy");

    expect(policy).toBeUndefined();
  });

  it("throws when requiring an unknown policy id", () => {
    expect(() => requireMutationPolicyById("sales.unknown.policy")).toThrow(
      /missing mutation policy/i
    );
  });
});
