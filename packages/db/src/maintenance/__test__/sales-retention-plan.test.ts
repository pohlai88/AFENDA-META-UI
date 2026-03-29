import { describe, expect, it } from "vitest";

import { buildSalesRetentionPlan } from "../sales-retention-plan.js";

describe("buildSalesRetentionPlan", () => {
  it("builds deterministic cutoffs from a fixed now", () => {
    const now = new Date("2026-03-27T00:00:00Z");
    const plan = buildSalesRetentionPlan({
      tenantId: 7,
      actorId: 101,
      now,
    });

    expect(plan.generatedAt).toBe("2026-03-27T00:00:00.000Z");
    expect(plan.cutoffs.salesOrdersBefore).toBe("2019-03-27T00:00:00.000Z");
    expect(plan.cutoffs.approvalLogsBefore).toBe("2019-03-27T00:00:00.000Z");
    expect(plan.cutoffs.attachmentsBefore).toBe("2024-03-27T00:00:00.000Z");
  });

  it("embeds tenant and actor in operational SQL", () => {
    const now = new Date("2026-03-27T00:00:00Z");
    const plan = buildSalesRetentionPlan({
      tenantId: 42,
      actorId: 99,
      now,
    });

    const archiveAction = plan.actions.find((action) => action.id === "archive-aged-sales-orders");
    const softDeleteAction = plan.actions.find(
      (action) => action.id === "soft-delete-aged-sales-orders"
    );

    expect(archiveAction?.statement).toContain("WHERE s.tenant_id = 42");
    expect(softDeleteAction?.statement).toContain("updated_by = 99");
    expect(softDeleteAction?.statement).toContain("tenant_id = 42");
  });

  it("contains required lifecycle operations", () => {
    const plan = buildSalesRetentionPlan({ tenantId: 1, actorId: 1 });
    const actionIds = new Set(plan.actions.map((action) => action.id));

    expect(actionIds.has("ensure-archive-schema")).toBe(true);
    expect(actionIds.has("archive-aged-sales-orders")).toBe(true);
    expect(actionIds.has("soft-delete-aged-sales-orders")).toBe(true);
    expect(actionIds.has("purge-aged-approval-logs")).toBe(true);
    expect(actionIds.has("purge-aged-document-attachments")).toBe(true);
  });
});
