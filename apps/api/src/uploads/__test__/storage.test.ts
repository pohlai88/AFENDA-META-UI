import { describe, expect, it } from "vitest";
import {
  buildStoredUploadName,
  buildUntrackedR2StorageKey,
  resolvePublicUploadUrl,
} from "../storage.js";

describe("upload storage utilities", () => {
  it("preserves a safe extension when generating stored upload names", () => {
    const name = buildStoredUploadName("contract.pdf");

    expect(name.endsWith(".pdf")).toBe(true);
    expect(name).toMatch(/^\d+-[a-f0-9-]{36}\.pdf$/);
  });

  it("drops unsafe extension content from generated names", () => {
    const name = buildStoredUploadName("invoice.bad/..\\name");

    expect(name).toMatch(/^\d+-[a-f0-9-]{36}$/);
  });

  it("encodes public upload URLs", () => {
    expect(resolvePublicUploadUrl("space name.png")).toBe("/uploads/space%20name.png");
  });

  it("builds schema-safe R2 keys for unenforced quota uploads", () => {
    const out = buildUntrackedR2StorageKey({
      kind: "file",
      originalName: "contract.pdf",
      tenantNumericId: null,
    });

    expect(out.fileName.endsWith(".pdf")).toBe(true);
    expect(out.storageKey).toMatch(/^shared\/uploads\/file\/\d+-[a-f0-9-]{36}\.pdf$/);
  });
});
