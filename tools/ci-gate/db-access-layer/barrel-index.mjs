import { readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { ALLOWED_DOMAINS, QUERIES_ROOT } from "./config.mjs";

/**
 * Rewrite `queries/<domain>/index.ts` to re-export all `*.access.ts` modules.
 * @param {string} domain
 */
export function writeDomainAccessBarrel(domain) {
  const dir = join(QUERIES_ROOT, domain);
  let files;
  try {
    files = readdirSync(dir);
  } catch {
    return;
  }

  const accessFiles = files.filter((f) => f.endsWith(".access.ts")).sort();
  if (accessFiles.length === 0) return;

  const lines = [
    "// @generated — db-access-layer barrel (re-exports *.access.ts only).",
    "// Add human-owned modules via separate exports if needed.",
    "",
  ];

  for (const f of accessFiles) {
    const base = f.replace(/\.ts$/, "");
    lines.push(`export * from "./${base}.js";`);
  }

  lines.push("");
  writeFileSync(join(dir, "index.ts"), lines.join("\n"), "utf8");
}

/** Refresh barrels for every allowlisted domain that has a queries folder. */
export function refreshAllDomainBarrels() {
  for (const domain of ALLOWED_DOMAINS) {
    writeDomainAccessBarrel(domain);
  }
}
