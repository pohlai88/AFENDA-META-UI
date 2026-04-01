import { describe, expect, it } from "vitest";
import { getDoctrineByRef } from "../doctrine/doctrineLookup.js";

describe("getDoctrineByRef", () => {
  it("resolves doctrine metadata by reference", () => {
    const doctrine = getDoctrineByRef("ias21_fx_conversion");

    expect(doctrine.key).toBe("ias21_fx_conversion");
    expect(doctrine.family).toBe("IAS");
  });

  it("throws for unknown doctrine reference", () => {
    expect(() => getDoctrineByRef("unknown")).toThrow(/Unknown doctrineRef/);
  });
});
