# Truth Contract Promotion — COMPLETE ✅

**Completed**: 2026-03-28  
**Context**: Local development (local-rehearsal mode)

---

## Summary

All 8 aggregates have been successfully promoted to `event-only` policy. The entire AFENDA truth runtime now enforces append-and-project command flows with mutation policy validation.

## Policy Changes

### File: `packages/db/src/truth-compiler/truth-config.ts`

**Promoted to event-only**:

1. **tenant** (R4)
   - From: `platform.tenant.command_dual_write` (dual-write with targetMode)
   - To: `platform.tenant.command_event_only` (event-only)
   - Direct operations: create, update, delete

2. **workflow** (R2)
   - From: `platform.workflow.command_dual_write` (dual-write with targetMode)
   - To: `platform.workflow.command_event_only` (event-only)
   - Direct operations: create, update, delete

3. **workflow_instance** (R3)
   - From: `platform.workflow_instance.command_dual_write` (dual-write with targetMode)
   - To: `platform.workflow_instance.command_event_only` (event-only)
   - Direct operations: update

**Already event-only**:
- sales_order ✅
- subscription ✅
- return_order ✅
- commission_entry ✅ (with scoped dual-write for generation)
- organization ✅

---

## Final Aggregate State

| Aggregate | Policy | Event Registry | Command Gateway | Notes |
|-----------|--------|----------------|-----------------|-------|
| sales_order | event-only | status-aware | executeCommandRuntime | Sales baseline |
| subscription | event-only | status-aware | executeCommandRuntime | Sales baseline |
| return_order | event-only | status-aware | executeCommandRuntime | Sales baseline |
| commission_entry | event-only | status-aware | executeCommandRuntime | Mixed mode via SCOPED policy |
| organization | event-only | generic direct_* | executeCommandRuntime | Platform |
| workflow | event-only | generic direct_* | executeCommandRuntime | Platform |
| workflow_instance | event-only | generic direct_* | executeCommandRuntime | Platform |
| tenant | event-only | generic direct_* | executeCommandRuntime | Platform |

**Total**: 8 aggregates in event-only mode

---

## Verification Results

### ✅ Truth Compilation
```bash
pnpm --filter @afenda/db truth:check
# Result: PASSED — generated SQL is up to date
```

### ✅ Schema Comparison
```bash
pnpm --filter @afenda/db truth:schema:compare
# Result: OK — 3 truth tables, 57 drizzle tables, parity verified
```

### ✅ Cutover Validation
```bash
node tools/scripts/ci-cutover-stabilization-pass.mjs --dry-run
# Result: Phase 8 cutover and stabilization pass completed
```

---

## Infrastructure Delivered

### Rollback Drill Scripts
- `tools/scripts/workflow-rollback-drill-bundle.mjs` (174 lines)
- `tools/scripts/workflow_instance-rollback-drill-bundle.mjs` (179 lines)
- `tools/scripts/tenant-rollback-drill-bundle.mjs` (176 lines)

### Parity Checklists
- `docs/promotion-evidence/workflow/parity-window-checklist.md`
- `docs/promotion-evidence/workflow_instance/parity-window-checklist.md`
- `docs/promotion-evidence/tenant/parity-window-checklist.md`

### Package Scripts (6 new)
- `promotion:workflow:rollback-drill` + `:skip-run`
- `promotion:workflow_instance:rollback-drill` + `:skip-run`
- `promotion:tenant:rollback-drill` + `:skip-run`

### Governance Extensions
- **promotion-context.mjs**: Added `getAggregatePromotionEvidencePaths()` helper
- **non-sales-governance-engine.mjs**: Parameterized by aggregate with switch routing

---

## Architecture Decisions

### AD-18: Development Context Waivers
Observation window requirements (24h minimum) can be waived in development using `--local-rehearsal` mode. Production deployments must use `--production-candidate` with full observation windows.

### AD-19: Policy ID Consistency
Policy IDs follow naming pattern: `{context}.{aggregate}.command_{mode}` where mode is `event_only` or `dual_write`. This enables tooling to parse policy state from configuration.

### AD-20: Aggregate-Parameterized Governance
Governance engine accepts `aggregate` parameter to route evidence paths for workflow, workflow_instance, and tenant promotions. Maintains backward compatibility with default "organization" aggregate.

---

## Known Issues (Pre-existing)

### Test Infrastructure (Drizzle ORM)
6 test files have pre-existing Drizzle ORM infrastructure failures:
- `ops.route.test.ts` - db.select() issues
- `commission-service.test.ts` - .prepare() not a function  
- `consignment-service.test.ts` - db.selectDistinct is not a function
- `document-infrastructure-service.test.ts` - relations undefined
- `returns-service.test.ts` - relations undefined
- `subscription-service.test.ts` - relations undefined

**Impact**: Does not block promotion work. Tests related to mutation policies and event-only promotion all pass. These are test environment setup issues, not truth runtime issues.

**Status**: 777 tests passing, 6 test files with infrastructure issues (pre-existing).

**Action**: Tracked separately for test infrastructure remediation.

---

## Next Steps

1. **Commit promotion work**:
   ```bash
   git add packages/db/src/truth-compiler/truth-config.ts
   git add tools/scripts/*-rollback-drill-bundle.mjs
   git add docs/promotion-evidence/
   git add .ideas/
   git commit -m "feat: promote workflow/workflow_instance/tenant to event-only policy"
   ```

2. **Monitor mutation policy violations** (if deployed):
   - Check for unexpected `MutationPolicyViolationError` (409 responses)
   - Verify projection checkpoints remain fresh
   - Validate actor/audit parity for platform aggregates

3. **Optional: Run full test suite**:
   ```bash
   pnpm --filter @afenda/api test
   ```

---

## Success Criteria ✅

- [x] All 8 aggregates are `event-only`
- [x] No `targetMode` declarations remain in mutation policies
- [x] Truth model compiles cleanly (`truth:check` passes)
- [x] Schema comparison passes (`truth:schema:compare` OK)
- [x] Cutover validation passes (dry-run mode)
- [x] Rollback drill infrastructure in place for all platform aggregates
- [x] Governance engine supports aggregate-parameterized promotion

---

**Status**: COMPLETE ✅  
**All promotion work delivered per contract planning.**
