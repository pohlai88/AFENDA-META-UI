## Plan: Standardize API Route Error Handling

**TL;DR:** Normalize all 15 route files to one method: `asyncHandler` + throw `AppError` subclasses. Currently 5 files follow the standard (organization.ts, `tenant.ts`, `workflow.ts`, `sales.ts`, `sandbox.ts`), **10 files use divergent patterns** (raw try/catch, inline `res.status().json()`, or no error handling at all).

---

**Steps**

### Phase 1: Read-only routes (parallel)
1. **audit.ts** — Wrap 7 endpoints in `asyncHandler`, replace inline error responses with `throw ValidationError` / `throw NotFoundError`, remove try/catch blocks. (POST `/audit-log` stays sync — fire-and-forget)
2. **graph.ts** — Wrap 6 endpoints in `asyncHandler`, replace inline error responses with `throw` *(parallel with 1, 3)*
3. **mesh.ts** — Wrap 4 endpoints in `asyncHandler`, replace inline error responses with `throw` *(parallel with 1, 2)*

### Phase 2: Infrastructure routes (parallel)
4. **ops.ts** — Wrap 3 endpoints in `asyncHandler`, keep `requireAuth`, replace inline errors *(parallel with 5, 6)*
5. **search.ts** — Wrap 1 endpoint in `asyncHandler` *(parallel with 4, 6)*
6. **uploads.ts** — Wrap in `asyncHandler`, keep multer middleware *(parallel with 4, 5)*

### Phase 3: Remaining routes
7. Read + standardize **meta.ts**, **rules.ts**, **expEngine.ts**
8. Assess **api.ts** — complex generic CRUD engine, may defer

### Phase 4: Verification
9. `pnpm --filter @afenda/api exec vitest run` — all tests pass
10. `pnpm --filter @afenda/api build` — compiles clean

---

**Relevant files**
- errorHandler.ts — `asyncHandler`, `ValidationError`, `NotFoundError`, `AppError` hierarchy
- organization.ts — gold standard reference
- 10 route files: audit.ts, graph.ts, mesh.ts, `ops.ts`, `search.ts`, `uploads.ts`, `meta.ts`, `rules.ts`, `expEngine.ts`, `api.ts`

**Verification**
1. Run `pnpm --filter @afenda/api exec vitest run` — all existing tests pass
2. Run `pnpm --filter @afenda/api build` — TypeScript compiles
3. Spot-check: error responses from standardized routes return consistent `{ error, message, code }` shape via global `errorHandler`

**Decisions**
- DB access patterns, auth patterns, and response envelope shapes are **NOT changed** — this is error-handling standardization only
- `api.ts` generic CRUD engine **may be deferred** if too complex for this pass
- POST `/audit-log` stays synchronous (fire-and-forget logging)

**Further Considerations**
1. The 5 "already standardized" files still have try/catch inside asyncHandler with inline `res.status(400).json()` — should those also become `throw ValidationError`? **Recommendation: Yes, but as a follow-up pass** 

