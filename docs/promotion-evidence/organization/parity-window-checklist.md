# Organization Promotion Parity Window Checklist

- Aggregate: `organization`
- Current policy: `event-only`
- Target policy: maintain `event-only` during stabilization
- Rollback target: `dual-write`
- Execution context: `local-rehearsal`
- Observation window minimum: 24 hours

## Ownership

- [ ] Promotion owner assigned
- [ ] Rollback owner assigned
- [ ] On-call coverage confirmed for the full parity window

## Observation Window

- [x] Start timestamp recorded (UTC): `2026-03-27T20:04:41.928Z`
- [x] End timestamp recorded (UTC): `2026-03-27T23:11:36.020Z`
- [ ] Window duration >= 24h
- [x] Local rehearsal waiver applied (non-production only)

## Required Evidence Commands

- [x] `pnpm --filter @afenda/api exec vitest run src/organization/__test__/index.test.ts src/organization/__test__/organization-command-service.test.ts`
- [x] `pnpm --filter @afenda/api exec vitest run src/routes/__test__/organization.route.test.ts`
- [x] `pnpm ci:api:projection-replay`
- [x] `pnpm ci:parity:non-sales`

## Stability Signals (must remain stable for full window)

- [ ] Organization command success rate is within baseline
- [ ] No sustained `MUTATION_POLICY_VIOLATION` spikes on valid organization writes
- [ ] Projection checkpoints remain fresh and monotonic
- [ ] No unresolved incident linked to organization write paths

## Decision

- [x] Keep `event-only` policy (stabilization evidence refreshed)
- [x] Pause promotion
- [ ] Roll back to `dual-write`

## Notes

- Incident links:
- Dashboard/query links:
- Additional observations: Local workspace rehearsal only. The 24-hour production observation window and operational approval gates are intentionally waived here; command, route, replay, parity, and rollback evidence were refreshed against the active `event-only` organization policy.