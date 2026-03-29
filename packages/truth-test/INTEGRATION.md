# Truth Engine Integration Guide

This guide shows how to wire the **mutation-command-gateway** and **projection handlers** for full truth engine integration in tests.

## Architecture Overview

The truth-test harness supports two modes:

### Mode 1: TestDB Direct Access (Phase 2 - Current Default)
- Mutations execute via TestDB direct operations
- Events constructed manually and emitted
- No policy enforcement
- No invariant checking
- Fast, simple testing

### Mode 2: Full Truth Engine (Phase 2.1 - Optional)
- Mutations execute via `executeMutationCommand()` from `apps/api`
- Policy enforcement with `MUTATION_POLICIES`
- Invariant checking via schema registry
- Event sourcing with projection handlers
- True end-to-end testing

## Wiring the Gateway

### Step 1: Create Gateway Wrapper

```typescript
// apps/api/src/__test__/helpers/truth-gateway.ts

import { executeMutationCommand } from "../../policy/mutation-command-gateway.js";
import { MUTATION_POLICIES } from "@afenda/db/truth-compiler";
import { getSchema } from "../../meta/registry.js";
import type {
  MutationGateway,
  SchemaRegistry,
} from "@afenda/truth-test";

/**
 * Gateway wrapper for truth-test integration.
 *
 * **Wires:** mutation-command-gateway, policy registry, schema registry
 */
export const truthGateway: MutationGateway = async (input) => {
  const result = await executeMutationCommand({
    model: input.model,
    operation: input.operation,
    mutate: input.mutate,
    existingRecord: input.existingRecord,
    nextRecord: input.nextRecord,
    recordId: input.recordId,
    actorId: input.actorId,
    source: input.source ?? "truth-test",
    policies: input.policies ?? MUTATION_POLICIES,
  });

  return {
    record: result.record,
    event: result.event,
    mutationPolicy: result.mutationPolicy,
    policy: result.policy,
  };
};

/**
 * Schema registry wrapper for truth-test integration.
 */
export const truthSchemaRegistry: SchemaRegistry = {
  getSchema,
};
```

### Step 2: Wire in Test Context

```typescript
// apps/api/src/__test__/truth-harness.test.ts

import { describe, it, expect, beforeEach } from "vitest";
import { createHarness } from "@afenda/truth-test";
import { truthGateway, truthSchemaRegistry } from "./helpers/truth-gateway.js";
import { MUTATION_POLICIES } from "@afenda/db/truth-compiler";

describe("Truth Harness with Gateway Integration", () => {
  let harness: TruthHarness;

  beforeEach(async () => {
    harness = await createHarness({
      // Wire real gateway functions
      mutationGateway: truthGateway,
      schemaRegistry: truthSchemaRegistry,
      mutationPolicies: MUTATION_POLICIES,
    });
  });

  it("should enforce mutation policies", async () => {
    // If salesOrder has event-only policy, direct mutation will be blocked
    await expect(
      harness.execute({
        entity: "salesOrder",
        operation: "create",
        input: { customerId: 1, total: 100 },
      })
    ).rejects.toThrow(/Direct create is blocked/);
  });

  it("should check invariants via schema registry", async () => {
    // If customer schema has email format invariant, invalid email will fail
    await expect(
      harness.execute({
        entity: "customer",
        operation: "create",
        input: { name: "Test", email: "invalid-email" },
      })
    ).rejects.toThrow(/email/);
  });

  it("should emit events through gateway", async () => {
    const result = await harness.execute({
      entity: "customer",
      operation: "create",
      input: { name: "ACME Corp", email: "acme@example.com" },
    });

    expect(harness.events).toHaveLength(1);
    expect(harness.events[0]?.eventType).toBe("CustomerCreated");
    expect(harness.events[0]?.payload).toMatchObject({
      model: "customer",
      operation: "create",
    });
  });
});
```

## Wiring Projection Handlers

### Step 1: Create Projection Handlers

