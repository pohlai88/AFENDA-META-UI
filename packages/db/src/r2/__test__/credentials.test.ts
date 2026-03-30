import { describe, expect, it } from "vitest";

import { loadR2RepoCredentialsFromEnv } from "../credentials.js";

describe("loadR2RepoCredentialsFromEnv", () => {
  it("parses required env vars and normalizes key prefix", () => {
    const creds = loadR2RepoCredentialsFromEnv({
      R2_ACCOUNT_ID: "c4a3b29bfa877132a1f16c5c628dc8a2",
      R2_BUCKET_NAME: "axis-attachments",
      R2_ACCESS_KEY_ID: "access01",
      R2_SECRET_ACCESS_KEY: "secret-secret-secret",
      R2_KEY_PREFIX: "/prod/uploads/",
      R2_JURISDICTION: "eu",
    });
    expect(creds.keyPrefix).toBe("prod/uploads");
    expect(creds.jurisdiction).toBe("eu");
  });

  it("throws for missing required vars", () => {
    expect(() =>
      loadR2RepoCredentialsFromEnv({
        R2_ACCOUNT_ID: "c4a3b29bfa877132a1f16c5c628dc8a2",
      })
    ).toThrow("Invalid R2 environment configuration");
  });
});
