# Drizzle data-plane notes (`_shared`)

This file complements [`../ARCHITECTURE.md`](../ARCHITECTURE.md).

| Capability | When to use |
|------------|-------------|
| `db.select` / query builder | Default in generated `*.access.ts` and most reads. |
| Relational `db.query` | App and human-owned report modules for nested loads (one SQL). |
| CTE / subquery / `EXISTS` | Complex reports; prefer over many round-trips. |
| `db.batch` | Batched independent statements when a single SQL is not possible. |
| `db.transaction` | Session/RLS consistency only (see `pg-session`). |
| Read replica client | Heavy reporting or policy snapshot fetches; not for tenant session writes. |
| Serverless / HTTP DB drivers | Neon serverless, poolless patterns—see Drizzle performance docs and `.agents/skills/drizzle-orm/references/performance.md` § Serverless. |

`combineAnd` in [`sql-builders.ts`](./sql-builders.ts) helps compose dynamic `AND` clauses for tenant/soft-delete filters.

Do not run graph-validation scans here.
