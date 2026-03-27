import { describe, expect, it } from "vitest";

import { DEFAULT_MASKING_RULES } from "../audit.js";

describe("DEFAULT_MASKING_RULES", () => {
  it("contains all sensitivity levels", () => {
    expect(Object.keys(DEFAULT_MASKING_RULES).sort()).toEqual(["high", "low", "medium"]);
  });

  it("uses expected strategies", () => {
    expect(DEFAULT_MASKING_RULES.low.strategy).toBe("full");
    expect(DEFAULT_MASKING_RULES.medium.strategy).toBe("partial");
    expect(DEFAULT_MASKING_RULES.high.strategy).toBe("full");
  });

  it("configures partial reveal for medium sensitivity", () => {
    expect(DEFAULT_MASKING_RULES.medium.revealChars).toBe(2);
    expect(DEFAULT_MASKING_RULES.low.revealChars).toBeUndefined();
    expect(DEFAULT_MASKING_RULES.high.revealChars).toBeUndefined();
  });
});
