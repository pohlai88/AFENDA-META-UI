---
title: Phase 1 implementation blueprint
description: >-
  Executable plan for the first vertical (sales order → inventory reservation → journal posting):
  six truth specs (including doctrine + resolution), generator, failure contracts, runtime, projections,
  replay, and evidence—aligned with architecture.md v3.3.
related:
  - ./architecture.md
  - ./architecture-board-pack.md
  - ./phase-1-engineering-backlog.md
---

# Phase 1 implementation blueprint

## Updated for Doctrine + Resolution

This blueprint proves [`architecture.md`](./architecture.md) **(v3.3)** in **running code** for one end-to-end vertical. Doctrine and remediation are **metadata-driven and enforced**, not theoretical add-ons (see §8.5B–8.5F, §10.4–10.9).

> **sales order → inventory reservation → journal posting**

---

## 1. Phase 1 objective

Prove the vertical with these guarantees:

- deterministic semantic generation from specs
- **doctrine-linked** invariant enforcement (`doctrineSpec` → `invariantSpec`)
- append-only temporal memory
- replayable projections with checksum evidence
- financially authoritative projection **gating** (§8.5, §10.9)
- **structured doctrine / evidence / resolution** output for blocking and exception-class failures (`resolutionSpec`, `contracts/failures.ts`)

Phase 1 stays narrow in catalog size (small doctrine pack, narrow resolution set) but **must be real**: generated, validated in CI, attached at runtime, consumable by API/UI.

---

## 2. Phase 1 scope

### In

- `identitySpec.ts`, `enumSpec.ts`, `relationSpec.ts`, `invariantSpec.ts`, **`doctrineSpec.ts`**, **`resolutionSpec.ts`**
- **generator for all six specs** (`emitDoctrines.ts`, `emitResolutions.ts`, manifest)
- one command pipeline
- one **doctrine-aware** invariant runner
- one **resolution contract** path (`buildResolutionContract`)
- one authoritative projection with **blockedReasons** when not authoritative
- replay + checksum
- CI evidence for **doctrine catalog**, **resolution mapping**, invariants, replay

### Out

- broad domain rollout
- advanced prediction
- full search engine
- full operator exception UI
- multi-region infra
- complete IFRS library

---

## 3. Directory blueprint

```txt
packages/
  core/
    src/
      truth/
        identitySpec.ts
        enumSpec.ts
        relationSpec.ts
        invariantSpec.ts
        doctrineSpec.ts
        resolutionSpec.ts

      generated/
        identity.ts
        enums.ts
        relations.ts
        graph.ts
        invariants.ts
        doctrines.ts
        resolutions.ts
        contracts.ts
        projectionMeta.ts
        manifest.json

      contracts/
        commands.ts
        events.ts
        queries.ts
        failures.ts

      generator/
        index.ts
        normalize.ts
        emitIdentity.ts
        emitEnums.ts
        emitRelations.ts
        emitGraph.ts
        emitInvariants.ts
        emitDoctrines.ts
        emitResolutions.ts
        emitContracts.ts
        emitProjectionMeta.ts
        manifest.ts

  runtime/
    src/
      command/
        executeCommand.ts
        applyMutation.ts
        idempotency.ts
        authorization.ts
        tenantContext.ts
        errors.ts

      invariants/
        types.ts
        registry.ts
        runPreCommit.ts
        runPostCommit.ts
        runProjectionReadChecks.ts

      doctrine/
        doctrineLookup.ts
        doctrineTrace.ts

      resolution/
        resolutionLookup.ts
        buildResolutionContract.ts

      memory/
        appendRecord.ts
        buildTemporalTruthRecord.ts
        recordTypes.ts
        supersession.ts

      projections/
        orderLedgerProjection.ts
        inventoryPositionProjection.ts
        financialAuthorityProjection.ts

      replay/
        replayTenant.ts
        replayIdentity.ts
        checksum.ts

  platform/
    src/
      tenancy/
        bindTenant.ts
        assertTenant.ts
      observability/
        correlation.ts
        metrics.ts
        auditEvidence.ts

  surfaces/
    api/
      src/
        routes/
          commands.ts
          projections.ts
          replay.ts
```

---

## 4. Truth specs

### 4.1 `identitySpec.ts`, `enumSpec.ts`, `relationSpec.ts`

