import { describe, expect, it } from "vitest";

import { applyLifecyclePolicyPatch } from "../policies/overrideResolver.js";
import { resolveLifecyclePolicy } from "../policies/defaultPolicy.js";
import { assertSafeDottedReference } from "../policies/schema.js";
import { resolveLifecyclePolicyWithOverrides } from "../policies/overrideResolver.js";

describe("lifecycle policy override utilities", () => {
  it("applies patch and preserves policy validity", () => {
    const base = resolveLifecyclePolicy("sales-default");
    const patched = applyLifecyclePolicyPatch(base, {
      description: "tenant override",
      functions: {
        identifyColdCandidates: "archive.identify_cold_candidates",
      },
    });

    expect(patched.description).toBe("tenant override");
    expect(patched.functions.identifyColdCandidates).toBe("archive.identify_cold_candidates");
  });

  it("validates safe dotted SQL references", () => {
    expect(() => assertSafeDottedReference("archive.identify_cold_candidates", "fn")).not.toThrow();
    expect(() => assertSafeDottedReference("archive;DROP TABLE x", "fn")).toThrow();
  });

  it("applies override precedence in order global -> industry -> tenant", async () => {
    const base = resolveLifecyclePolicy("sales-default");
    let callCount = 0;
    const fakeDb = {
      execute: async () => {
        callCount += 1;
        if (callCount === 1) {
          return { rows: [{ industry: "manufacturing" }] };
        }
        return {
          rows: [
            { scope: "global", tenant_id: "global", patch: { description: "global-override" } },
            { scope: "industry", tenant_id: "manufacturing", patch: { description: "industry-override" } },
            { scope: "tenant", tenant_id: "42", patch: { description: "tenant-override" } },
          ],
        };
      },
    };

    const resolved = await resolveLifecyclePolicyWithOverrides(fakeDb, base, { tenantId: 42 });
    expect(resolved.policy.description).toBe("tenant-override");
    expect(resolved.steps.map((step) => step.scope)).toEqual([
      "base",
      "global",
      "industry",
      "tenant",
    ]);
  });
});
