/**
 * Platform tenant Zod schema contract tests.
 *
 * Design intent: tenant, organization, and metadata override schemas define the
 * multi-tenant control plane. Any drift here is a compatibility break.
 */
import { describe, expect, it } from "vitest";

import {
  MetadataOverrideSchema,
  OrganizationDefinitionSchema,
  OverrideScopeSchema,
  TenantBrandingSchema,
  TenantDefinitionSchema,
  TenantIsolationStrategySchema,
  TenantLocaleSchema,
} from "../tenant.schema.js";

describe("TenantIsolationStrategySchema", () => {
  it("parses all three isolation strategies", () => {
    const strategies = ["logical", "schema", "physical"] as const;
    for (const strategy of strategies) {
      expect(TenantIsolationStrategySchema.safeParse(strategy).success).toBe(true);
    }
  });

  it("rejects unknown strategies", () => {
    expect(TenantIsolationStrategySchema.safeParse("hybrid").success).toBe(false);
  });
});

describe("OverrideScopeSchema", () => {
  it("parses all five override scopes", () => {
    const scopes = ["global", "industry", "tenant", "department", "user"] as const;
    for (const scope of scopes) {
      expect(OverrideScopeSchema.safeParse(scope).success).toBe(true);
    }
  });

  it("rejects unknown override scopes", () => {
    expect(OverrideScopeSchema.safeParse("team").success).toBe(false);
  });
});

describe("TenantBrandingSchema", () => {
  it("accepts an empty branding object", () => {
    expect(TenantBrandingSchema.safeParse({}).success).toBe(true);
  });

  it("accepts a fully specified branding object", () => {
    const result = TenantBrandingSchema.safeParse({
      primaryColor: "#1A73E8",
      secondaryColor: "#E94235",
      logoUrl: "https://cdn.bigcorp.com/logo.png",
      faviconUrl: "https://cdn.bigcorp.com/favicon.ico",
      appName: "BigCorp ERP",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.appName).toBe("BigCorp ERP");
    }
  });
});

describe("TenantLocaleSchema", () => {
  it("accepts a full locale definition", () => {
    const result = TenantLocaleSchema.safeParse({
      timezone: "Europe/Berlin",
      language: "de",
      currency: "EUR",
      dateFormat: "DD.MM.YYYY",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.language).toBe("de");
    }
  });

  it("rejects incomplete locale definitions", () => {
    expect(
      TenantLocaleSchema.safeParse({ timezone: "UTC", currency: "USD", dateFormat: "MM/DD/YYYY" })
        .success
    ).toBe(false);
  });
});

describe("TenantDefinitionSchema", () => {
  it("parses a minimal tenant", () => {
    const result = TenantDefinitionSchema.safeParse({
      id: "tenant-acme",
      name: "Acme Corporation",
      isolationStrategy: "logical",
      enabled: true,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.enabled).toBe(true);
    }
  });

  it("parses a fully specified tenant", () => {
    const result = TenantDefinitionSchema.safeParse({
      id: "tenant-bigcorp",
      name: "BigCorp Ltd",
      industry: "manufacturing",
      isolationStrategy: "schema",
      enabled: true,
      features: { multiCurrency: true, advancedReporting: true },
      locale: {
        timezone: "Europe/Berlin",
        language: "de",
        currency: "EUR",
        dateFormat: "DD.MM.YYYY",
      },
      branding: {
        primaryColor: "#1A73E8",
        secondaryColor: "#E94235",
        logoUrl: "https://cdn.bigcorp.com/logo.png",
        faviconUrl: "https://cdn.bigcorp.com/favicon.ico",
        appName: "BigCorp ERP",
      },
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.features?.multiCurrency).toBe(true);
      expect(result.data.branding?.appName).toBe("BigCorp ERP");
    }
  });

  it("rejects missing enabled", () => {
    expect(
      TenantDefinitionSchema.safeParse({
        id: "tenant-x",
        name: "Tenant X",
        isolationStrategy: "logical",
      }).success
    ).toBe(false);
  });

  it("rejects features arrays", () => {
    expect(
      TenantDefinitionSchema.safeParse({
        id: "tenant-x",
        name: "Tenant X",
        isolationStrategy: "logical",
        enabled: true,
        features: ["bad"],
      }).success
    ).toBe(false);
  });
});

describe("OrganizationDefinitionSchema", () => {
  it("parses a minimal organization", () => {
    const result = OrganizationDefinitionSchema.safeParse({
      id: "org-hq",
      tenantId: "tenant-acme",
      name: "HQ",
      enabled: true,
    });
    expect(result.success).toBe(true);
  });

  it("parses optional slug and settings", () => {
    const result = OrganizationDefinitionSchema.safeParse({
      id: "org-emea",
      tenantId: "tenant-acme",
      name: "EMEA Region",
      enabled: true,
      slug: "emea",
      settings: { defaultCurrency: "EUR" },
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.slug).toBe("emea");
    }
  });

  it("rejects missing enabled", () => {
    expect(
      OrganizationDefinitionSchema.safeParse({ id: "org-1", tenantId: "tenant-acme", name: "Org" })
        .success
    ).toBe(false);
  });
});

describe("MetadataOverrideSchema", () => {
  it("parses a minimal tenant-scoped override", () => {
    const result = MetadataOverrideSchema.safeParse({
      id: "override-001",
      scope: "tenant",
      model: "SalesOrder",
      patch: {},
      enabled: true,
    });
    expect(result.success).toBe(true);
  });

  it("parses nullish tenant and department identifiers", () => {
    const result = MetadataOverrideSchema.safeParse({
      id: "override-002",
      scope: "global",
      tenantId: null,
      departmentId: undefined,
      userId: null,
      model: "Ledger",
      patch: { labelOverrides: { amount: "Value" } },
      enabled: false,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.tenantId).toBeNull();
      expect(result.data.enabled).toBe(false);
    }
  });

  it("rejects missing enabled", () => {
    expect(
      MetadataOverrideSchema.safeParse({ id: "ov1", scope: "tenant", model: "Model", patch: {} })
        .success
    ).toBe(false);
  });
});
