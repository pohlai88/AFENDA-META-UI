import { describe, expect, it, vi } from "vitest";

import { mutationCommandGateway } from "../mutation-command-gateway.js";

describe("mutationCommandGateway", () => {
  it("delegates to executeCommand and returns ok with truth record", async () => {
    const appendMemory = vi.fn(async () => {});
    const updateProjections = vi.fn(async () => {});

    const result = await mutationCommandGateway({
      commandName: "ConfirmSalesOrder",
      context: {
        tenantId: "t1",
        actorId: "a1",
        commandName: "ConfirmSalesOrder",
        input: { salesOrderId: "so_1" },
        idempotencyKey: "idem_1",
      },
      authorize: async () => {},
      validateContract: async () => {},
      checkIdempotency: async () => {},
      applyMutation: async () => ({
        entityName: "salesOrder",
        entityId: "so_1",
        previousState: { status: "draft" },
        nextState: { status: "confirmed" },
        supersession: {
          mode: "supersedes" as const,
          supersedesRecordId: "rec_prev",
          reason: "confirmation",
        },
      }),
      appendMemory,
      updateProjections,
      invariants: [],
    });

    expect(result.status).toBe("ok");
    if (result.status !== "ok") throw new Error("expected ok");
    expect(result.truthRecord.action).toBe("ConfirmSalesOrder");
    expect(result.truthRecord.recordHash).toMatch(/^[a-f0-9]{64}$/);
    expect(appendMemory).toHaveBeenCalledTimes(1);
    expect(updateProjections).toHaveBeenCalledTimes(1);
  });

  it("returns blocked when a pre-commit invariant fails", async () => {
    const result = await mutationCommandGateway({
      commandName: "PostJournal",
      context: {
        tenantId: "t1",
        actorId: "a1",
        commandName: "PostJournal",
        input: {},
      },
      authorize: async () => {},
      validateContract: async () => {},
      checkIdempotency: async () => {},
      applyMutation: vi.fn(),
      appendMemory: vi.fn(),
      updateProjections: vi.fn(),
      invariants: [
        {
          key: "block-me",
          timing: "pre-commit",
          evaluate: async () => ({
            ok: false as const,
            failure: {
              invariantName: "journal_balances",
              severity: "critical",
              failurePolicy: "block",
              doctrine: {
                doctrineRef: "accounting_journal_balance",
                family: "Accounting-Control",
                standard: "Double-entry control",
                section: "Journal balancing",
                title: "Journal debits and credits must balance before posting",
                interpretation: "strict",
              },
              evidence: { summary: "Unbalanced", facts: {} },
            },
          }),
        },
      ],
    });

    expect(result.status).toBe("blocked");
    if (result.status !== "blocked") throw new Error("expected blocked");
    expect(result.failures[0]?.invariantName).toBe("journal_balances");
  });
});
