import type { DoctrineSpec } from "./types.js";

export const doctrineSpec = [
  {
    key: "ias21_fx_conversion",
    family: "IAS",
    standard: "IAS 21",
    section: "Foreign currency translation",
    clauseRef: "policy://ias21/fx-translation",
    title: "Currency conversion basis must be preserved",
    interpretation: "strict",
  },
  {
    key: "double_entry_balance",
    family: "Accounting-Control",
    standard: "Accounting Truth Contract",
    section: "Journal balance",
    clauseRef: "policy://accounting/journal-balance",
    title: "Every journal posting must remain balanced",
    interpretation: "strict",
  },
  {
    key: "closed_period_block",
    family: "Accounting-Control",
    standard: "Accounting Truth Contract",
    section: "Posting period integrity",
    title: "No posting may enter a closed accounting period",
    interpretation: "strict",
  },
  {
    key: "economic_effect_uniqueness",
    family: "Economic-Integrity",
    standard: "Economic Flow Integrity",
    section: "Duplicate prevention",
    title: "A single economic effect must not be applied twice",
    interpretation: "strict",
  },
  {
    key: "supersession_required_for_meaning_change",
    family: "Temporal-Memory",
    standard: "Append-only Memory",
    section: "Supersession integrity",
    title: "Meaningful state replacement requires explicit supersession linkage",
    interpretation: "strict",
  },
  {
    key: "accounting_truth_contract",
    family: "Accounting-Control",
    standard: "Accounting Truth Contract",
    section: "Projection authority",
    title: "Authoritative projection requires a clean truth contract",
    interpretation: "strict",
  },
] as const satisfies readonly DoctrineSpec[];
