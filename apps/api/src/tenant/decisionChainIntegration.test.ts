import { randomUUID } from "crypto";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type {
  DecisionAuditEntry,
  ModelMeta,
  PolicyContext,
  PolicyDefinition,
  ResolutionContext,
} from "@afenda/meta-types";
import {
  clearDecisionAuditLog,
  getDecisionChain,
  getDecisionStats,
  getUserAuditTrail,
  linkToChain,
  logDecisionAudit,
  queryDecisionAuditLog,
} from "../audit/decisionAuditLogger.js";
import { clearPolicies, registerPolicy } from "../policy/policyRegistry.js";
import { evaluatePoliciesWithTenantContext } from "../policy/policyEvaluator.js";
import { clearRules, evaluateRule } from "../rules/index.js";
import type { RuleDefinition, RuleExecutionContext } from "../rules/index.js";
import { resolveMetadata } from "./index.js";

const globalMeta: Record<string, ModelMeta> = {
  finance: {
    model: "finance",
    label: "Finance",
    fields: [
      {
        name: "amount",
        label: "Amount",
        type: "currency",
        required: true,
        audit: { trackChanges: true, sensitivityLevel: "high" },
      },
      {
        name: "vendor",
        label: "Vendor",
        type: "string",
        required: true,
        audit: { trackChanges: true, sensitivityLevel: "medium" },
      },
    ],
    views: {},
    actions: [],
  },
};

const tenantContext: ResolutionContext = {
  tenantId: "tenant-e2e-001",
  userId: "user-e2e-001",
  departmentId: "dept-e2e-001",
  industry: "finance",
};

const policyContext: PolicyContext = {
  model: "finance",
  record: {
    amount: 5000,
    vendor: "ACME Corp",
  },
  actor: {
    uid: "user-e2e-001",
    roles: ["admin"],
  },
  operation: "validate",
};

const tenantPolicy: PolicyDefinition = {
  id: "finance-policy-amount-positive",
  name: "Amount must be positive",
  scope: "finance",
  validate: "amount > 0",
  message: "Amount must be positive",
  severity: "error",
};

const computeRule: RuleDefinition = {
  id: "finance-rule-tax",
  name: "Calculate tax",
  scope: "finance",
  category: "compute",
  expression: "amount * 0.1",
};

function buildRuleContext(
  record: Record<string, unknown> = policyContext.record,
): RuleExecutionContext {
  return {
    record,
    actor: policyContext.actor,
    relatedRecords: {},
    tenantContext,
    metadata: {},
  };
}

