/**
 * Parse *_relations.ts entries (`from`, `to`, `kind`, `fromField`, `toField`) into physical FK edges.
 */

/**
 * @typedef {{ key: string, fromTable: string, fromCol: string, toTable: string, toCol: string }} CatalogEdge
 */

/**
 * @param {string} kind
 * @param {string} from
 * @param {string} to
 * @param {string} fromField
 * @param {string} toField
 * @returns {{ fromTable: string, fromCol: string, toTable: string, toCol: string } | null}
 */
export function catalogEntryToPhysical(kind, from, to, fromField, toField) {
  if (kind === "one-to-many") {
    return { fromTable: to, fromCol: toField, toTable: from, toCol: fromField };
  }
  if (kind === "many-to-one") {
    return { fromTable: from, fromCol: fromField, toTable: to, toCol: toField };
  }
  if (kind === "self-reference") {
    return { fromTable: from, fromCol: fromField, toTable: to, toCol: toField };
  }
  return null;
}

/**
 * @param {string} content - _relations.ts source
 * @param {Set<string>} hrTableSqlSet
 * @returns {CatalogEdge[]}
 */
export function parseHrRelationsCatalog(content, hrTableSqlSet) {
  /** @type {CatalogEdge[]} */
  const out = [];

  // Optional trailing onDelete/onUpdate (security _relations parity with Drizzle); ignored for edge keys.
  const entryRe =
    /\bfrom:\s*"([^"]+)"\s*,\s*to:\s*"([^"]+)"\s*,\s*kind:\s*"([^"]+)"\s*,\s*fromField:\s*"([^"]+)"\s*,\s*toField:\s*"([^"]+)"(?:\s*,\s*onDelete:\s*"([^"]+)")?(?:\s*,\s*onUpdate:\s*"([^"]+)")?/g;

  const seen = new Set();
  let m;
  while ((m = entryRe.exec(content)) !== null) {
    const [, from, to, kind, fromField, toField] = m;
    const phys = catalogEntryToPhysical(kind, from, to, fromField, toField);
    if (!phys) continue;
    if (!hrTableSqlSet.has(phys.fromTable) || !hrTableSqlSet.has(phys.toTable)) continue;

    const key = `${phys.fromTable}|${phys.fromCol}|${phys.toTable}|${phys.toCol}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({
      key,
      fromTable: phys.fromTable,
      fromCol: phys.fromCol,
      toTable: phys.toTable,
      toCol: phys.toCol,
    });
  }

  return out;
}
