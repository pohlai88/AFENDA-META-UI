import { describe, expect, expectTypeOf, it } from "vitest";
import { z } from "zod/v4";

import {
  PermissionActionSegmentSchema,
  PermissionIdSchema,
  PermissionKeySchema,
  PermissionResourceSegmentSchema,
  refineOptionalFutureDate,
  refinePermissionKeyMatchesSegments,
  RoleCodeSchema,
  RolePermissionEntrySchema,
  UserIdSchema,
  type PermissionId,
  type RoleId,
  type UserId,
} from "../_zodShared.js";

describe("branded ID schemas", () => {
  it("parses positive integers", () => {
    expect(UserIdSchema.parse(1)).toBe(1);
    expect(PermissionIdSchema.parse(99)).toBe(99);
  });

  it("rejects non-positive or non-integer values", () => {
    expect(UserIdSchema.safeParse(0).success).toBe(false);
    expect(UserIdSchema.safeParse(-1).success).toBe(false);
    expect(UserIdSchema.safeParse(1.5).success).toBe(false);
  });

  it("keeps UserId and RoleId distinct at the type level", () => {
    expectTypeOf<UserId>().not.toEqualTypeOf<RoleId>();
    expectTypeOf<UserId>().not.toEqualTypeOf<PermissionId>();
  });
});

describe("RoleCodeSchema", () => {
  it("accepts alphanumeric, underscore, hyphen", () => {
    expect(RoleCodeSchema.safeParse("ADMIN_ROLE").success).toBe(true);
    expect(RoleCodeSchema.safeParse("dev-ops").success).toBe(true);
    expect(RoleCodeSchema.safeParse("ab").success).toBe(true);
  });

  it("rejects spaces and special characters", () => {
    expect(RoleCodeSchema.safeParse("ADMIN ROLE").success).toBe(false);
    expect(RoleCodeSchema.safeParse("bad!!").success).toBe(false);
  });
});

describe("RolePermissionEntrySchema", () => {
  it("accepts boolean, string array, or string→boolean record", () => {
    expect(RolePermissionEntrySchema.safeParse(true).success).toBe(true);
    expect(RolePermissionEntrySchema.safeParse(["read", "write"]).success).toBe(true);
    expect(RolePermissionEntrySchema.safeParse({ read: true, delete: false }).success).toBe(true);
  });
});

describe("PermissionKeySchema", () => {
  it("rejects colon form", () => {
    expect(PermissionKeySchema.safeParse("leave:approve").success).toBe(false);
  });

  it("accepts dotted keys and normalizes to lowercase", () => {
    const r = PermissionKeySchema.safeParse("Leave.Approve");
    expect(r.success).toBe(true);
    if (r.success) expect(r.data).toBe("leave.approve");
  });
});

describe("permission segments", () => {
  it("normalizes segments to lowercase", () => {
    const r = PermissionResourceSegmentSchema.safeParse("Orders");
    expect(r.success).toBe(true);
    if (r.success) expect(r.data).toBe("orders");
  });

  it("rejects segments that are invalid after normalization", () => {
    expect(PermissionActionSegmentSchema.safeParse("9bad").success).toBe(false);
  });
});

describe("refinePermissionKeyMatchesSegments", () => {
  const run = (data: { resource: string; action: string; key: string }) => {
    const issues: Array<{ message?: string }> = [];
    const ctx = {
      addIssue: (i: { message?: string }) => {
        issues.push(i);
      },
    } as unknown as z.RefinementCtx;
    refinePermissionKeyMatchesSegments(data, ctx);
    return issues;
  };

  it("fails when key does not match resource.action", () => {
    const issues = run({ resource: "leave", action: "approve", key: "leave.reject" });
    expect(issues.length).toBe(1);
    expect(issues[0]?.message).toContain("leave.reject");
  });

  it("passes when case differs but normalized composite matches", () => {
    expect(run({ resource: "leave", action: "approve", key: "Leave.Approve" })).toHaveLength(0);
  });
});

describe("refineOptionalFutureDate", () => {
  const run = (data: { expiresAt?: Date | null }) => {
    const issues: Array<{ message?: string }> = [];
    const ctx = {
      addIssue: (i: { message?: string }) => {
        issues.push(i);
      },
    } as unknown as z.RefinementCtx;
    refineOptionalFutureDate(data, ctx);
    return issues;
  };

  it("allows null and undefined", () => {
    expect(run({ expiresAt: null })).toHaveLength(0);
    expect(run({})).toHaveLength(0);
  });

  it("rejects invalid dates", () => {
    const issues = run({ expiresAt: new Date("not-a-date") });
    expect(issues.length).toBe(1);
    expect(issues[0]?.message).toMatch(/valid date/i);
  });

  it("rejects past dates", () => {
    const issues = run({ expiresAt: new Date(Date.now() - 86_400_000) });
    expect(issues.length).toBe(1);
    expect(issues[0]?.message).toMatch(/future/i);
  });

  it("accepts future dates", () => {
    expect(run({ expiresAt: new Date(Date.now() + 86_400_000) })).toHaveLength(0);
  });
});
