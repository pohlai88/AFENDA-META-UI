# Package documentation templates

Reusable **README** and **ARCHITECTURE** skeletons aligned with how `@afenda/meta-types` documents packages. Copy into a package (or submodule) and replace `{{PLACEHOLDERS}}`.

## Files

| File | Purpose |
| ---- | ------- |
| [README.template.md](./README.template.md) | User-facing quick start, imports, feature sections, testing, related links |
| [ARCHITECTURE.template.md](./ARCHITECTURE.template.md) | Deep design: philosophy, boundary, structure, patterns, consumers, governance |

## How to use

1. Copy both templates next to your module root (e.g. `packages/foo/src/bar/` or `packages/foo/`).
2. Rename to `README.md` and `ARCHITECTURE.md`.
3. Replace every `{{TOKEN}}` (see table below). Remove sections that do not apply.
4. Cross-link ADRs or extra docs in **Related documentation**.
5. Keep **Status** and **Tests** lines accurate (CI-friendly).
6. For schema/data modules, complete the **table-first analysis** tokens before writing refactor plans.

### Table-first analysis rule (schema modules)

If the module documents database schema/table design:

- Inventory existing tables first (legacy + current + planned).
- Break down tables by schema basis / bounded context before proposing any refactor.
- Preserve legacy and new-planning tables by default; do not mark as removal candidates unless explicitly approved.
- Treat table drops/renames as explicit migration decisions, not documentation cleanup.

### Placeholder reference

| Token | Example |
| ----- | ------- |
| `{{PACKAGE_IMPORT}}` | `@afenda/db/r2` |
| `{{PACKAGE_TITLE}}` | R2 Storage Abstraction |
| `{{ONE_LINE_PURPOSE}}` | Bounded object-storage port for Cloudflare R2. |
| `{{TIER_LINE}}` | Data-layer submodule inside `@afenda/db`. |
| `{{STATUS_LINE}}` | Production module inside `@afenda/db` |
| `{{TESTS_LINE}}` | `src/r2/__test__` (Vitest) |
| `{{DEPS_LINE}}` | `@aws-sdk/client-s3`, … |
| `{{STRUCTURE_TREE}}` | Indented tree of folders/files |
| `{{PHILOSOPHY_ROWS}}` | Markdown table rows (Old vs New) |
| `{{CONSUMER_PACKAGES}}` | api, db, … |
| `{{RELATED_DOCS_BULLETS}}` | `- [ARCHITECTURE.md](./ARCHITECTURE.md)` etc. |
| `{{IMPORT_STRATEGY_B_ALTERNATIVE}}` | Markdown block for Strategy B (CLI-only, barrel fallback, …) |
| `{{SUBPATH_USE_WHEN}}` | One sentence for when Strategy A applies |
| `{{TABLE_INVENTORY_SUMMARY}}` | `57 tables across partner/product/order/tax/...` |
| `{{SCHEMA_BASIS_BREAKDOWN_TABLE}}` | Markdown table grouping tables by schema basis |
| `{{LEGACY_AND_NEW_TABLE_POLICY}}` | Explicit statement that legacy+new tables stay unless approved |
| `{{TABLE_CHANGE_POLICY_BULLETS}}` | Rules for add/rename/drop/deprecate table changes |

Optional tokens in templates: `{{OPTIONAL_*}}` — delete the whole block if unused.

### Submodules under `@afenda/db`

- Set `{{PACKAGE_IMPORT}}` to `@afenda/db/<subpath>` (matches `package.json` `exports`).
- Use `"@afenda/db": "workspace:*"` for `{{WORKSPACE_DEPENDENCY_LINE}}`.
- If the module implements or consumes **shared contracts**, add a short **Meta-types** subsection in README and/or ARCHITECTURE listing `@afenda/meta-types/<subpath>` types (see [truth-compiler README](../../../packages/db/src/truth-compiler/README.md) for a compiler example).

## Reference implementations

- [packages/meta-types/README.md](../../../packages/meta-types/README.md) + [ARCHITECTURE.md](../../../packages/meta-types/ARCHITECTURE.md)
- [packages/db/src/r2/README.md](../../../packages/db/src/r2/README.md) + [ARCHITECTURE.md](../../../packages/db/src/r2/ARCHITECTURE.md)
- [packages/db/src/graph-validation/README.md](../../../packages/db/src/graph-validation/README.md) + [ARCHITECTURE.md](../../../packages/db/src/graph-validation/ARCHITECTURE.md)
- [packages/db/src/truth-compiler/README.md](../../../packages/db/src/truth-compiler/README.md) + [ARCHITECTURE.md](../../../packages/db/src/truth-compiler/ARCHITECTURE.md)

Maintainers: when you change the “house style” for package docs, update these templates and the reference modules above.
