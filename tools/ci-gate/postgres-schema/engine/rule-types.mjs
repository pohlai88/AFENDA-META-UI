/**
 * Engine v2 — Rule Type Definitions
 * ==================================
 * JSDoc-typed contracts for the Business Truth Engine.
 * No TypeScript build step — pure .mjs with JSDoc annotations.
 */

/**
 * @typedef {'constraint-exists' | 'constraint-semantic' | 'state-machine' | 'tenant' | 'audit' | 'derived'} RuleType
 */

/**
 * @typedef {'error' | 'warn'} Severity
 */

/**
 * @typedef {Object} RuleResult
 * @property {boolean} pass - Whether the rule passed
 * @property {string} [message] - Diagnostic message when the rule fails
 */

/**
 * @typedef {Object} Rule
 * @property {string} id - Unique rule identifier (e.g. "SO-001", "TENANT-sales_orders")
 * @property {string} table - Target table name (e.g. "sales_orders")
 * @property {RuleType} type - Rule category
 * @property {Severity} severity - error = fail CI, warn = advisory
 * @property {string} description - Human-readable description of the rule
 * @property {(ctx: RuleContext) => RuleResult} check - Rule evaluation function
 */

/**
 * @typedef {Object} TableModel
 * @property {string[]} columns - Column names
 * @property {Array<{name: string, sql: string}>} checks - CHECK constraints
 * @property {Array<{name: string, columns: string[], references?: string, onDelete?: string, onUpdate?: string}>} fks - Foreign keys
 * @property {Array<{name: string, columns: string[], unique?: boolean, where?: string}>} indexes - Indexes
 * @property {Array<{name: string}>} policies - RLS policies
 * @property {Array<{name: string, values: string[]}>} enumColumns - Columns with enum types
 * @property {boolean} hasAuditColumns - Whether ...auditColumns is spread
 * @property {boolean} hasTimestampColumns - Whether ...timestampColumns is spread
 * @property {boolean} hasSoftDeleteColumns - Whether ...softDeleteColumns is spread
 * @property {boolean} hasTenantIsolation - Whether tenantIsolationPolicies() is used
 * @property {boolean} hasServiceBypass - Whether serviceBypassPolicy() is used
 */

/**
 * @typedef {Object} TruthModel
 * @property {Record<string, TableModel>} tables - Map of table name → table model
 */

/**
 * @typedef {Object} RuleContext
 * @property {TruthModel} schema - Extracted truth model from Drizzle schema
 */

/**
 * @typedef {Object} EvaluatedRule
 * @property {string} id - Rule ID
 * @property {string} table - Target table
 * @property {RuleType} type - Rule category
 * @property {Severity} severity - error or warn
 * @property {string} description - Human-readable description
 * @property {boolean} pass - Whether the rule passed
 * @property {string} [message] - Diagnostic message on failure
 * @property {number} durationMs - Evaluation time in milliseconds
 */

export const RULE_TYPES = /** @type {const} */ ({
  CONSTRAINT_EXISTS: 'constraint-exists',
  CONSTRAINT_SEMANTIC: 'constraint-semantic',
  STATE_MACHINE: 'state-machine',
  TENANT: 'tenant',
  AUDIT: 'audit',
  DERIVED: 'derived',
});

export const SEVERITIES = /** @type {const} */ ({
  ERROR: 'error',
  WARN: 'warn',
});
