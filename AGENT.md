# AFENDA-META-UI Agent Operating Guide

**Execution contract for IDE agents (Cursor, Copilot, Windsor, Antigravity).**

Goal: Keep monorepo healthy. Make changes safely. Use CI gates as source of truth.

---

## 0. Implementation Document Control (Non-Negotiable)

Before any code change, the agent MUST identify and declare the implementation source-of-truth document.

### 0.1 Allowed implementation authorities (priority order)

1. User explicit instruction in current chat
2. `.ideas/architecture/phase-1-implementation-blueprint.md`
3. `.ideas/architecture/phase-1-engineering-backlog.md`
4. `AGENT.md` (this file)
5. Existing code constraints (types, tests, CI contracts)

If authorities conflict, follow the higher-priority authority and explicitly state the conflict.

### 0.2 Mandatory pre-implementation declaration

Before editing files, the agent MUST state:

- Which document/task it is implementing (file + section/task ID when available)
- Whether implementation mode is `strict` or `incremental`
- Which acceptance criteria are targeted

### 0.3 No-assumption rule

The agent MUST NOT assume missing requirements.
If any of these are ambiguous, ask clarification first:

- Target implementation document (blueprint vs backlog vs ad-hoc request)
- Scope boundary (in-scope/out-of-scope)
- Contract shape conflicts (competing type contracts)
- Enforcement level (scaffold vs hard-fail gate)

### 0.4 Clarification gate (hard stop)

The agent MUST pause and ask for clarification before implementation when:

- Request allows multiple architecture-valid interpretations
- Requested behavior conflicts with blueprint/backlog AC
- Strict alignment is requested but section/task targets are not explicit
- Required authority document is not identified for the phase

### 0.5 Strict alignment mode

When asked for strict blueprint/backlog alignment, agents must:

- Treat backlog AC + blueprint sections as normative checklists
- Mark each relevant AC as `implemented`, `partial`, or `missing`
- Avoid claiming full alignment if any hard-fail CI requirement is missing
- Surface module-boundary shortcuts explicitly

---

## 1. Core Principles

1. **Schema Quality First** — Never downgrade schemas or production code to make tests pass. Instead, improve schemas to match high-quality seed/test data. Tests reveal missing fields or incorrect types; fix the schema definition.
2. **Terminal-First Validation** — CI gates (`pnpm ci:gate`) are the only definition of done. Never bypass with assumptions.
3. **Minimal Scoped Edits** — Change only what's necessary. Keep diffs small and reversible.
4. **Respect Boundaries** — Follow monorepo dependency graph strictly. Don't force imports that violate architecture.
5. **No Markdown Spam** — Don't create status/report files unless explicitly requested.

---

## 2. Golden Commands

**Master gate (required before completion):**

```bash
pnpm ci:gate
```

**Targeted gates (run relevant ones first):**

```bash
pnpm ci:gate:boundaries      # package import boundaries
pnpm ci:gate:typescript      # type checking
pnpm ci:gate:dependencies    # workspace hygiene
pnpm ci:gate:circular        # circular deps (non-blocking by default)
pnpm ci:contracts            # lazy-loaded export contracts
pnpm ci:gate:logger          # console.log bans
pnpm ci:gate:bundle          # bundle size budgets
pnpm ci:gate:vite            # vite config quality
```

**Diagnostics:**

```bash
pnpm ci:gate:verbose         # detailed gate output
pnpm run typecheck:debug     # pinpoint type errors
pnpm syncpack:list           # dependency version drift
pnpm sherif                  # workspace lint
```

**Dependency fixes:**

```bash
pnpm syncpack:fix
pnpm syncpack:format
```

---

## 3. Required Workflow

For every non-trivial change:

1. Identify implementation authority document and target AC/task IDs
2. Understand scope (files/packages affected)
3. If ambiguity exists, ask clarification before editing
4. Apply minimal edits
5. Run targeted gate(s) for changed area
6. Run `pnpm ci:gate`
7. Report: implementation target, files changed, commands run, gate results, AC/task status

**Completion is valid only if `pnpm ci:gate` passes and AC/task status is explicit.**

---

## 3.1 Required Clarification Prompts (Templates)