describe("Decision Chain Integration", () => {
  beforeEach(() => {
    clearDecisionAuditLog();
    clearPolicies();
    clearRules();
    registerPolicy(tenantPolicy);
  });

  afterEach(() => {
    clearDecisionAuditLog();
    clearPolicies();
    clearRules();
  });

  it("captures metadata, rule, and policy decisions for one request flow", () => {
    const failingPolicyContext: PolicyContext = {
      ...policyContext,
      record: {
        amount: -1,
        vendor: "ACME Corp",
      },
    };

    const metadata = resolveMetadata("finance", globalMeta, tenantContext);
    const ruleResult = evaluateRule(
      computeRule,
      buildRuleContext(failingPolicyContext.record),
      globalMeta,
    );
    const policyResult = evaluatePoliciesWithTenantContext(
      failingPolicyContext,
      tenantContext,
      globalMeta,
      "finance",
    );

    expect(metadata).toBeDefined();
    expect(ruleResult.ruleId).toBe(computeRule.id);
    expect(policyResult.passed).toBe(false);
    expect(policyResult.errors.length).toBeGreaterThan(0);

    const decisions = queryDecisionAuditLog({
      tenantId: tenantContext.tenantId,
      limit: 20,
    });

    expect(decisions.length).toBeGreaterThanOrEqual(3);
    expect(decisions.some((entry) => entry.eventType === "metadata_resolved")).toBe(true);
    expect(decisions.some((entry) => entry.eventType === "rule_evaluated")).toBe(true);
    expect(decisions.some((entry) => entry.eventType === "policy_enforced")).toBe(true);
  });

  it("supports explicit decision chains across linked entries", () => {
    const chainId = randomUUID();

    const root: DecisionAuditEntry = {
      id: randomUUID(),
      timestamp: new Date().toISOString(),
      tenantId: tenantContext.tenantId,
      userId: tenantContext.userId,
      eventType: "metadata_resolved",
      scope: "finance.request.start",
      context: { model: "finance" },
      decision: {
        input: { requestId: chainId },
        output: { started: true },
      },
      durationMs: 1,
      status: "success",
    };

    const child: DecisionAuditEntry = {
      id: randomUUID(),
      timestamp: new Date(Date.now() + 1).toISOString(),
      tenantId: tenantContext.tenantId,
      userId: tenantContext.userId,
      eventType: "rule_evaluated",
      scope: "finance.rule.tax",
      context: { model: "finance", ruleId: computeRule.id },
      decision: {
        input: { ruleId: computeRule.id },
        output: { passed: true, value: 500 },
      },
      durationMs: 0.5,
      status: "success",
    };

    linkToChain(chainId, root);
    linkToChain(chainId, child);

    const chain = getDecisionChain(chainId);
    expect(chain).not.toBeNull();
    expect(chain?.entries).toHaveLength(2);
    expect(chain?.totalDurationMs).toBeCloseTo(1.5, 3);
  });

  it("supports scope queries and user audit trails for debugging", () => {
    resolveMetadata("finance", globalMeta, tenantContext);
    evaluateRule(computeRule, buildRuleContext(), globalMeta);
    evaluatePoliciesWithTenantContext(
      policyContext,
      tenantContext,
      globalMeta,
      "finance",
    );

    const scopeEntries = queryDecisionAuditLog({
      tenantId: tenantContext.tenantId,
      scope: "finance*",
      limit: 20,
    });
    const userTrail = getUserAuditTrail(
      tenantContext.tenantId,
      tenantContext.userId ?? "",
    );

    expect(scopeEntries.length).toBeGreaterThan(0);
    expect(userTrail.length).toBeGreaterThan(0);
    expect(scopeEntries.every((entry) => entry.scope.startsWith("finance"))).toBe(true);
    expect(userTrail.every((entry) => entry.userId === tenantContext.userId)).toBe(true);
  });

  it("captures failed policy decisions for diagnostics", () => {
    const failingContext: PolicyContext = {
      ...policyContext,
      record: {
        amount: -1,
        vendor: "ACME Corp",
      },
    };

    const result = evaluatePoliciesWithTenantContext(
      failingContext,
      tenantContext,
      globalMeta,
      "finance",
    );

    const failures = queryDecisionAuditLog({
      tenantId: tenantContext.tenantId,
      eventType: "policy_enforced",
      limit: 20,
    }).filter((entry) => entry.decision.violations && entry.decision.violations.length > 0);

    expect(result.passed).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(failures.length).toBeGreaterThan(0);
  });

  it("computes aggregate decision stats for audit analytics", () => {
    resolveMetadata("finance", globalMeta, tenantContext);
    resolveMetadata("finance", globalMeta, tenantContext);

    const stats = getDecisionStats(tenantContext.tenantId, "metadata_resolved");
    expect(stats.count).toBeGreaterThanOrEqual(2);
    expect(stats.avgDurationMs).toBeGreaterThanOrEqual(0);
    expect(stats.maxDurationMs).toBeGreaterThanOrEqual(stats.minDurationMs);
  });

  it("preserves tenant isolation in audit queries", () => {
    const otherTenantContext: ResolutionContext = {
      tenantId: "tenant-e2e-002",
      userId: "user-e2e-002",
      industry: "finance",
    };

    resolveMetadata("finance", globalMeta, tenantContext);
    resolveMetadata("finance", globalMeta, otherTenantContext);

    const primaryTenantEntries = queryDecisionAuditLog({
      tenantId: tenantContext.tenantId,
      limit: 20,
    });

    expect(primaryTenantEntries.length).toBeGreaterThan(0);
    expect(
      primaryTenantEntries.every((entry) => entry.tenantId === tenantContext.tenantId),
    ).toBe(true);
  });

  it("allows manual audit insertion for external chain participants", () => {
    const entry: DecisionAuditEntry = {
      id: randomUUID(),
      timestamp: new Date().toISOString(),
      tenantId: tenantContext.tenantId,
      userId: tenantContext.userId,
      eventType: "event_propagated",
      scope: "finance.event.outbox",
      context: { model: "finance", eventId: "evt-1" },
      decision: {
        input: { eventId: "evt-1" },
        output: { dispatched: true },
        reasoning: "Event pushed to downstream queue",
      },
      durationMs: 0.2,
      status: "success",
    };

    logDecisionAudit(entry);

    const entries = queryDecisionAuditLog({
      tenantId: tenantContext.tenantId,
      eventType: "event_propagated",
      limit: 10,
    });

    expect(entries).toHaveLength(1);
    expect(entries[0].scope).toBe("finance.event.outbox");
  });
});