```typescript
// apps/api/src/__test__/helpers/projection-handlers.ts

import type { DomainEvent } from "@afenda/meta-types/events";
import type { ProjectionHandler } from "@afenda/truth-test";

/**
 * Customer projection handler.
 *
 * **Rebuilds:** customer projection from CustomerCreated, CustomerUpdated events
 */
export const customerProjectionHandler: ProjectionHandler = async (
  event,
  currentState
) => {
  if (event.eventType === "CustomerCreated") {
    return event.payload.after;
  }

  if (event.eventType === "CustomerUpdated") {
    return {
      ...currentState,
      ...event.payload.after,
    };
  }

  if (event.eventType === "CustomerDeleted") {
    return null; // Tombstone
  }

  return currentState;
};

/**
 * Sales order projection handler.
 */
export const salesOrderProjectionHandler: ProjectionHandler = async (
  event,
  currentState
) => {
  if (event.eventType === "SalesOrderCreated") {
    return {
      ...event.payload.after,
      status: "draft",
      lineItemCount: 0,
      totalAmount: 0,
    };
  }

  if (event.eventType === "SalesOrderLineItemAdded") {
    const lineItem = event.payload.after;
    return {
      ...currentState,
      lineItemCount: (currentState?.lineItemCount ?? 0) + 1,
      totalAmount: (currentState?.totalAmount ?? 0) + lineItem.amount,
    };
  }

  if (event.eventType === "SalesOrderApproved") {
    return {
      ...currentState,
      status: "approved",
      approvedAt: event.timestamp,
      approvedBy: event.metadata.actor,
    };
  }

  return currentState;
};

/**
 * Projection handler registry.
 */
export const projectionHandlers = new Map<string, ProjectionHandler>([
  ["customer", customerProjectionHandler],
  ["salesOrder", salesOrderProjectionHandler],
]);
```

### Step 2: Wire in Test Context

```typescript
// apps/api/src/__test__/event-sourcing.test.ts

import { describe, it, expect, beforeEach } from "vitest";
import { createHarness } from "@afenda/truth-test";
import { projectionHandlers } from "./helpers/projection-handlers.js";

describe("Event Sourcing with Projection Handlers", () => {
  let harness: TruthHarness;

  beforeEach(async () => {
    harness = await createHarness({
      projectionHandlers,
    });
  });

  it("should rebuild projections from events", async () => {
    // Step 1: Execute mutations (events collected)
    const customer = await harness.execute({
      entity: "customer",
      operation: "create",
      input: { name: "ACME Corp", email: "acme@example.com" },
    });

    await harness.execute({
      entity: "customer",
      operation: "update",
      input: { id: customer.id, status: "active" },
    });

    // Step 2: Clear projection table
    await harness.db.sql("TRUNCATE TABLE customer CASCADE");

    // Step 3: Verify projection is gone
    const beforeReplay = await harness.query({
      entity: "customer",
      filters: { id: customer.id },
    });
    expect(beforeReplay.count).toBe(0);

    // Step 4: Replay events to rebuild projection
    await harness.replay();

    // Step 5: Verify projection rebuilt correctly
    const afterReplay = await harness.query({
      entity: "customer",
      filters: { id: customer.id },
    });

    expect(afterReplay.count).toBe(1);
    expect(afterReplay.data[0]).toMatchObject({
      name: "ACME Corp",
      email: "acme@example.com",
      status: "active",
    });

    // Step 6: Verify events match projection
    expect(harness.events).toHaveLength(2);
    expect(harness.events[0]?.eventType).toBe("CustomerCreated");
    expect(harness.events[1]?.eventType).toBe("CustomerUpdated");
  });

  it("should handle complex aggregates with line items", async () => {
    // Create order
    const order = await harness.execute({
      entity: "salesOrder",
      operation: "create",
      input: { customerId: 1 },
    });

    // Add line items
    await harness.execute({
      entity: "salesOrderLineItem",
      operation: "create",
      input: { orderId: order.id, amount: 100 },
    });

    await harness.execute({
      entity: "salesOrderLineItem",
      operation: "create",
      input: { orderId: order.id, amount: 200 },
    });

    // Clear and replay
    await harness.db.sql("TRUNCATE TABLE sales_order CASCADE");
    await harness.replay();

    // Verify projection computed correctly
    const rebuilt = await harness.query({
      entity: "salesOrder",
      filters: { id: order.id },
    });

    expect(rebuilt.data[0]).toMatchObject({
      lineItemCount: 2,
      totalAmount: 300,
      status: "draft",
    });
  });
});
```

