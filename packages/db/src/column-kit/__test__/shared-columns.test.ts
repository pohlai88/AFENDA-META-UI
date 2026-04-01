import { describe, expect, it } from "vitest";
import { getTableConfig, pgTable, uuid } from "drizzle-orm/pg-core";

import {
  ALL_SHARED_FINGERPRINTS,
  COLUMN_KIT_FINGERPRINTS,
  MANDATORY_SHARED_COLUMNS,
  NAME_FINGERPRINTS,
  RECOMMENDED_SHARED_COLUMNS,
  SHARED_COLUMN_ALLOWLIST,
  appendOnlyTimestampColumns,
  auditColumns,
  columnKitFingerprintNameFromColumnName,
  columnKitSqlColumnNameFromFingerprintName,
  columnNameMatchesSharedColumnPattern,
  evaluateSharedColumnCoverage,
  evaluateSharedColumnCoverageWithShapes,
  isColumnKitFingerprintName,
  isColumnKitSqlColumnName,
  isSharedColumnName,
  matrixExemptsCoverageViolation,
  resolveColumnKitGovernanceProfile,
  sharedColumnPatternSeverity,
  sharedColumnShapeCandidatesFromColumnKitCatalog,
  sharedColumnShapeMatches,
  softDeleteColumns,
  timestampColumns,
} from "../index.js";
import { users } from "../../schema/security/index.js";

