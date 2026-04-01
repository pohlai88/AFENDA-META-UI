# Graph validation policy lifecycle (runtime)

`GRAPH_VALIDATION_POLICY_JSON` is injected by **deploy**, **cron**, or **config service** after an offline `graph-validation report --format=json` run (or a trimmed `policy` object).

## Fields

- **`policyGeneratedAt`**: ISO-8601 timestamp; copied from `report.generatedAt` when exporting from a full report. Used with `decision.ttlSeconds` (default TTL in code when omitted) for staleness.
- **`decision`**: `severity` (P0–P3), `action` (`BLOCK` | `WARN` | `ALLOW`), optional `ttlSeconds`.
- **Legacy:** `isSecurityBlocking`, `isOperationalWarning`, `confidenceLevel` remain for CI and backward compatibility.

## Staleness

- **`GRAPH_VALIDATION_POLICY_STALE_MODE`**: `block` (default) — expired snapshot fails closed; `warn` — allow reads but emit telemetry; `allow` — allow reads (emits telemetry).
- **`GRAPH_VALIDATION_POLICY_MAX_FUTURE_SKEW_SECONDS`**: max allowed clock skew for `policyGeneratedAt` in the future (default `300` seconds). Beyond this, the snapshot is treated as stale.
- **`GRAPH_GUARD_ALLOW_EVENT_SAMPLE_RATE`**: optional sampling for noisy telemetry outcomes (`allow`/`noop`) in the guard (`0..1`, default emits all).

## Refresh cadence

Recommend refreshing policy at least as often as the shortest `ttlSeconds` you emit (e.g. hourly cron for P0-sensitive fleets, daily for stable tenants). Document the chosen schedule in your service runbook.
