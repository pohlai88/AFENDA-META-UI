# Database Package — Architecture

> **Status:** Production — Multi-Domain Restructure Complete
> **Package:** `@afenda/db`
> **Database:** PostgreSQL (Neon serverless + local pool)
> **ORM:** Drizzle ORM v1 (with Relations v2)
> **Schemas:** 5 PostgreSQL namespaces (`core`, `security`, `sales`, `reference`, `meta`)
> **Build:** TypeScript clean

---

## The Design Shift

| Old approach                                                    | New approach                       |
| --------------------------------------------------------------- | ---------------------------------- |
| Flat `schema-platform/`, `schema-meta/`, etc.                   | ❌ inconsistent naming             |
| Underscore-prefixed `_shared/`, `_session/`                     | ❌ misleading "private" convention |
| Separate DB clients in apps/api and packages/db                 | ❌ duplicated pool config          |
| Single sales domain, no expansion path                          | ❌ not multi-domain-ready          |
| **Domain-organized schema/, configurable client, clean layers** | ✅ target                          |

---

## Package Role

`@afenda/db` is the **canonical database layer** for the AFENDA ERP platform. It provides:

- **Schema definitions** for all business domains (Drizzle ORM tables + Zod validators)
- **Configurable database client** with pluggable logging and connection modes
- **Multi-tenant infrastructure** (RLS policies, session context, tenant isolation)
- **Truth compiler** (event sourcing, state machines, invariants, mutation policies)
- **Operational tooling** (seeds, migrations, partitioning, archival, graph validation)

### Boundary Position

```
               ┌──────────────────┐
               │  apps/api        │ ─── createDatabase({ logger: PinoLogger })
               └──────────────────┘
                       │
               ┌──────────────────┐
               │  packages/       │
               │    truth-test    │ ─── imports db, schema, truth-compiler
               └──────────────────┘
                       │
            ┌─────────────────────┐
            │  @afenda/db         │ ←── THIS PACKAGE
            │  (database layer)   │
            └─────────────────────┘
                       │
            ┌─────────────────────┐
            │  @afenda/meta-types │ ←── type contracts (zero runtime)
            │  (foundation)       │
            └─────────────────────┘
```

**Dependencies:** `@afenda/meta-types` (types only), `drizzle-orm`, `pg`, `@neondatabase/serverless`, `zod`, `decimal.js`

---

## Package Structure

