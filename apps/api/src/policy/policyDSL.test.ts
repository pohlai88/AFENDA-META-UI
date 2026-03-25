import { describe, it, expect } from "vitest";
import { evaluateExpression, evaluateCondition } from "./policyDSL.js";

describe("policyDSL", () => {
  describe("evaluateExpression", () => {
    it("evaluates arithmetic", () => {
      const result = evaluateExpression("price * qty", { price: 10, qty: 5 });
      expect(result.value).toBe(50);
      expect(result.error).toBeUndefined();
    });

    it("evaluates string comparison", () => {
      const result = evaluateExpression('status == "posted"', { status: "posted" });
      expect(result.value).toBeTruthy();
    });

    it("evaluates numeric comparison", () => {
      const result = evaluateExpression("age >= 18", { age: 21 });
      expect(result.value).toBeTruthy();
    });

    it("returns error for invalid expressions", () => {
      const result = evaluateExpression("!!!invalid", {});
      expect(result.error).toBeDefined();
    });

    it("supports built-in sum function", () => {
      const result = evaluateExpression("sum(amounts)", {
        amounts: [100, 200, 300],
      });
      expect(result.value).toBe(600);
    });

    it("supports built-in abs function", () => {
      const result = evaluateExpression("abs(balance)", { balance: -42 });
      expect(result.value).toBe(42);
    });

    it("supports built-in len function", () => {
      const result = evaluateExpression("len(items)", {
        items: [1, 2, 3],
      });
      expect(result.value).toBe(3);
    });

    it("supports built-in round function", () => {
      const result = evaluateExpression("round(price, 2)", { price: 10.456 });
      expect(result.value).toBe(10.46);
    });

    it("supports logical operators", () => {
      const result = evaluateExpression(
        'status == "active" and balance > 0',
        { status: "active", balance: 100 }
      );
      expect(result.value).toBeTruthy();
    });
  });

  describe("evaluateCondition", () => {
    it("returns true for truthy expression results", () => {
      expect(evaluateCondition("1 == 1", {}).result).toBe(true);
    });

    it("returns false for falsy expression results", () => {
      expect(evaluateCondition("1 == 2", {}).result).toBe(false);
    });

    it("returns false with error for invalid expressions", () => {
      const result = evaluateCondition("!!!bad", {});
      expect(result.result).toBe(false);
      expect(result.error).toBeDefined();
    });
  });
});
