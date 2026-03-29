/**
 * @afenda/db public API
 *
 * Exports: Database (db, pool, Database type), client factory, shared types, session, RLS
 */

export { db, pool, getPoolStats, checkDatabaseConnection, dbServerless, type Database, type DatabaseOptions, type DrizzleLogger, type PoolStats } from "./db.js";
export { createDatabase, createServerlessDatabase } from "./client/index.js";
export { relations } from "./relations.js";
export {
  getMutationPolicyById,
  requireMutationPolicyById,
  MUTATION_POLICIES,
  MUTATION_POLICY_REGISTRY,
  SCOPED_MUTATION_POLICIES,
  // Deprecated aliases — remove after one release cycle
  getSalesMutationPolicyById,
  requireSalesMutationPolicyById,
  SALES_CROSS_INVARIANTS,
  SALES_INVARIANT_REGISTRIES,
  SALES_MUTATION_POLICY_REGISTRY,
  SALES_MUTATION_POLICIES,
  SALES_SCOPED_MUTATION_POLICIES,
  SALES_STATE_MACHINES,
  SALES_TRUTH_MODEL,
} from "./truth-compiler/truth-config.js";

export * from "./columns/index.js";
export * from "./session/index.js";
export * from "./rls/index.js";
