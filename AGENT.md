# AFENDA-META-UI Agent Operating Guide

This file is the execution contract for IDE agents working in this repository.

Goal:
- Keep the monorepo healthy.
- Make changes safely.
- Use CI gates as the source of truth for correctness.

Applies to:
- Any coding agent operating from IDE chat, terminal, or automation.

---

## 1) Non-Negotiable Rules

1. Always run from repository root.
2. Never bypass CI gates with ad-hoc assumptions.
3. Prefer minimal, focused edits.
4. Do not introduce cross-package imports that violate boundaries.
5. Do not add new markdown status/report files unless explicitly requested.
6. If a gate fails, fix root cause, then re-run the same gate, then re-run master gate.
7. Keep changes deterministic and reproducible.

---

## 2) Required Runtime Assumptions

- Node.js 18+
- pnpm 10+
- Turbo 2+

Recommended preflight:

```bash
pnpm install
```

---

## 3) Golden Commands

### Master gate

```bash
pnpm ci:gate
```

### Individual gates

```bash
pnpm ci:gate:boundaries
pnpm ci:gate:circular
pnpm ci:contracts
pnpm ci:gate:dependencies
pnpm ci:gate:logger
pnpm ci:gate:typescript
pnpm ci:gate:bundle
pnpm ci:gate:vite
```

### Useful diagnostics

```bash
pnpm ci:gate:verbose
pnpm run typecheck:verbose
pnpm run typecheck:debug
pnpm syncpack:list
pnpm knip
pnpm sherif
```

### Optional strict cycle enforcement

```bash
node tools/ci-gate/circular/index.mjs --strict
```

Note:
- Default circular gate behavior is non-blocking for existing cycles and blocking for execution errors.

---

## 4) Required Agent Workflow

Follow this order for every non-trivial change.

1. Understand target scope (files/packages).
2. Apply minimal code changes.
3. Run relevant targeted gate(s) first.
4. Run master gate.
5. Report results clearly with pass/fail and next action.

Mandatory final validation before claiming completion:

```bash
pnpm ci:gate
```

Completion is valid only if master gate passes.

---

## 5) CI Gate Intent and Expected Fix Patterns

### boundaries
Intent:
- Enforce monorepo package boundaries via Turbo boundaries.

Fix patterns:
- Replace deep relative cross-package imports with package exports.
- Avoid file imports outside package root.
- Ensure package-level dependency declarations exist for imported packages.
- Keep config files package-local unless explicitly allowed.

### circular
Intent:
- Detect circular dependencies.

Fix patterns:
- Prefer refactor to acyclic modules.
- Extract shared logic into neutral modules.
- Use dependency inversion for bidirectional coupling.
- Use strict mode only when cycle elimination is a hard requirement.

### contracts
Intent:
- Ensure lazy-loaded/export contracts remain valid.

Fix patterns:
- Match expected default/named exports exactly.
- Keep lazy route and renderer module contracts aligned.

### dependencies
Intent:
- Enforce governance rules and workspace hygiene.

Fix patterns:
- Use `workspace:*` for internal `@afenda/*` dependencies.
- Avoid server-only dependencies in client package runtime deps.
- Keep aligned versions for critical packages.

### logger
Intent:
- Enforce logging standards.

Fix patterns:
- Remove `console.log` usage where prohibited.
- Use project logger conventions consistently.

### typescript
Intent:
- Keep type system clean and reproducible in CI.

Fix patterns:
- Run verbose/debug typecheck scripts for exact file causes.
- Fix typing at source rather than suppressing with `any` or ts-ignore.

### bundle
Intent:
- Keep bundle budgets controlled.

Fix patterns:
- Reduce heavy imports.
- Prefer code splitting and selective imports.

### vite
Intent:
- Keep Vite config quality and compatibility.

Fix patterns:
- Align config with repo standards.
- Avoid unsupported or inconsistent plugin/config usage.

---

## 6) Monorepo Boundary Model (Authoritative)

Package tiers:
- foundation: `@afenda/meta-types`
- data: `@afenda/db`
- presentation: `@afenda/ui`
- app-server: `@afenda/api`
- app-client: `@afenda/web`
- tooling: `@afenda/ci-gate`

