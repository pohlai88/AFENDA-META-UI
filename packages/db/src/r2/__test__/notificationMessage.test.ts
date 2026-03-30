import { describe, expect, it } from "vitest";

import { parseR2BucketEventNotification } from "../notificationMessage.js";

describe("parseR2BucketEventNotification", () => {
  it("parses Cloudflare queue payload shape", () => {
    const body = {
      account: "acc",
      action: "PutObject",
      bucket: "b",
      object: { key: "k", size: 10, eTag: "etag" },
      eventTime: "2024-01-01T00:00:00.000Z",
    };
    const parsed = parseR2BucketEventNotification(body);
    expect(parsed?.object.key).toBe("k");
    expect(parsed?.action).toBe("PutObject");
  });

  it("returns null on invalid input", () => {
    expect(parseR2BucketEventNotification({})).toBeNull();
  });
});
