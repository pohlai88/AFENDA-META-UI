/**
 * Engine v2 — Rule Evaluator
 * ===========================
 * Iterates rules against a RuleContext, wraps each check in try/catch,
 * captures timing, and returns evaluated results.
 */

/**
 * @typedef {import('./rule-types.mjs').Rule} Rule
 * @typedef {import('./rule-types.mjs').RuleContext} RuleContext
 * @typedef {import('./rule-types.mjs').EvaluatedRule} EvaluatedRule
 */

/**
 * Run all rules against the given context.
 *
 * @param {Rule[]} rules - Sorted rules from the registry
 * @param {RuleContext} ctx - Context built from extracted schema
 * @returns {EvaluatedRule[]} Evaluation results preserving input order
 */
export function runRules(rules, ctx) {
  /** @type {EvaluatedRule[]} */
  const results = [];

  for (const rule of rules) {
    const start = performance.now();
    /** @type {EvaluatedRule} */
    let evaluated;

    try {
      const result = rule.check(ctx);
      evaluated = {
        id: rule.id,
        table: rule.table,
        type: rule.type,
        severity: rule.severity,
        description: rule.description,
        pass: result.pass,
        message: result.message,
        durationMs: performance.now() - start,
      };
    } catch (err) {
      evaluated = {
        id: rule.id,
        table: rule.table,
        type: rule.type,
        severity: rule.severity,
        description: rule.description,
        pass: false,
        message: `Rule threw an exception: ${err.message}`,
        durationMs: performance.now() - start,
      };
    }

    results.push(evaluated);
  }

  return results;
}
