/**
 * Platform organization contract tests.
 *
 * Design intent: OrganizationDefinition is consumed by API command routes as the
 * canonical organization shape. Fix the contract, not the test.
 */
import { describe, expect, it } from "vitest";

import type { OrganizationDefinition } from "../organization.js";

// ---------------------------------------------------------------------------
// OrganizationDefinition — structural contract
// ---------------------------------------------------------------------------

describe("OrganizationDefinition — structural contract", () => {
  it("accepts a minimal enabled organization with required fields only", () => {
    const org: OrganizationDefinition = {
      id: "org-001",
      tenantId: "acme-corp",
      name: "ACME Operations",
      enabled: true,
    };
    expect(org.id).toBe("org-001");
    expect(org.tenantId).toBe("acme-corp");
    expect(org.name).toBe("ACME Operations");
    expect(org.enabled).toBe(true);
    expect(org.slug).toBeUndefined();
    expect(org.settings).toBeUndefined();
  });

  it("accepts a disabled organization", () => {
    const org: OrganizationDefinition = {
      id: "org-002",
      tenantId: "beta-tenant",
      name: "Beta Warehouse",
      enabled: false,
    };
    expect(org.enabled).toBe(false);
  });

  it("accepts optional slug for URL-safe routing", () => {
    const org: OrganizationDefinition = {
      id: "org-003",
      tenantId: "acme-corp",
      name: "ACME Sales",
      enabled: true,
      slug: "acme-sales",
    };
    expect(org.slug).toBe("acme-sales");
  });

  it("accepts optional settings as arbitrary key-value record", () => {
    const org: OrganizationDefinition = {
      id: "org-004",
      tenantId: "gamma-tenant",
      name: "Gamma Finance",
      enabled: true,
      settings: {
        defaultCurrency: "USD",
        fiscalYearStartMonth: 1,
        approvalThreshold: 10000,
      },
    };
    expect(org.settings?.["defaultCurrency"]).toBe("USD");
    expect(org.settings?.["fiscalYearStartMonth"]).toBe(1);
  });

  it("accepts settings with boolean and nested values", () => {
    const org: OrganizationDefinition = {
      id: "org-005",
      tenantId: "delta",
      name: "Delta Manufacturing",
      enabled: true,
      settings: {
        features: { kanban: true, dashboard: false },
        maxUsers: 50,
      },
    };
    const features = org.settings?.["features"] as Record<string, boolean>;
    expect(features?.["kanban"]).toBe(true);
    expect(features?.["dashboard"]).toBe(false);
  });

  it("EXHAUSTIVENESS GATE — OrganizationDefinition has exactly 6 fields (including 2 optional)", () => {
    const org: OrganizationDefinition = {
      id: "x",
      tenantId: "y",
      name: "z",
      enabled: true,
      slug: "z-slug",
      settings: {},
    };
    expect(Object.keys(org)).toHaveLength(6);
  });

  it("tenantId and id are separate non-interchangeable identifiers", () => {
    const org: OrganizationDefinition = {
      id: "org-id-001",
      tenantId: "tenant-id-xyz",
      name: "Test Org",
      enabled: true,
    };
    expect(org.id).not.toBe(org.tenantId);
  });
});