```
packages/db/
├── ARCHITECTURE.md                          # This document
├── README.md                                # Usage guide & quick reference
├── package.json                             # Subpath exports, scripts, dependencies
├── drizzle.config.ts                        # Drizzle Kit migration config
├── tsconfig.json                            # TypeScript (composite, incremental)
├── turbo.json                               # Turborepo task config
├── vitest.config.ts                         # Test config
│
├── src/
│   ├── index.ts                             # Root barrel (db client + core re-exports)
│   │
│   ├── client/                              # ── Layer 1: Database Client ──
│   │   └── index.ts                         # createDatabase(), createServerlessDatabase(),
│   │                                        #   pool config, DrizzleLogger, health checks
│   │
│   ├── schema/                              # ── Layer 2: Schema Definitions ──
│   │   ├── index.ts                         # Combined barrel (all domains)
│   │   ├── core/                            # pgSchema("core")
│   │   │   ├── index.ts                     # tenants, appModules
│   │   │   ├── tenants.ts                   # Tenant master records + Zod schemas
│   │   │   └── appModules.ts                # Application module registry
│   │   ├── security/                        # pgSchema("security")
│   │   │   ├── index.ts                     # users, roles, permissions, userRoles
│   │   │   ├── users.ts                     # User accounts with RLS
│   │   │   ├── roles.ts                     # Role definitions
│   │   │   ├── permissions.ts               # Permission records
│   │   │   └── userRoles.ts                 # User-role junction table
│   │   ├── reference/                       # pgSchema("reference")
│   │   │   ├── index.ts                     # currencies, countries, banks, UOM, sequences
│   │   │   └── tables.ts                    # All reference data tables + enums
│   │   ├── meta/                            # Meta-engine tables
│   │   │   ├── index.ts                     # schema registry, metadata, overrides, audit
│   │   │   ├── platform.ts                  # Schema registry, model metadata
│   │   │   ├── metadata.ts                  # Generic metadata storage
│   │   │   ├── tenantOverrides.ts           # Tenant-specific metadata overrides
│   │   │   └── decisionAudit.ts             # Decision audit logging + chains
│   │   └── sales/                           # pgSchema("sales")
│   │       ├── index.ts                     # All sales exports
│   │       ├── _schema.ts                   # salesSchema = pgSchema("sales")
│   │       ├── _enums.ts                    # 40+ domain enums (order status, partner type, etc.)
│   │       ├── _zodShared.ts                # Branded IDs, shared Zod schemas
│   │       ├── _relations.ts                # Domain-specific Drizzle relations
│   │       └── tables.ts                    # Partners, products, orders, subscriptions, etc.
│   │
│   │   ── Future domain stubs (pgSchema + barrel only) ──
│   │   accounting/                          # pgSchema("accounting")
│   │   hr/                                  # pgSchema("hr")
│   │   inventory/                           # pgSchema("inventory")
│   │   purchasing/                          # pgSchema("purchasing")
│   │
│   ├── columns/                             # ── Layer 3a: Shared Column Mixins ──
│   │   ├── index.ts                         # Barrel: timestamps, audit, name, Zod wire
│   │   ├── timestamps.ts                    # createdAt, updatedAt, deletedAt columns
│   │   ├── auditColumns.ts                  # createdBy, updatedBy audit tracking
│   │   ├── nameColumns.ts                   # Standard name/description text column
│   │   └── zodWire.ts                       # Date/timestamp Zod schemas for API wire format
│   │
│   ├── session/                             # ── Layer 3b: Session Context ──
│   │   ├── index.ts                         # Barrel: setSessionContext, withTenantContext
│   │   ├── setSessionContext.ts             # PostgreSQL session variable management
│   │   └── withTenantContext.ts             # Tenant context extraction from HTTP headers
│   │
│   ├── rls/                                 # ── Layer 3c: Row-Level Security ──
│   │   ├── index.ts                         # Barrel: policies, roles
│   │   └── tenant-policies.ts               # Tenant isolation RLS (select/insert/update/delete)
│   │
│   ├── relations.ts                         # ── Layer 3d: FK Relations (Drizzle v2) ──
│   │                                        #    Comprehensive: sales, partners, products, taxes
│   │
│   ├── truth-compiler/                      # ── Layer 4: Truth Compiler ──
│   │   ├── index.ts                         # Public barrel (all compiler exports)
│   │   ├── truth-config.ts                  # Entity defs, state machines, invariants, policies
│   │   ├── types.ts                         # Compiler-internal type definitions
│   │   ├── schema-compiler.ts               # Schema → EntityDef compilation
│   │   ├── event-compiler.ts                # Domain event compilation
│   │   ├── invariant-compiler.ts            # ConditionExpression → SQL CHECK constraints
│   │   ├── cross-invariant-compiler.ts      # Cross-entity validation rules
│   │   ├── mutation-policy-compiler.ts      # Policy definition → enforcement logic
│   │   ├── mutation-policy-runtime.ts       # Runtime policy dispatch
│   │   ├── transition-compiler.ts           # State machine transition validation
│   │   ├── dependency-graph.ts              # Entity dependency tracking
│   │   ├── normalizer.ts                    # Schema normalization pipeline
│   │   ├── emitter.ts                       # Code generation output
│   │   ├── generate-truth-sql.ts            # Truth model → SQL DDL generation
│   │   ├── compare-truth-schema.ts          # Schema drift detection
│   │   ├── graph-constants.ts               # Compiler constants
│   │   ├── sql-utils.ts                     # SQL helper functions
│   │   └── __test__/                        # Compiler unit tests
│   │
│   ├── graph-validation/                    # ── Layer 5a: FK Integrity Validation ──
│   │   ├── index-remediation.ts             # Missing FK index detection
│   │   ├── fk-catalog.ts                    # FK relationship catalog (279+ relations)
│   │   ├── orphan-detection.ts              # Orphaned row detection
│   │   ├── health-scoring.ts                # Database health metrics (0-100 score)
│   │   ├── tenant-isolation.ts              # Multi-tenant isolation audit
│   │   ├── runner.ts                        # CLI runner
│   │   ├── README.md                        # Graph validation documentation
│   │   └── __test__/                        # Validation tests
│   │
│   ├── seeds/                               # ── Layer 5b: Data Seeding ──
│   │   ├── index.ts                         # Seed orchestrator (baseline, demo, stress, 1M)
│   │   ├── factories.ts                     # Data factory functions
│   │   ├── scenarios.ts                     # Test data scenarios
│   │   ├── seed-types.ts                    # Seed type definitions
│   │   ├── seed-ids.ts                      # ID generation
│   │   ├── money.ts                         # Currency/decimal helpers
│   │   ├── snapshot.ts                      # Post-seed verification
│   │   ├── clear.ts                         # Data cleanup
│   │   ├── domains/                         # Domain-specific seeders
│   │   │   ├── foundation/                  # Tenants, users baseline
│   │   │   ├── partner/                     # Customers, vendors
│   │   │   ├── product/                     # Product catalog
│   │   │   ├── sales/                       # Sales orders
│   │   │   ├── tax/                         # Tax configuration
│   │   │   ├── commercial-policy/           # Pricelists, payment terms
│   │   │   ├── commissions/                 # Commission plans
│   │   │   ├── consignment/                 # Consignment agreements
│   │   │   ├── subscriptions/               # Recurring billing
│   │   │   ├── returns/                     # Return orders
│   │   │   └── metadata/                    # Schema registry seeds
│   │   ├── performance/                     # Load testing generators
│   │   │   ├── load-test-generator.ts       # 1M+ row generation
│   │   │   └── validate-partitions.ts       # Partition verification
│   │   └── __test__/                        # Seed tests
│   │
│   ├── maintenance/                         # ── Layer 5c: Database Operations ──
│   │   ├── apply-status-triggers.ts         # SQL trigger management
│   │   ├── sales-partition-plan.ts          # Partition strategy definitions
│   │   ├── run-sales-partition-plan.ts      # Partition execution
│   │   ├── sales-retention-plan.ts          # Data retention policies
│   │   ├── run-sales-retention.ts           # Retention execution
│   │   └── __test__/                        # Maintenance tests
│   │
│   ├── archival/                            # ── Layer 5d: Data Archival ──
│   │   ├── runner.ts                        # Archival CLI runner
│   │   ├── r2-integration.ts                # Cloudflare R2 cold storage
│   │   └── README.md                        # Archival documentation
│   │
│   ├── triggers/                            # ── SQL Triggers ──
│   │   └── status-transitions.sql           # Status change trigger definitions
│   │
│   ├── _private/                             # Internal types (NOT exported)
│   │   └── README.md
│   │
│   └── __test__/                            # ── Integration Tests ──
│       ├── invariants.test.ts               # Invariant enforcement tests
│       ├── rls.test.ts                      # RLS policy tests
│       ├── shared-columns.test.ts           # Column mixin tests
│       └── truth-enforcement.integration.test.ts  # End-to-end truth tests
│
├── migrations/                              # ── Drizzle Kit Migrations ──
│   ├── 2026MMDD_*/                          # Drizzle-generated migration folders
│   ├── generated/
│   │   └── truth-v1.sql                     # Generated truth constraints
│   └── partitioning/                        # Table partitioning scripts
│       ├── 001_partition_sales_orders.sql
│       ├── 002_partition_accounting_postings.sql
│       ├── 003_partition_domain_event_logs.sql
│       ├── 004_partition_automation_functions.sql
│       ├── 005_partition_maintenance_scripts.sql
│       └── 006_enhanced_archival_functions.sql
│
└── dist/                                    # Compiled output
```

