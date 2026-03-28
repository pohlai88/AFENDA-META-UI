# Workflow Promotion Parity Window Checklist

- Aggregate: `workflow`
- Current policy: `dual-write`
- Target policy: `event-only`
- Rollback target: `dual-write`
- Execution context: `production-candidate`
- Observation window minimum: 24 hours

## Ownership

- [ ] Promotion owner assigned
- [ ] Rollback owner assigned
- [ ] On-call coverage confirmed for the full parity window

## Observation Window

- [x] Start timestamp recorded (UTC): `2026-03-27T23:08:59.129Z`
- [ ] End timestamp recorded (UTC): `2026-03-27T23:08:59.129Z`
- [ ] Window duration >= 24h
- [ ] Local rehearsal waiver applied (non-production only)

## Required Evidence Commands

- [ ] `pnpm --filter @afenda/api exec vitest run src/routes/__test__/workflow.route.test.ts`
- [ ] `pnpm --filter @afenda/api test -- --run src/events/__test__/workflow-replay-concurrency-fixture.test.ts`
- [ ] `pnpm ci:api:projection-replay`
- [ ] `pnpm ci:parity:non-sales`

## Stability Signals (must remain stable for full window)

- [ ] Workflow command success rate is within baseline
- [ ] Actor/audit parity maintained for workflow approval/advance operations
- [ ] No sustained `MUTATION_POLICY_VIOLATION` spikes on valid workflow writes
- [ ] Projection checkpoints remain fresh and monotonic
- [ ] No unresolved incident linked to workflow write paths

## Decision

- [ ] Promote to `event-only` policy
- [ ] Pause promotion
- [ ] Roll back to `dual-write`

## Notes

- Incident links:
- Dashboard/query links:
- Additional observations:
