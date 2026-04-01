# @afenda/core

Phase 1 **truth specs** (identity, enum, relation, invariant, doctrine, resolution), **`InvariantFailurePayload`** contract, and a **deterministic generator** that emits `src/generated/*` plus `manifest.json`.

Normative design: `.ideas/architecture/phase-1-implementation-blueprint.md`.

## Scripts

| Command                   | Purpose                                                     |
| ------------------------- | ----------------------------------------------------------- |
| `pnpm run generate`       | Validate specs + rewrite `src/generated/` + `manifest.json` |
| `pnpm run check:generate` | Run `generate` and fail if git diff is dirty                |
| `pnpm run build`          | `generate` then `tsc` to `dist/`                            |
| `pnpm run test`           | Vitest                                                      |

Repo root: `pnpm generate:core` runs the same generator.

## After editing specs

Run `pnpm run generate` (or `pnpm run build`) and commit the updated `src/generated/` files so CI can enforce drift.
