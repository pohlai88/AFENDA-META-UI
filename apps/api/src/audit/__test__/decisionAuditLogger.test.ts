/**
 * Decision Audit Logger Tests
 * ============================
 * Test suite for Phase 4 decision audit fabric
 *
 * Validates:
 * - Audit entry logging and retrieval
 * - Decision chain tracking
 * - Query filtering
 * - Analytics and insights
 * - Compliance verification
 * - Performance metrics
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import type { DecisionAuditEntry } from "@afenda/meta-types/audit";
import {
  logDecisionAudit,
  logDecisionAuditBatch,
  linkToChain,
  queryDecisionAuditLog,
  getDecisionChain,
  getDecisionsForScope,
  getDecisionStats,
  getSlowDecisions,
  getAuditFailures,
  getUserAuditTrail,
  verifyDecisionCompliance,
  clearDecisionAuditLog,
  getDecisionAuditStoreSize,
  pruneOldDecisions,
} from "../decisionAuditLogger.js";

describe("Decision Audit Logger", () => {
  beforeEach(() => {
    clearDecisionAuditLog();
  });

  afterEach(() => {
    clearDecisionAuditLog();
  });

  // ---------------------------------------------------------------------------
  // Basic Logging
  // ---------------------------------------------------------------------------

  describe("logDecisionAudit", () => {
    it("logs a single decision entry", () => {
      const entry: DecisionAuditEntry = {
        id: "audit-1",
        timestamp: new Date().toISOString(),
        tenantId: "tenant-1",
        userId: "user-1",
        eventType: "metadata_resolved",
        scope: "invoice.metadata_resolved",
        context: { model: "invoice" },
        decision: {
          input: { model: "invoice" },
          output: { resolved: true },
          appliedLayers: ["global", "tenant:tenant-1"],
        },
        durationMs: 10,
        status: "success",
      };

      logDecisionAudit(entry);
      expect(getDecisionAuditStoreSize()).toBe(1);

      const entries = queryDecisionAuditLog({
        tenantId: "tenant-1",
      });
      expect(entries).toHaveLength(1);
      expect(entries[0].id).toBe("audit-1");
    });

    it("logs multiple entries in batch", () => {
      const entries: DecisionAuditEntry[] = [
        {
          id: "audit-1",
          timestamp: new Date().toISOString(),
          tenantId: "tenant-1",
          userId: "user-1",
          eventType: "metadata_resolved",
          scope: "invoice.metadata_resolved",
          context: { model: "invoice" },
          decision: { input: {}, output: {}, appliedLayers: ["global"] },
          durationMs: 10,
          status: "success",
        },
        {
          id: "audit-2",
          timestamp: new Date().toISOString(),
          tenantId: "tenant-1",
          userId: "user-1",
          eventType: "rule_evaluated",
          scope: "invoice.rules.tax",
          context: { model: "invoice", ruleId: "tax-rule-1" },
          decision: { input: {}, output: { passed: true } },
          durationMs: 5,
          status: "success",
        },
      ];

      logDecisionAuditBatch(entries);
      expect(getDecisionAuditStoreSize()).toBe(2);
    });
  });

  // ---------------------------------------------------------------------------
  // Query Operations
  // ---------------------------------------------------------------------------

  describe("queryDecisionAuditLog", () => {
    beforeEach(() => {
      const now = new Date().toISOString();
      const entries: DecisionAuditEntry[] = [
        {
          id: "audit-1",
          timestamp: now,
          tenantId: "acme-corp",
          userId: "alice",
          eventType: "metadata_resolved",
          scope: "invoice.metadata_resolved",
          context: { model: "invoice" },
          decision: { input: {}, output: {} },
          durationMs: 15,
          status: "success",
        },
        {
          id: "audit-2",
          timestamp: now,
          tenantId: "acme-corp",
          userId: "bob",
          eventType: "rule_evaluated",
          scope: "invoice.rules.tax",
          context: { model: "invoice", ruleId: "tax-1" },
          decision: { input: {}, output: { passed: true } },
          durationMs: 5,
          status: "success",
        },
        {
          id: "audit-3",
          timestamp: now,
          tenantId: "acme-corp",
          userId: "alice",
          eventType: "policy_enforced",
          scope: "invoice.policies.amount_limit",
          context: { model: "invoice", policyId: "limit-1" },
          decision: { input: {}, output: { violations: [] } },
          durationMs: 8,
          status: "success",
        },
      ];

      logDecisionAuditBatch(entries);
    });

    it("queries by tenant", () => {
      const entries = queryDecisionAuditLog({ tenantId: "acme-corp" });
      expect(entries).toHaveLength(3);
    });

    it("filters by event type", () => {
      const entries = queryDecisionAuditLog({
        tenantId: "acme-corp",
        eventType: "rule_evaluated",
      });
      expect(entries).toHaveLength(1);
      expect(entries[0].eventType).toBe("rule_evaluated");
    });

    it("filters by scope (wildcard)", () => {
      const entries = queryDecisionAuditLog({
        tenantId: "acme-corp",
        scope: "invoice.*",
      });
      expect(entries).toHaveLength(3);
    });

    it("filters by scope (specific)", () => {
      const entries = queryDecisionAuditLog({
        tenantId: "acme-corp",
        scope: "invoice.rules.tax",
      });
      expect(entries).toHaveLength(1);
    });

    it("filters by user", () => {
      const entries = queryDecisionAuditLog({
        tenantId: "acme-corp",
        userId: "alice",
      });
      expect(entries).toHaveLength(2);
    });

    it("returns newest first", () => {
      const old = new Date(Date.now() - 1000).toISOString();
      const _newer = new Date().toISOString();

      logDecisionAudit({
        id: "old-audit",
        timestamp: old,
        tenantId: "acme-corp",
        eventType: "metadata_resolved",
        scope: "invoice.metadata_resolved",
        context: {},
        decision: { input: {}, output: {} },
        durationMs: 1,
        status: "success",
      });

      const entries = queryDecisionAuditLog({ tenantId: "acme-corp" });
      expect(entries[0].timestamp.localeCompare(entries[1].timestamp)).toBeGreaterThanOrEqual(0);
    });

    it("applies pagination", () => {
      const entries = queryDecisionAuditLog({
        tenantId: "acme-corp",
        limit: 2,
        offset: 0,
      });
      expect(entries.length).toBeLessThanOrEqual(2);
    });
  });

  // ---------------------------------------------------------------------------
  // Decision Chains
  // ---------------------------------------------------------------------------

  describe("Decision Chains", () => {
    it("links entries to a chain", () => {
      const chainId = "req-12345";

      const entry1: DecisionAuditEntry = {
        id: "e1",
        timestamp: new Date().toISOString(),
        tenantId: "acme-corp",
        eventType: "metadata_resolved",
        scope: "invoice.metadata_resolved",
        context: { model: "invoice" },
        decision: { input: {}, output: {} },
        durationMs: 10,
        status: "success",
      };

      const entry2: DecisionAuditEntry = {
        id: "e2",
        timestamp: new Date().toISOString(),
        tenantId: "acme-corp",
        eventType: "rule_evaluated",
        scope: "invoice.rules.tax",
        context: { model: "invoice", ruleId: "tax-1" },
        decision: { input: {}, output: {} },
        durationMs: 5,
        status: "success",
      };

      linkToChain(chainId, entry1);
      linkToChain(chainId, entry2);

      const chain = getDecisionChain(chainId);
      expect(chain).not.toBeNull();
      expect(chain?.entries).toHaveLength(2);
      expect(chain?.totalDurationMs).toBe(15);
    });

    it("returns null for non-existent chain", () => {
      const chain = getDecisionChain("non-existent");
      expect(chain).toBeNull();
    });
  });

  // ---------------------------------------------------------------------------
  // Scope Queries
  // ---------------------------------------------------------------------------

  describe("getDecisionsForScope", () => {
    beforeEach(() => {
      const now = new Date().toISOString();
      logDecisionAuditBatch([
        {
          id: "a1",
          timestamp: now,
          tenantId: "acme",
          eventType: "metadata_resolved",
          scope: "invoice.metadata_resolved",
          context: { model: "invoice" },
          decision: { input: {}, output: {} },
          durationMs: 10,
          status: "success",
        },
        {
          id: "a2",
          timestamp: now,
          tenantId: "acme",
          eventType: "metadata_resolved",
          scope: "order.metadata_resolved",
          context: { model: "order" },
          decision: { input: {}, output: {} },
          durationMs: 8,
          status: "success",
        },
        {
          id: "a3",
          timestamp: now,
          tenantId: "acme",
          eventType: "rule_evaluated",
          scope: "invoice.rules.tax",
          context: {},
          decision: { input: {}, output: {} },
          durationMs: 5,
          status: "success",
        },
      ]);
    });

    it("gets decisions for specific scope", () => {
      const decisions = getDecisionsForScope("acme", "invoice");
      expect(decisions).toHaveLength(2);
      expect(decisions.every((d) => d.scope.startsWith("invoice"))).toBe(true);
    });

    it("filters by event type within scope", () => {
      const decisions = getDecisionsForScope("acme", "invoice", "rule_evaluated");
      expect(decisions).toHaveLength(1);
      expect(decisions[0].eventType).toBe("rule_evaluated");
    });
  });

  // ---------------------------------------------------------------------------
  // Analytics
  // ---------------------------------------------------------------------------

  describe("Analytics", () => {
    beforeEach(() => {
      const now = new Date();
      const entries: DecisionAuditEntry[] = [];

      // Create 10 metadata resolution entries
      for (let i = 0; i < 10; i++) {
        entries.push({
          id: `audit-${i}`,
          timestamp: now.toISOString(),
          tenantId: "acme",
          eventType: "metadata_resolved",
          scope: "invoice.metadata_resolved",
          context: { model: "invoice" },
          decision: { input: {}, output: {} },
          durationMs: 10 + i, // 10-19ms
          status: i < 8 ? "success" : "error",
        });
      }

      logDecisionAuditBatch(entries);
    });

    it("calculates decision stats", () => {
      const stats = getDecisionStats("acme", "metadata_resolved", 3600000);
      expect(stats.count).toBe(10);
      expect(stats.avgDurationMs).toBeGreaterThan(0);
      expect(stats.minDurationMs).toBeLessThanOrEqual(stats.avgDurationMs);
      expect(stats.maxDurationMs).toBeGreaterThanOrEqual(stats.avgDurationMs);
      expect(stats.errorRate).toBe(0.2); // 2/10
    });

    it("identifies slow decisions", () => {
      const slow = getSlowDecisions("acme", 15, 5);
      expect(slow.length).toBeGreaterThan(0);
      expect(slow.every((d) => d.durationMs > 15)).toBe(true);
    });

    it("identifies audit failures", () => {
      const failures = getAuditFailures("acme");
      expect(failures.length).toBeGreaterThan(0);
      expect(failures.some((f) => f.status === "error")).toBe(true);
    });
  });

  // ---------------------------------------------------------------------------
  // Compliance
  // ---------------------------------------------------------------------------

  describe("Compliance", () => {
    it("verifies decision compliance with layers", () => {
      const entry: DecisionAuditEntry = {
        id: "a1",
        timestamp: new Date().toISOString(),
        tenantId: "acme",
        eventType: "metadata_resolved",
        scope: "invoice.metadata_resolved",
        context: {},
        decision: {
          input: {},
          output: {},
          appliedLayers: ["global", "tenant:acme", "department:finance"],
        },
        durationMs: 10,
        status: "success",
      };

      expect(verifyDecisionCompliance(entry, ["global", "tenant:acme"])).toBe(true);

      expect(verifyDecisionCompliance(entry, ["global", "user:alice"])).toBe(false);
    });

    it("gets user audit trail for compliance", () => {
      const now = new Date().toISOString();
      logDecisionAuditBatch([
        {
          id: "a1",
          timestamp: now,
          tenantId: "acme",
          userId: "alice",
          eventType: "metadata_resolved",
          scope: "invoice.metadata_resolved",
          context: {},
          decision: { input: {}, output: {} },
          durationMs: 10,
          status: "success",
        },
        {
          id: "a2",
          timestamp: now,
          tenantId: "acme",
          userId: "alice",
          eventType: "rule_evaluated",
          scope: "invoice.rules",
          context: {},
          decision: { input: {}, output: {} },
          durationMs: 5,
          status: "success",
        },
        {
          id: "a3",
          timestamp: now,
          tenantId: "acme",
          userId: "bob",
          eventType: "metadata_resolved",
          scope: "order.metadata_resolved",
          context: {},
          decision: { input: {}, output: {} },
          durationMs: 8,
          status: "success",
        },
      ]);

      const trail = getUserAuditTrail("acme", "alice");
      expect(trail).toHaveLength(2);
      expect(trail.every((t) => t.userId === "alice")).toBe(true);
    });
  });

  // ---------------------------------------------------------------------------
  // Maintenance
  // ---------------------------------------------------------------------------

  describe("Maintenance", () => {
    it("prunes old decisions", () => {
      const old = new Date(Date.now() - 100000).toISOString();
      const newer = new Date().toISOString();

      logDecisionAuditBatch([
        {
          id: "old",
          timestamp: old,
          tenantId: "acme",
          eventType: "metadata_resolved",
          scope: "invoice.metadata_resolved",
          context: {},
          decision: { input: {}, output: {} },
          durationMs: 10,
          status: "success",
        },
        {
          id: "new",
          timestamp: newer,
          tenantId: "acme",
          eventType: "metadata_resolved",
          scope: "invoice.metadata_resolved",
          context: {},
          decision: { input: {}, output: {} },
          durationMs: 10,
          status: "success",
        },
      ]);

      const pruned = pruneOldDecisions(50000); // Delete entries older than 50 seconds
      expect(pruned).toBe(1);
      expect(getDecisionAuditStoreSize()).toBe(1);
    });

    it("clears audit log", () => {
      logDecisionAudit({
        id: "a1",
        timestamp: new Date().toISOString(),
        tenantId: "acme",
        eventType: "metadata_resolved",
        scope: "invoice.metadata_resolved",
        context: {},
        decision: { input: {}, output: {} },
        durationMs: 10,
        status: "success",
      });

      expect(getDecisionAuditStoreSize()).toBe(1);
      clearDecisionAuditLog();
      expect(getDecisionAuditStoreSize()).toBe(0);
    });
  });
});
