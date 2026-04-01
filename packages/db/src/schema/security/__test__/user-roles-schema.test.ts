import { describe, expect, it } from "vitest";

import {
  userRoleAssignmentInsertSchema,
  userRoleUpdateSchema,
} from "../userRoles.js";

describe("userRoleAssignmentInsertSchema", () => {
  const base = {
    userId: 1,
    roleId: 1,
    tenantId: 1,
    assignedBy: 1,
  };

  it("accepts assignment without expiresAt", () => {
    expect(userRoleAssignmentInsertSchema.safeParse(base).success).toBe(true);
  });

  it("accepts expiresAt in the future", () => {
    const future = new Date(Date.now() + 86_400_000);
    expect(userRoleAssignmentInsertSchema.safeParse({ ...base, expiresAt: future }).success).toBe(
      true
    );
  });

  it("rejects expiresAt in the past", () => {
    const past = new Date(Date.now() - 86_400_000);
    const r = userRoleAssignmentInsertSchema.safeParse({ ...base, expiresAt: past });
    expect(r.success).toBe(false);
  });

  it("rejects expiresAt before explicit assignedAt", () => {
    const assignedAt = new Date("2030-06-15T12:00:00.000Z");
    const expiresAt = new Date("2030-06-10T12:00:00.000Z");
    const r = userRoleAssignmentInsertSchema.safeParse({
      ...base,
      assignedAt,
      expiresAt,
    });
    expect(r.success).toBe(false);
    if (!r.success) {
      expect(r.error.issues.some((i) => i.path.includes("expiresAt"))).toBe(true);
    }
  });
});

describe("userRoleUpdateSchema", () => {
  it("accepts extending expiry to a future date", () => {
    const future = new Date(Date.now() + 7 * 86_400_000);
    expect(userRoleUpdateSchema.safeParse({ expiresAt: future }).success).toBe(true);
  });

  it("rejects setting expiresAt to the past", () => {
    const past = new Date(Date.now() - 60_000);
    expect(userRoleUpdateSchema.safeParse({ expiresAt: past }).success).toBe(false);
  });
});
