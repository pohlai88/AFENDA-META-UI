/**
 * @module inventory
 * @description Inventory management contracts: warehouses, locations, stock movements, and items.
 * @layer truth-contract
 * @consumers api, web, db
 */

// ---------------------------------------------------------------------------
// Location & Warehouse
// ---------------------------------------------------------------------------

export type LocationType = "warehouse" | "zone" | "bin" | "staging" | "quarantine";

export interface LocationDefinition {
  id: string;
  name: string;
  type: LocationType;
  parentId?: string | null;
  warehouseId: string;
  barcode?: string;
  capacity?: number;
  enabled: boolean;
}

export interface WarehouseDefinition {
  id: string;
  tenantId: string;
  name: string;
  code: string;
  address?: string;
  enabled: boolean;
  defaultLocationId?: string;
}

// ---------------------------------------------------------------------------
// Stock & Movement
// ---------------------------------------------------------------------------

export type StockMovementType = "receipt" | "dispatch" | "transfer" | "adjustment" | "return";

export type StockMovementStatus = "draft" | "confirmed" | "in_progress" | "completed" | "cancelled";

export interface StockMovement {
  id: string;
  type: StockMovementType;
  status: StockMovementStatus;
  sourceLocationId?: string;
  destinationLocationId?: string;
  scheduledDate?: string;
  completedDate?: string;
  reference?: string;
  tenantId: string;
  lines: StockMovementLine[];
}

export interface StockMovementLine {
  id: string;
  itemId: string;
  quantity: number;
  unitOfMeasure: string;
  lotNumber?: string;
  serialNumber?: string;
}

// ---------------------------------------------------------------------------
// Inventory Item
// ---------------------------------------------------------------------------

export type ItemTrackingMethod = "none" | "lot" | "serial" | "lot_serial";

export interface InventoryItem {
  id: string;
  sku: string;
  name: string;
  description?: string;
  unitOfMeasure: string;
  trackingMethod: ItemTrackingMethod;
  reorderPoint?: number;
  reorderQuantity?: number;
  tenantId: string;
  enabled: boolean;
}
