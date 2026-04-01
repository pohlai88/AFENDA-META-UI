# Phase 1 Alignment Audit

Date: 2026-04-01 (revised same day — refreshed against repo)  
Scope: `packages/core` + `.github/workflows/core-truth-generation.yml`  
Authority docs:

- `.ideas/architecture/phase-1-engineering-backlog.md`
- `.ideas/architecture/phase-1-implementation-blueprint.md`

Status vocabulary (strict): `done` | `partial` | `wrong` | `not started`

---

## A) Backlog Alignment (E1–E10)

| Epic/Task | Current status | Evidence in repo | Keep / Replace / Delete | Notes |
| --- | --- | --- | --- | --- |
| E1 (truth spec foundation) | partial | `packages/core/src/truth/*.ts` | keep | Six specs present. Invariant rows omit backlog blueprint fields (`authority`, `semanticClass`, `scope`, `target`, `remediationOwner`). Doctrine rows omit `linkedInvariants` / `visibilityClass` (linkage enforced inversely: every doctrine referenced by an invariant; catalog checks orphan doctrines). Resolution uses `actions` not backlog’s `allowedActions` name. |
| E1-T7 `contracts/failures.ts` | partial | `packages/core/src/contracts/failures.ts`, `packages/core/src/runtime/types.ts` | keep | Single contract source. `doctrine` is **required** in types (blueprint shows optional) — stricter than §6.1 diagram. |
| E2 (generator + deterministic artifacts) | done | `packages/core/src/generator/*`, `packages/core/src/generated/*`, `pnpm run check:generate` | keep | Deterministic emitters, manifest, drift gate in CI. |
| E2-T6 doctrine/resolution validation hard gates | partial | `packages/core/src/generator/validateSpecs.ts`, `packages/core/src/ci/catalogChecks.ts` | keep | Duplicated concerns: generator validates bundle; `validateDoctrineResolutionCatalogs` hard-fails catalog integrity, mappings, role-resolvable `responsibleRole`, navigate/workflow targets (including **normalized** navigate `/…` and workflow `^[a-z0-9._-]+$`). Still missing blueprint §12.1 extras: `visibilityClass` allow-list, `clauseRef` policy. |
| E3-T1 command pipeline order | partial | `packages/core/src/runtime/command/executeCommand.ts` | keep | Tenant bind → authorize → validate → idempotency → pre-commit invariants → mutation → memory → projections → post-commit. **CorrelationId** propagation not evidenced in this module. |
| E3-T4 invariant registry | done | `packages/core/src/runtime/registry.ts` | keep | `buildTruthRegistry` indexes invariants/doctrines/resolutions. |
| E3-T7 read-time projection invariant checks | not started | — | create | No `runProjectionReadChecks`; `buildFinancialAuthorityProjection` only accepts pre-built `failures`. |
| E3-T8 `InvariantBlockError` | not started | — | create | Pre-commit returns `{ ok: false, stage, failures }`; no `InvariantBlockError` class per blueprint §7.4. |
| E4 (doctrine/resolution runtime) | done | `packages/core/src/runtime/doctrine/*`, `packages/core/src/runtime/resolution/*`, `buildInvariantFailurePayload.ts` | keep | Explicit modules match blueprint intent; failure assembly routes through `doctrineTrace` + `buildResolutionContract`. |
| E4-T1 `doctrineLookup.ts` | done | `packages/core/src/runtime/doctrine/doctrineLookup.ts` | keep | With tests under `runtime/__test__/`. |
| E4-T2 `doctrineTrace.ts` | done | `packages/core/src/runtime/doctrine/doctrineTrace.ts` | keep | |
| E4-T3 `resolutionLookup.ts` | done | `packages/core/src/runtime/resolution/resolutionLookup.ts` | keep | |
| E4-T4 `buildResolutionContract.ts` | done | `packages/core/src/runtime/resolution/buildResolutionContract.ts` | keep | Role filter + workflow escalation stub target `escalation` (workflow id, not path). |
| E4-T5 end-to-end enriched failure builder | done | `packages/core/src/runtime/buildInvariantFailurePayload.ts` | keep | Wires registry + doctrine + resolution. |
| E5-T2 mutation implies memory append | done | `executeCommand.ts` | keep | `appendMemory` awaited after `applyMutation`. |
| E5-T3 supersession guard | partial | invariant spec + runtime hooks TBD | replace | Spec includes `supersession_required_for_meaning_change`; dedicated vertical enforcement as in backlog E5-T3 not fully evidenced in core command slice. |
| E5 transaction/compensation semantics | partial | `packages/core/src/runtime/transaction.ts` + command usage | replace | Atomicity/compensation policy still thinly modeled. |
| E6 vertical domain commands | not started | — in `packages/core` | create | No `ConfirmSalesOrder` / reserve / journal commands in package. |
| E7-T1/T2 sales/inventory projections | not started | — | create | No `orderLedgerProjection` / `inventoryPositionProjection` style modules in core. |
| E7-T3 financial authority projection | partial | `packages/core/src/projection/types.ts`, `authorityProjection.ts`, `ci/generateTruthEvidence.ts` | replace | Only `authorityStatus` + `blockedReasons`. Missing blueprint: `tenantId`, `scopeId`, `invariantSnapshot`, `valuationBasisStatus`, `provenance`, `provisional` status. |
| E7-T4 blocked projection API shape | partial | Evidence artifact carries `blockedReasons` | keep | JSON-friendly; no HTTP route in core. |
| E8 replay + checksum | partial | `packages/core/src/replay/*`, `packages/core/src/ci/verifyReplay.ts`, `verify-truth.ts` | replace | `stableStringify` + SHA-256; replay is last-event-wins per `entityId`. **Identity/supersession hardening** still open (backlog E8-T1/T2). |
| E9-T1 doctrine catalog export | done | `packages/core/artifacts/truth/doctrine-catalog-export.json`, `scripts/generate-truth-catalog-artifacts.ts` | keep | Path is `artifacts/truth/` not blueprint’s `artifacts/doctrine/` — functional equivalent. |
| E9-T2 resolution catalog export | done | `packages/core/artifacts/truth/resolution-catalog-export.json` | keep | Same layout note. |
| E9 mapping artifacts | done | `invariant-doctrine-mapping.json`, `invariant-resolution-mapping.json` | keep | |
| E9-T3/T4 catalog hard-fail checks | done | `packages/core/scripts/check-truth-catalogs.ts`, `src/ci/catalogChecks.ts`, workflow `check:catalogs` | keep | Unlinked doctrine/resolution, critical→resolution, role-resolvable role, action targets + normalization. |
| E9-T5 replay drill in CI | done | `pnpm verify:truth` in `core-truth-generation.yml` | keep | Checksum mismatch fails script. |
| E9-T6 tenant isolation regression | done | `tenantScopedDbAdapters.test.ts`, `test:truth-guards` | keep | |
| E9-T7 legal erasure fixture | not started | — | deferred | Not in evidence path. |
| E10 API surface | not started | — in `packages/core` | create | Blocked command / projection / replay routes live outside this package per monorepo layout. |

