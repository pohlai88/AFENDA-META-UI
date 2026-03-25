# Phase 1 — Platform Stabilization Plan

> **Status**: In progress (implementation started)
> **Risk level**: Low — all tasks are independently shippable
> **Scope**: Dependency governance, backend quality, schema contracts, performance enablement, CI automation

---

## Executive Summary

Phase 1 addresses five architecture integrity issues discovered during the dependency audit. These are not tooling polish — they are structural gaps that compound risk over time.

| # | Task | Category | Risk | Runtime Impact |
|---|------|----------|------|----------------|
| 1 | pnpm Overrides Governance | Version Governance | None | None |
| 2 | API ESLint | Backend Quality | None | None |
| 3 | drizzle-zod Bridge | Schema Contracts | None | None |
| 4 | TanStack Virtual | Performance Enablement | Medium | Scroll behavior |
| 5 | Governance Automation | CI Enforcement | None | None |

---

## Phase A — Structural Safety

### STEP 1: pnpm Overrides Governance (Version Governance)

**Why first**: All later installs mutate the lockfile. Centralizing versions early prevents cascading diffs, version re-drift, and makes CI reproducible.

**Goal**: Single source of truth for version-critical packages across all workspace members.

**Changes**:

1. Define centralized versions in root `package.json` under `pnpm.overrides`:

   | Package | Catalog Version | Reason |
   |---------|----------------|--------|
   | `drizzle-orm` | `1.0.0-beta.19` | Exact pin — beta API surface |
   | `drizzle-kit` | `1.0.0-beta.19` | Must match drizzle-orm |
   | `zod` | `^4.3.6` | Shared validation layer |
   | `vitest` | `^4.1.1` | Test framework alignment |
   | `tsx` | `^4.21.0` | Script runner alignment |
   | `pg` | `^8.20.0` | DB driver alignment |
   | `@types/pg` | `^8.20.0` | Driver types alignment |
   | `@types/node` | `^22.0.0` | Node 22 LTS target |
   | `typescript` | `^5.9.0` | Currently scattered: 5.4.5, 5.5.3 |

2. Align version strings in all package.json files to the centralized versions:
   - `packages/db/package.json` — drizzle-orm, drizzle-kit, zod, vitest, tsx, pg, @types/pg, @types/node, typescript
   - `apps/api/package.json` — drizzle-orm, drizzle-kit, zod, vitest, tsx, pg, @types/pg, @types/node, typescript
   - `apps/web/package.json` — zod, vitest, typescript
   - `packages/ui/package.json` — typescript
   - `packages/meta-types/package.json` — typescript
   - Root `package.json` — typescript

3. Run `pnpm install` to validate resolution.

**Compatibility note**: Current workspace pnpm runtime rejects the `catalog:` protocol. Overrides are used to keep deterministic, centralized version governance without forcing a package-manager upgrade in this phase.

**Verification**: `pnpm install` succeeds and lockfile is updated cleanly.

- [x] Root overrides added in package.json
- [x] Package versions aligned across workspace
- [x] `pnpm install` clean

---

### STEP 2: API ESLint (Backend Quality Guardrails)

**Why before virtualization**: Zero runtime risk, pure tooling layer. Surfaces latent issues early, makes later refactors safer. "Structural observability before structural surgery."

**Current state**: `apps/api` has zero ESLint config, zero lint scripts, zero ESLint dependencies. Turbo `lint` task silently skips it. This allows unhandled promises, accidental `any`, dead code, import cycles, and security logging leaks to accumulate invisibly.

**Changes**:

1. Add devDependencies to `apps/api/package.json`:
   - `eslint: ^10.1.0`
   - `@eslint/js: ^10.0.1`
   - `@typescript-eslint/eslint-plugin: ^8.57.2`
   - `@typescript-eslint/parser: ^8.57.2`
   - `eslint-config-prettier: ^10.1.8`

