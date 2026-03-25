import { randomUUID } from "crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.hoisted(() => {
  process.env.DATABASE_URL = "";
});

const auditState = vi.hoisted(() => ({
  store: [] as Array<any>,
  chains: new Map<string, any>(),
}));

vi.mock("../audit/decisionAuditLogger.js", () => ({
  logDecisionAudit(entry: any) {
    auditState.store.push(entry);
  },
  logDecisionAuditBatch(entries: any[]) {
    auditState.store.push(...entries);
  },
  linkToChain(chainId: string, entry: any) {
    auditState.store.push(entry);
    if (!auditState.chains.has(chainId)) {
      auditState.chains.set(chainId, {
        rootId: chainId,
        entries: [],
        totalDurationMs: 0,
        errors: [],
      });
    }
    const chain = auditState.chains.get(chainId);
    chain.entries.push(entry);
    chain.totalDurationMs += entry.durationMs ?? 0;
    if (entry.status === "error" && entry.error) chain.errors.push(entry.error);
  },
  queryDecisionAuditLog(query: any) {
    const scopeRegex = query.scope
      ? new RegExp(`^${String(query.scope).replace(/\\*/g, ".*")}$`)
      : null;
    return auditState.store
      .filter((entry) => entry.tenantId === query.tenantId)
      .filter((entry) => (query.eventType ? entry.eventType === query.eventType : true))
      .filter((entry) => (query.userId ? entry.userId === query.userId : true))
      .filter((entry) => (scopeRegex ? scopeRegex.test(entry.scope) : true))
      .sort((a, b) => String(b.timestamp).localeCompare(String(a.timestamp)));
  },
  getDecisionChain(chainId: string) {
    return auditState.chains.get(chainId) ?? null;
  },
  getDecisionStats() {
    return {
      count: 0,
      avgDurationMs: 0,
      minDurationMs: 0,
      maxDurationMs: 0,
      errorRate: 0,
    };
  },
  getSlowDecisions() {
    return [];
  },
  getAuditFailures() {
    return [];
  },
  getUserAuditTrail(tenantId: string, userId: string) {
    return auditState.store.filter(
      (entry) => entry.tenantId === tenantId && entry.userId === userId
    );
  },
  verifyDecisionCompliance() {
    return true;
  },
  clearDecisionAuditLog() {
    auditState.store.length = 0;
    auditState.chains.clear();
  },
  pruneOldDecisions() {
    return 0;
  },
}));

import type {
  DecisionAuditEntry,
  PolicyContext,
  PolicyDefinition,
  ResolutionContext,
} from "@afenda/meta-types";
import {
  clearDecisionAuditLog,
  getDecisionChain,
  linkToChain,
  queryDecisionAuditLog,
} from "../audit/decisionAuditLogger.js";
import { clearPolicies, registerPolicy } from "../policy/policyRegistry.js";
import { evaluatePoliciesWithTenantContext } from "../policy/policyEvaluator.js";
import { clearRules, evaluateRule, type RuleDefinition } from "../rules/index.js";
import { CachedResolution, clearTenants, registerTenant } from "./index.js";

vi.mock("./tenantRepository.js", () => ({
  dbGetTenant: vi.fn().mockResolvedValue(null),
  dbListTenants: vi.fn().mockResolvedValue([]),
  dbUpsertTenant: vi.fn().mockResolvedValue(undefined),
  dbRemoveTenant: vi.fn().mockResolvedValue(undefined),
  dbUpsertIndustryTemplate: vi.fn().mockResolvedValue(undefined),
  dbUpsertOverride: vi.fn().mockResolvedValue(undefined),
  dbRemoveOverride: vi.fn().mockResolvedValue(undefined),
  dbLoadAllTenants: vi.fn().mockResolvedValue([]),
  dbLoadAllOverrides: vi.fn().mockResolvedValue([]),
  dbLoadAllIndustryTemplates: vi.fn().mockResolvedValue([]),
}));

vi.mock("@afenda/db/schema-meta", () => ({
  schemaRegistry: {},
  entities: {},
  fields: {},
  layouts: {},
  policies: {},
  auditLogs: {},
  events: {},
  policySeverityEnum: {},
  auditOperationEnum: {},
  auditSourceEnum: {},
  layoutViewTypeEnum: {},
  isolationStrategyEnum: {},
  overrideScopeEnum: {},
  tenantDefinitions: {},
  metadataOverrides: {},
  industryTemplates: {},
  decisionEventTypeEnum: {},
  decisionStatusEnum: {},
  decisionAuditEntries: {},
  decisionAuditChains: {},
}));

