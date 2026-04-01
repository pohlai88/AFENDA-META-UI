import { describe, expect, it } from "vitest";

import {
  serviceBypassPolicy,
  tenantIsolationCheck,
  tenantIsolationPolicies,
  TENANT_SCOPED_COLUMN,
} from "../tenant-policies.js";
import { AFENDA_SESSION_GUCS } from "../../pg-session/guc-registry.js";

describe("tenantIsolationPolicies", () => {
  it("returns four app_user policies per table", () => {
    const policies = tenantIsolationPolicies("partners");
    expect(policies).toHaveLength(4);
  });

  it("serviceBypassPolicy returns one policy", () => {
    expect(serviceBypassPolicy("partners")).toBeDefined();
  });
});

describe("tenantIsolationCheck", () => {
  it("references the shared tenant GUC name from guc-registry", () => {
    const fragment = tenantIsolationCheck();
    const serialized = JSON.stringify(fragment.queryChunks);
    expect(serialized).toContain(AFENDA_SESSION_GUCS.tenantId);
    expect(serialized).toContain(TENANT_SCOPED_COLUMN);
  });
});
