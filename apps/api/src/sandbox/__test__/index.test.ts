import { describe, it, expect, beforeEach } from "vitest";
import { simulateScenario, analyzeBlastRadius, simulateBatch } from "../index.js";
import { registerPolicies, clearPolicies } from "../../policy/policyRegistry.js";
import type { PolicyDefinition, SimulationScenario } from "@afenda/meta-types/policy";
// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const positiveTotal: PolicyDefinition = {
  id: "pol-positive",
  scope: "sales.invoice",
  name: "Positive total",
  validate: "total > 0",
  message: "Invoice total must be positive",
  severity: "error",
};

const draftOnly: PolicyDefinition = {
  id: "pol-draft",
  scope: "sales.invoice",
  name: "Draft-only delete",
  when: 'operation == "delete"',
  validate: 'status == "draft"',
  message: "Only draft invoices may be deleted",
  severity: "error",
};

const largeWarning: PolicyDefinition = {
  id: "pol-large",
  scope: "sales.invoice",
  name: "Large invoice",
  validate: "total <= 100000",
  message: "Invoice exceeds 100k",
  severity: "warning",
};

function makeScenario(overrides: Partial<SimulationScenario> = {}): SimulationScenario {
  return {
    id: "sim-1",
    name: "Test scenario",
    entity: "sales.invoice",
    record: { status: "draft", total: 500 },
    actor: { uid: "u1", roles: ["accountant"] },
    operation: "create",
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("sandbox — simulateScenario", () => {
  beforeEach(() => clearPolicies());

  it("returns all-pass when record satisfies all policies", () => {
    const policies = [positiveTotal, largeWarning];
    const report = simulateScenario(makeScenario(), policies);

    expect(report.results).toHaveLength(2);
    expect(report.results.every((r) => r.passed)).toBe(true);
    expect(report.aggregate.passed).toBe(true);
    expect(report.totalTimeMs).toBeGreaterThanOrEqual(0);
    expect(report.timestamp).toBeTruthy();
  });

  it("detects a violation when total is negative", () => {
    const scenario = makeScenario({ record: { status: "draft", total: -10 } });
    const report = simulateScenario(scenario, [positiveTotal]);

    const r = report.results[0];
    expect(r.applicable).toBe(true);
    expect(r.passed).toBe(false);
    expect(r.violation).toBeDefined();
    expect(r.violation!.policyId).toBe("pol-positive");
    expect(report.aggregate.passed).toBe(false);
    expect(report.aggregate.errors).toHaveLength(1);
  });

  it("marks when-guard non-applicable policies as passed", () => {
    // draftOnly only fires on "delete" — a "create" op should skip
    const report = simulateScenario(makeScenario(), [draftOnly]);

    const r = report.results[0];
    expect(r.applicable).toBe(false);
    expect(r.passed).toBe(true);
    expect(r.violation).toBeUndefined();
  });

  it("distinguishes errors from warnings in aggregate", () => {
    // total = 200_000 → positiveTotal passes, largeWarning triggers warning
    const scenario = makeScenario({ record: { status: "draft", total: 200000 } });
    const report = simulateScenario(scenario, [positiveTotal, largeWarning]);

    expect(report.aggregate.passed).toBe(true); // warnings don't block
    expect(report.aggregate.warnings).toHaveLength(1);
    expect(report.aggregate.errors).toHaveLength(0);
  });

  it("uses registry policies when none provided explicitly", () => {
    registerPolicies([positiveTotal]);
    const report = simulateScenario(makeScenario());

    expect(report.results.length).toBeGreaterThanOrEqual(1);
    expect(report.aggregate.passed).toBe(true);
  });

  it("skips disabled policies", () => {
    const disabled: PolicyDefinition = {
      ...positiveTotal,
      id: "pol-disabled",
      enabled: false,
    };
    const report = simulateScenario(makeScenario(), [disabled]);
    expect(report.results).toHaveLength(0);
  });

  it("includes scenario in the report", () => {
    const scenario = makeScenario();
    const report = simulateScenario(scenario, []);
    expect(report.scenario).toBe(scenario);
  });
});

describe("sandbox — analyzeBlastRadius", () => {
  it("counts matching records", () => {
    const policy: PolicyDefinition = {
      id: "pol-status",
      scope: "sales.invoice",
      name: "Status check",
      when: 'status == "posted"',
      validate: "total > 0",
      message: "Must be positive",
      severity: "error",
    };

    const records = {
      "sales.invoice": [
        { id: "inv-1", status: "posted", total: 100 },
        { id: "inv-2", status: "draft", total: 200 },
        { id: "inv-3", status: "posted", total: -5 },
      ],
    };

    const result = analyzeBlastRadius(policy, records);

    expect(result.policyId).toBe("pol-status");
    expect(result.affectedRecordCount).toBe(2); // two "posted" records
    expect(result.affectedEntities).toHaveLength(1);
    expect(result.affectedEntities[0].entity).toBe("sales.invoice");
    expect(result.affectedEntities[0].count).toBe(2);
    expect(result.sampleRecordIds).toContain("inv-1");
    expect(result.sampleRecordIds).toContain("inv-3");
  });

  it("all records match when policy has no when-guard", () => {
    const policy: PolicyDefinition = {
      id: "pol-all",
      scope: "sales",
      name: "All match",
      validate: "total > 0",
      message: "Must be positive",
      severity: "error",
    };

    const records = {
      "sales.invoice": [
        { id: "1", total: 10 },
        { id: "2", total: 20 },
      ],
    };

    const result = analyzeBlastRadius(policy, records);
    expect(result.affectedRecordCount).toBe(2);
  });

  it("handles multiple entity types", () => {
    const policy: PolicyDefinition = {
      id: "pol-multi",
      scope: "sales",
      name: "Active only",
      when: "active == true",
      validate: "total > 0",
      message: "Must be positive",
      severity: "error",
    };

    const records = {
      invoices: [
        { id: "i1", active: true, total: 10 },
        { id: "i2", active: false, total: 20 },
      ],
      orders: [
        { id: "o1", active: true, total: 5 },
        { id: "o2", active: true, total: 15 },
      ],
    };

    const result = analyzeBlastRadius(policy, records);
    expect(result.affectedRecordCount).toBe(3);
    expect(result.affectedEntities).toHaveLength(2);
  });

  it("limits sample IDs to 20", () => {
    const policy: PolicyDefinition = {
      id: "pol-limit",
      scope: "test",
      name: "All match",
      validate: "x > 0",
      message: "Fail",
      severity: "error",
    };

    const many = Array.from({ length: 50 }, (_, i) => ({
      id: `r-${i}`,
      x: 1,
    }));

    const result = analyzeBlastRadius(policy, { test: many });
    expect(result.sampleRecordIds).toHaveLength(20);
  });
});

describe("sandbox — simulateBatch", () => {
  it("runs multiple scenarios", () => {
    const s1 = makeScenario({ id: "sim-1", record: { total: 100 } });
    const s2 = makeScenario({ id: "sim-2", record: { total: -1 } });
    const reports = simulateBatch([s1, s2], [positiveTotal]);

    expect(reports).toHaveLength(2);
    expect(reports[0].aggregate.passed).toBe(true);
    expect(reports[1].aggregate.passed).toBe(false);
  });
});
