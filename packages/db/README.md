# @afenda/db

> Canonical database layer for the AFENDA ERP platform — PostgreSQL schemas, multi-tenant RLS,
> truth compiler, and production-grade operational tooling.

See [ARCHITECTURE.md](./ARCHITECTURE.md) for full design rationale and deep-dive.

---

## Install

This is a **workspace-private** package. Not published to npm.

```jsonc
// consumer package.json
{ "dependencies": { "@afenda/db": "workspace:*" } }
```

---

## Quick Start

```typescript
import { db } from "@afenda/db";
import { salesOrders, partners } from "@afenda/db/schema";

// Simple query
const orders = await db.select().from(salesOrders).where(eq(salesOrders.tenantId, 42));

// Relational query (Relations v2)
import { relations } from "@afenda/db/relations";
const enriched = await db.query.salesOrders.findMany({
  with: { partner: true, lines: true },
});
```

---

## Subpath Exports

| Import                        | What You Get                                                |
| ----------------------------- | ----------------------------------------------------------- |
| `@afenda/db`                  | Default `db` client, pool, health, truth/relation exports (use subpaths for columns, wire, session, RLS) |
| `@afenda/db/client`           | `createDatabase()` factory, pool config, health checks      |
| `@afenda/db/schema`           | All domain tables combined                                  |
| `@afenda/db/schema/core`      | Tenants, app modules (`core` namespace)                     |
| `@afenda/db/schema/security`  | Users, roles, permissions (`security` namespace)            |
| `@afenda/db/schema/reference` | Currencies, countries, banks, UOM, sequences                |
| `@afenda/db/schema/meta`      | Schema registry, metadata, overrides, audit                 |
| `@afenda/db/schema/sales`     | Partners, products, orders, subscriptions (35+ tables)      |
| `@afenda/db/queries/hr`       | Generated `*.access.ts` barrel (DB access layer)              |
| `@afenda/db/queries/sales`    | Generated `*.access.ts` barrel (DB access layer)              |
| `@afenda/db/columns`          | Shared column mixins + fingerprints (Drizzle only)        |
| `@afenda/db/wire`             | Temporal wire (`dateOnlyWire`, `instantWire` + legacy aliases); see [ARCHITECTURE.md](./ARCHITECTURE.md) §3b |
| `@afenda/db/pg-session`       | `setSessionContext`, `clearSessionContext` (Postgres GUCs)   |
| `@afenda/db/request-context`  | `getTenantContextFromHeaders`, `withTenantContext(db,…)`   |
| `@afenda/db/rls`              | RLS policies + tenant isolation                             |
| `@afenda/db/relations`        | Drizzle Relations v2 (FK relational queries)                |
| `@afenda/db/truth-compiler`   | Truth engine: invariants, state machines, mutation policies |
| `@afenda/db/r2`               | Cloudflare R2 (S3 API) port — see [src/r2/README.md](./src/r2/README.md) |

---

## Database Client

### Default

```typescript
import { db, pool, dbServerless } from "@afenda/db";
```

- `db` — pool-based Drizzle instance (default for server apps)
- `pool` — raw `pg.Pool` for direct queries
- `dbServerless` — Neon HTTP serverless instance (edge/serverless)

### Custom Client Factory

```typescript
import { createDatabase } from "@afenda/db/client";

const { db, pool } = createDatabase({
  logger: new PinoDrizzleLogger(500), // custom query logger
  poolConfig: { max: 20 }, // override pool settings
  connectionString: process.env.DATABASE_URL,
});
```

### Health Checks

```typescript
import { checkDatabaseConnection, getPoolStats } from "@afenda/db";

await checkDatabaseConnection(); // throws on failure
const stats = getPoolStats(); // { totalCount, idleCount, waitingCount }
```

---

## Schema Domains

