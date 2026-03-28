# Workflow Instance Promotion Parity Window Checklist

- Aggregate: `workflow_instance`
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

- [x] Start timestamp recorded (UTC): `2026-03-27T23:09:03.615Z`
- [ ] End timestamp recorded (UTC): `2026-03-27T23:09:03.615Z`
- [ ] Window duration >= 24h
- [ ] Local rehearsal waiver applied (non-production only)

## Required Evidence Commands

- [ ] `pnpm --filter @afenda/api exec vitest run src/routes/__test__/workflow.route.test.ts`
- [ ] `pnpm --filter @afenda/api test -- --run src/events/__test__/workflow-replay-concurrency-fixture.test.ts`
- [ ] `pnpm --filter @afenda/api test -- --run src/events/__test__/projectionRuntime.test.ts`
- [ ] `pnpm ci:api:projection-replay`
- [ ] `pnpm ci:parity:non-sales`

## Stability Signals (must remain stable for full window)

- [ ] Workflow instance command success rate is within baseline
- [ ] Optimistic concurrency conflict detection working correctly
- [ ] Checkpoint drift diagnostics remain clean
- [ ] No sustained `MUTATION_POLICY_VIOLATION` spikes on valid workflow_instance writes
- [ ] Projection checkpoints remain fresh and monotonic
- [ ] No unresolved incident linked to workflow_instance write paths

## Decision

- [ ] Promote to `event-only` policy
- [ ] Pause promotion
- [ ] Roll back to `dual-write`

## Notes

- Incident links:
- Dashboard/query links:
- Additional observations:
