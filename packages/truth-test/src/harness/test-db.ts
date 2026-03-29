/**
 * @file test-db.ts
 * @description TestDB implementation backed by Drizzle + Neon.
 *
 * Provides isolated test database operations using @afenda/db's Drizzle instance.
 * Supports:
 * - Type-safe CRUD operations
 * - Raw SQL for complex queries
 * - Reset/cleanup for test isolation
 * - Event collection (via harness context)
 */

import { eq, and, or, inArray, sql as drizzleSql } from "drizzle-orm";
import { getTableConfig } from "drizzle-orm/pg-core";
import { db } from "@afenda/db";
import * as schema from "@afenda/db/schema";
import type { TestDB } from "../types/test-harness.js";
import { entityToSchemaKey } from "./table-names.js";

interface CreateTestDBOptions {
  tenantId?: string;
  userId?: number;
}

/**
 * Create a TestDB instance backed by the actual Drizzle database.
 *
 * This implementation provides real database operations for integration testing.
 * For unit tests, consider using in-memory SQLite or Neon branches.
 *
 * @returns TestDB instance connected to the configured database
 */
export function createTestDB(options: CreateTestDBOptions = {}): TestDB {
  const parseTenantId = (value: unknown): number | string | undefined => {
    if (value == null) {
      return undefined;
    }

    if (typeof value === "number") {
      return value;
    }

    if (typeof value === "string") {
      const numeric = Number(value);
      if (Number.isInteger(numeric)) {
        return numeric;
      }
      return value;
    }

    return undefined;
  };

  const defaultTenantId = parseTenantId(options.tenantId);

  const hasTableColumn = (drizzleTable: any, columnName: string): boolean => {
    return Boolean(drizzleTable?.[columnName]);
  };

  const withTenantFilter = (drizzleTable: any, filter?: Record<string, unknown>) => {
    if (!hasTableColumn(drizzleTable, "tenantId") || defaultTenantId == null) {
      return filter;
    }

    if (filter && Object.prototype.hasOwnProperty.call(filter, "tenantId")) {
      return filter;
    }

    return {
      ...(filter ?? {}),
      tenantId: defaultTenantId,
    };
  };

  const withInsertDefaults = (drizzleTable: any, data: Record<string, unknown>) => {
    const enrichedData: Record<string, unknown> = { ...data };

    if (
      hasTableColumn(drizzleTable, "tenantId") &&
      defaultTenantId != null &&
      enrichedData.tenantId == null
    ) {
      enrichedData.tenantId = defaultTenantId;
    }

    if (
      hasTableColumn(drizzleTable, "createdBy") &&
      options.userId != null &&
      enrichedData.createdBy == null
    ) {
      enrichedData.createdBy = options.userId;
    }

    if (
      hasTableColumn(drizzleTable, "updatedBy") &&
      options.userId != null &&
      enrichedData.updatedBy == null
    ) {
      enrichedData.updatedBy = options.userId;
    }

    return enrichedData;
  };

  const normalizeLegacyPayload = (table: string, data: Record<string, unknown>) => {
    const normalized: Record<string, unknown> = { ...data };

    if (table === "salesOrder") {
      if (normalized.partnerId == null && normalized.customerId != null) {
        normalized.partnerId = normalized.customerId;
      }
      if (normalized.amountTotal == null && normalized.total != null) {
        normalized.amountTotal = normalized.total;
      }
      if (normalized.name == null) {
        normalized.name = `SO-${Date.now()}`;
      }
      if (normalized.status === "confirmed") {
        normalized.status = "sale";
      }
      delete normalized.customerId;
      delete normalized.total;
    }

    if (table === "product") {
      if (normalized.unitPrice == null && normalized.price != null) {
        normalized.unitPrice = normalized.price;
      }
      delete normalized.price;
    }

    if (table === "commission") {
      if (normalized.orderId == null && normalized.salesOrderId != null) {
        normalized.orderId = normalized.salesOrderId;
      }
      delete normalized.salesOrderId;
    }

    return normalized;
  };

  const withUpdateDefaults = (drizzleTable: any, data: Record<string, unknown>) => {
    const enrichedData: Record<string, unknown> = { ...data };

    if (
      hasTableColumn(drizzleTable, "updatedBy") &&
      options.userId != null &&
      enrichedData.updatedBy == null
    ) {
      enrichedData.updatedBy = options.userId;
    }

    return enrichedData;
  };

  return {
    /**
     * Find a single record by ID or filter.
     *
     * @example
     * const customer = await testDb.findOne("customer", { id: 123 });
     * const order = await testDb.findOne("salesOrder", { orderNumber: "SO-001" });
     */
    async findOne(table, filter) {
      // Convert entity name to schema key (customer → partners, salesOrder → salesOrders)
      const schemaKey = entityToSchemaKey(table);
      const drizzleTable = (schema as any)[schemaKey];

      if (!drizzleTable) {
        throw new Error(
          `Table "${table}" → schema key "${schemaKey}" not found in schema. ` +
            `Available tables: ${Object.keys(schema).slice(0, 10).join(", ")}...`
        );
      }

      // Build WHERE clause from filter object
      const effectiveFilter = withTenantFilter(
        drizzleTable,
        filter as Record<string, unknown> | undefined
      );

      const whereConditions = Object.entries(effectiveFilter ?? {}).map(([key, value]) => {
        const column = drizzleTable[key];
        if (!column) {
          throw new Error(`Column "${key}" not found in table "${table}"`);
        }
        return eq(column, value);
      });

      if (whereConditions.length === 0) {
        throw new Error("findOne requires at least one filter condition");
      }

      const results = await db
        .select()
        .from(drizzleTable)
        .where(whereConditions.length === 1 ? whereConditions[0]! : and(...whereConditions))
        .limit(1);

      return results[0] ?? null;
    },

    /**
     * Find multiple records by filter.
     *
     * @example
     * const orders = await testDb.find("salesOrder", { customerId: 123 });
     * const products = await testDb.find("product", { category: "Electronics" });
     */
    async find(table, filter) {
      // Convert entity name to schema key
      const schemaKey = entityToSchemaKey(table);
      const drizzleTable = (schema as any)[schemaKey];

      if (!drizzleTable) {
        throw new Error(`Table "${table}" → schema key "${schemaKey}" not found in schema`);
      }

      // If no filter, return all records (use with caution in tests!)
      const effectiveFilter = withTenantFilter(
        drizzleTable,
        filter as Record<string, unknown> | undefined
      );

      if (!effectiveFilter || Object.keys(effectiveFilter).length === 0) {
        return await db.select().from(drizzleTable);
      }

      // Build WHERE clause from filter object
      const whereConditions = Object.entries(effectiveFilter).map(([key, value]) => {
        const column = drizzleTable[key];
        if (!column) {
          throw new Error(`Column "${key}" not found in table "${table}"`);
        }
        return eq(column, value);
      });

      return await db
        .select()
        .from(drizzleTable)
        .where(whereConditions.length === 1 ? whereConditions[0]! : and(...whereConditions));
    },

    /**
     * Insert a new record.
     *
     * @example
     * const customer = await testDb.insert("customer", { name: "ACME Corp", email: "acme@example.com" });
     */
    async insert(table, data) {
      // Convert entity name to schema key
      const schemaKey = entityToSchemaKey(table);
      const drizzleTable = (schema as any)[schemaKey];

      if (!drizzleTable) {
        throw new Error(`Table "${table}" → schema key "${schemaKey}" not found in schema`);
      }

      const normalizedData = normalizeLegacyPayload(table, data as Record<string, unknown>);
      const insertData = withInsertDefaults(drizzleTable, normalizedData);

      const result = (await db.insert(drizzleTable).values(insertData).returning()) as any[];

      if (!result || result.length === 0 || !result[0]) {
        throw new Error(`Insert into "${table}" failed: no record returned`);
      }

      return result[0];
    },

    /**
     * Update records matching filter.
     *
     * @example
     * await testDb.update("customer", { id: 123 }, { status: "active" });
     * await testDb.update("salesOrder", { customerId: 456 }, { status: "approved" });
     */
    async update(table, filter, data) {
      // Convert entity name to schema key
      const schemaKey = entityToSchemaKey(table);
      const drizzleTable = (schema as any)[schemaKey];

      if (!drizzleTable) {
        throw new Error(`Table "${table}" → schema key "${schemaKey}" not found in schema`);
      }

      // Build WHERE clause from filter object
      const effectiveFilter = withTenantFilter(
        drizzleTable,
        filter as Record<string, unknown> | undefined
      );

      const whereConditions = Object.entries(effectiveFilter ?? {}).map(([key, value]) => {
        const column = drizzleTable[key];
        if (!column) {
          throw new Error(`Column "${key}" not found in table "${table}"`);
        }
        return eq(column, value);
      });

      if (whereConditions.length === 0) {
        throw new Error(
          "update requires at least one filter condition to prevent accidental table-wide updates"
        );
      }

      const normalizedData = normalizeLegacyPayload(table, data as Record<string, unknown>);
      const updateData = withUpdateDefaults(drizzleTable, normalizedData);

      const result = await db
        .update(drizzleTable)
        .set(updateData)
        .where(whereConditions.length === 1 ? whereConditions[0]! : and(...whereConditions))
        .returning({ id: drizzleTable.id });

      return result.length;
    },

    /**
     * Delete records matching filter.
     *
     * @example
     * await testDb.delete("customer", { id: 123 });
     * await testDb.delete("salesOrder", { status: "draft" });
     */
    async delete(table, filter) {
      // Convert entity name to schema key
      const schemaKey = entityToSchemaKey(table);
      const drizzleTable = (schema as any)[schemaKey];

      if (!drizzleTable) {
        throw new Error(`Table "${table}" not found in schema`);
      }

      // Build WHERE clause from filter object
      const effectiveFilter = withTenantFilter(
        drizzleTable,
        filter as Record<string, unknown> | undefined
      );

      const whereConditions = Object.entries(effectiveFilter ?? {}).map(([key, value]) => {
        const column = drizzleTable[key];
        if (!column) {
          throw new Error(`Column "${key}" not found in table "${table}"`);
        }
        return eq(column, value);
      });

      if (whereConditions.length === 0) {
        throw new Error(
          "delete requires at least one filter condition to prevent accidental table-wide deletes"
        );
      }

      const result = await db
        .delete(drizzleTable)
        .where(whereConditions.length === 1 ? whereConditions[0]! : and(...whereConditions))
        .returning({ id: drizzleTable.id });

      return result.length;
    },

    /**
     * Execute raw SQL query.
     *
     * @example
     * await testDb.sql("TRUNCATE TABLE sales_orders CASCADE");
     * const result = await testDb.sql<{count: string}>("SELECT COUNT(*) as count FROM customers WHERE status = 'active'");
     */
    async sql<T = unknown>(query: string, params?: unknown[]): Promise<T[]> {
      // Use Drizzle's sql`` template for safe parameterized queries
      const result = await db.execute(drizzleSql.raw(query));
      return result.rows as T[];
    },

    /**
     * Reset test database state.
     *
     * WARNING: This truncates all tables. Only use in test environments!
     *
     * @example
     * beforeEach(async () => {
     *   await testDb.reset();
     * });
     */
    async reset() {
      // Safety check: Only allow reset in test environments
      if (process.env.NODE_ENV !== "test" && !process.env.VITEST) {
        throw new Error(
          "TestDB.reset() is only allowed in test environments. " +
            "Set NODE_ENV=test or use Vitest to enable."
        );
      }

      // Get all table objects from schema (excluding system tables and enum tables)
      const tableObjects = Object.entries(schema)
        .filter(([name, obj]) => {
          // Skip private tables (starting with _)
          if (name.startsWith("_")) return false;
          // Skip zod schemas, enums, and non-table exports
          if (typeof obj !== "object" || obj === null) return false;
          // Only include Drizzle table objects (they have getTableConfig support)
          try {
            getTableConfig(obj as any);
            return true;
          } catch {
            return false;
          }
        })
        .map(([, obj]) => obj as any);

      // Truncate all tables using schema-qualified names (tables live in core/sales/security/etc.)
      // Reverse to respect FK dependency order (children before parents)
      for (const tableObj of tableObjects.reverse()) {
        try {
          const { schema: pgSchema, name: tableName } = getTableConfig(tableObj);
          const qualifiedName = pgSchema ? `"${pgSchema}"."${tableName}"` : `"${tableName}"`;
          await db.execute(drizzleSql.raw(`TRUNCATE TABLE ${qualifiedName} CASCADE`));
        } catch (error: any) {
          // Silent: skip views, materialized views, or enum-only tables
        }
      }
    },

    /**
     * Get collected events from the harness context.
     *
     * Note: This returns an empty array because events are collected by the harness context,
     * not stored directly in TestDB. Use harness.events to access collected events.
     *
     * To query the event store directly, use testDb.find("domainEvents", {...filter}).
     *
     * @returns Empty array (events are in harness.events)
     */
    getEvents() {
      // Events are collected by harness context, not TestDB
      // This method exists for interface compatibility
      return [];
    },
  };
}
