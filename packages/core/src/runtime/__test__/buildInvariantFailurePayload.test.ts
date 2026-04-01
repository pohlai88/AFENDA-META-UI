import { describe, expect, it } from "vitest";
import { invariants } from "../../generated/invariants.js";
import { buildInvariantFailurePayload } from "../buildInvariantFailurePayload.js";

describe("buildInvariantFailurePayload end-to-end", () => {
  it("assembles invariant, doctrine, evidence, and resolution from catalog data", () => {
    const invariant = invariants.find((entry) => entry.key === "journal_must_balance");
    if (!invariant) {
      throw new Error("Missing generated invariant: journal_must_balance");
    }
    const payload = buildInvariantFailurePayload({
      invariantName: invariant.key,
      severity: invariant.severity,
      failurePolicy: invariant.failurePolicy,
      evidenceSummary: "Journal out of balance",
      evidenceFacts: {
        journalEntryId: "J-001",
        debitTotal: 100,
        creditTotal: 90,
      },
      doctrineRef: invariant.doctrineRef,
      resolutionRef: invariant.resolutionRef,
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
