import { describe, expect, it } from "vitest";

import {
  applicationStorageKeySchema,
  coldArchiveKey,
  parseObjectKey,
  parseTenantStyleObjectKey,
  resolveFullObjectKey,
  storageKeySchema,
  tenantObjectKey,
  versionedObjectKey,
} from "../objectKey.js";

describe("objectKey", () => {
  it("tenantObjectKey builds expected path", () => {
    expect(tenantObjectKey({ tenantId: 42, domain: "hr", kind: "doc", objectId: "a.pdf" })).toBe(
      "42/hr/doc/a.pdf"
    );
  });

  it("versionedObjectKey appends segment", () => {
    expect(versionedObjectKey({ baseKey: "42/hr/doc/x", version: 2 })).toBe("42/hr/doc/x/v2");
  });

  it("coldArchiveKey includes year segment", () => {
    expect(coldArchiveKey({ dataset: "sales", period: "2020_01", fileName: "p.parquet" })).toBe(
      "sales/2020/p.parquet"
    );
  });

  it("parseTenantStyleObjectKey round-trips tenant layout", () => {
    const k = tenantObjectKey({ tenantId: 1, domain: "hr", kind: "export", objectId: "run.parquet" });
    expect(parseTenantStyleObjectKey(k)).toEqual({
      tenantId: "1",
      domain: "hr",
      kind: "export",
      objectId: "run.parquet",
    });
    expect(parseObjectKey(k)).toEqual(parseTenantStyleObjectKey(k));
  });

  it("storageKeySchema is applicationStorageKeySchema", () => {
    expect(storageKeySchema).toBe(applicationStorageKeySchema);
  });

  it("applicationStorageKeySchema accepts tenant and cold keys", () => {
    expect(() =>
      applicationStorageKeySchema.parse("42/hr/doc/file.pdf")
    ).not.toThrow();
    expect(() => applicationStorageKeySchema.parse("a/b/c")).not.toThrow();
  });

  it("resolveFullObjectKey avoids double prefix", () => {
    expect(resolveFullObjectKey("prod", "42/hr/x")).toBe("prod/42/hr/x");
    expect(resolveFullObjectKey("prod", "prod/42/hr/x")).toBe("prod/42/hr/x");
  });
});