describe("shared column mixins", () => {
  it("exports timestamp columns", () => {
    expect(timestampColumns).toHaveProperty("createdAt");
    expect(timestampColumns).toHaveProperty("updatedAt");
  });

  it("exports append-only timestamp columns", () => {
    expect(appendOnlyTimestampColumns).toHaveProperty("createdAt");
    expect(appendOnlyTimestampColumns).not.toHaveProperty("updatedAt");
  });

  it("exports soft delete column", () => {
    expect(softDeleteColumns).toHaveProperty("deletedAt");
  });

  it("timestampColumns + softDeleteColumns compile to timestamptz with expected nullability and defaults", () => {
    const probe = pgTable("_column_kit_ts_probe", {
      id: uuid("id").primaryKey().defaultRandom(),
      ...timestampColumns,
      ...softDeleteColumns,
    });
    const { columns } = getTableConfig(probe);
    const bySqlName = Object.fromEntries(columns.map((c) => [c.name, c]));

    expect(bySqlName["created_at"]?.getSQLType()).toBe("timestamp with time zone");
    expect(bySqlName["created_at"]?.notNull).toBe(true);
    expect(bySqlName["created_at"]?.hasDefault).toBe(true);

    expect(bySqlName["updated_at"]?.getSQLType()).toBe("timestamp with time zone");
    expect(bySqlName["updated_at"]?.notNull).toBe(true);
    expect(bySqlName["updated_at"]?.hasDefault).toBe(true);

    expect(bySqlName["deleted_at"]?.getSQLType()).toBe("timestamp with time zone");
    expect(bySqlName["deleted_at"]?.notNull).toBe(false);
    expect(bySqlName["deleted_at"]?.hasDefault).toBe(false);
  });

  it("appendOnlyTimestampColumns is createdAt-only timestamptz with default", () => {
    const probe = pgTable("_column_kit_append_probe", {
      id: uuid("id").primaryKey().defaultRandom(),
      ...appendOnlyTimestampColumns,
    });
    const { columns } = getTableConfig(probe);
    const bySqlName = Object.fromEntries(columns.map((c) => [c.name, c]));
    expect(Object.keys(bySqlName).sort()).toEqual(["created_at", "id"]);
    expect(bySqlName["created_at"]?.getSQLType()).toBe("timestamp with time zone");
    expect(bySqlName["created_at"]?.notNull).toBe(true);
    expect(bySqlName["created_at"]?.hasDefault).toBe(true);
  });

  it("exports audit columns factory with user FK refs", () => {
    const cols = auditColumns(() => users.userId);
    expect(cols).toHaveProperty("createdBy");
    expect(cols).toHaveProperty("updatedBy");
  });

  it("tracks mandatory and recommended columns without tenantId", () => {
    expect(MANDATORY_SHARED_COLUMNS).toEqual(["createdAt", "updatedAt"]);
    expect(RECOMMENDED_SHARED_COLUMNS).toEqual(["deletedAt", "createdBy", "updatedBy"]);
  });

  it("exposes structured shared fingerprints for CI-style checks", () => {
    expect(ALL_SHARED_FINGERPRINTS.createdAt).toMatchObject({
      kind: "timestamp",
      timezone: true,
      notNull: true,
      defaultNow: true,
    });
    expect(ALL_SHARED_FINGERPRINTS.updatedAt).toMatchObject({
      kind: "timestamp",
      timezone: true,
      notNull: true,
      defaultNow: true,
    });
    expect(ALL_SHARED_FINGERPRINTS.deletedAt).toMatchObject({
      kind: "timestamp",
      timezone: true,
      notNull: false,
      defaultNow: false,
    });
    expect(ALL_SHARED_FINGERPRINTS.createdBy).toMatchObject({
      kind: "integer",
      notNull: true,
      references: "security.users.userId",
    });
    expect(NAME_FINGERPRINTS.name).toMatchObject({ kind: "text", notNull: true, maxLength: 255 });
    expect(COLUMN_KIT_FINGERPRINTS).toHaveProperty("name");
    expect(ALL_SHARED_FINGERPRINTS).not.toHaveProperty("tenantId");
  });

  it("sharedColumnShapeCandidatesFromColumnKitCatalog matches COLUMN_KIT_FINGERPRINTS", () => {
    const rows = sharedColumnShapeCandidatesFromColumnKitCatalog();
    expect(rows.length).toBe(Object.keys(COLUMN_KIT_FINGERPRINTS).length);
    for (const row of rows) {
      const key = row.name as keyof typeof COLUMN_KIT_FINGERPRINTS;
      expect(sharedColumnShapeMatches(COLUMN_KIT_FINGERPRINTS[key], row)).toBe(true);
    }
  });

  it("maps column-kit fingerprint names to SQL names and back", () => {
    expect(columnKitSqlColumnNameFromFingerprintName("createdAt")).toBe("created_at");
    expect(columnKitFingerprintNameFromColumnName("created_at")).toBe("createdAt");
    expect(columnKitFingerprintNameFromColumnName("createdAt")).toBe("createdAt");
    expect(columnKitFingerprintNameFromColumnName("unknown_col")).toBeNull();
    expect(isColumnKitSqlColumnName("updated_by")).toBe(true);
    expect(isColumnKitSqlColumnName("updatedBy")).toBe(false);
  });

  it("evaluateSharedColumnCoverageWithShapes passes when declarations match fingerprints", () => {
    const report = evaluateSharedColumnCoverageWithShapes(sharedColumnShapeCandidatesFromColumnKitCatalog());
    expect(report.isShapeCompliant).toBe(true);
    expect(report.shapeViolations).toEqual([]);
  });

  it("evaluateSharedColumnCoverageWithShapes reports shape mismatches", () => {
    const report = evaluateSharedColumnCoverageWithShapes([
      ...sharedColumnShapeCandidatesFromColumnKitCatalog().filter((d) => d.name !== "createdAt"),
      {
        name: "createdAt",
        type: "timestamp",
        timezone: true,
        notNull: true,
        defaultNow: false,
      },
    ]);
    expect(report.isShapeCompliant).toBe(false);
    expect(report.isCompliant).toBe(false);
    expect(report.shapeViolations).toHaveLength(1);
    expect(report.shapeViolations[0]?.column).toBe("createdAt");
  });

  it("evaluateSharedColumnCoverageWithShapes flags deletedAt when not nullable", () => {
    const report = evaluateSharedColumnCoverageWithShapes([
      ...sharedColumnShapeCandidatesFromColumnKitCatalog().filter((d) => d.name !== "deletedAt"),
      {
        name: "deletedAt",
        type: "timestamp",
        timezone: true,
        notNull: true,
        defaultNow: false,
      },
    ]);
    expect(report.isShapeCompliant).toBe(false);
    expect(report.shapeViolations.map((v) => v.column)).toContain("deletedAt");
  });

  it("evaluateSharedColumnCoverageWithShapes validates name mixin text fingerprint", () => {
    const bad = evaluateSharedColumnCoverageWithShapes([
      ...sharedColumnShapeCandidatesFromColumnKitCatalog().filter((d) => d.name !== "name"),
      { name: "name", type: "text", notNull: false },
    ]);
    expect(bad.isShapeCompliant).toBe(false);
    expect(bad.shapeViolations.map((v) => v.column)).toContain("name");

    const good = evaluateSharedColumnCoverageWithShapes(sharedColumnShapeCandidatesFromColumnKitCatalog());
    expect(good.shapeViolations.filter((v) => v.column === "name")).toEqual([]);
  });

  it("evaluateSharedColumnCoverageWithShapes flags audit integers when FK reference mismatches", () => {
    const report = evaluateSharedColumnCoverageWithShapes([
      ...sharedColumnShapeCandidatesFromColumnKitCatalog().filter((d) => d.name !== "createdBy"),
      {
        name: "createdBy",
        type: "integer",
        notNull: true,
        references: "other_table.id",
      },
    ]);
    expect(report.isShapeCompliant).toBe(false);
    expect(report.shapeViolations.map((v) => v.column)).toContain("createdBy");
  });

  it("treats canonical and legacy users PK reference forms as equivalent", () => {
    const report = evaluateSharedColumnCoverageWithShapes([
      ...sharedColumnShapeCandidatesFromColumnKitCatalog().filter((d) => d.name !== "createdBy"),
      {
        name: "createdBy",
        type: "integer",
        notNull: true,
        references: "users.id",
      },
    ]);
    expect(report.isShapeCompliant).toBe(true);

    const reportWithSnakeCase = evaluateSharedColumnCoverageWithShapes([
      ...sharedColumnShapeCandidatesFromColumnKitCatalog().filter((d) => d.name !== "createdBy"),
      {
        name: "createdBy",
        type: "integer",
        notNull: true,
        references: "security.users.user_id",
      },
    ]);
    expect(reportWithSnakeCase.isShapeCompliant).toBe(true);
  });

  it("evaluateSharedColumnCoverageWithShapes accepts snake_case introspection names", () => {
    const sqlNamedDefs = sharedColumnShapeCandidatesFromColumnKitCatalog().map((d) => {
      if (!isColumnKitFingerprintName(d.name)) return d;
      return { ...d, name: columnKitSqlColumnNameFromFingerprintName(d.name) };
    });
    const report = evaluateSharedColumnCoverageWithShapes(sqlNamedDefs);
    expect(report.isShapeCompliant).toBe(true);
    expect(report.missingMandatory).toEqual([]);
  });

  it("distinguishes shared coverage keys from full column-kit shape catalog", () => {
    expect(isSharedColumnName("name")).toBe(false);
    expect(isColumnKitFingerprintName("name")).toBe(true);
  });

  it("evaluates shared column coverage and flags compliance", () => {
    const report = evaluateSharedColumnCoverage(["createdAt", "updatedAt", "deletedAt"]);
    expect(report.isCompliant).toBe(true);
    expect(report.isCriticalSharedStyleClean).toBe(true);
    expect(report.missingMandatory).toEqual([]);
    expect(report.missingRecommended).toEqual(["createdBy", "updatedBy"]);
    expect(report.violations.map((v) => v.kind)).toEqual([
      "missingRecommended",
      "missingRecommended",
    ]);
  });

  it("resolves append-only matrix profile for history/event tables", () => {
    const profile = resolveColumnKitGovernanceProfile("hr.employee_request_history");
    expect(profile.lifecycle).toBe("appendOnly");
    expect(profile.mandatory.has("updatedAt")).toBe(false);
    expect(profile.mandatory.has("createdAt")).toBe(true);
    expect(profile.recommended.has("deletedAt")).toBe(false);

    expect(
      matrixExemptsCoverageViolation("hr.employee_request_history", {
        kind: "missingMandatory",
        column: "updatedAt",
      })
    ).toBe(true);
    expect(
      matrixExemptsCoverageViolation("hr.employee_request_history", {
        kind: "missingMandatory",
        column: "createdAt",
      })
    ).toBe(false);
  });

  it("normalizes snake_case shared columns for coverage checks", () => {
    const report = evaluateSharedColumnCoverage(["created_at", "updated_at", "deleted_at"]);
    expect(report.isCompliant).toBe(true);
    expect(report.missingMandatory).toEqual([]);
    expect(report.missingRecommended).toEqual(["createdBy", "updatedBy"]);
  });

  it("detects unexpected critical columns and fails compliance", () => {
    const report = evaluateSharedColumnCoverage(["createdAt", "updatedAt", "approvedAt", "approvedBy"]);
    expect(report.unexpectedCritical).toEqual(["approvedAt", "approvedBy"]);
    expect(report.unexpectedInformational).toEqual([]);
    expect(report.isCompliant).toBe(false);
    expect(report.isCriticalSharedStyleClean).toBe(false);
    expect(report.violations.filter((v) => v.kind === "unexpectedSharedStyle")).toEqual([
      { kind: "unexpectedSharedStyle", column: "approvedAt", severity: "critical" },
      { kind: "unexpectedSharedStyle", column: "approvedBy", severity: "critical" },
    ]);
  });

  it("treats deleted* prefix as critical even when name also matches Flag", () => {
    const report = evaluateSharedColumnCoverage(["createdAt", "updatedAt", "deletedFlag", "statusCode"]);
    expect(report.unexpectedCritical).toEqual(["deletedFlag"]);
    expect(report.unexpectedInformational).toEqual([]);
    expect(report.isCompliant).toBe(false);
  });

  it("splits critical vs informational unexpected columns", () => {
    const report = evaluateSharedColumnCoverage([
      "createdAt",
      "updatedAt",
      "publishedOn",
      "workflowStatus",
      "rowVersion",
      "isHidden",
      "sourceSystem",
      "correlationId",
    ]);
    expect([...report.unexpectedCritical].sort()).toEqual(["publishedOn"].sort());
    expect([...report.unexpectedInformational].sort()).toEqual(
      ["correlationId", "isHidden", "rowVersion", "sourceSystem", "workflowStatus"].sort()
    );
    expect(report.isCompliant).toBe(false);
  });

  it("is compliant when only informational unexpecteds remain", () => {
    const report = evaluateSharedColumnCoverage(["createdAt", "updatedAt", "workflowStatus", "rowVersion"]);
    expect(report.unexpectedCritical).toEqual([]);
    expect([...report.unexpectedInformational].sort()).toEqual(["rowVersion", "workflowStatus"].sort());
    expect(report.isCompliant).toBe(true);
    expect(report.isCriticalSharedStyleClean).toBe(true);
  });

  it("does not flag domain columns that do not match any shared-column pattern", () => {
    const report = evaluateSharedColumnCoverage(["createdAt", "updatedAt", "statusCode", "lineTotal", "sku"]);
    expect(report.unexpectedSharedColumns).toEqual([]);
    expect(report.isCompliant).toBe(true);
  });

  it("respects default governance allowlist for noisy domain names", () => {
    expect(SHARED_COLUMN_ALLOWLIST).toContain("orderStatus");
    const report = evaluateSharedColumnCoverage(["createdAt", "updatedAt", "orderStatus", "schemaVersion"]);
    expect(report.unexpectedSharedColumns).toEqual([]);
    expect(sharedColumnPatternSeverity("orderStatus")).toBe("informational");
  });

  it("merges per-call allowlist with defaults", () => {
    const report = evaluateSharedColumnCoverage(
      ["createdAt", "updatedAt", "workflowStatus"],
      { allowlist: ["workflowStatus"] }
    );
    expect(report.unexpectedSharedColumns).toEqual([]);
  });

  it("matches shared-column patterns from the catalog", () => {
    expect(columnNameMatchesSharedColumnPattern("approvedAt")).toBe(true);
    expect(columnNameMatchesSharedColumnPattern("approvedBy")).toBe(true);
    expect(columnNameMatchesSharedColumnPattern("publishedOn")).toBe(true);
    expect(columnNameMatchesSharedColumnPattern("deletedFlag")).toBe(true);
    expect(columnNameMatchesSharedColumnPattern("createdOrder")).toBe(true);
    expect(columnNameMatchesSharedColumnPattern("orderStatus")).toBe(true);
    expect(columnNameMatchesSharedColumnPattern("schemaVersion")).toBe(true);
    expect(columnNameMatchesSharedColumnPattern("isActive")).toBe(true);
    expect(columnNameMatchesSharedColumnPattern("sourceRowId")).toBe(true);
    expect(columnNameMatchesSharedColumnPattern("correlationToken")).toBe(true);
    expect(columnNameMatchesSharedColumnPattern("lineTotal")).toBe(false);
  });

  it("resolves pattern severity for governance tiers", () => {
    expect(sharedColumnPatternSeverity("approvedAt")).toBe("critical");
    expect(sharedColumnPatternSeverity("workflowStatus")).toBe("informational");
    expect(sharedColumnPatternSeverity("isHidden")).toBe("informational");
    expect(sharedColumnPatternSeverity("lineTotal")).toBe(null);
  });

  it("identifies known shared column names", () => {
    expect(isSharedColumnName("createdAt")).toBe(true);
    expect(isSharedColumnName("tenantId")).toBe(false);
  });
});