---

## Core Architecture

### Layer 1 — Database Client

The client layer provides a **configurable database connection factory** supporting both traditional pool-based and Neon serverless connections.

```typescript
import { createDatabase } from "@afenda/db/client";

// Default — pool-based with console logging
const { db, pool } = createDatabase();

// Custom — pluggable logger, pool tuning
const { db, pool } = createDatabase({
  logger: new PinoDrizzleLogger(500), // apps/api passes this
  poolConfig: { max: 20 },
  connectionString: process.env.DATABASE_URL,
});
```

**`createDatabase(options?: DatabaseOptions)`**

| Option             | Type            | Default                    | Purpose                     |
| ------------------ | --------------- | -------------------------- | --------------------------- |
| `connectionString` | `string`        | `process.env.DATABASE_URL` | PostgreSQL connection URL   |
| `logger`           | `DrizzleLogger` | Console logger             | Query logging (pluggable)   |
| `poolConfig`       | `PoolConfig`    | Hardened defaults          | Pool tuning (max, timeouts) |

**Pool defaults (production-hardened):**

| Setting                               | Value    |
| ------------------------------------- | -------- |
| `max`                                 | `10`     |
| `idleTimeoutMillis`                   | `10,000` |
| `connectionTimeoutMillis`             | `5,000`  |
| `statement_timeout`                   | `30,000` |
| `idle_in_transaction_session_timeout` | `60,000` |

**Dual-mode connections:**

- **Pool** via `createDatabase()` (`drizzle-orm/node-postgres`): Traditional server environments (apps/api)
- **Serverless** via `createServerlessDatabase()` (`drizzle-orm/neon-http`): Edge functions, migrations, CI

**Backward compatibility:** The default `db` and `dbServerless` exports remain available from `@afenda/db` root.

---

### Layer 2 — Schema Definitions

Schemas are organized by **business domain**, each in its own PostgreSQL namespace via `pgSchema()`:

| Domain        | pgSchema    | Path                | Tables | Description                                                                   |
| ------------- | ----------- | ------------------- | ------ | ----------------------------------------------------------------------------- |
| **core**      | `core`      | `schema/core/`      | 2      | Tenants, app modules                                                          |
| **security**  | `security`  | `schema/security/`  | 4      | Users, roles, permissions, user-roles                                         |
| **reference** | `reference` | `schema/reference/` | 15+    | Currencies, countries, banks, UOM, sequences                                  |
| **meta**      | —           | `schema/meta/`      | 10+    | Schema registry, metadata, overrides, audit                                   |
| **sales**     | `sales`     | `schema/sales/`     | 35+    | Partners, products, orders, subscriptions, commissions, consignments, returns |

**Multi-domain expansion path:**

```
schema/
├── core/            ← platform infrastructure
├── security/        ← auth & RBAC
├── reference/       ← shared reference data
├── meta/            ← metadata engine
├── sales/           ← sales domain (current)
├── accounting/      ← future: chart of accounts, journals, postings
├── hr/              ← future: employees, departments, attendance
├── inventory/       ← future: warehouses, stock moves, lots
└── purchasing/      ← future: purchase orders, vendor bills
```

Each domain follows a consistent pattern:

```
schema/{domain}/
├── index.ts         # Barrel: re-exports all domain exports
├── _schema.ts       # pgSchema("{domain}") namespace
├── _enums.ts        # Drizzle enum types + Zod enum schemas
├── _zodShared.ts    # Branded IDs, shared Zod validation schemas
├── _relations.ts    # Domain-specific relation helpers (optional)
└── tables.ts        # Table definitions + insert/select/update Zod schemas + types
```

**Schema barrel** (`schema/index.ts`) re-exports all domains for `@afenda/db/schema` consumers.

---

### Layer 3 — Infrastructure

Infrastructure modules provide cross-cutting concerns consumed by all schema domains.

#### 3a. Column Mixins (`columns/`)

Reusable column definitions that ensure consistency across all tables:

```typescript
import { timestampColumns, softDeleteColumns, auditColumns, nameColumn } from "@afenda/db/columns";

export const myTable = pgSchema("domain").table("my_table", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  ...nameColumn, // name: text().notNull()
  ...timestampColumns, // createdAt, updatedAt (timestamptz, notNull, defaultNow)
  ...softDeleteColumns, // deletedAt (timestamptz, nullable)
  ...auditColumns, // createdBy, updatedBy (integer, notNull)
});
```

| Mixin                        | Columns                  | Required                    |
| ---------------------------- | ------------------------ | --------------------------- |
| `timestampColumns`           | `createdAt`, `updatedAt` | Mandatory                   |
| `softDeleteColumns`          | `deletedAt`              | Recommended                 |
| `auditColumns`               | `createdBy`, `updatedBy` | Recommended                 |
| `nameColumn`                 | `name`                   | Entities with display names |
| `appendOnlyTimestampColumns` | `createdAt` only         | Append-only logs            |

**Zod wire schemas** (`zodWire.ts`) provide date/timestamp validation for API serialization:

```typescript
import { dateStringSchema, timestamptzWireSchema } from "@afenda/db/columns";
```

#### 3b. Session Context (`session/`)

PostgreSQL session variable management for multi-tenant RLS enforcement:

```typescript
import { setSessionContext, clearSessionContext } from "@afenda/db/session";

await setSessionContext(db, {
  tenantId: 42,
  userId: 1,
  actorType: "user",
  correlationId: "req-abc",
});

// All subsequent queries within this transaction are tenant-scoped
```

| Session Variable        | Type                                  | Purpose              |
| ----------------------- | ------------------------------------- | -------------------- |
| `afenda.tenant_id`      | `int`                                 | RLS tenant isolation |
| `afenda.user_id`        | `int`                                 | Audit trail          |
| `afenda.actor_type`     | `user \| service_principal \| system` | Access control       |
| `afenda.correlation_id` | `string`                              | Distributed tracing  |
| `afenda.request_id`     | `string`                              | Request tracking     |
| `afenda.session_id`     | `string`                              | Session tracking     |
| `afenda.ip_address`     | `string`                              | Audit logging        |
| `afenda.user_agent`     | `string`                              | Audit logging        |

#### 3c. Row-Level Security (`rls/`)

Tenant isolation enforced at the PostgreSQL level:

```typescript
import { tenantIsolationPolicies, serviceBypassPolicy } from "@afenda/db/rls";

export const myTable = salesSchema.table("my_table", { ... }, (table) => [
  ...tenantIsolationPolicies("my_table"),   // SELECT/INSERT/UPDATE/DELETE policies
  serviceBypassPolicy("my_table"),           // Service role bypass
]);
```

**RLS architecture:**

```
┌─────────────┐     ┌──────────────────────────────────┐
│  Request     │ ──► │  setSessionContext(tenant_id=42)  │
└─────────────┘     └──────────────────────────────────┘
                              │
                    ┌──────────────────────────────────┐
                    │  PostgreSQL RLS Policy:           │
                    │  WHERE tenant_id = current_setting│
                    │    ('afenda.tenant_id')::int      │
                    └──────────────────────────────────┘
                              │
                    ┌──────────────────────────────────┐
                    │  Only rows for tenant 42 visible  │
                    └──────────────────────────────────┘
```

**Roles:**

- `app_user` — subject to tenant isolation policies
- `service_role` — bypasses tenant isolation (for cross-tenant operations)

#### 3d. Relations (`relations.ts`)

Drizzle Relations v2 providing FK-based relational queries:

```typescript
import { relations } from "@afenda/db/relations";

// Enables: db.query.salesOrders.findMany({ with: { partner: true, lines: true } })
```

**Coverage:** Sales orders ↔ partners, lines, pricelists, payment terms; Partners ↔ addresses, bank accounts, tags; Products ↔ templates, categories, variants; Tenants ↔ all tenant-scoped entities.

---

### Layer 4 — Truth Compiler

The truth compiler transforms declarative business rules into enforceable database constraints and runtime policies.

```
truth-config.ts (declarative rules)
       │
       ├── invariant-compiler      → SQL CHECK constraints
       ├── transition-compiler     → State machine validation
       ├── mutation-policy-compiler → Direct/dual-write/event-only policies
       ├── cross-invariant-compiler → Cross-entity validation
       ├── event-compiler          → Domain event type generation
       └── generate-truth-sql.ts   → Complete DDL output
```

**Truth Model manifest** (`SALES_TRUTH_MODEL`):

```typescript
{
  entities: ["consignment_agreement", "sales_order", "subscription"],
  events: [
    "sales_order.submitted", "sales_order.confirmed", "sales_order.cancelled",
    "subscription.activated", "subscription.paused", "subscription.renewed",
    // ...
  ],
  invariants: [
    "sales.consignment_agreement.active_has_partner",
    "sales.sales_order.confirmed_amount_positive",
  ],
  mutationPolicies: [
    { id: "sales.sales_order.dual_write_rollout", mutationPolicy: "dual-write", ... }
  ],
}
```

**Mutation Policy Types:**

| Policy       | Direct Write | Events Required | Use Case                              |
| ------------ | ------------ | --------------- | ------------------------------------- |
| `direct`     | ✅ allowed   | ❌ optional     | Simple CRUD, no audit trail needed    |
| `dual-write` | ✅ allowed   | ✅ required     | Transitioning to event sourcing       |
| `event-only` | ❌ blocked   | ✅ required     | Full event sourcing, no direct writes |

**CLI commands:**

```bash
pnpm --filter @afenda/db truth:generate   # Generate SQL from truth model
pnpm --filter @afenda/db truth:check      # Verify generated SQL matches
```

---

### Layer 5 — Operations

#### 5a. Graph Validation

Automated FK integrity and tenant isolation validation across 279+ relationships:

```bash
pnpm --filter @afenda/db graph-validation          # Full health report
pnpm --filter @afenda/db graph-validation -- health # Health score (0-100)
```

**Health scoring:** Orphan detection (40%) + Index coverage (25%) + Tenant isolation (25%) + Cascade behavior (10%)

#### 5b. Seeds

Multi-scenario data seeding with domain-organized factories:

```bash
pnpm --filter @afenda/db seed                       # Default: baseline scenario
pnpm --filter @afenda/db seed -- --scenario demo     # Demo data
pnpm --filter @afenda/db seed -- --scenario stress   # Bulk stress test
```

**Scenarios:** `baseline` (core + all domains), `demo` (baseline + demo extensions), `stress` (baseline + bulk generator), `load-test-1M` (1M+ orders).

#### 5c. Maintenance

Production database operations:

```bash
pnpm --filter @afenda/db db:trigger:apply           # Apply status triggers
pnpm --filter @afenda/db ops:partition:plan          # Preview partition changes
pnpm --filter @afenda/db ops:partition:apply         # Apply partitioning
pnpm --filter @afenda/db ops:retention:plan          # Preview data retention
pnpm --filter @afenda/db ops:retention:apply         # Apply retention policies
```

