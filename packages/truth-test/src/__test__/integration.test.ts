/**
 * Truth Test Harness - Integration Test
 * ======================================
 * Verifies that TestDB + execute layer work end-to-end.
 *
 * **Prerequisites:**
 * Runs only when DATABASE_URL or TEST_DATABASE_URL is set.
 * beforeAll bootstraps the required tenant row (idempotent).
 *
 * **Test Scenario:**
 * 1. Create a customer via harness.execute()
 * 2. Verify event emitted
 * 3. Verify customer record in TestDB
 * 4. Query customer via harness.query()
 */

import { describe, it, expect, beforeAll, beforeEach } from "vitest";
import { createTruthHarness } from "../harness/create-harness.js";
import { ensureTenant } from "./helpers/tenant-bootstrap.js";
import type { TruthHarness } from "../types/test-harness.js";

// Skip all integration tests when no database is configured
const skipTests = !process.env.DATABASE_URL;

// Resolved by beforeAll — actual tenant ID from DB (not assumed to be 1)
let activeTenantId = 1;

describe.skipIf(skipTests)("Truth Harness Integration", () => {
  let harness: TruthHarness;

  /**
   * Bootstrap tenant once before all tests in this file.
   * Idempotent — safe to run against a shared test DB.
   * Pattern: Vitest official docs — beforeAll for DB setup that must run once.
   */
  beforeAll(async () => {
    activeTenantId = await ensureTenant("AFENDA_DEMO", "AFENDA Demo Tenant");
  }, 60_000);

  beforeEach(() => {
    // Create harness with the bootstrapped tenant ID and deterministic clock
    harness = createTruthHarness({
      tenantId: activeTenantId.toString(),
      userId: 1,
      clock: () => new Date("2024-01-01T00:00:00Z"),
    });
  });

  // NOTE: We don't call harness.reset() in afterEach because:
  // 1. The test database is shared and reset() truncates ALL tables (too slow)
  // 2. Tests should be isolated by using unique test data (auto-incrementing IDs)
  // 3. For cleanup, run: node tools/scripts/cleanup-test-db.mjs

  it("should execute mutation and emit event", async () => {
    // Arrange: Define mutation
    const mutation = {
      entity: "customer",
      operation: "create" as const,
      input: {
        name: "ACME Corp",
        email: "acme@example.com",
        status: "active",
      },
    };

    // Act: Execute mutation via harness
    const result = await harness.execute(mutation);

    // Assert: Mutation succeeded
    expect(result.id).toBeDefined();
    expect(typeof result.id).toBe("string"); // partners.id is a UUID
    expect(result.data).toBeDefined();
    expect((result.data as any).name).toBe("ACME Corp");
    expect((result.data as any).email).toBe("acme@example.com");

    // Assert: Event emitted
    expect(harness.events).toHaveLength(1);
    const event = harness.events[0];
    expect(event?.eventType).toBe("CustomerCreated");
    expect(event?.aggregateType).toBe("customer");
    expect(event?.aggregateId).toBe(result.id);
    expect(event?.payload).toMatchObject({
      operation: "create",
      model: "customer",
      after: {
        name: "ACME Corp",
        email: "acme@example.com",
      },
    });

    // Assert: Customer exists in DB (partners.id is UUID)
    const customer = await harness.context.db.findOne("customer", { id: result.id });
    expect(customer).toBeDefined();
    expect((customer as any)?.name).toBe("ACME Corp");
  });

  it("should query projections", async () => {
    // Arrange: Create multiple customers
    // Note: partners table uses isActive (boolean) not status (string)
    await harness.execute({
      entity: "customer",
      operation: "create" as const,
      input: { name: "Customer A", email: "a@example.com", isActive: true },
    });

    await harness.execute({
      entity: "customer",
      operation: "create" as const,
      input: { name: "Customer B", email: "b@example.com", isActive: false },
    });

    // Act: Query only active customers
    const query = {
      entity: "customer",
      filters: { isActive: true },
    };

    const result = await harness.query(query);

    // Assert: Only active customers returned
    expect(result.data).toBeDefined();
    expect(Array.isArray(result.data)).toBe(true);
    expect((result.data as any[]).length).toBeGreaterThanOrEqual(1);

    const activeCustomers = (result.data as any[]).filter((c: any) => c.isActive === true);
    expect(activeCustomers.length).toBeGreaterThanOrEqual(1);
    expect(activeCustomers.some((c: any) => c.name === "Customer A")).toBe(true);
  });

  it("should collect multiple events", async () => {
    // Arrange: Execute multiple mutations
    const customer1 = await harness.execute({
      entity: "customer",
      operation: "create" as const,
      input: { name: "Customer 1", email: "c1@example.com", status: "active" },
    });

    const customer2 = await harness.execute({
      entity: "customer",
      operation: "create" as const,
      input: { name: "Customer 2", email: "c2@example.com", status: "active" },
    });

    // Act: Check collected events
    expect(harness.events).toHaveLength(2);

    // Assert: Events are in order
    expect(harness.events[0]?.eventType).toBe("CustomerCreated");
    expect(harness.events[0]?.aggregateId).toBe(customer1.id);

    expect(harness.events[1]?.eventType).toBe("CustomerCreated");
    expect(harness.events[1]?.aggregateId).toBe(customer2.id);
  });

  it("should reset harness state", async () => {
    // Arrange: Create customer and collect events
    await harness.execute({
      entity: "customer",
      operation: "create" as const,
      input: { name: "Test Customer", email: "test@example.com", status: "active" },
    });

    expect(harness.events).toHaveLength(1);

    // Act: Reset harness
    await harness.reset();

    // Assert: Events cleared
    expect(harness.events).toHaveLength(0);

    // Assert: DB cleared (customer no longer exists)
    const customers = await harness.context.db.find("customer");
    expect(customers).toHaveLength(0);
  }, 30_000);

  it("should handle execution errors gracefully", async () => {
    // Arrange: Invalid mutation (missing required field)
    const mutation = {
      entity: "customer",
      operation: "create" as const,
      input: {
        // Missing required fields: name, email
        status: "active",
      },
    };

    // Act & Assert: Should throw error
    await expect(harness.execute(mutation)).rejects.toThrow();
  });
});
