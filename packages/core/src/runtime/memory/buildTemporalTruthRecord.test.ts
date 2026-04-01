import { describe, expect, it } from "vitest";

import { buildTemporalTruthRecord } from "./buildTemporalTruthRecord.js";
import {
  assertSupersessionProvided,
  evaluateSupersessionRequirement,
} from "./supersession.js";

describe("buildTemporalTruthRecord", () => {
  it("builds a deterministic record hash for logically identical payloads", () => {
    const base = {
      tenantId: "tenant_1",
      entityName: "salesOrder",
      entityId: "so_123",
      action: "ConfirmSalesOrder",
      happenedAt: "2026-04-01T00:00:00.000Z",
      recordedAt: "2026-04-01T00:00:01.000Z",
      actor: {
        type: "user" as const,
        userId: "user_1",
        role: "sales_manager",
      },
      command: {
        commandName: "ConfirmSalesOrder",
        commandId: "cmd_1",
        idempotencyKey: "idem_1",
      },
      causation: {
        causationId: "cause_1",
        correlationId: "corr_1",
      },
      supersession: {
        mode: "none" as const,
      },
    };

    const recordA = buildTemporalTruthRecord({
      ...base,
      recordId: "rec_1",
      payload: {
        facts: {
          b: 2,
          a: 1,
        },
      },
    });

    const recordB = buildTemporalTruthRecord({
      ...base,
      recordId: "rec_1",
      payload: {
        facts: {
          a: 1,
          b: 2,
        },
      },
    });

    expect(recordA.payloadHash).toBe(recordB.payloadHash);
    expect(recordA.recordHash).toBe(recordB.recordHash);
  });

  it("defaults supersession to none", () => {
    const record = buildTemporalTruthRecord({
      tenantId: "tenant_1",
      entityName: "journalEntry",
      entityId: "je_1",
      action: "PostOrderJournal",
      actor: {
        type: "system",
      },
      command: {
        commandName: "PostOrderJournal",
      },
    });

    expect(record.supersession).toEqual({ mode: "none" });
  });
});

describe("supersession", () => {
  it("does not require supersession for metadata-only changes when ignored", () => {
    const evaluation = evaluateSupersessionRequirement({
      entityName: "salesOrder",
      previousState: {
        status: "draft",
        updatedAt: "2026-04-01T00:00:00.000Z",
      },
      nextState: {
        status: "draft",
        updatedAt: "2026-04-01T00:01:00.000Z",
      },
      ignoredFields: ["updatedAt"],
    });

    expect(evaluation.requiresSupersession).toBe(false);
    expect(evaluation.changedFields).toEqual([]);
  });

  it("requires supersession for meaning-changing updates", () => {
    expect(() =>
      assertSupersessionProvided({
        entityName: "salesOrder",
        previousState: {
          status: "draft",
          totalAmount: "100.00",
        },
        nextState: {
          status: "confirmed",
          totalAmount: "100.00",
        },
        supersession: { mode: "none" },
      }),
    ).toThrow(/Supersession required/);
  });

  it("accepts valid supersession metadata", () => {
    const evaluation = assertSupersessionProvided({
      entityName: "salesOrder",
      previousState: {
        status: "draft",
      },
      nextState: {
        status: "confirmed",
      },
      supersession: {
        mode: "supersedes",
        supersedesRecordId: "rec_prev",
        reason: "Order confirmation replaced draft economic intent",
      },
    });

    expect(evaluation.requiresSupersession).toBe(true);
    expect(evaluation.changedFields).toEqual(["status"]);
  });
});
