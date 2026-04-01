# Truth compiler — baseline audit checklist

Use this checklist **before** large compiler or contract changes and **quarterly** for governance reviews. Record findings in [BASELINE_AUDIT_FINDINGS.md](./BASELINE_AUDIT_FINDINGS.md) or your tracker.

| Field | Value |
| ----- | ----- |
| **Domain steward** | _assign owner_ |
| **Last completed** | _YYYY-MM-DD_ |
| **Remediation owner** | _name / team_ |

---

## 1. Pipeline integrity

- [ ] `truth-config.ts` `COMPILER_INPUT` matches exported `TruthModel` / registries (`@afenda/meta-types`).
- [ ] `normalize(COMPILER_INPUT)` runs without throw.
- [ ] Compiler stages run in production order: invariants → cross-invariants (strict) → mutation policies (strict) → transitions → events.
- [ ] `buildDependencyGraph` + topological order applied before emit (same as `generate-truth-sql.ts`).
- [ ] `emitSqlSegments` ordering is stable (kind + model + sql).

## 2. Artifact freshness and drift

- [ ] `pnpm --filter @afenda/db truth:check` passes locally (committed `truth-v1.sql` matches compiler).
- [ ] `pnpm --filter @afenda/db truth:schema:compare` reports `ok` or drift is documented and tracked.
- [ ] Hand-SQL files (`sql/truth-runtime-primitives.sql`, `sql/truth-supplemental-triggers.sql`) reviewed when schema/events change.

## 3. Runtime parity (API)

- [ ] `resolveMutationPolicy` / `isDirectMutationAllowed` behavior matches expectations for governed models.
- [ ] `executeMutationCommand` paths call `validateInvariants` when wired; `invariantEnforcementMiddleware` evaluates conditions (not a no-op stub).
- [ ] Event-only / dual-write paths align with `MutationPolicyDefinition.requiredEvents`.

## 4. Test parity

- [ ] `pnpm --filter @afenda/db test:truth-compiler` passes.
- [ ] DB integration tests (when `DATABASE_URL` set) apply the **same** segment set as the production pipeline (or apply committed migration bundle).
- [ ] `@afenda/truth-test` auto-generated tests still align with registries (`direct` / `dual-write` / `event-only` metadata rules).

## 5. CI and local gates

- [ ] Advisory job (PR/push) surfaces `truth:check` + schema drift without blocking merge (warn-only policy).
- [ ] Developers can run strict preflight: `pnpm truth:gate` (root) before merge.
- [ ] `pnpm ci:gate` includes `truth-score` where applicable; understand it is heuristic, not a substitute for `truth:check`.

## 6. Documentation

- [ ] `README.md`, `ARCHITECTURE.md`, and `upgrade.md` reflect current compiler behavior (no obsolete “TODO stub” narratives).
- [ ] Doc freshness: review date in this checklist or ARCHITECTURE steward note updated.

## 7. Metrics (optional)

- [ ] Count of `truth:check` failures caught in CI advisory runs (track over time).
- [ ] Time-to-remediate drift from first advisory signal to merged fix.

---

## Sign-off

| Role | Name | Date |
| ---- | ---- | ---- |
| Steward | | |
| Engineering | | |
