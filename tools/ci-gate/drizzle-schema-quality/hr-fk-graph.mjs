import { matchingBraceClose, extractArrayAfterKey, splitTopLevelCommaList } from "./schema-brace.mjs";

const HR_TABLE_RE = /export const (\w+) = hrSchema\.table\(\s*["']([^"']+)["']/g;

function escapeRe(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Drizzle columns object `{ ... }` after table("name", .
 *
 * @param {string} content
 * @param {number} exportIndex - index of `export const`
 */
function columnsRegion(content, exportIndex) {
  const sub = content.slice(exportIndex);
  const mo = /\bhrSchema\.table\(\s*["'][^"']+["']\s*,/.exec(sub);
  if (!mo) return "";
  const rel = exportIndex + mo.index + mo[0].length;
  const open = content.indexOf("{", rel - 1);
  if (open < 0) return "";
  const close = matchingBraceClose(content, open);
  if (close < 0) return "";
  return content.slice(open, close + 1);
}

/**
 * @param {string} region - columns object text
 * @param {string} prop - e.g. departmentId
 */
function propToSqlColumn(region, prop) {
  const rex = new RegExp(`\\b${escapeRe(prop)}:\\s*[^,\\n]+?\\(\\s*["']([^"']+)["']`);
  const m = region.match(rex);
  return m ? m[1] : null;
}

/**
 * @param {string} content
 * @returns {{ sym: string, sql: string, exportIndex: number, columnsRegion: string }[]}
 */
export function listHrTablesInFile(content) {
  /** @type {{ sym: string, sql: string, exportIndex: number, columnsRegion: string }[]} */
  const out = [];
  HR_TABLE_RE.lastIndex = 0;
  let m;
  while ((m = HR_TABLE_RE.exec(content)) !== null) {
    const sym = m[1];
    const sql = m[2];
    const exportIndex = m.index;
    out.push({
      sym,
      sql,
      exportIndex,
      columnsRegion: columnsRegion(content, exportIndex),
    });
  }
  return out;
}

function tableForFkIndex(tables, fkIndex) {
  for (let i = tables.length - 1; i >= 0; i--) {
    const t = tables[i];
    const nextStart = tables[i + 1]?.exportIndex ?? Number.POSITIVE_INFINITY;
    if (t.exportIndex <= fkIndex && fkIndex < nextStart) return t;
  }
  return null;
}

function parseRef(refExpr) {
  const n = refExpr.replace(/\s/g, "");
  const dot = n.indexOf(".");
  if (dot < 0) return null;
  return { symbol: n.slice(0, dot), prop: n.slice(dot + 1) };
}

/**
 * @typedef {{ key: string, fromTable: string, fromCol: string, toTable: string, toCol: string, line: number }} HrFkEdge
 */

/**
 * Single-column HR→HR (or self) FKs only; skips composite and external targets.
 *
 * @param {string} content
 * @param {string} fileRel - repo-relative posix
 * @param {Map<string, { sql: string, columnsRegion: string }>} symbolRegistry
 */
export function extractHrSingleColumnFkEdges(content, fileRel, symbolRegistry) {
  /** @type {HrFkEdge[]} */
  const edges = [];
  const tables = listHrTablesInFile(content);
  const hrSqlSet = new Set([...symbolRegistry.values()].map((v) => v.sql));

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

    const localParts = splitTopLevelCommaList(colsInner);
    const foreignParts = splitTopLevelCommaList(foreignInner);
    const parent = tableForFkIndex(tables, m.index);
    if (!parent) continue;

    const norm = (s) => s.replace(/\s/g, "");

    /**
     * Composite tenant+id FK: catalog documents only the second leg (child.fk_col → target.id).
     * (A) Cross-table: foreignColumns: [OtherTable.tenantId, OtherTable.id]
     * (B) Self-table: foreignColumns: [table.tenantId, table.id]
     */
    if (localParts.length === 2 && foreignParts.length === 2) {
      const fr0 = parseRef(foreignParts[0]);
      const fr1 = parseRef(foreignParts[1]);
      const lp0 = parseRef(localParts[0]);
      const lp1 = parseRef(localParts[1]);
      if (!fr0 || !fr1 || !lp0 || !lp1) {
        /* fall through */
      } else if (
        fr0.symbol === fr1.symbol &&
        fr0.prop === "tenantId" &&
        fr1.prop === "id" &&
        lp0.symbol === "table" &&
        lp1.symbol === "table"
      ) {
        const fromColSecond =
          propToSqlColumn(parent.columnsRegion, lp1.prop) ??
          lp1.prop.replace(/([A-Z])/g, "_$1").replace(/^_/, "").toLowerCase();
        const line = content.slice(0, m.index).split("\n").length;

        if (fr0.symbol === "table") {
          if (hrSqlSet.has(parent.sql)) {
            const key = `${parent.sql}|${fromColSecond}|${parent.sql}|id`;
            edges.push({
              key,
              fromTable: parent.sql,
              fromCol: fromColSecond,
              toTable: parent.sql,
              toCol: "id",
              line,
            });
          }
        } else {
          const target = symbolRegistry.get(fr0.symbol);
          if (target && hrSqlSet.has(parent.sql) && hrSqlSet.has(target.sql)) {
            const key = `${parent.sql}|${fromColSecond}|${target.sql}|id`;
            edges.push({
              key,
              fromTable: parent.sql,
              fromCol: fromColSecond,
              toTable: target.sql,
              toCol: "id",
              line,
            });
          }
        }
      }
      continue;
    }

    if (localParts.length !== 1 || foreignParts.length !== 1) continue;

    const localRef = parseRef(localParts[0]);
    const foreignRef = parseRef(foreignParts[0]);
    if (!localRef || !foreignRef) continue;
    if (localRef.symbol !== "table") continue;

    const fromCol =
      propToSqlColumn(parent.columnsRegion, localRef.prop) ??
      localRef.prop.replace(/([A-Z])/g, "_$1").replace(/^_/, "").toLowerCase();

    let toTableSql;
    let toCol;

    if (foreignRef.symbol === "table") {
      toTableSql = parent.sql;
      toCol =
        propToSqlColumn(parent.columnsRegion, foreignRef.prop) ??
        foreignRef.prop.replace(/([A-Z])/g, "_$1").replace(/^_/, "").toLowerCase();
    } else {
      const target = symbolRegistry.get(foreignRef.symbol);
      if (!target) continue;
      toTableSql = target.sql;
      toCol =
        propToSqlColumn(target.columnsRegion, foreignRef.prop) ??
        foreignRef.prop.replace(/([A-Z])/g, "_$1").replace(/^_/, "").toLowerCase();
    }

    if (!hrSqlSet.has(parent.sql) || !hrSqlSet.has(toTableSql)) continue;

    const fromTable = parent.sql;
    const key = `${fromTable}|${fromCol}|${toTableSql}|${toCol}`;
    edges.push({
      key,
      fromTable,
      fromCol,
      toTable: toTableSql,
      toCol,
      line: content.slice(0, m.index).split("\n").length,
    });
  }

  return edges;
}

/**
 * @param {string[]} hrAbsolutePaths
 * @param {(p: string, enc: BufferEncoding) => string} readFileSync
 * @returns {Map<string, { sql: string, columnsRegion: string }>}
 */
export function buildHrSymbolRegistry(hrAbsolutePaths, readFileSync) {
  /** @type {Map<string, { sql: string, columnsRegion: string }>} */
  const map = new Map();
  for (const abs of hrAbsolutePaths) {
    const content = readFileSync(abs, "utf8");
    for (const t of listHrTablesInFile(content)) {
      map.set(t.sym, { sql: t.sql, columnsRegion: t.columnsRegion });
    }
  }
  return map;
}
