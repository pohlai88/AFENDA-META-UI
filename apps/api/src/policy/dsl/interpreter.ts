/**
 * Policy DSL — Safe Interpreter
 * ==============================
 * Walks an AST and evaluates it against a context object.
 *
 * Design constraints:
 *   - No access to globals, process, fs, or network
 *   - Side-effect free — read-only context evaluation
 *   - Deterministic — same input → same output (except date fns)
 *   - Maximum recursion depth to prevent stack overflow
 */

import type { AstNode } from "./ast.js";

// ---------------------------------------------------------------------------
// Interpreter Error
// ---------------------------------------------------------------------------

export class InterpreterError extends Error {
  constructor(message: string) {
    super(`DSL runtime error: ${message}`);
    this.name = "InterpreterError";
  }
}

// ---------------------------------------------------------------------------
// Built-in Functions
// ---------------------------------------------------------------------------

type DslFunction = (...args: unknown[]) => unknown;

const BUILTINS: Record<string, DslFunction> = {
  sum(...args: unknown[]): number {
    const items = Array.isArray(args[0]) ? (args[0] as number[]) : args;
    return (items as number[]).reduce((a, b) => Number(a) + Number(b), 0);
  },

  abs(value: unknown): number {
    return Math.abs(Number(value));
  },

  round(value: unknown, decimals?: unknown): number {
    const d = decimals != null ? Number(decimals) : 0;
    const factor = 10 ** d;
    return Math.round(Number(value) * factor) / factor;
  },

  floor(value: unknown): number {
    return Math.floor(Number(value));
  },

  ceil(value: unknown): number {
    return Math.ceil(Number(value));
  },

  len(value: unknown): number {
    if (Array.isArray(value)) return value.length;
    if (typeof value === "string") return value.length;
    return 0;
  },

  min(...args: unknown[]): number {
    const items = Array.isArray(args[0]) ? (args[0] as number[]) : args;
    return Math.min(...(items as number[]).map(Number));
  },

  max(...args: unknown[]): number {
    const items = Array.isArray(args[0]) ? (args[0] as number[]) : args;
    return Math.max(...(items as number[]).map(Number));
  },

  includes(haystack: unknown, needle: unknown): boolean {
    if (Array.isArray(haystack)) return haystack.includes(needle);
    if (typeof haystack === "string") return haystack.includes(String(needle));
    return false;
  },

  today(): string {
    return new Date().toISOString().slice(0, 10);
  },

  now(): string {
    return new Date().toISOString();
  },

  /** Days between two ISO date strings */
  days_between(dateA: unknown, dateB: unknown): number {
    const a = new Date(String(dateA)).getTime();
    const b = new Date(String(dateB)).getTime();
    return Math.floor(Math.abs(b - a) / (1000 * 60 * 60 * 24));
  },

  /** Uppercase */
  upper(value: unknown): string {
    return String(value).toUpperCase();
  },

  /** Lowercase */
  lower(value: unknown): string {
    return String(value).toLowerCase();
  },

  /** Coalesce — return first non-null arg */
  coalesce(...args: unknown[]): unknown {
    for (const a of args) {
      if (a != null && a !== "") return a;
    }
    return null;
  },
};

// ---------------------------------------------------------------------------
// Resolver: resolve dotted identifier paths from a flat or nested context
// ---------------------------------------------------------------------------

function resolveIdentifier(
  name: string,
  context: Record<string, unknown>,
): unknown {
  // Try flat lookup first (pre-flattened by context builder)
  if (name in context) return context[name];

  // Try underscore-flattened version
  const flatKey = name.replace(/\./g, "_");
  if (flatKey in context) return context[flatKey];

  // Try dot-path traversal for nested context
  const parts = name.split(".");
  let current: unknown = context;
  for (const part of parts) {
    if (current == null || typeof current !== "object") return undefined;
    current = (current as Record<string, unknown>)[part];
  }
  return current;
}

// ---------------------------------------------------------------------------
// Interpreter
// ---------------------------------------------------------------------------

const MAX_DEPTH = 100;

export function interpret(
  node: AstNode,
  context: Record<string, unknown>,
  customFunctions?: Record<string, DslFunction>,
  depth = 0,
): unknown {
  if (depth > MAX_DEPTH) {
    throw new InterpreterError("Maximum expression depth exceeded");
  }

  const recurse = (n: AstNode) => interpret(n, context, customFunctions, depth + 1);
  const allFunctions = customFunctions
    ? { ...BUILTINS, ...customFunctions }
    : BUILTINS;

  switch (node.kind) {
    // ── Literals ──────────────────────────────────────────────────────
    case "NumberLiteral":
      return node.value;
    case "StringLiteral":
      return node.value;
    case "BooleanLiteral":
      return node.value;

    // ── Identifier ───────────────────────────────────────────────────
    case "Identifier":
      return resolveIdentifier(node.name, context);

    // ── List ─────────────────────────────────────────────────────────
    case "ListLiteral":
      return node.elements.map(recurse);

    // ── Binary ───────────────────────────────────────────────────────
    case "BinaryExpr": {
      const left = recurse(node.left);
      const right = recurse(node.right);
      return evaluateBinary(node.operator, left, right);
    }

    // ── Logical ──────────────────────────────────────────────────────
    case "LogicalExpr": {
      const left = recurse(node.left);
      if (node.operator === "and") {
        return left ? recurse(node.right) : false;
      }
      // or — short-circuit
      return left ? left : recurse(node.right);
    }

    // ── Unary ────────────────────────────────────────────────────────
    case "UnaryExpr": {
      const operand = recurse(node.operand);
      if (node.operator === "not") return !operand;
      if (node.operator === "-") return -Number(operand);
      return operand;
    }

    // ── Function call ────────────────────────────────────────────────
    case "FunctionCall": {
      const fn = allFunctions[node.name];
      if (!fn) {
        throw new InterpreterError(`Unknown function: ${node.name}`);
      }
      const args = node.args.map(recurse);
      return fn(...args);
    }

    // ── IN expression ────────────────────────────────────────────────
    case "InExpr": {
      const value = recurse(node.value);
      const list = node.list.map(recurse);
      return list.includes(value);
    }

    // ── IF … THEN BLOCK ─────────────────────────────────────────────
    case "IfThenBlock": {
      const condition = recurse(node.condition);
      // Returns true (should block) when condition is truthy
      return Boolean(condition);
    }

    default:
      throw new InterpreterError(`Unknown AST node kind: ${(node as AstNode).kind}`);
  }
}

// ---------------------------------------------------------------------------
// Binary operator evaluation
// ---------------------------------------------------------------------------

function evaluateBinary(op: string, left: unknown, right: unknown): unknown {
  switch (op) {
    // Arithmetic
    case "+": return Number(left) + Number(right);
    case "-": return Number(left) - Number(right);
    case "*": return Number(left) * Number(right);
    case "/": {
      const divisor = Number(right);
      if (divisor === 0) throw new InterpreterError("Division by zero");
      return Number(left) / divisor;
    }

    // Comparison — loose equality for cross-type comparison
    case "==": return left == right;  // eslint-disable-line eqeqeq
    case "!=": return left != right;  // eslint-disable-line eqeqeq
    case ">":  return Number(left) > Number(right);
    case "<":  return Number(left) < Number(right);
    case ">=": return Number(left) >= Number(right);
    case "<=": return Number(left) <= Number(right);

    default:
      throw new InterpreterError(`Unknown operator: ${op}`);
  }
}
