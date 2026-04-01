# Phase 1 Implementation Plan (archived draft)

> **Superseded:** use [`phase-1-implementation-blueprint.md`](../phase-1-implementation-blueprint.md) (**v3.3 — Doctrine + Resolution**).  
> This copy is **archived** (pre–doctrine/resolution). It predates `doctrineSpec` / `resolutionSpec`, doctrine-linked `invariantSpec`, `contracts/failures.ts`, and doctrine/resolution CI artifacts.

## Goal

Prove one vertical:

> **sales order → inventory reservation → journal posting**

under these guarantees:

- deterministic generation
- invariant enforcement
- append-only governed memory
- replayability
- financially authoritative projection gating

---

# 1. Work package order

Build in this sequence:

1. truth specs
2. generator
3. generated outputs
4. contracts
5. persistence schema
6. command runtime skeleton
7. invariant runtime
8. memory runtime
9. first vertical commands
10. projections
11. replay
12. CI evidence

---

# 2. `packages/core/src/truth`

## 2.1 `identitySpec.ts`

```ts
export const identitySpec = {
  tenant: {
    scope: "system",
    children: ["partner", "product", "salesOrder", "inventoryItem", "journalEntry"],
  },
  partner: {
    scope: "tenant",
  },
  product: {
    scope: "tenant",
    children: ["inventoryItem"],
  },
  inventoryItem: {
    parent: "product",
  },
  salesOrder: {
    scope: "tenant",
    children: ["salesOrderLine"],
    locks: true,
  },
  salesOrderLine: {
    parent: "salesOrder",
  },
  journalEntry: {
    scope: "tenant",
    children: ["journalLine"],
    locks: true,
  },
  journalLine: {
    parent: "journalEntry",
  },
} as const;
```

## 2.2 `enumSpec.ts`

```ts
export const enumSpec = {
  salesOrderStatus: ["draft", "confirmed", "fulfilled", "cancelled"],
  inventoryMovementType: ["reserve", "release", "issue", "adjustment"],
  journalStatus: ["draft", "posted", "reversed"],
  authorityStatus: ["authoritative", "provisional", "blocked"],
} as const;
```

## 2.3 `relationSpec.ts`

```ts
export const relationSpec = {
  salesOrder_partner: {
    from: "salesOrder",
    to: "partner",
    kind: "many-to-one",
    field: "partner_id",
  },
  salesOrderLine_product: {
    from: "salesOrderLine",
    to: "product",
    kind: "many-to-one",
    field: "product_id",
  },
} as const;
```

## 2.4 `invariantSpec.ts`

Suggested shape:

```ts
export type InvariantTiming = "write-time" | "pre-commit" | "post-commit-async" | "batch";

export type InvariantFailurePolicy = "block" | "quarantine" | "allow-with-flag" | "alert-only";

export type InvariantAuthority = "regulatory" | "platform" | "tenant-policy";

export const invariantSpec = {
  tenant_context_required: {
    semanticClass: ["tenant-isolation"],
    authority: "platform",
    scope: "entity",
    target: "salesOrder",
    timing: "pre-commit",
    severity: "critical",
    failurePolicy: "block",
    remediationOwner: "platform",
  },

  no_duplicate_economic_effect: {
    semanticClass: ["economic", "reconciliation"],
    authority: "platform",
    scope: "cross-entity",
    target: "salesOrder",
    timing: "pre-commit",
    severity: "critical",
    failurePolicy: "block",
    remediationOwner: "runtime",
  },

  journal_balances: {
    semanticClass: ["economic", "reconciliation", "regulatory"],
    authority: "regulatory",
    scope: "aggregate",
    target: "journalEntry",
    timing: "pre-commit",
    severity: "critical",
    failurePolicy: "block",
    remediationOwner: "finance",
  },

  closed_period_blocks_posting: {
    semanticClass: ["period", "regulatory"],
    authority: "regulatory",
    scope: "aggregate",
    target: "journalEntry",
    timing: "pre-commit",
    severity: "critical",
    failurePolicy: "block",
    remediationOwner: "finance",
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
    timing: "write-time",
    severity: "critical",
    failurePolicy: "block",
    remediationOwner: "finance",
  },
} as const;
```

---

# 3. `packages/core/src/generator`

## 3.1 Files

```txt
packages/core/src/generator/
  index.ts
  normalize.ts
  types.ts
  emitIdentity.ts
  emitEnums.ts
  emitRelations.ts
  emitGraph.ts
  emitInvariants.ts
  emitContracts.ts
  emitProjectionMeta.ts
  manifest.ts
```

