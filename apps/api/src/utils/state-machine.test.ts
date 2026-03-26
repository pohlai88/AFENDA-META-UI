import { describe, expect, it } from "vitest";
import { StateMachine, StateMachineError, type TransitionRule } from "./state-machine.js";

describe("StateMachine", () => {
  describe("basic transitions", () => {
    const rules: TransitionRule[] = [
      { from: "draft", to: "submitted" },
      { from: "submitted", to: "confirmed" },
      { from: "confirmed", to: "invoiced" },
    ];

    const machine = new StateMachine(rules);

    it("allows valid transitions", () => {
      expect(machine.canTransition("draft", "submitted")).toBe(true);
      expect(machine.canTransition("submitted", "confirmed")).toBe(true);
      expect(machine.canTransition("confirmed", "invoiced")).toBe(true);
    });

    it("rejects invalid transitions", () => {
      expect(machine.canTransition("draft", "confirmed")).toBe(false);
      expect(machine.canTransition("draft", "invoiced")).toBe(false);
      expect(machine.canTransition("invoiced", "draft")).toBe(false);
    });

    it("assertTransition passes for valid transitions", () => {
      expect(() => machine.assertTransition("draft", "submitted")).not.toThrow();
    });

    it("assertTransition throws for invalid transitions", () => {
      expect(() => machine.assertTransition("draft", "confirmed")).toThrow(
        StateMachineError
      );
      expect(() => machine.assertTransition("draft", "confirmed")).toThrow(
        "Invalid state transition: 'draft' → 'confirmed'"
      );
    });
  });

  describe("guarded transitions", () => {
    const rules: TransitionRule[] = [
      { from: "draft", to: "submitted" },
      {
        from: "submitted",
        to: "confirmed",
        guard: (ctx) => ctx.valid === true,
      },
      {
        from: "confirmed",
        to: "invoiced",
        guard: (ctx) => ctx.agreementActive === true && ctx.valid === true,
      },
    ];

    const machine = new StateMachine(rules);

    it("allows transitions when guards pass", () => {
      expect(machine.canTransition("submitted", "confirmed", { valid: true })).toBe(
        true
      );
      expect(
        machine.canTransition("confirmed", "invoiced", {
          agreementActive: true,
          valid: true,
        })
      ).toBe(true);
    });

    it("rejects transitions when guards fail", () => {
      expect(machine.canTransition("submitted", "confirmed", { valid: false })).toBe(
        false
      );
      expect(machine.canTransition("submitted", "confirmed", {})).toBe(false);
      expect(
        machine.canTransition("confirmed", "invoiced", {
          agreementActive: false,
          valid: true,
        })
      ).toBe(false);
    });

    it("assertTransition throws when guard fails", () => {
      expect(() =>
        machine.assertTransition("submitted", "confirmed", { valid: false })
      ).toThrow(StateMachineError);
      expect(() =>
        machine.assertTransition("submitted", "confirmed", { valid: false })
      ).toThrow("guard condition failed");
    });
  });

  describe("getValidTransitions", () => {
    const rules: TransitionRule[] = [
      { from: "draft", to: "submitted" },
      { from: "draft", to: "cancelled" },
      {
        from: "submitted",
        to: "confirmed",
        guard: (ctx) => ctx.valid === true,
      },
      { from: "submitted", to: "cancelled" },
    ];

    const machine = new StateMachine(rules);

    it("returns all valid next states without guards", () => {
      const next = machine.getValidTransitions("draft");
      expect(next).toHaveLength(2);
      expect(next).toContain("submitted");
      expect(next).toContain("cancelled");
    });

    it("filters by guard conditions", () => {
      const validNext = machine.getValidTransitions("submitted", { valid: true });
      expect(validNext).toHaveLength(2);
      expect(validNext).toContain("confirmed");
      expect(validNext).toContain("cancelled");

      const invalidNext = machine.getValidTransitions("submitted", { valid: false });
      expect(invalidNext).toHaveLength(1);
      expect(invalidNext).toContain("cancelled");
    });
  });

  describe("getRules", () => {
    const rules: TransitionRule[] = [
      { from: "draft", to: "submitted" },
      { from: "submitted", to: "confirmed" },
    ];

    const machine = new StateMachine(rules);

    it("returns all rules", () => {
      const retrievedRules = machine.getRules();
      expect(retrievedRules).toHaveLength(2);
      expect(retrievedRules[0]).toEqual(rules[0]);
      expect(retrievedRules[1]).toEqual(rules[1]);
    });
  });
});
