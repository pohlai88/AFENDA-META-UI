import { describe, expect, expectTypeOf, it } from "vitest";

import {
  PermissionGrantTypeSchema,
  UserStatusSchema,
  type PermissionGrantType,
  type UserStatus,
} from "../_enums.js";

describe("UserStatusSchema", () => {
  it("accepts each canonical value", () => {
    for (const s of [
      "ACTIVE",
      "INACTIVE",
      "LOCKED",
      "PENDING_VERIFICATION",
    ] as const satisfies readonly UserStatus[]) {
      expect(UserStatusSchema.safeParse(s).success).toBe(true);
    }
  });

  it('rejects unknown strings like "UNKNOWN"', () => {
    expect(UserStatusSchema.safeParse("UNKNOWN").success).toBe(false);
  });
});

describe("PermissionGrantTypeSchema", () => {
  it("accepts only GRANT and DENY", () => {
    expect(PermissionGrantTypeSchema.safeParse("GRANT").success).toBe(true);
    expect(PermissionGrantTypeSchema.safeParse("DENY").success).toBe(true);
  });

  it("rejects other strings", () => {
    expect(PermissionGrantTypeSchema.safeParse("ALLOW").success).toBe(false);
    expect(PermissionGrantTypeSchema.safeParse("grant").success).toBe(false);
  });
});

describe("inferred enum types", () => {
  it("narrows UserStatus in a discriminated helper", () => {
    function label(s: UserStatus): string {
      switch (s) {
        case "ACTIVE":
          return "active";
        case "INACTIVE":
          return "inactive";
        case "LOCKED":
          return "locked";
        case "PENDING_VERIFICATION":
          return "pending";
        default: {
          const _exhaustive: never = s;
          return _exhaustive;
        }
      }
    }
    expect(label("ACTIVE")).toBe("active");
    expectTypeOf<UserStatus>().toEqualTypeOf<
      "ACTIVE" | "INACTIVE" | "LOCKED" | "PENDING_VERIFICATION"
    >();
  });

  it("narrows PermissionGrantType", () => {
    function isDeny(g: PermissionGrantType): boolean {
      return g === "DENY";
    }
    expect(isDeny("DENY")).toBe(true);
    expect(isDeny("GRANT")).toBe(false);
    expectTypeOf<PermissionGrantType>().toEqualTypeOf<"GRANT" | "DENY">();
  });
});
