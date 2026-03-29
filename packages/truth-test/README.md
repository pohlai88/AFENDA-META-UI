# @afenda/truth-test

Deterministic truth engine testing infrastructure for invariant validation, mutation execution, event assertion, and auto-generated structural tests.

**178 tests passing** — 173 pure-logic (no DB) + 5 DB integration.

---

## Quick Start

### Mode A — Pure Logic (no database required)

```bash
pnpm --filter @afenda/truth-test test
```

Runs 3 test files:
- `evaluate-condition.test.ts` — 17 unit tests for runtime condition evaluator
- `auto-generated.test.ts` — ~156 tests generated from truth-config state machines, invariants, and policies
- `integration.test.ts` — skipped automatically (no `DATABASE_URL`)

### Mode B — DB Integration

```bash
# Set test database URL (Neon branch or local PostgreSQL)
$env:TEST_DATABASE_URL = "postgresql://..."

pnpm --filter @afenda/truth-test test
```

All 178 tests run including the 5 DB integration tests.

For Neon branch setup: see `tools/scripts/neon-branch-create.mjs`.

---

## Installation (within monorepo)

```json
// package.json
{
  "dependencies": {
    "@afenda/truth-test": "workspace:*"
  }
}
```

Subpath exports:
- `@afenda/truth-test` — full public API
- `@afenda/truth-test/auto` — auto-generator functions only (tree-shakeable)

---

## Core API

### `createTruthHarness(options?)`

Creates an isolated truth execution environment. Each harness has its own event log and DB state.

```typescript
import { createTruthHarness } from "@afenda/truth-test";

const harness = createTruthHarness({
  tenantId: "42",                              // multi-tenant isolation
  userId: 1,                                   // RBAC / audit columns
  clock: () => new Date("2026-01-01T00:00:00Z"), // deterministic timestamps
});
```

```typescript
interface TruthHarnessOptions {
  tenantId?: string;    // default: "test-tenant"
  userId?: number;      // default: 1
  clock?: () => Date;   // default: () => new Date()
  db?: TestDB;          // default: createTestDB() (Drizzle + Neon)
  correlationId?: string;
}
```

**`TruthHarness` members:**

```typescript
harness.db        // TestDB — direct Drizzle-backed DB access
harness.context   // TruthContext — tenant, user, clock, gateway
harness.events    // DomainEvent[] — events emitted so far

await harness.execute(mutation)  // → TruthMutationResult
await harness.query(query)       // → TruthQueryResult
await harness.replay()           // rebuild projections from events
await harness.reset()            // clear events + truncate all DB tables
```

---

### `harness.execute(mutation)`

Execute a mutation through the truth engine. Returns the created/mutated record ID, emitted events, and execution metadata.

```typescript
const result = await harness.execute({
  entity: "customer",         // camelCase entity name
  operation: "create",        // "create" | "update" | "delete"
  input: {
    name: "Acme Corp",
    email: "acme@example.com",
    isActive: true,
  },
});

result.id              // string — UUID or string ID
result.events          // DomainEvent[] — events from this mutation
result.data            // T — inserted/updated record
result.executionTime   // number — ms
result.invariantsChecked  // string[] — IDs of checked invariants (PATH 1 only)
```

`tenantId`, `createdBy`, and `updatedBy` are auto-injected from `harness.context` if not in input.

**Entity name resolution:** Entity names are mapped to Drizzle schema table keys via `entityToSchemaKey()`:
- `"customer"` → `schema.partners` (business alias — `partners.id` is UUID)
- `"salesOrder"` → `schema.salesOrders`

---

### `harness.query(query)`

Query an entity or projection.

```typescript
const result = await harness.query({
  entity: "customer",
  filters: { isActive: true },     // Drizzle WHERE conditions
});

result.data   // T[] — matching records
result.count  // number
result.executionTime  // number — ms
```

---

### Assertion Layer

#### Invariant Assertions

