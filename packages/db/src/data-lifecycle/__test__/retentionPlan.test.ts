import { describe, expect, it } from "vitest";

import { resolveLifecyclePolicy } from "../policies/defaultPolicy.js";
import { buildRetentionPlan } from "../retention/retentionPlan.js";

describe("buildRetentionPlan", () => {
  it("builds deterministic cutoffs from a fixed now", () => {
    const now = new Date("2026-03-27T00:00:00Z");
    const policy = resolveLifecyclePolicy("sales-default");
    const plan = buildRetentionPlan({
      tenantId: 7,
      actorId: 101,
      now,
      rules: policy.retentionRules,
    });

    expect(plan.generatedAt).toBe("2026-03-27T00:00:00.000Z");
    expect(plan.cutoffs["sales-orders-legal-retention"]).toBe("2019-03-27T00:00:00.000Z");
    expect(plan.cutoffs["approval-logs-purge"]).toBe("2019-03-27T00:00:00.000Z");
    expect(plan.cutoffs["document-attachments-purge"]).toBe("2024-03-27T00:00:00.000Z");
  });

  it("embeds tenant and actor in operational SQL", () => {
    const policy = resolveLifecyclePolicy("sales-default");
    const plan = buildRetentionPlan({
      tenantId: 42,
      actorId: 99,
      now: new Date("2026-03-27T00:00:00Z"),
      rules: policy.retentionRules,
    });

    const archiveAction = plan.actions.find((action) => action.id === "archive-sales-orders-legal-retention");
    const softDeleteAction = plan.actions.find(
      (action) => action.id === "soft-delete-sales-orders-legal-retention"
    );

    expect(archiveAction?.statement).toContain("WHERE s.tenant_id = 42");
    expect(softDeleteAction?.statement).toContain("updated_by = 99");
    expect(softDeleteAction?.statement).toContain("tenant_id = 42");
  });

  it("contains required lifecycle operations", () => {
    const policy = resolveLifecyclePolicy("sales-default");
    const plan = buildRetentionPlan({ tenantId: 1, actorId: 1, rules: policy.retentionRules });
    const actionIds = new Set(plan.actions.map((action) => action.id));

    expect(actionIds.has("ensure-schema-archive")).toBe(true);
    expect(actionIds.has("archive-sales-orders-legal-retention")).toBe(true);
    expect(actionIds.has("soft-delete-sales-orders-legal-retention")).toBe(true);
    expect(actionIds.has("purge-approval-logs-purge")).toBe(true);
    expect(actionIds.has("purge-document-attachments-purge")).toBe(true);
  });
});
