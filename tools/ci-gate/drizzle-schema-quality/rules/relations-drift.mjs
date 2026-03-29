import { resolve } from "node:path";

import { REPO_ROOT, toRepoRelative } from "../config.mjs";
import { RULE_IDS } from "../rule-ids.mjs";
import {
  buildHrSymbolRegistry,
  extractHrSingleColumnFkEdges,
} from "../hr-fk-graph.mjs";
import { parseHrRelationsCatalog } from "../relations-catalog.mjs";

const RELATIONS_FILE = "packages/db/src/schema/hr/_relations.ts";
const MAX_FINDINGS_PER_DIRECTION = 30;

/**
 * @param {string} abs
 */
function isHrDataSchemaAbs(abs) {
  const n = abs.replace(/\\/g, "/");
  if (!n.endsWith(".ts")) return false;
  if (!n.includes("/packages/db/src/schema/hr/")) return false;
  const base = n.split("/").pop() ?? "";
  if (base === "_relations.ts" || base === "index.ts" || base.startsWith("_")) return false;
  return true;
}

/**
 * @param {{ files: string[], readFileSync: (p: string, enc: BufferEncoding) => string }} ctx
 * @returns {import('../rule-ids.mjs').Finding[]}
 */
export function runProject(ctx) {
  const { files, readFileSync } = ctx;
  const hrDataFiles = files.filter(isHrDataSchemaAbs);
  if (hrDataFiles.length === 0) return [];

  const relationsPath = resolve(REPO_ROOT, RELATIONS_FILE);
  let catalogContent = "";
  try {
    catalogContent = readFileSync(relationsPath, "utf8");
  } catch {
    return [];
  }

  const registry = buildHrSymbolRegistry(hrDataFiles, readFileSync);
  const hrSqlSet = new Set([...registry.values()].map((v) => v.sql));

  const catalogEdges = parseHrRelationsCatalog(catalogContent, hrSqlSet);
  const catalogKeys = new Set(catalogEdges.map((e) => e.key));

  /** @type {Map<string, { file: string, line: number }>} */
  const codeKeyToMeta = new Map();
  for (const abs of hrDataFiles) {
    const content = readFileSync(abs, "utf8");
    const rel = toRepoRelative(abs);
    for (const e of extractHrSingleColumnFkEdges(content, rel, registry)) {
      if (!codeKeyToMeta.has(e.key)) {
        codeKeyToMeta.set(e.key, { file: rel, line: e.line });
      }
    }
  }

  const codeKeys = new Set(codeKeyToMeta.keys());

  /** @type {import('../rule-ids.mjs').Finding[]} */
  const out = [];

  let n = 0;
  for (const k of catalogKeys) {
    if (codeKeys.has(k)) continue;
    if (n >= MAX_FINDINGS_PER_DIRECTION) break;
    n += 1;
    const parts = k.split("|");
    const [ft, fc, tt, tc] = parts;
    out.push({
      ruleId: RULE_IDS.RELATIONS_DRIFT,
      file: RELATIONS_FILE,
      table: "*",
      message: `hrRelations expects FK ${ft}.${fc} → ${tt}.${tc} but no matching foreignKey() edge was extracted from HR schema modules (single-column + composite employees second leg only).`,
    });
  }

  n = 0;
  for (const k of codeKeys) {
    if (catalogKeys.has(k)) continue;
    if (n >= MAX_FINDINGS_PER_DIRECTION) break;
    const meta = codeKeyToMeta.get(k);
    if (!meta) continue;
    n += 1;
    const [ft, fc, tt, tc] = k.split("|");
    out.push({
      ruleId: RULE_IDS.RELATIONS_DRIFT,
      file: meta.file,
      table: "*",
      line: meta.line,
      message: `foreignKey ${ft}.${fc} → ${tt}.${tc} has no matching hrRelations entry in ${RELATIONS_FILE}.`,
    });
  }

  return out;
}
