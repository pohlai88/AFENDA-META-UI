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

Optional tokens in templates: `{{OPTIONAL_*}}` — delete the whole block if unused.

## Reference implementations

- [packages/meta-types/README.md](../../../packages/meta-types/README.md) + [ARCHITECTURE.md](../../../packages/meta-types/ARCHITECTURE.md)
- [packages/db/src/r2/README.md](../../../packages/db/src/r2/README.md) + [ARCHITECTURE.md](../../../packages/db/src/r2/ARCHITECTURE.md)

Maintainers: when you change the “house style” for package docs, update these templates and the two reference packages above.
