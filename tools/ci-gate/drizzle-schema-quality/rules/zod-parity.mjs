import { RULE_IDS } from "../rule-ids.mjs";
import { toRepoRelative } from "../config.mjs";
import { matchingBraceClose } from "../schema-brace.mjs";
import { listHrTablesInFile } from "../hr-fk-graph.mjs";

function escapeRe(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * `departments` → insertDepartmentSchema; `costCenters` → insertCostCenterSchema (trailing s dropped).
 *
 * @param {string} tableExport
 */
function expectedInsertSchemaName(tableExport) {
  let base = tableExport;
  if (base.endsWith("s") && !base.endsWith("ss") && base.length > 1) {
    base = base.slice(0, -1);
  }
  const pascal = base[0].toUpperCase() + base.slice(1);
  return `insert${pascal}Schema`;
}

/**
 * @param {string} content
 * @returns {{ name: string, body: string, line: number }[]}
 */
function findInsertSchemaBodies(content) {
  /** @type {{ name: string, body: string, line: number }[]} */
  const out = [];
  const re = /export const (insert\w+Schema)\s*=\s*z/g;
  let m;
  while ((m = re.exec(content)) !== null) {
    let i = m.index + m[0].length;
    while (i < content.length && /\s/.test(content[i])) i++;
    if (content[i] === ".") {
      i++;
      while (i < content.length && /\s/.test(content[i])) i++;
      if (content.slice(i, i + 6) !== "object") continue;
      i += 6;
    } else continue;
    while (i < content.length && /\s/.test(content[i])) i++;
    if (content[i] !== "(") continue;
    i++;
    while (i < content.length && /\s/.test(content[i])) i++;
    if (content[i] !== "{") continue;
    const open = i;
    const close = matchingBraceClose(content, open);
    if (close < 0) continue;
    const body = content.slice(open, close + 1);
    out.push({
      name: m[1],
      body,
      line: content.slice(0, m.index).split("\n").length,
    });
  }
  return out;
}

/**
 * UUID FK props on table (excludes primary `id`).
 *
 * @param {string} columnsRegion
 * @returns {string[]}
 */
function uuidFkProps(columnsRegion) {
  const props = [];
  const r = /\b(\w+Id):\s*uuid\(/g;
  let m;
  while ((m = r.exec(columnsRegion)) !== null) {
    if (m[1] !== "id") props.push(m[1]);
  }
  return props;
}

/**
 * @param {string} abs
 */
function isHrDataSchemaAbs(abs) {
  const n = abs.replace(/\\/g, "/");
  if (!n.includes("/packages/db/src/schema/hr/")) return false;
  const base = n.split("/").pop() ?? "";
  if (base.startsWith("_") || base === "index.ts") return false;
  return true;
}

/**
 * @param {string} content
 * @param {string} absolutePath
 * @returns {import('../rule-ids.mjs').Finding[]}
 */
export function run(content, absolutePath) {
  if (!isHrDataSchemaAbs(absolutePath)) return [];

  const file = toRepoRelative(absolutePath);
  const tables = listHrTablesInFile(content);
  const inserts = findInsertSchemaBodies(content);
  if (tables.length === 0 || inserts.length === 0) {
    return [];
  }

  const insertByName = new Map(inserts.map((x) => [x.name, x]));

  /** @type {import('../rule-ids.mjs').Finding[]} */
  const out = [];

  for (const t of tables) {
    const expectName = expectedInsertSchemaName(t.sym);
    const ins = insertByName.get(expectName);
    if (!ins) continue;
    const slice = ins.body;

    if (/\btenantId:\s*integer\(/s.test(t.columnsRegion)) {
      if (/\btenantId:\s*z\.uuid\(\)/.test(slice)) {
        out.push({
          ruleId: RULE_IDS.ZOD_PARITY,
          file,
          table: t.sql,
          line: ins.line,
          message: `${ins.name}: tenantId is integer in Drizzle but z.uuid() in insert schema — use hrTenantIdSchema or z.number().int() (or equivalent).`,
        });
      }
    }

    for (const prop of uuidFkProps(t.columnsRegion)) {
      const branded = new RegExp(`\\b${escapeRe(prop)}:\\s*\\w+IdSchema`);
      const zuuid = new RegExp(`\\b${escapeRe(prop)}:\\s*z\\.uuid\\(`);
      const znum = new RegExp(`\\b${escapeRe(prop)}:\\s*z\\.number\\(`);
      if (branded.test(slice) || zuuid.test(slice)) continue;
      if (znum.test(slice)) {
        out.push({
          ruleId: RULE_IDS.ZOD_PARITY,
          file,
          table: t.sql,
          line: ins.line,
          message: `${ins.name}: ${prop} is uuid() in Drizzle but z.number() in insert schema — use a branded *IdSchema or z.uuid().`,
        });
      }
    }
  }

  return out;
}
