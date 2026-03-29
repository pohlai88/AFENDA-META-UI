# Truth Test Harness — Architecture

> **Status:** Phase 2.2 Complete — Full E2E Infrastructure + Metrics Established
> **Package:** `@afenda/truth-test`
> **Tests:** 173 pure-logic (no DB) + 39 DB integration = **212 total**
> **Coverage:** 31.47% (pure logic only) | Target: 80%+ (see [METRICS.md](./METRICS.md))
> **Build:** TypeScript clean

---

## The Design Shift

| Old approach                               | New approach |
| ------------------------------------------ | ------------ |
| "Does API return 200?"                     | insufficient |
| "Did DB row get created?"                  | insufficient |
| **"Does truth hold under all mutations?"** | target       |

---

## Package Structure

```
packages/truth-test/
├── src/
│   ├── harness/
│   │   ├── create-harness.ts   # createTruthHarness() factory
│   │   ├── test-context.ts     # createTestContext() — wires DB, emit, clock
│   │   ├── table-names.ts      # entityToSchemaKey(), entityToTableName()
│   │   └── test-db.ts          # createTestDB() — Drizzle + Neon real DB
│   ├── execute/
│   │   ├── execute-mutation.ts # Dual-path mutation executor
│   │   ├── execute-query.ts    # Projection / entity queries
│   │   └── replay-events.ts    # Event sourcing replay
│   ├── assert/
│   │   ├── assert-invariant.ts # assertInvariant, assertEntityInvariant, assertAllEntityInvariants
│   │   ├── assert-event.ts     # assertEvent, assertEventSequence, assertNoEvent, assertEventCount
│   │   ├── assert-state.ts     # assertState, assertExists, assertNotExists, assertRowCount
│   │   └── assert-projection.ts # assertProjection, assertProjectionReplay
│   ├── seed/
│   │   ├── seed-entity.ts      # seedEntity, seedEntityBatch, seedEntityViaEngine
│   │   └── seed-scenario.ts    # seedScenario, registerScenario, defineScenario, listScenarios
│   ├── auto/
│   │   ├── evaluate-condition.ts           # evaluateCondition(expr, record)
│   │   ├── generate-state-machine-tests.ts # generateStateMachineTests(machines)
│   │   ├── generate-invariant-tests.ts     # generateInvariantTests(registries)
│   │   ├── generate-policy-tests.ts        # generatePolicyTests(policies)
│   │   └── index.ts                        # ./auto subpath barrel
│   ├── types/
│   │   ├── test-harness.ts     # All core interfaces
│   │   └── scenario.ts         # Scenario DSL types
│   ├── __test__/
│   │   ├── evaluate-condition.test.ts  # 17 unit tests — runtime evaluator
│   │   ├── auto-generated.test.ts      # ~156 auto-generated tests
│   │   └── integration.test.ts         # 5 DB integration tests (skipIf no DATABASE_URL)
│   └── index.ts                # Public API barrel (40+ exports)
├── vitest.config.ts            # include: src/**/__test__/**/*.{test,spec}.*
├── vitest.setup.ts             # global __TRUTH__ harness (try/catch DB guard)
├── package.json                # exports: "." and "./auto" subpaths
└── tsconfig.json
```

**Key naming convention:** entity names are camelCase business aliases. `entityToSchemaKey()` resolves them to Drizzle schema table keys:

- `"customer"` → `"partners"` (business alias)
- `"vendor"` → `"partners"` (business alias)
- `"salesOrder"` → `"salesOrders"` (pluralize)

---

## Core Architecture

### 1. Harness Factory

```typescript
import { createTruthHarness } from "@afenda/truth-test";

const harness = createTruthHarness({
  tenantId: "42",
  userId: 1,
  clock: () => new Date("2026-01-01T00:00:00Z"),
});
```

`createTruthHarness(options?: TruthHarnessOptions): TruthHarness`

**Options** (all optional):

| Field           | Default            | Purpose                                                  |
| --------------- | ------------------ | -------------------------------------------------------- |
| `tenantId`      | `"test-tenant"`    | Injected into every mutation as `enrichedInput.tenantId` |
| `userId`        | `1`                | Injected as `createdBy` / `updatedBy`                    |
| `clock`         | `() => new Date()` | Deterministic event timestamps                           |
| `db`            | `createTestDB()`   | Override with custom TestDB                              |
| `correlationId` | —                  | Distributed tracing passthrough                          |

