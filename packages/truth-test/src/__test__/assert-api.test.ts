/**
 * Assert API Unit Tests
 * =====================
 * Tests all assertion functions from assert/ directory.
 * These are pure logic tests - no database required.
 *
 * Purpose: Achieve 80%+ coverage on all assert modules (currently at 0%)
 */

import { describe, it, expect, vi } from "vitest";
import type { DomainEvent } from "@afenda/meta-types/events";
import type { TestDB } from "../types/test-harness.js";
import {
  assertEvent,
  assertEventSequence,
  assertNoEvent,
  assertEventCount,
  EventAssertionError,
} from "../assert/assert-event.js";
import {
  assertState,
  assertExists,
  assertNotExists,
  assertRowCount,
  StateAssertionError,
} from "../assert/assert-state.js";
import {
  assertInvariant,
  assertEntityInvariant,
  InvariantViolationError,
} from "../assert/assert-invariant.js";
import { assertProjection, assertProjectionReplay } from "../assert/assert-projection.js";

// ---------------------------------------------------------------------------
// assert-event.ts tests
// ---------------------------------------------------------------------------

describe("assert-event.ts", () => {
  const sampleEvents: DomainEvent[] = [
    {
      id: "evt-1",
      eventType: "salesOrder.created",
      aggregateType: "SalesOrder",
      aggregateId: "SO-123",
      payload: { total: 1000 },
      version: 1,
      timestamp: "2026-03-28T00:00:00Z",
      metadata: {
        actor: "user-1",
        correlationId: "corr-1",
      },
    },
    {
      id: "evt-2",
      eventType: "commission.calculated",
      aggregateType: "Commission",
      aggregateId: "COMM-456",
      payload: { amount: 50 },
      version: 1,
      timestamp: "2026-03-28T00:00:01Z",
      metadata: {
        actor: "user-1",
        correlationId: "corr-1",
      },
    },
  ];

  describe("assertEvent", () => {
    it("should find event by type", () => {
      const event = assertEvent(sampleEvents, "salesOrder.created");
      expect(event.id).toBe("evt-1");
    });

    it("should find event by type and predicate", () => {
      const event = assertEvent(
        sampleEvents,
        "commission.calculated",
        (e) => (e.payload as { amount: number }).amount > 0
      );
      expect(event.id).toBe("evt-2");
    });

    it("should throw EventAssertionError when event not found", () => {
      expect(() => assertEvent(sampleEvents, "nonexistent.event")).toThrow(EventAssertionError);
    });

    it("should throw when predicate does not match", () => {
      expect(() =>
        assertEvent(
          sampleEvents,
          "commission.calculated",
          (e) => (e.payload as { amount: number }).amount > 1000
        )
      ).toThrow(EventAssertionError);
    });

    it("should list available events in error message", () => {
      try {
        assertEvent(sampleEvents, "missing.event");
        throw new Error("Should have thrown");
      } catch (err) {
        expect(err).toBeInstanceOf(EventAssertionError);
        expect((err as Error).message).toContain("salesOrder.created");
        expect((err as Error).message).toContain("commission.calculated");
      }
    });
  });

  describe("assertEventSequence", () => {
    it("should verify correct event sequence", () => {
      expect(() =>
        assertEventSequence(sampleEvents, ["salesOrder.created", "commission.calculated"])
      ).not.toThrow();
    });

    it("should throw when sequence is wrong", () => {
      expect(() =>
        assertEventSequence(sampleEvents, ["commission.calculated", "salesOrder.created"])
      ).toThrow(EventAssertionError);
    });

    it("should throw when event is missing from sequence", () => {
      expect(() =>
        assertEventSequence(sampleEvents, ["salesOrder.created", "missing.event"])
      ).toThrow(EventAssertionError);
    });
  });

  describe("assertNoEvent", () => {
    it("should pass when event is absent", () => {
      expect(() => assertNoEvent(sampleEvents, "nonexistent.event")).not.toThrow();
    });

    it("should throw when event is present", () => {
      expect(() => assertNoEvent(sampleEvents, "salesOrder.created")).toThrow(EventAssertionError);
    });
  });

  describe("assertEventCount", () => {
    it("should verify correct event count", () => {
      expect(() => assertEventCount(sampleEvents, undefined, 2)).not.toThrow();
    });

    it("should verify count for specific event type", () => {
      expect(() => assertEventCount(sampleEvents, "salesOrder.created", 1)).not.toThrow();
    });

    it("should throw when count mismatches", () => {
      expect(() => assertEventCount(sampleEvents, "salesOrder.created", 5)).toThrow(
        EventAssertionError
      );
    });

    it("should throw when no events of type exist", () => {
      expect(() => assertEventCount(sampleEvents, "missing.event", 1)).toThrow(EventAssertionError);
    });
  });
});