Use these prompts before implementation when ambiguity exists:

1. "Which implementation authority should I follow: blueprint, backlog, or your direct instruction?"
2. "Should I implement strict blueprint fidelity or incremental scaffolding for this PR?"
3. "Please confirm explicit in-scope and out-of-scope items before edits."

---

## 3.2 Prohibited Behavior (Architecture Governance)

Agents MUST NOT:

- Start implementation without naming the target implementation document
- Claim strict alignment while skipping backlog acceptance checks
- Hide known blueprint/backlog gaps behind green tests
- Infer policy from examples when formal spec exists
- Merge conflicting contracts without explicit user choice

---

## 3.3 Required Output Addendum (Architecture Tasks)

For architecture-phase tasks, include in the final report:

1. **Implementation target** — document + section/task IDs
2. **AC matrix** — implemented / partial / missing
3. **Open gaps** — blockers vs deferred
4. **Validation evidence** — commands and CI gates run

---

## 4. Monorepo Boundary Model (Strict)

**Package tiers and allowed dependencies:**

```
foundation  @afenda/meta-types       -> (none)
data        @afenda/db               -> foundation
presentation @afenda/ui              -> foundation
app-server  @afenda/api              -> data, foundation
app-client  @afenda/web              -> presentation, foundation
tooling     @afenda/ci-gate          -> (no runtime deps)
```

**Rule:** If a new import violates this graph, redesign the change. Do not force it through.

---

## 5. CI Gate Fix Patterns

**boundaries** — Replace deep cross-package imports with package exports; ensure package deps declared.

**typescript** — Fix at source; never suppress with `any`/ts-ignore; run `typecheck:debug` for exact causes.

**dependencies** — Use `workspace:*` for internal packages; avoid server deps in client runtime; keep versions aligned.

**circular** — Extract shared logic to neutral modules; use dependency inversion; strict mode optional.

**contracts** — Match expected default/named exports exactly in lazy routes and renderers.

**logger** — Remove `console.log` where prohibited; use project logger conventions.

**bundle** — Reduce heavy imports; prefer code splitting and selective imports.

**vite** — Align config with repo standards; avoid unsupported plugins.

---

## 6. Dependency Hygiene

When changing dependencies:

1. Prefer workspace catalogs
2. Keep internal refs as `workspace:*`
3. Validate:
   ```bash
   pnpm syncpack:list
   pnpm sherif
   pnpm ci:gate:dependencies
   ```
4. Fix mismatches:
   ```bash
   pnpm syncpack:fix
   pnpm syncpack:format
   ```

---

## 7. Agent Safety Policy

**Do NOT:**

- Skip CI checks based on assumptions
- Claim done while any gate fails
- Introduce destructive git operations
- Revert unrelated user changes
- Add broad refactors when a small fix is enough
- Downgrade production code/schemas to make tests pass

**DO:**

- Keep edits scoped and justified
- Explain why each file changed
- Re-run gates after every fix batch
- Improve schemas when seed/test data is higher quality
- Treat test failures as signals to upgrade production code

---

## 8. Output Format (Required)

After each task:

1. **Files changed** — list with brief reason
2. **Commands run** — exact order
3. **Gate results** — per-gate pass/fail
4. **Final status** — done only if `pnpm ci:gate` passed

If any gate fails, continue fixing until pass.

---

## 9. Fast Playbooks

**Feature/bugfix (API/web):**

```bash
pnpm ci:gate:boundaries
pnpm ci:gate:typescript
pnpm ci:gate
```

**Dependency changes:**

```bash
pnpm syncpack:list
pnpm sherif
pnpm ci:gate:dependencies
pnpm ci:gate
```

**Renderer/lazy routes:**

```bash
pnpm ci:contracts
pnpm ci:gate
```

**Schema improvements (when tests reveal missing fields):**

```bash
# 1. Update schema definition (add missing columns)
# 2. Update seed/test data to use new fields
pnpm ci:gate:typescript
pnpm ci:gate
```

**Architecture drift:**

```bash
pnpm ci:gate:boundaries
pnpm ci:gate:circular
pnpm ci:gate
```

---

## 10. TypeScript Config Rules (TS 5.9+)