2. Create `apps/api/eslint.config.js` (flat config):
   - TypeScript parser + strict type-aware rules
   - `no-console: ["warn", { allow: ["warn", "error"] }]`
   - `@typescript-eslint/no-unused-vars` with underscore ignore pattern
   - Prettier conflict disabling via eslint-config-prettier
   - Target: `src/**/*.ts` only
   - No React rules (server package)

3. Add scripts to `apps/api/package.json`:
   - `"lint": "eslint src"`
   - `"lint:fix": "eslint src --fix"`

4. Initial run — expect violations, don't block on fixing all immediately.

**Verification**: `pnpm --filter api lint` runs without crashing (violations expected, crashes not).

- [x] ESLint dependencies added
- [x] Flat config created
- [x] lint/lint:fix scripts added
- [x] Initial lint run completes (reports existing violations)

---

### STEP 3: drizzle-zod Validation Layer (Schema Contracts)

**Why before virtualization**: Contract integrity stabilization enables safer refactors. Unifies API ↔ DB mapping, reduces schema drift, prevents regression risk.

**Current state**: 5 files in `packages/db/src/schema-platform/` import `createInsertSchema`/`createSelectSchema`/`createUpdateSchema` from `drizzle-orm/zod`, but the bridge dependency is not explicitly declared. 15 of 23 tables (65%) lack Zod schemas entirely.

**Strategic value**: This collapses four truth layers into one:

```
Before: DB Schema → manual Zod → API DTO → frontend types (4 layers)
After:  DB Schema → auto Zod → inferred API DTO → inferred frontend types (1 source)
```

The database schema becomes the machine that emits truth contracts.

**Changes**:

1. Verify if `drizzle-orm@1.0.0-beta.19` exposes `/zod` subpath natively
2. If NOT: `pnpm --filter @afenda/db add drizzle-zod` and update imports to `from "drizzle-zod"`
3. If YES: verify typecheck passes with existing import paths
4. Document the canonical import pattern

**Affected files**:
- `packages/db/package.json`
- `packages/db/src/schema-platform/security/users.ts`
- `packages/db/src/schema-platform/security/roles.ts`
- `packages/db/src/schema-platform/security/permissions.ts`
- `packages/db/src/schema-platform/core/appModules.ts`
- `packages/db/src/schema-platform/core/tenants.ts`

**Verification**: `pnpm --filter @afenda/db typecheck` passes with all drizzle-zod imports resolving.

- [x] Bridge dependency verified (`drizzle-orm/zod` export resolves)
- [x] Import paths validated
- [x] Typecheck passes

---

## Phase B — Performance Enablement

### STEP 4: TanStack Virtual (Virtualization Migration)

**Critical context**: This is not a dependency swap. The current `react-window` usage passes invalid props (`rowComponent`, `rowCount`, `rowHeight`, `defaultHeight` — none of which are valid List API props). Virtual rendering **never actually worked**. This step is **activating virtualization for the first time**.

**Expect**:
- Different scroll physics
- Height recalculations
- Possible row measurement tuning

**Scope**: Only ONE file uses react-window: `apps/web/src/renderers/layout/LayoutRenderer.tsx` (VIRTUAL_SCROLL_THRESHOLD = 100 children).

**Changes**:

1. `pnpm --filter @afenda/web add @tanstack/react-virtual`
2. `pnpm --filter @afenda/web remove react-window`
3. Rewrite `SectionRenderer` virtual scrolling block:
   - Replace `import { List } from "react-window"` → `import { useVirtualizer } from "@tanstack/react-virtual"`
   - Replace `React.createElement(List, {...})` → ref-based `useVirtualizer` pattern
   - Keep threshold (100), container height (600px), row height (80px)
   - Remove unused `VirtualRowComponent`

4. Implementation pattern:
   ```tsx
   const parentRef = useRef<HTMLDivElement>(null);
   const virtualizer = useVirtualizer({
     count: node.children.length,
     getScrollElement: () => parentRef.current,
     estimateSize: () => 80,
     overscan: 5,
   });
   ```

**Safer rollout considerations**:
- Feature flag the new virtualizer if risk tolerance requires it
- Keep legacy fallback path available initially
- Test with largest metadata-driven forms to validate scroll behavior

