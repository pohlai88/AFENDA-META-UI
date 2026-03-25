import { describe, it, expect, beforeEach } from "vitest";
import {
  upsertNode,
  getNode,
  getNodeByTypeId,
  removeNode,
  listNodes,
  createEdge,
  removeEdge,
  listEdges,
  queryGraph,
  getRelated,
  resolveConflict,
  getGraphStats,
  clearGraph,
} from "./index.js";

beforeEach(() => clearGraph());

// ---------------------------------------------------------------------------
// Node CRUD
// ---------------------------------------------------------------------------

describe("graph — nodes", () => {
  it("upserts and retrieves a node by composite ID", () => {
    const node = upsertNode("customer", "cust-1", { name: "Acme" }, 80);
    expect(node.id).toBe("customer:cust-1");
    expect(node.type).toBe("customer");
    expect(node.data).toEqual({ name: "Acme" });
    expect(node.truthPriority).toBe(80);
    expect(getNode("customer:cust-1")).toEqual(node);
  });

  it("returns the updated node when upserting with new data", () => {
    upsertNode("customer", "cust-1", { name: "Acme" }, 50);
    const updated = upsertNode("customer", "cust-1", { name: "Acme Corp" }, 80);
    expect(updated.data).toEqual({ name: "Acme Corp" });
    expect(updated.truthPriority).toBe(80);
    expect(listNodes("customer").length).toBe(1);
  });

  it("retrieves a node by type and localId", () => {
    upsertNode("order", "ord-99", { total: 500 }, 50);
    const node = getNodeByTypeId("order", "ord-99");
    expect(node?.id).toBe("order:ord-99");
  });

  it("returns undefined for unknown node", () => {
    expect(getNode("unknown:x")).toBeUndefined();
  });

  it("removes a node and cascades edge deletion", () => {
    upsertNode("customer", "c1", {}, 50);
    upsertNode("order", "o1", {}, 50);
    createEdge("customer:c1", "order:o1", "PLACED");

    expect(listEdges().length).toBe(1);
    removeNode("customer:c1");
    expect(getNode("customer:c1")).toBeUndefined();
    expect(listEdges().length).toBe(0);
  });

  it("listNodes filters by type", () => {
    upsertNode("customer", "c1", {}, 50);
    upsertNode("customer", "c2", {}, 50);
    upsertNode("order", "o1", {}, 50);

    expect(listNodes("customer").length).toBe(2);
    expect(listNodes("order").length).toBe(1);
    expect(listNodes().length).toBe(3);
  });
});

// ---------------------------------------------------------------------------
// Edge CRUD
// ---------------------------------------------------------------------------

describe("graph — edges", () => {
  beforeEach(() => {
    upsertNode("customer", "c1", {}, 80);
    upsertNode("order", "o1", {}, 80);
    upsertNode("employee", "e1", {}, 80);
  });

  it("creates an edge between two existing nodes", () => {
    const edge = createEdge("customer:c1", "order:o1", "PLACED");
    expect(edge).toBeDefined();
    expect(edge!.type).toBe("PLACED");
    expect(edge!.fromId).toBe("customer:c1");
    expect(edge!.toId).toBe("order:o1");
  });

  it("returns undefined when a referenced node does not exist", () => {
    const edge = createEdge("customer:c1", "order:missing", "PLACED");
    expect(edge).toBeUndefined();
  });

  it("creates edge with properties", () => {
    const edge = createEdge("order:o1", "employee:e1", "APPROVED_BY", {
      approvedAt: "2024-01-01",
    });
    expect(edge?.properties).toEqual({ approvedAt: "2024-01-01" });
  });

  it("removes an edge by ID", () => {
    const edge = createEdge("customer:c1", "order:o1", "PLACED");
    expect(removeEdge(edge!.id)).toBe(true);
    expect(listEdges().length).toBe(0);
  });

  it("returns false when removing a nonexistent edge", () => {
    expect(removeEdge("nonexistent")).toBe(false);
  });

  it("filters edges by type", () => {
    createEdge("customer:c1", "order:o1", "PLACED");
    createEdge("order:o1", "employee:e1", "APPROVED_BY");

    expect(listEdges({ type: "PLACED" }).length).toBe(1);
    expect(listEdges({ type: "APPROVED_BY" }).length).toBe(1);
  });

  it("filters edges by fromId and toId", () => {
    createEdge("customer:c1", "order:o1", "PLACED");
    createEdge("customer:c1", "employee:e1", "EMPLOYS");

    expect(listEdges({ fromId: "customer:c1" }).length).toBe(2);
    expect(listEdges({ toId: "order:o1" }).length).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// Graph Query (BFS)
// ---------------------------------------------------------------------------

describe("graph — query", () => {
  beforeEach(() => {
    upsertNode("customer", "c1", { name: "Acme" }, 80);
    upsertNode("order", "o1", { amount: 1000 }, 80);
    upsertNode("order", "o2", { amount: 500 }, 80);
    upsertNode("employee", "e1", { name: "Jane" }, 80);

    createEdge("customer:c1", "order:o1", "PLACED");
    createEdge("customer:c1", "order:o2", "PLACED");
    createEdge("order:o1", "employee:e1", "APPROVED_BY");
  });

  it("returns all nodes when no startNodeId is provided", () => {
    const result = queryGraph({});
    expect(result.nodes.length).toBe(4);
  });

  it("traverses from a start node at default depth 1", () => {
    const result = queryGraph({ startNodeId: "customer:c1", depth: 1 });
    expect(result.nodes.some((n) => n.id === "customer:c1")).toBe(true);
    expect(result.nodes.some((n) => n.id === "order:o1")).toBe(true);
    expect(result.nodes.some((n) => n.id === "order:o2")).toBe(true);
    // employee is depth 2 from customer — not included at depth 1
    expect(result.nodes.some((n) => n.id === "employee:e1")).toBe(false);
  });

  it("traverses deeper with depth 2", () => {
    const result = queryGraph({ startNodeId: "customer:c1", depth: 2 });
    expect(result.nodes.some((n) => n.id === "employee:e1")).toBe(true);
  });

  it("filters by nodeType", () => {
    const result = queryGraph({ nodeTypes: ["order"] });
    expect(result.nodes.every((n) => n.type === "order")).toBe(true);
    expect(result.nodes.length).toBe(2);
  });

  it("filters edges by edgeType", () => {
    const result = queryGraph({
      startNodeId: "customer:c1",
      edgeTypes: ["APPROVED_BY"],
      depth: 2,
    });
    // PLACED edges should be ignored → order nodes not reachable via APPROVED_BY from customer
    const nodeIds = result.nodes.map((n) => n.id);
    expect(nodeIds).toContain("customer:c1");
  });

  it("includes relevant edges in the result", () => {
    const result = queryGraph({ startNodeId: "customer:c1", depth: 1 });
    expect(result.edges.length).toBeGreaterThan(0);
    expect(result.edges.every((e) => e.fromId === "customer:c1")).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// getRelated
// ---------------------------------------------------------------------------

describe("graph — getRelated", () => {
  it("returns direct neighbor nodes via specified edge type", () => {
    upsertNode("customer", "c1", {}, 80);
    upsertNode("order", "o1", {}, 80);
    upsertNode("order", "o2", {}, 80);
    createEdge("customer:c1", "order:o1", "PLACED");
    createEdge("customer:c1", "order:o2", "PLACED");

    const related = getRelated("customer:c1", "PLACED");
    expect(related.length).toBe(2);
    expect(related.every((n) => n.type === "order")).toBe(true);
  });

  it("returns empty array when no matching edges", () => {
    upsertNode("customer", "c1", {}, 80);
    expect(getRelated("customer:c1", "PLACED")).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// Truth Resolution
// ---------------------------------------------------------------------------

describe("graph — truth resolution", () => {
  it("resolves conflict by highest truth priority", () => {
    const draft = upsertNode("order", "o1", { status: "draft" }, 50);
    const approved = upsertNode("order", "o1-v2", { status: "approved" }, 80);

    const conflict = resolveConflict([draft, approved]);
    expect(conflict).not.toBeNull();
    expect(conflict!.resolvedNode.data).toEqual({ status: "approved" });
    expect(conflict!.strategy).toBe("highest_priority");
  });

  it("resolves conflict by latest timestamp when priorities are equal", () => {
    const older = upsertNode("order", "o-old", { ver: 1 }, 80);
    // Ensure distinct timestamps by nudging updatedAt
    const newer = {
      ...upsertNode("order", "o-new", { ver: 2 }, 80),
      updatedAt: new Date(Date.now() + 1000).toISOString(),
    };

    const conflict = resolveConflict([older, newer]);
    expect(conflict!.resolvedNode.data).toEqual({ ver: 2 });
    expect(conflict!.strategy).toBe("latest_timestamp");
  });

  it("returns null for single-node input (no conflict)", () => {
    const node = upsertNode("order", "o1", {}, 80);
    expect(resolveConflict([node])).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Stats
// ---------------------------------------------------------------------------

describe("graph — stats", () => {
  it("reports correct node, edge, and type counts", () => {
    upsertNode("customer", "c1", {}, 80);
    upsertNode("order", "o1", {}, 80);
    createEdge("customer:c1", "order:o1", "PLACED");

    const stats = getGraphStats();
    expect(stats.nodes).toBe(2);
    expect(stats.edges).toBe(1);
    expect(stats.types).toContain("customer");
    expect(stats.types).toContain("order");
  });
});
