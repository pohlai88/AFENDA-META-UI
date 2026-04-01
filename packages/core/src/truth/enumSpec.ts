import type { EnumSpec } from "./types.js";

export const enumSpec = [
  {
    key: "authority_status",
    description: "Projection authority status",
    values: [{ value: "authoritative" }, { value: "blocked" }],
  },
  {
    key: "invariant_severity",
    values: [{ value: "critical" }, { value: "warning" }],
  },
  {
    key: "invariant_timing",
    values: [{ value: "pre-commit" }, { value: "post-commit" }],
  },
  {
    key: "document_flow_stage",
    values: [
      { value: "sales_order" },
      { value: "inventory_reservation" },
      { value: "journal_posting" },
    ],
  },
] as const satisfies readonly EnumSpec[];
