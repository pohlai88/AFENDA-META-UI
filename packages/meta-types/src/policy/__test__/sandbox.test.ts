/**
 * Policy sandbox contract tests.
 *
 * Design intent: SimulationScenario, PolicySimulationResult, SimulationReport,
 * and BlastRadiusResult are the admin safety-lab contracts. Structural regressions
 * cause incorrect impact analysis before policy activation — a production safety risk.
 * Fix the contract, not the test.
 */
import { describe, expect, it } from "vitest";

import type {
  BlastRadiusResult,
  PolicySimulationResult,
  SimulationReport,
  SimulationScenario,
} from "../sandbox.js";
import type { PolicyDefinition, PolicyEvaluationResult, PolicyViolation } from "../types.js";

// ---------------------------------------------------------------------------
// Test fixtures
// ---------------------------------------------------------------------------

const samplePolicy: PolicyDefinition = {
  id: "no-approve-blacklisted-vendor",
  scope: "purchase_order",
  name: "Block Blacklisted Vendor Approval",
  validate: "vendor.is_blacklisted === false",
  message: "Cannot approve PO for a blacklisted vendor",
  severity: "error",
  enabled: true,
};

const sampleViolation: PolicyViolation = {
  policyId: samplePolicy.id,
  policyName: samplePolicy.name,
  message: samplePolicy.message,
  severity: "error",
};

const passedEvalResult: PolicyEvaluationResult = {
  passed: true,
  errors: [],
  warnings: [],
  info: [],
  evaluationTimeMs: 3,
};

const failedEvalResult: PolicyEvaluationResult = {
  passed: false,
  errors: [sampleViolation],
  warnings: [],
  info: [],
  evaluationTimeMs: 5,
};

// ---------------------------------------------------------------------------
// SimulationScenario — structural contract
// ---------------------------------------------------------------------------

describe("SimulationScenario — structural contract", () => {
  it("accepts a minimal scenario with required fields only", () => {
    const scenario: SimulationScenario = {
      id: "scenario-001",
      name: "Approve PO for blacklisted vendor",
      entity: "purchase_order",
      record: { id: "po-001", vendorId: "v-blacklisted", status: "pending" },
      actor: { uid: "user-001", roles: ["manager"] },
      operation: "approve",
    };
    expect(scenario.id).toBe("scenario-001");
    expect(scenario.entity).toBe("purchase_order");
    expect(scenario.actor.roles).toContain("manager");
    expect(scenario.relatedRecords).toBeUndefined();
    expect(scenario.previousRecord).toBeUndefined();
  });

  it("accepts optional relatedRecords for cross-entity scenarios", () => {
    const scenario: SimulationScenario = {
      id: "scenario-002",
      name: "Check invoice with related payment",
      entity: "invoice",
      record: { id: "inv-001", amount: 1000 },
      actor: { uid: "u-002", roles: ["accountant"] },
      operation: "close",
      relatedRecords: {
        payments: [{ id: "pay-001", amount: 1000, invoiceId: "inv-001" }],
      },
    };
    expect(scenario.relatedRecords?.["payments"]).toHaveLength(1);
  });

  it("accepts optional previousRecord for update scenarios", () => {
    const scenario: SimulationScenario = {
      id: "scenario-003",
      name: "Update order status",
      entity: "sales_order",
      record: { id: "so-001", status: "confirmed" },
      actor: { uid: "u-003", roles: ["sales"] },
      operation: "update",
      previousRecord: { id: "so-001", status: "draft" },
    };
    expect(scenario.previousRecord?.["status"]).toBe("draft");
    expect(scenario.record["status"]).toBe("confirmed");
  });

  it("accepts multiple roles in actor", () => {
    const scenario: SimulationScenario = {
      id: "scenario-004",
      name: "Admin approval",
      entity: "budget",
      record: { id: "bud-001", amount: 50000 },
      actor: { uid: "admin-001", roles: ["admin", "finance", "manager"] },
      operation: "approve",
    };
    expect(scenario.actor.roles).toHaveLength(3);
  });
});

// ---------------------------------------------------------------------------
// PolicySimulationResult — structural contract
// ---------------------------------------------------------------------------

describe("PolicySimulationResult — structural contract", () => {
  it("represents a passing policy result", () => {
    const result: PolicySimulationResult = {
      policy: samplePolicy,
      applicable: true,
      passed: true,
      evaluationTimeMs: 2,
    };
    expect(result.passed).toBe(true);
    expect(result.applicable).toBe(true);
    expect(result.violation).toBeUndefined();
  });

  it("represents a failing policy result with violation", () => {
    const result: PolicySimulationResult = {
      policy: samplePolicy,
      applicable: true,
      passed: false,
      violation: sampleViolation,
      evaluationTimeMs: 4,
    };
    expect(result.passed).toBe(false);
    expect(result.violation?.policyId).toBe("no-approve-blacklisted-vendor");
    expect(result.violation?.severity).toBe("error");
  });

  it("represents a non-applicable policy (condition not met)", () => {
    const result: PolicySimulationResult = {
      policy: samplePolicy,
      applicable: false,
      passed: true,
      evaluationTimeMs: 1,
    };
    expect(result.applicable).toBe(false);
    expect(result.passed).toBe(true);
  });

  it("records evaluation time in milliseconds", () => {
    const result: PolicySimulationResult = {
      policy: samplePolicy,
      applicable: true,
      passed: true,
      evaluationTimeMs: 7.5,
    };
    expect(result.evaluationTimeMs).toBe(7.5);
  });
});

