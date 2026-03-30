import { describe, expect, it } from "vitest";

import { presignR2PutUrl } from "../presign.js";

const creds = {
  accountId: "c4a3b29bfa877132a1f16c5c628dc8a2",
  bucketName: "axis-attachments",
  accessKeyId: "access",
  secretAccessKey: "secret-secret-secret",
} as const;

describe("presignR2PutUrl", () => {
  it("rejects invalid expiry values", async () => {
    await expect(presignR2PutUrl(creds, "42/hr/doc/a.pdf", "application/pdf", 0)).rejects.toThrow(
      "expiresInSeconds must be between 1 and 604800"
    );
  });

  it("rejects invalid storage key shape", async () => {
    await expect(
      presignR2PutUrl(creds, "just-one-segment", "application/pdf", 60)
    ).rejects.toThrow();
  });

  it("generates a presigned URL for valid input", async () => {
    const url = await presignR2PutUrl(creds, "42/hr/doc/a.pdf", "application/pdf", 60);
    expect(url).toContain("X-Amz-Algorithm=AWS4-HMAC-SHA256");
    expect(url).toContain("X-Amz-Expires=60");
  });
});
