/**
 * @module inventory/types.schema
 * @description Zod schemas for inventory domain: warehouses, locations, stock movements, and items.
 * @layer truth-contract
 */

import { z } from "zod";

// ---------------------------------------------------------------------------
// Location & Warehouse Schemas
// ---------------------------------------------------------------------------

export const LocationTypeSchema = z.enum([
  "warehouse",
  "zone",
  "bin",
  "staging",
  "quarantine",
]);

export const LocationDefinitionSchema = z.object({
  id: z.string(),
  name: z.string().min(1),
  type: LocationTypeSchema,
  parentId: z.string().nullable().optional(),
  warehouseId: z.string(),
  barcode: z.string().optional(),
  capacity: z.number().int().nonnegative().optional(),
  enabled: z.boolean(),
});

export const WarehouseDefinitionSchema = z.object({
  id: z.string(),
  tenantId: z.string(),
  name: z.string().min(1),
  code: z.string().min(1),
  address: z.string().optional(),
  enabled: z.boolean(),
  defaultLocationId: z.string().optional(),
});

// ---------------------------------------------------------------------------
// Stock & Movement Schemas
// ---------------------------------------------------------------------------

export const StockMovementTypeSchema = z.enum([
  "receipt",
  "dispatch",
  "transfer",
  "adjustment",
  "return",
]);

export const StockMovementStatusSchema = z.enum([
  "draft",
  "confirmed",
  "in_progress",
  "completed",
  "cancelled",
]);

export const StockMovementLineSchema = z.object({
  id: z.string(),
  itemId: z.string(),
  quantity: z.number().positive(),
  unitOfMeasure: z.string().min(1),
  lotNumber: z.string().optional(),
  serialNumber: z.string().optional(),
});

export const StockMovementSchema = z.object({
  id: z.string(),
  type: StockMovementTypeSchema,
  status: StockMovementStatusSchema,
  sourceLocationId: z.string().optional(),
  destinationLocationId: z.string().optional(),
  scheduledDate: z.string().optional(),
  completedDate: z.string().optional(),
  reference: z.string().optional(),
  tenantId: z.string(),
  lines: z.array(StockMovementLineSchema),
});

// ---------------------------------------------------------------------------
// Inventory Item Schema
// ---------------------------------------------------------------------------

export const ItemTrackingMethodSchema = z.enum([
  "none",
  "lot",
  "serial",
  "lot_serial",
]);

export const InventoryItemSchema = z.object({
  id: z.string(),
  sku: z.string().min(1),
  name: z.string().min(1),
  description: z.string().optional(),
  unitOfMeasure: z.string().min(1),
  trackingMethod: ItemTrackingMethodSchema,
  reorderPoint: z.number().int().nonnegative().optional(),
  reorderQuantity: z.number().int().positive().optional(),
  tenantId: z.string(),
  enabled: z.boolean(),
});
