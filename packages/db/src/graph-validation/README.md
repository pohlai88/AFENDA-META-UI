# @afenda/db/graph-validation

**FK catalog, orphan detection, tenant isolation, index coverage, health scoring, and deterministic v1 JSON reports** with derived runtime policy for CI and optional query-layer guardrails.

**Data-layer submodule** — ships inside `@afenda/db`; consumers import `@afenda/db/graph-validation`. The **CLI** is `pnpm --filter @afenda/db graph-validation` (see [`runner.ts`](./runner.ts)).

---

## Quick start

### Installation (within monorepo)

```json
{
  "dependencies": {
    "@afenda/db": "workspace:*"
  }
}
```

### Import strategies

#### Strategy A — Subpath (recommended)

```typescript
import {
  GRAPH_VALIDATION_REPORT_VERSION,
  buildGraphValidationReport,
  stringifyReportDeterministic,
  parseGraphValidationReportJson,
  policyFromReportJson,
  deriveGraphValidationPolicy,
  calculateHealthScore,
  runGraphValidationAdjuncts,
  fingerprintFkCatalog,
  type GraphValidationReportJson,
  type GraphValidationPolicy,
  type TruthSurface,
} from "@afenda/db/graph-validation";
```

**Use when:** Building policy snapshots, parsing CI artifacts, wiring adjunct checks, or integrating health/policy into services.

#### Strategy B — Barrel from `@afenda/db`

The root `@afenda/db` barrel does **not** re-export `graph-validation`; always use `@afenda/db/graph-validation` so report/policy types stay explicit and tree-shakeable.

---

## Public surface (summary)

| Area | Symbols / modules |
| ---- | ----------------- |
| **Version & types** | `GRAPH_VALIDATION_REPORT_VERSION`, `GraphValidationReportJson`, `GraphValidationPolicy`, `PolicySeverity`, `PolicyDecision`, `AdjunctCheckResult`, `TruthSurface` |
| **Report build** | `buildGraphValidationReport`, `stringifyReportDeterministic`, `DEFAULT_ERP_SCHEMAS` |
| **Policy / parse** | `parseGraphValidationReportJson`, `extractPolicyFromEnvelope`, `policyFromReportJson`, `GraphValidationReportParseError` |
| **Scoring** | `calculateHealthScore`, `deriveGraphValidationPolicy`, `formatHealthReport`, `GraphHealthScore` |
| **Adjuncts** | `runGraphValidationAdjuncts`, `fingerprintFkCatalog` |
| **CLI** | `pnpm --filter @afenda/db graph-validation` → [`runner.ts`](./runner.ts); artifact check → `graph-validation:validate-artifact` |

Full barrel: [`index.ts`](./index.ts).

---

## Feature guides

### 1. JSON report and policy

Run `graph-validation report --format=json` (see [OPERATIONS.md](./graph-validation-docs/OPERATIONS.md)), then consume `policy` + `healthScore` in CI or `GRAPH_VALIDATION_POLICY_JSON` for the optional [query guard](../queries/ARCHITECTURE.md). Validate saved files with `pnpm --filter @afenda/db graph-validation:validate-artifact <file.json>`.

### 2. Adjunct lanes

Optional Squawk, FK drift vs `GRAPH_VALIDATION_FK_BASELINE_PATH`, and schema manifest checks — see [ADJUNCTS.md](./graph-validation-docs/ADJUNCTS.md).

### 3. Staleness and guardrails

Policy TTL and `GRAPH_VALIDATION_POLICY_STALE_MODE` are documented in [POLICY_LIFECYCLE.md](./graph-validation-docs/POLICY_LIFECYCLE.md). Query-layer integration lives under `src/queries/_shared/graph-guardrail.ts`.

---

## Local development

**Database:** set `DATABASE_URL` (see [OPERATIONS.md](./graph-validation-docs/OPERATIONS.md#quick-start)).

```bash
pnpm --filter @afenda/db graph-validation health
pnpm --filter @afenda/db graph-validation report --format=json
pnpm --filter @afenda/db graph-validation:validate-artifact ./validation-report.json
```

---

## Testing

```bash
pnpm --filter @afenda/db test:graph-validation
pnpm --filter @afenda/db test:graph-validation:coverage
pnpm --filter @afenda/db test:graph-validation:all
pnpm --filter @afenda/db typecheck
pnpm --filter @afenda/db build
```

---

## ADRs (decisions)

- None as standalone ADR files; operational decisions live in [graph-validation-docs/](./graph-validation-docs/) (policy lifecycle, adjuncts, guardrail promotion).

---

## Related documentation

- [ARCHITECTURE.md](./ARCHITECTURE.md) — Design, boundaries, consumers, governance
- [graph-validation-docs/OPERATIONS.md](./graph-validation-docs/OPERATIONS.md) — Expanded CLI, monitoring, troubleshooting, **CI/CD** (runner stack, pnpm/Node pins, `jq` fail-closed gates, `DATABASE_URL`, artifacts)
- [SKILLS.md](./graph-validation-docs/SKILLS.md) — Agent skill baseline for this module
- [POLICY_LIFECYCLE.md](./graph-validation-docs/POLICY_LIFECYCLE.md), [FEEDBACK_LOOP.md](./graph-validation-docs/FEEDBACK_LOOP.md)
- [../../README.md](../../README.md) — `@afenda/db` package overview
- [../../../../docs/TYPESCRIPT_EXPORTS.md](../../../../docs/TYPESCRIPT_EXPORTS.md) — Monorepo export conventions

---

## Stability policy

1. Treat `GRAPH_VALIDATION_REPORT_VERSION`, `parseGraphValidationReportJson`, and exported policy/report types as a **contract**; breaking changes require a coordinated `@afenda/db` release and fixture updates.
2. Prefer `@deprecated` + one minor cycle before removing symbols.
3. Bump report version, golden fixtures, and optional [`report-v1.schema.json`](./report-v1.schema.json) together when the JSON shape changes.

---

## Checklist (optional)

| Practice | Status |
| -------- | ------ |
| v1 report + `validate-artifact` in CI | Intended |
| Policy JSON for guard (`GRAPH_VALIDATION_POLICY_JSON`) | Optional per route |
| FK baseline fingerprint when using adjunct drift | When `GRAPH_VALIDATION_FK_BASELINE_PATH` set |
| Vitest (graph-validation + graph-guard) | `test:graph-validation:all` |