## 3.2 Main signature

### `index.ts`

```ts
export async function generateAll(): Promise<GenerationManifest>;
```

### `normalize.ts`

```ts
export type NormalizedSpec = {
  identities: Record<string, NormalizedIdentity>;
  enums: Record<string, readonly string[]>;
  relations: Record<string, NormalizedRelation>;
  invariants: Record<string, NormalizedInvariant>;
};

export function normalizeSpecs(input: {
  identitySpec: unknown;
  enumSpec: unknown;
  relationSpec: unknown;
  invariantSpec: unknown;
}): NormalizedSpec;
```

### `manifest.ts`

```ts
export type GenerationManifest = {
  generatorVersion: string;
  inputHash: string;
  outputHash: string;
  generatedAt: string;
  files: Array<{ path: string; sha256: string }>;
};

export function buildManifest(files: Array<{ path: string; content: string }>): GenerationManifest;
```

## 3.3 Generator output files

```txt
packages/core/src/generated/
  identity.ts
  enums.ts
  relations.ts
  graph.ts
  invariants.ts
  contracts.ts
  projectionMeta.ts
  manifest.json
```

## 3.4 CLI

### `packages/core/src/generator/cli.ts`

```ts
async function main(): Promise<void>;
```

### package script

```json
{
  "scripts": {
    "generate": "tsx packages/core/src/generator/cli.ts",
    "generate:check": "pnpm generate && git diff --exit-code"
  }
}
```

---

# 4. `packages/core/src/contracts`

## 4.1 `commands.ts`

```ts
export type ConfirmSalesOrderCommand = {
  commandName: "ConfirmSalesOrder";
  tenantId: string;
  actorId: string;
  idempotencyKey: string;
  salesOrderId: string;
  reasonCode?: string;
};

export type ReserveInventoryForOrderCommand = {
  commandName: "ReserveInventoryForOrder";
  tenantId: string;
  actorId: string;
  idempotencyKey: string;
  salesOrderId: string;
};

export type PostOrderJournalCommand = {
  commandName: "PostOrderJournal";
  tenantId: string;
  actorId: string;
  idempotencyKey: string;
  salesOrderId: string;
  postingDate: string;
};

export type ReverseJournalEntryCommand = {
  commandName: "ReverseJournalEntry";
  tenantId: string;
  actorId: string;
  idempotencyKey: string;
  journalEntryId: string;
  reasonCode: string;
};

export type CommandEnvelope =
  | ConfirmSalesOrderCommand
  | ReserveInventoryForOrderCommand
  | PostOrderJournalCommand
  | ReverseJournalEntryCommand;
```

## 4.2 `events.ts`

```ts
export type DomainEvent =
  | { eventName: "SalesOrderConfirmed"; tenantId: string; salesOrderId: string }
  | { eventName: "InventoryReserved"; tenantId: string; salesOrderId: string }
  | { eventName: "JournalPosted"; tenantId: string; journalEntryId: string }
  | { eventName: "JournalReversed"; tenantId: string; journalEntryId: string };
```

## 4.3 `queries.ts`

```ts
export type GetSalesOrderProjectionQuery = {
  tenantId: string;
  salesOrderId: string;
};

export type GetInventoryPositionProjectionQuery = {
  tenantId: string;
  productId: string;
};

export type GetFinancialAuthorityProjectionQuery = {
  tenantId: string;
  salesOrderId: string;
};
```

---

# 5. Persistence schema

## 5.1 Tables to create first

```txt
sales_orders
sales_order_lines
inventory_items
inventory_movements
journal_entries
journal_lines
truth_memory_records
idempotency_keys
invariant_results
projection_checkpoints
override_records
closed_periods
```

## 5.2 Suggested minimum fields

### `truth_memory_records`

```ts
type TruthMemoryRecordRow = {
  id: string;
  tenant_id: string;
  correlation_id: string;
  entity_name: string;
  entity_id: string;
  command_name: string;
  mutation_class: string;
  actor_id: string;
  actor_type: "user" | "system";
  reason_code: string | null;
  mechanism: "api" | "job" | "system";
  occurred_at: string;
  payload_json: string;
  past_json: string | null;
  present_json: string;
  future_committed_json: string | null;
  future_predicted_json: string | null;
  supersession_prior_record_id: string | null;
  supersession_classification: string | null;
};
```

### `idempotency_keys`