| Domain        | pgSchema    | Key Tables                                                                                                         |
| ------------- | ----------- | ------------------------------------------------------------------------------------------------------------------ |
| **core**      | `core`      | `tenants`, `appModules`                                                                                            |
| **security**  | `security`  | `users`, `roles`, `permissions`, `userRoles`                                                                       |
| **reference** | `reference` | `currencies`, `countries`, `banks`, `unitOfMeasure`, `sequences`                                                   |
| **meta**      | —           | `schemaRegistry`, `entities`, `fields`, `layouts`, `policies`, `auditLogs`                                         |
| **sales**     | `sales`     | `partners`, `products`, `salesOrders`, `salesOrderLines`, `subscriptions`, `consignmentAgreements`, `returnOrders` |

---

## Shared Columns

```typescript
import {
  timestampColumns, // createdAt, updatedAt
  softDeleteColumns, // deletedAt
  auditColumns, // createdBy, updatedBy
  nameColumn, // name: text
  appendOnlyTimestampColumns, // createdAt only
} from "@afenda/db/columns";
```

Every table should spread `timestampColumns`. Optionally add `softDeleteColumns` and `auditColumns`.

---

## Multi-Tenant Session

```typescript
import { setSessionContext, clearSessionContext } from "@afenda/db/pg-session";

// In a request middleware:
await db.transaction(async (tx) => {
  await setSessionContext(tx, {
    tenantId: 42,
    userId: 1,
    actorType: "user",
    correlationId: "req-abc",
  });

  // All queries in this transaction are tenant-scoped via RLS
  const orders = await tx.select().from(salesOrders);
  // → Only returns orders where tenant_id = 42
});
```

Optional: run a callback with context using an explicit `db` instance:

```typescript
import { withTenantContext } from "@afenda/db/request-context";
import { db } from "@afenda/db";

await withTenantContext(db, { tenantId: 42, userId: 1, actorType: "user" }, async (tx) => {
  /* tenant-scoped queries */
});
```

---

## RLS Policies

```typescript
import { tenantIsolationPolicies, serviceBypassPolicy } from "@afenda/db/rls";

export const myTable = salesSchema.table("my_table", { ... }, (table) => [
  ...tenantIsolationPolicies("my_table"),
  serviceBypassPolicy("my_table"),
]);
```

---

## Truth Compiler

Declarative business rules → enforceable database constraints:

```typescript
import {
  SALES_STATE_MACHINES,
  SALES_INVARIANT_REGISTRIES,
  MUTATION_POLICY_REGISTRY,
  requireMutationPolicyById,
  isDirectMutationAllowed,
} from "@afenda/db/truth-compiler";

// Check if direct writes are allowed for an entity
const policy = requireMutationPolicyById("sales.sales_order.dual_write_rollout");
const canDirectWrite = isDirectMutationAllowed(policy);
```

---

## Scripts

| Command                          | Purpose                           |
| -------------------------------- | --------------------------------- |
| `pnpm build`                     | Compile TypeScript                |
| `pnpm typecheck`                 | Type-check without emit           |
| `pnpm test:db`                   | Run all database tests            |
| `pnpm db:generate`               | Generate migration from schema    |
| `pnpm db:migrate`                | Apply pending migrations          |
| `pnpm db:push`                   | Push schema directly (dev only)   |
| `pnpm db:studio`                 | Open Drizzle Studio GUI           |
| `pnpm seed`                      | Seed database (default: baseline) |
| `pnpm seed -- --scenario demo`   | Seed with demo data               |
| `pnpm seed -- --scenario stress` | Seed for stress testing           |
| `pnpm truth:generate`            | Generate truth SQL constraints    |
| `pnpm truth:check`               | Verify truth SQL is current       |
| `pnpm graph-validation`          | Run FK integrity validation       |
| `pnpm data:lifecycle`            | Run lifecycle runner              |
| `pnpm data:lifecycle:partition:plan` | Preview partition changes     |
| `pnpm data:lifecycle:partition:apply` | Apply partitioning           |
| `pnpm data:lifecycle:retention:plan` | Preview data retention       |
| `pnpm data:lifecycle:retention:apply` | Apply retention policies     |
| `pnpm check:all`                 | typecheck + truth:check + test:db |

Example multi-domain policy usage:

