import { describe, expect, it } from "vitest";

import { assertStorageKeyBelongsToTenant } from "../tenantUploadQuota.js";

describe("assertStorageKeyBelongsToTenant", () => {
  it("accepts tenant-style key matching tenant id", () => {
    expect(() => assertStorageKeyBelongsToTenant("7/uploads/file/abc-uuid", 7)).not.toThrow();
  });

  it("rejects tenant mismatch", () => {
    expect(() => assertStorageKeyBelongsToTenant("8/uploads/file/abc-uuid", 7)).toThrow();
  });
});