```ts
type IdempotencyKeyRow = {
  tenant_id: string;
  command_name: string;
  idempotency_key: string;
  economic_effect_id: string;
  first_seen_at: string;
};
```

### `invariant_results`

```ts
type InvariantResultRow = {
  id: string;
  tenant_id: string;
  invariant_name: string;
  target_type: string;
  target_id: string;
  severity: string;
  status: "pass" | "fail" | "flagged" | "stale";
  timing: string;
  evaluated_at: string;
  details_json: string;
};
```

### `projection_checkpoints`

```ts
type ProjectionCheckpointRow = {
  id: string;
  tenant_id: string;
  projection_name: string;
  scope_type: "tenant" | "identity";
  scope_id: string;
  authority_status: "authoritative" | "provisional" | "blocked";
  checksum: string;
  built_at: string;
  metadata_json: string;
};
```

---

# 6. Runtime: command layer

## 6.1 Files

```txt
packages/runtime/src/command/
  executeCommand.ts
  applyMutation.ts
  idempotency.ts
  authorization.ts
  tenantContext.ts
  errors.ts
```

## 6.2 Function signatures

### `tenantContext.ts`

```ts
export type RequestContext = {
  tenantId: string;
  actorId: string;
  actorType: "user" | "system";
  correlationId: string;
};

export async function bindTenantAndActor(input: {
  tenantId: string;
  actorId: string;
}): Promise<RequestContext>;
export function assertTenantBound(ctx: RequestContext): void;
```

### `authorization.ts`

```ts
export async function authorizeCommand(
  ctx: RequestContext,
  command: CommandEnvelope
): Promise<void>;
```

### `idempotency.ts`

```ts
export type IdempotencyDecision =
  | { kind: "new"; economicEffectId: string }
  | { kind: "duplicate"; economicEffectId: string };

export async function assertIdempotency(
  ctx: RequestContext,
  command: CommandEnvelope
): Promise<IdempotencyDecision>;
```

### `executeCommand.ts`

```ts
export async function executeCommand(command: CommandEnvelope): Promise<ExecuteCommandResult>;
```

### `applyMutation.ts`

```ts
export type MutationResult = {
  mutatedEntities: Array<{ entity: string; id: string }>;
  domainEvents: DomainEvent[];
  economicEffects: Array<{ effectId: string; type: string }>;
};

export async function applyMutation(
  tx: TransactionLike,
  ctx: RequestContext,
  command: CommandEnvelope
): Promise<MutationResult>;
```

---

# 7. Runtime: invariant layer

## 7.1 Files

```txt
packages/runtime/src/invariants/
  types.ts
  registry.ts
  runPreCommit.ts
  runPostCommit.ts
  runProjectionReadChecks.ts
  helpers/
    economic.ts
    journal.ts
    tenant.ts
    supersession.ts
```

## 7.2 Core types

```ts
export type InvariantEvaluationContext = {
  tenantId: string;
  correlationId: string;
  targetType: string;
  targetId: string;
};

export type InvariantEvaluationResult = {
  invariantName: string;
  severity: "critical" | "major" | "minor" | "informational";
  status: "pass" | "fail" | "flagged";
  failurePolicy: "block" | "quarantine" | "allow-with-flag" | "alert-only";
  details: Record<string, unknown>;
};

export type InvariantRunner = (args: {
  ctx: InvariantEvaluationContext;
  tx?: TransactionLike;
  input: unknown;
}) => Promise<InvariantEvaluationResult>;
```

## 7.3 Registry

```ts
export const invariantRegistry: Record<string, InvariantRunner> = {
  tenant_context_required,
  no_duplicate_economic_effect,
  journal_balances,
  closed_period_blocks_posting,
  supersession_lineage_required_on_meaning_change,
  authoritative_projection_requires_clean_truth_contract,
};
```

## 7.4 Main runners

### `runPreCommit.ts`

```ts
export async function runPreCommitInvariants(args: {
  ctx: RequestContext;
  command: CommandEnvelope;
}): Promise<{
  results: InvariantEvaluationResult[];
  hasBlockingFailure: boolean;
}>;
```

### `runPostCommit.ts`

```ts
export async function runPostCommitInvariants(args: {
  ctx: RequestContext;
  mutationResult: MutationResult;
}): Promise<InvariantEvaluationResult[]>;
```

### `runProjectionReadChecks.ts`

```ts
export async function runProjectionReadChecks(args: {
  tenantId: string;
  projectionName: string;
  scopeId: string;
}): Promise<{
  authorityStatus: "authoritative" | "provisional" | "blocked";
  blockingReasons: string[];
}>;
```

