# Graph validation — Architecture

> **Status:** Production module inside `@afenda/db`  
> **Import path:** `@afenda/db/graph-validation`  
> **Tests:** `src/graph-validation/__test__` (Vitest); query guard: `src/queries/_shared/__test__`  
> **Runtime deps:** `drizzle-orm`, `pg`, `zod` (via `@afenda/db` dependency graph); CLI uses `tsx` + `DATABASE_URL`

---

## Design philosophy

| Old approach | New approach |
| ------------ | ------------ |
| Ad-hoc SQL or one-off scripts for FK sanity | Catalog-driven runs over all ERP schemas with tiered priorities |
| Opaque health signals | Deterministic **v1** JSON report + derived `policy` + optional JSON Schema |
| CI-only checks | Same artifact usable in CI, observability, and optional **read guard** (`GRAPH_VALIDATION_POLICY_JSON`) |
| Silent migration drift | Optional **adjuncts**: Squawk, FK fingerprint vs baseline, schema manifest |

---

## Module role

Graph validation is the **integrity plane** between Postgres FK data and consumers that need a machine-readable **health and policy** contract: CI gates, scheduled jobs, and optional runtime guardrails on generated query access.

- **Upstream consumers:** GitHub Actions (`graph-validation` workflow), internal ops scripts, services that ingest report JSON.
- **Downstream:** PostgreSQL (via `information_schema` + Drizzle schema), repo filesystem (adjuncts: migrations, manifest).
- **Boundary:** No HTTP server; no direct UI. Reads DB and repo context; writes stdout/files only. Policy consumption in the query layer is **optional** and env-driven.

### Boundary position

```
┌─────────────────────────────────────────────────────────────┐
│  Apps / API (optional GRAPH_VALIDATION_POLICY_JSON)          │
│       │                                                      │
│       ▼                                                      │
│  queries/_shared/graph-guardrail.ts  ◄── policy-from-report  │
└───────┬─────────────────────────────────────────────────────┘
        │ parse envelope
        ▼
┌─────────────────────────────────────────────────────────────┐
│  @afenda/db/graph-validation (this module)                   │
│  report-service · health-scoring · adjuncts · validate-artifact│
│       │                                                      │
│       ▼                                                      │
│  runner.ts (CLI) ──► Pool + Drizzle ──► Postgres             │
└─────────────────────────────────────────────────────────────┘
```

---

## Repository layout

```
packages/db/src/graph-validation/
├── index.ts                 # Public API (reports, policy, adjuncts)
├── runner.ts                # CLI: health | report | validate | tenants | export-catalog
├── validate-artifact.ts     # Strict v1 JSON validation (CI helper)
├── types.ts                 # Report version, policy, decision types
├── report-service.ts        # buildGraphValidationReport
├── report-dto.ts              # Deterministic stringify
├── policy-from-report.ts      # parseGraphValidationReportJson, envelope extraction
├── health-scoring.ts          # Score + deriveGraphValidationPolicy
├── fk-catalog.ts              # Catalog build + export JSON
├── orphan-detection.ts
├── tenant-isolation.ts
├── index-remediation.ts
├── adjuncts.ts                # Squawk, FK drift, manifest lanes
├── truth-surface.ts
├── report-v1.schema.json
├── baselines/                 # FK baseline README (+ committed JSON when opted in)
├── graph-validation-docs/     # ADJUNCTS, POLICY_LIFECYCLE, OPERATIONS, SKILLS, …
├── README.md
└── ARCHITECTURE.md
```

---

## Core architecture

### 1. Deterministic v1 report pipeline

`buildGraphValidationReport` aggregates catalog, orphan counts, tenant leak results, index coverage, and adjunct results into a single object versioned by `GRAPH_VALIDATION_REPORT_VERSION`. `stringifyReportDeterministic` ensures stable ordering for snapshots and CI diffs. `parseGraphValidationReportJson` enforces the full v1 shape for consumers and `validate-artifact.ts`.

### 2. Graded policy and adjuncts

`deriveGraphValidationPolicy` maps health inputs to `PolicyDecision` (severity, TTL, block vs warn). `runGraphValidationAdjuncts` runs optional checks (migration lint, FK fingerprint vs `GRAPH_VALIDATION_FK_BASELINE_PATH`, schema manifest). CI strictness is tunable (`CI_GRAPH_ADJUNCTS_STRICT`, etc.).

---

## Design patterns

- **Single artifact:** One JSON report carries both human-operational fields and machine `policy` for guards.
- **Fail closed on security:** Tenant leaks and `decision.action === "BLOCK"` (and security flags) align with guard behavior in `graph-guardrail.ts`.
- **Adjuncts as plugins:** Isolated in `adjuncts.ts` so core DB validation runs without Squawk or baselines.

---

## Consumer map

| Consumer | Usage |
| -------- | ----- |
| **CI** | Run CLI, validate artifact, optional adjunct enforcement |
| **Query layer** | `graph-guardrail.ts` reads `GRAPH_VALIDATION_POLICY_JSON` |
| **Operators** | `report`, `health`, `tenants` commands; see OPERATIONS.md |

---

## Testing strategy

- **Unit / contract:** `__test__/` — policy derivation, report parsing, FK catalog helpers, load/orphan fixtures.
- **Cross-module:** `test:graph-guard` ensures guard + policy parsing stay aligned.
- **Chaos / degradation:** Documented in `__test__/CHAOS.md`.

---

## Build and typecheck

```bash
pnpm --filter @afenda/db typecheck
pnpm --filter @afenda/db build
```

---

## Governance rules

1. **Report version:** Any change to the v1 JSON contract requires bumping `GRAPH_VALIDATION_REPORT_VERSION` and updating `parseGraphValidationReportJson`, fixtures, and `report-v1.schema.json` when used.
2. **Baseline commits:** When using FK drift adjuncts, commit baseline JSON or fingerprint per `baselines/README.md` when topology changes are intentional.
3. **Policy env:** Document who sets `GRAPH_VALIDATION_POLICY_JSON` and rotation in deploy/cron (see POLICY_LIFECYCLE.md).
4. **Guard adoption:** Optional per route; security outcomes remain fail-closed when configured.
5. **Fail closed on DB errors:** Orphan and tenant-isolation SQL failures **throw** (no silent skip). Scheduled health in CI asserts **production truth** from `validation-report.json` (policy, health, `tenantLeaks.isSecure`, P0/P1 orphan counts) without `continue-on-error` on those gates.

---

## Import strategy

```typescript
import {
  buildGraphValidationReport,
  parseGraphValidationReportJson,
  deriveGraphValidationPolicy,
} from "@afenda/db/graph-validation";
```

Prefer the subpath over deep imports into `policy-from-report.js` so refactors stay centralized in `index.ts`.

---

## Summary

Graph validation provides a **single, versioned contract** from live ERP schemas to CI and optional runtime policy. It keeps integrity concerns out of the API layer except through the explicit policy envelope and env flags.

**Related:** [README.md](./README.md) · [graph-validation-docs/OPERATIONS.md](./graph-validation-docs/OPERATIONS.md)
