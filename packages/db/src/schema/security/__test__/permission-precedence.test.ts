import { describe, expect, it } from "vitest";

import {
  evaluatePermissionAccess,
  isRoleAssignmentEffective,
  resolvePermissionAccess,
} from "../permission-precedence.js";

describe("evaluatePermissionAccess", () => {
  it("returns PERMISSION_INACTIVE when permission is inactive", () => {
    expect(
      evaluatePermissionAccess({
        permissionActive: false,
        userOverride: "GRANT",
        hasRoleGrant: true,
      })
    ).toEqual({ allowed: false, reason: "PERMISSION_INACTIVE" });
  });

  it("returns USER_DENY when override is DENY", () => {
    expect(
      evaluatePermissionAccess({
        permissionActive: true,
        userOverride: "DENY",
        hasRoleGrant: true,
      })
    ).toEqual({ allowed: false, reason: "USER_DENY" });
  });

  it("returns USER_GRANT when override is GRANT", () => {
    expect(
      evaluatePermissionAccess({
        permissionActive: true,
        userOverride: "GRANT",
        hasRoleGrant: false,
      })
    ).toEqual({ allowed: true, reason: "USER_GRANT" });
  });

  it("returns ROLE_GRANT when no override and role grants", () => {
    expect(
      evaluatePermissionAccess({
        permissionActive: true,
        userOverride: null,
        hasRoleGrant: true,
      })
    ).toEqual({ allowed: true, reason: "ROLE_GRANT" });
  });

  it("returns NO_MATCH when no override and no role grant", () => {
    expect(
      evaluatePermissionAccess({
        permissionActive: true,
        userOverride: null,
        hasRoleGrant: false,
      })
    ).toEqual({ allowed: false, reason: "NO_MATCH" });
  });
});

describe("resolvePermissionAccess", () => {
  it("denies when permission is inactive even if user has GRANT override (orphan row)", () => {
    expect(
      resolvePermissionAccess({
        permissionActive: false,
        userOverride: "GRANT",
        hasRoleGrant: true,
      })
    ).toBe(false);
  });

  it("denies when permission is inactive and role would grant", () => {
    expect(
      resolvePermissionAccess({
        permissionActive: false,
        userOverride: null,
        hasRoleGrant: true,
      })
    ).toBe(false);
  });

  it("DENY override wins over role grant", () => {
    expect(
      resolvePermissionAccess({
        permissionActive: true,
        userOverride: "DENY",
        hasRoleGrant: true,
      })
    ).toBe(false);
  });

  it("GRANT override allows without role grant", () => {
    expect(
      resolvePermissionAccess({
        permissionActive: true,
        userOverride: "GRANT",
        hasRoleGrant: false,
      })
    ).toBe(true);
  });

  it("no override: allows when role grants", () => {
    expect(
      resolvePermissionAccess({
        permissionActive: true,
        userOverride: null,
        hasRoleGrant: true,
      })
    ).toBe(true);
  });

  it("no override: denies when no role grant", () => {
    expect(
      resolvePermissionAccess({
        permissionActive: true,
        userOverride: null,
        hasRoleGrant: false,
      })
    ).toBe(false);
  });

  it("DENY without role grant stays denied", () => {
    expect(
      resolvePermissionAccess({
        permissionActive: true,
        userOverride: "DENY",
        hasRoleGrant: false,
      })
    ).toBe(false);
  });
});

describe("isRoleAssignmentEffective", () => {
  const anchor = new Date("2026-03-31T12:00:00.000Z");

  it("treats null/undefined as never expired", () => {
    expect(isRoleAssignmentEffective(null, anchor)).toBe(true);
    expect(isRoleAssignmentEffective(undefined, anchor)).toBe(true);
  });

  it("is true when expiresAt is after reference time", () => {
    expect(isRoleAssignmentEffective(new Date("2026-04-01T00:00:00.000Z"), anchor)).toBe(true);
  });

  it("is false when expiresAt is at or before reference time (assignment expired)", () => {
    expect(isRoleAssignmentEffective(new Date("2026-03-31T12:00:00.000Z"), anchor)).toBe(false);
    expect(isRoleAssignmentEffective(new Date("2026-03-30T00:00:00.000Z"), anchor)).toBe(false);
  });

  it("treats expiresAt equal to reference instant as expired (exclusive boundary)", () => {
    const now = new Date("2027-01-15T10:00:00.000Z");
    expect(isRoleAssignmentEffective(now, now)).toBe(false);
  });
});