---

# 8. Runtime: memory layer

## 8.1 Files

```txt
packages/runtime/src/memory/
  appendRecord.ts
  buildTemporalTruthRecord.ts
  recordTypes.ts
  supersession.ts
```

## 8.2 Types

```ts
export type TemporalTruthRecord = {
  id: string;
  tenantId: string;
  correlationId: string;
  who: { actorId: string; actorType: "user" | "system" };
  what: { command: string; mutationClass: string };
  when: string;
  where: { service: string; route?: string };
  which: { entity: string; entityId: string };
  why: { reasonCode?: string; note?: string };
  with: { relatedEntityIds: string[] };
  how: { mechanism: "api" | "job" | "system" };
  past: Record<string, unknown> | null;
  present: Record<string, unknown>;
  futureCommitted?: Record<string, unknown>;
  futurePredicted?: Record<string, unknown>;
  supersession?: {
    priorRecordId: string;
    classification:
      | "semantic-correction"
      | "economically-material-correction"
      | "reversal-linked-correction"
      | "policy-reclassification"
      | "legal-exception";
  };
};
```

## 8.3 Functions

### `buildTemporalTruthRecord.ts`

```ts
export function buildTemporalTruthRecord(args: {
  ctx: RequestContext;
  command: CommandEnvelope;
  mutationResult: MutationResult;
  priorState: Record<string, unknown> | null;
  currentState: Record<string, unknown>;
}): TemporalTruthRecord;
```

### `appendRecord.ts`

```ts
export async function appendMemoryRecord(
  tx: TransactionLike,
  record: TemporalTruthRecord
): Promise<void>;
```

### `supersession.ts`

```ts
export function assertSupersessionMetadataRequired(args: {
  priorState: Record<string, unknown> | null;
  command: CommandEnvelope;
}): void;
```

---

# 9. Runtime: projection layer

## 9.1 Files

```txt
packages/runtime/src/projections/
  orderLedgerProjection.ts
  inventoryPositionProjection.ts
  financialAuthorityProjection.ts
  common.ts
```

## 9.2 Function signatures

### `orderLedgerProjection.ts`

```ts
export async function buildSalesOrderProjection(args: {
  tenantId: string;
  salesOrderId: string;
}): Promise<SalesOrderProjection>;
```

### `inventoryPositionProjection.ts`

```ts
export async function buildInventoryPositionProjection(args: {
  tenantId: string;
  productId: string;
}): Promise<InventoryPositionProjection>;
```

### `financialAuthorityProjection.ts`

```ts
export type FinancialAuthorityProjection = {
  tenantId: string;
  scopeId: string;
  authorityStatus: "authoritative" | "provisional" | "blocked";
  invariantSnapshot: Array<{
    invariantName: string;
    status: string;
    severity: string;
  }>;
  valuationBasisStatus: "valid" | "missing" | "invalid";
  provenance: {
    checkpointId?: string;
    replayChecksum?: string;
  };
};

export async function buildFinancialAuthorityProjection(args: {
  tenantId: string;
  salesOrderId: string;
}): Promise<FinancialAuthorityProjection>;
```

Guard inside:

- if accounting truth contract unresolved → `authorityStatus = "blocked"`

That is directly required by your architecture.

---

# 10. Runtime: replay layer

## 10.1 Files

```txt
packages/runtime/src/replay/
  replayTenant.ts
  replayIdentity.ts
  checksum.ts
```

## 10.2 Signatures

### `checksum.ts`

```ts
export function computeProjectionChecksum(input: unknown): string;
```

### `replayIdentity.ts`

```ts
export async function replayIdentity(args: {
  tenantId: string;
  entity: string;
  entityId: string;
}): Promise<{
  rebuiltProjection: unknown;
  checksum: string;
}>;
```

### `replayTenant.ts`

```ts
export async function replayTenant(args: { tenantId: string; projectionNames: string[] }): Promise<
  Array<{
    projectionName: string;
    scopeId: string;
    checksum: string;
  }>
>;
```

---

# 11. Platform hooks

## 11.1 Files

```txt
packages/platform/src/tenancy/
  bindTenant.ts
  assertTenant.ts

packages/platform/src/observability/
  correlation.ts
  metrics.ts
  auditEvidence.ts
```

## 11.2 Signatures

### `bindTenant.ts`

```ts
export function bindTenant(input: { tenantId: string; headers?: Record<string, string> }): string;
```

### `assertTenant.ts`

