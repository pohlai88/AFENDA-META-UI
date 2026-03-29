/**
 * State Assertions
 * ================
 * Verify database state matches expectations.
 *
 * **Design Philosophy:**
 * State is the materialized truth. Tests verify DB reflects truth.
 */

import type { TestDB } from "../types/test-harness.js";

/**
 * Assert that database state matches expectations.
 *
 * @param db - Test database instance
 * @param table - Table name
 * @param where - Row selector criteria
 * @param expect - Expected field values
 *
 * @example
 * ```typescript
 * await assertState({
 *   db: harness.db,
 *   table: "sales_orders",
 *   where: { id: "SO-12345" },
 *   expect: { status: "approved", total: 1000 }
 * });
 * ```
 */
export async function assertState<T extends Record<string, unknown>>({
  db,
  table,
  where,
  expect,
}: {
  db: TestDB;
  table: string;
  where: Partial<T>;
  expect: Partial<T>;
}): Promise<void> {
  const row = await db.findOne<T>(table, where);

  if (!row) {
    throw new StateAssertionError(
      `No row found in "${table}" matching criteria: ` +
        JSON.stringify(where, null, 2)
    );
  }

  // Check each expected field
  for (const key in expect) {
    const expected = expect[key];
    const actual = row[key];

    if (actual !== expected) {
      throw new StateAssertionError(
        `State mismatch in "${table}.${key}": ` +
          `expected ${JSON.stringify(expected)}, ` +
          `got ${JSON.stringify(actual)}`
      );
    }
  }
}

/**
 * Assert that a row exists in the database.
 *
 * @param db - Test database instance
 * @param table - Table name
 * @param where - Row selector criteria
 *
 * @example
 * ```typescript
 * await assertExists(harness.db, "sales_orders", { id: "SO-12345" });
 * ```
 */
export async function assertExists<T extends Record<string, unknown>>(
  db: TestDB,
  table: string,
  where: Partial<T>
): Promise<void> {
  const row = await db.findOne<T>(table, where);

  if (!row) {
    throw new StateAssertionError(
      `Expected row in "${table}" matching criteria not found: ` +
        JSON.stringify(where, null, 2)
    );
  }
}

/**
 * Assert that a row does not exist in the database.
 *
 * @param db - Test database instance
 * @param table - Table name
 * @param where - Row selector criteria
 *
 * @example
 * ```typescript
 * await assertNotExists(harness.db, "deleted_orders", { id: "SO-OLD" });
 * ```
 */
export async function assertNotExists<T extends Record<string, unknown>>(
  db: TestDB,
  table: string,
  where: Partial<T>
): Promise<void> {
  const row = await db.findOne<T>(table, where);

  if (row) {
    throw new StateAssertionError(
      `Expected no row in "${table}" matching criteria, but found one: ` +
        JSON.stringify(row, null, 2)
    );
  }
}

/**
 * Assert row count.
 *
 * @param db - Test database instance
 * @param table - Table name
 * @param where - Optional filter criteria
 * @param count - Expected count
 *
 * @example
 * ```typescript
 * await assertRowCount(harness.db, "sales_order_lines", { orderId: "SO-12345" }, 3);
 * ```
 */
export async function assertRowCount<T extends Record<string, unknown>>(
  db: TestDB,
  table: string,
  where: Partial<T> | undefined,
  count: number
): Promise<void> {
  const rows = await db.find<T>(table, where);

  if (rows.length !== count) {
    throw new StateAssertionError(
      `Expected ${count} row(s) in "${table}", but found ${rows.length}`
    );
  }
}

/**
 * Custom error for state assertion failures.
 */
export class StateAssertionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "StateAssertionError";
  }
}
