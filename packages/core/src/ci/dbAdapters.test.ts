import { describe, expect, it } from "vitest";
import {
  createDbTruthVerificationAdapters,
  mapDbInvariantFailureRow,
  mapDbMemoryEventRow,
} from "./dbAdapters.js";

describe("db truth verification adapters", () => {
  it("maps memory event rows into replay memory events", () => {
    const event = mapDbMemoryEventRow({
      event_id: "evt_1",
      entity_name: "sales_order",
      entity_id: "SO-1",
      present_state: { status: "posted", amount: 100 },
      supersedes_event_id: null,
    });

    expect(event).toEqual({
      eventId: "evt_1",
      entityName: "sales_order",
      entityId: "SO-1",
      presentState: { status: "posted", amount: 100 },
      supersedesEventId: null,
    });
  });

  it("maps invariant failure rows into runtime failure payloads", () => {
    const failure = mapDbInvariantFailureRow({
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
    });

    expect(failure.invariantName).toBe("journal_must_balance");
    expect(failure.doctrine.doctrineRef).toBe("double_entry_balance");
    expect(failure.resolution?.resolutionId).toBe("resolve_journal_imbalance");
  });

  it("creates adapters that read and normalize db-backed truth inputs", async () => {
    const adapters = createDbTruthVerificationAdapters({
      async readMemoryEventRows() {
        return [
          {
            event_id: "evt_1",
            entity_name: "sales_order",
            entity_id: "SO-1",
            present_state: { status: "posted", amount: 100 },
            supersedes_event_id: null,
          },
        ];
      },
      async readCurrentProjection() {
        return {
          "sales_order::SO-1": { status: "posted", amount: 100 },
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
            resolution: undefined,
          },
        ];
      },
    });

    const events = await adapters.readMemoryEvents();
    const projection = await adapters.readCurrentProjection();
    const failures = await adapters.readInvariantFailures();

    expect(events).toHaveLength(1);
    expect(events[0]?.eventId).toBe("evt_1");
    expect(projection["sales_order::SO-1"]?.status).toBe("posted");
    expect(failures[0]?.invariantName).toBe("journal_must_balance");
  });
});
