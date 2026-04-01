import { describe, expect, it } from "vitest";

import { computePricingDocumentInputsDigest, stableStringify } from "../pricingDigest.js";

describe("stableStringify", () => {
  it("orders object keys deterministically", () => {
    expect(stableStringify({ b: 1, a: 2 })).toBe(stableStringify({ a: 2, b: 1 }));
  });
});

describe("computePricingDocumentInputsDigest", () => {
  it("is stable for same inputs + engine version", () => {
    const inputs = { a: 1, nested: { z: 9, y: 8 } };
    const d1 = computePricingDocumentInputsDigest(inputs, "v1");
    const d2 = computePricingDocumentInputsDigest(inputs, "v1");
    expect(d1).toBe(d2);
    expect(d1.length).toBe(64);
  });

  it("changes when engine version changes", () => {
    const inputs = { x: 1 };
    expect(computePricingDocumentInputsDigest(inputs, "v1")).not.toBe(
      computePricingDocumentInputsDigest(inputs, "v2")
    );
  });
});
