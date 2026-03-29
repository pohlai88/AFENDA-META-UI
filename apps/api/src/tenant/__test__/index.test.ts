import { describe, it, expect, beforeEach } from "vitest";
import {
  registerTenant,
  updateTenant,
  getTenant,
  listTenants,
  removeTenant,
  registerIndustryTemplate,
  registerOverride,
  removeOverride,
  getOverridesForModel,
  resolveMetadata,
  validateOverride,
  safeRegisterOverride,
  getTenantStats,
  deepMerge,
  clearTenants,
} from "../index.js";
import type { TenantDefinition, MetadataOverride } from "@afenda/meta-types/platform";
beforeEach(() => clearTenants());

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeTenant(id: string, industry = "manufacturing"): TenantDefinition {
  return {
    id,
    name: `Tenant ${id}`,
    industry,
    isolationStrategy: "logical",
    enabled: true,
    branding: {
      primaryColor: "#000",
      secondaryColor: "#fff",
      appName: `App ${id}`,
    },
    features: {},
    locale: {
      timezone: "UTC",
      language: "en",
      currency: "USD",
      dateFormat: "YYYY-MM-DD",
    },
  };
}

function makeOverride(
  id: string,
  scope: MetadataOverride["scope"],
  model: string,
  patch: Record<string, unknown>,
  extras?: Partial<MetadataOverride>
): MetadataOverride {
  return {
    id,
    scope,
    model,
    patch,
    enabled: true,
    tenantId: extras?.tenantId ?? null,
    departmentId: extras?.departmentId ?? null,
    userId: extras?.userId ?? null,
    ...extras,
  };
}

// ---------------------------------------------------------------------------
// Tenant Registry
// ---------------------------------------------------------------------------