Allowed dependency direction:
- foundation -> none
- data -> foundation
- presentation -> foundation
- app-server -> data, foundation
- app-client -> presentation, foundation
- tooling -> none

Agent rule:
- If a new import breaks this graph, redesign the change. Do not force it through.

---

## 7) Dependency and Package Hygiene

When changing dependencies:

1. Prefer existing workspace catalogs and conventions.
2. Keep internal package references as `workspace:*`.
3. Validate with:

```bash
pnpm syncpack:list
pnpm sherif
pnpm ci:gate:dependencies
```

If mismatches exist:

```bash
pnpm syncpack:fix
pnpm syncpack:format
```

---

## 8) Agent Safety Policy

Do not:
- Introduce destructive git operations.
- Revert unrelated user changes.
- Modify lockstep architecture files unless required by the fix.
- Add broad refactors when a small fix is enough.

Do:
- Keep edits scoped.
- Explain why each changed file is necessary.
- Re-run affected gates after every fix batch.

---

## 9) Output Contract for Agent Responses

For each implementation task, report:

1. What changed (file list).
2. Which gate(s) were run.
3. Gate results.
4. Remaining risks or follow-ups.

If any gate fails, do not claim completion.

---

## 10) Fast Playbooks

### A) Feature or bugfix touching API and web

```bash
pnpm ci:gate:boundaries
pnpm ci:gate:typescript
pnpm ci:gate
```

### B) Dependency changes

```bash
pnpm syncpack:list
pnpm sherif
pnpm ci:gate:dependencies
pnpm ci:gate
```

### C) Renderer/lazy route changes

```bash
pnpm ci:contracts
pnpm ci:gate
```

### D) Suspected architecture drift

```bash
pnpm ci:gate:boundaries
pnpm ci:gate:circular
pnpm ci:gate
```

---

## 11) Definition of Done

A task is done only when all are true:

1. Code changes are scoped and justified.
2. Relevant targeted gate(s) pass.
3. `pnpm ci:gate` passes.
4. No new boundary violations introduced.
5. No unresolved type errors introduced.

---

## 12) Reference Paths

- Master runner: `tools/ci-gate/index.mjs`
- CI gate docs: `tools/ci-gate/README.md`
- Contribution policy: `docs/CONTRIBUTING.md`
- Dependency governance: `docs/DEPENDENCY_GOVERNANCE_POLICY.md`

---

## 13) Single-Command Validation for Agents

Use this before final response:

```bash
pnpm ci:gate
```

If pass, report success with gate summary.
If fail, continue fixing until pass.

---

## 14) IDE Compatibility Profiles

This section aligns behavior across Cursor, Copilot, Windsor, and Antigravity so all agents execute consistently.

### 14.1 Common Behavior Contract (All IDE Agents)

All agents must:

1. Treat this file as a repository policy contract.
2. Use terminal-first verification for every meaningful change.
3. Run targeted gates before master gate.
4. Report exact commands executed and their pass/fail status.
5. Stop only when `pnpm ci:gate` passes or a real blocker is identified.

All agents must not:

- Skip CI checks based on assumptions.
- Claim completion while any gate is failing.
- Introduce cross-package imports that violate boundary rules.

### 14.2 Cursor Profile

Execution policy:

- Prefer focused file edits and small diffs.
- Run targeted gates for changed areas first.
- Always finish with `pnpm ci:gate`.

Recommended command sequence:

```bash
pnpm ci:gate:boundaries
pnpm ci:gate:typescript
pnpm ci:gate
```

Cursor-specific note:

- If Cursor suggests broad refactors, constrain to minimum required for gate pass.

### 14.3 Copilot Profile

Execution policy:

- Follow repository instructions and AGENT.md before applying suggestions.
- Validate with CI gates, not only inline diagnostics.
- For multi-file changes, provide a short gate run summary after edits.

Recommended command sequence:

```bash
pnpm ci:gate:verbose
pnpm ci:gate
```

Copilot-specific note:

- Treat code actions as proposals; enforce final correctness through gate results.

### 14.4 Windsor Profile

Execution policy:

- Use deterministic shell commands for verification.
- Prefer explicit gate commands over inferred checks.
- Keep edits architecture-safe against boundary model in Section 6.

Recommended command sequence by change type:

```bash
# Dependency or package manifest changes
pnpm syncpack:list
pnpm sherif
pnpm ci:gate:dependencies
pnpm ci:gate

# API/Web code changes
pnpm ci:gate:boundaries
pnpm ci:gate:typescript
pnpm ci:gate
```

Windsor-specific note:

- If Windsor supports autonomous loops, terminate only after master gate pass.

### 14.5 Antigravity Profile

Execution policy:

- Optimize for fast feedback while preserving full validation.
- Run minimum relevant gates quickly, then run full gate once.
- Surface unresolved risks if strict cycle mode is not enabled.

Recommended command sequence:

```bash
pnpm ci:gate:boundaries
pnpm ci:gate:circular
pnpm ci:gate
```

Antigravity-specific note:

- Existing cycles are non-blocking by default; use strict mode for cycle-elimination tasks.

### 14.6 Normalized Tool Mapping

Map IDE actions to repository commands:

- Lint/quality request -> `pnpm ci:gate:logger`, `pnpm ci:gate:vite`, then `pnpm ci:gate`
- Type safety request -> `pnpm ci:gate:typescript`, then `pnpm ci:gate`
- Boundary/import issue -> `pnpm ci:gate:boundaries`, then `pnpm ci:gate`
- Dependency update -> `pnpm syncpack:list`, `pnpm sherif`, `pnpm ci:gate:dependencies`, then `pnpm ci:gate`
- Renderer/lazy route change -> `pnpm ci:contracts`, then `pnpm ci:gate`

### 14.7 Agent Response Template (Recommended)

After each task, agents should respond in this format:

1. Scope changed:
	- list files changed
2. Commands run:
	- exact commands in order
3. Results:
	- per-gate pass/fail
4. Final status:
	- done only if `pnpm ci:gate` passed

### 14.8 Conflict Resolution Rule

If IDE defaults conflict with this file:

1. Follow AGENT.md.
2. Follow CI gate outputs.
3. Prefer smaller, reversible edits.

This keeps behavior consistent across all supported IDE agents.

---

## 15) Quick Copy Profiles (Per IDE)

Use one of these snippets as your first instruction in the selected IDE agent.

### 15.1 Cursor Quick Copy

```text
You are working in AFENDA-META-UI. Follow AGENT.md as the highest repo policy.
Rules:
1) Make minimal scoped edits.
2) Run targeted gates first, then run: pnpm ci:gate.
3) Do not claim done unless pnpm ci:gate passes.
4) Respect monorepo boundaries in AGENT.md Section 6.
Output format:
- Files changed
- Commands run
- Gate results
- Final status
```

### 15.2 Copilot Quick Copy

```text
Follow repository AGENT.md exactly.
Before final response, run pnpm ci:gate.
If any gate fails, continue fixing until pass.
Use focused diffs and avoid unrelated edits.
Always report:
1) file changes
2) commands executed
3) per-gate pass/fail
```

### 15.3 Windsor Quick Copy

```text
Execution contract:
- Terminal-first validation
- No assumptions without gate output
- Follow AGENT.md boundary and dependency rules
Workflow:
1) edit minimally
2) run relevant targeted gate(s)
3) run pnpm ci:gate
4) report results with exact commands
Completion requires pnpm ci:gate passing.
```

### 15.4 Antigravity Quick Copy

```text
Use AGENT.md as policy.
Optimize for fast feedback with full verification.
Required sequence:
1) targeted checks (boundaries/types/contracts/dependencies as needed)
2) pnpm ci:gate
If circular checks show existing cycles, treat as advisory unless strict mode is requested.
Do not mark complete unless master gate passes.
```

### 15.5 Universal Fallback Prompt

```text
Follow AGENT.md in this repo.
Respect package boundaries and dependency governance.
Run targeted gates and then pnpm ci:gate.
Do not claim completion while any gate fails.
Respond with: files changed, commands run, gate results, final status.
```
