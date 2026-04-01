import { describe, expect, it, vi } from "vitest";
import { executeCommand } from "../command/executeCommand.js";
import { isInvariantBlockResult } from "../command/types.js";
import * as projectionReadChecks from "../../projection/runProjectionReadChecks.js";

describe("executeCommand", () => {
  it("does not invoke projection read checks in command pipeline", async () => {
    const readSpy = vi.spyOn(projectionReadChecks, "runProjectionReadChecks");

    await executeCommand({
      context: {
        tenantId: "t1",
        actorId: "a1",
        commandName: "test",
        input: {},
      },
      command: { name: "test" },
      authorize: async () => {},
      validateContract: async () => {},
      checkIdempotency: async () => {},
      applyMutation: async () => ({
        entityName: "salesOrder",
        entityId: "so_1",
      }),
      appendMemory: async () => {},
      updateProjections: async () => {},
      invariants: [],
    });

    expect(readSpy).not.toHaveBeenCalled();
    readSpy.mockRestore();
  });

  it("runs bindTenant → authorize → validate → idempotency → pre invariants → mutation → memory → projections → post invariants", async () => {
    const order: string[] = [];
    const ctx = {
      tenantId: "t1",
      actorId: "a1",
      commandName: "test",
      input: {},
    };

    const result = await executeCommand({
      context: ctx,
      command: { name: "test" },
      bindTenant: async () => {
        order.push("bindTenant");
      },
      authorize: async () => {
        order.push("authorize");
      },
      validateContract: async () => {
        order.push("validateContract");
      },
      checkIdempotency: async () => {
        order.push("checkIdempotency");
      },
      applyMutation: async () => {
        order.push("applyMutation");
        return {
          entityName: "salesOrder",
          entityId: "so_1",
          previousState: null,
          nextState: { status: "CONFIRMED" },
          supersession: {
            mode: "supersedes" as const,
            supersedesRecordId: "rec_0",
            reason: "state transition",
          },
        };
      },
      appendMemory: async () => {
        order.push("appendMemory");
      },
      updateProjections: async () => {
        order.push("updateProjections");
      },
      invariants: [
        {
          key: "i-pre",
          timing: "pre-commit",
          evaluate: vi.fn(async () => ({ ok: true as const })),
        },
        {
          key: "i-post",
          timing: "post-commit",
          evaluate: vi.fn(async () => ({ ok: true as const })),
        },
      ],
    });

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("expected success");
    expect(result.truthRecord.action).toBe("test");
    expect(order).toEqual([
      "bindTenant",
      "authorize",
      "validateContract",
      "checkIdempotency",
      "applyMutation",
      "appendMemory",
      "updateProjections",
    ]);
  });

  it("blocks before mutation when pre-commit invariant fails", async () => {
    const applyMutation = vi.fn(async () => ({
      entityName: "salesOrder",
      entityId: "so_1",
    }));
    const appendMemory = vi.fn(async () => {});

    const result = await executeCommand({
      context: {
        tenantId: "t1",
        actorId: "a1",
        commandName: "test",
        input: {},
      },
      command: { name: "test" },
      authorize: async () => {},
      validateContract: async () => {},
      checkIdempotency: async () => {},
      applyMutation,
      appendMemory,
      updateProjections: async () => {},
      invariants: [
        {
          key: "bad",
          timing: "pre-commit",
          evaluate: async () => ({
            ok: false as const,
            failure: {
              invariantName: "bad",
              severity: "critical",
              failurePolicy: "block",
              doctrine: {
                doctrineRef: "d",
                family: "Accounting-Control",
                standard: "s",
                section: "sec",
                title: "sum",
                interpretation: "strict",
              },
              evidence: { summary: "e", facts: {} },
            },
          }),
        },
      ],
    });

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("expected block");
    expect(isInvariantBlockResult(result)).toBe(true);
    expect(result.stage).toBe("pre_commit_invariants");
    expect(result.failures).toHaveLength(1);
    expect(applyMutation).not.toHaveBeenCalled();
    expect(appendMemory).not.toHaveBeenCalled();
  });
});
