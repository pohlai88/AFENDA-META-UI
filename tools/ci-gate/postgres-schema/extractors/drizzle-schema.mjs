/**
 * Engine v2 — Drizzle Schema Extractor
 * ======================================
 * AST-free regex extraction from Drizzle .ts source files.
 * Reads raw text and builds a TruthModel for rule evaluation.
 *
 * IMPORTANT: handles both {schema}.table() and pgTable() patterns.
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * @typedef {import('../engine/rule-types.mjs').TruthModel} TruthModel
 * @typedef {import('../engine/rule-types.mjs').TableModel} TableModel
 */

/**
 * Extract a TruthModel from a Drizzle schema source file.
 *
 * @param {string} filePath - Path to the .ts schema file (relative to repo root or absolute)
 * @param {{ silent?: boolean }} [options]
 * @returns {TruthModel}
 */
export function extractSchema(filePath, options = {}) {
  const silent = Boolean(options.silent);
  const absolutePath = resolve(filePath);
  const source = readFileSync(absolutePath, "utf-8");

  /** @type {Record<string, TableModel>} */
  const tables = {};
  const tableBlocks = splitTableBlocks(source);

  for (const block of tableBlocks) {
    try {
      const model = parseTableBlock(block.name, block.body);
      tables[block.name] = model;
    } catch {
      // Emit a parseable entry so the reporter can show which tables failed
      tables[block.name] = createEmptyTableModel();
      tables[block.name]._parseError = true;
    }
  }

  if (!silent) {
    console.log(`  Extracted ${Object.keys(tables).length} table(s) from ${filePath}`);

    const parseErrors = Object.entries(tables).filter(([, t]) => t._parseError);
    if (parseErrors.length > 0) {
      console.log(`  ⚠ Parse errors in: ${parseErrors.map(([n]) => n).join(", ")}`);
    }
  }

  return { tables };
}

/**
 * Split source into table blocks by finding *.table("name", ...) or pgTable("name", ...) patterns.
 * We find each table declaration and extract the body up to
 * the matching closing `);\n`.
 *
 * @param {string} source
 * @returns {Array<{name: string, body: string}>}
 */
function splitTableBlocks(source) {
  const blocks = [];
  // Match either:
  // - someSchema.table("table_name", ...)
  // - pgTable("table_name", ...)
  const tableStartRe = /(?:\w+Schema\.table|pgTable)\(\s*\n?\s*"([^"]+)"/g;
  let match;

  while ((match = tableStartRe.exec(source)) !== null) {
    const tableName = match[1];
    const startIdx = match.index;

    // Find the end of the table definition: matching the opening paren of .table(
    const parenStart = source.indexOf("(", startIdx + "salesSchema.table".length);
    const endIdx = findMatchingParen(source, parenStart);

    if (endIdx === -1) {
      // Can't find matching paren, skip
      continue;
    }

    const body = source.slice(parenStart + 1, endIdx);
    blocks.push({ name: tableName, body });
  }

  return blocks;
}

/**
 * Find the index of the matching closing parenthesis.
 *
 * @param {string} source
 * @param {number} openIdx - Index of the opening '('
 * @returns {number} Index of matching ')' or -1
 */
function findMatchingParen(source, openIdx) {
  let depth = 0;
  let inString = false;
  let stringChar = "";
  let inTemplate = false;
  let templateDepth = 0;

  for (let i = openIdx; i < source.length; i++) {
    const ch = source[i];
    const prev = i > 0 ? source[i - 1] : "";

    // Handle string literals
    if (!inString && !inTemplate && (ch === '"' || ch === "'")) {
      inString = true;
      stringChar = ch;
      continue;
    }
    if (inString && ch === stringChar && prev !== "\\") {
      inString = false;
      continue;
    }
    if (inString) continue;

    // Handle template literals
    if (!inTemplate && ch === "`") {
      inTemplate = true;
      templateDepth = 0;
      continue;
    }
    if (inTemplate && ch === "`" && prev !== "\\") {
      inTemplate = false;
      continue;
    }
    if (inTemplate) {
      // Track ${...} interpolation depth but stay in template
      if (ch === "$" && i + 1 < source.length && source[i + 1] === "{") {
        templateDepth++;
      }
      if (ch === "}" && templateDepth > 0) {
        templateDepth--;
      }
      continue;
    }

    // Track parentheses
    if (ch === "(") depth++;
    if (ch === ")") {
      depth--;
      if (depth === 0) return i;
    }
  }

  return -1;
}

/**
 * Parse a single table block body into a TableModel.
 *
 * @param {string} tableName
 * @param {string} body
 * @returns {TableModel}
 */