Keep the minimal vertical slice already described in prior iterations (tenant → partner, product, sales order, inventory, journal). No change to structural shape; doctrine still **must not** live in identity keys.

### 4.2 `doctrineSpec.ts`

Phase 1 includes only a **small** doctrine pack; entries must be **real and visible** (catalog export, linkage from invariants).

```ts
export const doctrineSpec = {
  ifrs15_revenue_recognition: {
    family: "IFRS",
    standard: "IFRS 15",
    section: "Revenue recognition",
    clauseRef: "policy://ifrs15/performance-obligation",
    title: "Revenue may be recognized only when the required recognition trigger is satisfied",
    interpretation: "strict",
    linkedInvariants: ["revenue_recognition_requires_fulfillment"],
    visibilityClass: "audit-visible",
  },

  ias21_fx_conversion: {
    family: "IAS",
    standard: "IAS 21",
    section: "Foreign currency translation",
    clauseRef: "policy://ias21/fx-translation",
    title: "Currency conversion basis must be preserved",
    interpretation: "strict",
    linkedInvariants: ["fx_conversion_basis_required"],
    visibilityClass: "operator-visible",
  },

  accounting_journal_balance: {
    family: "Accounting-Control",
    standard: "Double-entry control",
    section: "Journal balancing",
    clauseRef: "policy://accounting/journal-balance",
    title: "Journal debits and credits must balance before posting",
    interpretation: "strict",
    linkedInvariants: ["journal_balances"],
    visibilityClass: "operator-visible",
  },
} as const;
```

### 4.3 `resolutionSpec.ts`

Keep Phase 1 **narrow and practical**—enough to prove the resolution pipeline, not every edge case.

```ts
export const resolutionSpec = {
  fx_conversion_basis_required: {
    resolutionId: "resolve_missing_fx_rate",
    resolutionClass: "role-resolvable",
    title: "Provide missing FX conversion basis",
    allowedActions: [
      {
        type: "navigate",
        label: "Open FX Rate Maintenance",
        target: "/finance/fx-rates",
      },
      {
        type: "instruction",
        label: "Add or approve exchange rate for the required currency pair and effective date",
      },
      {
        type: "retry",
        label: "Retry settlement after FX basis exists",
      },
    ],
    responsibleRole: "accountant",
    escalation: {
      type: "workflow",
      label: "Request finance review",
      target: "/workflows/fx-rate-request",
    },
  },

  journal_balances: {
    resolutionId: "resolve_unbalanced_journal",
    resolutionClass: "role-resolvable",
    title: "Correct journal lines before posting",
    allowedActions: [
      {
        type: "navigate",
        label: "Open Journal Draft",
        target: "/finance/journals/:journalEntryId",
      },
      {
        type: "instruction",
        label: "Adjust debit and credit lines until the journal balances",
      },
    ],
    responsibleRole: "accountant",
  },

  revenue_recognition_requires_fulfillment: {
    resolutionId: "resolve_missing_fulfillment",
    resolutionClass: "workflow-resolvable",
    title: "Complete fulfillment or use approved exception workflow",
    allowedActions: [
      {
        type: "navigate",
        label: "Open Fulfillment View",
        target: "/sales/orders/:salesOrderId/fulfillment",
      },
      {
        type: "workflow",
        label: "Submit recognition exception request",
        target: "/workflows/revenue-recognition-exception",
      },
    ],
    responsibleRole: "finance_manager",
  },
} as const;
```

### 4.4 `invariantSpec.ts`

Each **regulatory** or **policy-derived** invariant must declare **`doctrineRef`** and **`resolutionRef`** where the architecture requires traceability and resolvable remediation. Platform-only invariants may omit doctrine when not regulatory (see `architecture.md` §8.5A, §16).