#### 5d. Archival

Cold storage integration with Cloudflare R2 for aged data.

---

## Subpath Export Map

| Subpath              | Path                    | Runtime | Purpose                                  | Consumers                         |
| -------------------- | ----------------------- | ------- | ---------------------------------------- | --------------------------------- |
| `.`                  | `src/index.ts`          | ✅      | db client + aggregated re-exports        | apps/api, truth-test              |
| `./client`           | `src/client/`           | ✅      | createDatabase factory, pool, health     | apps/api                          |
| `./schema`           | `src/schema/`           | ✅      | All domain tables combined               | apps/api, truth-test              |
| `./schema/core`      | `src/schema/core/`      | ✅      | Tenants, app modules                     | apps/api, truth-test              |
| `./schema/security`  | `src/schema/security/`  | ✅      | Users, roles, permissions                | apps/api                          |
| `./schema/reference` | `src/schema/reference/` | ✅      | Currencies, countries, UOM               | apps/api                          |
| `./schema/meta`      | `src/schema/meta/`      | ✅      | Schema registry, metadata, overrides     | apps/api                          |
| `./schema/sales`     | `src/schema/sales/`     | ✅      | Full sales domain (35+ tables)           | apps/api, truth-test              |
| `./columns`          | `src/columns/`          | ✅      | Shared column mixins + Zod wire schemas  | apps/api, truth-test, new domains |
| `./session`          | `src/session/`          | ✅      | Session context management               | apps/api                          |
| `./rls`              | `src/rls/`              | ✅      | RLS policies + roles                     | schema definitions                |
| `./relations`        | `src/relations.ts`      | ✅      | Drizzle v2 FK relations                  | apps/api, truth-test              |
| `./truth-compiler`   | `src/truth-compiler/`   | ✅      | Truth engine (invariants, policies, FSM) | apps/api, truth-test              |

**Deprecated aliases** (kept for 1 release cycle):

| Old Subpath         | Redirects To                         |
| ------------------- | ------------------------------------ |
| `./shared`          | `./columns`                          |
| `./schema-meta`     | `./schema/meta`                      |
| `./schema-domain`   | `./schema/sales`                     |
| `./schema-platform` | `./schema` (core+security+reference) |

---

## Consumer Map

### apps/api

| Import Subpath              | Symbols Used                                                                                       |
| --------------------------- | -------------------------------------------------------------------------------------------------- |
| `@afenda/db`                | `relations`, `requireMutationPolicyById`, `SALES_INVARIANT_REGISTRIES`, `MUTATION_POLICY_REGISTRY` |
| `@afenda/db/client`         | `createDatabase`                                                                                   |
| `@afenda/db/schema`         | All domain tables (re-exported via local barrel)                                                   |
| `@afenda/db/schema/meta`    | `schemaRegistry`, `entities`, `fields`, `layouts`, `policies`, `auditLogs`, `events`               |
| `@afenda/db/schema/sales`   | `salesOrders`, `partners`, `products`, `subscriptions`, etc. (35+ tables)                          |
| `@afenda/db/truth-compiler` | `MUTATION_POLICIES`, `isDirectMutationAllowed`, `resolveMutationPolicy`                            |

### packages/truth-test

| Import Subpath              | Symbols Used                                                                                |
| --------------------------- | ------------------------------------------------------------------------------------------- |
| `@afenda/db`                | `db`                                                                                        |
| `@afenda/db/schema`         | `* as schema` (namespace), `* as DbSchema` (namespace), `tenants`                           |
| `@afenda/db/truth-compiler` | `SALES_STATE_MACHINES`, `SALES_INVARIANT_REGISTRIES`, `MUTATION_POLICIES`, auto-gen exports |

---

## Migration System

### Drizzle Kit Workflow

```bash
pnpm --filter @afenda/db db:generate   # Generate migration from schema changes
pnpm --filter @afenda/db db:migrate    # Apply pending migrations
pnpm --filter @afenda/db db:push       # Push schema directly (development only)
pnpm --filter @afenda/db db:studio     # Open Drizzle Studio GUI
```

**Configuration** (`drizzle.config.ts`):

- Schema source: `./src/schema/index.ts`
- Migrations output: `./migrations/`
- Dialect: `postgresql`
- Connection: `DATABASE_URL_MIGRATIONS` (direct endpoint for Neon), fallback to `DATABASE_URL`

### Migration Conventions

