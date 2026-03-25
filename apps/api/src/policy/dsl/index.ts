/**
 * Policy DSL — Public API
 * =======================
 * Barrel that exposes the full tokenizer → parser → interpreter pipeline
 * as a single `evaluate` / `evaluateCondition` interface.
 *
 * This replaces the filtrex-based evaluator in `policyDSL.ts`.
 */

export { tokenize, TokenizerError } from "./tokenizer.js";
export type { Token, TokenType } from "./tokenizer.js";

export { parse, Parser, ParseError } from "./parser.js";
export type { AstNode } from "./ast.js";

export { interpret, InterpreterError } from "./interpreter.js";

import { tokenize } from "./tokenizer.js";
import { parse } from "./parser.js";
import { interpret } from "./interpreter.js";

// ---------------------------------------------------------------------------
// High-level API (drop-in replacement for filtrex-based policyDSL)
// ---------------------------------------------------------------------------

export interface DslEvaluationResult {
  value: unknown;
  error?: string;
}

/**
 * Evaluate a DSL expression string against a flat context.
 *
 * Pipeline: source → tokens → AST → interpret → value
 */
export function evaluate(
  expression: string,
  context: Record<string, unknown>
): DslEvaluationResult {
  try {
    const tokens = tokenize(expression);
    const ast = parse(tokens);
    const value = interpret(ast, context);
    return { value };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return { value: undefined, error: message };
  }
}

/**
 * Evaluate a DSL expression and coerce the result to a boolean.
 */
export function evaluateCondition(
  expression: string,
  context: Record<string, unknown>
): { result: boolean; error?: string } {
  const { value, error } = evaluate(expression, context);
  if (error) return { result: false, error };
  return { result: Boolean(value) };
}
