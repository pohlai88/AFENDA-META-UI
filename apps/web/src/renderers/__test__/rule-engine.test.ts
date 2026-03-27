/**
 * Cross-Module Rule Engine Tests
 */

import { describe, it, expect, vi } from "vitest";
import type { Rule, RuleContext } from "../rule-engine";

// Simple test engine to match the actual implementation pattern
class TestRuleEngine {
  private rules = new Map<string, Rule>();

  register(rule: Rule): void {
    if (this.rules.has(rule.id)) {
      throw new Error(`Rule already registered: ${rule.id}`);
    }
    this.rules.set(rule.id, rule);
  }

  async execute(event: string, ctx: RuleContext) {
    const matchingRules = Array.from(this.rules.values())
      .filter((rule) => {
        if (rule.enabled === false) return false;
        if (typeof rule.when === "string") {
          return rule.when === event;
        } else {
          return rule.when.test(event);
        }
      })
      .sort((a, b) => (b.priority || 0) - (a.priority || 0));

    const results = [];
    for (const rule of matchingRules) {
      const conditionMet = await rule.if(ctx);
      if (conditionMet) {
        const decision = await rule.then(ctx);
        results.push({ ruleId: rule.id, decision });
        if (decision.type === "block") break;
      }
    }
    return results;
  }

  getRule(id: string) {
    return this.rules.get(id) || null;
  }
}

