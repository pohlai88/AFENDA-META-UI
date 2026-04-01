import type { RelationSpec } from "./types.js";

export const relationSpec = [
  {
    key: "sales_order_to_inventory_reservation",
    from: "sales_order",
    to: "inventory_reservation",
    kind: "one-to-many",
    fromField: "sales_order_id",
    toField: "sales_order_id",
    description: "Reservations created from a sales order",
  },
  {
    key: "inventory_reservation_to_journal_entry",
    from: "inventory_reservation",
    to: "journal_entry",
    kind: "one-to-many",
    fromField: "inventory_reservation_id",
    toField: "inventory_reservation_id",
    description: "Journal entries justified by reservation flow",
  },
] as const satisfies readonly RelationSpec[];