- Drizzle Kit generates timestamped migration folders under `migrations/`
- Partitioning scripts are manually maintained under `migrations/partitioning/`
- Truth SQL is generated separately via `truth:generate` → `migrations/generated/truth-v1.sql`
- Never hand-edit generated migrations; regenerate if schema changes

### Partitioning Strategy

Tables partitioned by `tenant_id` for multi-tenant performance:

- `sales_orders` — range partition by tenant
- `accounting_postings` — range partition by tenant
- `domain_event_logs` — range partition by tenant

---

## Adding a New Domain

Follow this checklist when adding a new business domain (e.g., `accounting`, `hr`, `inventory`):

### 1. Create Schema Directory

```
src/schema/{domain}/
├── index.ts         # Barrel
├── _schema.ts       # pgSchema("{domain}")
├── _enums.ts        # Domain enums
├── _zodShared.ts    # Branded IDs, shared Zod schemas
└── tables.ts        # Table definitions
```

### 2. Define PostgreSQL Namespace

```typescript
// src/schema/{domain}/_schema.ts
import { pgSchema } from "drizzle-orm/pg-core";
export const {domain}Schema = pgSchema("{domain}");
```

### 3. Define Tables

```typescript
// src/schema/{domain}/tables.ts
import { {domain}Schema } from "./_schema.js";
import { timestampColumns, softDeleteColumns, auditColumns } from "../../columns/index.js";
import { tenantIsolationPolicies, serviceBypassPolicy } from "../../rls/index.js";

export const myEntity = {domain}Schema.table("my_entity", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  tenantId: integer("tenant_id").notNull(),
  ...timestampColumns,
  ...softDeleteColumns,
  ...auditColumns,
}, (table) => [
  ...tenantIsolationPolicies("my_entity"),
  serviceBypassPolicy("my_entity"),
]);
```

### 4. Wire Into Schema Barrel

```typescript
// src/schema/index.ts — add:
export * from "./{domain}/index.js";
```

### 5. Add Subpath Export

```json
// package.json — add to exports:
"./schema/{domain}": {
  "import": "./dist/schema/{domain}/index.js",
  "types": "./dist/schema/{domain}/index.d.ts"
}
```

### 6. Add Relations

Update `src/relations.ts` with FK relations for new domain entities.

### 7. Add Truth Config (optional)

Define entity defs, invariants, and state machines in `truth-compiler/truth-config.ts`.

### 8. Add Seed Data

Create `src/seeds/domains/{domain}/` with seed factories.

### 9. Generate Migration

```bash
pnpm --filter @afenda/db db:generate
pnpm --filter @afenda/db db:migrate
```

---

## Design Decisions

### Why Domain-Organized Schemas?

Previous flat structure (`schema-platform/`, `schema-meta/`, `schema-domain/`) mixed organizational concerns:

- `schema-platform` bundled 3 unrelated PostgreSQL namespaces (core, security, reference)
- `schema-domain` was a single-domain wrapper over `sales/`
- Adding a second domain (e.g., accounting) would require creating `schema-domain/accounting/` — confusing sibling of the wrapper

New structure: each PostgreSQL namespace has its own top-level directory under `schema/`. Clear, consistent, scales to 10+ domains.

### Why Configurable Client Factory?

Previously, `apps/api` created its own Drizzle instance with custom Pino logging, duplicating pool configuration from `packages/db`. The factory pattern:

- **Eliminates duplication** — one pool config source of truth
- **Enables pluggable logging** — apps/api passes PinoDrizzleLogger, others use console default
- **Supports testing** — test harnesses can override connection strings

### Why Column Mixins (not Full Base Tables)?

Column mixins (`timestampColumns`, `auditColumns`) compose via spread operators. This is more flexible than inheritance because:

- Not all tables need all columns (e.g., append-only logs skip `updatedAt`)
- Drizzle ORM doesn't support table inheritance
- Spread composition is explicit and type-safe

### Why RLS Over Application-Level Filtering?

Row-Level Security is enforced by PostgreSQL, not the application:

- **Defense in depth** — a bug in API code cannot leak cross-tenant data
- **Universal** — applies to Drizzle queries, raw SQL, Drizzle Studio, psql
- **Zero application overhead** — PostgreSQL handles the filtering

---

## Phase Status

### Completed

- [x] Multi-namespace schema organization (core, security, sales, reference, meta)
- [x] Production-hardened pool with dual-mode connections (pool + serverless)
- [x] Comprehensive Drizzle Relations v2 (19+ entity graphs)
- [x] Row-Level Security with tenant isolation
- [x] Truth compiler pipeline (invariants, state machines, mutation policies)
- [x] Graph validation system (279+ FK relationships, health scoring)
- [x] Multi-scenario seed system (baseline, demo, stress, 1M)
- [x] Partitioning strategy (sales orders, postings, event logs)
- [x] Data archival with Cloudflare R2 integration

