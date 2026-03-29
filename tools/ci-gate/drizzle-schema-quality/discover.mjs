import { resolve } from "node:path";
import { globSync } from "glob";
import { REPO_ROOT, SCHEMA_GLOB, shouldIgnoreFile, toRepoRelative } from "./config.mjs";

/**
 * All schema .ts files to scan (absolute paths), after ignores.
 * @param {string} [globOverride] — e.g. hr domain glob under packages/db/src/schema/hr
 * @returns {string[]}
 */
export function discoverSchemaFiles(globOverride) {
  const pattern = globOverride?.trim() || SCHEMA_GLOB;
  const matches = globSync(pattern, {
    cwd: REPO_ROOT,
    nodir: true,
    posix: true,
  });

  const absolute = matches
    .map((rel) => resolve(REPO_ROOT, rel))
    .filter((abs) => !shouldIgnoreFile(toRepoRelative(abs)));

  return absolute.sort();
}
