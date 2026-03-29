/**
 * RBAC session schema Zod contract tests.
 *
 * Design intent: SessionContext is the security boundary between callers and the
 * API. Schema divergence from the declared TS type is a security regression.
 * Fix the contract, not the test.
 */
import { describe, expect, it } from "vitest";

import { ResolutionContextSchema, SessionContextSchema } from "../session.schema.js";

// ---------------------------------------------------------------------------
// SessionContextSchema
// ---------------------------------------------------------------------------

describe("SessionContextSchema — valid inputs", () => {
  it("parses a minimal session context (only required fields)", () => {
    const result = SessionContextSchema.safeParse({
      uid: "user-001",
      roles: ["admin"],
      lang: "en_US",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.uid).toBe("user-001");
      expect(result.data.roles).toContain("admin");
      expect(result.data.lang).toBe("en_US");
    }
  });

  it("parses a session context with all optional fields populated", () => {
    const result = SessionContextSchema.safeParse({
      uid: "user-002",
      userId: "human-readable-user-002",
      roles: ["manager", "user"],
      lang: "fr_FR",
      timezone: "Europe/Paris",
      tenantId: "acme-corp",
      departmentId: "dept-sales",
      industry: "manufacturing",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.tenantId).toBe("acme-corp");
      expect(result.data.roles).toHaveLength(2);
      expect(result.data.timezone).toBe("Europe/Paris");
    }
  });

  it("parses a session context with an empty roles array", () => {
    const result = SessionContextSchema.safeParse({
      uid: "system-proc",
      roles: [],
      lang: "en_US",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.roles).toHaveLength(0);
    }
  });

  it("optional fields are truly optional and absent by default", () => {
    const result = SessionContextSchema.safeParse({
      uid: "anon",
      roles: [],
      lang: "en",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.userId).toBeUndefined();
      expect(result.data.timezone).toBeUndefined();
      expect(result.data.tenantId).toBeUndefined();
      expect(result.data.departmentId).toBeUndefined();
      expect(result.data.industry).toBeUndefined();
    }
  });
});

describe("SessionContextSchema — invalid inputs", () => {
  it("rejects missing uid", () => {
    const result = SessionContextSchema.safeParse({ roles: ["admin"], lang: "en" });
    expect(result.success).toBe(false);
  });

  it("rejects missing roles", () => {
    const result = SessionContextSchema.safeParse({ uid: "user-001", lang: "en" });
    expect(result.success).toBe(false);
  });

  it("rejects missing lang", () => {
    const result = SessionContextSchema.safeParse({ uid: "user-001", roles: ["admin"] });
    expect(result.success).toBe(false);
  });

  it("rejects non-string uid", () => {
    const result = SessionContextSchema.safeParse({ uid: 42, roles: [], lang: "en" });
    expect(result.success).toBe(false);
  });

  it("rejects non-array roles", () => {
    const result = SessionContextSchema.safeParse({ uid: "u", roles: "admin", lang: "en" });
    expect(result.success).toBe(false);
  });

  it("rejects null as a session context", () => {
    expect(SessionContextSchema.safeParse(null).success).toBe(false);
  });

  it("rejects a value that is a plain array (not an object)", () => {
    expect(SessionContextSchema.safeParse(["uid", "roles", "lang"]).success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// ResolutionContextSchema
// ---------------------------------------------------------------------------

describe("ResolutionContextSchema — valid inputs", () => {
  it("parses a minimal resolution context (only tenantId required)", () => {
    const result = ResolutionContextSchema.safeParse({ tenantId: "acme-corp" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.tenantId).toBe("acme-corp");
    }
  });

  it("parses a full resolution context with all optional fields", () => {
    const result = ResolutionContextSchema.safeParse({
      tenantId: "acme-corp",
      departmentId: "dept-finance",
      userId: "user-99",
      industry: "retail",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.departmentId).toBe("dept-finance");
      expect(result.data.industry).toBe("retail");
    }
  });

  it("optional fields absent by default", () => {
    const result = ResolutionContextSchema.safeParse({ tenantId: "tenant-x" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.departmentId).toBeUndefined();
      expect(result.data.userId).toBeUndefined();
    }
  });
});

describe("ResolutionContextSchema — invalid inputs", () => {
  it("rejects missing tenantId (it is required)", () => {
    const result = ResolutionContextSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it("rejects non-string tenantId", () => {
    const result = ResolutionContextSchema.safeParse({ tenantId: 123 });
    expect(result.success).toBe(false);
  });

  it("rejects null", () => {
    expect(ResolutionContextSchema.safeParse(null).success).toBe(false);
  });
});
