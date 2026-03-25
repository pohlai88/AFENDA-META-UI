/**
 * Policy DSL — Safe Expression Evaluator
 * =======================================
 * Delegates to the custom tokenizer → AST → interpreter pipeline
 * in `./dsl/` for a first-class, grammar-defined DSL.
 *
 * The old filtrex-based evaluator is replaced; this module keeps
 * the same public interface so callers don't need changes.
 *
 * Supported expressions:
 *   - Comparisons:  `status == "posted"`, `age >= 18`
 *   - Arithmetic:   `price * qty`, `total - discount`
 *   - Built-in fns: `sum(lines_amount)`, `abs(balance)`, `len(items)`
 *   - Logical:      `status == "active" AND role != "guest"`
 *   - IN operator:  `role IN ["admin", "manager"]`
 *   - Conditional:  `IF vendor.blacklisted == true THEN BLOCK`
 *   - Grouping:     `(a + b) * c`
 *
 * All evaluation is sandboxed — no access to globals, fs, etc.
 */

import {
  evaluate,
  evaluateCondition as dslEvaluateCondition,
} from "./dsl/index.js";

// Re-export the result type for backward compatibility
export type { DslEvaluationResult } from "./dsl/index.js";

/**
 * Evaluate a DSL expression against a flat key-value context.
 *
 * Pipeline: source → tokenizer → AST → safe interpreter → value
 */
export function evaluateExpression(
  expression: string,
  context: Record<string, unknown>,
): { value: unknown; error?: string } {
  return evaluate(expression, context);
}

/**
 * Evaluate a DSL expression and coerce the result to a boolean.
 * Truthy values → true, falsy → false.
 */
export function evaluateCondition(
  expression: string,
  context: Record<string, unknown>,
): { result: boolean; error?: string } {
  return dslEvaluateCondition(expression, context);
}
