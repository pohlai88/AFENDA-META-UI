/**
 * Query Builder
 * =============
 * 
 * Translates API filter objects into Drizzle ORM where conditions.
 * 
 * Filter API format (JSON in query params):
 * ?filters=[{"field":"status","op":"eq","value":"draft"}]
 * 
 * Supported operators:
 * - eq (equals)
 * - neq (not equals)
 * - gt (greater than)
 * - gte (greater than or equal)
 * - lt (less than)
 * - lte (less than or equal)
 * - like (SQL LIKE with wildcards)
 * - ilike (case-insensitive LIKE)
 * - in (value in array)
 * - between (value between two values)
 * - is_null (field is NULL)
 * - is_not_null (field is NOT NULL)
 */

import { z } from "zod";
import { 
  and, 
  or, 
  eq, 
  ne,
  gt, 
  gte, 
  lt, 
  lte, 
  like, 
  ilike,
  inArray,
  between,
  isNull,
  isNotNull,
  type SQL,
  type Column,
} from "drizzle-orm";

// ---------------------------------------------------------------------------
// Filter Schema Validation
// ---------------------------------------------------------------------------

export const FilterOperatorSchema = z.enum([
  "eq",
  "neq",
  "gt",
  "gte",
  "lt",
  "lte",
  "like",
  "ilike",
  "in",
  "between",
  "is_null",
  "is_not_null",
]);

export type FilterOperator = z.infer<typeof FilterOperatorSchema>;

export const FilterConditionSchema = z.object({
  field: z.string().min(1, "Field name is required"),
  op: FilterOperatorSchema,
  value: z.any().optional(), // Value depends on operator
});

export type FilterCondition = z.infer<typeof FilterConditionSchema>;

export const FilterGroupSchema = z.object({
  logic: z.enum(["and", "or"]).default("and"),
  conditions: z.array(FilterConditionSchema),
});

export type FilterGroup = z.infer<typeof FilterGroupSchema>;

// ---------------------------------------------------------------------------
// Query Builder
// ---------------------------------------------------------------------------

/**
 * Build a Drizzle where condition from a single filter
 * 
 * @param table Drizzle table object
 * @param filter Filter condition
 * @returns Drizzle SQL condition
 */
function buildCondition(
  table: Record<string, Column>,
  filter: FilterCondition
): SQL | undefined {
  const column = table[filter.field];
  
  if (!column) {
    console.warn(`[QueryBuilder] Unknown field: ${filter.field}`);
    return undefined;
  }

  const { op, value } = filter;

  try {
    switch (op) {
      case "eq":
        return eq(column, value);
      
      case "neq":
        return ne(column, value);
      
      case "gt":
        return gt(column, value);
      
      case "gte":
        return gte(column, value);
      
      case "lt":
        return lt(column, value);
      
      case "lte":
        return lte(column, value);
      
      case "like":
        return like(column, value);
      
      case "ilike":
        return ilike(column, value);
      
      case "in":
        if (!Array.isArray(value)) {
          console.warn(`[QueryBuilder] 'in' operator requires array value`);
          return undefined;
        }
        return inArray(column, value);
      
      case "between":
        if (!Array.isArray(value) || value.length !== 2) {
          console.warn(`[QueryBuilder] 'between' operator requires array of 2 values`);
          return undefined;
        }
        return between(column, value[0], value[1]);
      
      case "is_null":
        return isNull(column);
      
      case "is_not_null":
        return isNotNull(column);
      
      default:
        console.warn(`[QueryBuilder] Unknown operator: ${op}`);
        return undefined;
    }
  } catch (error) {
    console.error(`[QueryBuilder] Error building condition for ${filter.field}:`, error);
    return undefined;
  }
}

/**
 * Build Drizzle where clause from filter group
 * 
 * @param table Drizzle table object
 * @param filterGroup Group of filter conditions
 * @returns Drizzle SQL condition
 */
export function buildWhereClause(
  table: Record<string, Column>,
  filterGroup: FilterGroup
): SQL | undefined {
  const conditions = filterGroup.conditions
    .map((filter) => buildCondition(table, filter))
    .filter((cond): cond is SQL => cond !== undefined);

  if (conditions.length === 0) {
    return undefined;
  }

  if (conditions.length === 1) {
    return conditions[0];
  }

  return filterGroup.logic === "and" 
    ? and(...conditions) 
    : or(...conditions);
}

/**
 * Parse and validate filters from query string
 * 
 * @param filtersParam Query param value (JSON string or object)
 * @returns Validated filter group or error
 */
export function parseFilters(
  filtersParam: string | object | undefined
): { success: true; data: FilterGroup } | { success: false; error: string } {
  if (!filtersParam) {
    return { success: true, data: { logic: "and", conditions: [] } };
  }

  try {
    // Parse JSON if string
    const parsed = typeof filtersParam === "string" 
      ? JSON.parse(filtersParam) 
      : filtersParam;

    // Handle legacy format: array of conditions (assume AND logic)
    if (Array.isArray(parsed)) {
      const validated = FilterGroupSchema.parse({
        logic: "and",
        conditions: parsed,
      });
      return { success: true, data: validated };
    }

    // Handle new format: { logic, conditions }
    const validated = FilterGroupSchema.parse(parsed);
    return { success: true, data: validated };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { 
        success: false, 
        error: `Filter validation failed: ${error.issues.map((e) => e.message).join(", ")}` 
      };
    }
    if (error instanceof SyntaxError) {
      return { 
        success: false, 
        error: "Invalid JSON in filters parameter" 
      };
    }
    return { 
      success: false, 
      error: "Failed to parse filters" 
    };
  }
}

// ---------------------------------------------------------------------------
// Sorting
// ---------------------------------------------------------------------------

export const SortOrderSchema = z.enum(["asc", "desc"]);
export type SortOrder = z.infer<typeof SortOrderSchema>;

export const SortParamSchema = z.object({
  field: z.string().min(1),
  order: SortOrderSchema.default("asc"),
});

export type SortParam = z.infer<typeof SortParamSchema>;

/**
 * Parse and validate sort parameters
 * 
 * @param sortParam Query param value (JSON string or object)
 * @returns Validated sort params or error
 */
export function parseSortParams(
  sortParam: string | object | undefined
): { success: true; data: SortParam[] } | { success: false; error: string } {
  if (!sortParam) {
    return { success: true, data: [] };
  }

  try {
    const parsed = typeof sortParam === "string" 
      ? JSON.parse(sortParam) 
      : sortParam;

    // Handle single sort object
    if (!Array.isArray(parsed)) {
      const validated = SortParamSchema.parse(parsed);
      return { success: true, data: [validated] };
    }

    // Handle array of sort objects
    const validated = z.array(SortParamSchema).parse(parsed);
    return { success: true, data: validated };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { 
        success: false, 
        error: `Sort validation failed: ${error.issues.map((e) => e.message).join(", ")}` 
      };
    }
    return { 
      success: false, 
      error: "Failed to parse sort parameters" 
    };
  }
}
