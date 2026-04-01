import { describe, expect, it } from "vitest";
import { buildTruthRegistry } from "../registry.js";
import { getDoctrineByRef } from "../doctrine/doctrineLookup.js";

describe("getDoctrineByRef", () => {
  it("resolves doctrine metadata by reference", () => {
    const registry = buildTruthRegistry();
    const doctrine = getDoctrineByRef({
      registry,
      doctrineRef: "ias21_fx_conversion",
    });

    expect(doctrine.key).toBe("ias21_fx_conversion");
    expect(doctrine.family).toBe("IAS");
  });

  it("throws for unknown doctrine reference", () => {
    const registry = buildTruthRegistry();
    expect(() =>
      getDoctrineByRef({
        registry,
        doctrineRef: "unknown",
      }),
    ).toThrow(/Unknown doctrineRef/);
  });
});
