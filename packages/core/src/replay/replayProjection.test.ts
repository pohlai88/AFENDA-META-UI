import { describe, expect, it } from "vitest";
import { checksumProjection } from "./checksum.js";
import { replayLatestStateProjection, replayMatchesCurrentProjection } from "./replayProjection.js";

describe("replayLatestStateProjection", () => {
  it("replaying the same stream twice yields the same checksum", () => {
    const events = [
      {
        eventId: "e1",
        entityName: "invoice",
        entityId: "i1",
        presentState: { amount: 100, currency: "USD" },
      },
      {
        eventId: "e2",
        entityName: "invoice",
        entityId: "i2",
        presentState: { amount: 200, currency: "EUR" },
      },
    ] as const;

    const first = replayLatestStateProjection(events);
    const second = replayLatestStateProjection(events);

    expect(first.checksum).toBe(second.checksum);
    expect(first.projection).toEqual(second.projection);
  });

  it("checksum is stable when object key order differs", () => {
    const a = checksumProjection({ x: { alpha: 1, beta: 2 } });
    const b = checksumProjection({ x: { beta: 2, alpha: 1 } });

    expect(a).toBe(b);
  });

  it("distinguishes undefined from null", () => {
    expect(checksumProjection({ a: undefined })).not.toBe(
      checksumProjection({ a: null }),
    );
  });

  it("keeps array order significant", () => {
    expect(checksumProjection({ a: [1, 2] })).not.toBe(
      checksumProjection({ a: [2, 1] }),
    );
  });

  it("latest event for an entity wins in projection", () => {
    const events = [
      {
        eventId: "e1",
        entityName: "invoice",
        entityId: "i1",
        presentState: { status: "draft", total: 10 },
      },
      {
        eventId: "e2",
        entityName: "invoice",
        entityId: "i1",
        presentState: { status: "posted", total: 10 },
      },
    ];

    const result = replayLatestStateProjection(events);

    expect(result.projection.i1).toEqual({ status: "posted", total: 10 });
  });

  it("replay checksum matches an equivalent current projection", () => {
    const events = [
      {
        eventId: "e1",
        entityName: "invoice",
        entityId: "i1",
        presentState: { a: 1 },
      },
    ];

    const replay = replayLatestStateProjection(events);

    expect(replayMatchesCurrentProjection(replay, replay.projection)).toBe(true);
    expect(replayMatchesCurrentProjection(replay, { i1: { a: 2 } })).toBe(false);
  });
});