```typescript
import { assertInvariant, assertEntityInvariant, assertAllEntityInvariants } from "@afenda/truth-test";

// Callback-based — any logic, sync or async
assertInvariant("commission <= sales total", () => {
  if (commission.total > order.total) throw new Error("Invariant violated");
});

// Entity-specific: loads entity from DB, checks against SALES_INVARIANT_REGISTRIES
await assertEntityInvariant("sales_order", result.id, harness.context);

// All registered invariants for entity
await assertAllEntityInvariants("sales_order", result.id, harness.context);
```

#### Event Assertions

```typescript
import { assertEvent, assertEventSequence, assertNoEvent, assertEventCount } from "@afenda/truth-test";

assertEvent(harness.events, "CustomerCreated");
assertEvent(harness.events, "CommissionCalculated", (e) => e.payload.total > 0);
assertEventSequence(harness.events, ["CustomerCreated", "SalesOrderCreated"]);
assertNoEvent(harness.events, "InvariantViolated");
assertEventCount(harness.events, "LineItemAdded", 3);
```

#### State Assertions

```typescript
import { assertState, assertExists, assertNotExists, assertRowCount } from "@afenda/truth-test";

await assertState({ db: harness.db, table: "salesOrder", where: { id }, expect: { status: "approved" } });
await assertExists(harness.db, "salesOrder", { id });
await assertNotExists(harness.db, "deletedOrder", { id });
await assertRowCount(harness.db, "salesOrderLine", { orderId: id }, 3);
```

#### Projection Assertions

```typescript
import { assertProjection, assertProjectionReplay } from "@afenda/truth-test";

await assertProjection({ db: harness.db, projection: "salesOrderSummary", entityId: id, expect: { lineCount: 3 } });
await assertProjectionReplay({ db: harness.db, projection: "commissionSummary", events: harness.events, expect: { total: 450 } });
```

---

### Seeding Layer

```typescript
import { seedEntity, seedEntityBatch, seedEntityViaEngine } from "@afenda/truth-test";

// Direct DB insert — bypasses truth engine (fast test setup)
const customerId = await seedEntity("customer", { name: "Acme Corp" }, harness.context);

// Batch direct insert
const ids = await seedEntityBatch("product", [
  { name: "Widget", price: 100 },
  { name: "Gadget", price: 200 },
], harness.context);

// Via truth engine — enforces invariants (for realistic pre-conditions)
const orderId = await seedEntityViaEngine(
  { entity: "salesOrder", operation: "create", input: { customerId, total: 1000 } },
  harness.context
);
```

Seed events are **isolated** — they never appear in `harness.events`.

Scenario DSL for multi-step pre-conditions:

```typescript
import { defineScenario, registerScenario, seedScenario } from "@afenda/truth-test";

const scenario = defineScenario("multi-tier-test", "Multi-tier commission test")
  .mutate({ entity: "customer", operation: "create", input: { name: "Acme Corp" } })
  .mutate({ entity: "salesOrder", operation: "create", input: { customerId: "{{customer}}", total: 10000 } })
  .build();

registerScenario(scenario);

// In test:
const result = await seedScenario(harness, "multi-tier-test");
await result.cleanup();
```

---

### Auto-Test Generators

Generates Vitest `describe`/`test` blocks from truth-config data. No DB required.

#### `evaluateCondition(expr, record)`

Runtime JS evaluator for `ConditionExpression` trees (same logic as the SQL CHECK constraint compiler).

```typescript
import { evaluateCondition } from "@afenda/truth-test";
// or: import { evaluateCondition } from "@afenda/truth-test/auto";

evaluateCondition(
  { field: "total", operator: "gte", value: 0 },
  { total: 100 }
);  // → true
```

#### `generateStateMachineTests(machines)`

```typescript
import { generateStateMachineTests } from "@afenda/truth-test/auto";
import { SALES_STATE_MACHINES } from "@afenda/db/truth-compiler";

// Call inside a .test.ts file — registers describe/test blocks
generateStateMachineTests(SALES_STATE_MACHINES);
```

