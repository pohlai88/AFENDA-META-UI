---
title: Phase 1 engineering backlog
description: >-
  Epics, features, tasks, and acceptance criteria for the Phase 1 vertical
  (Doctrine + Resolution). Executable against phase-1-implementation-blueprint.md and architecture.md v3.3.
related:
  - ./phase-1-implementation-blueprint.md
  - ./architecture.md
  - ./phase-1-alignment-audit.md
---

# Phase 1 engineering backlog

Normative product intent lives in [`phase-1-implementation-blueprint.md`](./phase-1-implementation-blueprint.md) and [`architecture.md`](./architecture.md). This document is the **execution backlog**: epics, tasks, acceptance criteria, and dependency order.

**Structure:** Epics → Tasks → Acceptance criteria (AC).

**Scope:** One vertical — **sales order → inventory reservation → journal posting** — with doctrine-linked invariants, resolution contracts, and evidence artifacts.

### Purpose and document stack

This backlog is the **execution layer** on top of the normative docs. It does not replace them; it **routes** them into schedulable work (sprints, tickets, PRs).

| Layer                                                                          | Role                                                                                        |
| ------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------- |
| [`architecture.md`](./architecture.md)                                         | **Why** — principles, doctrine, resolution, non-negotiables                                 |
| [`phase-1-implementation-blueprint.md`](./phase-1-implementation-blueprint.md) | **What** — vertical slice, specs, shapes, CI/evidence                                       |
| **This backlog**                                                               | **Who does what, in what order** — epics (E1–E10), tasks, acceptance criteria, dependencies |

It exists to:

- Break the blueprint into **shippable units** with clear “done” checks.
- **Sequence** work (e.g. no heavy runtime before specs + generator; API after failure contracts).
- Make reviews **testable** — AC map to tests, CI gates, or demo scripts.
- Keep doctrine/resolution **implemented**, not documentation-only — specs, generator validation, runtime payloads, blocked responses.

### When to start implementation

You can **start as soon as** architecture (v3.3), blueprint, and this backlog are agreed — first PRs should follow **E1 → E2** (six truth specs + `contracts/failures.ts`, then generator, manifest, drift CI, doctrine/resolution validation). Stabilize that before **E3–E4** (command path + doctrine/resolution runtime).

**Pre-flight:** confirm where `packages/core` and `packages/runtime` (or equivalents) live in the monorepo, and keep **one** vertical locked (sales order → reserve → journal).

**Implementation status** for the current monorepo slice is tracked in [`phase-1-alignment-audit.md`](./phase-1-alignment-audit.md). Epic and task rows below use the same vocabulary: **done** | **partial** | **not started** (evidence: `packages/core` + `.github/workflows/core-truth-generation.yml` unless noted).

---

## Backlog overview

| Epic | Name                                              | Status (`packages/core`) |
| ---- | ------------------------------------------------- | ------------------------ |
| E1   | Truth spec foundation                             | partial                  |
| E2   | Generator and deterministic artifacts             | partial                  |
| E3   | Command pipeline, invariant engine, failure types | partial                  |
| E4   | Doctrine and resolution runtime                   | done                     |
| E5   | Memory and supersession                           | partial                  |
| E6   | Vertical commands                                 | not started              |
| E7   | Projections and financial authority gate          | partial                  |
| E8   | Replay and checksum                               | partial                  |
| E9   | CI enforcement and evidence                       | partial                  |
| E10  | API surface                                       | not started              |

---

## E1 — Truth spec foundation

### E1-T1 — `identitySpec.ts`

Define the minimal identity graph for the vertical (tenant, partner, product, sales order / line, inventory item, journal entry / line).

**AC**

- `as const` export; TypeScript compiles.
- Parent/child and scope fields are consistent with the blueprint.
- No duplicate identity keys.

### E1-T2 — `enumSpec.ts`

**AC**

- Readonly tuple enums; no duplicate values within a key.

### E1-T3 — `relationSpec.ts`

**AC**

- Every `from` / `to` references identities defined in `identitySpec`.
- No ambiguous cycles unless explicitly allowed.

### E1-T4 — `invariantSpec.ts`

**AC**