```ts
export const invariantSpec = {
  journal_balances: {
    semanticClass: ["economic", "reconciliation", "regulatory"],
    authority: "regulatory",
    doctrineRef: "accounting_journal_balance",
    resolutionRef: "journal_balances",
    scope: "aggregate",
    target: "journalEntry",
    timing: "pre-commit",
    severity: "critical",
    failurePolicy: "block",
    remediationOwner: "finance",
  },

  fx_conversion_basis_required: {
    semanticClass: ["measurement", "valuation", "regulatory"],
    authority: "regulatory",
    doctrineRef: "ias21_fx_conversion",
    resolutionRef: "fx_conversion_basis_required",
    scope: "aggregate",
    target: "journalEntry",
    timing: "pre-commit",
    severity: "critical",
    failurePolicy: "block",
    remediationOwner: "finance",
  },

  revenue_recognition_requires_fulfillment: {
    semanticClass: ["recognition", "regulatory"],
    authority: "regulatory",
    doctrineRef: "ifrs15_revenue_recognition",
    resolutionRef: "revenue_recognition_requires_fulfillment",
    scope: "cross-entity",
    target: "salesOrder",
    timing: "pre-commit",
    severity: "critical",
    failurePolicy: "block",
    remediationOwner: "finance",
  },

  no_duplicate_economic_effect: {
    semanticClass: ["economic", "platform"],
    authority: "platform",
    scope: "cross-entity",
    target: "salesOrder",
    timing: "pre-commit",
    severity: "critical",
    failurePolicy: "block",
    remediationOwner: "runtime",
  },

  supersession_lineage_required_on_meaning_change: {
    semanticClass: ["supersession", "temporal-memory"],
    authority: "platform",
    scope: "entity",
    target: "salesOrder",
    timing: "pre-commit",
    severity: "critical",
    failurePolicy: "block",
    remediationOwner: "platform",
  },

  authoritative_projection_requires_clean_truth_contract: {
    semanticClass: ["aggregation", "statement-support"],
    authority: "regulatory",
    scope: "projection",
    target: "financialAuthorityProjection",
    timing: "read-time",
    severity: "critical",
    failurePolicy: "block",
    remediationOwner: "finance",
  },
} as const;
```

_Additional platform invariants (e.g. tenant context) may remain in the same file per product needs; generator CI rules below apply to **regulatory** rows._

---

## 5. Generator upgrades

### 5.1 New emitters

- `emitDoctrines.ts` → `generated/doctrines.ts`
- `emitResolutions.ts` → `generated/resolutions.ts`

### 5.2 Normalization (fail the build)

The generator (or `normalize.ts`) should **fail** if:

- `invariantSpec.doctrineRef` points to a missing doctrine key
- `invariantSpec.resolutionRef` points to a missing resolution key
- a doctrine’s `linkedInvariants` references an unknown invariant name
- doctrine / authority / regulatory alignment rules fail (per policy encoded in generator)
- a resolution action `type` is not in the allowed set (`architecture.md` §10.7)
- a **regulatory** invariant has no `doctrineRef`

Determinism rules (stable ordering, hashes, manifest) remain as before.

---

## 6. Contracts: failure payload

### 6.1 `packages/core/src/contracts/failures.ts`

```ts
export type InvariantFailurePayload = {
  invariantName: string;
  severity: "critical" | "major" | "minor" | "informational";
  failurePolicy: "block" | "quarantine" | "allow-with-flag" | "alert-only";

  doctrine?: {
    doctrineRef: string;
    family: string;
    standard: string;
    section: string;
    clauseRef?: string;
    title: string;
    interpretation: "strict" | "policy-adjusted" | "advisory";
  };

  evidence: {
    summary: string;
    facts: Record<string, unknown>;
  };

  resolution?: {
    resolutionId: string;
    resolutionClass:
      | "user-resolvable"
      | "role-resolvable"
      | "workflow-resolvable"
      | "admin-only"
      | "non-resolvable";
    title: string;
    actions: Array<{
      type: "navigate" | "instruction" | "workflow" | "retry" | "reference" | "contact" | "autofix";
      label: string;
      target?: string;
    }>;
    responsibleRole?: string;
  };
};
```

---

## 7. Runtime

### 7.1 Doctrine

- `doctrineLookup.ts`: `getDoctrineByRef(doctrineRef: string)`
- `doctrineTrace.ts`: `buildDoctrineTrace({ invariantName, doctrineRef? })` → populates `InvariantFailurePayload["doctrine"]` when applicable

### 7.2 Resolution

- `resolutionLookup.ts`: `getResolutionByRef(resolutionRef: string)`
- `buildResolutionContract.ts`: `buildResolutionContract({ invariantName, resolutionRef?, actorRole?, evidence })` → `InvariantFailurePayload["resolution"] | undefined`

`buildResolutionContract` should:

