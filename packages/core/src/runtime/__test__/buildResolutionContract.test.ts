import { describe, expect, it } from "vitest";
import { buildTruthRegistry } from "../registry.js";
import { buildResolutionContract } from "../resolution/buildResolutionContract.js";

describe("buildResolutionContract", () => {
  it("returns role-resolvable actions for authorized actor and injects route params", () => {
    const registry = buildTruthRegistry();
    const contract = buildResolutionContract({
      registry,
      resolutionRef: "resolve_journal_imbalance",
      actorRole: "accountant",
      evidenceFacts: { journalEntryId: "J-123" },
    });

    expect(contract?.resolutionId).toBe("resolve_journal_imbalance");
    expect(contract?.actions).toHaveLength(1);
    expect(contract?.actions[0]?.type).toBe("instruction");
  });

  it("falls back to workflow escalation when actor lacks direct role", () => {
    const registry = buildTruthRegistry();
    const contract = buildResolutionContract({
      registry,
      resolutionRef: "resolve_journal_imbalance",
      actorRole: "sales_clerk",
      evidenceFacts: {},
    });

    expect(contract?.actions[0]).toMatchObject({
      type: "workflow",
      target: "escalation",
    });
  });
});
