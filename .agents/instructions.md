---
description: Monorepo conventions, Turborepo tasks, pnpm workspaces, TypeScript paths, and dependency configuration for AFENDA-META-UI
applyTo: "**"
---

# AFENDA-META-UI Agent Instructions

This is a **pnpm + Turborepo monorepo**. Always follow conventions in this directory when working on the codebase.

## Quick Reference

- **Package manager**: pnpm@9 (use `pnpm --filter <name>` to scope commands)
- **Build orchestrator**: Turborepo v1.13.4 — config at `turbo.json` (uses `"pipeline"`, NOT `"tasks"`)
- **TypeScript**: shared base at `tsconfig.base.json` with `@afenda/*` path aliases
- **Node modules target**: ES2022, NodeNext resolution — relative imports need `.js` extension

## Workspace Members

| Name | Path | Type |
|---|---|---|
| `api` | apps/api | Express + GraphQL API |
| `@afenda/web` | apps/web | Vite + React SPA |
| `@afenda/db` | packages/db | Drizzle ORM schemas |
| `@afenda/meta-types` | packages/meta-types | Shared TS types |
| `@afenda/ui` | packages/ui | Shared React components |

## Available Skills

- [`.agents/skills/monorepo-turborepo-pnpm/SKILL.md`](./skills/monorepo-turborepo-pnpm/SKILL.md) — full monorepo guide

## Available Docs

- [`.agents/llms.txt`](./llms.txt) — LLM context snapshot of the entire monorepo
- [`.agents/docs/monorepo-dependencies.md`](./docs/monorepo-dependencies.md) — full dependency map with version alignment and security notes

## Critical Rules

1. **Never use `"tasks"` in `turbo.json`** — this is Turborepo v1, use `"pipeline"`.
2. **`drizzle-orm` + `drizzle-kit` versions must match** across `apps/api` and `packages/db`.
3. **Internal packages** always referenced as `workspace:*`.
4. **`tools/ci-gate/`** is not a workspace member — invoked as `node tools/ci-gate/index.mjs`.
5. **Scoped names**: `@afenda/web`, `@afenda/db`, `@afenda/meta-types`, `@afenda/ui`. The API is just `"api"`.