- Every invariant declares required fields (semantic class, authority, scope, target, timing, severity, failure policy, remediation owner) per blueprint shape.
- **`authority: "regulatory"`** rows include **`doctrineRef`** and **`resolutionRef`** where the blueprint requires resolvable blocking failures.
- **Platform** invariants may omit `doctrineRef` / `resolutionRef` when not regulatory.

### E1-T5 — `doctrineSpec.ts`

**AC**

- Each entry includes: family, standard, section, title, interpretation, `linkedInvariants`, `visibilityClass` (and `clauseRef` where used in Phase 1).
- Every `linkedInvariants[]` name exists in `invariantSpec`.

### E1-T6 — `resolutionSpec.ts`

**AC**

- Each resolution has `resolutionId`, `resolutionClass`, `title`, `allowedActions[]`.
- Each action `type` is in the allowed set (`architecture.md` §10.7).
- `navigate` and `workflow` actions include `target` where required.

### E1-T7 — `contracts/failures.ts`

Define **`InvariantFailurePayload`** (and shared types used by runtime and API) as specified in the blueprint — doctrine, evidence, resolution blocks.

**AC**

- Types match blueprint JSON shapes; exported for generator/runtime/API.
- No doctrine copy or remediation text in this file beyond type structure (copy lives in specs).

---

## E2 — Generator and deterministic artifacts

### E2-T1 — `normalize.ts`

**AC**

- Specs normalize to a stable internal structure; same logical input yields the same normalized form (order-independent where applicable).

### E2-T2 — Emitters

Implement emitters for: `emitIdentity`, `emitEnums`, `emitRelations`, `emitGraph`, `emitInvariants`, `emitDoctrines`, `emitResolutions`, `emitContracts`, `emitProjectionMeta` (plus `index.ts` orchestration).

**AC**

- Deterministic key and file ordering across runs.
- `generated/doctrines.ts` and `generated/resolutions.ts` present when specs non-empty.

### E2-T3 — Manifest hashing

**AC**

- `manifest.json` records input/output hashes; any spec change changes hash.

### E2-T4 — `pnpm generate` (or equivalent)

**AC**

- Single command generates all artifacts and manifest; exits zero on success.

### E2-T5 — CI drift gate

**AC**

- CI runs generate and fails if `git diff` is non-empty for generated paths.

### E2-T6 — Doctrine and resolution validation (build-time)

Encode rules from the blueprint §5.2:

**AC**

- Fails if `invariantSpec.doctrineRef` points to missing doctrine.
- Fails if `invariantSpec.resolutionRef` points to missing resolution (when required for that invariant class).
- Fails if doctrine `linkedInvariants` references unknown invariant.
- Fails if regulatory invariant lacks `doctrineRef`.
- Fails if resolution action type is unsupported or missing required `target`.

---

## E3 — Command pipeline and invariant engine

### E3-T1 — `executeCommand.ts`

**AC**

- Pipeline order matches `architecture.md` §7 intent: bind tenant → authorize → validate → idempotency → pre-commit invariants → transaction (mutation + memory) → projections → post-commit.
- CorrelationId propagated for tracing.

### E3-T2 — Tenant binding and authorization stubs

**AC**

- Missing or mismatched tenant rejected before mutation.
- Authorization hook present (even if policy is minimal in Phase 1).

### E3-T3 — Idempotency

**AC**

- Same idempotency key does not create duplicate economic effect; stable idempotency record behavior.

### E3-T4 — Invariant registry

**AC**

- Invariants registered by name; lookup by name works for runners.

### E3-T5 — `runPreCommit.ts`

**AC**

- Runs only `timing: "pre-commit"` invariants for the command target.
- Blocking failures prevent commit.

### E3-T6 — `runPostCommit.ts` (async)

**AC**

- Post-commit work does not hold the primary transaction open indefinitely.

### E3-T7 — `runProjectionReadChecks.ts`

**AC**

- Read-time / projection-scoped invariants (e.g. `authoritative_projection_requires_clean_truth_contract`) run when building financial authority projection, not only on command commit.

### E3-T8 — `InvariantBlockError` and failure assembly

**AC**

- `InvariantBlockError` carries `InvariantFailurePayload[]`.
- Pre-commit failures surface structured payloads (wired to E4 when doctrine/resolution apply).

---

## E4 — Doctrine and resolution runtime

### E4-T1 — `doctrineLookup.ts`

**AC**

- `getDoctrineByRef` returns full doctrine metadata from generated/catalog input.
- Invalid `doctrineRef` for a regulatory path is treated as failure (generation should catch; runtime defensive check acceptable).

### E4-T2 — `doctrineTrace.ts`

**AC**

- `buildDoctrineTrace` fills `InvariantFailurePayload["doctrine"]` with family, standard, section, title, interpretation, and optional `clauseRef`.

### E4-T3 — `resolutionLookup.ts`

**AC**

- `getResolutionByRef` resolves `resolutionSpec` entries for payload assembly.

### E4-T4 — `buildResolutionContract.ts`

**AC**

- Produces `InvariantFailurePayload["resolution"]` with actions, class, `responsibleRole` as applicable.
- Role-based filtering and/or workflow escalation when actor cannot apply direct actions (per blueprint).

### E4-T5 — End-to-end failure payload builder

**AC**

- Given invariant name + evidence facts + optional actor role, output matches `InvariantFailurePayload` (invariant + evidence + doctrine + resolution when applicable).

---

## E5 — Memory and supersession

### E5-T1 — `buildTemporalTruthRecord`

**AC**

- 7W1H + temporal fields present per `architecture.md` §9; minimal shape acceptable for Phase 1.

### E5-T2 — `appendRecord`

**AC**

- Successful mutation implies successful memory append in the same transaction (or compensating behavior if append fails).

### E5-T3 — Supersession guard

**AC**

- Meaning-changing mutation without supersession metadata is blocked when supersession invariant applies.

---

## E6 — Vertical flow

### E6-T1 — `ConfirmSalesOrder` (or equivalent)

**AC**

- Valid transition (e.g. draft → confirmed) with memory record.

### E6-T2 — `ReserveInventoryForOrder` (or equivalent)

**AC**

- Reservation movement recorded; idempotent under retry for same intent.

### E6-T3 — `PostOrderJournal`

**AC**

- Journal posting path runs; `journal_balances` enforced pre-commit; failure returns structured payload (doctrine + resolution + evidence).

### E6-T4 — `ReverseJournalEntry` (optional for Phase 1 minimum)

**AC**

- If in scope: reversal links to original journal; memory auditable.

### E6-T5 — Integration scenarios (manual or automated)

**AC**

- **FX path:** missing FX basis → `fx_conversion_basis_required` blocks with IAS 21 doctrine + resolution evidence shape.
- **Revenue path:** premature recognition → `revenue_recognition_requires_fulfillment` with IFRS 15 doctrine + workflow resolution.
- **Journal path:** unbalanced journal → `journal_balances` with accounting control doctrine + correction resolution.

---

## E7 — Projections and financial authority

### E7-T1 — Sales order projection

**AC**

- Reflects current state from memory/projection rules for the vertical.

### E7-T2 — Inventory position projection

**AC**

- Reserved vs available (or equivalent) consistent with movements.

### E7-T3 — `FinancialAuthorityProjection`

**AC**

- Includes `authorityStatus`, `invariantSnapshot` (entries may include `doctrineRef`), `valuationBasisStatus`, `provenance`, and **`blockedReasons?: InvariantFailurePayload[]`** when blocked.
- When truth contract fails, status is **blocked** (`architecture.md` §8.5, §10.9).

### E7-T4 — Blocked projection API shape

**AC**

- Blocked responses expose `blockedReasons` with doctrine, evidence, and resolution layers where applicable.

---

## E8 — Replay and checksum

### E8-T1 — Replay single identity / projection family

**AC**

- Rebuild from memory yields deterministic checksum for scoped projection.

### E8-T2 — Replay tenant scope

**AC**

- Replay covers Phase 1 projections; checksums recorded or compared in CI.

### E8-T3 — Checksum comparison

**AC**

- Mismatch fails the test or CI step.

---

## E9 — CI and evidence

### E9-T1 — Doctrine catalog export artifact

**AC**

- Writes e.g. `artifacts/doctrine/doctrine-catalog-export.json` in CI or script; contents list doctrines and linkage.

### E9-T2 — Resolution catalog export artifact

**AC**

- Writes e.g. `artifacts/resolution/resolution-catalog-export.json`.

### E9-T3 — Doctrine catalog **check** (hard fail)

**AC**

- Script or gate fails on: missing `doctrineRef` on regulatory invariant, broken links, invalid visibility class, malformed `clauseRef` when policy requires.

### E9-T4 — Resolution mapping **check** (hard fail)

**AC**

- Fails on invalid action types, missing `resolutionRef` where required, missing `responsibleRole` / `target` per policy.

### E9-T5 — Replay drill in CI

**AC**

- Seeds vertical flow, replays, compares checksums.

### E9-T6 — Tenant isolation regression

**AC**

- Cross-tenant access rejected; evidence trace or test output archived.

### E9-T7 — Legal erasure fixture (if in Phase 1 scope)

**AC**

- Anonymization fixture run; replay validity preserved per `architecture.md` / board pack.

---

## E10 — API surface

### E10-T1 — Command routes

**AC**

- Success and **blocked** responses; blocked returns `{ status: "blocked", failures: InvariantFailurePayload[] }` (or equivalent contract).

### E10-T2 — Projection routes

**AC**

- Financial authority projection returns blocked payload with `blockedReasons` when not authoritative.

### E10-T3 — Replay routes (debug or internal)

**AC**

- Trigger replay and return checksum(s) for evidence.

---

## Task implementation status matrix

Per-task rollup aligned with [`phase-1-alignment-audit.md`](./phase-1-alignment-audit.md). **partial** means some AC met or scoped to a thinner shape than the normative row.

| Task    | Status        | Notes |
| ------- | ------------- | ----- |
| E1-T1   | done          | `identitySpec.ts` and generator emitter. |
| E1-T2   | done          | `enumSpec.ts`. |
| E1-T3   | done          | `relationSpec.ts`. |
| E1-T4   | partial       | Invariant rows lack full blueprint field set (`authority`, `semanticClass`, `scope`, `target`, `remediationOwner`); all current rows have `doctrineRef` / critical → `resolutionRef`. |
| E1-T5   | partial       | Doctrine rows omit `linkedInvariants` / `visibilityClass`; orphan doctrines prevented via generator + `catalogChecks` (inverse linkage). |
| E1-T6   | partial       | Uses `actions` (not `allowedActions` name); targets validated incl. navigate `/…` and workflow id pattern. |
| E1-T7   | partial       | `contracts/failures.ts` unified; `doctrine` required in types (stricter than blueprint optional). |
| E2-T1   | partial       | No standalone `normalize.ts`; `loadSpecs` + `validateSpecs` + deterministic emitters provide stability. |
| E2-T2   | partial       | Identity, enums, relations, invariants, doctrines, resolutions, manifest; **no** `emitGraph` / `emitContracts` / `emitProjectionMeta` yet. |
| E2-T3   | done          | `manifest.json` from generator. |
| E2-T4   | done          | `pnpm run generate` in `@afenda/core`. |
| E2-T5   | done          | `check:generate` in CI. |
| E2-T6   | partial       | `validateSpecs.ts` + `catalogChecks.ts`; missing blueprint extras: doctrine `visibilityClass` allow-list, `clauseRef` policy. |
| E3-T1   | partial       | Pipeline order matches; **CorrelationId** not evidenced in `executeCommand.ts`. |
| E3-T2   | partial       | Hooks exist; depth of tenant mismatch policy varies by adapter. |
| E3-T3   | partial       | Idempotency hook present; full duplicate-economic-effect story tied to vertical (E6). |
| E3-T4   | done          | `buildTruthRegistry` + invariant runner. |
| E3-T5   | partial       | Pre-commit filtering in `invariantRunner` (no separate `runPreCommit.ts` file). |
| E3-T6   | partial       | Post-commit in runner + `executeCommand`; async boundary as designed depends on caller. |
| E3-T7   | done          | Added `read-time` timing + `runProjectionReadChecks`; wired into truth evidence authority merge path. |
| E3-T8   | partial       | Chose Option 2: result-object model retained with `isInvariantBlockResult` + ADR; no throw-based `InvariantBlockError` yet. |
| E4-T1   | done          | `runtime/doctrine/doctrineLookup.ts`. |
| E4-T2   | done          | `runtime/doctrine/doctrineTrace.ts`. |
| E4-T3   | done          | `runtime/resolution/resolutionLookup.ts`. |
| E4-T4   | done          | `runtime/resolution/buildResolutionContract.ts`. |
| E4-T5   | done          | `buildInvariantFailurePayload.ts`. |
| E5-T1   | not started   | No `buildTemporalTruthRecord` in core (memory types may exist). |
| E5-T2   | done          | `appendMemory` after mutation in `executeCommand.ts`. |
| E5-T3   | partial       | Invariant specified; vertical guard not fully evidenced in core command slice. |
| E6-T1   | not started   | — |
| E6-T2   | not started   | — |
| E6-T3   | not started   | — |
| E6-T4   | not started   | Optional. |
| E6-T5   | not started   | Named integration scenarios not automated as backlog lists. |
| E7-T1   | not started   | — |
| E7-T2   | not started   | — |
| E7-T3   | partial       | Projection now includes authority contract fields (`tenantId`, `scopeId`, `invariantSnapshot`, `valuationBasisStatus`, `provenance`) plus deterministic sorted reasons and blocking key arrays. |
| E7-T4   | partial       | Truth evidence artifact exposes enriched blocked payload and blocking keys; no HTTP API in core. |
| E8-T1   | partial       | Replay now uses composite identity (`entityName::entityId`) with explicit deterministic sorting and order-invariant checksum tests; supersession-aware topology remains future hardening. |
| E8-T2   | partial       | `verify:truth` + stub adapters in CI script. |
| E8-T3   | done          | Mismatch fails `verify-truth.ts`. |
| E9-T1   | done          | `artifacts/truth/doctrine-catalog-export.json` (path differs from example `artifacts/doctrine/`). |
| E9-T2   | done          | `artifacts/truth/resolution-catalog-export.json`. |
| E9-T3   | partial       | Hard-fail on links / critical / roles / targets; not on `visibilityClass` / `clauseRef` policy. |
| E9-T4   | done          | `check:catalogs` + mapping artifacts + action normalization. |
| E9-T5   | done          | `pnpm verify:truth` in workflow. |
| E9-T6   | done          | `test:truth-guards` + tenant-scoped adapters test. |
| E9-T7   | not started   | Deferred. |
| E10-T1  | not started   | Out of `packages/core`. |
| E10-T2  | not started   | Out of `packages/core`. |
| E10-T3  | not started   | Out of `packages/core`. |