**`TruthHarness` API:**

| Member              | Type                           | Purpose                                               |
| ------------------- | ------------------------------ | ----------------------------------------------------- |
| `db`                | `TestDB`                       | Direct Drizzle-backed DB access                       |
| `context`           | `TruthContext`                 | Full execution context (tenant, user, clock, gateway) |
| `events`            | `DomainEvent[]`                | All events emitted so far                             |
| `execute(mutation)` | `Promise<TruthMutationResult>` | Run mutation through truth engine                     |
| `query(query)`      | `Promise<TruthQueryResult>`    | Query entity / projection                             |
| `replay()`          | `Promise<void>`                | Replay all events to rebuild projections              |
| `reset()`           | `Promise<void>`                | Clear events + truncate all DB tables                 |

---

### 2. Execution Layer — Dual-Path Dispatch

`executeMutation()` dispatches via two paths based on whether `context.mutationGateway` is provided.

#### PATH 1 — Full Truth Engine (when `context.mutationGateway` is set)

```
harness.execute(mutation)
  → context.mutationGateway({ model, operation, mutate, policies, ... })
      → mutation-command-gateway (apps/api)
          → policy enforcement
          → invariant checking
          → DB write via mutate()
          → DomainEvent produced by gateway
  → event pushed to harness.events
  → TruthMutationResult { id, events: [event], data, executionTime, invariantsChecked }
```

Wire by setting `context.mutationGateway` in `createTruthHarness`. See INTEGRATION.md.

#### PATH 2 — TestDB Direct (default)

```
harness.execute(mutation)
  → enrichedInput = { ...input, tenantId, createdBy, updatedBy }
  → context.db.insert / update / delete  (Drizzle + PostgreSQL)
  → DomainEvent built locally: { eventType: "CustomerCreated", aggregateType, aggregateId, ... }
  → event pushed to harness.events
  → TruthMutationResult { id, events: [event], data, executionTime }
```

PATH 2 is the default for all current tests. It exercises the real PostgreSQL database via Drizzle.

**Event isolation:** `seedEntityViaEngine()` passes a throwaway local array to `executeMutation()` as the `events` parameter, so seed events never appear in `harness.events`. This works because `execute-mutation.ts` PATH 2 only calls `events.push(event)` — it does not call `context.emit()`.

---

### 3. TestDB — Drizzle + Neon Backed

`createTestDB(): TestDB` provides type-safe CRUD backed by the Drizzle instance from `@afenda/db`.

**Entity name resolution** — all methods accept camelCase entity names, resolved via `entityToSchemaKey()`:

| Entity arg     | Resolves to          |
| -------------- | -------------------- |
| `"customer"`   | `schema.partners`    |
| `"vendor"`     | `schema.partners`    |
| `"salesOrder"` | `schema.salesOrders` |
| `"product"`    | `schema.products`    |

If the resolved key is not found in schema, an explicit error is thrown with the available table list.

**`TestDB` interface:**

```typescript
findOne<T>(table: string, where: Partial<T>): Promise<T | null>
find<T>(table: string, where?: Partial<T>): Promise<T[]>
insert<T>(table: string, data: Partial<T>): Promise<T>
update<T>(table: string, where: Partial<T>, data: Partial<T>): Promise<number>
delete<T>(table: string, where: Partial<T>): Promise<number>
sql<T>(query: string, params?: unknown[]): Promise<T[]>
reset(): Promise<void>
getEvents(): DomainEvent[]   // always [] — events live in harness.events
```

**`reset()` implementation:**

Uses `getTableConfig(tableObj)` from `drizzle-orm/pg-core` to build schema-qualified truncations:

```sql
TRUNCATE TABLE "sales"."partners" CASCADE
TRUNCATE TABLE "core"."tenants" CASCADE
TRUNCATE TABLE "security"."users" CASCADE
-- etc.
```

Unqualified names (`TRUNCATE TABLE "partners"`) silently fail for tables in non-public schemas. The `try { getTableConfig(obj) } catch { return false }` pattern filters enums, zod schemas, and non-table exports from the schema barrel.

**Safety guard:** `reset()` throws if `NODE_ENV !== "test"` and `VITEST` is not set.

---

### 4. Assertion Layer

#### Invariant Assertions