describe("tenant — registry", () => {
  it("registers and retrieves a tenant", () => {
    const t = makeTenant("tenant-a");
    registerTenant(t);
    expect(getTenant("tenant-a")).toEqual(t);
  });

  it("throws when registering a duplicate tenant ID", () => {
    registerTenant(makeTenant("dup"));
    expect(() => registerTenant(makeTenant("dup"))).toThrow();
  });

  it("updateTenant replaces the definition", () => {
    registerTenant(makeTenant("upd", "retail"));
    updateTenant(makeTenant("upd", "healthcare"));
    expect(getTenant("upd")?.industry).toBe("healthcare");
  });

  it("listTenants returns all tenants", () => {
    registerTenant(makeTenant("t1"));
    registerTenant(makeTenant("t2"));
    expect(listTenants().length).toBe(2);
  });

  it("listTenants with enabledOnly filters disabled tenants", () => {
    registerTenant(makeTenant("t-on"));
    const disabled: TenantDefinition = { ...makeTenant("t-off"), enabled: false };
    registerTenant(disabled);
    expect(listTenants(true).length).toBe(1);
    expect(listTenants(true)[0].id).toBe("t-on");
  });

  it("removeTenant removes tenant and its overrides", () => {
    registerTenant(makeTenant("rm-tenant"));
    registerOverride(
      makeOverride(
        "ovr-rm",
        "tenant",
        "Order",
        { field: "x" },
        {
          tenantId: "rm-tenant",
        }
      )
    );

    removeTenant("rm-tenant");
    expect(getTenant("rm-tenant")).toBeUndefined();
    expect(getOverridesForModel("Order").length).toBe(0);
  });

  it("removeTenant returns false for unknown tenant", () => {
    expect(removeTenant("ghost")).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Override Registry
// ---------------------------------------------------------------------------

describe("tenant — overrides", () => {
  it("registers and lists overrides for a model", () => {
    registerOverride(makeOverride("o1", "global", "Order", { label: "PO" }));
    registerOverride(makeOverride("o2", "global", "Invoice", { label: "Inv" }));
    expect(getOverridesForModel("Order").length).toBe(1);
  });

  it("removeOverride deletes the override", () => {
    registerOverride(makeOverride("o-rm", "global", "Order", { x: 1 }));
    removeOverride("o-rm");
    expect(getOverridesForModel("Order").length).toBe(0);
  });

  it("disabled overrides are excluded from getOverridesForModel", () => {
    registerOverride({
      ...makeOverride("o-off", "global", "Order", { x: 1 }),
      enabled: false,
    });
    expect(getOverridesForModel("Order").length).toBe(0);
  });

  it("overrides are sorted by scope priority (global before tenant)", () => {
    registerTenant(makeTenant("ta"));
    registerOverride(
      makeOverride(
        "o-tenant",
        "tenant",
        "Order",
        { priority: 2 },
        {
          tenantId: "ta",
        }
      )
    );
    registerOverride(makeOverride("o-global", "global", "Order", { priority: 1 }));

    const sorted = getOverridesForModel("Order");
    expect(sorted[0].scope).toBe("global");
    expect(sorted[1].scope).toBe("tenant");
  });
});

// ---------------------------------------------------------------------------
// Resolution
// ---------------------------------------------------------------------------

describe("tenant — resolution", () => {
  const base = { label: "Order", showFooter: false };

  beforeEach(() => {
    registerTenant(makeTenant("corp", "retail"));
  });

  it("returns global metadata when no overrides exist", () => {
    const result = resolveMetadata("Order", base, {
      tenantId: "corp",
    });
    expect(result).toEqual(base);
  });

  it("global override merges into base", () => {
    registerOverride(makeOverride("g1", "global", "Order", { showFooter: true }));
    const result = resolveMetadata("Order", base, { tenantId: "corp" });
    expect(result.showFooter).toBe(true);
    expect(result.label).toBe("Order");
  });

  it("tenant override supersedes global override", () => {
    registerOverride(makeOverride("g1", "global", "Order", { label: "Global Order" }));
    registerOverride(
      makeOverride(
        "t1",
        "tenant",
        "Order",
        { label: "Corp Order" },
        {
          tenantId: "corp",
        }
      )
    );

    const result = resolveMetadata("Order", base, { tenantId: "corp" });
    expect(result.label).toBe("Corp Order");
  });

  it("department override supersedes tenant override", () => {
    registerOverride(
      makeOverride(
        "t1",
        "tenant",
        "Order",
        { label: "Tenant" },
        {
          tenantId: "corp",
        }
      )
    );
    registerOverride(
      makeOverride(
        "d1",
        "department",
        "Order",
        { label: "Dept" },
        {
          tenantId: "corp",
          departmentId: "sales",
        }
      )
    );

    const result = resolveMetadata("Order", base, {
      tenantId: "corp",
      departmentId: "sales",
    });
    expect(result.label).toBe("Dept");
  });

  it("user override supersedes department override", () => {
    registerOverride(
      makeOverride(
        "d1",
        "department",
        "Order",
        { label: "Dept" },
        {
          tenantId: "corp",
          departmentId: "sales",
        }
      )
    );
    registerOverride(
      makeOverride(
        "u1",
        "user",
        "Order",
        { label: "User" },
        {
          tenantId: "corp",
          userId: "alice",
        }
      )
    );

    const result = resolveMetadata("Order", base, {
      tenantId: "corp",
      departmentId: "sales",
      userId: "alice",
    });
    expect(result.label).toBe("User");
  });

  it("tenant override does not apply to a different tenant", () => {
    registerOverride(
      makeOverride(
        "t1",
        "tenant",
        "Order",
        { label: "Corp Only" },
        {
          tenantId: "corp",
        }
      )
    );

    const result = resolveMetadata("Order", base, { tenantId: "other-tenant" });
    expect(result.label).toBe("Order"); // from base
  });

  it("applies industry template between global and tenant layers", () => {
    registerIndustryTemplate("retail", { currency: "USD", taxMode: "inclusive" });

    registerOverride(makeOverride("g1", "global", "Order", { label: "Global" }));
    registerOverride(
      makeOverride(
        "t1",
        "tenant",
        "Order",
        { label: "Corp" },
        {
          tenantId: "corp",
        }
      )
    );

    const result = resolveMetadata("Order", base, {
      tenantId: "corp",
      industry: "retail",
    });
    expect(result.currency).toBe("USD");
    expect(result.label).toBe("Corp"); // tenant still wins
  });
});

// ---------------------------------------------------------------------------
// Governance
// ---------------------------------------------------------------------------

describe("tenant — governance", () => {
  it("returns no violations for a valid global override", () => {
    const violations = validateOverride(makeOverride("v1", "global", "Order", { label: "test" }));
    expect(violations.filter((v) => v.severity === "error").length).toBe(0);
  });

  it("reports error when patch is empty", () => {
    const violations = validateOverride(makeOverride("v-empty", "global", "Order", {}));
    expect(violations.some((v) => v.rule === "patch_not_empty")).toBe(true);
    expect(violations.some((v) => v.severity === "error")).toBe(true);
  });

  it("reports error when tenant-scoped override references unknown tenant", () => {
    const violations = validateOverride(
      makeOverride(
        "v-noTenant",
        "tenant",
        "Order",
        { x: 1 },
        {
          tenantId: "ghost-tenant",
        }
      )
    );
    expect(violations.some((v) => v.rule === "tenant_must_exist")).toBe(true);
  });

  it("reports error for user-scoped override without userId", () => {
    const violations = validateOverride(
      makeOverride(
        "v-noUser",
        "user",
        "Order",
        { x: 1 },
        {
          tenantId: null,
          userId: null,
        }
      )
    );
    expect(violations.some((v) => v.rule === "user_scope_requires_user_id")).toBe(true);
  });

  it("reports error for department-scoped override without departmentId", () => {
    const violations = validateOverride(
      makeOverride(
        "v-noDept",
        "department",
        "Order",
        { x: 1 },
        {
          tenantId: null,
          departmentId: null,
        }
      )
    );
    expect(violations.some((v) => v.rule === "dept_scope_requires_dept_id")).toBe(true);
  });

  it("reports warning for overriding structural keys", () => {
    const violations = validateOverride(
      makeOverride("v-struct", "global", "Order", { id: "override-id" })
    );
    expect(
      violations.some((v) => v.severity === "warning" && v.rule === "no_structural_override")
    ).toBe(true);
  });

  it("safeRegisterOverride throws on error-level violations", () => {
    expect(() => safeRegisterOverride(makeOverride("v-throw", "global", "Order", {}))).toThrow();
  });

  it("safeRegisterOverride registers on valid override with warnings only", () => {
    registerTenant(makeTenant("safe-t"));
    const warnings = safeRegisterOverride(
      makeOverride("v-warn", "global", "Order", { id: "override-id" })
    );
    // Warning about structural key, but no errors — should still register
    expect(warnings.some((v) => v.severity === "warning")).toBe(true);
    expect(getOverridesForModel("Order").length).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// deepMerge utility
// ---------------------------------------------------------------------------

describe("tenant — deepMerge", () => {
  it("shallow merges non-object values", () => {
    const result = deepMerge({ a: 1, b: 2 }, { b: 99, c: 3 });
    expect(result).toEqual({ a: 1, b: 99, c: 3 });
  });

  it("deep merges nested objects", () => {
    const result = deepMerge(
      { config: { color: "red", size: "sm" } },
      { config: { size: "lg", bold: true } }
    );
    expect(result.config).toEqual({ color: "red", size: "lg", bold: true });
  });

  it("replaces arrays rather than concatinating", () => {
    const result = deepMerge({ tags: ["a", "b"] }, { tags: ["c"] });
    expect(result.tags).toEqual(["c"]);
  });

  it("does not mutate source or target", () => {
    const target = { x: 1 };
    const source = { y: 2 };
    deepMerge(target, source);
    expect(target).toEqual({ x: 1 });
    expect(source).toEqual({ y: 2 });
  });
});

// ---------------------------------------------------------------------------
// Stats
// ---------------------------------------------------------------------------

describe("tenant — stats", () => {
  it("reflects correct registration counts", () => {
    registerTenant(makeTenant("s1"));
    registerTenant(makeTenant("s2"));
    registerOverride(makeOverride("o1", "global", "Order", { x: 1 }));
    registerIndustryTemplate("retail", { currency: "USD" });

    const stats = getTenantStats();
    expect(stats.tenants).toBe(2);
    expect(stats.overrides).toBe(1);
    expect(stats.industryTemplates).toBe(1);
  });
});
