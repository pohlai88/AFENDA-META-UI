# db-access-layer CI gate

Ensures each ERP schema module under `packages/db/src/schema/{hr,sales,inventory,accounting,purchasing}/` has a matching access file:

`packages/db/src/queries/<domain>/<sameBasename>.access.ts`

Sales exception (intentional and enforced by discovery mapping):

- `packages/db/src/schema/sales/*.ts` -> `packages/db/src/queries/sales/tables.access.ts` (single aggregate scaffold)

**Check mode** (default): fails if any required `.access.ts` is missing or empty.

**Not validated in v1:** function bodies, export names, or AST (dumb file-existence gate).

## Run

```bash
# From repo root
pnpm ci:gate:db-access

# Create missing placeholders
pnpm ci:gate:db-access:fix

# Regenerate full scaffolds (overwrites @generated .access.ts only with --force)
pnpm ci:gate:db-access:generate

# Via master runner
pnpm ci:gate --gate=db-access-layer
```

## Flags

| Flag | Meaning |
|------|--------|
| `--fix` | Create missing `.access.ts` (placeholder unless `--generate`). |
| `--generate` | With `--fix`, emit tenant/soft-delete access functions (see `emit-full.mjs`). |
| `--force` | With `--fix --generate`, overwrite files that start with `@generated`. |
| `--verbose` | Log skipped (already present) modules. |

## Config

See [`config.mjs`](./config.mjs): `ALLOWED_DOMAINS`, `SKIP_SUBDIRS` (e.g. `hr-docs`).

## Layout

- Schema: `packages/db/src/schema/hr/workforceStrategy.ts`
- Access: `packages/db/src/queries/hr/workforceStrategy.access.ts`
- Barrel: `packages/db/src/queries/hr/index.ts` (refreshed on `--generate`)

Human-owned reports live in non-`*.access.ts` files and are never touched by this gate.

## Extractor note

Full emit uses `extractSchema` from [`../postgres-schema/extractors/drizzle-schema.mjs`](../postgres-schema/extractors/drizzle-schema.mjs). A fix to `splitTableBlocks` (opening-paren detection) keeps column metadata accurate for short schema names (e.g. `hrSchema.table`).
