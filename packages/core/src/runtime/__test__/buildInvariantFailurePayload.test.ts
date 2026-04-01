import { describe, expect, it } from "vitest";
import { buildTruthRegistry } from "../registry.js";
import { buildInvariantFailurePayload } from "../buildInvariantFailurePayload.js";

describe("buildInvariantFailurePayload end-to-end", () => {
  it("assembles invariant, doctrine, evidence, and resolution from catalog data", () => {
    const registry = buildTruthRegistry();
    const payload = buildInvariantFailurePayload({
      registry,
      invariantKey: "journal_must_balance",
      evidenceSummary: "Journal out of balance",
      evidenceFacts: {
        journalEntryId: "J-001",
        debitTotal: 100,
        creditTotal: 90,
      },
      actorRole: "accountant",
    });

    expect(payload).toMatchObject({
      invariantName: "journal_must_balance",
      severity: "critical",
      failurePolicy: "block",
      doctrine: {
        doctrineRef: "double_entry_balance",
      },
      evidence: {
        summary: "Journal out of balance",
      },
      resolution: {
        resolutionId: "resolve_journal_imbalance",
      },
    });
  });
});
