import { describe, expect, it } from "vitest";

import { defaultHardQuotaBytesFromEnv } from "../defaults.js";

describe("defaultHardQuotaBytesFromEnv", () => {
  it("returns 10 GiB when unset", () => {
    expect(defaultHardQuotaBytesFromEnv({})).toBe(10n * 1024n * 1024n * 1024n);
  });

  it("parses positive bigint string", () => {
    expect(defaultHardQuotaBytesFromEnv({ DEFAULT_TENANT_STORAGE_QUOTA_BYTES: "1048576" })).toBe(
      1048576n
    );
  });
});
