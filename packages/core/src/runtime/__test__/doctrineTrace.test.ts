import { describe, expect, it } from "vitest";
import { buildTruthRegistry } from "../registry.js";
import { buildDoctrineTrace } from "../doctrine/doctrineTrace.js";

describe("buildDoctrineTrace", () => {
  it("builds doctrine payload block from doctrineRef", () => {
    const registry = buildTruthRegistry();
    const doctrine = buildDoctrineTrace({
      registry,
      doctrineRef: "ias21_fx_conversion",
    });

    expect(doctrine).toMatchObject({
      doctrineRef: "ias21_fx_conversion",
      family: "IAS",
      standard: "IAS 21",
      interpretation: "strict",
    });
  });

  it("returns undefined when doctrineRef is omitted", () => {
    const registry = buildTruthRegistry();
    const doctrine = buildDoctrineTrace({
      registry,
      doctrineRef: undefined,
    });

    expect(doctrine).toBeUndefined();
  });
});
