/**
 * @afenda/db public API
 *
 * Exports: Database (db, pool, Database type), shared types, session, RLS
 * Internal (_private/): Migration scripts, Drizzle adapters
 */

export { db, pool, getPoolStats, checkDatabaseConnection, type Database } from "./db.js";
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

export * from "./_shared/index.js";
export * from "./_session/index.js";
export * from "./_rls/index.js";
