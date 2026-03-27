/**
 * @module truth-compiler/sql-utils
 * @description Safe SQL identifier quoting and literal rendering for compiler-generated SQL.
 *
 * All identifier and value output passes through these helpers to prevent
 * injection in compiler-generated DDL artifacts (AD-11).
 *
 * @layer db/truth-compiler
 */

/** Only allow standard SQL identifier characters: letters, digits, underscores. */
const SAFE_IDENTIFIER_RE = /^[a-zA-Z_][a-zA-Z0-9_]*$/;

/**
 * Validates and double-quotes a SQL identifier.
 * Throws if the identifier contains characters outside [a-zA-Z_][a-zA-Z0-9_]*.
 */
export function quoteIdentifier(name: string): string {
  if (!SAFE_IDENTIFIER_RE.test(name)) {
    throw new Error(
      `truth-compiler: unsafe identifier "${name}" — identifiers must match [a-zA-Z_][a-zA-Z0-9_]*`
    );
  }
  return `"${name}"`;
}

/**
 * Renders a SQL literal from an unknown scalar value.
 * - number → raw numeric literal
 * - boolean → TRUE / FALSE
 * - string → single-quoted with `'` escaped as `''`
 * - null / undefined → NULL
 * - Array → ARRAY[...] (for IN / NOT IN usage)
 */
export function renderLiteral(value: unknown): string {
  if (value === null || value === undefined) return "NULL";
  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      throw new Error(`truth-compiler: non-finite numeric literal ${String(value)}`);
    }
    return String(value);
  }
  if (typeof value === "boolean") return value ? "TRUE" : "FALSE";
  if (typeof value === "string") {
    // Standard SQL escaping: double single-quotes
    return `'${value.replace(/'/g, "''")}'`;
  }
  if (Array.isArray(value)) {
    return `ARRAY[${value.map(renderLiteral).join(", ")}]`;
  }
  throw new Error(
    `truth-compiler: unsupported literal type "${typeof value}" — only scalar values and arrays are supported`
  );
}

/**
 * Sanitises an arbitrary string into a valid SQL identifier fragment.
 * Replaces any character outside [a-zA-Z0-9_] with an underscore.
 * Used when constructing generated names (function names, constraint names).
 */
export function toSnakeIdentifier(value: string): string {
  return value.replace(/[^a-zA-Z0-9_]/g, "_").replace(/^(\d)/, "_$1");
}