```typescript
// Callback-based — any logic, any async
assertInvariant("commission <= limit", () => {
  if (value > limit) throw new Error(`${value} exceeds ${limit}`);
});

// Entity-specific: loads entity from DB, evaluates SALES_INVARIANT_REGISTRIES
await assertEntityInvariant("sales_order", entityId, harness.context);

// All registered invariants for entity
await assertAllEntityInvariants("sales_order", entityId, harness.context);
```

`assertEntityInvariant` uses `evaluateCondition()` — the runtime JS mirror of SQL CHECK constraints — to evaluate each `ConditionExpression` from `SALES_INVARIANT_REGISTRIES`. Pass silently if no registry found for the model.

#### Event Assertions

```typescript
assertEvent(harness.events, "CustomerCreated");
assertEvent(harness.events, "CommissionCalculated", (e) => e.payload.total > 0);
assertEventSequence(harness.events, ["CustomerCreated", "SalesOrderCreated"]);
assertNoEvent(harness.events, "InvariantViolated");
assertEventCount(harness.events, "LineItemAdded", 3);
```

#### State Assertions

```typescript
await assertState({
  db: harness.db,
  table: "salesOrder",
  where: { id },
  expect: { status: "approved" },
});
await assertExists(harness.db, "salesOrder", { id });
await assertNotExists(harness.db, "deletedOrder", { id });
await assertRowCount(harness.db, "salesOrderLine", { orderId: id }, 3);
```

#### Projection Assertions

```typescript
await assertProjection({
  db: harness.db,
  projection: "salesOrderSummary",
  entityId: id,
  expect: { lineCount: 3 },
});
await assertProjectionReplay({
  db: harness.db,
  projection: "commissionSummary",
  events: harness.events,
  expect: { total: 450 },
});
```

---

### 5. Seeding Layer

```typescript
// Direct DB insert — bypasses truth engine (fast, no invariant checks)
const customerId = await seedEntity("customer", { name: "Acme Corp" }, harness.context);

// Batch direct insert
const ids = await seedEntityBatch(
  "product",
  [
    { name: "Widget", price: 100 },
    { name: "Gadget", price: 200 },
  ],
  harness.context
);

// Via truth engine — enforces invariants, realistic pre-conditions
const orderId = await seedEntityViaEngine(
  { entity: "salesOrder", operation: "create", input: { customerId, total: 1000 } },
  harness.context
);
```

`seedEntity` / `seedEntityViaEngine` auto-enrich with `tenantId`, `createdBy`, `updatedBy` from context.

Scenario DSL (for multi-step pre-conditions):

```typescript
const scenario = defineScenario("multi-tier-test", "Multi-tier commission test")
  .mutate({ entity: "customer", operation: "create", input: { name: "Acme Corp" } })
  .mutate({
    entity: "salesOrder",
    operation: "create",
    input: { customerId: "{{customer}}", total: 10000 },
  })
  .assert("commission calculated", async () => {
    /* check */
  })
  .build();

registerScenario(scenario);

// In test:
const result = await seedScenario(harness, "multi-tier-test");
const customerId = result.entities.customer;
await result.cleanup();
```

---

### 6. Auto-Test Generator Layer

Produces Vitest tests from runtime truth-config data. **No DB required — pure condition evaluation.** Tests appear automatically when truth-config changes.

#### `evaluateCondition(expr, record)`

Runtime JS mirror of the SQL CHECK constraint generator in `invariant-compiler.ts`. Accepts the same `ConditionExpression` tree.

```typescript
import { evaluateCondition } from "@afenda/truth-test";

evaluateCondition(
  {
    logic: "and",
    conditions: [
      { field: "total", operator: "gte", value: 0 },
      { field: "status", operator: "in", value: ["draft", "approved"] },
    ],
  },
  { total: 500, status: "approved" }
); // → true
```

Supported operators: `eq`, `neq`, `gt`, `gte`, `lt`, `lte`, `in`, `not_in`, `contains`, `not_contains`, `is_empty`, `is_not_empty`.

#### `generateStateMachineTests(machines)`

Registers exhaustive Vitest `describe`/`test` blocks for each `StateMachineDefinition`. Call once inside a test file.

```typescript
import { generateStateMachineTests } from "@afenda/truth-test/auto";
import { SALES_STATE_MACHINES } from "@afenda/db/truth-compiler";

generateStateMachineTests(SALES_STATE_MACHINES);
```

Tests generated per machine:

- Initial state is declared in states list
- All terminal states are declared
- Every declared transition `(from, event) → to` is valid
- Every non-declared `(state, event)` pair is rejected
- Terminal states have no outbound transitions
- All non-terminal states are BFS-reachable from initial state
- Duplicate transitions detected

#### `generateInvariantTests(registries)`

For each invariant in each registry:

1. Synthesizes a record that satisfies the condition → asserts `evaluateCondition` returns `true`
2. Synthesizes a record that violates the condition → asserts `evaluateCondition` returns `false`

Handles `AND` / `OR` branch logic by synthesizing minimal per-leaf records.

```typescript
import { generateInvariantTests } from "@afenda/truth-test/auto";
import { SALES_INVARIANT_REGISTRIES } from "@afenda/db/truth-compiler";

generateInvariantTests(SALES_INVARIANT_REGISTRIES);
```

#### `generatePolicyTests(policies)`

```typescript
import { generatePolicyTests } from "@afenda/truth-test/auto";
import { SALES_MUTATION_POLICIES } from "@afenda/db/truth-compiler";

generatePolicyTests(SALES_MUTATION_POLICIES);
```

Tests generated per policy:

- Has required metadata (id, appliesTo, valid mutationPolicy value)
- `requiredEvents` declared (when present)
- Primary resolution: `resolveMutationPolicy({model, policies})` returns this policy
- Secondary policies detected (shadowed by earlier Array.find match)
- `event-only` policies block the correct operations
- `dual-write` policies allow direct mutations

---

## Vitest Configuration

### vitest.config.ts

- `include: ["src/**/__test__/**/*.{test,spec}.{ts,js}"]` — scoped to `src/` to prevent duplicate runs from `dist/`
- `TEST_DATABASE_URL` → `DATABASE_URL` copy in config module-eval (before any imports), because `@afenda/db` reads `DATABASE_URL` at import time
- `globals: true` — `describe`, `it`, `expect` available without import in test files

### vitest.setup.ts

Creates `global.__TRUTH__` before each test. Try/catch lets pure-logic tests run without a database:

```typescript
beforeEach(() => {
  try {
    global.__TRUTH__ = createTruthHarness({
      tenantId: "1",
      userId: 1,
      clock: () => new Date("2026-03-28T00:00:00Z"),
    });
  } catch {
    global.__TRUTH__ = null; // auto-generators + evaluateCondition don't need harness
  }
});
```

No `afterEach(reset())`. Resetting truncates 100+ tables (~6 seconds). Tests use unique data. Call `harness.reset()` manually for explicit cleanup.

### DB Integration Test Pattern

```typescript
import { describe, it, expect, beforeAll, beforeEach } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "@afenda/db";
import { tenants } from "@afenda/db/schema";
import { createTruthHarness } from "../harness/create-harness.js";

const skipTests = !process.env.DATABASE_URL;
let activeTenantId = 1;

describe.skipIf(skipTests)("My Integration Suite", () => {
  beforeAll(async () => {
    // Idempotent tenant bootstrap
    const existing = await db
      .select({ tenantId: tenants.tenantId })
      .from(tenants)
      .where(eq(tenants.tenantCode, "AFENDA_DEMO"))
      .limit(1);
    if (existing.length > 0) {
      activeTenantId = existing[0]!.tenantId;
    } else {
      const [row] = await db
        .insert(tenants)
        .values({ tenantCode: "AFENDA_DEMO", name: "AFENDA Demo", status: "ACTIVE" })
        .returning({ tenantId: tenants.tenantId });
      activeTenantId = row!.tenantId;
    }
    // Clean stale data from failed runs, then re-insert tenant
    const tmp = createTruthHarness({
      tenantId: activeTenantId.toString(),
      userId: 1,
      clock: () => new Date(),
    });
    await tmp.reset();
    await db
      .insert(tenants)
      .values({ tenantCode: "AFENDA_DEMO", name: "AFENDA Demo", status: "ACTIVE" })
      .onConflictDoNothing();
  }, 60_000);

  let harness: TruthHarness;
  beforeEach(() => {
    harness = createTruthHarness({
      tenantId: activeTenantId.toString(),
      userId: 1,
      clock: () => new Date("2024-01-01T00:00:00Z"),
    });
  });
});
```

---

## Phase Status

### Phase 1 — Harness Infrastructure (complete)

