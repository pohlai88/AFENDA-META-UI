import type { IdentityKind } from "./types.js";

export const identitySpec = [
  {
    key: "tenant_id",
    brand: "TenantId",
    description: "Tenant boundary identity",
  },
  {
    key: "sales_order_id",
    brand: "SalesOrderId",
    description: "Sales order identity",
  },
  {
    key: "inventory_reservation_id",
    brand: "InventoryReservationId",
    description: "Inventory reservation identity",
  },
  {
    key: "journal_entry_id",
    brand: "JournalEntryId",
    description: "Journal posting identity",
  },
  {
    key: "memory_event_id",
    brand: "MemoryEventId",
    description: "Append-only memory record identity",
  },
] as const satisfies readonly IdentityKind[];
