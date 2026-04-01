import { describe, expect, it } from "vitest";
import { verifyReplay } from "./verifyReplay.js";

describe("verifyReplay", () => {
  it("matches when replayed projection equals current projection", () => {
    const result = verifyReplay({
      events: [
        {
          eventId: "evt_1",
          entityName: "sales_order",
          entityId: "SO-1",
          presentState: { status: "posted", amount: 100 },
        },
      ],
      currentProjection: {
        "SO-1": { status: "posted", amount: 100 },
      },
    });

    expect(result.matches).toBe(true);
    expect(result.replayChecksum).toBe(result.currentProjectionChecksum);
  });

  it("does not match when replayed projection differs from current projection", () => {
    const result = verifyReplay({
      events: [
        {
          eventId: "evt_1",
          entityName: "sales_order",
          entityId: "SO-1",
          presentState: { status: "posted", amount: 100 },
        },
      ],
      currentProjection: {
        "SO-1": { status: "draft", amount: 100 },
      },
    });

    expect(result.matches).toBe(false);
    expect(result.replayChecksum).not.toBe(result.currentProjectionChecksum);
  });
});
