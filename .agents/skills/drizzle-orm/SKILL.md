---
name: drizzle-orm
description: "Type-safe SQL ORM for TypeScript with zero runtime overhead"
progressive_disclosure:
  entry_point:
    summary: "Type-safe SQL ORM for TypeScript with zero runtime overhead"
    when_to_use: "When working with drizzle-orm or related functionality."
    quick_start: "1. Review the core concepts below. 2. Apply patterns to your use case. 3. Follow best practices for implementation."
  references:
    - advanced-schemas.md
    - performance.md
    - query-patterns.md
    - vs-prisma.md
---

# Drizzle ORM

Modern TypeScript-first ORM with zero dependencies, compile-time type safety, and SQL-like syntax. Optimized for edge runtimes and serverless environments.

## Quick Start

### Installation

```bash
# Core ORM
npm install drizzle-orm

# Database driver (choose one)
npm install pg            # PostgreSQL
npm install mysql2        # MySQL
npm install better-sqlite3 # SQLite

# Drizzle Kit (migrations)
npm install -D drizzle-kit
```

### Basic Setup

```typescript
// db/schema.ts
import { pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// db/client.ts
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
export const db = drizzle(pool, { schema });
```

### First Query

```typescript
import { db } from "./db/client";
import { users } from "./db/schema";
import { eq } from "drizzle-orm";

// Insert
const newUser = await db
  .insert(users)
  .values({
    email: "user@example.com",
    name: "John Doe",
  })
  .returning();

// Select
const allUsers = await db.select().from(users);

// Where
const user = await db.select().from(users).where(eq(users.id, 1));

// Update
await db.update(users).set({ name: "Jane Doe" }).where(eq(users.id, 1));

// Delete
await db.delete(users).where(eq(users.id, 1));
```

## Schema Definition

### Column Types Reference

| PostgreSQL    | MySQL         | SQLite      | TypeScript |
| ------------- | ------------- | ----------- | ---------- |
| `serial()`    | `serial()`    | `integer()` | `number`   |
| `text()`      | `text()`      | `text()`    | `string`   |
| `integer()`   | `int()`       | `integer()` | `number`   |
| `boolean()`   | `boolean()`   | `integer()` | `boolean`  |
| `timestamp()` | `datetime()`  | `integer()` | `Date`     |
| `json()`      | `json()`      | `text()`    | `unknown`  |
| `uuid()`      | `varchar(36)` | `text()`    | `string`   |

### Common Schema Patterns

```typescript
import {
  pgTable,
  serial,
  text,
  varchar,
  integer,
  boolean,
  timestamp,
  json,
  unique,
} from "drizzle-orm/pg-core";

export const users = pgTable(
  "users",
  {
    id: serial("id").primaryKey(),
    email: varchar("email", { length: 255 }).notNull().unique(),
    passwordHash: varchar("password_hash", { length: 255 }).notNull(),
    role: text("role", { enum: ["admin", "user", "guest"] }).default("user"),
    metadata: json("metadata").$type<{ theme: string; locale: string }>(),
    isActive: boolean("is_active").default(true),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    emailIdx: unique("email_unique_idx").on(table.email),
  })
);

// Infer TypeScript types
type User = typeof users.$inferSelect;
type NewUser = typeof users.$inferInsert;
```

## Relations

### One-to-Many

```typescript
import { pgTable, serial, text, integer } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

export const authors = pgTable("authors", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
});

export const posts = pgTable("posts", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  authorId: integer("author_id")
    .notNull()
    .references(() => authors.id),
});

export const authorsRelations = relations(authors, ({ many }) => ({
  posts: many(posts),
}));

export const postsRelations = relations(posts, ({ one }) => ({
  author: one(authors, {
    fields: [posts.authorId],
    references: [authors.id],
  }),
}));

// Query with relations
const authorsWithPosts = await db.query.authors.findMany({
  with: { posts: true },
});
```

### Many-to-Many

```typescript
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
});

export const groups = pgTable("groups", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
});

export const usersToGroups = pgTable(
  "users_to_groups",
  {
    userId: integer("user_id")
      .notNull()
      .references(() => users.id),
    groupId: integer("group_id")
      .notNull()
      .references(() => groups.id),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.userId, table.groupId] }),
  })
);

export const usersRelations = relations(users, ({ many }) => ({
  groups: many(usersToGroups),
}));

export const groupsRelations = relations(groups, ({ many }) => ({
  users: many(usersToGroups),
}));

export const usersToGroupsRelations = relations(usersToGroups, ({ one }) => ({
  user: one(users, { fields: [usersToGroups.userId], references: [users.id] }),
  group: one(groups, { fields: [usersToGroups.groupId], references: [groups.id] }),
}));
```

