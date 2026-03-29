/**
 * Compiler truth-model contract tests.
 *
 * Design intent: TruthModel is the normalized compiler manifest consumed by
 * the data and API layers. MutationPolicyDefinition drives event-sourcing
 * mutation routing. ProjectionDefinition drives read-model generation.
 * Any structural deviation here silently removes persistence or event guarantees.
 * Fix the contract, not the test.
 */
import { describe, expect, it } from "vitest";

import type {
  MutationOperation,
  MutationPolicy,
  MutationPolicyDefinition,
  ProjectionConsistency,
  ProjectionDefinition,
  ProjectionVersion,
  TruthModel,
} from "../truth-model.js";
import type { DomainEvent } from "../../events/types.js";

// ---------------------------------------------------------------------------
// TruthModel — structural contract
// ---------------------------------------------------------------------------

describe("TruthModel — required fields", () => {
  it("accepts a minimal manifest with only required arrays", () => {
    const model: TruthModel = {
      entities: ["Invoice", "Partner"],
      events: ["invoice.created", "invoice.approved"],
      invariants: ["invoice-amount-positive"],
      relationships: ["Invoice.partnerId → Partner.id"],
      policies: ["no-delete-approved-invoice"],
    };
    expect(model.entities).toHaveLength(2);
    expect(model.events).toHaveLength(2);
    expect(model.invariants).toHaveLength(1);
    expect(model.relationships).toHaveLength(1);
    expect(model.policies).toHaveLength(1);
  });

  it("accepts optional entityDefs array", () => {
    const model: TruthModel = {
      entities: ["Order"],
      events: [],
      invariants: [],
      relationships: [],
      policies: [],
      entityDefs: [],
    };
    expect(model.entityDefs).toEqual([]);
  });

  it("accepts optional crossInvariants", () => {
    const model: TruthModel = {
      entities: ["Invoice", "Payment"],
      events: ["payment.applied"],
      invariants: [],
      crossInvariants: ["invoice-payment-total-match"],
      relationships: ["Invoice.id ← Payment.invoiceId"],
      policies: [],
    };
    expect(model.crossInvariants).toHaveLength(1);
  });

  it("accepts optional stateMachines array", () => {
    const model: TruthModel = {
      entities: ["SalesOrder"],
      events: [],
      invariants: [],
      relationships: [],
      policies: [],
      stateMachines: ["order-status-machine"],
    };
    expect(model.stateMachines).toContain("order-status-machine");
  });

  it("accepts optional mutationPolicies array", () => {
    const policy: MutationPolicyDefinition = {
      id: "mp-001",
      mutationPolicy: "dual-write",
      appliesTo: ["invoice"],
    };
    const model: TruthModel = {
      entities: ["Invoice"],
      events: ["invoice.created"],
      invariants: [],
      relationships: [],
      policies: [],
      mutationPolicies: [policy],
    };
    expect(model.mutationPolicies).toHaveLength(1);
    expect(model.mutationPolicies?.[0]?.id).toBe("mp-001");
  });
});

// ---------------------------------------------------------------------------
// MutationPolicy — exhaustive union
// ---------------------------------------------------------------------------

describe("MutationPolicy — exhaustive literal union", () => {
  it("covers all three mutation strategies", () => {
    const strategies: MutationPolicy[] = ["direct", "dual-write", "event-only"];
    expect(strategies).toHaveLength(3);
  });

  it("'direct' means synchronous DB mutation only", () => {
    const policy: MutationPolicyDefinition = {
      id: "mp-direct",
      mutationPolicy: "direct",
      appliesTo: ["schema_registry"],
      directMutationOperations: ["create", "update"],
    };
    expect(policy.mutationPolicy).toBe("direct");
    expect(policy.directMutationOperations).toContain("create");
  });

  it("'dual-write' means both DB mutation and event emission", () => {
    const policy: MutationPolicyDefinition = {
      id: "mp-dual",
      mutationPolicy: "dual-write",
      appliesTo: ["invoice", "payment"],
      requiredEvents: ["invoice.created"],
    };
    expect(policy.mutationPolicy).toBe("dual-write");
    expect(policy.requiredEvents).toContain("invoice.created");
  });

  it("'event-only' means event store only — no direct DB writes", () => {
    const policy: MutationPolicyDefinition = {
      id: "mp-event-only",
      mutationPolicy: "event-only",
      appliesTo: ["audit_log"],
      requiredEvents: ["audit.entry.written"],
    };
    expect(policy.mutationPolicy).toBe("event-only");
  });
});

// ---------------------------------------------------------------------------
// MutationOperation — exhaustive union
// ---------------------------------------------------------------------------

