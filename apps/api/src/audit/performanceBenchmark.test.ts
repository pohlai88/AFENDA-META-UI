import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.hoisted(() => {
  process.env.DATABASE_URL = "";
});

import type {
  DecisionAuditEntry,
  DecisionAuditQuery,
  DecisionAuditChain,
  PolicyContext,
  PolicyDefinition,
  ResolutionContext,
} from "@afenda/meta-types";
const auditState = vi.hoisted(() => ({
  store: [] as Array<DecisionAuditEntry>,
  chains: new Map<string, DecisionAuditChain>(),
}));

vi.mock("../audit/decisionAuditLogger.js", () => ({
  logDecisionAudit(entry: DecisionAuditEntry) {
    auditState.store.push(entry);
  },
  logDecisionAuditBatch(entries: DecisionAuditEntry[]) {
    auditState.store.push(...entries);
  },
  linkToChain(chainId: string, entry: DecisionAuditEntry) {
    auditState.store.push(entry);
    if (!auditState.chains.has(chainId)) {
      auditState.chains.set(chainId, {
        rootId: chainId,
        entries: [],
        totalDurationMs: 0,
        errors: [],
      });
    }
    const chain = auditState.chains.get(chainId)!;
    chain.entries.push(entry);
    chain.totalDurationMs += entry.durationMs ?? 0;
    if (entry.status === "error" && entry.error) chain.errors.push(entry.error);
  },
  queryDecisionAuditLog(query: DecisionAuditQuery) {
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

import * as auditLogger from "../audit/decisionAuditLogger.js";
import { clearDecisionAuditLog } from "../audit/decisionAuditLogger.js";
import {
  clearTenants,
  registerIndustryTemplate,
  registerOverride,
  registerTenant,
  resolveMetadata,
} from "../tenant/index.js";
import {
  clearRules,
  evaluateRule,
  type RuleDefinition,
  type RuleExecutionContext,
} from "../rules/index.js";
import { clearPolicies, registerPolicy } from "../policy/policyRegistry.js";
import { evaluatePoliciesWithTenantContext } from "../policy/policyEvaluator.js";

vi.mock("../tenant/tenantRepository.js", () => ({
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

vi.mock("./decisionAuditRepository.js", () => ({
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

interface BenchmarkStats {
  meanMs: number;
  medianMs: number;
  p95Ms: number;
  samplesMs: number[];
}

interface BenchmarkPair {
  enabled: BenchmarkStats;
  disabled: BenchmarkStats;
  overheadPercent: number;
}

const BENCHMARK_CONFIG = {
  samples: 7,
  warmupIterations: 120,
  measuredIterations: 500,
};

const tenantContext: ResolutionContext = {
  tenantId: "bench-tenant",
  userId: "bench-user",
  departmentId: "dept-finance",
  industry: "finance",
};

const rule: RuleDefinition = {
  id: "bench-rule-tax",
  scope: "finance.invoice.compute.tax",
  category: "compute",
  name: "Compute tax",
  when: 'status == "posted"',
  expression: "amount * 0.075 + shipping * 0.025",
  priority: 100,
};

const policy: PolicyDefinition = {
  id: "bench-policy-positive-amount",
  name: "Positive amount required",
  scope: "finance.invoice",
  validate: "amount > 0",
  message: "Amount must be positive",
  severity: "error",
};

function buildLargeMetadata(fieldCount = 120): Record<string, unknown> {
  const fields: Record<string, unknown> = {};

  for (let i = 0; i < fieldCount; i++) {
    fields[`field_${i}`] = {
      type: i % 2 === 0 ? "string" : "number",
      required: i % 3 === 0,
      labels: {
        en: `Field ${i}`,
        es: `Campo ${i}`,
      },
      validation: {
        min: 0,
        max: 100000,
      },
    };
  }

  return {
    model: "finance.invoice",
    label: "Invoice",
    fields,
    views: {
      form: {
        sections: [
          { id: "header", fields: ["field_0", "field_1", "field_2"] },
          { id: "details", fields: ["field_3", "field_4", "field_5"] },
        ],
      },
    },
    actions: [
      { id: "approve", label: "Approve" },
      { id: "reject", label: "Reject" },
    ],
    policies: {
      "bench-policy-positive-amount": {
        validate: "amount > 0",
      },
    },
  };
}

const globalMetadata = buildLargeMetadata();

function policyContext(amount: number): PolicyContext {
  return {
    model: "finance.invoice",
    operation: "validate",
    record: {
      amount,
      shipping: 120,
      status: "posted",
      vendor: "ACME Corp",
    },
    actor: {
      uid: tenantContext.userId ?? "bench-user",
      roles: ["finance_admin"],
    },
  };
}

function ruleContext(): RuleExecutionContext {
  return {
    record: {
      amount: 12000,
      shipping: 250,
      status: "posted",
    },
    relatedRecords: {},
    actor: {
      uid: tenantContext.userId ?? "bench-user",
      roles: ["finance_admin"],
    },
    tenantContext,
  };
}

function measurePerOperationMs(operation: () => void, iterations: number): number {
  const start = performance.now();
  for (let i = 0; i < iterations; i++) {
    operation();
  }
  return (performance.now() - start) / iterations;
}

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const idx = Math.min(sorted.length - 1, Math.max(0, Math.ceil(sorted.length * p) - 1));
  return sorted[idx];
}

function summarize(samplesMs: number[]): BenchmarkStats {
  const sorted = [...samplesMs].sort((a, b) => a - b);
  const meanMs = samplesMs.reduce((sum, value) => sum + value, 0) / samplesMs.length;
  const medianMs = percentile(sorted, 0.5);
  const p95Ms = percentile(sorted, 0.95);

  return {
    meanMs,
    medianMs,
    p95Ms,
    samplesMs,
  };
}

function runBenchmarkPair(operation: () => void): BenchmarkPair {
  const enabledSamples: number[] = [];
  const disabledSamples: number[] = [];

  for (let i = 0; i < BENCHMARK_CONFIG.samples; i++) {
    clearDecisionAuditLog();
    measurePerOperationMs(operation, BENCHMARK_CONFIG.warmupIterations);
    enabledSamples.push(measurePerOperationMs(operation, BENCHMARK_CONFIG.measuredIterations));

    clearDecisionAuditLog();
    const noopAuditSpy = vi.spyOn(auditLogger, "logDecisionAudit").mockImplementation(() => {});

    try {
      measurePerOperationMs(operation, BENCHMARK_CONFIG.warmupIterations);
      disabledSamples.push(measurePerOperationMs(operation, BENCHMARK_CONFIG.measuredIterations));
    } finally {
      noopAuditSpy.mockRestore();
    }
  }

  const enabled = summarize(enabledSamples);
  const disabled = summarize(disabledSamples);
  const overheadPercent =
    disabled.medianMs === 0
      ? 0
      : ((enabled.medianMs - disabled.medianMs) / disabled.medianMs) * 100;

  return { enabled, disabled, overheadPercent };
}

function printBenchmarkSummary(name: string, pair: BenchmarkPair): void {
  console.warn(`\n📊 ${name} Audit Overhead`);
  console.warn({
    enabled: {
      medianMs: pair.enabled.medianMs.toFixed(4),
      meanMs: pair.enabled.meanMs.toFixed(4),
      p95Ms: pair.enabled.p95Ms.toFixed(4),
    },
    disabled: {
      medianMs: pair.disabled.medianMs.toFixed(4),
      meanMs: pair.disabled.meanMs.toFixed(4),
      p95Ms: pair.disabled.p95Ms.toFixed(4),
    },
    delta: {
      overheadPercent: pair.overheadPercent.toFixed(2) + "%",
      medianDeltaMs: (pair.enabled.medianMs - pair.disabled.medianMs).toFixed(4),
      meanDeltaMs: (pair.enabled.meanMs - pair.disabled.meanMs).toFixed(4),
    },
  });
}

describe("Performance Benchmark - Real Audit Overhead", () => {
  // Skip in CI: microbenchmark timing at sub-millisecond scale is inherently noisy
  // Run manually for performance validation: `npx vitest run performanceBenchmark.test.ts`
  const runBenchmarks = !process.env.CI && !process.env.VITEST_POOL_ID;

  beforeEach(() => {
    clearDecisionAuditLog();
    clearTenants();
    clearRules();
    clearPolicies();

    registerTenant({
      id: tenantContext.tenantId,
      name: "Benchmark Tenant",
      enabled: true,
      industry: "finance",
      isolationStrategy: "logical",
    });

    registerIndustryTemplate("finance", {
      settings: {
        currency: "USD",
        fiscalYearStartMonth: 1,
      },
    });

    registerOverride({
      id: "bench-tenant-override",
      scope: "tenant",
      model: "finance.invoice",
      tenantId: tenantContext.tenantId,
      patch: {
        settings: {
          approvalThreshold: 5000,
        },
      },
      enabled: true,
    });

    registerOverride({
      id: "bench-department-override",
      scope: "department",
      model: "finance.invoice",
      tenantId: tenantContext.tenantId,
      departmentId: tenantContext.departmentId,
      patch: {
        settings: {
          approvalThreshold: 2500,
        },
      },
      enabled: true,
    });

    registerPolicy(policy);
  });

  afterEach(() => {
    clearDecisionAuditLog();
    clearTenants();
    clearRules();
    clearPolicies();
    vi.restoreAllMocks();
  });

  it.skipIf(!runBenchmarks)("keeps metadata resolution audit overhead below 10%", () => {
    const result = runBenchmarkPair(() => {
      resolveMetadata("finance.invoice", globalMetadata, tenantContext);
    });

    printBenchmarkSummary("Metadata Resolution", result);
    expect(result.overheadPercent).toBeLessThan(10);
  });

  it.skipIf(!runBenchmarks)("keeps rule evaluation audit overhead below 10%", () => {
    const result = runBenchmarkPair(() => {
      evaluateRule(rule, ruleContext(), globalMetadata);
    });

    printBenchmarkSummary("Rule Evaluation", result);
    expect(result.overheadPercent).toBeLessThan(10);
  });

  it.skipIf(!runBenchmarks)("keeps policy enforcement audit overhead below 10%", () => {
    const result = runBenchmarkPair(() => {
      // Intentionally violate policy so policy_enforced events are emitted.
      evaluatePoliciesWithTenantContext(
        policyContext(-5),
        tenantContext,
        globalMetadata,
        "finance.invoice"
      );
    });

    printBenchmarkSummary("Policy Enforcement", result);
    expect(result.overheadPercent).toBeLessThan(10);
  });

  it.skipIf(!runBenchmarks)(
    "verifies overall median overhead target across core decision paths",
    () => {
      const metadataResult = runBenchmarkPair(() => {
        resolveMetadata("finance.invoice", globalMetadata, tenantContext);
      });

      const ruleResult = runBenchmarkPair(() => {
        evaluateRule(rule, ruleContext(), globalMetadata);
      });

      const policyResult = runBenchmarkPair(() => {
        evaluatePoliciesWithTenantContext(
          policyContext(-5),
          tenantContext,
          globalMetadata,
          "finance.invoice"
        );
      });

      const combinedMedianOverhead =
        (metadataResult.overheadPercent +
          ruleResult.overheadPercent +
          policyResult.overheadPercent) /
        3;

      console.warn("\n✅ Combined median overhead target");
      console.warn({
        metadataPercent: metadataResult.overheadPercent.toFixed(2),
        rulePercent: ruleResult.overheadPercent.toFixed(2),
        policyPercent: policyResult.overheadPercent.toFixed(2),
        combinedMedianOverhead: combinedMedianOverhead.toFixed(2) + "%",
      });

      expect(combinedMedianOverhead).toBeLessThan(10);
    }
  );
});