vi.mock("@afenda/db/schema-domain", () => ({
  orderStatusEnum: {},
  partnerTypeEnum: {},
  partners: {},
  productCategories: {},
  products: {},
  salesOrders: {},
  salesOrderLines: {},
}));

vi.mock("../audit/decisionAuditRepository.js", () => ({
  dbLogDecisionAudit: vi.fn(),
  dbLogDecisionAuditBatch: vi.fn(),
  dbLinkToChain: vi.fn(),
  dbQueryDecisionAuditLog: vi.fn().mockResolvedValue([]),
  dbGetDecisionChain: vi.fn().mockResolvedValue(null),
  dbGetDecisionStats: vi.fn().mockResolvedValue(null),
  dbGetAuditFailures: vi.fn().mockResolvedValue([]),
  dbGetUserAuditTrail: vi.fn().mockResolvedValue([]),
  dbGetStoreSize: vi.fn().mockResolvedValue(0),
  dbClearDecisionAuditLog: vi.fn(),
  dbPruneOldDecisions: vi.fn().mockResolvedValue(0),
}));

const tenantContext: ResolutionContext = {
  tenantId: "tenant-e2e-cache-001",
  userId: "user-e2e-cache-001",
  departmentId: "dept-e2e-cache-001",
  industry: "finance",
};

const globalMetadata: Record<string, unknown> = {
  model: "finance",
  label: "Finance",
  fields: {
    amount: { type: "currency", required: true },
    vendor: { type: "string", required: true },
    status: { type: "string", required: true },
  },
  policies: {
    "policy-positive-amount": {
      validate: "amount > 0",
    },
  },
};

const computeRule: RuleDefinition = {
  id: "rule-tax-e2e",
  scope: "finance.compute.tax",
  category: "compute",
  name: "Compute Tax",
  when: 'status == "posted"',
  expression: "amount * 0.1",
  priority: 100,
};

const policy: PolicyDefinition = {
  id: "policy-positive-amount",
  name: "Amount must be positive",
  scope: "finance",
  validate: "amount > 0",
  message: "Amount must be positive",
  severity: "error",
};

function ruleContext(amount: number) {
  return {
    record: {
      amount,
      status: "posted",
      vendor: "ACME Corp",
    },
    relatedRecords: {},
    actor: {
      uid: tenantContext.userId ?? "system",
      roles: ["finance_admin"],
    },
    tenantContext,
  };
}

function policyContext(amount: number): PolicyContext {
  return {
    model: "finance",
    record: {
      amount,
      status: "posted",
      vendor: "ACME Corp",
    },
    actor: {
      uid: tenantContext.userId ?? "system",
      roles: ["finance_admin"],
    },
    operation: "validate",
  };
}

