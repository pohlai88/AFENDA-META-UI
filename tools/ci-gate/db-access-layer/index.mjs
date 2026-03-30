#!/usr/bin/env node
/**
 * db-access-layer CI gate — ERP schema modules must have `queries/<domain>/<basename>.access.ts`.
 *
 * Usage:
 *   node tools/ci-gate/db-access-layer/index.mjs
 *   node tools/ci-gate/db-access-layer/index.mjs --fix
 *   node tools/ci-gate/db-access-layer/index.mjs --fix --generate
 *
 * Options:
 *   --fix        Create missing `.access.ts` (placeholder unless --generate).
 *   --generate   With --fix: emit full access scaffolds (v2) instead of placeholders.
 *   --force      With --fix --generate: overwrite existing @generated .access.ts files.
 *   --verbose    Log existing files.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

import { PLACEHOLDER } from "./config.mjs";
import { refreshAllDomainBarrels } from "./barrel-index.mjs";
import { accessFilePath, discoverEligibleSchemaModules } from "./discover.mjs";
import { emitAccessModuleSource } from "./emit-full.mjs";

function parseArgs(argv) {
  return {
    fix: argv.includes("--fix"),
    generate: argv.includes("--generate"),
    force: argv.includes("--force"),
    verbose: argv.includes("--verbose"),
  };
}

/**
 * @param {string} filePath
 */
function isGeneratedAccessFile(filePath) {
  if (!existsSync(filePath)) return false;
  const head = readFileSync(filePath, "utf8").slice(0, 400);
  return head.includes("@generated");
}

/**
 * @param {string} filePath
 */
function isNonEmptyFile(filePath) {
  if (!existsSync(filePath)) return false;
  const s = readFileSync(filePath, "utf8").trim();
  return s.length > 0;
}

function main() {
  const { fix, generate, force, verbose } = parseArgs(process.argv.slice(2));
  const modules = discoverEligibleSchemaModules();

  let allPresent = true;
  /** @type {string[]} */
  const missing = [];

  for (const mod of modules) {
    const accessPath = accessFilePath(mod.domain, mod.basename);
    const existsOk = isNonEmptyFile(accessPath);
    const allowRegenerate = fix && generate && force && isGeneratedAccessFile(accessPath);

    if (existsOk && !allowRegenerate) {
      if (verbose) console.log(`OK  ${mod.repoRelative} → ${accessPath}`);
      continue;
    }
    if (!existsOk) {
      allPresent = false;
      missing.push(`${mod.repoRelative} → expected ${accessPath}`);
    }

    if (!fix) continue;
    if (existsOk && !allowRegenerate) continue;

    mkdirSync(dirname(accessPath), { recursive: true });
    const content = generate ? emitAccessModuleSource(mod) : PLACEHOLDER;
    writeFileSync(accessPath, content, "utf8");
    console.log(`Wrote ${accessPath}`);
  }

  if (fix && generate) {
    refreshAllDomainBarrels();
    console.log("Refreshed queries/<domain>/index.ts barrels.");
  }

  if (!allPresent && !fix) {
    for (const m of missing) console.error(`MISSING: ${m}`);
    console.error("\nRun: pnpm ci:gate:db-access:fix");
    console.error("Full emit: pnpm ci:gate:db-access:generate");
    process.exit(1);
  }

  if (!allPresent && fix && !generate) {
    console.log("\nPlaceholder .access.ts created. Run pnpm ci:gate:db-access:generate for full scaffolds.");
  }
}

main();