// ---------------------------------------------------------------------------
// SimulationReport — structural contract
// ---------------------------------------------------------------------------

describe("SimulationReport — structural contract", () => {
  const scenario: SimulationScenario = {
    id: "sc-report-001",
    name: "Full report scenario",
    entity: "invoice",
    record: { id: "inv-001" },
    actor: { uid: "u-01", roles: ["user"] },
    operation: "create",
  };

  it("combines scenario, results, aggregate, timing, and timestamp", () => {
    const report: SimulationReport = {
      scenario,
      results: [],
      aggregate: passedEvalResult,
      totalTimeMs: 12,
      timestamp: "2026-03-28T10:00:00Z",
    };
    expect(report.scenario.id).toBe("sc-report-001");
    expect(report.results).toHaveLength(0);
    expect(report.aggregate.passed).toBe(true);
    expect(report.totalTimeMs).toBe(12);
    expect(report.timestamp).toContain("2026");
  });

  it("lists individual policy results in simulation", () => {
    const policyResult: PolicySimulationResult = {
      policy: samplePolicy,
      applicable: true,
      passed: false,
      violation: sampleViolation,
      evaluationTimeMs: 5,
    };
    const report: SimulationReport = {
      scenario,
      results: [policyResult],
      aggregate: failedEvalResult,
      totalTimeMs: 8,
      timestamp: "2026-03-28T11:00:00Z",
    };
    expect(report.results).toHaveLength(1);
    expect(report.aggregate.passed).toBe(false);
    expect(report.aggregate.errors).toHaveLength(1);
  });

  it("timestamp is a string (ISO 8601)", () => {
    const report: SimulationReport = {
      scenario,
      results: [],
      aggregate: passedEvalResult,
      totalTimeMs: 3,
      timestamp: "2026-03-28T00:00:00.000Z",
    };
    expect(typeof report.timestamp).toBe("string");
    expect(new Date(report.timestamp).getFullYear()).toBe(2026);
  });
});

// ---------------------------------------------------------------------------
// BlastRadiusResult — structural contract
// ---------------------------------------------------------------------------

describe("BlastRadiusResult — structural contract", () => {
  it("accepts a minimal blast radius with zero affected records", () => {
    const result: BlastRadiusResult = {
      policyId: "no-approve-blacklisted-vendor",
      policyName: "Block Blacklisted Vendor Approval",
      affectedRecordCount: 0,
      affectedEntities: [],
      sampleRecordIds: [],
      timestamp: "2026-03-28T09:00:00Z",
    };
    expect(result.affectedRecordCount).toBe(0);
    expect(result.affectedEntities).toHaveLength(0);
    expect(result.sampleRecordIds).toHaveLength(0);
  });

  it("accepts affected entity breakdowns", () => {
    const result: BlastRadiusResult = {
      policyId: "block-po-all-inactive-departments",
      policyName: "Block PO for Inactive Departments",
      affectedRecordCount: 47,
      affectedEntities: [
        { entity: "purchase_order", count: 30 },
        { entity: "purchase_order_line", count: 17 },
      ],
      sampleRecordIds: ["po-001", "po-002", "po-003"],
      timestamp: "2026-03-28T08:00:00Z",
    };
    expect(result.affectedRecordCount).toBe(47);
    expect(result.affectedEntities).toHaveLength(2);
    expect(result.affectedEntities[0]?.entity).toBe("purchase_order");
    expect(result.affectedEntities[0]?.count).toBe(30);
    expect(result.sampleRecordIds).toHaveLength(3);
  });

  it("policyId and policyName are separate fields", () => {
    const result: BlastRadiusResult = {
      policyId: "pol-001",
      policyName: "Human-Readable Policy Name",
      affectedRecordCount: 5,
      affectedEntities: [{ entity: "invoice", count: 5 }],
      sampleRecordIds: ["inv-001"],
      timestamp: "2026-01-01T00:00:00Z",
    };
    expect(result.policyId).toBe("pol-001");
    expect(result.policyName).toBe("Human-Readable Policy Name");
    expect(result.policyId).not.toBe(result.policyName);
  });

  it("EXHAUSTIVENESS GATE — BlastRadiusResult has exactly 6 fields", () => {
    const result: BlastRadiusResult = {
      policyId: "x",
      policyName: "x",
      affectedRecordCount: 0,
      affectedEntities: [],
      sampleRecordIds: [],
      timestamp: "2026-01-01T00:00:00Z",
    };
    expect(Object.keys(result)).toHaveLength(6);
  });
});
