import { describe, expect, it } from "vitest";

import { parsePartitionDateRange } from "../adapters/r2ColdStorageAdapter.js";

describe("parsePartitionDateRange", () => {
  it("parses YYYY_MM partition format", () => {
    const range = parsePartitionDateRange("2020_01");
    expect(range.start).toBe("2020-01-01");
    expect(range.end).toBe("2020-02-01");
  });
});