// ---------------------------------------------------------------------------
// assert-state.ts tests
// ---------------------------------------------------------------------------

describe("assert-state.ts", () => {
  const mockDB: TestDB = {
    findOne: vi.fn(),
    find: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    sql: vi.fn(),
    reset: vi.fn(),
    getEvents: vi.fn(),
  };

  describe("assertState", () => {
    it("should pass when all expected fields match", async () => {
      vi.mocked(mockDB.findOne).mockResolvedValue({
        id: "SO-123",
        status: "approved",
        total: 1000,
      } as any);

      await expect(
        assertState<any>({
          db: mockDB,
          table: "sales_orders",
          where: { id: "SO-123" },
          expect: { status: "approved", total: 1000 },
        })
      ).resolves.not.toThrow();
    });

    it("should throw StateAssertionError when row not found", async () => {
      vi.mocked(mockDB.findOne).mockResolvedValue(null);

      await expect(
        assertState<any>({
          db: mockDB,
          table: "sales_orders",
          where: { id: "MISSING" },
          expect: { status: "approved" },
        })
      ).rejects.toThrow(StateAssertionError);
    });

    it("should throw when field value mismatches", async () => {
      vi.mocked(mockDB.findOne).mockResolvedValue({
        id: "SO-123",
        status: "draft",
        total: 1000,
      } as any);

      await expect(
        assertState<any>({
          db: mockDB,
          table: "sales_orders",
          where: { id: "SO-123" },
          expect: { status: "approved" },
        })
      ).rejects.toThrow(StateAssertionError);
    });

    it("should include field name in error message", async () => {
      vi.mocked(mockDB.findOne).mockResolvedValue({
        id: "SO-123",
        status: "draft",
      } as any);

      try {
        await assertState<any>({
          db: mockDB,
          table: "sales_orders",
          where: { id: "SO-123" },
          expect: { status: "approved" },
        });
        throw new Error("Should have thrown");
      } catch (err) {
        expect((err as Error).message).toContain("status");
        expect((err as Error).message).toContain("draft");
        expect((err as Error).message).toContain("approved");
      }
    });
  });

  describe("assertExists", () => {
    it("should pass when row exists", async () => {
      vi.mocked(mockDB.findOne).mockResolvedValue({ id: "SO-123" });

      await expect(assertExists(mockDB, "sales_orders", { id: "SO-123" })).resolves.not.toThrow();
    });

    it("should throw when row does not exist", async () => {
      vi.mocked(mockDB.findOne).mockResolvedValue(null);

      await expect(assertExists(mockDB, "sales_orders", { id: "MISSING" })).rejects.toThrow(
        StateAssertionError
      );
    });
  });

  describe("assertNotExists", () => {
    it("should pass when row does not exist", async () => {
      vi.mocked(mockDB.findOne).mockResolvedValue(null);

      await expect(
        assertNotExists(mockDB, "sales_orders", { id: "MISSING" })
      ).resolves.not.toThrow();
    });

    it("should throw when row exists", async () => {
      vi.mocked(mockDB.findOne).mockResolvedValue({ id: "SO-123" });

      await expect(assertNotExists(mockDB, "sales_orders", { id: "SO-123" })).rejects.toThrow(
        StateAssertionError
      );
    });
  });

  describe("assertRowCount", () => {
    it("should pass when count matches", async () => {
      vi.mocked(mockDB.find).mockResolvedValue([{ id: "1" }, { id: "2" }]);

      await expect(assertRowCount(mockDB, "sales_orders", {}, 2)).resolves.not.toThrow();
    });

    it("should throw when count mismatches", async () => {
      vi.mocked(mockDB.find).mockResolvedValue([{ id: "1" }]);

      await expect(assertRowCount(mockDB, "sales_orders", {}, 5)).rejects.toThrow(
        StateAssertionError
      );
    });

    it("should accept undefined where clause", async () => {
      vi.mocked(mockDB.find).mockResolvedValue([]);

      await expect(assertRowCount(mockDB, "sales_orders", undefined, 0)).resolves.not.toThrow();
    });
  });
});