## Queries

### Filtering

```typescript
import {
  eq,
  ne,
  gt,
  gte,
  lt,
  lte,
  like,
  ilike,
  inArray,
  isNull,
  isNotNull,
  and,
  or,
  between,
} from "drizzle-orm";

// Equality
await db.select().from(users).where(eq(users.email, "user@example.com"));

// Comparison
await db.select().from(users).where(gt(users.id, 10));

// Pattern matching
await db.select().from(users).where(like(users.name, "%John%"));

// Multiple conditions
await db
  .select()
  .from(users)
  .where(and(eq(users.role, "admin"), gt(users.createdAt, new Date("2024-01-01"))));

// IN clause
await db
  .select()
  .from(users)
  .where(inArray(users.id, [1, 2, 3]));

// NULL checks
await db.select().from(users).where(isNull(users.deletedAt));
```

### Joins

```typescript
import { eq } from "drizzle-orm";

// Inner join
const result = await db
  .select({
    user: users,
    post: posts,
  })
  .from(users)
  .innerJoin(posts, eq(users.id, posts.authorId));

// Left join
const result = await db
  .select({
    user: users,
    post: posts,
  })
  .from(users)
  .leftJoin(posts, eq(users.id, posts.authorId));

// Multiple joins with aggregation
import { count, sql } from "drizzle-orm";

const result = await db
  .select({
    authorName: authors.name,
    postCount: count(posts.id),
  })
  .from(authors)
  .leftJoin(posts, eq(authors.id, posts.authorId))
  .groupBy(authors.id);
```

### Pagination & Sorting

```typescript
import { desc, asc } from "drizzle-orm";

// Order by
await db.select().from(users).orderBy(desc(users.createdAt));

// Limit & offset
await db.select().from(users).limit(10).offset(20);

// Pagination helper
function paginate(page: number, pageSize: number = 10) {
  return db
    .select()
    .from(users)
    .limit(pageSize)
    .offset(page * pageSize);
}
```

## Transactions

```typescript
// Auto-rollback on error
await db.transaction(async (tx) => {
  await tx.insert(users).values({ email: 'user@example.com', name: 'John' });
  await tx.insert(posts).values({ title: 'First Post', authorId: 1 });
  // If any query fails, entire transaction rolls back
});

// Manual control
const tx = db.transaction(async (tx) => {
  const user = await tx.insert(users).values({ ... }).returning();

  if (!user) {
    tx.rollback();
    return;
  }

  await tx.insert(posts).values({ authorId: user.id });
});
```

## Migrations

### Drizzle Kit Configuration

```typescript
// drizzle.config.ts
import type { Config } from "drizzle-kit";

export default {
  schema: "./db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
} satisfies Config;
```

### Migration Workflow

```bash
# Generate migration
npx drizzle-kit generate

# View SQL
cat drizzle/0000_migration.sql

# Apply migration
npx drizzle-kit migrate

# Introspect existing database
npx drizzle-kit introspect

# Drizzle Studio (database GUI)
npx drizzle-kit studio
```

### Example Migration

```sql
-- drizzle/0000_initial.sql
CREATE TABLE IF NOT EXISTS "users" (
  "id" serial PRIMARY KEY NOT NULL,
  "email" varchar(255) NOT NULL,
  "name" text NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "users_email_unique" UNIQUE("email")
);
```

## Project-Specific Patterns (AFENDA-META-UI)

### Architecture Overview

This project uses a production-hardened Drizzle setup with enterprise patterns:

- **Multi-tenant RLS** — Row-level security enforced at schema level
- **pgSchema namespaces** — Logical domain separation (core, security, sales, reference)
- **Shared column mixins** — Reusable timestamp, audit, soft-delete columns
- **Relations v2** — Comprehensive FK relations using `defineRelations()`
- **Dual db clients** — `@afenda/db` (packages) + `apps/api/db` (with logging)

### Schema Organization

```
packages/db/src/
├── schema/
│   └── index.ts              # Aggregate exports
├── schema-platform/          # Core (tenants, users, sequences)
│   ├── core/
│   ├── security/
│   └── reference/
├── schema-domain/            # Business domain (sales, inventory)
│   └── sales/
├── schema-meta/              # Metadata system (models, fields, renderers)
├── relations.ts              # Relations v2 with defineRelations()
├── _shared/                  # Column mixins (timestamps, audit, soft-delete)
├── _rls/                     # Row-level security policies
└── _session/                 # Tenant context + session state
```

