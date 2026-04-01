# `packages/db/src/queries` — Database access layer

Canonical **read access surface** for ERP domains in AFENDA: generated `*.access.ts` baselines (tenant- and soft-delete-aware patterns) plus **human-owned** reporting and analytics modules.

Full rules, naming semantics, and stack position: **[ARCHITECTURE.md](./ARCHITECTURE.md)**.

---

## Scope

- **In scope:** `hr`, `sales`, `inventory`, `accounting`, `purchasing` (aligned with CI allowlist when `db-access-layer` is enabled).  
- **Out of scope:** `core`, `security`, `meta`, `reference` — no generated access modules for those schema trees.

---

## Two kinds of files

| Kind | Pattern | Owner |
| ---- | ------- | ----- |
| **Generated baseline** | `<SchemaBasename>.access.ts` | CI / generator (`@generated`); safe to regenerate in v2 |
| **Human modules** | e.g. `workforceReports.ts`, `pipelineAnalytics.ts` | Team; never overwritten by scaffold |

Schema file `schema/hr/workforceStrategy.ts` maps to `queries/hr/workforceStrategy.access.ts` (same basename, `.access.ts` suffix).

---

## Naming quick reference

- `getXByIdSafe` — tenant + excludes deleted  
- `listXActive` — excludes deleted  
- `listXAll` — includes deleted  
- `archiveX` — soft-delete only (the **only** write allowed in this layer)

See the table in [ARCHITECTURE.md](./ARCHITECTURE.md).

---

## Technical conventions

- **Database client type:** `import type { Database } from "../../drizzle/db.js"` from modules under `queries/<domain>/` (adjust `../` depth if nesting). Do **not** use `NodePgDatabase` for public access APIs here.  
- **Primary keys in generated code (v2):** `type RowId = typeof someTable.$inferSelect.id` — never hardcode `id: number` vs `id: string` by assumption.  
- **RLS / session:** Callers should set tenant session context for production paths; see [db README — session](../../README.md).

---

## `_shared/`

Mechanical helpers only (paging, date ranges). No domain joins or business semantics.

---

## When to add human modules

Add a non-`*.access.ts` module when:

1. Two or more callers need the same report or aggregate shape, or  
2. The read path is non-trivial and should be tested and named, or  
3. You need a stable import from workers or jobs.

---

## Example (human-owned read, illustrative)

```typescript
// queries/hr/workforceReports.ts
import { and, eq, isNull, sql } from "drizzle-orm";
import type { Database } from "../../drizzle/db.js";
import { employees } from "../../schema/hr/people.js";

export async function activeHeadcount(
  db: Database,
  tenantId: (typeof employees.$inferSelect)["tenantId"],
): Promise<number> {
  const rows = await db
    .select({ c: sql<number>`count(*)::int` })
    .from(employees)
    .where(
      and(eq(employees.tenantId, tenantId), isNull(employees.deletedAt)),
    );
  return rows[0]?.c ?? 0;
}
```

### Optional: meta-types for filter shapes

```typescript
import type { SessionContext } from "@afenda/meta-types/rbac";

export type ReportFilters = Pick<SessionContext, "tenantId" | "userId"> & {
  from: Date;
  to: Date;
};
```

---

## CI / generator

Gate: [`tools/ci-gate/db-access-layer`](../../../tools/ci-gate/db-access-layer/README.md).

```bash
pnpm ci:gate:db-access              # check: every ERP schema module has *.access.ts
pnpm ci:gate:db-access:fix          # create missing placeholders
pnpm ci:gate:db-access:generate     # full emit; overwrites @generated files only
```

**Golden reference (full emit):** [hr/workforceStrategy.access.ts](./hr/workforceStrategy.access.ts) — succession and career tables with `get*ByIdSafe`, `list*Active` / `list*All`, `archive*`.

---

## Package exports

- `@afenda/db/queries/hr` — barrel of `src/queries/hr/*.access.ts`  
- `@afenda/db/queries/sales` — barrel of `src/queries/sales/*.access.ts`  

See [db README](../../README.md) for all subpaths. Add `./queries/<domain>` when new ERP domains get access modules.

---

## Related docs

| Document | Content |
| -------- | ------- |
| [ARCHITECTURE.md](./ARCHITECTURE.md) | Principles, Option A, layout, generator rules |
| [meta-types README](../../../meta-types/README.md) | Contract imports |
| [db ARCHITECTURE.md](../../ARCHITECTURE.md) | Package layers |
| [db README.md](../../README.md) | Client and schema subpaths |

---

## Versioning

Access and query modules ship with `@afenda/db`. Breaking changes to exported function signatures should be noted in release notes / changesets alongside dependent API or schema changes.
