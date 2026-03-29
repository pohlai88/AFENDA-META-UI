/**
 * Truth Query Executor
 * ====================
 * Executes queries against projections and read models.
 *
 * **Purpose:** Test that projections are correctly updated by events.
 */

import { performance } from "node:perf_hooks";
import type {
  TruthQuery,
  TruthQueryResult,
  TruthContext,
} from "../types/test-harness.js";

/**
 * Execute a query against a projection or entity.
 *
 * **Use Case:** Verify read models match expected state after mutations.
 *
 * @param params - Query request with context
 * @returns Promise<TruthQueryResult> - Query result with data and metadata
 */
export async function executeQuery<T = unknown>({
  query,
  context,
}: {
  query: TruthQuery;
  context: TruthContext;
}): Promise<TruthQueryResult<T>> {
  const startTime = performance.now();

  try {
    // Step 1: Determine table name (convert camelCase to snake_case for DB)
    const tableName = (query.projection ?? query.entity).replace(/([A-Z])/g, "_$1").toLowerCase();

    // Step 2: Build filters
    // Convert filters to DB query format
    const dbFilters = query.filters ?? {};

    // Step 3: Execute query
    let result: any;
    if (query.filters && Object.keys(query.filters).length > 0) {
      result = await context.db.find(tableName, dbFilters);
    } else {
      result = await context.db.find(tableName);
    }

    // Step 4: Include related entities (TODO Phase 2.1: Implement relation expansion)
    // if (query.include) {
    //   result = await expandRelations(result, query.include, context);
    // }

    const executionTime = performance.now() - startTime;

    return {
      data: result as T,
      count: Array.isArray(result) ? result.length : (result ? 1 : 0),
      executionTime,
    };
  } catch (error: any) {
    throw new Error(
      `Query execution failed for entity="${query.entity}", projection="${query.projection ?? "default"}": ${error.message}`
    );
  }
}
