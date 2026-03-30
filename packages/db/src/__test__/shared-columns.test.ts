import { describe, expect, it } from "vitest";

import {
  ALL_SHARED_FINGERPRINTS,
  MANDATORY_SHARED_COLUMNS,
  RECOMMENDED_SHARED_COLUMNS,
  auditColumns,
  softDeleteColumns,
  timestampColumns,
} from "../infra-utils/columns/index.js";

describe("shared column mixins", () => {
  it("exports timestamp columns", () => {
    expect(timestampColumns).toHaveProperty("createdAt");
    expect(timestampColumns).toHaveProperty("updatedAt");
  });

  it("exports soft delete column", () => {
    expect(softDeleteColumns).toHaveProperty("deletedAt");
  });

  it("exports audit columns", () => {
    expect(auditColumns).toHaveProperty("createdBy");
    expect(auditColumns).toHaveProperty("updatedBy");
  });

  it("tracks mandatory and recommended columns without tenantId", () => {
    expect(MANDATORY_SHARED_COLUMNS).toEqual(["createdAt", "updatedAt"]);
    expect(RECOMMENDED_SHARED_COLUMNS).toEqual(["deletedAt", "createdBy", "updatedBy"]);
  });

  it("exposes shared fingerprints for CI-style checks", () => {
    expect(ALL_SHARED_FINGERPRINTS.createdAt).toContain("timestamp");
    expect(ALL_SHARED_FINGERPRINTS.updatedAt).toContain("defaultNow");
    expect(ALL_SHARED_FINGERPRINTS).not.toHaveProperty("tenantId");
  });
});
