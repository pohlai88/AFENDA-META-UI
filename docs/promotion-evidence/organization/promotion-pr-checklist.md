# Organization Promotion PR Checklist

- Execution context: `local-rehearsal`

## Policy Transition

- [x] Target aggregate is `organization`
- [x] Policy state in truth config is `event-only`
- [x] This checklist is used for post-promotion stabilization evidence refresh
- [x] Rollback target remains one-step: `event-only -> dual-write`
- [x] Local rehearsal only (no production promotion requested)

## Required Evidence Attached

- [x] Filled parity window checklist artifact attached
- [x] Rollback drill evidence artifact attached
- [x] Organization command/store tests result attached
- [x] Organization route tests result attached
- [x] Projection replay result attached
- [x] Non-sales parity execution result attached

## Risk & Recovery

- [ ] Rollback owner named
- [x] Rollback command bundle verified in current branch
- [ ] Incident response path linked

## Final Approval

- [x] Production approvals intentionally deferred in local rehearsal context
- [ ] Promotion owner approved
- [ ] Runtime owner approved
- [ ] Reviewer confirmed all required boxes are checked