---

## Dependency order

```txt
E1 → E2 → E3
E3 → E4 → E5
E5 → E6
E6 → E7
E7 → E8
E8 → E9
E3 + E7 → E10
```

**Notes**

- **E1-T7** (`failures.ts`) can land with **E1** or immediately before **E3**; E4 consumes it.
- **E2-T6** must run in CI after **E2** emitters exist.
- **E4** depends on **E2** outputs (generated doctrines/resolutions) or direct spec reads — keep one source of truth.

---

## Definition of done (Phase 1)

**Snapshot (packages/core, see alignment audit):** deterministic generation, doctrine/resolution catalog exports + hard-fail checks, replay checksum in CI, metadata-driven failure payloads, enriched authority projection contract, and read-time invariant checks are **in place**. Full Phase 1 DoD below still requires vertical commands (E6), API (E10), and remaining task-matrix gaps.

Phase 1 is complete only when all of the following hold:

- Generator is deterministic; drift gate passes.
- Regulatory invariants for the vertical are instantiated and doctrine-linked.
- Resolvable blocking failures emit **structured resolution** metadata, not ad hoc strings.
- Blocked **commands** and blocked **authority projection** can carry doctrine + evidence + resolution per `InvariantFailurePayload`.
- Duplicate economic effect is prevented; supersession rules enforced where applicable.
- Replay checksum evidence exists for at least one projection family.
- CI produces doctrine and resolution artifacts and **failing checks** on invalid catalogs.

Aligned with [`phase-1-implementation-blueprint.md`](./phase-1-implementation-blueprint.md) §15–16 and [`architecture.md`](./architecture.md) §8.5, §10.4–10.9.

---

## Anti-patterns (do not ship)

- Doctrine or remediation copy **hardcoded** in handlers or UI instead of spec → generator → runtime.
- Skipping `doctrineRef` on regulatory invariants.
- Treating `resolutionSpec` as documentation only (not enforced in payloads).
- Empty `blockedReasons` on blocked authority projection when invariants failed.

---

## Optional follow-ups (out of scope for this backlog)

- GitHub issue / Jira import templates
- PR checklist for invariant + doctrine + resolution reviews
