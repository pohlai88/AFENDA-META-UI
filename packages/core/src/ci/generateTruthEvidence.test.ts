import { describe, expect, it } from "vitest";
import { generateTruthEvidence } from "./generateTruthEvidence.js";

describe("generateTruthEvidence", () => {
  it("marks authority blocked when read-time checks fail", () => {
    const evidence = generateTruthEvidence({
      generatorDriftChecked: true,
      failures: [],
      events: [
        {
          eventId: "evt_1",
          entityName: "sales_order",
          entityId: "SO-1",
          presentState: { status: "posted", amount: 100 },
        },
      ],
      currentProjection: {
        "sales_order::SO-1": { status: "posted", amount: 100 },
      },
      tenantId: "tenant_a",
      scopeId: "financial_authority",
      readCheckContext: {
        truthContractValid: false,
        scopeId: "financial_authority",
      },
    });

    expect(evidence.authorityStatus).toBe("blocked");
    expect(evidence.blockedReasons).toHaveLength(1);
    expect(evidence.blockedReasons[0]?.invariantName).toBe(
      "authoritative_projection_requires_clean_truth_contract",
    );
  });
});