Generates: initial state, terminal states, valid transitions, invalid `(state, event)` pairs, reachability from initial, duplicate detection.

#### `generateInvariantTests(registries)`

```typescript
import { generateInvariantTests } from "@afenda/truth-test/auto";
import { SALES_INVARIANT_REGISTRIES } from "@afenda/db/truth-compiler";

generateInvariantTests(SALES_INVARIANT_REGISTRIES);
```

For each invariant: synthesizes a satisfying record and a violating record, asserts `evaluateCondition` agrees.

#### `generatePolicyTests(policies)`

```typescript
import { generatePolicyTests } from "@afenda/truth-test/auto";
import { SALES_MUTATION_POLICIES } from "@afenda/db/truth-compiler";

generatePolicyTests(SALES_MUTATION_POLICIES);
```

Generates: metadata validation, primary/secondary resolution, `event-only` vs `dual-write` enforcement per operation.

---

## Integration Test Pattern

```typescript
import { describe, it, expect, beforeAll, beforeEach } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "@afenda/db";
import { tenants } from "@afenda/db/schema";
import { createTruthHarness } from "@afenda/truth-test";
import type { TruthHarness } from "@afenda/truth-test";

const skipTests = !process.env.DATABASE_URL;
let activeTenantId = 1;

describe.skipIf(skipTests)("My integration tests", () => {
  beforeAll(async () => {
    // Idempotent tenant bootstrap
    const existing = await db.select({ tenantId: tenants.tenantId })
      .from(tenants).where(eq(tenants.tenantCode, "AFENDA_DEMO")).limit(1);

    if (existing.length > 0) {
      activeTenantId = existing[0]!.tenantId;
    } else {
      const [row] = await db.insert(tenants)
        .values({ tenantCode: "AFENDA_DEMO", name: "AFENDA Demo", status: "ACTIVE" })
        .returning({ tenantId: tenants.tenantId });
      activeTenantId = row!.tenantId;
    }

    // Clean stale data from failed runs, then re-insert tenant
    const tmp = createTruthHarness({ tenantId: activeTenantId.toString(), userId: 1 });
    await tmp.reset();
    await db.insert(tenants)
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

  it("should create customer and emit event", async () => {
    const result = await harness.execute({
      entity: "customer",
      operation: "create",
      input: { name: "Test Corp", email: "test@example.com", isActive: true },
    });

    expect(typeof result.id).toBe("string");
    expect(harness.events).toHaveLength(1);
    expect(harness.events[0]?.eventType).toBe("CustomerCreated");
  });
});
```

---

## Global Harness (vitest.setup.ts)

A global `__TRUTH__` harness is available in all tests via `global.__TRUTH__`. It is `null` when no database is configured (pure-logic tests run fine regardless).

```typescript
// In any test:
const harness = global.__TRUTH__;
if (!harness) return; // pure-logic test, skip DB operations

await harness.execute({ entity: "customer", operation: "create", input: {...} });
```

---

## Roadmap

- [x] Phase 1 — Harness infrastructure (types, factory, execution, assertions, seeding)
- [x] Phase 2.0 — TestDB (Drizzle real DB, schema-qualified reset)
- [x] Phase 2.1 — Mutation gateway integration (PATH 1 full truth engine)
- [x] Phase 2.2 — Seeding layer (seedEntity, seedEntityBatch, seedEntityViaEngine, scenarios)
- [x] Auto-generators — evaluateCondition, generateStateMachineTests, generateInvariantTests, generatePolicyTests
- [ ] Phase 3 — Test conversion (convert route tests to truth tests)
- [ ] Phase 4 — CI enforcement (truth coverage gate, direct-write gate)

---

## See Also

- [ARCHITECTURE.md](./ARCHITECTURE.md) — detailed design, dual-path execution, reset() internals, design decisions
- [INTEGRATION.md](./INTEGRATION.md) — mutation-command-gateway wiring for PATH 1
- [DATABASE-SETUP.md](./DATABASE-SETUP.md) — Neon branch setup for integration tests
