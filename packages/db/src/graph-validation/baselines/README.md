# FK catalog baselines (drift detection)

`GRAPH_VALIDATION_FK_BASELINE_PATH` should point to a JSON file produced from a **trusted** graph-validation catalog export.

## Create or refresh a baseline

```bash
pnpm --filter @afenda/db graph-validation export-catalog --output=packages/db/src/graph-validation/baselines/fk-catalog-baseline.json
```

Commit the file when schema/FK changes are intentional. The adjunct compares a SHA-256 fingerprint of sorted `constraintName` values to the live catalog.

## Bump workflow

1. Apply migrations and verify graph health.
2. Re-export catalog to the baseline path (or update `fingerprint` only if you maintain a minimal file).
3. PR the updated baseline with a short note in the PR description.

Minimal hand-maintained shape:

```json
{ "fingerprint": "<64-char sha256 hex from prior export or adjunct details>" }
```

Prefer committing the full `export-catalog` JSON so diffs are reviewable.
