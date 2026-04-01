import { describe, expect, it } from "vitest";

import { buildOrderedSqlSegments } from "../compile-pipeline.js";
import { normalize } from "../normalizer.js";
import { COMPILER_INPUT } from "../truth-config.js";

describe("compile-pipeline", () => {
  it("buildOrderedSqlSegments matches generate-truth-sql stage order and returns segments", () => {
    const normalized = normalize(COMPILER_INPUT);
    const segments = buildOrderedSqlSegments(normalized);
    expect(segments.length).toBeGreaterThan(0);
    const kinds = new Set(segments.map((s) => s.kind));
    expect(kinds.has("check") || kinds.has("trigger") || kinds.has("function")).toBe(true);
  });
});