---

## B) Blueprint Alignment (Sections 3–17)

| Blueprint section | Current status | Evidence in repo | Keep / Replace / Delete | Notes |
| --- | --- | --- | --- | --- |
| §3 directory blueprint | partial | `truth`, `generator`, `generated`, `runtime` (incl. `doctrine/`, `resolution/`), `projection`, `replay`, `ci`, `contracts` | keep | No separate `packages/runtime`, `platform/`, `surfaces/api` tree; core consolidates slice. |
| §4 truth specs | partial | `packages/core/src/truth/*.ts` | keep | Shapes are leaner than narrative examples in blueprint §4.2–4.4 (field names and optional platform/regulatory split). |
| §5 generator upgrades | partial | `emitDoctrines`, `emitResolutions`, `validateSpecs`, `catalogChecks` | keep | Core linkage rules enforced; doctrine `visibilityClass` / `clauseRef` policy from §5.2 not fully duplicated in checks. |
| §6 contracts failure payload | partial | `contracts/failures.ts` | keep | Aligns closely; required `doctrine` differs from optional in snippet. |
| §7 runtime doctrine/resolution | done | `runtime/doctrine/*`, `runtime/resolution/*`, `buildInvariantFailurePayload.ts` | keep | Matches §7.1–7.2 behavior. |
| §8 command pipeline + block error | partial | `executeCommand.ts` | keep | Pipeline yes; `InvariantBlockError` not used. |
| §9 financial authority projection | partial | `projection/*` | replace | Subset of §9 type only. |
| §10 API shapes | not started | — in scope | create | Implement in app/API layer when E10 is scheduled. |
| §11 memory and persistence | partial | `runtime/memory/*`, command hooks | keep | Operational tables out of core. |
| §12 CI/evidence | partial | `core-truth-generation.yml`, `artifacts/truth/*`, `catalogChecks`, `verify-truth` | keep | Layout differs from §12.2 folder sketch; **minimum exports** for doctrine/resolution/mappings + replay evidence are present. |
| §13 test plan | partial | Vitest across runtime, projection, replay, ci | keep | Integration scenarios in §13.2 not all automated as named flows. |
| §14 sprint outline | partial | — | keep | Phase sequencing still valid; several sprint 3–5 outcomes pending. |
| §15 exit criteria | partial | — | replace | Determinism + catalog CI + replay + metadata-driven failures: **strong**. Full vertical + API + full projection + read-time checks: **open**. |
| §16 non-negotiable rule | partial | specs → generate → runtime payloads | keep | Handlers should keep routing through `buildInvariantFailurePayload` / contracts. |
| §17 suggested build order | partial | Steps 1–2, 4–5, parts of 8–9 done; 6–7, 10 thin | keep | Next: E7/E8 hardening, E3-T7/T8, then E6/E10 when scope expands. |

