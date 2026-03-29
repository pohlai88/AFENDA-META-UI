import { describe, it, expect, vi } from "vitest";
import type {
  ScenarioDefinition,
  ScenarioStep,
} from "../types/scenario.js";
import type { TruthHarness, TruthMutationResult } from "../types/test-harness.js";
import {
  seedScenario,
  registerScenario,
  listScenarios,
  defineScenario,
} from "../seed/seed-scenario.js";

function makeHarness(): TruthHarness {
  return {
    db: {
      findOne: vi.fn(),
      find: vi.fn(),
      insert: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      sql: vi.fn(),
      reset: vi.fn(),
      getEvents: vi.fn().mockReturnValue([]),
    },
    context: {
      db: {
        findOne: vi.fn(),
        find: vi.fn(),
        insert: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
        sql: vi.fn(),
        reset: vi.fn(),
        getEvents: vi.fn().mockReturnValue([]),
      },
      emit: vi.fn(),
      clock: () => new Date("2026-03-28T00:00:00.000Z"),
      tenantId: "tenant-1",
      userId: 42,
    },
    events: [],
    execute: vi.fn(),
    query: vi.fn(),
    replay: vi.fn(),
    reset: vi.fn(),
  };
}

describe("seed-scenario", () => {
  it("lists built-in scenarios", () => {
    const names = listScenarios();
    expect(names).toContain("multi-tier-commission");
    expect(names).toContain("tenant-isolation");
  });

  it("throws for unknown scenario", async () => {
    const harness = makeHarness();
    await expect(seedScenario(harness, "missing-scenario")).rejects.toThrow("Unknown scenario");
  });

  it("registers a scenario and rejects duplicate names", () => {
    const scenario: ScenarioDefinition = {
      name: "custom-scenario-unique-a",
      description: "custom scenario",
      steps: [{ type: "wait", ms: 1 }],
    };

    registerScenario(scenario);
    expect(listScenarios()).toContain("custom-scenario-unique-a");

    expect(() => registerScenario(scenario)).toThrow("Scenario already registered");
  });

  it("executes mutation, seed, wait, and assertion steps with overrides", async () => {
    const harness = makeHarness();

    vi.mocked(harness.execute)
      .mockResolvedValueOnce({ id: "MUT-1" } as TruthMutationResult)
      .mockResolvedValueOnce({ id: "MUT-2" } as TruthMutationResult);
    vi.mocked(harness.context.db.insert)
      .mockResolvedValueOnce({ id: "SEED-1" } as never)
      .mockResolvedValueOnce({ id: "SEED-2" } as never);

    const assertion = vi.fn();
    const definition: ScenarioDefinition = {
      name: "custom-scenario-unique-b",
      description: "full execution",
      steps: [
        {
          type: "mutation",
          mutation: {
            entity: "salesOrder",
            operation: "create",
            input: { status: "draft", amount: 100 },
          },
        },
        { type: "seed", entity: "product", data: { name: "Old Name" } },
        { type: "wait", ms: 1 },
        { type: "assertion", name: "after wait", fn: assertion },
        {
          type: "mutation",
          mutation: {
            entity: "salesOrder",
            operation: "create",
            input: { status: "draft", amount: 200 },
          },
        },
        { type: "seed", entity: "product", data: { name: "Old Name 2" } },
      ] as ScenarioStep[],
    };

    registerScenario(definition);

    const scenario = await seedScenario(harness, "custom-scenario-unique-b", {
      salesOrder: { status: "approved" },
      product: { name: "Overridden Product" },
    });

    expect(harness.execute).toHaveBeenNthCalledWith(1, {
      entity: "salesOrder",
      operation: "create",
      input: { status: "draft", amount: 100 },
    });
    expect(harness.context.db.insert).toHaveBeenCalledWith("product", {
      name: "Overridden Product",
      tenantId: "tenant-1",
      createdBy: 42,
      updatedBy: 42,
    });
    expect(assertion).toHaveBeenCalledTimes(1);
    expect(scenario.entities.salesOrder).toEqual(["MUT-1", "MUT-2"]);
    expect(scenario.entities.product).toEqual(["SEED-1", "SEED-2"]);
  });

  it("cleans up created entities in reverse order", async () => {
    const harness = makeHarness();

    vi.mocked(harness.execute).mockResolvedValue({ id: "MUT-1" } as TruthMutationResult);
    vi.mocked(harness.context.db.insert).mockResolvedValue({ id: "SEED-1" } as never);
    vi.mocked(harness.context.db.delete).mockResolvedValue(1 as never);

    const definition: ScenarioDefinition = {
      name: "custom-scenario-unique-c",
      description: "cleanup check",
      steps: [
        {
          type: "mutation",
          mutation: {
            entity: "salesOrder",
            operation: "create",
            input: { status: "draft" },
          },
        },
        { type: "seed", entity: "product", data: { name: "Seed" } },
      ],
    };

    registerScenario(definition);

    const scenario = await seedScenario(harness, "custom-scenario-unique-c");
    await scenario.cleanup();

    expect(harness.context.db.delete).toHaveBeenNthCalledWith(1, "product", { id: "SEED-1" });
    expect(harness.context.db.delete).toHaveBeenNthCalledWith(2, "salesOrder", { id: "MUT-1" });
  });

  it("supports fluent scenario builder", () => {
    const built = defineScenario("builder-unique-d", "builder path")
      .mutate({ entity: "x", operation: "create", input: { a: 1 } })
      .seed("y", { b: 2 })
      .wait(2)
      .assert("ok", () => undefined)
      .build();

    expect(built.name).toBe("builder-unique-d");
    expect(built.description).toBe("builder path");
    expect(built.steps).toHaveLength(4);
    expect(built.steps[0]?.type).toBe("mutation");
    expect(built.steps[1]?.type).toBe("seed");
    expect(built.steps[2]?.type).toBe("wait");
    expect(built.steps[3]?.type).toBe("assertion");
  });
});
