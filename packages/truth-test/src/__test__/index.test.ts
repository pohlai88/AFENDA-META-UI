import { describe, it, expect } from "vitest";
import * as api from "../index.js";

describe("public API exports", () => {
  it("exports core harness and execution functions", () => {
    expect(typeof api.createTruthHarness).toBe("function");
    expect(typeof api.createTestDB).toBe("function");
    expect(typeof api.executeMutation).toBe("function");
    expect(typeof api.executeMutationBatch).toBe("function");
    expect(typeof api.executeQuery).toBe("function");
    expect(typeof api.replayEvents).toBe("function");
    expect(typeof api.replayEventsForProjection).toBe("function");
  });

  it("exports assertion helpers", () => {
    expect(typeof api.assertInvariant).toBe("function");
    expect(typeof api.assertEntityInvariant).toBe("function");
    expect(typeof api.assertAllEntityInvariants).toBe("function");
    expect(typeof api.assertEvent).toBe("function");
    expect(typeof api.assertState).toBe("function");
    expect(typeof api.assertProjection).toBe("function");
  });

  it("exports seeding and auto-test utilities", () => {
    expect(typeof api.seedEntity).toBe("function");
    expect(typeof api.seedEntityBatch).toBe("function");
    expect(typeof api.seedEntityViaEngine).toBe("function");
    expect(typeof api.seedScenario).toBe("function");
    expect(typeof api.defineScenario).toBe("function");
    expect(typeof api.evaluateCondition).toBe("function");
    expect(typeof api.generateStateMachineTests).toBe("function");
    expect(typeof api.generateInvariantTests).toBe("function");
    expect(typeof api.generatePolicyTests).toBe("function");
  });
});
