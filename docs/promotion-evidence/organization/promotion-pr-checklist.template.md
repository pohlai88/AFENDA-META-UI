# Organization Promotion PR Checklist (Template)

Copy this into the promotion PR description (or commit as a filled artifact alongside the promotion change).

- Execution context: `production-candidate` or `local-rehearsal`

## Policy Transition

- [ ] Target aggregate is `organization`
- [ ] Policy change is strictly `dual-write -> event-only`
- [ ] Rollback target remains one-step: `event-only -> dual-write`
- [ ] Local rehearsal only (no production promotion requested)

## Required Evidence Attached

- [ ] Filled parity window checklist artifact attached
- [ ] Rollback drill evidence artifact attached
- [ ] Organization command/store tests result attached
- [ ] Organization route tests result attached
- [ ] Projection replay result attached
- [ ] Non-sales parity execution result attached

## Risk & Recovery

- [ ] Rollback owner named
- [ ] Rollback command bundle verified in current branch
- [ ] Incident response path linked

## Final Approval

- [ ] Production approvals intentionally deferred in local rehearsal context
- [ ] Promotion owner approved
- [ ] Runtime owner approved
- [ ] Reviewer confirmed all required boxes are checked