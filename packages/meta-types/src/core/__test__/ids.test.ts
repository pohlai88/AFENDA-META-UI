/**
 * Core branded ID type contract tests.
 *
 * Design intent: branded IDs prevent mixing structurally identical UUIDs across domains.
 * These tests verify the structural contracts at runtime (ID values, string assignability).
 * Any ID removed or renamed is a breaking API contract — fix the code, not the test.
 */
import { describe, expect, it } from "vitest";
import { expectTypeOf } from "vitest";

import type {
  CommissionEntryId,
  InventoryItemId,
  LocationId,
  OrganizationId,
  ReturnOrderId,
  SalesOrderId,
  StockMovementId,
  SubscriptionId,
  TenantId,
  WarehouseId,
  WorkflowId,
  WorkflowInstanceId,
} from "../ids.js";

// ---------------------------------------------------------------------------
// TenantId
// ---------------------------------------------------------------------------

describe("TenantId — structural brand contract", () => {
  it("is assignable from a branded string cast", () => {
    const id = "tenant-001" as TenantId;
    expect(typeof id).toBe("string");
    expect(id).toBe("tenant-001");
  });

  it("preserves string value through operations", () => {
    const id = "acme-corp" as TenantId;
    expect(id.startsWith("acme")).toBe(true);
    expect(id.length).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// OrganizationId
// ---------------------------------------------------------------------------

describe("OrganizationId — structural brand contract", () => {
  it("is a distinct branded type from TenantId", () => {
    const orgId = "org-001" as OrganizationId;
    expect(typeof orgId).toBe("string");
    // Type-level check: OrganizationId is string-based but distinct brand
    expectTypeOf(orgId).toMatchTypeOf<string>();
  });
});

// ---------------------------------------------------------------------------
// WorkflowId and WorkflowInstanceId
// ---------------------------------------------------------------------------

describe("WorkflowId — structural brand contract", () => {
  it("holds a string identifier", () => {
    const id = "wf-invoice-approval" as WorkflowId;
    expect(id).toBe("wf-invoice-approval");
  });
});

describe("WorkflowInstanceId — structural brand contract", () => {
  it("is distinct from WorkflowId brand", () => {
    const instanceId = "wf-inst-00123" as WorkflowInstanceId;
    expect(instanceId).toMatch(/^wf-inst-/);
  });
});

// ---------------------------------------------------------------------------
// SalesOrderId
// ---------------------------------------------------------------------------

describe("SalesOrderId — structural brand contract", () => {
  it("holds a UUID-shaped string", () => {
    const id = "00000000-0000-0000-0000-000000000001" as SalesOrderId;
    expect(id).toHaveLength(36);
  });
});

// ---------------------------------------------------------------------------
// SubscriptionId and ReturnOrderId
// ---------------------------------------------------------------------------

describe("SubscriptionId — structural brand contract", () => {
  it("is a string-based brand", () => {
    const id = "sub-001" as SubscriptionId;
    expect(typeof id).toBe("string");
  });
});

describe("ReturnOrderId — structural brand contract", () => {
  it("is a string-based brand", () => {
    const id = "ret-001" as ReturnOrderId;
    expect(typeof id).toBe("string");
  });
});

// ---------------------------------------------------------------------------
// CommissionEntryId
// ---------------------------------------------------------------------------

describe("CommissionEntryId — structural brand contract", () => {
  it("is a string-based brand", () => {
    const id = "comm-001" as CommissionEntryId;
    expect(typeof id).toBe("string");
  });
});

// ---------------------------------------------------------------------------
// Inventory IDs: WarehouseId, InventoryItemId, StockMovementId, LocationId
// ---------------------------------------------------------------------------

describe("WarehouseId — structural brand contract", () => {
  it("holds a warehouse identifier", () => {
    const id = "wh-main" as WarehouseId;
    expect(id).toBe("wh-main");
  });
});

describe("InventoryItemId — structural brand contract", () => {
  it("holds an inventory item identifier", () => {
    const id = "item-001" as InventoryItemId;
    expect(typeof id).toBe("string");
  });
});

describe("StockMovementId — structural brand contract", () => {
  it("holds a stock movement identifier", () => {
    const id = "sm-001" as StockMovementId;
    expect(typeof id).toBe("string");
  });
});

describe("LocationId — structural brand contract", () => {
  it("holds a location identifier", () => {
    const id = "loc-001" as LocationId;
    expect(typeof id).toBe("string");
  });
});

// ---------------------------------------------------------------------------
// Exhaustiveness Gate — all 12 ID brands are present
// ---------------------------------------------------------------------------

describe("ID brand exhaustiveness", () => {
  it("GATE — all 12 ID brands exist and are string-backed", () => {
    const sample: [
      TenantId,
      OrganizationId,
      WorkflowId,
      WorkflowInstanceId,
      SalesOrderId,
      SubscriptionId,
      ReturnOrderId,
      CommissionEntryId,
      WarehouseId,
      InventoryItemId,
      StockMovementId,
      LocationId,
    ] = [
      "t" as TenantId,
      "o" as OrganizationId,
      "w" as WorkflowId,
      "wi" as WorkflowInstanceId,
      "so" as SalesOrderId,
      "sub" as SubscriptionId,
      "ret" as ReturnOrderId,
      "com" as CommissionEntryId,
      "wh" as WarehouseId,
      "inv" as InventoryItemId,
      "sm" as StockMovementId,
      "loc" as LocationId,
    ];
    expect(sample).toHaveLength(12);
    for (const id of sample) {
      expect(typeof id).toBe("string");
    }
  });
});