- [x] `TruthHarness`, `TruthContext`, `TestDB` type system
- [x] `createTruthHarness()` factory with all options
- [x] Execution layer (`executeMutation`, `executeQuery`, `replayEvents`)
- [x] Assertion layer (invariants, events, state, projections)
- [x] Seeding layer (`seedEntity`, `seedEntityBatch`, `seedEntityViaEngine`)
- [x] Scenario DSL (`defineScenario`, `registerScenario`, `listScenarios`)
- [x] TypeScript clean

### Phase 2.0 — TestDB (complete)

- [x] `createTestDB()` backed by `@afenda/db` Drizzle instance
- [x] `entityToSchemaKey()` resolution (camelCase aliases → Drizzle table keys)
- [x] `reset()` with `getTableConfig()` for schema-qualified TRUNCATE
- [x] Full CRUD: findOne, find, insert, update, delete, sql

### Phase 2.1 — Mutation Gateway Integration (complete)

- [x] `MutationGateway` type + `MutationGatewayInput/Result` interfaces
- [x] PATH 1 dispatch when `context.mutationGateway` provided
- [x] PATH 2 fallback (TestDB direct) when no gateway
- [x] Event isolation: `context.emit()` removed from PATH 2

### Phase 2.2 — Seeding (complete)

- [x] `seedEntity` with `tenantId`/`createdBy`/`updatedBy` auto-enrichment
- [x] `seedEntityBatch` (parallel direct inserts)
- [x] `seedEntityViaEngine` with isolated events
- [x] `seedScenario` + scenario registry

### Auto-Test Generators (complete)

- [x] `evaluateCondition(expr, record)` — 11 operators, 17 unit tests
- [x] `generateStateMachineTests(machines)` — BFS reachability + exhaustive transitions
- [x] `generateInvariantTests(registries)` — valid/invalid record synthesis per invariant
- [x] `generatePolicyTests(policies)` — primary/secondary resolution + operation enforcement
- [x] `./auto` subpath export
- [x] 173 pure-logic tests, 0 DB required

### Phase 3 — Test Conversion (complete)

- [x] Convert `ops.route.test.ts` → `truth-engine.invariants.test.ts`
- [x] Convert `tenant-aware-resolution.test.ts` → `truth-engine.tenant-isolation.test.ts`
- [x] Convert `sales-order-engine.test.ts` → `truth-engine.sales-mutations.test.ts`

### Phase 4 — CI Enforcement (complete)

- [x] Truth coverage metrics (% invariants exercised, % mutations via engine)
- [x] CI gate: truth-coverage tool with configurable thresholds
- [x] CI gate: detection of direct DB writes bypassing truth engine

---

## Truth-Grade Metrics

| Metric                   | Current                | Target           |
| ------------------------ | ---------------------- | ---------------- |
| Total tests              | 178                    | 200+             |
| Pure-logic tests (no DB) | 173                    | —                |
| DB integration tests     | 5                      | 25+              |
| Build                    | clean                  | clean            |
| Invariant coverage       | 0% of real mutations   | 80%+             |
| Mutation path            | PATH 2 (TestDB direct) | PATH 1 (gateway) |

---

## Key Design Decisions

**No afterEach reset() by default.** `reset()` truncates all 100+ tables and takes ~6 seconds. Tests use unique email/data per run. Manual `beforeAll` cleanup handles stale data from failed runs via `onConflictDoNothing()`.

**TestDB backed by real PostgreSQL.** `@afenda/db` uses Neon PostgreSQL with pg-specific schemas (`core`, `sales`, `security`). Real DB catches FK violations, schema drift, and constraint issues immediately. SQLite would need a separate schema shim.

**`getTableConfig()` for schema-qualified TRUNCATE.** Drizzle table objects carry `{ schema, name }` metadata. `TRUNCATE TABLE "partners"` silently fails on `sales.partners`. The `try { getTableConfig(obj) } catch { return false }` pattern filters enums and non-table schema exports.

**`context.emit()` removed from PATH 2.** Both PATH 1 and PATH 2 previously called both `context.emit(event)` AND `events.push(event)`. Since `context.emit` in `createTruthHarness` is `(e) => events.push(e)`, each event was pushed twice. Removing `context.emit()` from PATH 2 also enables correct event isolation for `seedEntityViaEngine`.

**Auto-generators are zero-maintenance.** When truth-config changes (new state machine, invariant, or policy), the generators automatically produce new tests on the next `vitest run`. No manual test authoring required for structural correctness.
