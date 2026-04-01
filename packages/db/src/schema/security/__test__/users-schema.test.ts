import { describe, expect, it } from "vitest";

import { userInsertSchema, userUpdateSchema } from "../users.js";

describe("userInsertSchema", () => {
  const base = {
    tenantId: 1,
    email: "person@example.com",
    displayName: "Valid User",
    createdBy: 1,
    updatedBy: 1,
  };

  it("accepts a well-formed payload", () => {
    expect(userInsertSchema.safeParse(base).success).toBe(true);
  });

  it("normalizes email with trim and lower case", () => {
    const r = userInsertSchema.safeParse({
      ...base,
      email: "  Person@EXAMPLE.COM \t",
    });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.email).toBe("person@example.com");
  });

  it("rejects invalid email", () => {
    expect(userInsertSchema.safeParse({ ...base, email: "not-an-email" }).success).toBe(false);
  });

  it("rejects empty displayName", () => {
    expect(userInsertSchema.safeParse({ ...base, displayName: "" }).success).toBe(false);
  });

  it("rejects displayName longer than 200 characters", () => {
    expect(userInsertSchema.safeParse({ ...base, displayName: "x".repeat(201) }).success).toBe(
      false
    );
  });
});

describe("userUpdateSchema", () => {
  it("allows null on nullable optional fields", () => {
    const r = userUpdateSchema.safeParse({
      locale: null,
      timezone: null,
      avatarUrl: null,
      lastLoginAt: null,
    });
    expect(r.success).toBe(true);
  });

  it("normalizes email when provided", () => {
    const r = userUpdateSchema.safeParse({ email: "  NEW@EXAMPLE.ORG " });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.email).toBe("new@example.org");
  });

  it("rejects locale longer than 10 characters", () => {
    expect(userUpdateSchema.safeParse({ locale: "12345678901" }).success).toBe(false);
  });

  it("rejects timezone longer than 50 characters", () => {
    expect(userUpdateSchema.safeParse({ timezone: "t".repeat(51) }).success).toBe(false);
  });
});