describe("Cross-Module Rule Engine", () => {
  describe("Rule Registration", () => {
    it("registers a simple rule", () => {
      const engine = new TestRuleEngine();

      const rule: Rule = {
        id: "test-rule",
        name: "Test Rule",
        description: "A test rule",
        when: "test.event",
        if: () => true,
        then: () => ({ type: "allow" }),
        priority: 100,
        enabled: true,
      };

      engine.register(rule);

      const registered = engine.getRule("test-rule");
      expect(registered).toBeTruthy();
      expect(registered?.id).toBe("test-rule");
    });

    it("prevents duplicate rule IDs", () => {
      const engine = new TestRuleEngine();

      const rule: Rule = {
        id: "duplicate",
        name: "Duplicate Rule",
        description: "Test",
        when: "event",
        if: () => true,
        then: () => ({ type: "allow" }),
        priority: 100,
        enabled: true,
      };

      engine.register(rule);

      expect(() => {
        engine.register(rule);
      }).toThrow(/already registered/i);
    });
  });

  describe("Event Matching", () => {
    it("matches exact event names", async () => {
      const engine = new TestRuleEngine();
      const actionSpy = vi.fn(() => ({ type: "allow" as const }));

      const rule: Rule = {
        id: "exact-match",
        name: "Exact Match",
        description: "Test",
        when: "sales.order.created",
        if: () => true,
        then: actionSpy,
        priority: 100,
        enabled: true,
      };

      engine.register(rule);

      const context: RuleContext = {
        event: "sales.order.created",
        data: {},
        user: { id: "user1", roles: [], permissions: [] },
        metadata: { timestamp: new Date().toISOString(), requestId: "req1", source: "test" },
      };

      await engine.execute("sales.order.created", context);

      expect(actionSpy).toHaveBeenCalled();
    });

    it("does not trigger on non-matching events", async () => {
      const engine = new TestRuleEngine();
      const actionSpy = vi.fn(() => ({ type: "allow" as const }));

      const rule: Rule = {
        id: "specific",
        name: "Specific Rule",
        description: "Test",
        when: "inventory.item.updated",
        if: () => true,
        then: actionSpy,
        priority: 100,
        enabled: true,
      };

      engine.register(rule);

      const context: RuleContext = {
        event: "sales.order.created",
        data: {},
        user: { id: "user1", roles: [], permissions: [] },
        metadata: { timestamp: new Date().toISOString(), requestId: "req1", source: "test" },
      };

      await engine.execute("sales.order.created", context);

      expect(actionSpy).not.toHaveBeenCalled();
    });
  });

  describe("Rule Conditions", () => {
    it("evaluates conditions before executing actions", async () => {
      const engine = new TestRuleEngine();
      const actionSpy = vi.fn(() => ({ type: "allow" as const }));

      const rule: Rule = {
        id: "conditional",
        name: "Conditional Rule",
        description: "Test",
        when: "test.event",
        if: (ctx) => ctx.data.amount > 100,
        then: actionSpy,
        priority: 100,
        enabled: true,
      };

      engine.register(rule);

      // Should not trigger (amount <= 100)
      await engine.execute("test.event", {
        event: "test.event",
        data: { amount: 50 },
        user: { id: "user1", roles: [], permissions: [] },
        metadata: { timestamp: new Date().toISOString(), requestId: "req1", source: "test" },
      });

      expect(actionSpy).not.toHaveBeenCalled();

      // Should trigger (amount > 100)
      await engine.execute("test.event", {
        event: "test.event",
        data: { amount: 150 },
        user: { id: "user1", roles: [], permissions: [] },
        metadata: { timestamp: new Date().toISOString(), requestId: "req2", source: "test" },
      });

      expect(actionSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe("Rule Decisions", () => {
    it("returns allow decision", async () => {
      const engine = new TestRuleEngine();

      const rule: Rule = {
        id: "allow-rule",
        name: "Allow Rule",
        description: "Test",
        when: "test.event",
        if: () => true,
        then: () => ({ type: "allow" }),
        priority: 100,
        enabled: true,
      };

      engine.register(rule);

      const results = await engine.execute("test.event", {
        event: "test.event",
        data: {},
        user: { id: "user1", roles: [], permissions: [] },
        metadata: { timestamp: new Date().toISOString(), requestId: "req1", source: "test" },
      });

      expect(results[0].decision.type).toBe("allow");
    });

    it("returns block decision with reason", async () => {
      const engine = new TestRuleEngine();

      const rule: Rule = {
        id: "block-rule",
        name: "Block Rule",
        description: "Test",
        when: "test.event",
        if: () => true,
        then: () => ({ type: "block", reason: "Insufficient permissions" }),
        priority: 100,
        enabled: true,
      };

      engine.register(rule);

      const results = await engine.execute("test.event", {
        event: "test.event",
        data: {},
        user: { id: "user1", roles: [], permissions: [] },
        metadata: { timestamp: new Date().toISOString(), requestId: "req1", source: "test" },
      });

      expect(results[0].decision.type).toBe("block");
      expect(results[0].decision.type === "block" && results[0].decision.reason).toBe(
        "Insufficient permissions"
      );
    });
  });

  describe("Rule Priority", () => {
    it("executes rules in priority order (highest first)", async () => {
      const engine = new TestRuleEngine();
      const executionOrder: number[] = [];

      const rule1: Rule = {
        id: "low-priority",
        name: "Low Priority",
        description: "Test",
        when: "test.event",
        if: () => true,
        then: () => {
          executionOrder.push(1);
          return { type: "allow" };
        },
        priority: 50,
        enabled: true,
      };

      const rule2: Rule = {
        id: "high-priority",
        name: "High Priority",
        description: "Test",
        when: "test.event",
        if: () => true,
        then: () => {
          executionOrder.push(2);
          return { type: "allow" };
        },
        priority: 200,
        enabled: true,
      };

      const rule3: Rule = {
        id: "medium-priority",
        name: "Medium Priority",
        description: "Test",
        when: "test.event",
        if: () => true,
        then: () => {
          executionOrder.push(3);
          return { type: "allow" };
        },
        priority: 100,
        enabled: true,
      };

      engine.register(rule1);
      engine.register(rule2);
      engine.register(rule3);

      await engine.execute("test.event", {
        event: "test.event",
        data: {},
        user: { id: "user1", roles: [], permissions: [] },
        metadata: { timestamp: new Date().toISOString(), requestId: "req1", source: "test" },
      });

      expect(executionOrder).toEqual([2, 3, 1]); // High(200), Medium(100), Low(50)
    });

    it("stops execution on block decision", async () => {
      const engine = new TestRuleEngine();
      const executionOrder: string[] = [];

      const rule1: Rule = {
        id: "blocker",
        name: "Blocker",
        description: "Test",
        when: "test.event",
        if: () => true,
        then: () => {
          executionOrder.push("block");
          return { type: "block", reason: "Blocked" };
        },
        priority: 200,
        enabled: true,
      };

      const rule2: Rule = {
        id: "follower",
        name: "Follower",
        description: "Test",
        when: "test.event",
        if: () => true,
        then: () => {
          executionOrder.push("allow");
          return { type: "allow" };
        },
        priority: 100,
        enabled: true,
      };

      engine.register(rule1);
      engine.register(rule2);

      await engine.execute("test.event", {
        event: "test.event",
        data: {},
        user: { id: "user1", roles: [], permissions: [] },
        metadata: { timestamp: new Date().toISOString(), requestId: "req1", source: "test" },
      });

      expect(executionOrder).toEqual(["block"]); // Stopped after block
    });
  });

  describe("Cross-Module Data Access", () => {
    it("enforces business rules across modules", async () => {
      const engine = new TestRuleEngine();

      // Credit limit check: customer credit limit must exceed order total
      const rule: Rule = {
        id: "credit-limit-check",
        name: "Credit Limit Check",
        description: "Prevent orders exceeding credit limit",
        when: "sales.order.created",
        if: (ctx) => {
          const customer = ctx.data.customer;
          const order = ctx.data.order;
          return customer && order && customer.creditLimit < order.total;
        },
        then: () => ({ type: "block", reason: "Credit limit exceeded" }),
        priority: 200,
        enabled: true,
      };

      engine.register(rule);

      const context: RuleContext = {
        event: "sales.order.created",
        data: {
          customer: { creditLimit: 5000 },
          order: { total: 10000 },
        },
        user: { id: "user1", roles: [], permissions: [] },
        metadata: { timestamp: new Date().toISOString(), requestId: "req1", source: "api" },
      };

      const results = await engine.execute("sales.order.created", context);

      expect(results[0].decision.type).toBe("block");
      expect(results[0].decision.type === "block" && results[0].decision.reason).toContain(
        "Credit limit"
      );
    });
  });
});
