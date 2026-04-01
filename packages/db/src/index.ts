/**
 * @afenda/db public API
 *
 * Exports: Database (db, pool), client factory, relations, truth-compiler registry exports.
 * Column mixins, wire schemas, pg-session, request-context, and RLS builders: use `@afenda/db/columns`, `@afenda/db/wire`, `@afenda/db/pg-session`, `@afenda/db/request-context`, `@afenda/db/rls`.
 */

export {
  db,
  pool,
  getPoolStats,
  checkDatabaseConnection,
  closeDatabase,
  dbServerless,
  type Database,
  type DatabaseOptions,
  type DrizzleLogger,
  type PoolStats,
  type ServerlessDatabaseOptions,
} from "./drizzle/db.js";
export {
  createDatabase,
  createReadReplicaDatabase,
  createServerlessDatabase,
  createServerlessWebSocketDatabase,
  getEffectiveSessionTimeouts,
  resolvePoolConfigFromEnv,
  resolveReadReplicaPoolConfigFromEnv,
  type DatabaseInstance,
  type ServerlessDatabase,
  type ServerlessWebSocketDatabaseInstance,
  type ServerlessWebSocketDatabaseOptions,
  type SessionTimeoutDiagnostics,
} from "./drizzle/client/index.js";
export { relations } from "./drizzle/relations.js";
export {
  addCalendarDaysUtc,
  calculateCommission,
  CommissionEngineError,
  formatDateOnlyUtc,
  projectCommissionLiabilitiesFromPaymentTerm,
  type CommissionBreakdownLine,
  type CommissionCalculationInput,
  type CommissionCalculationResult,
  type CommissionMetrics,
  type PaymentTermLineSlice,
  type ProjectedCommissionLiability,
} from "./commissions/index.js";
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
