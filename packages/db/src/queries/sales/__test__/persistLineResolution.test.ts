import { describe, expect, it } from "vitest";

import { finalPriceExceedsBasePrice } from "../persistLineResolution.js";

describe("finalPriceExceedsBasePrice", () => {
  it("is false when final equals base", () => {
    expect(finalPriceExceedsBasePrice("10.00", "10.00")).toBe(false);
  });

  it("is false when final is below base (discount)", () => {
    expect(finalPriceExceedsBasePrice("8.50", "10.00")).toBe(false);
  });

  it("is true when final is above base", () => {
    expect(finalPriceExceedsBasePrice("12.00", "10.00")).toBe(true);
  });

  it("compares with decimal precision", () => {
    expect(finalPriceExceedsBasePrice("10.01", "10.00")).toBe(true);
    expect(finalPriceExceedsBasePrice("10.001", "10.00")).toBe(true);
  });
});
