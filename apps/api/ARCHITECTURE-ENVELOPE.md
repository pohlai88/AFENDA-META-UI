<!--
  AFENDA-SURFACE-API-ENVELOPE
  Grep token: AFENDA-SURFACE-API-ENVELOPE | AFENDA-SURFACE-API-DO-NOT-DELETE

  Purpose: Declare that `apps/api` is the intentional HTTP/API surface for this monorepo,
  even though the Phase 1 blueprint diagram uses the folder name `surfaces/api/`.
  Use this file in PRs, runbooks, and DevOps reviews to block “directory not in architecture” mistakes.
-->

# API surface architecture envelope (`apps/api`)

## Authority (read before deleting or moving this app)

| Priority | Document | What it says about the API |
| -------- | -------- | --------------------------- |
| 1 | User / team decision in ADR or ticket | Overrides below if explicitly recorded |
| 2 | `.ideas/architecture/phase-1-implementation-blueprint.md` §3 | Illustrative tree uses `surfaces/api/` as the **conceptual** API package |
| 3 | `.ideas/architecture/phase-1-alignment-audit.md` §3 directory blueprint | **Explicit:** this repo does **not** implement a separate `packages/surfaces/api` tree; layout differs while core holds the truth/runtime slice |
| 4 | `AGENT.md` | E10 / API work is **outside** `packages/core` by design |

**Conclusion:** In **this** repository, **`apps/api` is the concrete realization of “surface API”** from the blueprint. Removing `apps/api` without a written migration (new app + route parity + auth + DB + policy gateways) is an **architecture-breaking** change, not a cleanup.

## What must survive a refactor (obligations)

If you replace `apps/api`, you must re-home:

- HTTP routes and middleware (`src/routes/`, `src/middleware/`)
- Mutation policy and command adapters (`src/policy/`), including `mutation-command-gateway.ts` and `mutationCommandGateway` → `@afenda/core` `executeCommand`
- Event store / projection integration under `src/events/` and related modules
- Any CI or deploy config that targets `@afenda/api`

## Inventory: files that were **new (untracked)** in git at envelope authoring

*Snapshot for auditors — refresh with `git status` before releases.*

| Path | Role |
| ---- | ---- |
| `.ideas/architecture/production_ticket.md` | Production patch notes (temporal memory + gateway narrative) |
| `apps/api/src/policy/__test__/mutation-command-gateway-canonical.test.ts` | Tests for `mutationCommandGateway` |
| `apps/api/src/policy/evaluate-condition.ts` | Policy-side condition evaluation helper |
| `packages/core/src/runtime/memory/recordTypes.ts` | Temporal truth record types + stable hash helpers |
| `packages/core/src/runtime/memory/buildTemporalTruthRecord.ts` | Canonical record builder |
| `packages/core/src/runtime/memory/supersession.ts` | Supersession requirement guard |
| `packages/core/src/runtime/memory/index.ts` | Memory module barrel |
| `packages/core/src/runtime/memory/buildTemporalTruthRecord.test.ts` | Vitest for builder + supersession |

**Related modified (not new):** `apps/api/package.json` (`@afenda/core`), `apps/api/src/policy/mutation-command-gateway.ts` (`mutationCommandGateway`), `packages/core/src/runtime/index.ts` (re-exports truth record **types** without clashing `stableStringify`), `.ideas/architecture/production_ticket.md` §9 wording.

## How to “call” this envelope in chat or tickets

Use one of:

- **Label / grep:** `AFENDA-SURFACE-API-ENVELOPE`
- **Path:** `apps/api/ARCHITECTURE-ENVELOPE.md`
- **One-liner:** “Blueprint `surfaces/api` → this repo maps to `apps/api`; see ARCHITECTURE-ENVELOPE.md.”

## Optional hardening (recommended)

- Add the same grep token to internal wiki or `phase-1-alignment-audit.md` under a one-line “API surface path: `apps/api`”.
- Add a CI check that fails if `apps/api/package.json` disappears (smoke job or CODEOWNERS on `apps/api/**`).
