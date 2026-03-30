import { describe, expect, it } from "vitest";

import { hexToBase64 } from "../checksumWire.js";

describe("checksumWire", () => {
  it("hexToBase64 encodes sha256 hex", () => {
    const hex = "a".repeat(64);
    const b64 = hexToBase64(hex);
    expect(b64).toMatch(/^[A-Za-z0-9+/]+=*$/);
  });

  it("rejects odd-length hex", () => {
    expect(() => hexToBase64("abc")).toThrow();
  });
});