describe("MutationOperation — exhaustive literal union", () => {
  it("covers create, update, and delete", () => {
    const ops: MutationOperation[] = ["create", "update", "delete"];
    expect(ops).toHaveLength(3);
  });
});

// ---------------------------------------------------------------------------
// MutationPolicyDefinition — structural contract
// ---------------------------------------------------------------------------

describe("MutationPolicyDefinition — structural contract", () => {
  it("accepts a minimal definition with only required fields", () => {
    const def: MutationPolicyDefinition = {
      id: "mp-minimal",
      mutationPolicy: "direct",
      appliesTo: ["users"],
    };
    expect(def.id).toBe("mp-minimal");
    expect(def.appliesTo).toContain("users");
    expect(def.description).toBeUndefined();
  });

  it("accepts a full definition with all optional fields", () => {
    const def: MutationPolicyDefinition = {
      id: "mp-full",
      mutationPolicy: "dual-write",
      appliesTo: ["orders", "order_lines"],
      requiredEvents: ["order.line.added"],
      directMutationOperations: ["create", "update"],
      description: "Orders use dual-write for event replay support",
      targetMode: "event-only",
    };
    expect(def.description).toMatch(/dual-write/);
    expect(def.directMutationOperations).toHaveLength(2);
    expect(def.targetMode).toBe("event-only");
  });
});

// ---------------------------------------------------------------------------
// ProjectionConsistency — exhaustive union
// ---------------------------------------------------------------------------

describe("ProjectionConsistency — exhaustive literal union", () => {
  it("covers realtime and materialized", () => {
    const modes: ProjectionConsistency[] = ["realtime", "materialized"];
    expect(modes).toHaveLength(2);
  });
});

// ---------------------------------------------------------------------------
// ProjectionVersion — structural contract
// ---------------------------------------------------------------------------

describe("ProjectionVersion — structural contract", () => {
  it("holds version number and schemaHash", () => {
    const v: ProjectionVersion = { version: 1, schemaHash: "abc123def456" };
    expect(v.version).toBe(1);
    expect(v.schemaHash).toBe("abc123def456");
  });
});

// ---------------------------------------------------------------------------
// ProjectionDefinition<TState> — structural contract
// ---------------------------------------------------------------------------

describe("ProjectionDefinition — structural contract", () => {
  interface InvoiceSummary {
    totalCount: number;
    totalAmount: number;
  }

  const sampleEvent: DomainEvent = {
    id: "evt-001",
    eventType: "invoice.created",
    aggregateId: "inv-001",
    aggregateType: "invoice",
    payload: { amount: 1000 },
    metadata: { tenantId: "acme", userId: "u1", timestamp: "2026-01-01T00:00:00Z" },
    version: 1,
    timestamp: "2026-01-01T00:00:00Z",
  };

  it("accepts a projection definition with all required fields", () => {
    const projection: ProjectionDefinition<InvoiceSummary> = {
      name: "invoice-summary",
      source: "invoice",
      consistency: "materialized",
      version: { version: 1, schemaHash: "sha-abc" },
      handler: (state, _event) => ({
        totalCount: state.totalCount + 1,
        totalAmount: state.totalAmount,
      }),
    };
    expect(projection.name).toBe("invoice-summary");
    expect(projection.source).toBe("invoice");
    expect(projection.consistency).toBe("materialized");
    expect(projection.version.version).toBe(1);
  });

  it("handler receives state and event and returns new state", () => {
    const projection: ProjectionDefinition<InvoiceSummary> = {
      name: "invoice-count",
      source: "invoice",
      consistency: "realtime",
      version: { version: 2, schemaHash: "sha-xyz" },
      handler: (state, _event) => ({
        totalCount: state.totalCount + 1,
        totalAmount: state.totalAmount + 500,
      }),
    };
    const initial: InvoiceSummary = { totalCount: 0, totalAmount: 0 };
    const next = projection.handler(initial, sampleEvent);
    expect(next.totalCount).toBe(1);
    expect(next.totalAmount).toBe(500);
  });

  it("handler is a pure function (same input produces same output)", () => {
    const projection: ProjectionDefinition<{ count: number }> = {
      name: "count-proj",
      source: "orders",
      consistency: "realtime",
      version: { version: 1, schemaHash: "h1" },
      handler: (state, _event) => ({ count: state.count + 1 }),
    };
    const initial = { count: 0 };
    const r1 = projection.handler(initial, sampleEvent);
    const r2 = projection.handler(initial, sampleEvent);
    expect(r1.count).toBe(r2.count);
  });
});
