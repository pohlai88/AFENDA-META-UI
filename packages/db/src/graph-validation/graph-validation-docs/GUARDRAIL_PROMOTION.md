# Graph validation guardrail promotion gates

Runtime and query-layer coupling to graph-validation **must not** ship until these gates pass in CI.

## Gate A — Contract stability

- `parseGraphValidationReportJson` accepts only `reportVersion === 1` and validates the full v1 envelope: `generatedAt`, `policy` (including optional `decision` / `policyGeneratedAt`), `healthScore`, `schemasCovered`, `indexCoverage`, `orphans`, `tenantLeaks`, `catalog`, and optional `adjuncts.checks` (when present).
- Golden JSON tests pass for `stringifyReportDeterministic` output shape.
- Breaking changes require bumping `GRAPH_VALIDATION_REPORT_VERSION` in `types.ts` and migration notes in README.

## Gate B — Data-plane correctness

- `pnpm --filter @afenda/db test:graph-validation` passes (unit + integration tests under `src/graph-validation/__test__`).
- Health score uses measured **index coverage** from `detectMissingFkIndexes` (not assumed perfect).

## Gate C — Security policy

- `policy.isSecurityBlocking === true` only when tenant isolation is breached (`tenantLeaks.isSecure === false`).
- CI fails closed on `policy.isSecurityBlocking` when consuming `validation-report.json` (see workflow).

## Gate D — Query guard (optional env)

- `GRAPH_VALIDATION_POLICY_JSON` unset → **no** guard (backward compatible).
- Set to `policy` object or full report JSON → `*Guarded` generated access functions call `assertGraphGuardrailAllowsRead()`.
- Invalid JSON → **fail closed** (throws `GraphGuardrailSecurityError`).

## Gate E — OSS adjuncts (advisory by default)

- `--adjuncts` adds migration lint (Squawk if installed), optional FK drift vs `GRAPH_VALIDATION_FK_BASELINE_PATH`, and schema observability (optional manifest when `GRAPH_VALIDATION_SCHEMA_MANIFEST_DIR` is set).
- **Squawk:** `SQUAWK_BIN`, `GRAPH_VALIDATION_SQUAWK_ALLOWLIST` (rule names, `--exclude=` each). See `ADJUNCTS.md` and `squawk-allowlist.example.txt`.
- **CI:** `node tools/ci-gate/graph-validation/check-adjuncts.mjs <report.json>` — set repository variable `CI_GRAPH_ADJUNCTS_STRICT` to `true` to fail on any adjunct with `status: failed` (e.g. Squawk). Default is advisory when unset.

## Promotion order

1. Ship CLI + JSON report + CI artifact parsing.
2. Enable `--adjuncts` in scheduled health jobs.
3. After stable period, enable `*Guarded` call sites in application code where UX requires hard security blocks.