---

## C) Wrong Items (corrected / closed)

| Item | Current status | Evidence in repo | Keep / Replace / Delete | Notes |
| --- | --- | --- | --- | --- |
| Split failure payload contracts | done | `contracts/failures.ts` + `runtime/types.ts` re-export | keep | Closed prior slice. |
| Prior audit claiming E4 “not started” | wrong (doc drift) | This file (pre-revision) | delete | Superseded by Section A — E4 modules exist. |
| Prior audit claiming E9 catalog artifacts/checks “not started” | wrong (doc drift) | `catalogChecks.ts`, `check-truth-catalogs.ts`, `artifacts/truth/*.json` | delete | Superseded — implemented. |

---

## D) Next Actions (strict-track continuation)

1. **E7 — Financial authority projection:** add blueprint fields (`tenantId`, `scopeId`, `invariantSnapshot`, `valuationBasisStatus`, `provenance`, `provisional`); stable ordering for `blockedReasons`; optional explicit `blockingInvariantKeys` / `blockingDoctrineKeys` for reviewability.
2. **E3-T7 — Read-time invariants:** introduce `runProjectionReadChecks` (or equivalent) and feed results into authority projection, not only ad hoc `failures` arrays.
3. **E3-T8 — `InvariantBlockError`:** either implement the class and throw from command path, or document an intentional **result-object** pattern as a controlled deviation from blueprint §7.4.
4. **E8 — Replay identity:** composite key (`entityName` + `entityId` or nested map), supersession-aware latest state, checksum stability (object key order already handled via `stableStringify`).
5. **E1/E2 policy parity:** optional `visibilityClass` on doctrines + CI allow-list; `clauseRef` shape checks per §12.1 doctrine check list.
6. **E6 / E10:** schedule vertical commands and API routes outside `packages/core` or expand package boundary explicitly.

---

## E) Audit boundaries and assumptions

- Evidence is from `packages/core` and `.github/workflows/core-truth-generation.yml` as of this revision.
- “Not started” in **API** or **full vertical** means no implementation **in this scope**; other apps (`apps/api`, etc.) are not exhaustively searched unless needed for E10.
- `pnpm --filter @afenda/core` scripts exercised in CI: `typecheck`, `test`, `test:truth-guards`, `check:generate`, `check:catalogs`, `evidence:catalogs`, `verify:truth`.

---

## F) Completed deltas (since prior audit revision)

- **E4 explicit modules:** `doctrineLookup`, `doctrineTrace`, `resolutionLookup`, `buildResolutionContract`, tests, wired through `buildInvariantFailurePayload`.
- **E9 catalog pipeline:** `catalogChecks.ts` (hard-fail rules + deterministic exports), `generate-truth-catalog-artifacts.ts`, `check-truth-catalogs.ts`, four JSON artifacts under `packages/core/artifacts/truth/`, CI steps in `core-truth-generation.yml`.
- **Resolution target normalization:** navigate paths must start with `/` (not `//`); workflow targets must match `^[a-z0-9._-]+$`; spec/runtime updated (`economic-effect-review`, escalation id `escalation`).
- **Single failure contract:** remains consolidated in `contracts/failures.ts` (see Section C).

---

## G) Validation evidence (commands / gates)

Run locally or rely on CI job `verify` in `core-truth-generation.yml`:

```bash
pnpm --filter @afenda/core typecheck
pnpm --filter @afenda/core test
pnpm --filter @afenda/core test:truth-guards
pnpm --filter @afenda/core check:generate
pnpm --filter @afenda/core check:catalogs
pnpm --filter @afenda/core evidence:catalogs
pnpm --filter @afenda/core verify:truth
```