**Hard rules — never violate:**

- No `baseUrl` anywhere (deprecated TS 6, removed TS 7)
- No `paths` in `tsconfig.base.json` (expands common source dir, breaks child `rootDir`)
- `paths` entries must be relative (`../../packages/...`)
- `ignoreDeprecations` value is `"5.0"` (not `"6.0"`)

**Config architecture:**

```
tsconfig.base.json        → shared options only (strict, target, module, lib, declaration)
                            NO paths, NO baseUrl, NO outDir, NO rootDir

apps/api/tsconfig.json    → noEmit: true, paths to package source (IDE/typecheck)
apps/api/tsconfig.build.json → extends tsconfig.json, noEmit: false,
                               rootDir: "./src", outDir: "./dist", paths: {}

apps/web/tsconfig.json    → noEmit: true, ignoreDeprecations: "5.0",
                            paths for IDE only (Vite resolve.alias handles runtime)

packages/*/tsconfig.json  → rootDir: "src", outDir: "dist",
                            paths only for own imports (relative ../../)
```

**Package → paths map:**

| Package    | Cross-package imports                                            | paths target    |
| ---------- | ---------------------------------------------------------------- | --------------- |
| meta-types | (none)                                                           | (none)          |
| db         | @afenda/meta-types                                               | meta-types dist |
| ui         | (none)                                                           | (none)          |
| api        | @afenda/meta-types, @afenda/db, db/schema-meta, db/schema-domain | all → source    |
| web        | @afenda/meta-types, @afenda/ui, ~/\*                             | all → source    |

**Why split config for emitting apps:**
Cross-package `paths` pull files from `../../packages/...`, expanding the common source directory to `../..`. If `rootDir` is `./src`, TS6059 fires. Fix: typecheck config uses `noEmit: true` (no rootDir needed); build config uses empty `paths: {}` and resolves via `node_modules` after Turborepo builds dependencies.

---

## 11. Definition of Done

Task is done only when **all** are true:

1. Code changes scoped and justified
2. Relevant targeted gate(s) pass
3. `pnpm ci:gate` passes
4. No new boundary violations
5. No unresolved type errors
6. Schemas improved (not downgraded) when tests revealed missing fields

---

## 12. References

- Master runner: `tools/ci-gate/index.mjs`
- CI docs: `tools/ci-gate/README.md`
- Contributing: `docs/CONTRIBUTING.md`
- Dependency governance: `docs/DEPENDENCY_GOVERNANCE_POLICY.md`
- Roadmap: `docs/ROADMAP.md`

---

## 13. Schema Quality Examples

**Bad (compromising quality):**

```typescript
// Removing fields from seed data to match incomplete schema ❌
await tx.insert(fiscalPositions).values([
  {
    name: "Domestic",
    // removed: sequence, isActive — schema was missing them
  },
]);
```

**Good (improving schema):**

```typescript
// Adding missing fields to schema ✅
export const fiscalPositions = table("fiscal_positions", {
  name: text("name").notNull(),
  sequence: integer("sequence").notNull().default(10), // added
  isActive: boolean("is_active").notNull().default(true), // added
  // ... rest
});

// Now seed data can use full quality
await tx.insert(fiscalPositions).values([
  {
    name: "Domestic",
    sequence: 10,
    isActive: true,
  },
]);
```

**Principle:** Tests and seed files often have higher quality data than initial schema drafts. When type errors surface missing fields, improve the schema definition — never degrade the test/seed data.

---

## 14. ESLint Skills Workflow

Use the skill set below for consistent lint governance and performance in this monorepo:

1. `.agents/skills/eslint-enterprise-monorepo/SKILL.md`
   Use for flat config architecture, boundaries policy, and CI lint quality gates.
2. `.agents/skills/eslint-monorepo-performance/SKILL.md`
   Use for lint runtime optimization (cache, concurrency, typed-linting scope, profiling).

Recommended flow for ESLint-heavy tasks:

1. Apply architecture/correctness decisions from `eslint-enterprise-monorepo`.
2. Run lint profiling and optimization from `eslint-monorepo-performance`.
3. Validate with `pnpm ci:gate` before completion.

---

**End of Guide — Total Lines: ~295**