- filter or annotate actions by actor role when policy requires
- inject route params (e.g. `journalEntryId`, `salesOrderId`) from evidence context
- downgrade to workflow / escalation when the actor lacks direct permission

### 7.3 Invariant evaluation result

```ts
export type InvariantEvaluationResult = {
  invariantName: string;
  severity: "critical" | "major" | "minor" | "informational";
  status: "pass" | "fail" | "flagged";
  failurePolicy: "block" | "quarantine" | "allow-with-flag" | "alert-only";
  details: Record<string, unknown>;

  doctrine?: InvariantFailurePayload["doctrine"];
  resolution?: InvariantFailurePayload["resolution"];
};
```

### 7.4 Pre-commit block error

`packages/runtime/src/command/errors.ts`:

```ts
export class InvariantBlockError extends Error {
  constructor(public readonly failures: InvariantFailurePayload[]) {
    super("Invariant block");
  }
}
```

### 7.5 Example failure JSON (`fx_conversion_basis_required`)

When this invariant fails, the API should be able to return a payload shaped like:

```json
{
  "invariantName": "fx_conversion_basis_required",
  "severity": "critical",
  "failurePolicy": "block",
  "doctrine": {
    "doctrineRef": "ias21_fx_conversion",
    "family": "IAS",
    "standard": "IAS 21",
    "section": "Foreign currency translation",
    "clauseRef": "policy://ias21/fx-translation",
    "title": "Currency conversion basis must be preserved",
    "interpretation": "strict"
  },
  "evidence": {
    "summary": "No approved exchange rate found for USD → VND on 2026-04-01",
    "facts": {
      "sourceCurrency": "USD",
      "targetCurrency": "VND",
      "effectiveDate": "2026-04-01"
    }
  },
  "resolution": {
    "resolutionId": "resolve_missing_fx_rate",
    "resolutionClass": "role-resolvable",
    "title": "Provide missing FX conversion basis",
    "actions": [
      {
        "type": "navigate",
        "label": "Open FX Rate Maintenance",
        "target": "/finance/fx-rates"
      },
      {
        "type": "instruction",
        "label": "Add or approve exchange rate for the required currency pair and effective date"
      },
      {
        "type": "retry",
        "label": "Retry settlement after FX basis exists"
      }
    ],
    "responsibleRole": "accountant"
  }
}
```

---

## 8. Command pipeline (summary)

Align with `architecture.md` §7. Pre-commit failures throw `InvariantBlockError` with one or more `InvariantFailurePayload` built via doctrine trace + resolution contract + invariant evidence.

---

## 9. Projection: `FinancialAuthorityProjection`

Extend the authority projection so blocked or exception-class outcomes carry explainable payloads:

```ts
export type FinancialAuthorityProjection = {
  tenantId: string;
  scopeId: string;
  authorityStatus: "authoritative" | "provisional" | "blocked";

  invariantSnapshot: Array<{
    invariantName: string;
    status: string;
    severity: string;
    doctrineRef?: string;
  }>;

  blockedReasons?: InvariantFailurePayload[];

  valuationBasisStatus: "valid" | "missing" | "invalid";

  provenance: {
    checkpointId?: string;
    replayChecksum?: string;
  };
};
```

If `authorityStatus` is `blocked`, include **doctrine**, **evidence**, and **resolution** in `blockedReasons` where permitted by policy (see `architecture.md` §8.5, §10.8).

If the accounting truth contract fails, status must be `blocked` (see `architecture.md` §8.5, §10.9).

---

## 10. API shapes

### 10.1 Blocked commands

```json
{
  "status": "blocked",
  "failures": ["…InvariantFailurePayload"]
}
```

### 10.2 Blocked authority projection

```json
{
  "authorityStatus": "blocked",
  "blockedReasons": ["…InvariantFailurePayload"]
}
```

---

## 11. Memory and persistence

Memory shape still follows `architecture.md` §9 (7W1H, temporal dimensions, supersession). Minimal operational tables can remain:

- `sales_orders`, `sales_order_lines`, `inventory_items`, `inventory_movements`, `journal_entries`, `journal_lines`
- `truth_memory_records`, `idempotency_keys`, `projection_checkpoints`, `invariant_results` (as needed)

---

## 12. CI / evidence

### 12.1 New checks

