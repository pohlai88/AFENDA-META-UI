import type { ResolutionSpec } from "./types.js";

export const resolutionSpec = [
  {
    key: "resolve_missing_fx_rate",
    resolutionId: "resolve_missing_fx_rate",
    resolutionClass: "role-resolvable",
    responsibleRole: "accountant",
    title: "Provide FX rate",
    summary: "Add or approve the missing FX conversion rate before retrying.",
    actions: [
      { type: "navigate", target: "/finance/fx-rates", label: "Open FX rates" },
      { type: "instruction", label: "Add or approve exchange rate for pair/date." },
      { type: "retry", label: "Retry settlement after FX basis exists" },
    ],
  },
  {
    key: "resolve_closed_period_block",
    resolutionId: "resolve_closed_period_block",
    resolutionClass: "role-resolvable",
    responsibleRole: "accountant",
    title: "Use an open period",
    summary:
      "Move the posting date into an open period or reopen the closed one through governance.",
    actions: [{ type: "navigate", target: "/finance/periods", label: "Open accounting periods" }],
  },
  {
    key: "resolve_duplicate_economic_effect",
    resolutionId: "resolve_duplicate_economic_effect",
    resolutionClass: "workflow-resolvable",
    responsibleRole: "finance_manager",
    title: "Review duplicate economic effect",
    summary: "Inspect the prior flow and supersede or cancel before retrying.",
    actions: [{ type: "workflow", target: "economic-effect-review", label: "Send to review workflow" }],
  },
  {
    key: "resolve_journal_imbalance",
    resolutionId: "resolve_journal_imbalance",
    resolutionClass: "role-resolvable",
    responsibleRole: "accountant",
    title: "Correct journal imbalance",
    summary: "Fix debit and credit amounts so the journal can post.",
    actions: [{ type: "instruction", label: "Review posting lines and ensure totals balance." }],
  },
  {
    key: "resolve_supersession_required_for_meaning_change",
    resolutionId: "resolve_supersession_required_for_meaning_change",
    resolutionClass: "workflow-resolvable",
    title: "Add supersession linkage",
    summary: "Attach the previous event reference and explicit supersession metadata.",
    actions: [
      {
        type: "instruction",
        label: "Provide previousEventId and reasoned supersession metadata before completing the change.",
      },
    ],
  },
] as const satisfies readonly ResolutionSpec[];