## Testing Policy Enforcement

```typescript
describe("Mutation Policy Enforcement", () => {
  it("should allow direct mutations for entities with 'direct' policy", async () => {
    const harness = await createHarness({
      mutationGateway: truthGateway,
      mutationPolicies: MUTATION_POLICIES,
    });

    // Customer has 'direct' policy - should succeed
    const result = await harness.execute({
      entity: "customer",
      operation: "create",
      input: { name: "Test", email: "test@example.com" },
    });

    expect(result.id).toBeDefined();
  });

  it("should block direct mutations for entities with 'event-only' policy", async () => {
    const harness = await createHarness({
      mutationGateway: truthGateway,
      mutationPolicies: MUTATION_POLICIES,
    });

    // SalesOrder has 'event-only' policy - should fail
    await expect(
      harness.execute({
        entity: "salesOrder",
        operation: "create",
        input: { customerId: 1, total: 100 },
      })
    ).rejects.toThrow(/Direct create is blocked/);
  });

  it("should emit events for 'dual-write' policy", async () => {
    const harness = await createHarness({
      mutationGateway: truthGateway,
      mutationPolicies: MUTATION_POLICIES,
    });

    // Commission might have 'dual-write' policy
    const result = await harness.execute({
      entity: "commission",
      operation: "create",
      input: { amount: 50, salesRepId: 1 },
    });

    // Both mutation succeeds AND event emitted
    expect(result.id).toBeDefined();
    expect(harness.events).toHaveLength(1);
    expect(harness.events[0]?.eventType).toBe("CommissionCreated");
  });
});
```

## Best Practices

### 1. Use Gateway in Integration Tests Only
- **Unit tests:** Use TestDB direct mode (fast, isolated)
- **Integration tests:** Wire gateway for end-to-end validation

### 2. Test Policy Evolution
```typescript
it("should handle policy migration from direct → dual-write", async () => {
  // Before: direct policy (no events)
  const harness1 = await createHarness();
  await harness1.execute({
    entity: "customer",
    operation: "create",
    input: { name: "Test" },
  });
  expect(harness1.events).toHaveLength(1); // Event still emitted by harness

  // After: dual-write policy (events + DB)
  const harness2 = await createHarness({
    mutationGateway: truthGateway,
  });
  await harness2.execute({
    entity: "customer",
    operation: "create",
    input: { name: "Test" },
  });
  expect(harness2.events).toHaveLength(1); // Event from gateway
});
```

### 3. Verify Projection Drift
```typescript
it("should detect projection drift", async () => {
  const harness = await createHarness({
    projectionHandlers,
  });

  // Execute mutations (projection built via mutation)
  const order = await harness.execute({
    entity: "salesOrder",
    operation: "create",
    input: { customerId: 1 },
  });

  // Get current projection state
  const direct = await harness.query({
    entity: "salesOrder",
    filters: { id: order.id },
  });

  // Rebuild from events
  await harness.db.sql("TRUNCATE TABLE sales_order CASCADE");
  await harness.replay();

  // Verify projections match
  const rebuilt = await harness.query({
    entity: "salesOrder",
    filters: { id: order.id },
  });

  expect(rebuilt.data[0]).toEqual(direct.data[0]);
});
```

## Summary

✅ **Gateway integration provides:**
- Policy enforcement (direct, dual-write, event-only)
- Invariant checking via schema registry
- Event sourcing with projection handlers
- End-to-end truth engine validation

✅ **TestDB direct mode provides:**
- Fast unit testing
- Simple setup
- No gateway dependencies
- Manual event construction

Choose the mode that fits your test requirements!
