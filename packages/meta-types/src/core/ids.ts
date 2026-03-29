/**
 * @module core/ids
 * @description Branded ID types for all aggregate roots — prevents mixing structurally identical IDs.
 * @layer truth-contract
 */

import type { Brand } from "./types.js";

/** Branded tenant identifier. */
export type TenantId = Brand<string, "TenantId">;

/** Branded organization identifier. */
export type OrganizationId = Brand<string, "OrganizationId">;

/** Branded workflow definition identifier. */
export type WorkflowId = Brand<string, "WorkflowId">;

/** Branded workflow instance identifier. */
export type WorkflowInstanceId = Brand<string, "WorkflowInstanceId">;

/** Branded sales order identifier. */
export type SalesOrderId = Brand<string, "SalesOrderId">;

/** Branded subscription identifier. */
export type SubscriptionId = Brand<string, "SubscriptionId">;

/** Branded return order identifier. */
export type ReturnOrderId = Brand<string, "ReturnOrderId">;

/** Branded commission entry identifier. */
export type CommissionEntryId = Brand<string, "CommissionEntryId">;

/** Branded warehouse identifier. */
export type WarehouseId = Brand<string, "WarehouseId">;

/** Branded inventory item identifier. */
export type InventoryItemId = Brand<string, "InventoryItemId">;

/** Branded stock movement identifier. */
export type StockMovementId = Brand<string, "StockMovementId">;

/** Branded location identifier. */
export type LocationId = Brand<string, "LocationId">;