| Check                           | Script (example)                 | Artifact (example)                                    |
| ------------------------------- | -------------------------------- | ----------------------------------------------------- |
| Doctrine catalog completeness   | `ci/doctrine-catalog-check.ts`   | `artifacts/doctrine/doctrine-catalog-export.json`     |
| Resolution mapping completeness | `ci/resolution-catalog-check.ts` | `artifacts/resolution/resolution-catalog-export.json` |

**Doctrine check** — fail if:

- regulatory invariant missing `doctrineRef`
- doctrine missing a linked invariant that exists in spec
- invalid `visibilityClass` (per enumerated allow-list)
- malformed `clauseRef` when required by policy

**Resolution check** — fail if:

- blockable invariant marked resolvable but missing `resolutionRef`
- invalid action `type`
- `role-resolvable` without `responsibleRole` where required
- `navigate` / `workflow` missing `target` where required

### 12.2 Evidence layout

```txt
artifacts/
  doctrine/
  resolution/
  generator/
  invariants/
  replay/
  authority/
  isolation/
```

**Minimum exports:**

- doctrine catalog export
- invariant → doctrine mapping report
- invariant → resolution mapping report
- sample blocked command payloads
- sample blocked projection payloads

---

## 13. Test plan

### 13.1 Unit

- Doctrine ref resolves; linked invariants exist; regulatory without doctrine fails generation.
- Resolution ref resolves; role filtering; workflow fallback when actor cannot resolve directly.

### 13.2 Integration

1. **FX rate missing** — foreign-currency path → block on `fx_conversion_basis_required` → response includes IAS 21 doctrine, evidence facts, FX maintenance resolution.
2. **Missing fulfillment** — revenue-affecting action before fulfillment → `revenue_recognition_requires_fulfillment` → IFRS 15 doctrine + workflow resolution.
3. **Journal imbalance** — unbalanced draft → post blocked → `accounting_journal_balance` doctrine + journal correction resolution.

---

## 14. Sprint outline

| Sprint   | Focus                                                                     |
| -------- | ------------------------------------------------------------------------- |
| Sprint 1 | Six truth specs; generator emitters + manifest; doctrine/resolution CI    |
| Sprint 2 | Command runtime; doctrine lookup; resolution builder; `failures.ts`       |
| Sprint 3 | Invariant runners with doctrine + resolution; confirm / reserve / journal |
| Sprint 4 | Authority projection; blocked payloads; replay checksum                   |
| Sprint 5 | CI evidence pack; doctrine/resolution exports; hardening                  |

---

## 15. Exit criteria

Do not expand scope beyond Phase 1 until **all** pass:

- deterministic generation passes in CI
- regulatory invariants for the vertical are **instantiated** and **doctrine-linked**
- every **resolvable** blocking failure returns **structured resolution** metadata
- blocked **command** payload can include doctrine + evidence + resolution where applicable
- blocked **authoritative projection** can include doctrine + evidence + resolution where applicable
- replay drill passes with checksum evidence

Aligns with `architecture.md` §15 and `architecture-board-pack.md` stage gates.

---

## 16. Non-negotiable design rule (Phase 1)

Doctrine and resolution must remain:

- **metadata-driven** (specs + generated artifacts)
- **generated and validated** (CI gates)
- **runtime-attached** (failure payloads, not ad hoc strings in handlers)
- **UI-consumable** (stable JSON shapes)

Do **not** hardcode doctrine copy, remediation links, or invariant explanations inside command handlers or React components—route through the **doctrine / resolution pipeline** and `InvariantFailurePayload`.

---

## 17. Suggested build order

1. Six truth specs (`identitySpec` … `resolutionSpec`)
2. Generator + `emitDoctrines` / `emitResolutions` + manifest + normalization rules
3. `contracts/failures.ts` + command errors
4. Doctrine + resolution runtime modules
5. Invariant runner integration (pre-commit + read-time projection checks)
6. Vertical commands (confirm → reserve → journal)
7. `FinancialAuthorityProjection` + API routes
8. Replay + checksum
9. CI: determinism, doctrine catalog, resolution mapping, evidence export

---

## Target claim

> AFENDA can execute one economically material flow with **deterministic generation**, **governed memory**, **doctrine-linked invariants**, **structured resolution on failure**, and **replayable authoritative projection**.

If that works, the architecture is real. If it fails, the documents have done their job by showing where enforcement broke.
