# Column-kit shared columns CI gate

Static governance checks for `packages/db/src/column-kit` shared-column contracts.

## Run

```bash
# Direct
node tools/ci-gate/column-kit-shared-columns/index.mjs

# Root script
pnpm ci:gate:column-kit

# Master runner
pnpm ci:gate --gate=column-kit-shared-columns
```

## Live DB verification (evidence-based)

```bash
# Strict mode (default): fails if DATABASE_URL is missing
pnpm ci:gate:column-kit:live-db

# Default scope scans domain schemas only (core/security/reference/sales/hr/meta/accounting/inventory/purchasing).
# Include all non-system schemas explicitly:
pnpm ci:gate:column-kit:live-db --all-schemas

# Explicit URL
pnpm ci:gate:column-kit:live-db --database-url="$DATABASE_URL"

# Scope to schemas/tables
pnpm ci:gate:column-kit:live-db --schema=security --schema=hr
pnpm ci:gate:column-kit:live-db --table=security.users --table=sales.sales_orders

# CI-friendly JSON output
pnpm ci:gate:column-kit:live-db --format=json

# Fail on warnings too
pnpm ci:gate:column-kit:live-db --severity-threshold=warn

# Optional explicit baseline path + verbose suppression logs
pnpm ci:gate:column-kit:live-db --baseline=tools/ci-gate/column-kit-shared-columns/live-db-baseline.json --verbose

# Generate baseline proposal from current live findings (does not write)
pnpm ci:gate:column-kit:live-db:baseline

# Write proposal into baseline file
pnpm ci:gate:column-kit:live-db --update-baseline --write-baseline

# Validate local TypeScript Drizzle schema definitions (no DB required)
pnpm ci:gate:column-kit:local-ts

# Sales schema only (local TS, no DB)
pnpm ci:gate:column-kit:local-ts:sales
pnpm ci:gate:column-kit:local-ts:sales:json

# Master runner (same scope)
pnpm ci:gate --gate=column-kit-sales-domain

# Focused triage profile (sales + security)
pnpm ci:gate:column-kit:live-db:sales-security
pnpm ci:gate:column-kit:local-ts:sales-security
```

The live check introspects PostgreSQL metadata and evaluates it with
`evaluateSharedColumnCoverageWithShapes`. Findings are table-scoped and use
error/warn severities with non-zero exit semantics (default threshold: `error`).
Execution is routed through `@afenda/db` so the runtime uses the package's
declared PostgreSQL driver dependencies.

Both live and local-ts gates now apply a declarative lifecycle matrix from
`tools/ci-gate/column-kit-shared-columns/governance-matrix.json`:
- classify tables as `mutable` vs `appendOnly`
- exempt lifecycle checks that do not apply to append-only tables
- fail CI with `unclassifiedGovernance` when a table is not matched by any matrix rule

Baseline suppression format (`tools/ci-gate/column-kit-shared-columns/live-db-baseline.json`):

```json
{
  "baseline": {
    "security.users::missingRecommended::deletedAt": {
      "reason": "Legacy users table has no soft-delete; migration tracked in DB-1234",
      "severity": "warn"
    }
  }
}
```

Key format is `table::kind::subject` where:
- `table` is schema-qualified (e.g. `security.users`)
- `kind` is one of: `missingMandatory`, `missingRecommended`, `unexpectedCritical`, `unexpectedInformational`, `shapeMismatch`
- plus `unclassifiedGovernance` when matrix classification is missing
- `subject` is the column/fingerprint subject (e.g. `createdAt`, `name`)

`--update-baseline` only adds missing keys and preserves existing reasons; every added
entry gets a TODO reason placeholder that must be reviewed before merge.

## Local TS schema scan

`pnpm ci:gate:column-kit:local-ts` inspects table exports from
`packages/db/src/schema/index.ts` using Drizzle runtime metadata (`getTableConfig`),
then runs the same fingerprint evaluator used by live-db checks.

For machine-readable focused outputs:
- `pnpm ci:gate:column-kit:live-db:sales-security:json`
- `pnpm ci:gate:column-kit:local-ts:sales-security:json`

## What it validates

- `ALL_SHARED_FINGERPRINTS` is parseable and non-empty
- `MANDATORY_SHARED_COLUMNS` and `RECOMMENDED_SHARED_COLUMNS` are parseable and non-empty
- No duplicates in either list
- No overlap between mandatory and recommended lists
- All mandatory/recommended keys exist in `ALL_SHARED_FINGERPRINTS`
- `column-kit/index.ts` exports required governance and mixin symbols

## Warn mode

```bash
COLUMN_KIT_GATE=warn pnpm ci:gate:column-kit
```

Warn mode reports violations but exits successfully.

## Consuming the governance report (CI)

`evaluateSharedColumnCoverage` returns `unexpectedCritical` vs `unexpectedInformational` and sets `isCompliant` when mandatory columns are present **and** there are no critical unexpected matches (informational does not fail compliance).

Example script (run from repo root):

```bash
pnpm exec tsx tools/ci-gate/column-kit-shared-columns/evaluate-report-example.mts
```

That sample logs informational columns as warnings and exits with code 1 when `isCompliant` is false.