```ts
export function assertTenantMatches(args: {
  requestTenantId: string;
  resourceTenantId: string;
}): void;
```

### `correlation.ts`

```ts
export function getOrCreateCorrelationId(headers?: Record<string, string>): string;
```

### `auditEvidence.ts`

```ts
export async function emitEvidenceArtifact(args: {
  family: "generator" | "invariants" | "replay" | "authority" | "isolation";
  name: string;
  payload: unknown;
}): Promise<void>;
```

---

# 12. API surface for Phase 1

## 12.1 Files

```txt
packages/surfaces/api/src/routes/
  commands.ts
  projections.ts
  replay.ts
```

## 12.2 Endpoints

### Commands

- `POST /commands/confirm-sales-order`
- `POST /commands/reserve-inventory-for-order`
- `POST /commands/post-order-journal`
- `POST /commands/reverse-journal-entry`

### Projections

- `GET /projections/sales-order/:id`
- `GET /projections/inventory-position/:productId`
- `GET /projections/financial-authority/:salesOrderId`

### Replay

- `POST /replay/tenant/:tenantId`
- `POST /replay/identity/:entity/:id`

---

# 13. CI enforcement surfaces

These map directly to your architecture’s enforcement map.

## 13.1 `ci/generate-check.sh`

- runs generator
- validates no drift
- exports manifest artifact

## 13.2 `ci/invariant-catalog-check.ts`

- verifies minimum active regulatory invariant set exists
- fails if selected domain missing required instantiated invariants

## 13.3 `ci/replay-drill.ts`

- seeds sample tenant
- executes vertical
- rebuilds projections
- compares checksums
- emits replay report

## 13.4 `ci/isolation-regression.ts`

- attempts cross-tenant reads/writes
- expects failure
- emits trace evidence

## 13.5 `ci/legal-erasure-fixture.ts`

- anonymizes allowed personal fields
- reruns replay
- verifies authoritative outputs still valid where expected

---

# 14. Test plan

## 14.1 Unit tests

### Generator

- stable emit ordering
- same input → same manifest hash
- spec normalization rejects duplicate semantic identity

### Invariants

- `journal_balances` fails when debit != credit
- `no_duplicate_economic_effect` fails on same effect id
- `supersession_lineage_required_on_meaning_change` blocks missing lineage

### Memory

- appends full 7W1H payload
- requires supersession classification for meaning-changing correction

---

## 14.2 Integration tests

### Vertical flow happy path

1. confirm order
2. reserve inventory
3. post journal
4. build financial authority projection
5. authority status = authoritative

### Duplicate command retry

1. submit same command twice with same idempotency key
2. exactly one economic effect
3. second response resolves as duplicate

### Closed period block

1. create closed period
2. attempt journal post into closed period
3. blocked pre-commit

### Missing supersession

1. mutate meaning-changing field
2. omit supersession metadata
3. blocked

### Replay checksum

1. execute vertical
2. rebuild projections
3. checksums match stored checkpoint

### Legal erasure fixture

1. anonymize actor-linked fields
2. replay tenant
3. authoritative projection remains reconstructable

---

## 14.3 End-to-end evidence tests

Produce artifacts and verify they exist:

- generator manifest
- invariant catalog export
- replay checksum report
- authority projection evidence
- isolation regression report

---

# 15. Phase 1 sprint breakdown

## Sprint 1

- truth specs
- generator
- generated outputs
- contracts
- base schema

## Sprint 2

- command executor
- tenant/auth guards
- idempotency
- memory append

## Sprint 3

- invariant runner
- confirm order
- reserve inventory
- post journal

## Sprint 4

- projections
- financial authority gate
- replay + checksum

## Sprint 5

- CI evidence
- legal erasure fixture
- hardening + exit evidence pack

---

# 16. Exit evidence pack

At the end of Phase 1, you should be able to hand over:

- generated manifest
- invariant catalog
- command pipeline traces
- replay checksum report
- financial authority projection sample
- blocked projection sample
- tenant isolation regression report
- legal erasure replay report

That is the proof your architecture is real, not just written.

---

# 17. Most important implementation rule

Do not let Phase 1 drift into:

- UI polish
- generic CRUD screens
- module expansion

Every ticket should answer this question:

> Does this strengthen the proof that AFENDA can execute one financially material flow with invariant-enforced truth, governed memory, and replayable authoritative projection?

If not, it is not Phase 1.

If you want, next I can turn this into a **workable backlog** with:

- epics
- tickets
- acceptance criteria
- dependency order
