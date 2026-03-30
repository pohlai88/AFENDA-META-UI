import { readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

import { ALLOWED_DOMAINS, QUERIES_ROOT, REPO_ROOT, SCHEMA_ROOT, SKIP_SUBDIRS } from "./config.mjs";

/**
 * @returns {string} posix path relative to repo root
 */
function toPosix(p) {
  return relative(REPO_ROOT, p).split(/[/\\]/).join("/");
}

/**
 * @param {string} dir
 * @param {string} domain
 * @returns {Array<{ domain: string, absolutePath: string, basename: string, repoRelative: string }>}
 */
function walkDomain(dir, domain) {
  /** @type {Array<{ domain: string, absolutePath: string, basename: string, repoRelative: string }>} */
  const out = [];
  const entries = readdirSync(dir, { withFileTypes: true });

  for (const ent of entries) {
    const full = join(dir, ent.name);
    if (ent.isDirectory()) {
      if (SKIP_SUBDIRS.has(ent.name)) continue;
      out.push(...walkDomain(full, domain));
      continue;
    }
    if (!ent.isFile() || !ent.name.endsWith(".ts")) continue;
    if (ent.name === "index.ts") continue;
    if (ent.name.startsWith("_")) continue;

    const basename = ent.name.replace(/\.ts$/, "");
    out.push({
      domain,
      absolutePath: full,
      basename,
      repoRelative: toPosix(full),
    });
  }

  return out;
}

/**
 * All schema modules that require a matching `.access.ts` (check mode).
 * @returns {Array<{ domain: string, absolutePath: string, basename: string, repoRelative: string }>}
 */
export function discoverEligibleSchemaModules() {
  /** @type {Array<{ domain: string, absolutePath: string, basename: string, repoRelative: string }>} */
  const all = [];

  for (const domain of ALLOWED_DOMAINS) {
    const domainDir = join(SCHEMA_ROOT, domain);
    try {
      if (!statSync(domainDir).isDirectory()) continue;
    } catch {
      continue;
    }
    all.push(...walkDomain(domainDir, domain));
  }

  return all.sort((a, b) => a.repoRelative.localeCompare(b.repoRelative));
}

/**
 * @param {string} domain
 * @param {string} basename without .ts
 */
export function accessFilePath(domain, basename) {
  return join(QUERIES_ROOT, domain, `${basename}.access.ts`);
}