### Column Mixins

Use project-standard column mixins for consistency:

```typescript
import { timestampColumns, auditColumns, softDeleteColumns } from "../../_shared/index.js";

export const myTable = salesSchema.table("my_table", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  tenantId: integer().notNull(),
  name: text().notNull(),
  ...timestampColumns,    // createdAt, updatedAt
  ...auditColumns,         // createdBy, updatedBy
  ...softDeleteColumns,    // deletedAt, deletedBy
});
```

### Multi-Tenant RLS

All tenant-scoped tables use RLS policies:

```typescript
import { tenantIsolationPolicies, serviceBypassPolicy } from "../../_rls/index.js";

export const partners = salesSchema.table("partners", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  tenantId: integer().notNull(),
  name: text().notNull(),
  // ... other columns
}, (table) => [
  index("idx_partners_tenant").on(table.tenantId),
  foreignKey({
    columns: [table.tenantId],
    foreignColumns: [tenants.tenantId],
  }).onDelete("restrict").onUpdate("cascade"),
  ...tenantIsolationPolicies("partners"),
  serviceBypassPolicy("partners"),
]);
```

### Zod Schemas (drizzle-orm/zod)

Generate validation schemas with refinements:

```typescript
import { createInsertSchema, createSelectSchema, createUpdateSchema } from "drizzle-orm/zod";
import { z } from "zod/v4";

export const userSelectSchema = createSelectSchema(users);

export const userInsertSchema = createInsertSchema(users, {
  tenantId: z.number().int().positive(),
  email: z.email(),
  displayName: z.string().min(1).max(200),
});

export const userUpdateSchema = createUpdateSchema(users, {
  email: z.email().optional(),
  displayName: z.string().min(1).max(200).optional(),
});
```

### Tenant Context Pattern

Use `withTenantContext` for automatic tenant filtering (explicit `db`; sets Postgres GUCs then runs your callback in a transaction):

```typescript
import { withTenantContext } from "@afenda/db/request-context";
import { db } from "@afenda/db";

// Tenant-aware query (RLS applies inside the transaction)
const partners = await withTenantContext(db, ctx, (tx) =>
  tx.select().from(partnersTable).where(eq(partnersTable.active, true))
);

// Service bypass (no tenant filter)
const globalStats = await db.select().from(statsTable);
```

### Relations Usage

Leverage comprehensive relations for ergonomic queries:

```typescript
import { db } from "@afenda/db";

// Relational query with nested includes
const order = await db.query.salesOrders.findFirst({
  where: eq(salesOrders.id, orderId),
  with: {
    partner: {
      with: {
        addresses: true,
        bankAccounts: true,
      },
    },
    lines: {
      with: {
        product: {
          with: {
            template: true,
            category: true,
          },
        },
      },
    },
    pricelist: true,
    paymentTerm: {
      with: {
        lines: true,
      },
    },
  },
});
```

### Pool Configuration

Both db clients use production-hardened pool config:

```typescript
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: Number(process.env.DB_POOL_MAX ?? 10),
  idleTimeoutMillis: Number(process.env.DB_IDLE_TIMEOUT_MS ?? 10_000),
  connectionTimeoutMillis: Number(process.env.DB_CONNECTION_TIMEOUT_MS ?? 5_000),
  statement_timeout: Number(process.env.DB_STATEMENT_TIMEOUT_MS ?? 30_000),
  idle_in_transaction_session_timeout: 60_000,
});

// Monitor pool health
pool.on("error", (err) => log.error({ err }, "Pool error"));
pool.on("connect", () => log.debug(getPoolStats()));
```

### Prepared Statements (Hot Paths)

Use prepared statements for frequently-executed queries (10+ calls/sec):

```typescript
import { sql } from "drizzle-orm";

// Define prepared statement at module level
const dbGetDecisionChainSummaryPrepared = db
  .select()
  .from(decisionAuditChains)
  .where(eq(decisionAuditChains.rootId, sql.placeholder("chainId")))
  .limit(1)
  .prepare("decision_audit_chain_summary");

// Execute with parameters
const chain = await dbGetDecisionChainSummaryPrepared.execute({ chainId: "abc-123" });
```

**When to use:**
- Queries executed in loops or hot API paths (>10 calls/sec)
- Event store operations (audit logging, business events)
- Multi-tenant row lookups (tenant resolution, metadata overrides)
- Report generation queries with parameter substitution

