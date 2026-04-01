# Drizzle schema quality CI gate

Static checks on Drizzle schema sources under `packages/db/src/schema`. Discovered by the master runner as `drizzle-schema-quality`.

**Severity contract:** Each `ruleId` has a default **error** or **warn** in [`rules-matrix.json`](rules-matrix.json). Findings are finalized with that severity plus a stable **`key`** (`file::table::ruleId`, table `*` when file-scoped).

## Run

```bash
# From repo root (default mode=full: includes TABLE_PARSE_ERROR extractor)
pnpm ci:gate:schema-quality

# HR-only (same baseline + glob as dedicated script)
pnpm ci:gate:schema-quality:hr
# or: pnpm ci:gate:schema-quality -- --glob=packages/db/src/schema/hr/**/*.ts

# Master runner (mode=full by default; passes repo baseline for this gate)
pnpm ci:gate --gate=drizzle-schema-quality

# Stricter: no baseline (every finding fails the gate)
node tools/ci-gate/drizzle-schema-quality/index.mjs --mode=full

# Faster local iteration: skips extractSchema — can miss TABLE_PARSE_ERROR (see “Coverage gaps”)
node tools/ci-gate/drizzle-schema-quality/index.mjs --baseline=tools/ci-gate/drizzle-schema-quality/baseline.json --mode=fast
```

## Coverage gaps (false negatives)

- **`--mode=fast`** and **`pnpm ci:gate:fast`**: omit per-file `extractSchema`; **`TABLE_PARSE_ERROR`** is not evaluated. Default **`pnpm ci:gate`** / **`pnpm ci:gate:schema-quality`** use **full** mode.
- **Allowlisted RLS paths** (`core/`, `security/`, `meta/`, `reference/`): global tables may omit `tenantIsolationPolicies`; only **paired** tenant/bypass **counts** are checked there — not “every table must have RLS”. See [LIMITATIONS.md](LIMITATIONS.md).
- **Regex-based rules**: dynamic `tenantIsolationPolicies(foo)` or non-literal patterns may be miscounted.
- **`baseline.json`**: keyed suppressions hide matching findings by design. Console and JSON always include a **summary** (`Findings: …; N suppressed by baseline` / `summary.suppressedByBaseline`); use **`--verbose`** (console) for each suppressed key and reason.
- **Glob / HR-only scans**: only files matching the glob are checked — other schema modules are not.

## Flags

| Flag | Description |
|------|-------------|
| `--format=json` | Emit `{ "summary": { errorCount, warnCount, suppressedByBaseline }, "findings": [...] }` |
| `--baseline=<path>` | Suppress via `baseline` map and/or legacy `suppress` — see `baseline.example.json` |
| `--verbose` | After baseline, print each suppressed `key` and `reason` (console mode only) |
| `--severity-threshold=error` | Default: exit 1 if any **error** remains after baseline |
| `--severity-threshold=warn` | Exit 1 if any warning or error remains |
| `--mode=full` | Include per-file `extractSchema` (`TABLE_PARSE_ERROR`) |
| `--mode=fast` | File-level rules only |
| `--glob=<pattern>` | Override default glob (paths relative to repo root) |

## Rule IDs

| ruleId | Default severity | Source |
|--------|------------------|--------|
| `RLS_ZERO_POLICIES` | error | `rules-matrix.json` |
| `RLS_COUNT_MISMATCH` | error | `rules-matrix.json` |
| `FK_TENANT_ORDER` | error | `rules-matrix.json` |
| `INDEX_ANONYMOUS` | warn | `rules-matrix.json` |
| `UNIQUE_INDEX_ANONYMOUS` | warn | `rules-matrix.json` |
| `TABLE_PARSE_ERROR` | error | `rules-matrix.json` |
| `RELATIONS_DRIFT` | error | Domain relations catalog (`hr/_relations.ts`, `sales/_relations.ts`) vs extracted `foreignKey` edges |
| `ZOD_PARITY` | warn | HR `insert*Schema` vs `hrSchema.table` — `tenantId` integer vs `z.uuid()`, uuid `*Id` vs `z.number()` |
| `ORPHAN_UUID_COLUMN` | warn | Phase 2 (reserved) |

## Baseline

**Preferred** (`baseline.example.json`):

```json
{
  "baseline": {
    "hr/benefits.ts::benefit_enrollments::INDEX_ANONYMOUS": {
      "ruleId": "INDEX_ANONYMOUS",
      "severity": "warn",
      "reason": "Explicit justification for reviewers"
    }
  }
}
```

- **Key:** `file::table::ruleId`. File may be **short** (e.g. `hr/foo.ts`) — it is resolved under `packages/db/src/schema/`, or use a full `packages/...` path.
- **Validation:** Keys must be three `::`-separated segments; if `ruleId` is present in the object it must match the key suffix; **`reason`** is required (non-empty) for every `baseline` map entry. Any error rejects the whole `baseline` object (legacy `suppress` still loads).
- **`reason`:** Cite ADRs / issues when exempting; use `--verbose` to audit what was suppressed in CI logs.
- **Legacy** `suppress: [{ "key": "..." }]` or `[{ "ruleId", "file", "table?" }]` still works.

**Husky:** `.husky/commit-msg` runs `tools/scripts/commit-msg-check-drizzle-baseline.mjs` — if `baseline.json` is staged, the message must include `[baseline]`, `Baseline:`, `BASELINE:`, or `schema-quality baseline`.

Commit messages should mention baseline edits; prune entries as issues are fixed.

## Other docs

- [LIMITATIONS.md](LIMITATIONS.md) — regex / literal RLS calls
- [rules-matrix.json](rules-matrix.json) — canonical severity + descriptions

## Phase 3+

`ORPHAN_UUID_COLUMN` and deeper Zod / AST checks remain future work.

### Domain relations drift (`RELATIONS_DRIFT`)

Project-level:

- HR scan includes `packages/db/src/schema/hr/*.ts` data modules -> compare against `hr/_relations.ts`.
- Sales scan includes `packages/db/src/schema/sales/*.ts` data modules -> compare against `sales/_relations.ts`.
- Security scan includes `packages/db/src/schema/security/*.ts` data modules -> compare against `security/_relations.ts`.

Catalog `fromField` / `toField` must use the same SQL column names as Drizzle (e.g. `parent_department_id`, not `parent_id`). Deferred or omitted `foreignKey()` definitions will not produce edges.

**Remediation playbook (buckets, checklists, PR batches):** [packages/db/src/schema/hr/hr-docs/RELATIONS_DRIFT_REMEDIATION.md](../../../packages/db/src/schema/hr/hr-docs/RELATIONS_DRIFT_REMEDIATION.md)

### Zod parity heuristic (`ZOD_PARITY`)

Per file: for each `export const T = hrSchema.table(...)` with a matching `insert{Singular}Schema` (`departments` → `insertDepartmentSchema`), checks `tenantId` and uuid `*Id` columns vs the insert `z.object` body.