### Completed (Wave 4 — March 2026)

- [x] Directory restructure (schema consolidation, client extraction)
- [x] Client factory pattern (`createDatabase()`)
- [x] apps/api db layer consolidation
- [x] Multi-domain stubs (accounting, HR, inventory, purchasing)

---

## Domain Upgrade Plan — Become the Truth Engine

This plan upgrades each domain from "schema-ready" to "truth-engine-ready" by enforcing business truth at both runtime and database layers.

### Target Operating Model

Each domain must provide:

- **Canonical truth contracts** (entities, events, invariants, cross-invariants, state machines, mutation policies)
- **Deterministic compiler artifact** (`truth:generate` output)
- **Runtime parity enforcement** (command-gateway policy checks)
- **Operational evidence** (drift gates, policy consistency gates, violation telemetry)

### Domain Onboarding Sequence

Apply this sequence per domain (`accounting`, `hr`, `inventory`, `purchasing`) before enabling production writes.

1. **Define bounded context contracts**

- Create domain entity definitions, invariant registries, transitions, and event types in `src/truth-compiler/truth-config.ts`.
- Ensure every mutation policy includes explicit `appliesTo`, `requiredEvents`, and rollout mode.

2. **Compile and verify deterministic truth artifact**

- Run `pnpm --filter @afenda/db truth:generate`.
- Run `pnpm --filter @afenda/db truth:check`.
- Review generated SQL diff with the same rigor as application code.

3. **Align runtime and DB enforcement**

- Integrate runtime policy checks in command handlers (`resolveMutationPolicy`, `isDirectMutationAllowed`).
- Ensure event-only paths have no direct-write bypass in application flows.

4. **Run schema-truth drift validation**

- Run `pnpm --filter @afenda/db truth:schema:compare`.
- Resolve all missing/extra mappings before rollout.

5. **Activate governance and observability**

- Enforce merge gates: `truth:check` + policy contract consistency checks.
- Track violation metrics and incident response paths for policy/invariant failures.

### Promotion Policy (Per Domain)

Use a strict staged promotion model:

1. `direct` — temporary legacy compatibility only
2. `dual-write` — mandatory instrumentation and parity verification
3. `event-only` — direct writes blocked at runtime and DB guard layers

Promotion criteria:

- No unresolved drift in `truth:schema:compare`
- Passing `truth:check` in CI
- Passing policy contract consistency gate
- Proven replay/projection parity for all promoted aggregates

### Priority Roadmap

#### P0 — Truth Completeness (must-have)

- Compile aggregate/global invariants into executable trigger/deferred-check enforcement (no advisory-only critical controls).
- Add dual-write violation telemetry with actionable ops visibility.
- Enforce runtime/DB parity checks during policy transitions.

#### P1 — Multi-Domain Scale

- Parameterize compiler inputs by domain (reduce sales-centric coupling).
- Add strict event contract synchronization (no manual drift).
- Improve cross-invariant authoring ergonomics for multi-model joins.

#### P2 — Enterprise Resilience

- Support multi-state-field workflows for complex lifecycles.
- Add compiler quality telemetry (segment counts, skipped rules, policy coverage).
- Define SLOs and alerting for truth enforcement failures.

### Domain Readiness Checklist

A domain is "truth-engine ready" only when all checks pass:

- [ ] Domain contract set defined in truth-config (entities, events, invariants, policies, transitions)
- [ ] Generated SQL committed and `truth:check` passes
- [ ] Runtime command gateway enforces mutation policy semantics
- [ ] `truth:schema:compare` shows no unresolved drift
- [ ] CI policy consistency checks pass
- [ ] Violation telemetry visible to operations
- [ ] Rollback and replay strategy documented

---

## See Also

- [README.md](./README.md) — Usage guide and quick reference
- [graph-validation/README.md](./src/graph-validation/README.md) — FK integrity validation details
- [archival/README.md](./src/archival/README.md) — Data archival documentation
- [@afenda/meta-types ARCHITECTURE.md](../meta-types/ARCHITECTURE.md) — Type contract layer
- [@afenda/truth-test ARCHITECTURE.md](../truth-test/ARCHITECTURE.md) — Truth testing infrastructure
- [docs/archive/restructure-wave4-2026-03.md](./docs/archive/restructure-wave4-2026-03.md) — Historical Wave 4 restructure plan (completed March 2026)
