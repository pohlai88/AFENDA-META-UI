import { describe, expect, it } from "vitest";

import {
  compareDateOnly,
  compareInstant,
  dateOnlyWire,
  emptyToNull,
  instantWire,
  instantWireAsDateOptional,
  toWireInstant,
} from "../temporal.js";

describe("temporal wire", () => {
  it("dateOnlyWire accepts YYYY-MM-DD", () => {
    expect(dateOnlyWire.parse("2026-03-31")).toBe("2026-03-31");
    expect(() => dateOnlyWire.parse("03/31/2026")).toThrow();
  });

  it("instantWire requires offset", () => {
    expect(instantWire.parse("2026-03-31T10:15:30Z")).toBe("2026-03-31T10:15:30Z");
    expect(() => instantWire.parse("2026-03-31T10:15:30")).toThrow();
  });

  it("emptyToNull maps \"\" to null before nullable schema", () => {
    const s = emptyToNull(dateOnlyWire.nullable());
    expect(s.parse(null)).toBe(null);
    expect(s.parse("")).toBe(null);
    expect(s.parse("2026-01-01")).toBe("2026-01-01");
  });

  it("compareDateOnly is lexicographic on ISO dates", () => {
    expect(compareDateOnly("2026-01-01", "2026-01-02")).toBeLessThan(0);
  });

  it("compareInstant orders by UTC epoch", () => {
    expect(
      compareInstant("2026-01-01T00:00:00.000Z", "2026-01-01T01:00:00.000Z")
    ).toBeLessThan(0);
  });

  it("instantWireAsDateOptional parses wire then Date", () => {
    const d = instantWireAsDateOptional.parse("2026-01-01T12:00:00.000Z");
    expect(d).toBeInstanceOf(Date);
    expect(d?.toISOString()).toBe("2026-01-01T12:00:00.000Z");
    expect(instantWireAsDateOptional.parse(undefined)).toBe(undefined);
  });

  it("toWireInstant round-trips with Z", () => {
    const d = new Date("2026-06-15T08:30:00.000Z");
    expect(toWireInstant(d)).toBe("2026-06-15T08:30:00.000Z");
  });

  it("timestamptzWireSchema backward compat: union legacy string | Date", async () => {
    const { timestamptzWireSchema } = await import("../temporal.js");
    const d = new Date("2026-01-01T00:00:00.000Z");
    expect(timestamptzWireSchema.parse(d)).toBe(d);
    expect(timestamptzWireSchema.parse("2026-01-01T00:00:00.000Z")).toBe("2026-01-01T00:00:00.000Z");
  });
});
