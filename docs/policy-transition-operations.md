# Mutation Policy Transition Operations Guide

**Phase**: Wave 3 Governance Hardening  
**Scope**: `sales_order`, `subscription`, `return_order`  
**Runtime States**: `direct -> dual-write -> event-only`  
**Last Updated**: March 27, 2026

---

## Overview

This runbook defines the operator process for promoting or rolling back mutation policy states for bounded-context write orchestration.

Goals:

- Preserve write availability during rollout.
- Keep event streams and projection checkpoints trustworthy.
- Use objective gates before each promotion.

Current bounded-context defaults in this repository:

- `sales_order`: command-owned writes under `event-only` command policy.
- `subscription`: command-owned writes under `dual-write` rollout policy.
- `return_order`: command-owned writes under `dual-write` rollout policy.

---

## 1. Policy Semantics

| Policy | Runtime Behavior | Expected Event Append | Direct DB Write Path |
| ----- | ----- | ----- | ----- |
| `direct` | Standard write path only | No | Allowed |
| `dual-write` | Command executes write and appends event | Yes | Allowed |
| `event-only` | Command appends event and projects state | Yes (required) | Blocked for covered operations |

Notes:

- Guardrails are enforced by the mutation command gateway (`executeMutationCommand`, `assertBulkMutationAllowed`).
- `bulk-update` and `bulk-delete` are blocked for models under non-`direct` policy.

---

## 2. Preconditions For Any Transition

Run these checks before changing policy state:

1. Target command tests are green.
   - `pnpm ci:api:command-bounded-context`
2. Projection replay checks are green.
   - `pnpm ci:api:projection-replay`
3. No active P1/P0 incident tied to target aggregate writes.
4. On-call owner and rollback owner are assigned for the change window.
5. Expected actor identity behavior is documented for the target routes.

Deployment gate:

- Do not promote policy when either command or replay checks fail.

---

## 3. Transition Playbooks

### 3.1 `direct -> dual-write`

Use when introducing event coverage without removing direct persistence.

Steps:

1. Add/enable a `MutationPolicyDefinition` with `mutationPolicy: "dual-write"` for the target model.
2. Confirm command route responses include `meta.mutationPolicy` and `meta.eventType` where expected.
3. Run bounded-context tests and replay checks.
4. Deploy and monitor event append health for one observation window.

Exit criteria:

- No increase in write failure rate.
- Event append succeeds for all transitioned commands.
- Checkpoint updates are observed for command flows that persist checkpoints.

Rollback:

1. Revert target policy to `direct`.
2. Redeploy.
3. Re-run `pnpm ci:api:command-bounded-context`.
4. Record rollback reason in release notes.

### 3.2 `dual-write -> event-only`

Use when event stream and projection parity are stable.

Steps:

1. Ensure command flow supports append-and-project for the target aggregate.
2. Change policy to `event-only` for target model/operations.
3. Verify blocked direct write behavior is enforced for covered operations.
4. Re-run bounded-context tests and projection replay checks.
5. Deploy with on-call coverage and monitor error budget.

Exit criteria:

- Replay checks remain deterministic.
- Projection checkpoint version advances monotonically.
- No sustained `MUTATION_POLICY_VIOLATION` spikes from intended command routes.

Rollback:

1. Revert target policy from `event-only` to `dual-write`.
2. Redeploy.
3. Confirm write path recovery and event append continuity.
4. Open follow-up issue for parity gap root cause.

### 3.3 Emergency rollback `event-only -> direct`

Use only when both append-and-project and dual-write fallback are unavailable.

Steps:

1. Switch target model policy to `direct`.
2. Redeploy immediately.
3. Declare degraded event-sourcing posture in incident notes.
4. Schedule replay/reconciliation follow-up before next promotion attempt.

---

## 4. Parity Validation Window

Use a minimum 24-hour parity window before `dual-write -> event-only`.

Track these signals:

1. Command success rate per transitioned endpoint.
2. Event append success and latency for command writes.
3. Projection checkpoint freshness (no stale version drift).
4. Invariant failure rate (must remain within historical envelope).

Promotion rule:

- Promote only if all four signals are stable across the full parity window.

---

## 5. SLO And Error-Budget Guardrails

Use these guardrails during and after transition:

1. No sustained write error-rate regression beyond normal baseline.
2. No unresolved stale-checkpoint conflicts in critical command paths.
3. No unexplained increase in policy-violation responses for valid command traffic.
4. Recovery path (`dual-write` or `direct`) must remain documented before cutover.

When any guardrail fails:

1. Stop further promotions.
2. Roll back one policy step.
3. Open a remediation task with owner and due date.

---

## 6. Change Management Template

Use this change ticket template for each aggregate transition:

1. Target aggregate and endpoints.
2. Current policy and target policy.
3. Start/end of parity observation window.
4. On-call owner and rollback owner.
5. Verification evidence:
   - `pnpm ci:api:command-bounded-context`
   - `pnpm ci:api:projection-replay`
6. Final decision: promoted, paused, or rolled back.

---

## 7. CI Linkage

The following CI checks are required evidence for this runbook:

- GitHub Actions workflow `CI Pipeline` job `governance`:
  - `Bounded-context command tests`
  - `Projection replay checks`
- Local/PR equivalents:
  - `pnpm ci:api:command-bounded-context`
  - `pnpm ci:api:projection-replay`

These checks must pass before and after policy transition PRs.
