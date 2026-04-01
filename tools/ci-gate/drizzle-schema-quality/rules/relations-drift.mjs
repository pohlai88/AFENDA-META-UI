import { resolve } from "node:path";

import { REPO_ROOT, toRepoRelative } from "../config.mjs";
import { RULE_IDS } from "../rule-ids.mjs";
import {
  buildHrSymbolRegistry,
  extractHrSingleColumnFkEdges,
} from "../hr-fk-graph.mjs";
import {
  buildSalesSymbolRegistry,
  extractSalesSingleColumnFkEdges,
} from "../sales-fk-graph.mjs";
import {
  buildSecuritySymbolRegistry,
  extractSecuritySingleColumnFkEdges,
} from "../security-fk-graph.mjs";
import { parseHrRelationsCatalog } from "../relations-catalog.mjs";

const HR_RELATIONS_FILE = "packages/db/src/schema/hr/_relations.ts";
const SALES_RELATIONS_FILE = "packages/db/src/schema/sales/_relations.ts";
const SECURITY_RELATIONS_FILE = "packages/db/src/schema/security/_relations.ts";
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
 * @param {string} abs
 */
function isSalesDataSchemaAbs(abs) {
  const n = abs.replace(/\\/g, "/");
  if (!n.endsWith(".ts")) return false;
  if (!n.includes("/packages/db/src/schema/sales/")) return false;
  const base = n.split("/").pop() ?? "";
  if (base === "_relations.ts" || base === "index.ts" || base.startsWith("_")) return false;
  return true;
}

/**
 * @param {string} abs
 */
function isSecurityDataSchemaAbs(abs) {
  const n = abs.replace(/\\/g, "/");
  if (!n.endsWith(".ts")) return false;
  if (!n.includes("/packages/db/src/schema/security/")) return false;
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
  const salesDataFiles = files.filter(isSalesDataSchemaAbs);
  const securityDataFiles = files.filter(isSecurityDataSchemaAbs);
  if (hrDataFiles.length === 0 && salesDataFiles.length === 0 && securityDataFiles.length === 0)
    return [];

  /** @type {import('../rule-ids.mjs').Finding[]} */
  const findings = [];

  findings.push(
    ...runDomainDrift({
      domain: "hr",
      dataFiles: hrDataFiles,
      relationsFile: HR_RELATIONS_FILE,
      readFileSync,
      buildRegistry: buildHrSymbolRegistry,
      extractEdges: extractHrSingleColumnFkEdges,
    })
  );

  findings.push(
    ...runDomainDrift({
      domain: "sales",
      dataFiles: salesDataFiles,
      relationsFile: SALES_RELATIONS_FILE,
      readFileSync,
      buildRegistry: buildSalesSymbolRegistry,
      extractEdges: extractSalesSingleColumnFkEdges,
    })
  );

  findings.push(
    ...runDomainDrift({
      domain: "security",
      dataFiles: securityDataFiles,
      relationsFile: SECURITY_RELATIONS_FILE,
      readFileSync,
      buildRegistry: buildSecuritySymbolRegistry,
      extractEdges: extractSecuritySingleColumnFkEdges,
    })
  );

  return findings;
}

/**
 * @param {{
 *   domain: "hr" | "sales" | "security",
 *   dataFiles: string[],
 *   relationsFile: string,
 *   readFileSync: (p: string, enc: BufferEncoding) => string,
 *   buildRegistry: (paths: string[], reader: (p: string, enc: BufferEncoding) => string) => Map<string, { sql: string, columnsRegion: string }>,
 *   extractEdges: (content: string, fileRel: string, registry: Map<string, { sql: string, columnsRegion: string }>) => Array<{ key: string, line: number }>,
 * }} params
 */
function runDomainDrift(params) {
  const { domain, dataFiles, relationsFile, readFileSync, buildRegistry, extractEdges } = params;
  if (dataFiles.length === 0) return [];

  const relationsPath = resolve(REPO_ROOT, relationsFile);
  let catalogContent = "";
  try {
    catalogContent = readFileSync(relationsPath, "utf8");
  } catch {
    return [];
  }

  const registry = buildRegistry(dataFiles, readFileSync);
  const tableSqlSet = new Set([...registry.values()].map((v) => v.sql));

  const catalogEdges = parseHrRelationsCatalog(catalogContent, tableSqlSet);
  const catalogKeys = new Set(catalogEdges.map((e) => e.key));

  /** @type {Map<string, { file: string, line: number }>} */
  const codeKeyToMeta = new Map();
  for (const abs of dataFiles) {
    const content = readFileSync(abs, "utf8");
    const rel = toRepoRelative(abs);
    for (const e of extractEdges(content, rel, registry)) {
      if (!codeKeyToMeta.has(e.key)) {
        codeKeyToMeta.set(e.key, { file: rel, line: e.line });
      }
    }
  }

  const codeKeys = new Set(codeKeyToMeta.keys());

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
      file: relationsFile,
      table: "*",
      message: `${domain}_relations catalog expects FK ${ft}.${fc} → ${tt}.${tc} but no matching foreignKey() edge was extracted from ${domain} schema modules.`,
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
      message: `foreignKey ${ft}.${fc} → ${tt}.${tc} has no matching ${domain}_relations entry in ${relationsFile}.`,
    });
  }

  return out;
}