function parseTableBlock(tableName, body) {
  // Split into columns part and constraints part
  // The pattern is: { columns... }, (table) => [ constraints... ]
  const constraintStart = body.search(/\(table\)\s*=>/);
  const columnsBody = constraintStart > -1 ? body.slice(0, constraintStart) : body;
  const constraintsBody = constraintStart > -1 ? body.slice(constraintStart) : "";

  return {
    columns: extractColumns(columnsBody),
    checks: extractChecks(constraintsBody),
    fks: extractForeignKeys(constraintsBody),
    indexes: extractIndexes(constraintsBody),
    policies: [],
    enumColumns: extractEnumColumns(columnsBody),
    hasAuditColumns: /\.\.\.auditColumns/.test(columnsBody),
    hasTimestampColumns: /\.\.\.timestampColumns/.test(columnsBody),
    hasSoftDeleteColumns: /\.\.\.softDeleteColumns/.test(columnsBody),
    hasTenantIsolation:
      new RegExp(`\\.\\.\\.tenantIsolationPolicies\\(\\s*["']${escapeRegex(tableName)}["']`).test(
        constraintsBody
      ) || /\.\.\.tenantIsolationPolicies\(/.test(constraintsBody),
    hasServiceBypass:
      new RegExp(`serviceBypassPolicy\\(\\s*["']${escapeRegex(tableName)}["']`).test(
        constraintsBody
      ) || /serviceBypassPolicy\(/.test(constraintsBody),
  };
}

/**
 * Extract column names from the columns definition block.
 *
 * @param {string} body
 * @returns {string[]}
 */
function extractColumns(body) {
  const columns = [];

  // Match explicit column definitions: columnName: type("db_column_name")
  const colRe = /(\w+)\s*:\s*(?:uuid|integer|text|boolean|numeric|timestamp)\s*\(\s*"([^"]+)"/g;
  let m;
  while ((m = colRe.exec(body)) !== null) {
    columns.push(m[2]); // Use the SQL column name (second arg)
  }

  // Match enum columns: enumName("db_column_name")
  const enumColRe = /\w+Enum\s*\(\s*"([^"]+)"/g;
  while ((m = enumColRe.exec(body)) !== null) {
    columns.push(m[1]);
  }

  // Add spread columns
  if (/\.\.\.auditColumns/.test(body)) {
    columns.push("created_by", "updated_by");
  }
  if (/\.\.\.timestampColumns/.test(body)) {
    columns.push("created_at", "updated_at");
  }
  if (/\.\.\.softDeleteColumns/.test(body)) {
    columns.push("deleted_at");
  }
  if (/\.\.\.nameColumn/.test(body)) {
    columns.push("name");
  }

  return [...new Set(columns)];
}

/**
 * Extract CHECK constraint definitions.
 *
 * @param {string} body
 * @returns {Array<{name: string, sql: string}>}
 */
function extractChecks(body) {
  const checks = [];
  // Match: check("constraint_name", sql`...`)
  // Also match multi-line: check(\n  "name",\n  sql`...`\n)
  const checkRe = /check\(\s*"([^"]+)"\s*,\s*sql`([^`]*)`/gs;
  let m;
  while ((m = checkRe.exec(body)) !== null) {
    checks.push({
      name: m[1],
      sql: m[2].trim(),
    });
  }
  return checks;
}

/**
 * Extract foreign key definitions.
 *
 * @param {string} body
 * @returns {Array<{name: string, columns: string[]}>}
 */
function extractForeignKeys(body) {
  const fks = [];
  // Match: foreignKey({ ... name: "fk_name" ... })
  const fkRe = /foreignKey\(\s*\{[^}]*name:\s*"([^"]+)"[^}]*\}/gs;
  let m;
  while ((m = fkRe.exec(body)) !== null) {
    fks.push({ name: m[1], columns: [] });
  }
  return fks;
}

/**
 * Extract index definitions (regular and unique).
 *
 * @param {string} body
 * @returns {Array<{name: string, columns: string[], unique: boolean}>}
 */
function extractIndexes(body) {
  const indexes = [];

  // Match: index("name").on(...)
  const indexRe = /index\(\s*"([^"]+)"\s*\)/g;
  let m;
  while ((m = indexRe.exec(body)) !== null) {
    indexes.push({ name: m[1], columns: [], unique: false });
  }

  // Match: uniqueIndex("name").on(...)
  const uqRe = /uniqueIndex\(\s*"([^"]+)"\s*\)/g;
  while ((m = uqRe.exec(body)) !== null) {
    indexes.push({ name: m[1], columns: [], unique: true });
  }

  return indexes;
}

/**
 * Extract enum column usage patterns.
 *
 * @param {string} body
 * @returns {Array<{name: string, values: string[]}>}
 */
function extractEnumColumns(body) {
  const enums = [];
  // Match: someEnum("column_name")
  const enumRe = /(\w+Enum)\s*\(\s*"([^"]+)"/g;
  let m;
  while ((m = enumRe.exec(body)) !== null) {
    enums.push({
      name: m[2], // column name
      enumRef: m[1], // reference to the enum variable
      values: [], // Will be resolved by rule checks if needed
    });
  }
  return enums;
}

/**
 * Escape special regex characters.
 *
 * @param {string} str
 * @returns {string}
 */
function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Create an empty table model for parse-error fallback.
 *
 * @returns {TableModel}
 */
function createEmptyTableModel() {
  return {
    columns: [],
    checks: [],
    fks: [],
    indexes: [],
    policies: [],
    enumColumns: [],
    hasAuditColumns: false,
    hasTimestampColumns: false,
    hasSoftDeleteColumns: false,
    hasTenantIsolation: false,
    hasServiceBypass: false,
  };
}
