import { matchingBraceClose, extractArrayAfterKey, splitTopLevelCommaList } from "./schema-brace.mjs";

const SECURITY_TABLE_RE = /export const (\w+) = securitySchema\.table\(\s*["']([^"']+)["']/g;

function escapeRe(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function columnsRegion(content, exportIndex) {
  const sub = content.slice(exportIndex);
  const mo = /\bsecuritySchema\.table\(\s*["'][^"']+["']\s*,/.exec(sub);
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

function fallbackSqlColumn(prop) {
  // Security currently relies on default Drizzle column names for many ID fields.
  // Keep prop name when no explicit SQL identifier is provided.
  return prop;
}

export function listSecurityTablesInFile(content) {
  const out = [];
  SECURITY_TABLE_RE.lastIndex = 0;
  let m;
  while ((m = SECURITY_TABLE_RE.exec(content)) !== null) {
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
 * Extract SECURITY→SECURITY edges from foreignKey() calls.
 * Supports:
 * - single-column FKs
 * - composite tenant-safe FKs (`[tenantId, X] -> [tenantId, X]`)
 */
export function extractSecuritySingleColumnFkEdges(content, fileRel, symbolRegistry) {
  const edges = [];
  const tables = listSecurityTablesInFile(content);
  const securitySqlSet = new Set([...symbolRegistry.values()].map((v) => v.sql));

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

    // Composite tenant-safe edges: record the second leg only (FK column -> referenced ID column)
    if (localParts.length === 2 && foreignParts.length === 2) {
      const lp0 = parseRef(localParts[0]);
      const lp1 = parseRef(localParts[1]);
      const fr0 = parseRef(foreignParts[0]);
      const fr1 = parseRef(foreignParts[1]);
      if (!lp0 || !lp1 || !fr0 || !fr1) continue;
      if (lp0.symbol !== "table" || lp1.symbol !== "table") continue;
      if (fr0.prop !== "tenantId") continue;
      if (fr0.symbol !== fr1.symbol) continue;

      const fromColSecond =
        propToSqlColumn(parent.columnsRegion, lp1.prop) ??
        fallbackSqlColumn(lp1.prop);

      let toTableSql;
      let toColSecond;
      if (fr1.symbol === "table") {
        toTableSql = parent.sql;
        toColSecond =
          propToSqlColumn(parent.columnsRegion, fr1.prop) ??
          fallbackSqlColumn(fr1.prop);
      } else {
        const target = symbolRegistry.get(fr1.symbol);
        if (!target) continue;
        toTableSql = target.sql;
        toColSecond =
          propToSqlColumn(target.columnsRegion, fr1.prop) ??
          fallbackSqlColumn(fr1.prop);
      }

      if (!securitySqlSet.has(parent.sql) || !securitySqlSet.has(toTableSql)) continue;

      const key = `${parent.sql}|${fromColSecond}|${toTableSql}|${toColSecond}`;
      edges.push({
        key,
        fromTable: parent.sql,
        fromCol: fromColSecond,
        toTable: toTableSql,
        toCol: toColSecond,
        line: content.slice(0, m.index).split("\n").length,
      });
      continue;
    }

    if (localParts.length !== 1 || foreignParts.length !== 1) continue;

    const localRef = parseRef(localParts[0]);
    const foreignRef = parseRef(foreignParts[0]);
    if (!localRef || !foreignRef) continue;
    if (localRef.symbol !== "table") continue;

    const fromCol =
      propToSqlColumn(parent.columnsRegion, localRef.prop) ??
      fallbackSqlColumn(localRef.prop);

    let toTableSql;
    let toCol;

    if (foreignRef.symbol === "table") {
      toTableSql = parent.sql;
      toCol =
        propToSqlColumn(parent.columnsRegion, foreignRef.prop) ??
        fallbackSqlColumn(foreignRef.prop);
    } else {
      const target = symbolRegistry.get(foreignRef.symbol);
      if (!target) continue;
      toTableSql = target.sql;
      toCol =
        propToSqlColumn(target.columnsRegion, foreignRef.prop) ??
        fallbackSqlColumn(foreignRef.prop);
    }

    if (!securitySqlSet.has(parent.sql) || !securitySqlSet.has(toTableSql)) continue;

    const key = `${parent.sql}|${fromCol}|${toTableSql}|${toCol}`;
    edges.push({
      key,
      fromTable: parent.sql,
      fromCol,
      toTable: toTableSql,
      toCol,
      line: content.slice(0, m.index).split("\n").length,
    });
  }

  return edges;
}

export function buildSecuritySymbolRegistry(securityAbsolutePaths, readFileSync) {
  const map = new Map();
  for (const abs of securityAbsolutePaths) {
    const content = readFileSync(abs, "utf8");
    for (const t of listSecurityTablesInFile(content)) {
      map.set(t.sym, { sql: t.sql, columnsRegion: t.columnsRegion });
    }
  }
  return map;
}
