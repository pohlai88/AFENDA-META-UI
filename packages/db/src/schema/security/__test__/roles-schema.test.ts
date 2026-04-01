import { describe, expect, it } from "vitest";

import { roleInsertSchema, roleUpdateSchema } from "../roles.js";

describe("roleInsertSchema", () => {
  const base = {
    tenantId: 1,
    roleCode: "VALID_CODE",
    name: "Valid name",
    createdBy: 1,
    updatedBy: 1,
  };

  it("accepts a well-formed payload", () => {
    expect(roleInsertSchema.safeParse(base).success).toBe(true);
  });

  it("rejects roleCode shorter than 2 characters", () => {
    expect(roleInsertSchema.safeParse({ ...base, roleCode: "X" }).success).toBe(false);
  });

  it("rejects roleCode with disallowed characters", () => {
    expect(roleInsertSchema.safeParse({ ...base, roleCode: "Admin!!" }).success).toBe(false);
  });

  it("rejects empty name", () => {
    expect(roleInsertSchema.safeParse({ ...base, name: "" }).success).toBe(false);
  });

  it("rejects name longer than 200 characters", () => {
    expect(roleInsertSchema.safeParse({ ...base, name: "n".repeat(201) }).success).toBe(false);
  });
});

describe("roleUpdateSchema", () => {
  it("allows null description to clear the field", () => {
    const r = roleUpdateSchema.safeParse({ description: null });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.description).toBeNull();
  });

  it("allows null permissions to clear JSONB hints", () => {
    const r = roleUpdateSchema.safeParse({ permissions: null });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.permissions).toBeNull();
  });

  it("allows partial updates with no fields", () => {
    expect(roleUpdateSchema.safeParse({}).success).toBe(true);
  });
});
