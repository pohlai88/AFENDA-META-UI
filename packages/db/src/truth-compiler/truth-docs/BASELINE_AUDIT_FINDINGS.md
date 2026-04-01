# Truth compiler — baseline audit findings (living document)

**Purpose:** Central place to record drift, parity, and gate risks identified during audits. Update after each quarterly review or major truth change.

## Current snapshot (stabilization pass)

| ID | Area | Finding | Severity | Status |
| -- | ---- | ------- | -------- | ------ |
| F1 | CI | `truth:check` was not in blocking governance; stale `truth-v1.sql` could slip past `truth-score` heuristics. | High | Mitigated: advisory CI job + local `truth:gate`; blocking `truth:check` optional per release policy. |
| F2 | Tests | `truth-enforcement.integration.test.ts` applied only invariants + transitions, not mutation policies / cross / events. | High | Mitigated: integration test uses shared `buildOrderedSqlSegments()` matching `generate-truth-sql.ts`. |
| F3 | API | `invariantEnforcementMiddleware` used `passed = true` stub. | High | Mitigated: evaluates `ConditionExpression` via `@afenda/truth-test/auto` `evaluateCondition`. |
| F4 | truth-test | `generatePolicyTests` rejected `direct` mutation policy metadata. | Medium | Mitigated: allow `direct` in metadata test. |
| F5 | Schema compare | CLI always exited 1 on drift; hard to use in warn-only pipelines. | Low | Mitigated: `--warn-only` flag. |
| F6 | Docs | `upgrade.md` described aggregate invariant work as TODO while compiler emits deferred triggers. | Medium | Mitigated: roadmap section updated. |

## Open items (track here)

| ID | Area | Finding | Owner | Target |
| -- | ---- | ------- | ----- | ------ |
| O1 | Schema | `compareTruthToSchema` is table-level only; column/FK drift still possible. | TBD | Future phase |
| O2 | Coverage | `tools/truth-coverage` may still use placeholders; align with registries or document limits. | TBD | Future phase |

## Review log

| Date | Reviewer | Notes |
| ---- | -------- | ----- |
| _YYYY-MM-DD_ | | Initial stabilization baseline. |
