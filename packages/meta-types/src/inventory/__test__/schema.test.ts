/**
 * Inventory Zod schema contract tests.
 *
 * Design intent: Inventory schemas enforce numeric constraints (positive quantities,
 * non-negative stock levels, min-length strings). Any relaxation of these constraints
 * is a domain correctness regression — fix the code, not the test.
 */
import { describe, expect, it } from "vitest";

import {
  InventoryItemSchema,
  ItemTrackingMethodSchema,
  LocationDefinitionSchema,
  LocationTypeSchema,
  StockMovementLineSchema,
  StockMovementSchema,
  StockMovementStatusSchema,
  StockMovementTypeSchema,
  WarehouseDefinitionSchema,
} from "../types.schema.js";

// ---------------------------------------------------------------------------
// LocationTypeSchema — enum
// ---------------------------------------------------------------------------

describe("LocationTypeSchema", () => {
  it("parses all location types", () => {
    const types = ["warehouse", "zone", "bin", "staging", "quarantine"] as const;
    for (const t of types) {
      expect(LocationTypeSchema.safeParse(t).success, `type '${t}'`).toBe(true);
    }
  });

  it("rejects unrecognized type", () => {
    expect(LocationTypeSchema.safeParse("shelf").success).toBe(false);
    expect(LocationTypeSchema.safeParse("rack").success).toBe(false);
    expect(LocationTypeSchema.safeParse("").success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// StockMovementTypeSchema — enum
// ---------------------------------------------------------------------------

describe("StockMovementTypeSchema", () => {
  it("parses all stock movement types", () => {
    const types = ["receipt", "dispatch", "transfer", "adjustment", "return"] as const;
    for (const t of types) {
      expect(StockMovementTypeSchema.safeParse(t).success, `movement type '${t}'`).toBe(true);
    }
  });

  it("rejects unknown movement type", () => {
    expect(StockMovementTypeSchema.safeParse("issue").success).toBe(false);
    expect(StockMovementTypeSchema.safeParse("shipment").success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// StockMovementStatusSchema — enum
// ---------------------------------------------------------------------------

describe("StockMovementStatusSchema", () => {
  it("parses all stock movement statuses", () => {
    const statuses = ["draft", "confirmed", "in_progress", "completed", "cancelled"] as const;
    for (const s of statuses) {
      expect(StockMovementStatusSchema.safeParse(s).success, `status '${s}'`).toBe(true);
    }
  });

  it("rejects invalid status", () => {
    expect(StockMovementStatusSchema.safeParse("pending").success).toBe(false);
    expect(StockMovementStatusSchema.safeParse("open").success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// ItemTrackingMethodSchema — enum
// ---------------------------------------------------------------------------

describe("ItemTrackingMethodSchema", () => {
  it("parses all tracking methods", () => {
    const methods = ["none", "lot", "serial", "lot_serial"] as const;
    for (const m of methods) {
      expect(ItemTrackingMethodSchema.safeParse(m).success, `method '${m}'`).toBe(true);
    }
  });

  it("contains exactly 4 tracking methods (exhaustiveness gate)", () => {
    expect(ItemTrackingMethodSchema.options).toHaveLength(4);
  });

  it("rejects unknown tracking method", () => {
    expect(ItemTrackingMethodSchema.safeParse("batch").success).toBe(false);
    expect(ItemTrackingMethodSchema.safeParse("rfid").success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// LocationDefinitionSchema
// ---------------------------------------------------------------------------

describe("LocationDefinitionSchema — valid inputs", () => {
  it("parses a minimal bin location", () => {
    const result = LocationDefinitionSchema.safeParse({
      id: "loc-001",
      warehouseId: "wh-main",
      name: "Aisle 1 Bin B",
      type: "bin",
      enabled: true,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.type).toBe("bin");
      expect(result.data.enabled).toBe(true);
    }
  });

  it("parses a zone location with capacity", () => {
    const result = LocationDefinitionSchema.safeParse({
      id: "loc-002",
      warehouseId: "wh-main",
      name: "Bulk Zone",
      type: "zone",
      enabled: true,
      capacity: 1000,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.capacity).toBe(1000);
    }
  });

  it("parses a quarantine location", () => {
    const result = LocationDefinitionSchema.safeParse({
      id: "loc-quar",
      warehouseId: "wh-main",
      name: "Quarantine Hold",
      type: "quarantine",
      enabled: true,
    });
    expect(result.success).toBe(true);
  });
});

describe("LocationDefinitionSchema — invalid inputs", () => {
  it("rejects empty name string", () => {
    expect(
      LocationDefinitionSchema.safeParse({
        id: "l1",
        warehouseId: "wh",
        name: "",
        type: "bin",
        enabled: true,
      }).success
    ).toBe(false);
  });

  it("rejects invalid location type", () => {
    expect(
      LocationDefinitionSchema.safeParse({
        id: "l1",
        warehouseId: "wh",
        name: "N",
        type: "shelf",
        enabled: true,
      }).success
    ).toBe(false);
  });

  it("rejects missing enabled field", () => {
    expect(
      LocationDefinitionSchema.safeParse({ id: "l1", warehouseId: "wh", name: "N", type: "bin" })
        .success
    ).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// WarehouseDefinitionSchema
// ---------------------------------------------------------------------------

describe("WarehouseDefinitionSchema — valid inputs", () => {
  it("parses a minimal warehouse", () => {
    const result = WarehouseDefinitionSchema.safeParse({
      id: "wh-main",
      tenantId: "tenant-acme",
      code: "WH-MAIN",
      name: "Main Warehouse",
      enabled: true,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.code).toBe("WH-MAIN");
      expect(result.data.enabled).toBe(true);
    }
  });

  it("parses a warehouse with optional address string", () => {
    const result = WarehouseDefinitionSchema.safeParse({
      id: "wh-secondary",
      tenantId: "tenant-acme",
      code: "WH-SEC",
      name: "Secondary Warehouse",
      enabled: false,
      address: "123 Industrial Ave, Hamburg, 20095, DE",
      defaultLocationId: "loc-main-floor",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.enabled).toBe(false);
      expect(result.data.address).toMatch("Hamburg");
      expect(result.data.defaultLocationId).toBe("loc-main-floor");
    }
  });
});

describe("WarehouseDefinitionSchema — invalid inputs", () => {
  it("rejects missing tenantId", () => {
    expect(
      WarehouseDefinitionSchema.safeParse({ id: "wh1", code: "W", name: "N", enabled: true })
        .success
    ).toBe(false);
  });

  it("rejects empty code string", () => {
    expect(
      WarehouseDefinitionSchema.safeParse({
        id: "wh1",
        tenantId: "t1",
        code: "",
        name: "N",
        enabled: true,
      }).success
    ).toBe(false);
  });

  it("rejects missing enabled field", () => {
    expect(
      WarehouseDefinitionSchema.safeParse({ id: "wh1", tenantId: "t1", code: "W", name: "N" })
        .success
    ).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// StockMovementLineSchema — numeric constraint enforcement
// ---------------------------------------------------------------------------

describe("StockMovementLineSchema — valid inputs", () => {
  it("parses a valid movement line", () => {
    const result = StockMovementLineSchema.safeParse({
      id: "line-001",
      itemId: "item-sku-001",
      quantity: 10,
      unitOfMeasure: "each",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.quantity).toBe(10);
      expect(result.data.unitOfMeasure).toBe("each");
    }
  });

  it("parses a lot-tracked movement line", () => {
    const result = StockMovementLineSchema.safeParse({
      id: "line-002",
      itemId: "item-fluid",
      quantity: 50,
      unitOfMeasure: "kg",
      lotNumber: "LOT-2026-001",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.lotNumber).toBe("LOT-2026-001");
    }
  });

  it("parses a serial-tracked line", () => {
    const result = StockMovementLineSchema.safeParse({
      id: "line-003",
      itemId: "item-laptop",
      quantity: 1,
      unitOfMeasure: "pcs",
      serialNumber: "SN-ABC-001",
    });
    expect(result.success).toBe(true);
  });
});

describe("StockMovementLineSchema — CRITICAL: positive quantity constraint", () => {
  it("rejects zero quantity — stock movements must transfer a positive amount", () => {
    const result = StockMovementLineSchema.safeParse({
      id: "l1",
      itemId: "item-001",
      quantity: 0,
      unitOfMeasure: "each",
    });
    expect(result.success).toBe(false);
  });

  it("rejects negative quantity — negative transfers corrupt stock levels", () => {
    const result = StockMovementLineSchema.safeParse({
      id: "l1",
      itemId: "item-001",
      quantity: -1,
      unitOfMeasure: "each",
    });
    expect(result.success).toBe(false);
  });

  it("rejects quantity of -0.001 (subtle negative)", () => {
    const result = StockMovementLineSchema.safeParse({
      id: "l1",
      itemId: "item-001",
      quantity: -0.001,
      unitOfMeasure: "each",
    });
    expect(result.success).toBe(false);
  });
});

describe("StockMovementLineSchema — invalid inputs", () => {
  it("rejects missing id", () => {
    expect(
      StockMovementLineSchema.safeParse({ itemId: "i1", quantity: 5, unitOfMeasure: "each" })
        .success
    ).toBe(false);
  });

  it("rejects missing unitOfMeasure", () => {
    expect(StockMovementLineSchema.safeParse({ id: "l1", itemId: "i1", quantity: 5 }).success).toBe(
      false
    );
  });

  it("rejects empty unitOfMeasure string", () => {
    expect(
      StockMovementLineSchema.safeParse({ id: "l1", itemId: "i1", quantity: 5, unitOfMeasure: "" })
        .success
    ).toBe(false);
  });

  it("rejects missing itemId", () => {
    expect(
      StockMovementLineSchema.safeParse({ id: "l1", quantity: 5, unitOfMeasure: "each" }).success
    ).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// StockMovementSchema
// ---------------------------------------------------------------------------

describe("StockMovementSchema — valid inputs", () => {
  it("parses a minimal draft receipt movement", () => {
    const result = StockMovementSchema.safeParse({
      id: "mov-001",
      tenantId: "tenant-acme",
      type: "receipt",
      status: "draft",
      lines: [{ id: "line-1", itemId: "item-001", quantity: 5, unitOfMeasure: "each" }],
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.type).toBe("receipt");
      expect(result.data.lines).toHaveLength(1);
    }
  });

  it("parses a dispatch with source location and scheduled date", () => {
    const result = StockMovementSchema.safeParse({
      id: "mov-dispatch-001",
      tenantId: "tenant-acme",
      type: "dispatch",
      status: "confirmed",
      sourceLocationId: "loc-main-floor",
      destinationLocationId: "loc-staging-out",
      scheduledDate: "2026-01-20",
      reference: "SO-2026-001",
      lines: [{ id: "line-2", itemId: "item-002", quantity: 20, unitOfMeasure: "pcs" }],
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.type).toBe("dispatch");
      expect(result.data.reference).toBe("SO-2026-001");
    }
  });
});

describe("StockMovementSchema — invalid inputs", () => {
  it("rejects missing tenantId", () => {
    expect(
      StockMovementSchema.safeParse({ id: "m1", type: "receipt", status: "draft", lines: [] })
        .success
    ).toBe(false);
  });

  it("rejects invalid movement type", () => {
    expect(
      StockMovementSchema.safeParse({
        id: "m1",
        tenantId: "t1",
        type: "issue",
        status: "draft",
        lines: [],
      }).success
    ).toBe(false);
  });

  it("rejects invalid status value", () => {
    expect(
      StockMovementSchema.safeParse({
        id: "m1",
        tenantId: "t1",
        type: "receipt",
        status: "pending",
        lines: [],
      }).success
    ).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// InventoryItemSchema — numeric constraint enforcement
// ---------------------------------------------------------------------------

describe("InventoryItemSchema — valid inputs", () => {
  it("parses a minimal inventory item", () => {
    const result = InventoryItemSchema.safeParse({
      id: "item-001",
      tenantId: "tenant-acme",
      sku: "SKU-A001",
      name: "Widget A",
      unitOfMeasure: "each",
      trackingMethod: "none",
      enabled: true,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.sku).toBe("SKU-A001");
      expect(result.data.unitOfMeasure).toBe("each");
    }
  });

  it("parses a fully specified inventory item", () => {
    const result = InventoryItemSchema.safeParse({
      id: "item-002",
      tenantId: "tenant-acme",
      sku: "SKU-B002",
      name: "Premium Widget B",
      description: "High-quality precision widget",
      unitOfMeasure: "kg",
      trackingMethod: "lot",
      reorderPoint: 100,
      reorderQuantity: 500,
      enabled: true,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.reorderPoint).toBe(100);
      expect(result.data.reorderQuantity).toBe(500);
    }
  });

  it("accepts lot_serial tracking method", () => {
    const result = InventoryItemSchema.safeParse({
      id: "item-003",
      tenantId: "t1",
      sku: "SKU-LS",
      name: "Lot+Serial Item",
      unitOfMeasure: "pcs",
      trackingMethod: "lot_serial",
      enabled: true,
    });
    expect(result.success).toBe(true);
  });

  it("accepts reorderPoint of zero", () => {
    const result = InventoryItemSchema.safeParse({
      id: "item-004",
      tenantId: "t1",
      sku: "SKU-ZZ",
      name: "Item Z",
      unitOfMeasure: "m",
      trackingMethod: "none",
      enabled: false,
      reorderPoint: 0,
    });
    expect(result.success).toBe(true);
  });
});

describe("InventoryItemSchema — CRITICAL: constraint enforcement", () => {
  it("rejects negative reorderPoint — stock thresholds cannot be negative", () => {
    const result = InventoryItemSchema.safeParse({
      id: "item-005",
      tenantId: "t1",
      sku: "SKU-C",
      name: "Item",
      unitOfMeasure: "each",
      trackingMethod: "none",
      enabled: true,
      reorderPoint: -1,
    });
    expect(result.success).toBe(false);
  });

  it("rejects empty sku string", () => {
    expect(
      InventoryItemSchema.safeParse({
        id: "i1",
        tenantId: "t1",
        sku: "",
        name: "Item",
        unitOfMeasure: "each",
        trackingMethod: "none",
        enabled: true,
      }).success
    ).toBe(false);
  });

  it("rejects empty name string", () => {
    expect(
      InventoryItemSchema.safeParse({
        id: "i1",
        tenantId: "t1",
        sku: "SKU",
        name: "",
        unitOfMeasure: "each",
        trackingMethod: "none",
        enabled: true,
      }).success
    ).toBe(false);
  });

  it("rejects empty unitOfMeasure string", () => {
    expect(
      InventoryItemSchema.safeParse({
        id: "i1",
        tenantId: "t1",
        sku: "SKU",
        name: "Item",
        unitOfMeasure: "",
        trackingMethod: "none",
        enabled: true,
      }).success
    ).toBe(false);
  });

  it("rejects invalid tracking method", () => {
    expect(
      InventoryItemSchema.safeParse({
        id: "i1",
        tenantId: "t1",
        sku: "SKU",
        name: "Item",
        unitOfMeasure: "each",
        trackingMethod: "batch",
        enabled: true,
      }).success
    ).toBe(false);
  });

  it("rejects missing enabled field", () => {
    expect(
      InventoryItemSchema.safeParse({
        id: "i1",
        tenantId: "t1",
        sku: "SKU",
        name: "Item",
        unitOfMeasure: "each",
        trackingMethod: "none",
      }).success
    ).toBe(false);
  });
});
