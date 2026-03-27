/**
 * Engine v2 — SQL Normalizer
 * ===========================
 * Normalizes SQL expressions for semantic comparison.
 * Handles Drizzle template literal interpolation artifacts.
 */

/**
 * Normalize a SQL expression for comparison.
 * - Collapses whitespace
 * - Lowercases
 * - Strips outer parentheses
 * - Normalizes quoted identifiers
 * - Handles Drizzle's ${table.column} interpolation artifacts
 *
 * @param {string} sql - Raw SQL expression
 * @returns {string} Normalized SQL
 */
export function normalize(sql) {
  if (!sql) return '';

  let result = sql;

  // Collapse all whitespace (newlines, tabs, multiple spaces) to single space
  result = result.replace(/\s+/g, ' ').trim();

  // Lowercase for case-insensitive comparison
  result = result.toLowerCase();

  // Remove outer parentheses if balanced
  while (result.startsWith('(') && result.endsWith(')') && isBalancedParens(result)) {
    const inner = result.slice(1, -1);
    // Only strip if the inner parens are still balanced
    if (isBalancedParens(inner) || !inner.includes('(')) {
      result = inner.trim();
    } else {
      break;
    }
  }

  // Normalize double-quoted identifiers → unquoted
  result = result.replace(/"([a-z_][a-z0-9_]*)"/g, '$1');

  return result;
}

/**
 * Check if parentheses are balanced in a string.
 *
 * @param {string} str
 * @returns {boolean}
 */
function isBalancedParens(str) {
  let depth = 0;
  for (const ch of str) {
    if (ch === '(') depth++;
    else if (ch === ')') depth--;
    if (depth < 0) return false;
  }
  return depth === 0;
}