```bash
pnpm --filter @afenda/db data:lifecycle partition-plan --dry-run --policy-id=hr-attendance-default
pnpm --filter @afenda/db data:lifecycle retention-plan --dry-run --policy-id=hr-attendance-default --tenant=1 --actor=1
pnpm --filter @afenda/db data:lifecycle retention-plan --dry-run --policy-id=finance-accounting-default --tenant=1 --actor=1 --explain
pnpm --filter @afenda/db data:lifecycle audit-policy --policy-id=sales-default --tenant-key=42 --explain
```

---

## Migrations

```bash
# Development workflow
pnpm db:generate     # Schema changes → migration files
pnpm db:migrate      # Apply to local database
pnpm db:push         # Quick push (dev only, no migration files)

# CI/production
pnpm db:migrate      # Apply pending migrations
```

**Config:** `drizzle.config.ts` reads `DATABASE_URL_MIGRATIONS` (Neon direct), falls back to `DATABASE_URL`.

Business-truth SQL (state machines, events, cross-invariants, and supplemental sales triggers) is generated into `migrations/generated/truth-v1.sql` via `pnpm truth:generate`. Apply it with your migration or ops process alongside Drizzle migrations; do not edit the file by hand.

---

## Adding a New Domain

1. Create `src/schema/{domain}/` with `_schema.ts`, `_enums.ts`, `tables.ts`, `index.ts`
2. Add to `src/schema/index.ts` barrel
3. Add subpath export in `package.json`
4. Update `src/drizzle/relations.ts` with FK relations
5. Optionally add truth config in `truth-compiler/truth-config.ts`
6. Add seeds in `src/seeds/domains/{domain}/` (see [src/seeds/README.md](./src/seeds/README.md))
7. Run `pnpm db:generate` + `pnpm db:migrate`

See [ARCHITECTURE.md — Adding a New Domain](./ARCHITECTURE.md#adding-a-new-domain) for details.

---

## Environment Variables

| Variable                  | Required | Purpose                             |
| ------------------------- | -------- | ----------------------------------- |
| `DATABASE_URL`            | Yes      | PostgreSQL connection string        |
| `DATABASE_URL_MIGRATIONS` | No       | Direct Neon endpoint for migrations |

---

## See Also

- [ARCHITECTURE.md](./ARCHITECTURE.md) — Full design rationale, layer descriptions, and patterns
- [src/pg-session/README.md](./src/pg-session/README.md) — Postgres GUC session context (RLS, transaction-local `set_config`)
- [src/pg-session/ARCHITECTURE.md](./src/pg-session/ARCHITECTURE.md) — `pg-session` boundary and pooling semantics
- [src/request-context/README.md](./src/request-context/README.md) — `withTenantContext`, trusted header parsing
- [src/request-context/ARCHITECTURE.md](./src/request-context/ARCHITECTURE.md) — Request → transaction → GUC boundary
- [src/drizzle/README.md](./src/drizzle/README.md) — Drizzle runtime boundary (client, singleton, relations)
- [src/drizzle/ARCHITECTURE.md](./src/drizzle/ARCHITECTURE.md) — Internal design for `src/drizzle/`
- [src/rls-policies/README.md](./src/rls-policies/README.md) — RLS `pgPolicy` helpers (`@afenda/db/rls`)
- [src/rls-policies/ARCHITECTURE.md](./src/rls-policies/ARCHITECTURE.md) — Tenant policies and roles
- [src/seeds/README.md](./src/seeds/README.md) — DB seed orchestrator (CLI; not a package export)
- [src/seeds/ARCHITECTURE.md](./src/seeds/ARCHITECTURE.md) — Seed flow, determinism, known gaps
- [src/queries/README.md](./src/queries/README.md) — Named read/reporting query layer (governance: [ARCHITECTURE.md](./src/queries/ARCHITECTURE.md))
- [graph-validation/README.md](./src/graph-validation/README.md) — FK integrity validation
- [data-lifecycle/README.md](./src/data-lifecycle/README.md) — Data lifecycle documentation
- [@afenda/meta-types](../meta-types/README.md) — Type contract layer
- [@afenda/truth-test](../truth-test/README.md) — Truth testing infrastructure
