import { describe, expect, it } from "vitest";

import { listLifecyclePolicyIds, resolveLifecyclePolicy } from "../policies/defaultPolicy.js";

describe("lifecycle policy resolver", () => {
  it("includes sales and hr policy ids", () => {
    expect(listLifecyclePolicyIds()).toContain("sales-default");
    expect(listLifecyclePolicyIds()).toContain("hr-attendance-default");
    expect(listLifecyclePolicyIds()).toContain("finance-accounting-default");
  });

  it("resolves hr policy with hr-specific partition target", () => {
    const policy = resolveLifecyclePolicy("hr-attendance-default");
    expect(policy.partitionTargets[0]?.schemaName).toBe("hr");
    expect(policy.partitionTargets[0]?.parentTable).toBe("leave_requests");
    expect(policy.retentionRules.some((rule) => rule.id === "hr-leave-requests-retention")).toBe(true);
  });
});
