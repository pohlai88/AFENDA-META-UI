# Organization Promotion Parity Window Checklist (Template)

Use this checklist for the first non-sales promotion candidate:

- Aggregate: `organization`
- Current policy: `dual-write`
- Target policy: `event-only`
- Rollback target: `dual-write`
- Execution context: `production-candidate` or `local-rehearsal`
- Observation window minimum: 24 hours

## Ownership

- [ ] Promotion owner assigned
- [ ] Rollback owner assigned
- [ ] On-call coverage confirmed for the full parity window

## Observation Window

- [ ] Start timestamp recorded (UTC): `YYYY-MM-DDTHH:mm:ssZ`
- [ ] End timestamp recorded (UTC): `YYYY-MM-DDTHH:mm:ssZ`
- [ ] Window duration >= 24h
- [ ] Local rehearsal waiver applied (non-production only)

## Required Evidence Commands

- [ ] `pnpm --filter @afenda/api exec vitest run src/organization/__test__/index.test.ts src/organization/__test__/organization-command-service.test.ts`
- [ ] `pnpm --filter @afenda/api exec vitest run src/routes/__test__/organization.route.test.ts`
- [ ] `pnpm ci:api:projection-replay`
- [ ] `pnpm ci:parity:non-sales`

## Stability Signals (must remain stable for full window)

- [ ] Organization command success rate is within baseline
- [ ] No sustained `MUTATION_POLICY_VIOLATION` spikes on valid organization writes
- [ ] Projection checkpoints remain fresh and monotonic
- [ ] No unresolved incident linked to organization write paths

## Decision

- [ ] Promote to `event-only`
- [ ] Pause promotion
- [ ] Roll back to `dual-write`

## Notes

- Incident links:
- Dashboard/query links:
- Additional observations: