# Internal Types (_private/)

This directory contains types and utilities for **internal use only**.

**Not exported via `package.json` exports field.**

## Contents

- `internal-helpers.ts` — DB migration and setup utilities
- `drizzle-utils.ts` — Drizzle ORM internal adaptations
- Other implementation details

## Guidelines

- **DO NOT** import from `_private/` in external packages or @afenda/web
- **DO** import from main exports (`@afenda/db/schema`, `@afenda/db/shared`, etc.)
- If you need something from `_private/`, consider moving it to a proper export
