
---

## Plan: Wave 5A — Truth Completeness (P0)

**What, why, how:** The truth compiler has a strong deterministic pipeline, but 7 P0 gaps mean it's still producing advisory SQL stubs, silently passing invalid replay tests, and losing mutation policy violation data. This plan closes all P0 gaps incrementally — no new abstraction layers, all changes extend existing file patterns.

---

### Phase 1 — Aggregate Invariants to Real SQL
*Closes the most critical half-truth gap: non-entity invariants currently emit `--TODO` comments into the committed SQL artifact.*

**Step 1.** invariant-compiler.ts (lines 105–113) — replace the `--TODO Phase 3.7` comment stub with real `CREATE OR REPLACE FUNCTION + CREATE CONSTRAINT TRIGGER DEFERRABLE INITIALLY DEFERRED` SQL for `scope: "aggregate"`. Follow the exact SQL skeleton already used in mutation-policy-compiler.ts. For `scope: "global"`, emit same trigger + an honest advisory comment about cross-transaction limits. Change the silent `--ERROR` fallback to `throw new Error()` to make invalid artifacts fail loud.

**Step 2.** Run `pnpm --filter @afenda/db truth:generate` — regenerates `migrations/generated/truth-v1.sql`

**Step 3.** Run `pnpm --filter @afenda/db truth:check` — must PASS

---

### Phase 2 — Replay Engine Correctness
*Two silent no-ops and one UUID bug let tests pass vacuously without verifying anything.*

**Step 4.** replay-events.ts (line 57) — fix `parseInt(event.aggregateId)` to pass `aggregateId` as string. Reference: assert-state.ts uses `where: { id: aggregateId }` without parseInt.

**Step 5.** replay-events.ts PATH 2 (~line 103) + `replayEventsForProjection` (~line 160) — replace both silent no-ops with `throw new Error("replayEvents called without projectionHandlers")`. Same throw-on-misconfiguration pattern used throughout assert-invariant.ts.

---

### Phase 3 — assertProjectionReplay Implementation *(depends on Phase 2)*

**Step 6.** assert-projection.ts (~line 107) — implement `assertProjectionReplay` which currently throws unconditionally. Pattern: call `replayEvents → context.db.findOne → assertProjection`. Follow `assertProjection` structure directly above it in the same file.

---

### Phase 4 — Gateway Invariant Enforcement
*Gateway enforces mutation policy but has no invariant pre-check — only DB-layer CHECKs act as backstop.*

**Step 7.** mutation-command-gateway.ts — add `validateInvariants?: (entity, id, db) => Promise<void>` to `MutationGatewayOptions`. Follows established callback pattern: `loadProjectionState`, `persistProjectionState`, `projectEvent`.

**Step 8.** Call `await options.validateInvariants?.(entity, id, db)` before applying the mutation in all 3 policy paths (`event-only`, `dual-write`, `direct`).

**Step 9.** Export `invariantEnforcementMiddleware(registries: InvariantRegistry[])` factory helper — wraps `assertAllEntityInvariants` so callers can wire `SALES_INVARIANT_REGISTRIES` without boilerplate. Default remains no-op (non-breaking).

---

### Phase 5 — validateProjectionDrift Default *(parallel with Phase 4)*

**Step 10.** In mutation-command-gateway.ts — export a `createProjectionDriftValidator(fields: string[])` factory that compares projection state vs DB record field-by-field. Document with inline comment that production configs should wire this. No callers currently provide it — default no-op is non-breaking.

---

### Phase 6 — Mutation Policy Violation Observability
*Policy violations surface only as HTTP 409s today — no persistent log, no ops visibility.*

**Step 11.** Create packages/db/src/schema/meta/mutationPolicyViolations.ts — new table following decisionAudit.ts pattern exactly. Columns: `id` (uuid), `policyId`, `entityType`, `entityId`, `tenantId`, `operation`, `violationType`, `details` (jsonb), `createdAt`.

**Step 12.** Add one export line to index.ts.

**Step 13.** In mutation-command-gateway.ts — catch `MutationPolicyViolationError`, insert to `mutationPolicyViolations`, then re-throw.

**Step 14.** Add `GET /api/ops/mutation-policy-violations` to ops.ts — paginated, filtered by `policyId/entityType/tenantId/dateFrom/dateTo`. Follow the existing `/invariant-violations` handler pattern exactly.

**Step 15.** `pnpm --filter @afenda/db db:generate + db:migrate`

---

### Relevant Files

| File | Change |
|---|---|
| invariant-compiler.ts | Aggregate/global → real DEFERRED trigger SQL |
| replay-events.ts | Fix parseInt UUID bug + remove silent no-ops |
| assert-projection.ts | Implement `assertProjectionReplay` |
| mutation-command-gateway.ts | `validateInvariants` callback + middleware + violation logging |
| mutationPolicyViolations.ts | New table (pattern: `decisionAudit.ts`) |
| schema/meta/index.ts | +1 export |
| ops.ts | `GET /mutation-policy-violations` |

---

### Verification

1. `pnpm --filter @afenda/db truth:generate` — artifact contains no `--TODO Phase 3.7` stubs for aggregate/global scopes
2. `pnpm --filter @afenda/db truth:check` — PASSED
3. `pnpm --filter @afenda/truth-test test` — 173+ tests pass; `assertProjectionReplay` no longer hard-throws
4. `pnpm --filter @afenda/db test` — compiler unit tests pass
5. `pnpm --filter api test` — gateway + ops route tests pass
6. `npx tsc --noEmit` workspace root — zero errors

---

### Decisions

- **P0 only** — P1 (HR truth-config onboarding, multi-domain COMPILER_INPUT, `assert-invariant.ts` SALES_ decoupling) deferred to Wave 5B
- **Incremental** — no new DomainRegistry class or DomainManifest type; extend existing file patterns
- **Global scope** — gets real trigger SQL + explicit advisory note about cross-transaction limitation (honest boundary, not silent failure)

---

**Wave 5B Preview (next session):** `assert-invariant.ts` SALES_ decoupling → HR EntityDefs/InvariantRegistries/StateMachines in `truth-config.ts` → COMPILER_INPUT multi-domain array → HR truth artifact verified.

Ready to approve and hand off for implementation?

