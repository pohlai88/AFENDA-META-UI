import { describe, expect, it } from "vitest";

import { resolveLifecyclePolicy } from "../policies/defaultPolicy.js";
import { buildGovernanceAuditReport } from "../governance/auditReport.js";

describe("buildGovernanceAuditReport", () => {
  it("produces complete 7W1H and governance score", () => {
    const basePolicy = resolveLifecyclePolicy("sales-default");
    const report = buildGovernanceAuditReport({
      basePolicy,
      resolved: {
        policy: basePolicy,
        steps: [{ scope: "base", sourceId: basePolicy.id }],
        appliedPatches: [],
        skippedPatches: [],
      },
      command: "audit-policy",
      actor: "tester",
    });

    expect(report.sevenWOneHComplete).toBe(true);
    expect(report.missingSevenWOneHDimensions).toEqual([]);
    expect(report.governanceScore).toBeGreaterThanOrEqual(80);
    expect(report.governanceChecks.some((check) => check.name === "seven_w_one_h_completeness")).toBe(
      true
    );
  });
});
