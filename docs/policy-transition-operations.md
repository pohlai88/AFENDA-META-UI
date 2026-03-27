# Mutation Policy Transition Operations Guide

**Phase**: Wave 3 Governance Hardening  
**Scope**: `sales_order`, `subscription`, `return_order`, `commission_entry`  
**Runtime States**: `direct -> dual-write -> event-only`  
**Last Updated**: March 28, 2026

---

## Overview

This runbook defines the operator process for promoting or rolling back mutation policy states for bounded-context write orchestration.

Goals:

- Preserve write availability during rollout.
- Keep event streams and projection checkpoints trustworthy.
- Use objective gates before each promotion.

Current bounded-context defaults in this repository:

- `sales_order`: command-owned writes under `event-only` command policy.
- `subscription`: command-owned writes under `event-only` command policy.
- `return_order`: command-owned writes under `event-only` command policy.
- `commission_entry`: command-owned approve/pay routes under route-scoped `event-only`, command-owned generation under route-scoped `dual-write`, shared registry still `direct`.

---

## Aggregate Inventory

| Aggregate | Current Policy | Target Policy | Rollback Target | Readiness Owner | Current Evidence |
| ----- | ----- | ----- | ----- | ----- | ----- |
| `sales_order` | `event-only` | Maintain | `dual-write` only if append-and-project degrades | Runtime owners | command tests, replay checks, stale-checkpoint guard |
| `subscription` | `event-only` | Maintain | `dual-write` | Runtime owners | command tests, route tests, checkpoint persistence, stale-checkpoint guard |
| `return_order` | `event-only` | Maintain | `dual-write` | Runtime owners | command tests, route tests, checkpoint persistence, stale-checkpoint guard, actor-identity enforcement |
| `commission_entry` | `direct` in shared registry; route-scoped pilot active | Promote after parity window | `direct` | Runtime owners | command tests for single and bulk approve/pay, generation command coverage, route tests |

Promotion note:

- `sales_order` is the reference baseline for `event-only` operation.
- `subscription` is now the first completed promotion after `sales_order` and is the reference cutover shape for future aggregates.
- `return_order` now uses the same append-and-project promotion shape, so all opted-in sales aggregates are aligned on `event-only` execution.
- `commission_entry` is the first post-sales promotion candidate, but it remains a route-scoped pilot until bulk semantics and generation parity hold across an observation window.

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

## 4.1 Promotion-Readiness Checklists

### `subscription`

Promotion evidence captured:

1. All command paths now report `mutationPolicy = event-only` in focused tests.
2. Each command path persists checkpoint metadata derived from the appended event version/timestamp.
3. Stale projection checkpoints fail before append-and-project execution.
4. Projection replay checks stay green for the shared runtime.
5. Rollback target remains explicitly documented as `event-only -> dual-write`.

Evidence commands:

1. `pnpm --filter @afenda/api test -- --run src/modules/sales/__test__/subscription-command-service.test.ts src/routes/__test__/sales.route.test.ts`
2. `pnpm --filter @afenda/api typecheck`
3. `pnpm ci:api:projection-replay`

### `return_order`

Promotion evidence captured:

1. All command paths now report `mutationPolicy = event-only` in focused tests.
2. Each command path persists checkpoint metadata derived from the appended event version/timestamp.
3. Route-level actor identity remains mandatory for inspect and credit-note.
4. Stale projection checkpoints fail before append-and-project execution.
5. Projection replay checks stay green for the shared runtime.
6. Rollback target remains explicitly documented as `event-only -> dual-write`.

Evidence commands:

1. `pnpm --filter @afenda/api test -- --run src/modules/sales/__test__/return-order-command-service.test.ts src/routes/__test__/sales.route.test.ts`
2. `pnpm --filter @afenda/api typecheck`
3. `pnpm ci:api:projection-replay`

### `commission_entry`

Promotion evidence required before shared-registry promotion:

1. Single-entry and bulk approve/pay routes report `mutationPolicy = event-only` with one appended event per updated entry.
2. Bulk pay preflight blocks all appends when any selected entry is still `draft`.
3. Generation route is command-owned and emits dual-write command metadata for both create and regenerate paths.
4. Stale projection checkpoints fail before append-and-project execution on entry-scoped approve/pay commands.
5. A parity window confirms route-scoped command flows are stable before the shared registry blocks direct writes for `commission_entry`.

Evidence commands:

1. `pnpm --filter @afenda/api test -- --run src/modules/sales/__test__/commission-command-service.test.ts src/routes/__test__/sales.route.test.ts`
2. `pnpm --filter @afenda/api typecheck`
3. `pnpm ci:api:projection-replay`

Checklist rule:

- Do not promote an aggregate unless every checklist item is backed by current test or operational evidence.

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

## 6.1 Promotion Approval Checklist

Use this exact checklist in the promotion PR description:

- [ ] Aggregate inventory row is up to date.
- [ ] Focused command-service tests are attached as evidence.
- [ ] Route-level regressions are attached as evidence.
- [ ] Projection replay check result is attached.
- [ ] Observation window start/end is recorded.
- [ ] Rollback owner is assigned.
- [ ] Rollback target is confirmed as one step.

---

## 6.2 Current Promotion Status

Completed promotions: `sales_order`, `subscription`, `return_order`

Next promotion candidate: `commission_entry` after route-scoped pilot evidence and parity window complete

Why there is no remaining sales aggregate cutover in this slice:

1. `subscription` already proved the first cutover from `dual-write` to `event-only` using append-and-project semantics.
2. `return_order` now carries the same event-only projection and stale-checkpoint guard behavior across approve, receive, inspect, and credit-note.
3. Actor identity remains mandatory on inspect and credit-note after promotion.

Recommended next follow-up scope:

1. Close `commission_entry` parity evidence and observation window, then promote the shared registry from `direct` to the chosen command-backed policy.
2. Keep rollback one-step: shared promotion should fall back to `direct` until the aggregate has a stable model-wide command policy.
3. Maintain shared replay and checkpoint diagnostics as the promotion baseline.

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