**Verification**: `pnpm --filter @afenda/web typecheck` passes; `react-window` removed from web dependencies.

- [x] Dependencies swapped
- [x] LayoutRenderer rewritten with useVirtualizer
- [x] Typecheck passes
- [ ] Manual scroll testing with large layouts

---

## Phase C — Governance Enforcement

### STEP 5: Dependency Governance + CI Automation

**Why last**: Stable system first, then freeze rules. Prevents CI breakage during active refactoring.

**Changes**:

1. **CI Gate**: Extend existing `tools/ci-gate/dependencies/index.mjs`:
   - `pnpm audit --audit-level=high` — fail on high/critical vulnerabilities
   - `pnpm outdated --recursive --format json` — warn on major version drift
   - Validate catalog versions match installed versions
   - Check for known anti-patterns (server deps in web, @types/react version mismatch)

2. **Root scripts** in `package.json`:
   - `"ci:deps": "node tools/ci-gate/contracts/dependency-governance.mjs"`
   - `"ci:deps:audit": "pnpm audit --audit-level=high"`

3. **Dependabot**: Create `.github/dependabot.yml`:
   - Ecosystem: npm
   - Directory: `/`
   - Schedule: weekly
   - Scope: patch + minor only (major requires manual wave planning)
   - Group updates by ecosystem (TanStack, Vitest, ESLint, etc.)

4. **CI Integration**: Add `pnpm audit` step to `.github/workflows/ci.yml`

5. **Governance Documentation**: Finalize `docs/DEPENDENCY_GOVERNANCE_POLICY.md`

**Verification**: `pnpm ci:deps` runs cleanly against current state.

- [x] CI gate extended
- [x] Root scripts added
- [x] Dependabot config created
- [x] CI workflow updated
- [ ] Governance policy finalized

---

## Architectural Outcome Matrix

| Layer | Before | After |
|-------|--------|-------|
| Dependency Control | Drift-prone, scattered versions | Centrally governed via root pnpm overrides |
| Backend Quality | Unguarded, zero linting | Lint-enforced with TypeScript-strict rules |
| Validation Layer | Fragmented, imports without declared deps | Schema-driven via drizzle-zod bridge |
| Large Layouts | Silently broken (invalid props) | Virtualized via TanStack Virtual |
| Upgrade Safety | Manual, ad-hoc | CI-governed with Dependabot + audit gates |

### Post-Phase Validation Notes

- Workspace type contracts for `@afenda/ui` and `@afenda/meta-types` have been repaired and validated via package typechecks.
- API linting now reliably surfaces async handler misuse across Express routes; cleanup is tracked as a focused hardening pass.

---

## Deferred Items (Tracked, Not Forgotten)

These are legitimate concerns that belong in later phases:

| Item | Why Deferred | Phase |
|------|-------------|-------|
| React 18 → 19 | Major — requires RSC assessment, hook migration | Wave 2 |
| Express 4 → 5 | Major — middleware signature changes, async error handling | Wave 2 |
| Turbo v1 → v2 | Major — pipeline → tasks config migration | Wave 2 |
| TypeScript 5 → 6 | Major — new resolution semantics | Wave 3 |
| Redux + Zustand dual state | Architecture refactor — separate risk domain | Wave 2 |
| 11 duplicate table definitions | Data layer consolidation — high blast radius | Wave 2 |
| @rjsf v5 → v6 | Major — form engine rewrite risk | Wave 3 |
| date-fns 2 → 4 | Major — tree-shaking import changes | Wave 3 |

---

## Execution Notes

- **Parallelism**: Steps 1-3 (Phase A) can be executed in parallel with no interdependencies
- **Step 4** (Phase B) depends on Step 1 completing first (catalog governs the new dependency)
- **Step 5** (Phase C) runs last — rules freeze after stability is achieved
- **Each step is independently shippable** — partial completion still improves platform posture
- **Rollback**: Every step can be reverted with a single `git revert` — no cross-step entanglement
