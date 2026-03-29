/**
 * Compiler record-bridge contract tests.
 *
 * Design intent: RecordOf<T> and RowShape<T> bridge meta-types interfaces to
 * Drizzle DB row shapes. Type drift here causes silent data loss between
 * DB persistence and application layers. Fix the contract, not the test.
 */
import { describe, expect, expectTypeOf, it } from "vitest";

import type { RecordOf, RowShape } from "../record-bridge.js";

// ---------------------------------------------------------------------------
// RecordOf<T> — Date fields become string | Date
// ---------------------------------------------------------------------------

describe("RecordOf — Date field widening contract", () => {
  interface WithDates {
    name: string;
    createdAt: Date;
    expiresAt: Date | undefined;
    count: number;
    enabled: boolean;
  }

  it("string fields are preserved unchanged", () => {
    const row: RecordOf<WithDates> = {
      name: "ACME Invoice",
      createdAt: new Date("2026-01-01"),
      expiresAt: undefined,
      count: 5,
      enabled: true,
    };
    expect(row.name).toBe("ACME Invoice");
    expect(typeof row.name).toBe("string");
  });

  it("Date fields accept a Date instance", () => {
    const now = new Date("2026-03-10T12:00:00Z");
    const row: RecordOf<WithDates> = {
      name: "Invoice",
      createdAt: now,
      expiresAt: undefined,
      count: 1,
      enabled: false,
    };
    expect(row.createdAt).toBeInstanceOf(Date);
  });

  it("Date fields accept an ISO string (serialized DB form)", () => {
    const row: RecordOf<WithDates> = {
      name: "Invoice",
      createdAt: "2026-01-01T00:00:00.000Z",
      expiresAt: "2026-12-31T23:59:59.000Z",
      count: 2,
      enabled: true,
    };
    expect(typeof row.createdAt).toBe("string");
    expect(typeof row.expiresAt).toBe("string");
  });

  it("optional Date fields accept undefined", () => {
    const row: RecordOf<WithDates> = {
      name: "Draft",
      createdAt: new Date(),
      expiresAt: undefined,
      count: 0,
      enabled: false,
    };
    expect(row.expiresAt).toBeUndefined();
  });

  it("number and boolean fields are preserved", () => {
    const row: RecordOf<WithDates> = {
      name: "Test",
      createdAt: new Date(),
      expiresAt: undefined,
      count: 42,
      enabled: true,
    };
    expect(row.count).toBe(42);
    expect(row.enabled).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// RowShape<T> — adds id, created_at, updated_at
// ---------------------------------------------------------------------------

describe("RowShape — added DB columns contract", () => {
  interface UserProfile {
    displayName: string;
    avatarUrl?: string;
  }

  it("includes all source fields alongside id, created_at, updated_at", () => {
    const row: RowShape<UserProfile> = {
      id: "00000000-0000-0000-0000-000000000001",
      created_at: new Date("2026-01-01"),
      updated_at: new Date("2026-03-01"),
      displayName: "Alice",
      avatarUrl: "https://example.com/avatar.png",
    };
    expect(row.id).toBe("00000000-0000-0000-0000-000000000001");
    expect(row.displayName).toBe("Alice");
    expect(row.created_at).toBeInstanceOf(Date);
  });

  it("created_at and updated_at accept ISO strings", () => {
    const row: RowShape<UserProfile> = {
      id: "abc123",
      created_at: "2026-01-01T00:00:00Z",
      updated_at: "2026-03-28T12:00:00Z",
      displayName: "Bob",
    };
    expect(typeof row.created_at).toBe("string");
    expect(typeof row.updated_at).toBe("string");
  });

  it("id is always a string", () => {
    const row: RowShape<UserProfile> = {
      id: "user-profile-001",
      created_at: new Date(),
      updated_at: new Date(),
      displayName: "Carol",
    };
    expect(typeof row.id).toBe("string");
    expectTypeOf(row.id).toMatchTypeOf<string>();
  });

  it("optional source fields remain optional in RowShape", () => {
    const row: RowShape<UserProfile> = {
      id: "uid-001",
      created_at: new Date(),
      updated_at: new Date(),
      displayName: "David",
    };
    expect(row.avatarUrl).toBeUndefined();
  });

  it("EXHAUSTIVENESS GATE — RowShape adds exactly 3 DB columns", () => {
    const row: RowShape<Record<string, never>> = {
      id: "x",
      created_at: new Date(),
      updated_at: new Date(),
    };
    expect(Object.keys(row)).toHaveLength(3);
  });
});
