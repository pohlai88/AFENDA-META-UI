import { RULE_IDS } from "../rule-ids.mjs";
import { toRepoRelative } from "../config.mjs";
import {
  matchingBraceClose,
  extractArrayAfterKey,
  splitTopLevelCommaList,
} from "../schema-brace.mjs";

function normalizeRef(s) {
  return s.replace(/\s/g, "");
}

/**
 * Composite FK targeting employees (tenant + id) in standard Drizzle order.
 */
function isEmployeesCompositeForeignColumns(foreignInner) {
  const refs = splitTopLevelCommaList(foreignInner).map(normalizeRef);
  return (
    refs.length === 2 &&
    refs[0] === "employees.tenantId" &&
    refs[1] === "employees.id"
  );
}

function localColumnsTenantFirst(columnsInner) {
  const refs = splitTopLevelCommaList(columnsInner).map(normalizeRef);
  if (refs.length === 0) return true;
  return refs[0] === "table.tenantId";
}

/**
 * @param {string} content
 * @param {string} absolutePath
 * @returns {import('../rule-ids.mjs').Finding[]}
 */
export function run(content, absolutePath) {
  const file = toRepoRelative(absolutePath);
  /** @type {import('../rule-ids.mjs').Finding[]} */
  const out = [];

  const fkRe = /foreignKey\s*\(\s*\{/g;
  let m;
  while ((m = fkRe.exec(content)) !== null) {
    const braceOpen = m.index + m[0].length - 1;
    const braceClose = matchingBraceClose(content, braceOpen);
    if (braceClose < 0) continue;

    const body = content.slice(braceOpen + 1, braceClose);
    const colsInner = extractArrayAfterKey(body, "columns");
    const foreignInner = extractArrayAfterKey(body, "foreignColumns");
    if (colsInner == null || foreignInner == null) continue;

    if (!isEmployeesCompositeForeignColumns(foreignInner)) continue;
    if (localColumnsTenantFirst(colsInner)) continue;

    const line = lineNumberAtIndex(content, m.index);
    const preview = colsInner.replace(/\s+/g, " ").slice(0, 140);
    out.push({
      ruleId: RULE_IDS.FK_TENANT_ORDER,
      file,
      table: "*",
      line,
      message: `Composite FK to employees must list table.tenantId first in columns (foreignColumns: [employees.tenantId, employees.id]). Got: ${preview}${colsInner.length > 140 ? "…" : ""}`,
    });
  }

  return out;
}

function lineNumberAtIndex(source, index) {
  return source.slice(0, index).split("\n").length;
}