describe("E2E: Cached Rule Evaluation and Audit Continuity", () => {
  beforeEach(() => {
    clearDecisionAuditLog();
    clearTenants();
    clearRules();
    clearPolicies();
    CachedResolution.clear();

    registerTenant({
      id: tenantContext.tenantId,
      name: "Tenant E2E",
      enabled: true,
      industry: tenantContext.industry,
      isolationStrategy: "logical",
    });

    registerPolicy(policy);
  });

  afterEach(() => {
    clearDecisionAuditLog();
    clearTenants();
    clearRules();
    clearPolicies();
    CachedResolution.clear();
  });

  it("reuses cached metadata on repeated rule evaluations", () => {
    evaluateRule(computeRule, ruleContext(1000), globalMetadata);
    evaluateRule(computeRule, ruleContext(1000), globalMetadata);

    const metadataEvents = queryDecisionAuditLog({
      tenantId: tenantContext.tenantId,
      eventType: "metadata_resolved",
      limit: 20,
    });

    expect(metadataEvents.length).toBeGreaterThanOrEqual(2);
    expect(metadataEvents.some((entry) => entry.scope.endsWith(".cache_miss"))).toBe(true);
    expect(metadataEvents.some((entry) => entry.scope.endsWith(".cache_hit"))).toBe(true);

    const metrics = CachedResolution.getMetrics();
    expect(metrics.totalCacheHits).toBeGreaterThanOrEqual(1);
    expect(metrics.cacheHitRate).toBeGreaterThan(0);
  });

  it("forces cache miss after tenant invalidation", () => {
    evaluateRule(computeRule, ruleContext(2000), globalMetadata);
    evaluateRule(computeRule, ruleContext(2000), globalMetadata);

    CachedResolution.invalidateTenant(tenantContext.tenantId);
    evaluateRule(computeRule, ruleContext(2000), globalMetadata);

    const metadataEvents = queryDecisionAuditLog({
      tenantId: tenantContext.tenantId,
      eventType: "metadata_resolved",
      limit: 50,
    });

    const missEvents = metadataEvents.filter((entry) => entry.scope.endsWith(".cache_miss"));

    expect(missEvents.length).toBeGreaterThanOrEqual(2);
  });

  it("preserves a full metadata -> rule -> policy audit chain", () => {
    const ruleResult = evaluateRule(computeRule, ruleContext(1500), globalMetadata);
    const policyResult = evaluatePoliciesWithTenantContext(
      policyContext(-1),
      tenantContext,
      globalMetadata,
      "finance"
    );

    expect(ruleResult.passed).toBe(true);
    expect(policyResult.passed).toBe(false);

    const events = queryDecisionAuditLog({
      tenantId: tenantContext.tenantId,
      limit: 50,
    });

    const latestMetadata = events.find((entry) => entry.eventType === "metadata_resolved");
    const latestRule = events.find((entry) => entry.eventType === "rule_evaluated");
    const latestPolicy = events.find((entry) => entry.eventType === "policy_enforced");

    expect(latestMetadata).toBeDefined();
    expect(latestRule).toBeDefined();
    expect(latestPolicy).toBeDefined();

    const chainId = randomUUID();
    linkToChain(chainId, latestMetadata as DecisionAuditEntry);
    linkToChain(chainId, latestRule as DecisionAuditEntry);
    linkToChain(chainId, latestPolicy as DecisionAuditEntry);

    const chain = getDecisionChain(chainId);
    expect(chain).not.toBeNull();
    expect(chain?.entries.length).toBe(3);
    expect(chain?.entries.some((entry) => entry.eventType === "metadata_resolved")).toBe(true);
    expect(chain?.entries.some((entry) => entry.eventType === "rule_evaluated")).toBe(true);
    expect(chain?.entries.some((entry) => entry.eventType === "policy_enforced")).toBe(true);
    expect(chain?.totalDurationMs).toBeGreaterThanOrEqual(0);
  });

  it("supports adding external events into an existing decision chain", () => {
    evaluateRule(computeRule, ruleContext(900), globalMetadata);
    evaluatePoliciesWithTenantContext(policyContext(-10), tenantContext, globalMetadata, "finance");

    const events = queryDecisionAuditLog({
      tenantId: tenantContext.tenantId,
      limit: 50,
    });

    const metadata = events.find((entry) => entry.eventType === "metadata_resolved");
    const rule = events.find((entry) => entry.eventType === "rule_evaluated");

    expect(metadata).toBeDefined();
    expect(rule).toBeDefined();

    const chainId = randomUUID();
    linkToChain(chainId, metadata as DecisionAuditEntry);
    linkToChain(chainId, rule as DecisionAuditEntry);

    const externalEvent: DecisionAuditEntry = {
      id: randomUUID(),
      timestamp: new Date().toISOString(),
      tenantId: tenantContext.tenantId,
      userId: tenantContext.userId,
      eventType: "event_propagated",
      scope: "finance.event.outbox",
      context: { model: "finance", eventId: "evt-e2e-1" },
      decision: {
        input: { eventId: "evt-e2e-1" },
        output: { propagated: true },
        reasoning: "Propagated to downstream systems",
      },
      durationMs: 0.2,
      status: "success",
    };

    linkToChain(chainId, externalEvent);

    const chain = getDecisionChain(chainId);
    expect(chain).not.toBeNull();
    expect(chain?.entries.length).toBe(3);
    expect(chain?.entries.some((entry) => entry.eventType === "event_propagated")).toBe(true);
  });
});
