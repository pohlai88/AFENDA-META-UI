// AUTO-GENERATED FILE. DO NOT EDIT.
// resolutions.ts

export const resolutions = [
  {
    "key": "resolve_missing_fx_rate",
    "resolutionId": "resolve_missing_fx_rate",
    "resolutionClass": "role-resolvable",
    "responsibleRole": "accountant",
    "title": "Provide FX rate",
    "summary": "Add or approve the missing FX conversion rate before retrying.",
    "allowedActions": [
      {
        "type": "navigate",
        "target": "/finance/fx-rates",
        "label": "Open FX rates"
      },
      {
        "type": "instruction",
        "label": "Add or approve exchange rate for pair/date."
      },
      {
        "type": "retry",
        "label": "Retry settlement after FX basis exists"
      }
    ],
    "escalation": {
      "type": "workflow",
      "label": "Escalate for authorized resolution",
      "target": "escalation"
    }
  },
  {
    "key": "resolve_closed_period_block",
    "resolutionId": "resolve_closed_period_block",
    "resolutionClass": "role-resolvable",
    "responsibleRole": "accountant",
    "title": "Use an open period",
    "summary": "Move the posting date into an open period or reopen the closed one through governance.",
    "allowedActions": [
      {
        "type": "navigate",
        "target": "/finance/periods",
        "label": "Open accounting periods"
      }
    ],
    "escalation": {
      "type": "workflow",
      "label": "Escalate for authorized resolution",
      "target": "escalation"
    }
  },
  {
    "key": "resolve_duplicate_economic_effect",
    "resolutionId": "resolve_duplicate_economic_effect",
    "resolutionClass": "workflow-resolvable",
    "responsibleRole": "finance_manager",
    "title": "Review duplicate economic effect",
    "summary": "Inspect the prior flow and supersede or cancel before retrying.",
    "allowedActions": [
      {
        "type": "workflow",
        "target": "economic-effect-review",
        "label": "Send to review workflow"
      }
    ],
    "escalation": {
      "type": "workflow",
      "target": "economic-effect-review",
      "label": "Send to review workflow"
    }
  },
  {
    "key": "resolve_journal_imbalance",
    "resolutionId": "resolve_journal_imbalance",
    "resolutionClass": "role-resolvable",
    "responsibleRole": "accountant",
    "title": "Correct journal imbalance",
    "summary": "Fix debit and credit amounts so the journal can post.",
    "allowedActions": [
      {
        "type": "instruction",
        "label": "Review posting lines and ensure totals balance."
      }
    ],
    "escalation": {
      "type": "workflow",
      "label": "Escalate for authorized resolution",
      "target": "escalation"
    }
  },
  {
    "key": "resolve_supersession_required_for_meaning_change",
    "resolutionId": "resolve_supersession_required_for_meaning_change",
    "resolutionClass": "workflow-resolvable",
    "title": "Add supersession linkage",
    "summary": "Attach the previous event reference and explicit supersession metadata.",
    "allowedActions": [
      {
        "type": "instruction",
        "label": "Provide previousEventId and reasoned supersession metadata before completing the change."
      }
    ]
  },
  {
    "key": "resolve_truth_contract_violation",
    "resolutionId": "resolve_truth_contract_violation",
    "resolutionClass": "workflow-resolvable",
    "responsibleRole": "finance_manager",
    "title": "Resolve truth contract violation",
    "summary": "Review and remediate failing truth checks before treating projection as authoritative.",
    "allowedActions": [
      {
        "type": "workflow",
        "target": "truth-contract-review",
        "label": "Open truth contract remediation workflow"
      },
      {
        "type": "instruction",
        "label": "Fix underlying invariant failures, then rerun verification."
      }
    ],
    "escalation": {
      "type": "workflow",
      "target": "truth-contract-review",
      "label": "Open truth contract remediation workflow"
    }
  }
] as const;
