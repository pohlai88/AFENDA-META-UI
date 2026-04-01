# Graph validation — implementation skill baseline

When extending **FK integrity**, **tenant isolation**, **orphan detection**, or **graph health** in this package, treat the following **local** Cursor agent skills (under repo `.agents/skills/`) as the required guidance stack:

| Skill | Role |
| ----- | ---- |
| `drizzle-orm` | Drizzle patterns, SQL fragments, schema alignment |
| `postgresql-database-engineering` | Indexing, partitioning, performance, ops |
| `database-schema-designer` | Constraints, migrations, normalization |
| `data-modeling` | ERDs, relationships, domain language |
| `postgresql-table-design` | Postgres types, constraints, physical design |
| `multi-tenant-architecture` | Tenant boundaries, isolation, routing |

**Optional API surface (not validation core):** see [GRAPHQL-BOUNDARY.md](./GRAPHQL-BOUNDARY.md) for how `drizzle-graphql` fits relative to this module.

**Promotion / runtime coupling:** see [GUARDRAIL_PROMOTION.md](./GUARDRAIL_PROMOTION.md) for CI gates and optional query-layer guards.

**Adjuncts / Squawk / baselines:** [ADJUNCTS.md](./ADJUNCTS.md), [baselines/README.md](../baselines/README.md). **Expanded CLI / ops:** [OPERATIONS.md](./OPERATIONS.md).

**Policy lifecycle & feedback:** [POLICY_LIFECYCLE.md](./POLICY_LIFECYCLE.md), [FEEDBACK_LOOP.md](./FEEDBACK_LOOP.md).

**Truth surfaces:** [truth-surface.ts](../truth-surface.ts) (contract pattern).

**External skills (minimal-first):** one optional external Drizzle skill may be installed for extra ORM snippets; it does **not** replace this folder as the integrity source of truth.
