import { getTableColumns } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import {
  tenantDefinitions,
  metadataOverrides,
  industryTemplates,
  decisionAuditEntries,
  decisionAuditChains,
} from "../schema/index.js";

describe("Phase 4 tenant persistence contracts", () => {
  it("tenant_definitions keeps identity and config columns", () => {
    const cols = getTableColumns(tenantDefinitions);

    expect(cols.id).toBeDefined();
    expect(cols.name).toBeDefined();
    expect(cols.industry).toBeDefined();
    expect(cols.isolationStrategy).toBeDefined();
    expect(cols.enabled).toBeDefined();
    expect(cols.branding).toBeDefined();
    expect(cols.features).toBeDefined();
    expect(cols.locale).toBeDefined();
    expect(cols.createdAt).toBeDefined();
    expect(cols.updatedAt).toBeDefined();
  });

  it("metadata_overrides keeps scope, model, and patch columns", () => {
    const cols = getTableColumns(metadataOverrides);

    expect(cols.id).toBeDefined();
    expect(cols.scope).toBeDefined();
    expect(cols.tenantId).toBeDefined();
    expect(cols.departmentId).toBeDefined();
    expect(cols.userId).toBeDefined();
    expect(cols.model).toBeDefined();
    expect(cols.patch).toBeDefined();
    expect(cols.enabled).toBeDefined();
  });

  it("industry_templates stores JSONB template per industry", () => {
    const cols = getTableColumns(industryTemplates);

    expect(cols.industry).toBeDefined();
    expect(cols.template).toBeDefined();
    expect(cols.createdAt).toBeDefined();
  });
});

describe("Phase 4 decision audit contracts", () => {
  it("decision_audit_entries captures full decision context", () => {
    const cols = getTableColumns(decisionAuditEntries);

    expect(cols.id).toBeDefined();
    expect(cols.timestamp).toBeDefined();
    expect(cols.tenantId).toBeDefined();
    expect(cols.userId).toBeDefined();
    expect(cols.eventType).toBeDefined();
    expect(cols.scope).toBeDefined();
    expect(cols.context).toBeDefined();
    expect(cols.decision).toBeDefined();
    expect(cols.durationMs).toBeDefined();
    expect(cols.status).toBeDefined();
    expect(cols.error).toBeDefined();
    expect(cols.chainId).toBeDefined();
  });

  it("decision_audit_chains tracks aggregate chain metrics", () => {
    const cols = getTableColumns(decisionAuditChains);

    expect(cols.rootId).toBeDefined();
    expect(cols.totalDurationMs).toBeDefined();
    expect(cols.entryCount).toBeDefined();
    expect(cols.errorCount).toBeDefined();
  });
});
