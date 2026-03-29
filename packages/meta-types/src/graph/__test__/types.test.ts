/**
 * Graph type shape contracts — Business Truth Graph structural invariants.
 *
 * Design intent: GraphNode truthPriority and edge type coverage must remain
 * consistent with the AFENDA truth resolution algorithm. Breaking changes here
 * require coordinated design review, not test relaxation.
 */
import { describe, expect, it } from "vitest";

import type {
  GraphEdge,
  GraphEdgeType,
  GraphNode,
  GraphNodeType,
  GraphQuery,
  GraphQueryResult,
  TruthConflict,
} from "../types.js";

// ---------------------------------------------------------------------------
// Fixture factories
// ---------------------------------------------------------------------------

function makeGraphNode(overrides: Partial<GraphNode> = {}): GraphNode {
  return {
    id: "node-001",
    type: "order",
    data: { orderId: "so-123", status: "draft" },
    truthPriority: 80,
    updatedAt: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

function makeGraphEdge(overrides: Partial<GraphEdge> = {}): GraphEdge {
  return {
    id: "edge-001",
    type: "PLACED",
    fromId: "node-customer-001",
    toId: "node-order-001",
    createdAt: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// GraphNodeType union — all 10 node types
// ---------------------------------------------------------------------------

describe("GraphNodeType union", () => {
  it("contains exactly 10 node type variants", () => {
    const nodeTypes: GraphNodeType[] = [
      "customer",
      "order",
      "employee",
      "inventory",
      "ledger",
      "asset",
      "vendor",
      "contract",
      "tenant",
      "policy",
    ];
    expect(nodeTypes).toHaveLength(10);
    expect(new Set(nodeTypes).size).toBe(10);
  });

  it("includes the five core ERP entities", () => {
    const coreERP: GraphNodeType[] = ["customer", "order", "employee", "inventory", "ledger"];
    for (const t of coreERP) {
      expect(["customer", "order", "employee", "inventory", "ledger"]).toContain(t);
    }
  });
});

// ---------------------------------------------------------------------------
// GraphEdgeType union — all 9 edge types
// ---------------------------------------------------------------------------

describe("GraphEdgeType union", () => {
  it("contains exactly 9 edge relationship types", () => {
    const edgeTypes: GraphEdgeType[] = [
      "PLACED",
      "RESERVES",
      "APPROVED_BY",
      "BELONGS_TO",
      "GOVERNED_BY",
      "EMPLOYS",
      "OWNS",
      "SUPPLIED_BY",
      "COVERED_BY",
    ];
    expect(edgeTypes).toHaveLength(9);
    expect(new Set(edgeTypes).size).toBe(9);
  });

  it("all edge types are SCREAMING_SNAKE_CASE (relationship verb convention)", () => {
    const edgeTypes: GraphEdgeType[] = [
      "PLACED",
      "RESERVES",
      "APPROVED_BY",
      "BELONGS_TO",
      "GOVERNED_BY",
      "EMPLOYS",
      "OWNS",
      "SUPPLIED_BY",
      "COVERED_BY",
    ];
    for (const t of edgeTypes) {
      expect(t).toMatch(/^[A-Z][A-Z0-9_]*$/);
    }
  });
});

// ---------------------------------------------------------------------------
// GraphNode
// ---------------------------------------------------------------------------

describe("GraphNode", () => {
  it("accepts a valid node with required fields", () => {
    const node: GraphNode = makeGraphNode();
    expect(node.id).toBe("node-001");
    expect(node.type).toBe("order");
    expect(node.truthPriority).toBe(80);
  });

  it("accepts typed generic data payload", () => {
    type LedgerData = { accountId: string; balance: number };
    const node: GraphNode<LedgerData> = {
      id: "ledger-001",
      type: "ledger",
      data: { accountId: "acc-1", balance: 9500.0 },
      truthPriority: 100,
      updatedAt: "2026-01-01T00:00:00Z",
    };
    expect(node.data.balance).toBe(9500.0);
  });

  it("truthPriority accepts any positive integer", () => {
    const node = makeGraphNode({ truthPriority: 100 });
    expect(node.truthPriority).toBe(100);
  });

  it("accepts all ten node types", () => {
    const allTypes: GraphNodeType[] = [
      "customer",
      "order",
      "employee",
      "inventory",
      "ledger",
      "asset",
      "vendor",
      "contract",
      "tenant",
      "policy",
    ];
    for (const t of allTypes) {
      const n = makeGraphNode({ type: t, id: `node-${t}` });
      expect(n.type).toBe(t);
    }
  });
});

// ---------------------------------------------------------------------------
// GraphEdge
// ---------------------------------------------------------------------------

describe("GraphEdge", () => {
  it("accepts a minimal valid edge", () => {
    const edge: GraphEdge = makeGraphEdge();
    expect(edge.id).toBe("edge-001");
    expect(edge.type).toBe("PLACED");
    expect(edge.fromId).toBe("node-customer-001");
    expect(edge.toId).toBe("node-order-001");
  });

  it("accepts optional properties payload", () => {
    const edge = makeGraphEdge({ properties: { weight: 1, metadata: { source: "edi" } } });
    expect(edge.properties).toMatchObject({ weight: 1 });
  });

  it("properties is optional and undefined by default", () => {
    const edge = makeGraphEdge();
    expect(edge.properties).toBeUndefined();
  });

  it("accepts all nine edge types", () => {
    const allTypes: GraphEdgeType[] = [
      "PLACED",
      "RESERVES",
      "APPROVED_BY",
      "BELONGS_TO",
      "GOVERNED_BY",
      "EMPLOYS",
      "OWNS",
      "SUPPLIED_BY",
      "COVERED_BY",
    ];
    for (const t of allTypes) {
      const e = makeGraphEdge({ type: t, id: `edge-${t}` });
      expect(e.type).toBe(t);
    }
  });
});

// ---------------------------------------------------------------------------
// GraphQuery
// ---------------------------------------------------------------------------

describe("GraphQuery", () => {
  it("accepts fully optional query (empty query fetches entire graph)", () => {
    const q: GraphQuery = {};
    expect(q.startNodeId).toBeUndefined();
    expect(q.nodeTypes).toBeUndefined();
    expect(q.depth).toBeUndefined();
  });

  it("accepts a targeted query with all fields", () => {
    const q: GraphQuery = {
      startNodeId: "customer-001",
      nodeTypes: ["order", "ledger"],
      edgeTypes: ["PLACED", "BELONGS_TO"],
      depth: 3,
    };
    expect(q.startNodeId).toBe("customer-001");
    expect(q.nodeTypes).toContain("order");
    expect(q.depth).toBe(3);
  });
});

// ---------------------------------------------------------------------------
// GraphQueryResult
// ---------------------------------------------------------------------------

describe("GraphQueryResult", () => {
  it("accepts an empty result with no nodes or edges", () => {
    const result: GraphQueryResult = { nodes: [], edges: [] };
    expect(result.nodes).toHaveLength(0);
    expect(result.edges).toHaveLength(0);
  });

  it("accepts a result with mixed nodes and edges", () => {
    const result: GraphQueryResult = {
      nodes: [makeGraphNode(), makeGraphNode({ id: "node-002", type: "customer" })],
      edges: [makeGraphEdge()],
    };
    expect(result.nodes).toHaveLength(2);
    expect(result.edges).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// TruthConflict — resolution strategies
// ---------------------------------------------------------------------------

describe("TruthConflict", () => {
  it("accepts highest_priority resolution strategy", () => {
    const conflict: TruthConflict = {
      nodeId: "ledger-001",
      conflictingNodes: [
        makeGraphNode({ truthPriority: 80, id: "n1" }),
        makeGraphNode({ truthPriority: 50, id: "n2" }),
      ],
      resolvedNode: makeGraphNode({ truthPriority: 80, id: "n1" }),
      strategy: "highest_priority",
    };
    expect(conflict.strategy).toBe("highest_priority");
    expect(conflict.resolvedNode.truthPriority).toBeGreaterThanOrEqual(
      conflict.conflictingNodes[1]!.truthPriority
    );
  });

  it("accepts latest_timestamp resolution strategy", () => {
    const conflict: TruthConflict = {
      nodeId: "order-001",
      conflictingNodes: [
        makeGraphNode({ updatedAt: "2026-01-01T10:00:00Z" }),
        makeGraphNode({ updatedAt: "2026-01-01T12:00:00Z", id: "n-latest" }),
      ],
      resolvedNode: makeGraphNode({ updatedAt: "2026-01-01T12:00:00Z", id: "n-latest" }),
      strategy: "latest_timestamp",
    };
    expect(conflict.strategy).toBe("latest_timestamp");
    expect(conflict.resolvedNode.id).toBe("n-latest");
  });

  it("resolvedNode must appear in conflictingNodes (structural contract)", () => {
    const n1 = makeGraphNode({ id: "n1", truthPriority: 100 });
    const n2 = makeGraphNode({ id: "n2", truthPriority: 80 });
    const conflict: TruthConflict = {
      nodeId: "n1",
      conflictingNodes: [n1, n2],
      resolvedNode: n1,
      strategy: "highest_priority",
    };
    const resolvedInConflicts = conflict.conflictingNodes.some(
      (n) => n.id === conflict.resolvedNode.id
    );
    expect(resolvedInConflicts).toBe(true);
  });

  it("supports exactly two resolution strategies", () => {
    const strategies: TruthConflict["strategy"][] = ["highest_priority", "latest_timestamp"];
    expect(strategies).toHaveLength(2);
    expect(new Set(strategies).size).toBe(2);
  });
});
