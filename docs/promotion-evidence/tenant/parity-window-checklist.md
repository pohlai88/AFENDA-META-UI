# Tenant Promotion Parity Window Checklist

- Aggregate: `tenant`
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

- [x] Start timestamp recorded (UTC): `2026-03-27T23:09:03.685Z`
- [ ] End timestamp recorded (UTC): `2026-03-27T23:09:03.686Z`
- [ ] Window duration >= 24h
- [ ] Local rehearsal waiver applied (non-production only)

## Required Evidence Commands

- [ ] `pnpm --filter @afenda/api exec vitest run src/routes/__test__/tenant.route.test.ts`
- [ ] `pnpm --filter @afenda/api test -- --run src/events/__test__/cross-context-drift-fixture.test.ts`
- [ ] `pnpm ci:api:projection-replay`
- [ ] `pnpm ci:parity:non-sales`

## Stability Signals (must remain stable for full window)

- [ ] Tenant command success rate is within baseline
- [ ] Cross-context cascade integrity maintained (tenant -> workflow/workflow_instance projections)
- [ ] Platform replay parity maintained across tenant + dependent aggregates
- [ ] No sustained `MUTATION_POLICY_VIOLATION` spikes on valid tenant writes
- [ ] Projection checkpoints remain fresh and monotonic
- [ ] No unresolved incident linked to tenant write paths

## Decision

- [ ] Promote to `event-only` policy
- [ ] Pause promotion
- [ ] Roll back to `dual-write`

## Notes

- Incident links:
- Dashboard/query links:
- Additional observations:
