import { matchingBraceClose, extractArrayAfterKey, splitTopLevelCommaList } from "./schema-brace.mjs";

const SALES_TABLE_RE = /export const (\w+) = salesSchema\.table\(\s*["']([^"']+)["']/g;

function escapeRe(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function columnsRegion(content, exportIndex) {
  const sub = content.slice(exportIndex);
  const mo = /\bsalesSchema\.table\(\s*["'][^"']+["']\s*,/.exec(sub);
  if (!mo) return "";
  const rel = exportIndex + mo.index + mo[0].length;
  const open = content.indexOf("{", rel - 1);
  if (open < 0) return "";
  const close = matchingBraceClose(content, open);
  if (close < 0) return "";
  return content.slice(open, close + 1);
}

function propToSqlColumn(region, prop) {
  const rex = new RegExp(`\\b${escapeRe(prop)}:\\s*[^,\\n]+?\\(\\s*["']([^"']+)["']`);
  const m = region.match(rex);
  return m ? m[1] : null;
}

export function listSalesTablesInFile(content) {
  const out = [];
  SALES_TABLE_RE.lastIndex = 0;
  let m;
  while ((m = SALES_TABLE_RE.exec(content)) !== null) {
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

export function extractSalesSingleColumnFkEdges(content, fileRel, symbolRegistry) {
  const edges = [];
  const tables = listSalesTablesInFile(content);
  const salesSqlSet = new Set([...symbolRegistry.values()].map((v) => v.sql));

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

    if (!salesSqlSet.has(parent.sql) || !salesSqlSet.has(toTableSql)) continue;

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

export function buildSalesSymbolRegistry(salesAbsolutePaths, readFileSync) {
  const map = new Map();
  for (const abs of salesAbsolutePaths) {
    const content = readFileSync(abs, "utf8");
    for (const t of listSalesTablesInFile(content)) {
      map.set(t.sym, { sql: t.sql, columnsRegion: t.columnsRegion });
    }
  }
  return map;
}
