/**
 * Compiler state-machine contract tests.
 *
 * Design intent: StateMachineDefinition drives ERP workflow transitions. Any change
 * to state/event shapes propagates to the workflow engine, so these tests enforce
 * the exact structural contract.
 */
import { describe, expect, it } from "vitest";

import type {
  State,
  StateMachineDefinition,
  Transition,
  TransitionEvent,
  TransitionResult,
} from "../state-machine.js";

describe("Transition — structural contract", () => {
  it("accepts a minimal transition", () => {
    const transition: Transition = {
      from: "draft",
      event: "submit",
      to: "review",
    };
    expect(transition.from).toBe("draft");
    expect(transition.event).toBe("submit");
    expect(transition.to).toBe("review");
  });

  it("accepts optional guards and emits", () => {
    const transition: Transition = {
      from: "review",
      event: "approve",
      to: "approved",
      guards: ["isManager", "hasApprovalQuota"],
      emits: ["approval.granted", "audit.logged"],
    };
    expect(transition.guards).toHaveLength(2);
    expect(transition.emits).toContain("approval.granted");
  });

  it("accepts empty guards/emits arrays", () => {
    const transition: Transition = {
      from: "a",
      event: "go",
      to: "b",
      guards: [],
      emits: [],
    };
    expect(transition.guards).toHaveLength(0);
    expect(transition.emits).toHaveLength(0);
  });
});

describe("StateMachineDefinition — structural contract", () => {
  it("accepts a valid tenant-extensible machine", () => {
    const machine: StateMachineDefinition = {
      model: "Order",
      stateField: "status",
      states: ["draft", "review", "approved", "rejected"],
      initialState: "draft",
      terminalStates: ["approved", "rejected"],
      transitions: [
        { from: "draft", event: "submit", to: "review" },
        { from: "review", event: "approve", to: "approved" },
        { from: "review", event: "reject", to: "rejected" },
      ],
      tenantExtensible: true,
    };
    expect(machine.model).toBe("Order");
    expect(machine.stateField).toBe("status");
    expect(machine.tenantExtensible).toBe(true);
    expect(machine.transitions).toHaveLength(3);
  });

  it("keeps initial and terminal states within the state set", () => {
    const machine: StateMachineDefinition = {
      model: "Invoice",
      stateField: "state",
      states: ["open", "closed"],
      initialState: "open",
      terminalStates: ["closed"],
      transitions: [{ from: "open", event: "close", to: "closed" }],
      tenantExtensible: false,
    };
    const stateSet = new Set(machine.states);
    expect(stateSet.has(machine.initialState)).toBe(true);
    for (const terminalState of machine.terminalStates) {
      expect(stateSet.has(terminalState)).toBe(true);
    }
  });

  it("requires transitions to reference known states", () => {
    const machine: StateMachineDefinition = {
      model: "Task",
      stateField: "status",
      states: ["idle", "running"],
      initialState: "idle",
      terminalStates: ["running"],
      transitions: [{ from: "idle", event: "start", to: "running" }],
      tenantExtensible: false,
    };
    const stateSet = new Set(machine.states);
    for (const transition of machine.transitions) {
      expect(stateSet.has(transition.from)).toBe(true);
      expect(stateSet.has(transition.to)).toBe(true);
    }
  });
});

describe("TransitionResult — structural contract", () => {
  it("represents a successful transition", () => {
    const result: TransitionResult = {
      success: true,
      from: "draft",
      to: "review",
      event: "submit",
      guardViolations: [],
      emittedEvents: [],
    };
    expect(result.success).toBe(true);
    expect(result.from).toBe("draft");
    expect(result.to).toBe("review");
  });

  it("represents a blocked transition", () => {
    const result: TransitionResult = {
      success: false,
      from: "review",
      to: null,
      event: "approve",
      guardViolations: ["isManager check failed"],
      emittedEvents: [],
    };
    expect(result.success).toBe(false);
    expect(result.to).toBeNull();
    expect(result.guardViolations).toContain("isManager check failed");
  });

  it("tracks emitted events", () => {
    const result: TransitionResult = {
      success: true,
      from: "review",
      to: "approved",
      event: "approve",
      guardViolations: [],
      emittedEvents: ["approval.granted", "audit.updated"],
    };
    expect(result.emittedEvents).toContain("approval.granted");
    expect(result.emittedEvents).toContain("audit.updated");
  });
});

describe("State and TransitionEvent aliases", () => {
  it("accepts string values as State", () => {
    const state: State = "active";
    expect(typeof state).toBe("string");
  });

  it("accepts string values as TransitionEvent", () => {
    const event: TransitionEvent = "submit";
    expect(typeof event).toBe("string");
  });
});
