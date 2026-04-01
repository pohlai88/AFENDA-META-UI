import { describe, expect, it } from "vitest";
import { loadSpecs } from "./loadSpecs.js";
import { validateSpecs } from "./validateSpecs.js";

describe("validateSpecs", () => {
  it("passes for committed specs", () => {
    const bundle = loadSpecs();
    expect(() => validateSpecs(bundle)).not.toThrow();
  });
});