**Example: Commission entry deduplication**
```typescript
const existingEntryPrepared = db
  .select({ id: commissionEntries.id, status: commissionEntries.status })
  .from(commissionEntries)
  .where(and(
    eq(commissionEntries.tenantId, sql.placeholder("tenantId")),
    eq(commissionEntries.orderId, sql.placeholder("orderId")),
    eq(commissionEntries.planId, sql.placeholder("planId")),
    isNull(commissionEntries.deletedAt)
  ))
  .limit(1)
  .prepare("commission_entry_lookup");

const [existing] = await existingEntryPrepared.execute({
  tenantId: 7,
  orderId: "order-123",
  planId: "plan-456",
});
```

**Performance benefits:**
- **10-30% faster** - PostgreSQL caches execution plan
- **Reduced network overhead** - SQL sent once, then just parameters
- **Type-safe parameters** - Full TypeScript inference on `.execute({ ... })`

### Migration Workflow

```bash
# Generate migration from schema changes (packages/db)
cd packages/db
pnpm db:generate

# Review generated SQL
cat migrations/TIMESTAMP_name/migration.sql

# Apply to database (dev/staging)
pnpm db:migrate

# Production: use proper migration runner with rollback support
```

### Query Logging

apps/api injects custom Pino logger with slow query detection:

```typescript
// apps/api/src/db/drizzleLogger.ts
export class PinoDrizzleLogger implements DrizzleLogger {
  private readonly slowQueryThresholdMs: number;

  constructor(slowQueryThresholdMs = 500) {
    this.slowQueryThresholdMs = slowQueryThresholdMs;
  }

  logQuery(query: string, params: unknown[]): void {
    if (process.env.NODE_ENV === "development") {
      log.debug({ query, params }, "SQL query");
    }
  }

  logSlowQuery(query: string, params: unknown[], durationMs: number): void {
    if (durationMs >= this.slowQueryThresholdMs) {
      log.warn({ query, params, durationMs, thresholdMs: this.slowQueryThresholdMs },
        "Slow query detected");
    }
  }
}

// apps/api/src/db/index.ts - Pool query wrapper for timing
const drizzleLogger = new PinoDrizzleLogger(500);

const originalPoolQuery = pool.query.bind(pool);
pool.query = async function queryWithTiming(...args) {
  const start = performance.now();
  const result = await originalPoolQuery(...args);
  const duration = performance.now() - start;

  const queryText = typeof args[0] === "string" ? args[0] : args[0]?.text ?? "unknown";
  const params = typeof args[0] === "string" ? args[1] : args[0]?.values;

  drizzleLogger.logSlowQuery(queryText, params ?? [], duration);
  return result;
} as typeof originalPoolQuery;

export const db = drizzle({
  client: pool,
  schema,
  relations,
  casing: "camelCase",
  **Using `.select()` without narrowing columns on large tables (50+ columns)**
- **Filtering large datasets in JavaScript instead of SQL WHERE clauses**
- **Using SELECT→UPDATE/INSERT upsert pattern instead of `onConflictDoUpdate()`**

## Performance Patterns

### Column-Select Optimization

**Rule:** Always narrow column selection for tables with 20+ columns or 1000+ rows.

```typescript
// ❌ BAD: Fetches all 50+ columns of salesOrders
const order = await db
  .select()
  .from(salesOrders)
  .where(eq(salesOrders.id, orderId))
  .limit(1);

// ✅ GOOD: Only fetch required columns
const order = await db
  .select({
    id: salesOrders.id,
    tenantId: salesOrders.tenantId,
    partnerId: salesOrders.partnerId,
    amountTotal: salesOrders.amountTotal,
    status: salesOrders.status,
  })
  .from(salesOrders)
  .where(eq(salesOrders.id, orderId))
  .limit(1);
```

**When to narrow:**
- Existence checks → Select only `id`
- Aggregation queries → Select only grouping columns
- List/report views → Select only displayed columns
- Large tables (partnerships, orders, products) → Always narrow

### SQL Filtering vs JavaScript Filtering

**Rule:** Move filtering to SQL WHERE clauses, not JavaScript `.filter()`.

```typescript
// ❌ BAD: Fetches 10,000 entries, filters in JavaScript
const allEntries = await db
  .select()
  .from(commissionEntries)
  .where(eq(commissionEntries.tenantId, tenantId));

const filtered = allEntries.filter(entry =>
  entry.salespersonId === 123 &&
  entry.status === 'approved'
);

// ✅ GOOD: Filter at SQL level, leverage indexes
const conditions = [
  eq(commissionEntries.tenantId, tenantId),
  eq(commissionEntries.salespersonId, 123),
  eq(commissionEntries.status, 'approved'),
];

const entries = await db
  .select()
  .from(commissionEntries)
  .where(and(...conditions))
  .limit(100)
  .offset(0);
