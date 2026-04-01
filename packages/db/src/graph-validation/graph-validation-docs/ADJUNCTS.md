# Graph-validation adjuncts (OSS-inspired)

Adjuncts complement FK/orphan/tenant checks. They run when the CLI uses `--adjuncts`.

## Migration SQL lint (Squawk)

- **Binary:** Install [Squawk](https://github.com/sbdchd/squawk) (`cargo install squawk`, npm, or download release), or set `SQUAWK_BIN` to the executable path.
- **CI merge policy:** Default is **advisory** (see `GUARDRAIL_PROMOTION.md` Gate E). To fail the pipeline on Squawk violations, set `CI_GRAPH_ADJUNCTS_STRICT=true` in the environment that runs `check-adjuncts.mjs` (see `.github/workflows/graph-validation.yml`).
- **Allowlist:** Point `GRAPH_VALIDATION_SQUAWK_ALLOWLIST` at a file of rule names, one per line (`#` comments allowed). Each line becomes `--exclude=<rule>` for Squawk. Copy from `squawk-allowlist.example.txt` and tune deliberately.

## FK catalog drift (Atlas-style)

- Export a baseline: `pnpm --filter @afenda/db graph-validation export-catalog --output=path/to/fk-catalog-baseline.json`
- Compute fingerprint offline or use the JSON with `relationships[]`; see `baselines/README.md`.
- Set `GRAPH_VALIDATION_FK_BASELINE_PATH` to that file in CI or local runs with `--adjuncts`.

## Schema observability

- Set `GRAPH_VALIDATION_SCHEMA_MANIFEST_DIR` to a writable directory when running `report --adjuncts`; a `schema-manifest.json` listing migration SQL paths is written for audit/artifact upload.
