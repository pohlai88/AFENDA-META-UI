import { describe, expect, it } from "vitest";
import { buildStoredUploadName, resolvePublicUploadUrl } from "./storage.js";

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
});
