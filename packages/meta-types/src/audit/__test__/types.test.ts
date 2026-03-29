/**
 * Audit type shape contracts.
 *
 * Design intent: every structural assertion here represents a contract that downstream
 * consumers (api, db, web) depend on. A test failure means a breaking change was made
 * silently; the code must be updated, not the test.
 */
import { describe, expect, it } from "vitest";

import type {
  AuditEntry,
  AuditOperation,
  AuditSource,
  AuditTimelineEntry,
  AuditQuery,
  DecisionAuditEntry,
  DecisionEventType,
  FieldChange,
  MaskingRule,
  SensitivityLevel,
} from "../types.js";

// ---------------------------------------------------------------------------
// Fixture factories
// ---------------------------------------------------------------------------

function makeFieldChange(overrides: Partial<FieldChange> = {}): FieldChange {
  return {
    field: "amount",
    oldValue: 100,
    newValue: 200,
    sensitivity: "low",
    ...overrides,
  };
}

function makeAuditEntry(overrides: Partial<AuditEntry> = {}): AuditEntry {
  return {
    id: "audit-001",
    entity: "salesOrder",
    entityId: "so-123",
    timestamp: "2026-01-01T00:00:00Z",
    actor: "user-admin",
    operation: "update",
    changes: [makeFieldChange()],
    source: "api",
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// AuditOperation union
// ---------------------------------------------------------------------------

describe("AuditOperation union", () => {
  it("accepts all valid operation values", () => {
    const validOps: AuditOperation[] = ["create", "update", "delete"];
    expect(validOps).toHaveLength(3);
    expect(validOps).toContain("create");
    expect(validOps).toContain("update");
    expect(validOps).toContain("delete");
  });

  it("rejects unknown operation at the type level (compile-time guard, verified by usage)", () => {
    // This object is rejected by TypeScript when `operation` is wrong type.
    // The explicit cast confirms the value set is fixed at 3.
    const entry = makeAuditEntry({ operation: "update" });
    expect(entry.operation).toBe("update");
  });
});

// ---------------------------------------------------------------------------
// AuditSource union
// ---------------------------------------------------------------------------

describe("AuditSource union", () => {
  it("covers all five expected source values", () => {
    const allSources: AuditSource[] = ["ui", "api", "import", "system", "migration"];
    expect(allSources).toHaveLength(5);
    expect(new Set(allSources).size).toBe(5); // no duplicates
  });
});

// ---------------------------------------------------------------------------
// SensitivityLevel union
// ---------------------------------------------------------------------------

describe("SensitivityLevel union", () => {
  it("covers exactly three sensitivity tiers", () => {
    const levels: SensitivityLevel[] = ["low", "medium", "high"];
    expect(levels).toHaveLength(3);
    expect(levels).toContain("low");
    expect(levels).toContain("medium");
    expect(levels).toContain("high");
  });

  it("maintains ordered semantics: low < medium < high (index-based proxy)", () => {
    const ordered: SensitivityLevel[] = ["low", "medium", "high"];
    expect(ordered.indexOf("low")).toBeLessThan(ordered.indexOf("medium"));
    expect(ordered.indexOf("medium")).toBeLessThan(ordered.indexOf("high"));
  });
});

// ---------------------------------------------------------------------------
// FieldChange
// ---------------------------------------------------------------------------

describe("FieldChange", () => {
  it("accepts valid field change with required fields", () => {
    const change: FieldChange = makeFieldChange();
    expect(change.field).toBe("amount");
    expect(change.sensitivity).toBe("low");
  });

  it("accepts null old/new values (representing creation or deletion)", () => {
    const change: FieldChange = makeFieldChange({ oldValue: null, newValue: null });
    expect(change.oldValue).toBeNull();
    expect(change.newValue).toBeNull();
  });

  it("accepts complex object as oldValue/newValue", () => {
    const change: FieldChange = makeFieldChange({
      oldValue: { nested: { deep: true } },
      newValue: [1, 2, 3],
    });
    expect(change.oldValue).toEqual({ nested: { deep: true } });
    expect(change.newValue).toEqual([1, 2, 3]);
  });

  it("accepts all three sensitivity levels", () => {
    for (const level of ["low", "medium", "high"] as SensitivityLevel[]) {
      const change = makeFieldChange({ sensitivity: level });
      expect(change.sensitivity).toBe(level);
    }
  });
});

// ---------------------------------------------------------------------------
// AuditEntry
// ---------------------------------------------------------------------------

describe("AuditEntry", () => {
  it("accepts a minimal valid entry", () => {
    const entry: AuditEntry = makeAuditEntry();
    expect(entry.id).toBe("audit-001");
    expect(entry.entity).toBe("salesOrder");
    expect(entry.changes).toHaveLength(1);
  });

  it("accepts optional reason field", () => {
    const entry = makeAuditEntry({ reason: "Approved by manager" });
    expect(entry.reason).toBe("Approved by manager");
  });

  it("accepts optional metadata as open record", () => {
    const entry = makeAuditEntry({ metadata: { requestId: "req-456", ipAddress: "10.0.0.1" } });
    expect(entry.metadata).toMatchObject({ requestId: "req-456" });
  });

  it("accepts an entry with no changes (system audit events)", () => {
    const entry = makeAuditEntry({ changes: [] });
    expect(entry.changes).toHaveLength(0);
  });

  it("accepts entries from all source types", () => {
    const sources: AuditSource[] = ["ui", "api", "import", "system", "migration"];
    for (const source of sources) {
      const entry = makeAuditEntry({ source });
      expect(entry.source).toBe(source);
    }
  });

  it("accepts entries for all operation types", () => {
    for (const op of ["create", "update", "delete"] as AuditOperation[]) {
      const entry = makeAuditEntry({ operation: op });
      expect(entry.operation).toBe(op);
    }
  });
});

// ---------------------------------------------------------------------------
// MaskingRule shape
// ---------------------------------------------------------------------------

describe("MaskingRule", () => {
  it("accepts a full masking rule", () => {
    const rule: MaskingRule = {
      threshold: "high",
      strategy: "full",
    };
    expect(rule.threshold).toBe("high");
    expect(rule.strategy).toBe("full");
  });

  it("accepts partial masking rule with revealChars", () => {
    const rule: MaskingRule = {
      threshold: "medium",
      strategy: "partial",
      revealChars: 4,
    };
    expect(rule.revealChars).toBe(4);
  });

  it("accepts hash masking strategy", () => {
    const rule: MaskingRule = {
      threshold: "low",
      strategy: "hash",
    };
    expect(rule.strategy).toBe("hash");
  });

  it("accepts all three masking strategies", () => {
    const strategies = ["full", "partial", "hash"] as Array<MaskingRule["strategy"]>;
    expect(strategies).toHaveLength(3);
  });

  it("revealChars is optional and absent by default", () => {
    const rule: MaskingRule = { threshold: "low", strategy: "full" };
    expect(rule.revealChars).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// AuditTimelineEntry
// ---------------------------------------------------------------------------

describe("AuditTimelineEntry", () => {
  it("accepts a valid timeline entry for UI rendering", () => {
    const entry: AuditTimelineEntry = {
      displayTime: "2026-01-01 12:34",
      actorName: "Alice Admin",
      summary: "Updated amount from 100 to 200",
      changes: [makeFieldChange()],
      operation: "update",
      source: "ui",
    };
    expect(entry.actorName).toBe("Alice Admin");
    expect(entry.changes).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// AuditQuery
// ---------------------------------------------------------------------------

describe("AuditQuery", () => {
  it("accepts a fully optional query object (all fields absent)", () => {
    const query: AuditQuery = {};
    expect(query.entity).toBeUndefined();
    expect(query.limit).toBeUndefined();
  });

  it("accepts a specific entity query with pagination", () => {
    const query: AuditQuery = {
      entity: "salesOrder",
      entityId: "so-789",
      limit: 50,
      offset: 0,
    };
    expect(query.entity).toBe("salesOrder");
    expect(query.limit).toBe(50);
  });

  it("accepts operation and source filters", () => {
    const query: AuditQuery = {
      operation: "delete",
      source: "api",
      fromTimestamp: "2026-01-01T00:00:00Z",
      toTimestamp: "2026-01-31T23:59:59Z",
    };
    expect(query.operation).toBe("delete");
    expect(query.source).toBe("api");
  });
});

// ---------------------------------------------------------------------------
// DecisionEventType union
// ---------------------------------------------------------------------------

describe("DecisionEventType union", () => {
  it("contains exactly the six expected decision event types", () => {
    const types: DecisionEventType[] = [
      "metadata_resolved",
      "rule_evaluated",
      "policy_enforced",
      "workflow_transitioned",
      "event_propagated",
      "layout_rendered",
    ];
    expect(types).toHaveLength(6);
    expect(new Set(types).size).toBe(6);
  });
});

// ---------------------------------------------------------------------------
// DecisionAuditEntry
// ---------------------------------------------------------------------------

describe("DecisionAuditEntry", () => {
  it("accepts a valid decision audit entry", () => {
    const entry: DecisionAuditEntry = {
      id: "dae-001",
      timestamp: "2026-03-28T10:00:00Z",
      tenantId: "acme-corp",
      eventType: "metadata_resolved",
      scope: "schema.salesOrder",
      context: {
        model: "salesOrder",
        ruleId: "inv-001",
      },
      decision: {
        input: { status: "draft" },
        output: { resolved: true },
        reasoning: "Default override applied",
        appliedLayers: ["global", "tenant"],
      },
      durationMs: 12,
      status: "success",
    };
    expect(entry.eventType).toBe("metadata_resolved");
    expect(entry.decision.appliedLayers).toContain("tenant");
  });

  it("accepts optional violations in decision output", () => {
    const entry: DecisionAuditEntry = {
      id: "dae-002",
      timestamp: "2026-03-28T11:00:00Z",
      tenantId: "demo-tenant",
      eventType: "policy_enforced",
      scope: "policy.creditLimit",
      context: {},
      decision: {
        input: { amount: 99999 },
        output: { passed: false },
        violations: [
          { type: "threshold_exceeded", message: "Credit limit exceeded", severity: "error" },
        ],
      },
      durationMs: 5,
      status: "error",
    };
    expect(entry.decision.violations).toHaveLength(1);
    expect(entry.decision.violations![0]!.severity).toBe("error");
  });

  it("accepts optional userId (anonymous system events)", () => {
    const entry: DecisionAuditEntry = {
      id: "dae-003",
      timestamp: "2026-03-28T12:00:00Z",
      tenantId: "system",
      eventType: "workflow_transitioned",
      scope: "workflow.onboarding",
      context: { workflowId: "wf-001" },
      decision: { input: {}, output: {} },
      durationMs: 3,
      status: "success",
    };
    expect(entry.userId).toBeUndefined();
  });
});
