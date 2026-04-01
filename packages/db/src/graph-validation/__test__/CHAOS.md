# Chaos and degradation expectations

When the database is unavailable during a scheduled `graph-validation report` job:

- The job should **fail** (non-zero exit) so CI does not publish a fresh policy artifact.

When a **per-FK query fails** (orphan or tenant isolation SQL):

- The error **propagates** — graph-validation does not treat failed queries as “no leaks / no orphans” (fail closed).
- Downstream: keep the **previous** `GRAPH_VALIDATION_POLICY_JSON` or fail closed if none exists.

When `GRAPH_VALIDATION_POLICY_JSON` is **malformed**:

- `assertGraphGuardrailAllowsRead` **throws** `GraphGuardrailSecurityError` (fail closed).

When policy is **stale** (`policyGeneratedAt` + TTL exceeded):

- Default **`GRAPH_VALIDATION_POLICY_STALE_MODE=block`**: fail closed.
- `warn` / `allow`: reads proceed; telemetry records `stale_allow` / `stale_block` outcomes.

Document service-specific runbooks alongside [`POLICY_LIFECYCLE.md`](../graph-validation-docs/POLICY_LIFECYCLE.md).