```

**Benefits:**
- 10-100x faster for large datasets
- Reduces network transfer
- Leverages PostgreSQL indexes
- Enables pagination at SQL level### Atomic Upserts

**Rule:** Use `onConflictDoUpdate()` for upserts, not SELECT→UPDATE/INSERT.

```typescript
// ❌ BAD: Race condition under concurrent writes
const existing = await db
  .select({ id: tenantDefinitions.id })
  .from(tenantDefinitions)
  .where(eq(tenantDefinitions.id, tenant.id))
  .limit(1);

if (existing.length) {
  await db.update(tenantDefinitions).set({ ...tenant }).where(eq(tenantDefinitions.id, tenant.id));
} else {
  await db.insert(tenantDefinitions).values({ ...tenant });
}

// ✅ GOOD: Atomic INSERT...ON CONFLICT
await db
  .insert(tenantDefinitions)
  .values({ ...tenant })
  .onConflictDoUpdate({
    target: tenantDefinitions.id,
    set: { ...tenant, updatedAt: new Date() },
  });
```

**Benefits:**
- **Eliminates race conditions** under concurrent writes
- **Reduces query count** from 2-3 queries to 1 query
- **Atomicity guaranteed** by PostgreSQL INSERT...ON CONFLICT

### Casing Configuration

**Rule:** Both db clients use `casing: "camelCase"` for consistent column mapping.

```typescript
// packages/db/src/db.ts
export const db = drizzle({
  client: pool,
  casing: "camelCase",
});

// apps/api/src/db/index.ts
export const db = drizzle({
  client: pool,
  schema,
  relations,
  casing: "camelCase",
  logger: drizzleLogger,
});
```

**Effect:** Database columns `created_at` map to TypeScript `createdAt` automatically.
});
```

**Why pool query wrapper?**
- Drizzle's `logQuery()` is called synchronously **before** execution
- Pool wrapper intercepts queries **after** execution with actual timing
- Logs all queries (Drizzle ORM + raw `pool.query()` calls)

**Production behavior:**
- Development: All queries logged at `debug` level
- Production: Only slow queries (>500ms) logged at `warn` level

### Graceful Shutdown

Both pools close on SIGTERM/SIGINT:

```typescript
process.on("SIGTERM", async () => {
  await pool.end();
  process.exit(0);
});
```

## Navigation

### Detailed References

- **[🏗️ Advanced Schemas](./references/advanced-schemas.md)** - Custom types, composite keys, indexes, constraints, multi-tenant patterns. Load when designing complex database schemas.

- **[🔍 Query Patterns](./references/query-patterns.md)** - Subqueries, CTEs, raw SQL, prepared statements, batch operations. Load when optimizing queries or handling complex filtering.

- **[⚡ Performance](./references/performance.md)** - Connection pooling, query optimization, N+1 prevention, prepared statements, edge runtime integration. Load when scaling or optimizing database performance.

- **[🔄 vs Prisma](./references/vs-prisma.md)** - Feature comparison, migration guide, when to choose Drizzle over Prisma. Load when evaluating ORMs or migrating from Prisma.

## Red Flags

**Stop and reconsider if:**

- Using `any` or `unknown` for JSON columns without type annotation
- Building raw SQL strings without using `sql` template (SQL injection risk)
- Not using transactions for multi-step data modifications
- Fetching all rows without pagination in production queries
- Missing indexes on foreign keys or frequently queried columns
- Using `select()` without specifying columns for large tables

## Performance Benefits vs Prisma

| Metric              | Drizzle           | Prisma                |
| ------------------- | ----------------- | --------------------- |
| **Bundle Size**     | ~35KB             | ~230KB                |
| **Cold Start**      | ~10ms             | ~250ms                |
| **Query Speed**     | Baseline          | ~2-3x slower          |
| **Memory**          | ~10MB             | ~50MB                 |
| **Type Generation** | Runtime inference | Build-time generation |

## Integration

- **typescript-core**: Type-safe schema inference with `satisfies`
- **nextjs-core**: Server Actions, Route Handlers, Middleware integration
- **Database Migration**: Safe schema evolution patterns

## Related Skills

When using Drizzle, these skills enhance your workflow:

- **prisma**: Alternative ORM comparison: Drizzle vs Prisma trade-offs
- **typescript**: Advanced TypeScript patterns for type-safe queries
- **nextjs**: Drizzle with Next.js Server Actions and API routes
- **sqlalchemy**: SQLAlchemy patterns for Python developers learning Drizzle

[Full documentation available in these skills if deployed in your bundle]
