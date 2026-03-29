/**
 * Table Name Utilities for Truth Test Harness
 * ============================================
 * Converts between entity names, DB table names, and Drizzle schema keys.
 *
 * **Naming Conventions:**
 * - Entity name: camelCase (e.g., "salesOrder", "customer")
 * - DB table name: snake_case (e.g., "sales_orders", "partners")
 * - Drizzle schema key: camelCase plural (e.g., "salesOrders", "partners")
 */

/**
 * Convert entity name to Drizzle schema key.
 *
 * Entity → Schema Key examples:
 * - "salesOrder" → "salesOrders"
 * - "customer" → "partners" (business alias)
 * - "product" → "products"
 *
 * @param entity - Entity name in camelCase
 * @returns Drizzle schema table key
 */
export function entityToSchemaKey(entity: string): string {
  const normalizedEntity = entity.includes("_")
    ? tableNameToSchemaKey(entity)
    : entity;

  // Handle business aliases
  const aliases: Record<string, string> = {
    customer: "partners",
    vendor: "partners",
    supplier: "partners",
    salesOrder: "salesOrders",
    salesOrderLine: "salesOrderLines",
    commission: "commissionEntries",
  };

  if (aliases[normalizedEntity]) {
    return aliases[normalizedEntity]!;
  }

  // Convert to plural (simple heuristic - can be enhanced)
  if (normalizedEntity.endsWith("y")) {
    return normalizedEntity.slice(0, -1) + "ies"; // category -> categories
  } else if (normalizedEntity.endsWith("s")) {
    return normalizedEntity; // sales -> sales
  } else {
    return normalizedEntity + "s"; // product -> products, salesOrder -> salesOrders
  }
}

/**
 * Convert entity name to DB table name (snake_case).
 *
 * Examples:
 * - "salesOrder" → "sales_order"
 * - "customer" → "partner" (business alias)
 * - "productCategory" → "product_category"
 *
 * @param entity - Entity name in camelCase
 * @returns DB table name in snake_case
 */
export function entityToTableName(entity: string): string {
  // Handle business aliases
  const aliases: Record<string, string> = {
    customer: "partner",
    vendor: "partner",
    supplier: "partner",
  };

  const resolved = aliases[entity] ?? entity;

  // Convert camelCase to snake_case
  return resolved.replace(/([A-Z])/g, "_$1").toLowerCase();
}

/**
 * Convert snake_case table name to camelCase schema key.
 *
 * Examples:
 * - "sales_orders" → "salesOrders"
 * - "product_categories" → "productCategories"
 * - "partners" → "partners"
 *
 * @param tableName - DB table name in snake_case
 * @returns Drizzle schema key in camelCase
 */
export function tableNameToSchemaKey(tableName: string): string {
  // Convert snake_case to camelCase
  return tableName.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
}