// ---------------------------------------------------------------------------
// assert-invariant.ts tests
// ---------------------------------------------------------------------------

describe("assert-invariant.ts", () => {
  describe("assertInvariant", () => {
    it("should pass when function does not throw", () => {
      expect(() =>
        assertInvariant("test invariant", () => {
          // valid check
        })
      ).not.toThrow();
    });

    it("should throw InvariantViolationError when function throws", () => {
      expect(() =>
        assertInvariant("test invariant", () => {
          throw new Error("Violation");
        })
      ).toThrow(InvariantViolationError);
    });

    it("should handle async assertions that pass", async () => {
      await expect(
        assertInvariant("async test", async () => {
          await Promise.resolve();
        })
      ).resolves.not.toThrow();
    });

    it("should handle async assertions that fail", async () => {
      await expect(
        assertInvariant("async test", async () => {
          throw new Error("Async violation");
        })
      ).rejects.toThrow(InvariantViolationError);
    });

    it("should include invariant name in error", () => {
      try {
        assertInvariant("commission limit check", () => {
          throw new Error("Exceeded limit");
        });
        throw new Error("Should have thrown");
      } catch (err) {
        expect(err).toBeInstanceOf(InvariantViolationError);
        expect((err as Error).message).toContain("commission limit check");
      }
    });
  });

  describe("assertEntityInvariant", () => {
    const mockContext = {
      db: {
        findOne: vi.fn(),
      } as unknown as TestDB,
      emit: vi.fn(),
      clock: () => new Date("2026-03-28T00:00:00Z"),
      tenantId: "1",
      userId: 1,
    };

    it("should pass silently when no registry exists for model", async () => {
      await expect(
        assertEntityInvariant("unknown_model", "123", mockContext)
      ).resolves.not.toThrow();
    });

    // Note: Full testing of assertEntityInvariant requires SALES_INVARIANT_REGISTRIES
    // which are only available with @afenda/db/truth-compiler. These are tested
    // indirectly via truth-engine.invariants.test.ts when DATABASE_URL is set.
  });
});

// ---------------------------------------------------------------------------
// assert-projection.ts tests
// ---------------------------------------------------------------------------

describe("assert-projection.ts", () => {
  const mockDB: TestDB = {
    findOne: vi.fn(),
    find: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    sql: vi.fn(),
    reset: vi.fn(),
    getEvents: vi.fn(),
  };

  describe("assertProjection", () => {
    it("should verify projection state matches expectations", async () => {
      vi.mocked(mockDB.findOne).mockResolvedValue({
        id: "proj-1",
        computed: true,
        total: 1000,
      } as any);

      await expect(
        assertProjection<any>({
          db: mockDB,
          projection: "test_projection",
          entityId: "proj-1",
          expect: { computed: true, total: 1000 },
        })
      ).resolves.not.toThrow();
    });

    it("should throw when projection field mismatches", async () => {
      vi.mocked(mockDB.findOne).mockResolvedValue({
        id: "proj-1",
        computed: false,
      } as any);

      await expect(
        assertProjection<any>({
          db: mockDB,
          projection: "test_projection",
          entityId: "proj-1",
          expect: { computed: true },
        })
      ).rejects.toThrow(/Projection mismatch/);
    });

    it("should throw when projection not found", async () => {
      vi.mocked(mockDB.findOne).mockResolvedValue(null);

      await expect(
        assertProjection<any>({
          db: mockDB,
          projection: "test_projection",
          entityId: "missing-id",
          expect: { computed: true },
        })
      ).rejects.toThrow(/No projection/);
    });
  });

  describe("assertProjectionReplay", () => {
    it("throws when no events exist for the given projection", async () => {
      const context = {
        db: mockDB,
        emit: vi.fn(),
        clock: () => new Date(),
        tenantId: "tenant-1",
        userId: 1,
        projectionHandlers: new Map(),
      };
      await expect(
        assertProjectionReplay({
          db: mockDB,
          projection: "test_projection",
          events: [],
          expect: {},
          context,
        })
      ).rejects.toThrow(/No events found for projection/i);
    });
  });
});
