import { describe, expect, it } from "vitest";
import { createDbTruthVerificationAdapters } from "./dbAdapters.js";
import { verifyTruth } from "./verifyTruth.js";

describe("verifyTruth", () => {
  it("returns evidence and snapshot from adapters", async () => {
    const adapters = createDbTruthVerificationAdapters({
      async readMemoryEventRows() {
        return [
          {
            event_id: "evt_1",
            entity_name: "sales_order",
            entity_id: "SO-1",
            present_state: { status: "posted", amount: 100 },
          },
        ];
      },
      async readCurrentProjection() {
        return {
          "SO-1": { status: "posted", amount: 100 },
        };
      },
      async readInvariantFailureRows() {
        return [];
      },
    });

    const result = await verifyTruth({
      adapters,
      generatorDriftChecked: true,
    });

    expect(result.evidence.generatorDriftChecked).toBe(true);
    expect(result.evidence.replayMatchesCurrentProjection).toBe(true);
    expect(result.evidence.authorityStatus).toBe("authoritative");
    expect(result.snapshot.events).toHaveLength(1);
    expect(result.snapshot.failures).toHaveLength(0);
  });

  it("marks evidence blocked when failures exist", async () => {
    const adapters = createDbTruthVerificationAdapters({
      async readMemoryEventRows() {
        return [
          {
            event_id: "evt_1",
            entity_name: "sales_order",
            entity_id: "SO-1",
            present_state: { status: "posted", amount: 100 },
          },
        ];
      },
      async readCurrentProjection() {
        return {
          "SO-1": { status: "posted", amount: 100 },
        };
      },
      async readInvariantFailureRows() {
        return [
          {
            invariant_name: "journal_must_balance",
            doctrine: {
              doctrineRef: "double_entry_balance",
              family: "Accounting-Control",
              standard: "Accounting Truth Contract",
              section: "Journal balance",
              title: "Every journal posting must remain balanced.",
              interpretation: "strict",
            },
            evidence: {
              summary: "Journal debits and credits are not equal.",
              facts: {
                journalEntryId: "draft",
                debitTotal: 100,
                creditTotal: 90,
              },
            },
            resolution: {
              resolutionId: "resolve_journal_imbalance",
              resolutionClass: "role-resolvable",
              title: "Correct journal imbalance",
              actions: [
                {
                  type: "instruction",
                  label: "Review posting lines and ensure total debits equal total credits.",
                },
              ],
              responsibleRole: "accountant",
            },
          },
        ];
      },
    });

    const result = await verifyTruth({
      adapters,
      generatorDriftChecked: true,
    });

    expect(result.evidence.authorityStatus).toBe("blocked");
    expect(result.evidence.blockedReasons).toHaveLength(1);
  });
});
